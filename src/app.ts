import { readFileSync } from "fs";
import { ReplicateBot } from "./modules/bot.mjs";
import { ResumeBot } from "./modules/resumebot.mjs";
import { Model } from "./modules/bot.mjs";
import { Message } from "./modules/bot.mjs";
import { UnsafeCast } from "./util.js";
import { readFile } from "fs/promises";

async function main(): Promise<void> 
{
    let model: Model;
    
    model = {
        Owner: "mistralai",
        Name: "mixtral-8x7b-instruct-v0.1"
    };
    
    const bot: ResumeBot = await new ResumeBot(model, process.env.REPLICATE_API_TOKEN as string, (tokens: string[]) => { if (tokens !== undefined) process.stdout.write(tokens.join("")); });

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
