import { Bot } from "./modules/bot.js";

const bot = new Bot(process.env.MODEL, process.env.ACCOUNTID, process.env.MISTRALKEY);

// (await (bot.Prompt("I'll ask you to generate code, reply with code only and nothing else.", true)
//             .Prompt(process.argv[2])
//             .Prompt("continue till the end, only send the remaining code and NO OTHER TEXT")
//             .Run())).filter(val => val.role == "assistant")
//             .forEach(val => {
//                 console.log(val.content);
//             });


const parse = (data) => {
    if (data.length > 0) 
        try{
            return JSON.parse(data.substring(data.search(":") + 1, data.length));
        }
        catch (e)
        {
        }
    return null;
}

(await bot.PromptStream("write me a lexer in c++"))
    .split("\n").map(data => parse(data)).filter(resp => resp != null).forEach(e => {
    process.stdout.write(e.response);
});