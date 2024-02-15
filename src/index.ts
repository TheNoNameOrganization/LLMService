import OpenAI from "openai";

export class OpenAIManager {
    private static instance: OpenAI;

    public static initialize(apiKey: string) {
        OpenAIManager.instance = new OpenAI(
            {
                "apiKey": apiKey,
            }
        );
    }

    private constructor() { }

    public static getInstance(): OpenAI {
        if (!OpenAIManager.instance) {
            throw new Error("OpenAIManager is not initialized");
        }
        return OpenAIManager.instance;
    }
}