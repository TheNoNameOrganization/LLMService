import OpenAI from "openai";
import { OpenAIManager } from "./index.js";
import { Assistant } from "openai/resources/beta/assistants/assistants.js";
import { Thread } from "openai/resources/beta/threads/threads.js";
import { Message } from "openai/resources/beta/threads/messages/messages.js";
import { getDefaultAssistant } from "./Assistant.js";
import { Run } from "openai/resources/beta/threads/index.mjs";
import { FunctionRegistry } from "./FunctionRegistry.js";
import { wait } from "../utils.js";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));


const config = JSON.parse(await fs.readFileSync(path.join(__dirname,"../../config.json"), 'utf-8'));

const openai: OpenAI = OpenAIManager.getInstance();

class Conversation {
    private static dataPath = path.join('./data/GPTData.json');
    assistant: Assistant;
    thread: Thread;
    messages: Message[];

    constructor(assistant: Assistant, thread: Thread, messages: Message[] = []) {
        this.assistant = assistant;
        this.thread = thread;
        this.messages = messages;
    }

    static async create(assistant?: Assistant): Promise<Conversation> {
        const actualAssistant = assistant || await getDefaultAssistant();
        const thread = await openai.beta.threads.create();
        return new Conversation(actualAssistant, thread);
    }

    static async fromThread(threadId:string, assistant?: Assistant): Promise<Conversation> {
        const actualAssistant = assistant || await getDefaultAssistant();
        const thread = await openai.beta.threads.retrieve(threadId);
        const convo = new Conversation(actualAssistant, thread);
        await convo.fetchMessages(); // TODO: check if redundant?
        return convo;
    }

    async fetchMessages(): Promise<Message[]> {
        const threadMessages = await openai.beta.threads.messages.list(this.thread.id);
        this.messages = threadMessages.data;
        if (config.conversation.persist) {
            await this.saveMessages();
        }
        return this.messages;
    }

    async getLastMessage(): Promise<Message> {
        await this.fetchMessages();
        return this.messages[0]; // Assuming the latest message is the first in the array
    }

    async sendMessage(message: string): Promise<void> {
        await openai.beta.threads.messages.create(this.thread.id, { role: "user", content: message });
        const run = await openai.beta.threads.runs.create(this.thread.id, { assistant_id: this.assistant.id });
        await this.awaitAnswer(run);
    }

    private async awaitAnswer(_run: Run): Promise<void> {
        const POLLING_RATE_MS: number = 500;

        let run: Run = await openai.beta.threads.runs.retrieve(_run.thread_id, _run.id);

        do {
            switch (run.status) {
                case "requires_action": {
                    console.log("Handling function call");
                    await this.processToolCalls(run);
                    break;
                }
                case "completed": {
                    console.log("Run complete, returning");
                    break;
                }
                case "in_progress": {
                    console.log("Run in progress");
                    break;
                }
                case "queued": {
                    console.log("Run queued");
                    break;
                }
                default:
                    throw new Error("The run has failed");
            }

            run = await openai.beta.threads.runs.retrieve(run.thread_id, run.id);
            await wait(POLLING_RATE_MS);

        } while (run.status != "completed");
    }

    private async processToolCalls(run: Run): Promise<void> {
        const tool_calls = run.required_action.submit_tool_outputs.tool_calls;
        for (const tool_call of tool_calls) {
            console.log(tool_call);
            const res = await FunctionRegistry.getInstance().runFunction(tool_call.function.name, JSON.parse(tool_call.function.arguments));
            await openai.beta.threads.runs.submitToolOutputs(run.thread_id, run.id, { "tool_outputs": [{ "output": res, "tool_call_id": tool_call.id }] });
        }
    }

    private static async readOrCreateDataFile() {
        const dirPath = path.dirname(Conversation.dataPath);
    
        // Ensure the directory exists
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    
        if (!fs.existsSync(Conversation.dataPath)) {
            fs.writeFileSync(Conversation.dataPath, JSON.stringify({ threads: {} }), 'utf-8');
            return { threads: {} };
        }
    
        return JSON.parse(fs.readFileSync(Conversation.dataPath, 'utf-8'));
    }
    
    private async saveMessages(): Promise<void> {
        const now = new Date().toISOString(); // ISO 8601 format timestamp
        const data = await Conversation.readOrCreateDataFile(); // This ensures the directory exists
    
        // Your existing logic to update the thread's messages and save them
        if (!data.threads[this.thread.id]) {
            data.threads[this.thread.id] = { messages: [], created_at: now };
        }
    
        data.threads[this.thread.id].messages = this.messages.map(message => ({
            role: message.role,
            content: message.content,
            created_at: message.created_at || now, // Preserve existing created_at, or set it if new
            updated_at: now
        }));
        data.threads[this.thread.id].updated_at = now;
    
        // Save the updated data back to the file
        fs.writeFileSync(Conversation.dataPath, JSON.stringify(data, null, 2), 'utf-8');
    }
    
}

export { Conversation };
