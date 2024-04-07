import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY: string = process.env.OPENAI_API_KEY!;


export class OpenAIManager {
    private static instance: OpenAI;

    private constructor() { }

    public static getInstance(): OpenAI {
        if (!OpenAIManager.instance) {
            OpenAIManager.instance = new OpenAI(
                {
                    "apiKey": OPENAI_API_KEY,
                }
            );
        }
        return OpenAIManager.instance;
    }
    

}