import express from "express";
import bodyParser from "body-parser";
import { ResumeBot } from "../modules/resumebot.mjs";
import { readFileSync } from "fs";
import cors from "cors";
import multer from "multer";
import { UnsafeCast } from "../util.js";
import { Message, Model, ReplicateBot } from "../modules/bot.mjs"; 
import { ResumeBotSession } from "../modules/botsession.mjs";

const app = express();
const upload = multer();
const port = 8001;

let Output: string[] = []; 

app.use(cors());
app.use(express.json());

app.use(bodyParser.json({ type: "application/*+json" })); 
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
app.use(bodyParser.text({ type: "text/html" }));

type File = Express.Multer.File; 

let LLM: ResumeBot; 

let output: string = "";

async function Main()
{
    const model: Model = {
        Owner: "mistralai",
        Name: "mixtral-8x7b-instruct-v0.1"
    };

    LLM = new ResumeBot(model, process.env.REPLICATE_API_TOKEN as string, tokens => { output = LLM.Bot.Results[LLM.Bot.Results.length - 1].join(""); });  

    const Sessions: Map<string, ResumeBotSession> = new Map<string, ResumeBotSession>();

    await LLM.Initialize();

    app.post("/upload", upload.array("resume"), async (req, res) => {
        let Session = new ResumeBotSession(((UnsafeCast<File[]>(req.files))[0]).buffer.buffer, 
                                            req.body.job_description, 
                                            model, process.env.REPLICATE_API_TOKEN as string);

        Sessions.set(Session.ID, Session);
        
        Session = Sessions.get(Session.ID) as ResumeBotSession;
        
        Session.Initialize().then(async () => Session.Run());

        console.log("Reached here");

        res.send({State: Session.State, SessionID: Session.ID});
    });

    app.post("/prompt", async (req, res) => {  
        console.log(req.body);

        if (req.body.SessionID === undefined)
        {
            res.status(400);
            res.send({
                "error": "Missing required field SessionID."
            });

            return;
        }
       
        if (req.body.Prompts === undefined)
        {
            res.status(400);
            res.send({
                "error": "Missing required field Prompts."
            });

            return;
        }

        const sessionId = req.body.SessionID;

        (req.body.Prompts as string[]).forEach( prompt => Sessions.get(sessionId)?.Prompt(prompt));

        const Session = Sessions.get(sessionId) as ResumeBotSession;
        
        await Session.Run();

        res.send({ State: Session.State, SessionID: Session.ID });
    });
 
    app.get("/output/:sessionId", (req, res) => {
        const session: ResumeBotSession | undefined = Sessions.get(req.params.sessionId);

        if (session === undefined)
        {
            res.send({});

            return;
        } 

        const results: string[][] = session.Results as string[][]; 

        let result: string[] | undefined = undefined;
        
        if (results !== undefined)
            result = results[results.length - 1] as string[]; 

        res.send({ State: session.State, Output: (result !== undefined) ? (result as string[]).join("") : ""});
    });

    app.listen(port, () => {
        console.log("Model:", LLM.Model);
        console.log(`Listening on port ${port}`);
    });
}

Main();