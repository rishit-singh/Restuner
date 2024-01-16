import express from "express";
import { ResumeBot } from "../modules/resumebot.js";
import { readFileSync } from "fs";
import { waitForDebugger } from "inspector";

const app = express();
const port = 3000;

let Output = ""; 


const LLM = ResumeBot(process.env.REPLICATE_VERSION, 
                    process.argv[2], 
                    process.env.MISTRALKEY);

app.use(express.json());

app.get("/", async (req, res) => {
    LLM.Callback = ((tokens) => {
        console.log(tokens);
        res.write(tokens.join(""));
        res.end();
    });    

    LLM.LoadResume(readFileSync(req.body.resume_path).buffer).then(result => result);
    LLM.Initialize(req.body.resume_path).then(result => result);
});

app.get("/output", (req, res) => {
    res.send(Output);  
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`); 
});


