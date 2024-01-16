import express from "express";
import { ResumeBot } from "../modules/resumebot.js";
import { readFileSync } from "fs";
import cors from "cors";

const app = express();
const port = 3000;

let Output = []; 

const LLM = ResumeBot(process.env.REPLICATE_VERSION, 
                    process.argv[2], 
                    process.env.MISTRALKEY);

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
    LLM.Callback = ((tokens) => {
        const joined = tokens.join("");
        
        if (Output.indexOf(joined) == -1)
            Output.push(joined);

        console.log(`\n${joined}\n`);
        
        res.write(Output[Output.length - 1]);
    });    

    LLM.LoadResume(readFileSync(req.body.resume_path).buffer).then(result => {
        console.log("RESUME LOADED");

        console.log(Output);

        LLM.Initialize(req.body.resume_path).then(result => {
            console.log("LLM INITIALIZED");

            console.log(Output);
            
            LLM.Tune(req.body.job_description).then(result => {
                console.log("LLM TUNED.");

                console.log(Output);
            });;
        });
    });

    res.end();
});

app.get("/output", (req, res) => {
    res.send(Output[Output.length - 1]);  
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`); 
});
