import { createReplicateBot } from "./modules/bot.mjs";
import { ResumeBot } from "./modules/resumebot.mjs";
import { createMessage } from "./modules/bot.mjs";
const bot = ResumeBot({ Owner: "", Name: "" }, (tokens) => { console.log(tokens); throw new Error(); });
async function main() {
    const replicateBot = await createReplicateBot({
        Owner: "meta",
        Name: "llama-2-7b-chat"
    }, "", "RREND");
    await replicateBot.Setup([createMessage("user", "Hello LLM")], true);
    console.log(replicateBot.Result());
}
main();
