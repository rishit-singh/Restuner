import {getDocument} from "pdfjs-dist";
import { ReplicateBot, TokenCallback, Model, Message } from "./bot.mjs";
import { UnsafeCast } from "../util.js";
import { TextContent, TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api.js";

export enum ResumeBotState
{
    Setup,
    Tuning,
    Idle
}

export interface ResumeBot
{
    LoadResume: (buffer: ArrayBuffer) => void,

    Model: Model,

    ResumeBuffer: string,

    State: ResumeBotState,

    Bot: ReplicateBot, 

    Callback: TokenCallback,

    Tune: (tokens: string) => void,

    Prompt: (prompt: string) => void,
    
    Initialize: () => void
}

export async function createResumeBot(_Model: Model, onGenerateCallback: TokenCallback = (tokens: string[]) => { }) : Promise<ResumeBot>
{
    const _Bot = new ReplicateBot(_Model, process.env.REPLICATE_API_TOKEN as string);
   
    await _Bot.Initialize();

    let OnGenerateCallback: TokenCallback = onGenerateCallback;

    let resumeBuffer: string = "";
    
    let _State: ResumeBotState = ResumeBotState.Idle; 

    return {
         async LoadResume(buffer: ArrayBuffer) {
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

            (this as ResumeBot).ResumeBuffer = resumeBuffer;
        },

        set Model(model)
        {
            _Model = model;
        },
 
        get Model(): Model
        {
            return _Model;
        },

        get State(): ResumeBotState
        {
            return _State;
        },
        
        get Callback(): TokenCallback
        {
            return OnGenerateCallback;
        },

        get Bot(): ReplicateBot
        {
            return _Bot;
        },

        set Callback(callback)
        {
            OnGenerateCallback = callback;

            _Bot.Callback = OnGenerateCallback;
        },
        
        async Tune(jobDescription: string)
        {
            _State = ResumeBotState.Tuning;

            const results = (await _Bot.Prompt(`Tune and recreate this resume to match this ${jobDescription}. Make sure to include every relevant info from the original resume. Generate the resume in fancy markdown.`)
                            .Run((this as ResumeBot).Model, true));

            _Bot.Save("prompts.txt");  

            return results;
        },
        
        async Prompt(prompt: string)
        {
            return (await _Bot.Prompt(prompt).Run());
        },

        async Initialize()
        {  
            _State = ResumeBotState.Setup;

            return await _Bot.Setup([new Message("system", "You are a resume analyzer. I will provide you a resume in form of text and then a job description. You must analyze and understand the context of the resume and later generate the requested information based on it."),
                                    new Message("user",  `Heres the resume \n${(this as ResumeBot).ResumeBuffer}. Dont generate any info yet, wait for the job description.`)], true);
        },
        
        ResumeBuffer: resumeBuffer,
    };
} 
