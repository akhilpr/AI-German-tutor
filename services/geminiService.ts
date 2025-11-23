
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { FeedbackReport, ConversationTurn, WritingReport, ExamTopic } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getFeedbackOnConversation(transcript: ConversationTurn[]): Promise<Omit<FeedbackReport, 'id' | 'date' | 'transcript'>> {
    const conversationText = transcript.map((turn, i) => `[Turn ${i}] ${turn.speaker === 'user' ? 'Student' : 'Tutor'}: ${turn.text}`).join('\n');

    const prompt = `
        You are a strict German language linguistic expert. Evaluate this conversation transcript.

        Transcript:
        ${conversationText}

        ---
        Requirements:
        1. **scores**: Rate 0-10 strictly.
        2. **cefrLevel**: Estimate the student's CEFR level based on this specific conversation (e.g., "A2.1", "B2", "C1").
        3. **grammarAnalysis**: Find SPECIFIC errors. 
           - "error": the part of the sentence that was wrong.
           - "correction": the corrected version.
           - "reason": A short, grammatical explanation (e.g., "Dative required after 'mit'").
        4. **pronunciationAnalysis**: For each USER turn, create a heatmap.
           - Break the user's sentence into words.
           - Assign status: "perfect" (green), "okay" (yellow), "wrong" (red).
           - Base "wrong" status on likely mispronunciations for non-natives or grammatical fit that sounds 'off'. 
           - **Important**: Only analyze USER turns.
        5. **newVocabulary**: Extract 3 useful words/phrases relevant to the topic.

        Respond ONLY in valid JSON.
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
                        cefrLevel: { type: Type.STRING, description: "Estimated CEFR Level like A1, A2, B1, B2, C1" },
                        grammarAnalysis: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    sentence: { type: Type.STRING },
                                    error: { type: Type.STRING },
                                    correction: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ["grammar", "vocabulary", "syntax"] }
                                },
                                required: ["sentence", "error", "correction", "reason", "type"]
                            }
                        },
                        pronunciationAnalysis: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    turnIndex: { type: Type.INTEGER },
                                    words: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                word: { type: Type.STRING },
                                                status: { type: Type.STRING, enum: ["perfect", "okay", "wrong"] }
                                            },
                                            required: ["word", "status"]
                                        }
                                    }
                                },
                                required: ["turnIndex", "words"]
                            }
                        },
                        improvementTips: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        newVocabulary: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    word: { type: Type.STRING },
                                    translation: { type: Type.STRING },
                                    context: { type: Type.STRING },
                                },
                                required: ["word", "translation", "context"]
                            }
                        }
                    },
                    required: ["scores", "cefrLevel", "grammarAnalysis", "pronunciationAnalysis", "improvementTips", "newVocabulary"]
                },
            },
        });
        
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("Empty response from AI");
        
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error getting feedback from Gemini API:", error);
        throw new Error("Failed to generate feedback.");
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

        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error getting writing feedback from Gemini API:", error);
        throw new Error("Failed to generate feedback for the provided image.");
    }
}

// Generates a unique Exam Topic based on Track AND Level
export async function generateDynamicExamTopic(track: 'nursing' | 'academic' | 'general', level: string): Promise<ExamTopic> {
    let contextPrompt = "";
    let complexityPrompt = "";

    // Define Complexity based on Level
    switch (level) {
        case 'A1':
        case 'A2':
            complexityPrompt = "Level: Beginner (A1/A2). Topics should be simple: Family, Hobbies, Daily Routine, Food, Weather. The 'introText' should be very simple German.";
            break;
        case 'B1':
        case 'B2':
            complexityPrompt = "Level: Intermediate (B1/B2). Topics should be argumentative: Work life, Environment, Technology, Health. Requires expressing opinions (Pros/Cons).";
            break;
        case 'C1':
        case 'C2':
            complexityPrompt = "Level: Expert (C1/C2). Topics should be abstract and complex: Ethics, Globalization, Scientific progress, Politics. High-level vocabulary expected.";
            break;
        default:
            complexityPrompt = "Level: B2 (Intermediate). Standard exam topics.";
    }
    
    // Define Context
    if (track === 'nursing') {
        contextPrompt = "The topic must be related to healthcare, hospital situations, patient care, or medical ethics.";
    } else if (track === 'academic') {
        contextPrompt = "The topic must be related to university life, research, education systems, or student living.";
    } else {
        contextPrompt = "The topic can be general social issues or daily life situations depending on the level.";
    }

    const prompt = `
        Generate a random German Speaking Exam Topic (Teil 1: Vortrag / Sprechen).
        ${contextPrompt}
        ${complexityPrompt}
        
        The output must be a JSON object with:
        - "title": The main question or topic title (German).
        - "introText": A short framing of the topic (German) appropriate for the level ${level}.
        - "bulletPoints": 4 specific points the student must cover (e.g., for A1: "Name", "Age", "Hobby"; for B2: "Pros", "Cons", "Opinion").
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        introText: { type: Type.STRING },
                        bulletPoints: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                        }
                    },
                    required: ["title", "introText", "bulletPoints"]
                }
            }
        });
        
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("Empty response");
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error generating exam topic", error);
        return {
            title: "Mein liebstes Hobby",
            introText: "Erzählen Sie uns etwas über sich.",
            bulletPoints: ["Was ist Ihr Hobby?", "Warum machen Sie es?", "Wie oft?", "Mit wem?"]
        };
    }
}
