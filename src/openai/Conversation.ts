import OpenAI from "openai";
import { OpenAIManager } from "./index.js";
import { Assistant } from "openai/resources/beta/assistants/assistants.js";
import { Thread } from "openai/resources/beta/threads/threads.js";
import  {Message} from "openai/resources/beta/threads/messages/messages.js";
import { getDefaultAssistant } from "./Assistant.js";
import { RequiredActionFunctionToolCall, Run } from "openai/resources/beta/threads/index.mjs";
import { FunctionRegistry } from "./FunctionRegistry.js";
import { wait } from "../utils.js";

const openai : OpenAI =  OpenAIManager.getInstance();

export type Conversation = {
    assistant: Assistant,
    thread: Thread,
    messages: Message[]
}

export async function createConversation(assistant?: Assistant) : Promise<Conversation> {
    const actualAssistant = assistant || await getDefaultAssistant();
    const thread = await openai.beta.threads.create();

    return {
        assistant: actualAssistant,
        thread,
        messages: []
    }
}

export async function fetchMessages(conversation: Conversation) : Promise<Conversation> {
    const threadMessages = await openai.beta.threads.messages.list(conversation.thread.id);
    conversation.messages = threadMessages.data
    return conversation;
}

export async function getLastMessage(conversation: Conversation): Promise<Message>{
    await fetchMessages(conversation);
    return conversation.messages[0]
}

export async function sendMessage(conversation: Conversation, message: string) : Promise<void> {
    
    openai.beta.threads.messages.create(
        conversation.thread.id,
        { role: "user", content: message }
    );
    const run = await openai.beta.threads.runs.create(
        conversation.thread.id,
        { assistant_id: conversation.assistant.id }
    );
    await awaitAnswer(run);
}

async function awaitAnswer(_run: Run): Promise<void>{
    
    const POLLING_RATE_MS: number = 500;

    let run : Run = await openai.beta.threads.runs.retrieve(
        _run.thread_id,
        _run.id
    );

    do{
        switch(run.status){
            case "requires_action": {
                console.log("Handling function call");
                await processToolCalls(run);
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

            run = await openai.beta.threads.runs.retrieve(
                run.thread_id,
                run.id
            );

            await wait(POLLING_RATE_MS);
            
    } while(run.status != "completed")
}

async function processToolCalls(run: Run): Promise<void>{
    const tool_calls : RequiredActionFunctionToolCall[] = run.required_action.submit_tool_outputs.tool_calls;
    for(const tool_call of tool_calls){
        console.log(tool_call);
        // console.log(`calling function ${tool_call.function.name} with ${tool_call.function.arguments}`);
        const res = await FunctionRegistry.getInstance().runFunction(tool_call.function.name, JSON.parse(tool_call.function.arguments))
        await openai.beta.threads.runs.submitToolOutputs(run.thread_id, run.id, 
            {"tool_outputs": [{"output": res, "tool_call_id": tool_call.id}] }
        );
    }
}
