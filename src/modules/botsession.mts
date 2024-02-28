import { BotState, Model } from "./bot.mjs";
import { ResumeBot, ResumeBotState } from "./resumebot.mjs"
import { v4 as uuid4 } from "uuid";

export enum SessionState
{
    Setup,
    Prompting,
    Idle
}

export class ResumeBotSession
{
    private _ID: string;

    private _Bot: ResumeBot;

    private _Output: string;

    private Resume: ArrayBuffer;

    private JobDescription: string;

    public constructor(resume: ArrayBuffer, jobDescription: string,  model: Model, apiKey: string)
    {
        this._ID = uuid4().toString();
        this._Output = "";

        this._Bot = new ResumeBot(model, apiKey, tokens => { 
                                                    if (tokens !== undefined) this._Output += tokens.join(""); 
                                                });

        this.Resume = resume; 
        this.JobDescription = jobDescription;
    }  
   
    public get Output(): string
    {
        return this._Output;
    }

    public get ID(): string 
    {
        return  this._ID; 
    }

    public get State(): ResumeBotState
    {
        return this._Bot.State;
    }

    public get Bot(): ResumeBot
    {
        return this._Bot;
    }

    public get Results(): string[][]
    { 
        return this._Bot.Bot.Results;
    }

    public async Initialize()
    {
        await this._Bot.Initialize();
        await this._Bot.LoadResume(this.Resume);
        await this._Bot.PromptResume();
    }

    public async Prompt(message: string)
    {
        await this._Bot.Prompt(message);
    }

    public async Run()
    {  
        await this._Bot.Tune(this.JobDescription);
    }
}