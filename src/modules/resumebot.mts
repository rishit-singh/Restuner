import {getDocument} from "pdfjs-dist";
import { ReplicateBot, TokenCallback, Model, Message } from "./bot.mjs";
import { UnsafeCast } from "../util.js";
import { TextItem } from "pdfjs-dist/types/src/display/api.js";

export enum ResumeBotState
{
    Setup,
    Tuning,
    Idle
}

export class ResumeBot
{
    _ResumeBuffer: string;
    
    _State: ResumeBotState; 

    _Model: Model;

    _Bot: ReplicateBot;

    constructor(model: Model, apiKey: string, onGenerateCallback: TokenCallback = (tokens: string[]) => { })
    {
        this._State = ResumeBotState.Idle;
        this._Model = model;
        
        this._ResumeBuffer = "";

        this._Bot = new ReplicateBot(this._Model, apiKey, "RREND", onGenerateCallback); 
    }

    async LoadResume(buffer: ArrayBuffer) {
        let resumeBuffer: string = "";

            const pdf = await getDocument(buffer as Uint8Array); 
            
            await pdf.promise
                .then(async (doc) => {
                    const numPages = doc.numPages;
          
                    let lastPromise; // will be used to chain promises
                        lastPromise = doc.getMetadata();

                    for (let i = 1; i <= numPages; i++) {
                        resumeBuffer += await doc.getPage(i)
                            .then(page => page.getTextContent())
                            .then(content => content.items.map(item => item as TextItem))
                            .then(strs => strs.filter(str => str !== undefined))
                            .then(str => str.map(item => item.str).join(""));
                        }
                });

            this._ResumeBuffer = resumeBuffer;
        }

        set Model(model)
        {
            this._Model = model;
        }
 
        get Model(): Model
        {
            return this._Model;
        }

        get State(): ResumeBotState
        {
            return this._State;
        }
        
        get Bot(): ReplicateBot
        {
            return this._Bot;
        }
        
        get ResumeBuffer()
        {
            return this._ResumeBuffer;
        }
        
        async Tune(jobDescription: string)
        {
            this._State = ResumeBotState.Tuning;

            const results = (await this._Bot.Prompt(`Tune and recreate this resume to match this ${jobDescription}. Make sure to include every relevant info from the original resume. Generate the resume in fancy markdown.`)
                            .Run((this as ResumeBot).Model, true));

            this._Bot.Save("prompts.txt");  

            return results;
        }
        
        async Prompt(prompt: string)
        {
            return (await this._Bot.Prompt(prompt).Run());
        }

        async Initialize()
        {
            await this.Bot.Initialize();  
        }

        async PromptResume()
        {  
            this._State = ResumeBotState.Setup;

            return await this._Bot.Setup([new Message("system", "You are a resume analyzer. I will provide you a resume in form of text and then a job description. You must analyze and understand the context of the resume and later generate the requested information based on it."),
                                    new Message("user",  `Heres the resume \n${(this as ResumeBot).ResumeBuffer}. Dont generate any info yet, wait for the job description.`)], true);
        }
} 
