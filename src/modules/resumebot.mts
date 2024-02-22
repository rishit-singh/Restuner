import {getDocument} from "pdfjs-dist";
import { ReplicateBot, createReplicateBot, TokenCallback, Model, createMessage } from "./bot.mjs";
import { UnsafeCast } from "../util.js";

export interface ResumeBot
{
    LoadResume: (buffer: ArrayBuffer) => void,

    Model: Model,

    ResumeBuffer: string,

    Callback: TokenCallback,

    Tune: (tokens: string) => void,

    Prompt: (prompt: string) => void,
    
    Initialize: () => void
}

export async function createResumeBot(_Model: Model, onGenerateCallback: TokenCallback = (tokens: string[]) => { }) : Promise<ResumeBot>
{
    console.log(_Model);
    const Bot = await createReplicateBot(_Model, process.env.REPLICATE_API_TOKEN as string);
   
    let OnGenerateCallback: TokenCallback = onGenerateCallback;

    let resumeBuffer: string = "";
    
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
                            .then(page => page.getTextContent()
                            .then(content => content.items.map(item => item)))
                            .then(strs => strs.filter(str => str !== undefined).join(" "))
                            .then(str => str);
                        }
                    });

            (this as ResumeBot).ResumeBuffer = resumeBuffer;
        },

        set Model(model)
        {
            _Model = model;
        },
 
        get Model()
        {
            return _Model;
        },
            
        get Callback(): TokenCallback
        {
            return OnGenerateCallback;
        },

        set Callback(callback)
        {
            OnGenerateCallback = callback;

            Bot.Callback = OnGenerateCallback;
        },
        
        async Tune(jobDescription: string)
        {
            const results = (await Bot.Prompt(`Tune and recreate this resume to match this ${jobDescription}.`)
                            .Run());

            console.log(`Prompt count: ${Bot.Messages.length}`);

            Bot.Save("prompts.txt");  

            return results;
        },
        
        async Prompt(prompt: string)
        {
            return (await Bot.Prompt(prompt).Run());
        },

        async Initialize()
        {   
            return await Bot.Setup([createMessage("system", "You are a resume analyzer. I will provide you a resume in form of text and then a job description. You must analyze and understand the context of the resume. Compare the resume to the job description and give each part of it a score on how relevant it is for the job. Only generate the info when the resume is provided."),
                                    createMessage("user",  `Heres the resume \n${(this as ResumeBot).ResumeBuffer}. Dont generate any info yet, wait for the job description.`)]);
        },
        
        ResumeBuffer: resumeBuffer,
    };
} 
