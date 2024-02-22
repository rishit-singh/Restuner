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

    replicateBot.Callback = (tokens) => process.stdout.write(UnsafeCast<string>(tokens[0]));  

    try 
    {
        await replicateBot.Setup([createMessage("user", "write a recursive function in python")], true);
        
        await replicateBot.Prompt("Now translate it to c++", "user")
                    .Run();
    }
    catch (e)
    {
        console.log(e);
    }
}

main()
