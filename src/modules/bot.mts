import { writeFile } from "fs";
import fetch from "node-fetch";
import EventSource, { EventSourceInitDict } from "eventsource";
import Replicate from "replicate";
import { waitForDebugger } from "inspector";
import { version } from "os";

export class Message 
{
    public Role: string;

    public Content: string;

    toString(): string 
    {
        return (this.Role == "user") ? `[INST] ${this.Content} [/INST]` : this.Content;
    }

    constructor(role: string, content: string)
    {
        this.Role = role;
        this.Content = content;
    }
}

export type TokenCallback = (tokens: string[]) => void;

export type Model = { Owner: string, Name: string };

export enum BotState
{
    Setup,
    Generate,
    Idle
} 

export class ReplicateBot
{
    public Version: string;

    public Model: Model;

    public ApiKey: string;

    public MessageQueue: Message[];

    public Messages: Message[];

    public Results: string[][];

    public EndToken: string;

    private OnGenerateCallback: TokenCallback;

    private _State: BotState;

    private _PromptString: string;

    private ReplicateInstance: Replicate;

    public constructor(Model: Model, ApiKey: string, EndToken = "RREND", onGenerateCallback: TokenCallback = (tokens: string[]) => {})
    {
        this.Version = "";
        this.Model = Model;
        this.ApiKey = ApiKey;
        this.EndToken = EndToken; 
        this.MessageQueue = [];
        this.Messages = [];
        this.Results = [];

        this._PromptString = "";

        this.OnGenerateCallback = onGenerateCallback;

        this.ReplicateInstance = new Replicate({
            auth: this.ApiKey
        }); 
         
        this._State = BotState.Idle;
        
    }

    async Initialize()
    {
        this.Version = (await this.ReplicateInstance.models.get(this.Model.Owner, this.Model.Name)).latest_version?.id as string;
    }
    
    get State(): BotState {
        return this._State;
    }

    get PromptString(): string {
        return this._PromptString;
    }
 
    async Setup(setupPrompts: Message[] = [], stream: boolean = false): Promise<boolean> {
        setupPrompts.forEach(prompt => this.MessageQueue.push(prompt));

        try {
            this._State = BotState.Setup;

            await this.Run(this.Model, stream);
        }
        catch (e) {
            console.log(`Error occurred during setup: ${e}`);
            return false;
        }

        return true;
    }

    Result(): string
    {
        return this.Results.map(result => {
            const joined = result.join("");
        
            return joined.substring(0, joined.search(this.EndToken));
        }).join("");
    }
        
    async PollResult(url: string, maxTokens: number = 1000): Promise<string[]>
    {
        let output: string[] | null = null;

        while (output == null) {
            let response = await ((await fetch(url, {
                method: "GET",
                headers: { Authorization: `Token ${this.ApiKey}` }
            })).json()) as any;

            if (response.output !== undefined) {
                let outputSpread = [...response.output];

                for (let x = 0; outputSpread.join("").search(this.EndToken) == -1; x++) {
                    output = outputSpread;

                    response = await ((await fetch(url, {
                        method: "GET",
                        headers: { Authorization: `Token ${this.ApiKey}` }
                    })).json());

                    if (response.output === undefined)
                        break;

                    outputSpread = [...response.output];

                    this.OnGenerateCallback(outputSpread);
                }
            }
        }

        return output;
    }
        
    async Run(model: Model = this.Model, stream: boolean = true): Promise<ReplicateBot>
    {
        try 
        {
            while (this.MessageQueue.length > 0) {
                const message: Message = this.MessageQueue.shift() as Message;

                this._PromptString += `${message.toString().trim()}\n`;

                if (!stream) {
                    if (message.Role != "system") {
                        this.Results.push([(await this.PollResult((await this.ReplicateInstance.predictions.create({ version: this.Version, model: `${this.Model.Owner}/${this.Model.Name}`, input: { prompt: this._PromptString } })).urls.get as string))
                            .filter(token => token !== undefined)
                            .map(token => token.toString())
                            .join("")]);

                        this._PromptString += `${this.Results[this.Results.length - 1].join("").trim()}\n`;
                    }
                }
                else {
                    this.Results.push([]);

                    console.log(`\nPROMPT: ${this._PromptString}\n`);

                    for await (const event of this.ReplicateInstance.stream(`${this.Model.Owner}/${this.Model.Name}`, { input: { prompt: this.PromptString } })) {
                        this.OnGenerateCallback([event.data]);

                        this.Results[this.Results.length - 1].push(event.data);
                    }

                    this._PromptString += `${this.Results[this.Results.length - 1].join("")}\n`;
                }
            }

            console.log("END");
        }
        catch (e) {
            console.error(e);
        }

        return this;
    }

    Prompt(message: string, role = "user"): ReplicateBot
    {
        let messageObj;

        this.MessageQueue.push(messageObj = new Message(role, message));

        return this;
    }

    Save(path: string)
    {
        writeFile(path, (this as ReplicateBot).PromptString, err => console.log(err));
    }

    get Callback()
    {
        return this.OnGenerateCallback;
    }

    set Callback(callback)
    {
        this.OnGenerateCallback = callback;
    }
}

