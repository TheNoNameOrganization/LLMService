import { program } from "commander";
import { createConversation, sendMessage, getLastMessage } from "./openai/Conversation.js";

program.command('chat')
  .description('Creates a completion with OpenAI based on the provided prompt.')
  .argument('<prompt>', 'The prompt to send to OpenAI')
  .action(async (prompt) => {
    const conversation = await createConversation();
    await sendMessage(conversation, prompt);
    const lastMessage = await getLastMessage(conversation);
    console.log(JSON.stringify(lastMessage.content[0].type == "text"? lastMessage.content[0].text.value : lastMessage.content[0]));
  });

program.parse(process.argv);