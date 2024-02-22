import { readFileSync } from "fs";
import { ReplicateBot, createReplicateBot } from "./modules/bot.mjs";
import { ResumeBot } from "./modules/resumebot.mjs";
import { Model } from "./modules/bot.mjs";
import { createMessage, Message } from "./modules/bot.mjs";
import { UnsafeCast } from "./util.js";

// const bot = ResumeBot({Owner: "", Name: ""}, (tokens: string[]) => { console.log(tokens); throw new Error();});

async function main(): Promise<void> 
{
    let model: Model;

    const replicateBot: ReplicateBot = await createReplicateBot(model = {
        Owner: "mistralai",
        Name: "mixtral-8x7b-instruct-v0.1"
    }, "", "RREND");

    replicateBot.Callback = (tokens) => process.stdout.write(UnsafeCast<any>(tokens));  

    try 
    {
        await replicateBot.Setup([createMessage("user", "Hello LLM. ")], true);
        
        await replicateBot.Prompt("How are you?", "user")
                    .Prompt("Okay", "user")
                    .Run();
    }
    catch (e)
    {
        console.log(e);
    }

    console.log(replicateBot.Result()); 
}

main()
