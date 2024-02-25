import { readFileSync } from "fs";
import { ReplicateBot, createReplicateBot } from "./modules/bot.mjs";
import { createResumeBot, ResumeBot } from "./modules/resumebot.mjs";
import { Model } from "./modules/bot.mjs";
import { createMessage, Message } from "./modules/bot.mjs";
import { UnsafeCast } from "./util.js";
import { readFile } from "fs/promises";

async function main(): Promise<void> 
{
    let model: Model;
    
    model = {
        Owner: "mistralai",
        Name: "mixtral-8x7b-instruct-v0.1"
    };
    
    const bot: ResumeBot = await createResumeBot(model, (tokens: string[]) => { console.log(tokens); throw new Error();});

    bot.Callback = (tokens) => process.stdout.write(UnsafeCast<string>(tokens[0].toString()));  

    await bot.LoadResume(readFileSync(process.argv[2]).buffer);

    try 
    {
        bot.Initialize();
        bot.Tune(``); 
    }
    catch (e)
    {
        console.log(e);
    }
}

main()
