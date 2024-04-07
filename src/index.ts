import { Conversation } from "./openai/Conversation.js";

class OpenAIService {

    private someRandomString: string = "Hello World!";

    constructor() {
        console.log(this.someRandomString);
    }

}

export { OpenAIService, Conversation }