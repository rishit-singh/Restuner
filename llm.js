import { ReplicateBot } from "./modules/bot.js";
import { ResumeBot } from "./modules/resumebot.js";

const bot = ResumeBot(process.env.REPLICATE_VERSION, "mistralai/mixtral-8x7b-instruct-v0.1", process.env.MISTRALKEY);

await bot.LoadResume(process.argv[2]);
console.log((await bot.Initialize(process.argv[2])).join(""));

// console.log((await bot.Prompt(process.argv[2])
//         .Prompt("thanks")
//         .Run()).Result());
    