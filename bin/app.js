import { createReplicateBot } from "./modules/bot.mjs";
import { createMessage } from "./modules/bot.mjs";
import { UnsafeCast } from "./util.js";
// const bot = ResumeBot({Owner: "", Name: ""}, (tokens: string[]) => { console.log(tokens); throw new Error();});
async function main() {
    let model;
    const replicateBot = await createReplicateBot(model = {
        Owner: "mistralai",
        Name: "mixtral-8x7b-instruct-v0.1"
    }, "", "RREND");
    replicateBot.Callback = (tokens) => process.stdout.write(UnsafeCast(tokens));
    try {
        await replicateBot.Setup([createMessage("user", "Hello LLM. ")], true);
        await replicateBot.Prompt("How are you?", "user")
            .Prompt("Okay", "user")
            .Run();
    }
    catch (e) {
        console.log(e);
    }
    console.log(replicateBot.Result());
}
main();
