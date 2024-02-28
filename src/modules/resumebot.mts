import {getDocument} from "pdfjs-dist";
import { ReplicateBot, TokenCallback, Model, Message } from "./bot.mjs";
import { UnsafeCast } from "../util.js";
import { TextItem } from "pdfjs-dist/types/src/display/api.js";

/**
 * Execution state of the bot 
 */
export enum ResumeBotState
{
    Setup,
    Tuning,
    Idle
}

/**
 * Abstraction over ReplicateBot with routines that implement the resume tuning utility 
 */
export class ResumeBot
{
    private _ResumeBuffer: string; // String extracted from the provided buffer
    
    private _State: ResumeBotState; // Bot state 

    private _Model: Model; // Model to use

    private _Bot: ReplicateBot; // ReplicateBot instance

    /**
     * Constructor   
     * @param model Model to set 
     * @param apiKey API key to set
     * @param onGenerateCallback Callback to set
     */
    constructor(model: Model, apiKey: string, onGenerateCallback: TokenCallback = (tokens: string[]) => { })
    {
        this._State = ResumeBotState.Idle;
        this._Model = model;
        
        this._ResumeBuffer = "";

        this._Bot = new ReplicateBot(this._Model, apiKey, "RREND", onGenerateCallback); 
    }

    /**
     * Loads the resume from a PDF buffer into a string
     * @param buffer PDF buffer to load from 
     */
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

        /**
         * Model setter
         */
        set Model(model)
        {
            this._Model = model;
        }
 
        /**
         * Model getter 
         */
        get Model(): Model
        {
            return this._Model;
        }

        /**
         * State getter 
         */
        get State(): ResumeBotState
        {
            return this._State;
        }
        
        /**
         * Bot getter 
         */
        get Bot(): ReplicateBot
        {
            return this._Bot;
        }
        
        /**
         * ResumeBuffer getter 
         */
        get ResumeBuffer()
        {
            return this._ResumeBuffer;
        }
       
        /**
         * Runs the prompts to tune the resume
         * @param jobDescription Job description to tune for
         * @returns Prompt results
         */
        async Tune(jobDescription: string): Promise<string[][]>
        {
            this._State = ResumeBotState.Tuning;  

            const result = (await this._Bot.Prompt(`Tune and recreate this resume to match this ${jobDescription}. Make sure to include every relevant info from the original resume. Generate the resume in fancy markdown.`)
                            .Run((this as ResumeBot).Model, true));

            this._Bot.Save("prompts.txt");  

            return result.Results;
        }

        /**
         * Prompts the given text  
         * @param prompt 
         * @returns 
         */
        async Prompt(prompt: string): Promise<string[][]>
        {
            return (await this._Bot.Prompt(prompt).Run()).Results;
        }

        /**
         * Initializes the bot
         */
        async Initialize()
        {
            await this.Bot.Initialize();  
        }

        /**
         * Prompts the loaded resume to the bot 
         * @returns 
         */
        async PromptResume()
        {  
            this._State = ResumeBotState.Setup;

            return await this._Bot.Setup([new Message("system", "You are a resume analyzer. I will provide you a resume in form of text and then a job description. You must analyze and understand the context of the resume and later generate the requested information based on it."),
                                    new Message("user",  `Heres the resume \n${(this as ResumeBot).ResumeBuffer}. Dont generate any info yet, wait for the job description.`)], true);
        }
} 
