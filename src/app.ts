import { readFileSync } from "fs";
import { ReplicateBot, createReplicateBot } from "./modules/bot.mjs";
import { ResumeBot } from "./modules/resumebot.mjs";
import { Model } from "./modules/bot.mjs";
import { createMessage, Message } from "./modules/bot.mjs";

const bot = ResumeBot({Owner: "", Name: ""}, (tokens: string[]) => { console.log(tokens); throw new Error();});

async function main(): Promise<void> 
{
    const replicateBot: ReplicateBot = await createReplicateBot({
        Owner: "meta",
        Name: "llama-2-7b-chat"
    }, "", "RREND");

    await replicateBot.Setup([createMessage("user", "Hello LLM")], true);

    console.log(replicateBot.Result()); 
}

main()
