import { program } from "commander";
import { Conversation } from "./openai/Conversation.js";
import * as fs from 'fs';
import * as path from 'path';

program.command('chat')
  .description('Creates a completion with OpenAI based on the provided prompt.')
  .argument('<prompt>', 'The prompt to send to OpenAI')
  .option('-c, --continue', 'Continue with the last updated conversation thread')
  .action(async (prompt, options) => {
    try {
      console.log("Starting conversation...")
      let conversation;

      if (options.continue) {
        console.log("Continuing with the last updated conversation thread.")
        const dataPath = path.join('./data/GPTData.json');
        if (fs.existsSync(dataPath)) {
          const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
          const threads = data.threads;
          const lastUpdatedThreadID = Object.keys(threads).reduce((a, b) => threads[a].updated_at > threads[b].updated_at ? a : b);
          console.log(`Continuing with thread ID: ${lastUpdatedThreadID}`);
          conversation = await Conversation.fromThread(lastUpdatedThreadID);
        //   console.log(`messages: ${JSON.stringify(conversation.messages)}`)
        } else {
          console.error("No existing conversation found. Starting a new one.");
          conversation = await Conversation.create();
        }
      } else {
        conversation = await Conversation.create();
      }

      await conversation.sendMessage(prompt);
      const lastMessage = await conversation.getLastMessage();

      if (lastMessage.content[0] && lastMessage.content[0].type === "text") {
        console.log(lastMessage.content[0].text.value);
      } else {
        console.log(JSON.stringify(lastMessage.content[0]));
      }
    } catch (error) {
      console.error("Error in conversation:", error);
    }
  });

program.parse(process.argv);
