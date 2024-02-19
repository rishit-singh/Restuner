import { getDocument } from "pdfjs-dist";
import { createReplicateBot } from "./bot.mjs";
export function ResumeBot(Version, _Model, ApiKey, onGenerateCallback = (tokens) => { }) {
    const Bot = createReplicateBot(Version, _Model, ApiKey);
    let OnGenerateCallback = onGenerateCallback;
    let resumeBuffer = "";
    return {
        async LoadResume(buffer) {
            const pdf = await getDocument(buffer);
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
            this.ResumeBuffer = resumeBuffer;
        },
        set Model(model) {
            _Model = model;
        },
        get Model() {
            return _Model;
        },
        get Callback() {
            return OnGenerateCallback;
        },
        set Callback(callback) {
            OnGenerateCallback = callback;
            Bot.Callback = OnGenerateCallback;
        },
        async Tune(jobDescription) {
            const results = (await Bot.Prompt(`Tune and recreate this resume to match this ${jobDescription}. Put RREND as the last token.`)
                .Run());
            console.log(`Prompt count: ${Bot.Messages.length}`);
            Bot.Save("prompts.txt");
            return results;
        },
        async Prompt(prompt) {
            return (await Bot.Prompt(prompt).Run());
        },
        async Initialize(resumePath = null) {
            return (await Bot.Prompt("You are a resume analyzer. I will provide you a resume in form of text and then a job description. You must analyze and understand the context of the resume. Compare the resume to the job description and give each part of it a score on how relevant it is for the job. Only generate the info when the resume is provided. Respond with OK only if you understand and make sure that the last token of your every response is 'RREND'")
                .Prompt(`Heres the resume \n${this.ResumeBuffer}. Dont generate any info yet, wait for the job description. Also make sure that the last token of your every response is RREND`)
                .Run()).Results;
        },
        ResumeBuffer: resumeBuffer,
    };
}
