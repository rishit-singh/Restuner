import { ReplicateBot } from "./bot.js";
import {getDocument} from "pdfjs-dist";

export function ResumeBot(Version, Model, ApiKey, onGenerateCallback = (tokens) => { })
{
    const Bot = ReplicateBot(Version, Model, ApiKey, "RREND", onGenerateCallback);
    
    let resumeBuffer = "";

    return {
         async LoadResume(resumePath) {
            const pdf = await getDocument(resumePath); 
            
            await pdf.promise
                .then(async function (doc) {
                    const numPages = doc.numPages;
          
                    let lastPromise; // will be used to chain promises
                    lastPromise = doc.getMetadata();

                    for (let i = 1; i <= numPages; i++) {
                        resumeBuffer += await doc.getPage(i)
                            .then(page => page.getTextContent()
                            .then(content => content.items.map(item => item.str)))
                            .then(strs => strs.filter(str => str !== undefined).join(" "))
                            .then(str => str);
                        }
                    });

            this.ResumeBuffer = resumeBuffer;
        },

        set SetModel(model)
        {
            Model = model;
        },

        async Tune(jobDescription)
        {
            const results = (await Bot.Prompt(`Tune this resume to match this ${jobDescription}`)
                            .Run());

            Bot.Save("prompts.txt");  

            return results;
        },
        
        async Prompt(prompt)
        {
            return (await Bot.Prompt(prompt).Run());
        },

        async Initialize(resumePath)
        {
            return (await Bot.Prompt("You are a resume analyzer. I will provide you a resume in form of text and then a job description. You must analyze and understand the context of the resume. Compare the resume to the job description and give each part of it a score on how relevant it is for the job. Only generate the info when the resume is provided. Also make sure that the last token of your every response is RREND")
                .Prompt(`Heres the resume \n${this.ResumeBuffer}. Also make sure that the last token of your every response is RREND`)
                .Run()).Results;
        },
        
        ResumeBuffer: resumeBuffer,
    };
}
