import { createReplicateBot } from "./modules/bot.mjs";
import { createMessage } from "./modules/bot.mjs";
import { UnsafeCast } from "./util.js";
// const bot = ResumeBot({Owner: "", Name: ""}, (tokens: string[]) => { console.log(tokens); throw new Error();});
async function main() {
    const replicateBot = await createReplicateBot({
        Owner: "mistralai",
        Name: "mixtral-8x7b-instruct-v0.1"
    }, "", "RREND");
    replicateBot.Callback = (tokens) => process.stdout.write(UnsafeCast(tokens));
    try {
        await replicateBot.Setup([createMessage("user", "Hello LLM. Generate me a sample python code")], true);
        await replicateBot.Prompt("Okay write the same program in C++", "user")
            .Prompt("Now write the same program in C#", "user")
            .Prompt("Now write the same program in haskell", "user")
            .Run();
    }
    catch (e) {
        console.log(e);
    }
    console.log(replicateBot.Result());
}
main();
