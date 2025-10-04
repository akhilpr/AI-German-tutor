import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { FeedbackReport, ConversationTurn, WritingReport } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getFeedbackOnConversation(transcript: ConversationTurn[]): Promise<Omit<FeedbackReport, 'id' | 'date' | 'transcript'>> {
    const conversationText = transcript.map(turn => `${turn.speaker === 'user' ? 'Student' : 'Tutor'}: ${turn.text}`).join('\n');

    const prompt = `
        You are an expert German language examiner. Based on the following conversation transcript between a student and a tutor, please provide a detailed and honest evaluation of the student's German speaking skills.

        Conversation:
        ${conversationText}

        ---
        Please provide your evaluation in JSON format. The JSON object should include:
        1. "scores": An object with ratings out of 10 for "fluency", "pronunciation", "grammar", and an "overall" score.
        2. "weakPoints": An array of strings, each describing a specific area where the student needs improvement.
        3. "improvementTips": An array of strings, each providing actionable advice for the student to improve.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scores: {
                            type: Type.OBJECT,
                            properties: {
                                fluency: { type: Type.NUMBER },
                                pronunciation: { type: Type.NUMBER },
                                grammar: { type: Type.NUMBER },
                                overall: { type: Type.NUMBER },
                            },
                            required: ["fluency", "pronunciation", "grammar", "overall"]
                        },
                        weakPoints: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        improvementTips: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["scores", "weakPoints", "improvementTips"]
                },
            },
        });
        
        const jsonText = response.text.trim();
        const feedbackData = JSON.parse(jsonText);

        if (
            !feedbackData.scores ||
            typeof feedbackData.scores.overall !== 'number' ||
            !Array.isArray(feedbackData.weakPoints) ||
            !Array.isArray(feedbackData.improvementTips)
        ) {
            throw new Error("Invalid feedback format received from API");
        }

        return feedbackData;

    } catch (error) {
        console.error("Error getting feedback from Gemini API:", error);
        throw new Error("Failed to generate feedback for the conversation.");
    }
}

export async function getFeedbackOnWriting(imageBase64: string, mimeType: string): Promise<Omit<WritingReport, 'id' | 'date' | 'imageUrl'>> {
    const imagePart = {
        inlineData: { mimeType, data: imageBase64 },
    };

    const textPart = {
        text: `
            You are an expert German language examiner. Analyze the provided image of handwritten German text.
            Your task is to:
            1. Transcribe the German text from the image accurately.
            2. Evaluate the transcribed text for grammatical errors, spelling mistakes, style, and overall quality.
            3. Provide a single, overall score out of 10.
            4. Identify specific errors. For each error, provide the incorrect part, the correction, and a brief explanation.
            5. Give a list of actionable improvement tips.

            Provide your response in a structured JSON format. The JSON object must contain:
            - "transcribedText": A string with the full text you transcribed from the image.
            - "score": A number from 0 to 10.
            - "errors": An array of objects, where each object has "error" (string), "correction" (string), and "explanation" (string).
            - "improvementTips": An array of strings.
        `,
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        transcribedText: { type: Type.STRING },
                        score: { type: Type.NUMBER },
                        errors: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    error: { type: Type.STRING },
                                    correction: { type: Type.STRING },
                                    explanation: { type: Type.STRING },
                                },
                                required: ["error", "correction", "explanation"],
                            },
                        },
                        improvementTips: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                    },
                    required: ["transcribedText", "score", "errors", "improvementTips"],
                },
            },
        });

        const jsonText = response.text.trim();
        const writingData = JSON.parse(jsonText);

        if (
            typeof writingData.transcribedText !== 'string' ||
            typeof writingData.score !== 'number' ||
            !Array.isArray(writingData.errors) ||
            !Array.isArray(writingData.improvementTips)
        ) {
            throw new Error("Invalid writing feedback format received from API");
        }

        return writingData;

    } catch (error) {
        console.error("Error getting writing feedback from Gemini API:", error);
        throw new Error("Failed to generate feedback for the provided image.");
    }
}
