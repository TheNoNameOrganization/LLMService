import { Assistant, FunctionTool, CodeInterpreterTool } from "openai/resources/beta/assistants/assistants"
import { OpenAIManager } from './index.js'
import OpenAI from "openai"
import { AssistantsPage } from "openai/resources/beta/index.mjs"
import { RetrievalTool } from "openai/src/resources/beta/index.js"

let OpenAIInstance: OpenAI

type AssistantTools = Array<
    CodeInterpreterTool |
    RetrievalTool |
    FunctionTool
>;

export type GPTParams = {
    model: string,
    max_tokens: number,
    temperature: number,
    instructions?: string,
    description?: string,
    tools?: AssistantTools
}

const DefaultGPTParams: GPTParams = {
    // Models that can handle function calling are gpt-3.5-turbo-1106 and gpt-4-turbo-preview
    // See Assistant documentation at https://platform.openai.com/docs/assistants/overview
    model: "gpt-3.5-turbo-1106",
    max_tokens: 200,
    temperature: 0.8,
    instructions: "You are a helpful assistant",
    description: "A helpful assistant that helps you with your tasks",
    tools: []
}

export async function getOrCreateAssistant(assistantName: string, GPTParams?: Partial<GPTParams>): Promise<Assistant> {
    //Merge with default parameters where values are unspecified
    OpenAIInstance = OpenAIManager.getInstance();
    if (!(await getAssistantByName(assistantName))) {
        GPTParams = { ...DefaultGPTParams, ...GPTParams }
        await createAssistant(assistantName, GPTParams as GPTParams);
    }
    return (await getAssistantByName(assistantName))!;
}

async function createAssistant(assistantName: string, GPTParams: GPTParams): Promise<Assistant | null> {
    if (!await getAssistantByName(assistantName)) {
        OpenAIInstance.beta.assistants.create({
            "name": assistantName,
            "description": GPTParams.description,
            "model": GPTParams.model,
            "tools": GPTParams.tools,
            "instructions": GPTParams.instructions,
        });
    } else {
        console.log(`Assistant ${assistantName} already exists. Skipping creation.`);
    }
    return await getAssistantByName(assistantName)
}

export async function getAssistantByName(assistantName: string): Promise<Assistant | null> {
    const assistants: Assistant[] = await listAssistants();
    for (const assistant of assistants) {
        if (assistant.name === assistantName) {
            return assistant
        }
    }
    return null
}

export async function deleteAssistant(assistantName: string): Promise<void> {
    const assistant: Assistant = (await getAssistantByName(assistantName))!;
    if (assistant) {
        await OpenAIInstance.beta.assistants.del(assistant.id)
    } else {
        console.log(`Assistant ${assistantName} does not exist. Skipping deletion.`);
    }
}

export async function deleteAllAssistants(): Promise<void> {
    const assistants: Assistant[] = await listAssistants();
    for (const assistant of assistants) {
        await deleteAssistant(assistant.name!)
    }
}

export async function listAssistants(): Promise<Assistant[]> {
    // This assumes 100 assistants is enough
    // TODO: not assume 100 assistants is enough
    OpenAIInstance = OpenAIManager.getInstance();
    const myAssistants: AssistantsPage = await OpenAIInstance.beta.assistants.list({
        "limit": 100
    })
    return myAssistants.data;
}

export async function getDefaultAssistant(): Promise<Assistant> {
    return await getOrCreateAssistant("defaultAssistant");
}