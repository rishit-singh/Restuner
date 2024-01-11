import { ReplicateBot } from "./modules/bot.js";

const bot = new ReplicateBot(process.env.REPLICATE_VERSION, "mistralai/mixtral-8x7b-instruct-v0.1", process.env.MISTRALKEY);

// (await (bot.Prompt("I'll ask you to generate code, reply with code only and nothing else.", true)
//             .Prompt(process.argv[2])
//             .Prompt("continue till the end, only send the remaining code and NO OTHER TEXT")
//             .Run())).filter(val => val.role == "assistant")
//             .forEach(val => {
//                 console.log(val.content);
//             });

(await bot.Prompt(process.argv[2])
    .Run()).forEach(token => process.stdout.write(token.toString()));
    
    
    // .map(token => token.toString()).forEach(token => {
    //     console.log(token);
    //     // process.stdout.write(token.substring(0, token.length - 2));
    // });
