import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { FeedbackReport, ConversationTurn, WritingReport } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getFeedbackOnConversation(transcript: ConversationTurn[]): Promise<Omit<FeedbackReport, 'id' | 'date' | 'transcript'>> {
    // Limit transcript context if it's too huge, though typically fine for text
    const conversationText = transcript.map(turn => `${turn.speaker === 'user' ? 'Student' : 'Tutor (Nova)'}: ${turn.text}`).join('\n');

    const prompt = `
        You are a German language expert examiner evaluating a student's conversation with an AI tutor named Nova.
        
        Transcript:
        ${conversationText}

        ---
        Requirements:
        1. Evaluate based on CEFR standards (A1-B2 range).
        2. "scores": Rate strictly out of 10.
        3. "weakPoints": Identify specific grammatical errors (e.g., "Used 'der' instead of 'den' in accusative").
        4. "improvementTips": Actionable grammar or vocabulary advice.
        
        Respond ONLY in valid JSON matching the schema.
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
        
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("Empty response from AI");
        
        const feedbackData = JSON.parse(jsonText);

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
            Act as a strict German language teacher correcting homework.
            
            1. Transcribe the German text exactly as written in the image.
            2. Identify EVERY spelling, grammar, or syntax error.
            3. For each error, provide the "correction" and a brief English "explanation" of the rule (e.g., "Dative case required here").
            4. If the text is perfect, say so in the tips.
            
            Return valid JSON.
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
                                    error: { type: Type.STRING, description: "The segment with the mistake" },
                                    correction: { type: Type.STRING, description: "The correct German form" },
                                    explanation: { type: Type.STRING, description: "Grammar rule explanation" },
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

        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("Empty response from AI");

        const writingData = JSON.parse(jsonText);
        return writingData;

    } catch (error) {
        console.error("Error getting writing feedback from Gemini API:", error);
        throw new Error("Failed to generate feedback for the provided image.");
    }
}