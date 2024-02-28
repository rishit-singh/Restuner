import express from "express";
import { ResumeBot } from "../modules/resumebot.mjs";
import { readFileSync } from "fs";
import cors from "cors";
import multer from "multer";
import { UnsafeCast } from "../util.js";
import { Model } from "../modules/bot.mjs"; 

const app = express();
const upload = multer();

const port = 8001;

let Output: string[] = []; 

app.use(cors());
app.use(express.json());

type File = Express.Multer.File; 

let LLM: ResumeBot; 

let output: string = "";

async function Main()
{
    LLM = new ResumeBot({
        Owner: "mistralai",
        Name: "mixtral-8x7b-instruct-v0.1"
    }, process.env.REPLICATE_API_TOKEN as string, tokens => { output = LLM.Bot.Results[LLM.Bot.Results.length - 1].join(""); });  

    await LLM.Initialize();

    app.post("/upload", upload.array("resume"), async (req, res) => {
        await LLM.LoadResume(((UnsafeCast<File[]>(req.files))[0]).buffer.buffer);
        await LLM.PromptResume();

        console.log("Reached here");

        await LLM.Tune(req.body.job_description);

        res.send({State: LLM.State});
    });

    app.get("/output", (req, res, id) => {
        const results: string[] = LLM.Bot.Results[LLM.Bot.Results.length - 1]; 

        res.send({ State: LLM.State, Output: (results !== undefined) ? results.join("") : ""});
    });

    app.listen(port, () => {
        console.log("Model:", LLM.Model);
        console.log(`Listening on port ${port}`);
    });
}

Main();