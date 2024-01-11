import { ReplicateBot } from "./modules/bot.js";

const bot = new ReplicateBot(process.env.REPLICATE_VERSION, "mistralai/mixtral-8x7b-instruct-v0.1", process.env.MISTRALKEY);

console.log((await bot.Prompt(process.argv[2])
    .Prompt("thanks")
    .Run()).PromptString);
    