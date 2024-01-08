import { Bot } from "./modules/bot.js";

const bot = new Bot(process.env.MODEL, process.env.ACCOUNTID, process.env.MISTRALKEY);

console.log(JSON.stringify(await (bot.Prompt(process.argv[2])
            .Prompt("continue")
        .Run())));