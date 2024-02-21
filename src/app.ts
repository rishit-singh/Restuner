import { readFileSync } from "fs";
import { ReplicateBot, createReplicateBot } from "./modules/bot.mjs";
import { ResumeBot } from "./modules/resumebot.mjs";
import { Model } from "./modules/bot.mjs";
import { createMessage, Message } from "./modules/bot.mjs";
import { UnsafeCast } from "./util.js";

// const bot = ResumeBot({Owner: "", Name: ""}, (tokens: string[]) => { console.log(tokens); throw new Error();});

async function main(): Promise<void> 
{
    const replicateBot: ReplicateBot = await createReplicateBot({
        Owner: "mistralai",
        Name: "mixtral-8x7b-instruct-v0.1"
    }, "", "RREND");

    replicateBot.Callback = (tokens) => process.stdout.write(UnsafeCast<any>(tokens));  

    try 
    {
        await replicateBot.Setup([createMessage("user", "Hello LLM. Generate me a sample python code")], true);
        
        await replicateBot.Prompt("Okay write the same program in C++", "user")
                    .Prompt("Now write the same program in C#", "user")
                    .Prompt("Now write the same program in haskell", "user")
                    .Run();
    }
    catch (e)
    {
        console.log(e);
    }
    console.log(replicateBot.Result()); 
}

main()
