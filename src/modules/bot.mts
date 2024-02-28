import { writeFile } from "fs";
import fetch from "node-fetch";
import Replicate from "replicate";

/**
 * Represents a prompt message 
 */
export class Message 
{
    public Role: string; // Message role

    public Content: string; // Message content

    /**
     *  Generates a string representing the current Message instance
     * @returns 
     */
    toString(): string 
    {
        return (this.Role == "user") ? `[INST] ${this.Content} [/INST]` : this.Content;
    }

    /**
     * Constructor 
     * @param role Role to set 
     * @param content Content to set
     */
    constructor(role: string, content: string)
    {
        this.Role = role;
        this.Content = content;
    }
}

/**
 * Execution state of the bot 
 */
export enum BotState
{
    Setup,
    Generate,
    Idle
} 

export type TokenCallback = (tokens: string[]) => void;

export type Model = { Owner: string, Name: string };

/**
 * Abstraction of Replicate sdk instance with routines to support prompting in a more controlled manner 
 */
export class ReplicateBot
{
    public Model: Model; // Model to use

    public Version: string; // Model version

    public ApiKey: string; // Replicate API key

    public MessageQueue: Message[]; // Message queue

    public Messages: Message[]; // Stack of all messages generated during prompting

    public Results: string[][]; // Messages in form of strings generated during prompting

    public EndToken: string; // End token to seek while polling syncronously

    private OnGenerateCallback: TokenCallback; // Callback to be called on every token generation

    private _State: BotState; // Bot state

    private _PromptString: string; // Combination of all Result strings in Replicate's prompt conversation format

    private ReplicateInstance: Replicate; // Replicate sdk instance

    /**
     * Constructor 
     * @param Model Model to use 
     * @param ApiKey Replicate API key
     * @param EndToken End token to set
     * @param onGenerateCallback Callback to set
     */
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

    /**
     * Selects the latest version of the selected model  
     */
    async Initialize()
    {
        this.Version = (await this.ReplicateInstance.models.get(this.Model.Owner, this.Model.Name)).latest_version?.id as string;
    }
   
    /**
     * State getter
     */
    get State(): BotState {
        return this._State;
    }

    /**
     * PromptString getter
     */
    get PromptString(): string {
        return this._PromptString;
    }
    
    /**
     * Callback getter 
     */
    get Callback()
    {
        return this.OnGenerateCallback;
    }

    /**
     * Callbacl setter  
     */
    set Callback(callback)
    {
        this.OnGenerateCallback = callback;
    }

    /**
     * Runs the provided prompts before the actual prompting chain starts. 
     * @param setupPrompts Prompts to run 
     * @param stream Stream flag 
     * @returns Execution state
     */
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

    /**
     * Combines the Result strings into one
     * @returns Combined result strings 
     */
    Result(): string
    {
        return this.Results.map(result => {
            const joined = result.join("");
        
            return joined.substring(0, joined.search(this.EndToken));
        }).join("");
    }
      
    /**
     * Polls for generated tokens synchornously without streaming
     * @param url URL to fetch from 
     * @param maxTokens Max tokens
     * @returns Results 
     */
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
        
    /**
     * Runs the all the prompts synchronously and polls the results 
     * @param model Model to use
     * @param stream Stream flag to specify if to stream while polling or not
     * @returns Bot instance 
     */
    async Run(model: Model = this.Model, stream: boolean = true): Promise<ReplicateBot>
    {
        try 
        {
            while (this.MessageQueue.length > 0) {
                const message: Message = this.MessageQueue.shift() as Message;

                this._PromptString += `${message.toString().trim()}\n`;

                if (!stream) {
                    if (message.Role != "system") { // Poll for messages that are not system 
                        this.Results.push([(await this.PollResult((await this.ReplicateInstance.predictions.create({ version: this.Version, model: `${this.Model.Owner}/${this.Model.Name}`, input: { prompt: this._PromptString } })).urls.get as string))
                            .filter(token => token !== undefined)
                            .map(token => token.toString())
                            .join("")]);

                        this._PromptString += `${this.Results[this.Results.length - 1].join("").trim()}\n`;
                    }
                }
                else { // asynchornously consume the stream of generated tokens
                    this.Results.push([]);

                    console.log(`\nPROMPT: ${this._PromptString}\n`);

                    for await (const event of this.ReplicateInstance.stream(`${this.Model.Owner}/${this.Model.Name}`, { input: { prompt: this.PromptString } })) {
                        this.OnGenerateCallback([event.data]);

                        this.Results[this.Results.length - 1].push(event.data);
                    }

                    this._PromptString += `${this.Results[this.Results.length - 1].join("")}\n`;
                }
            }

        }
        catch (e) {
            console.error(e);
        }

        return this;
    }

    /**
     * Adds a message to the MessageQueue
     * @param message Message content 
     * @param role Message role
     * @returns Current ReplicateBot instance 
     */
    Prompt(message: string, role = "user"): ReplicateBot
    {
        let messageObj;

        this.MessageQueue.push(messageObj = new Message(role, message));

        return this;
    }

    /**
     * Saves the PromptString in its current state to the specified file
     * @param path 
     */
    Save(path: string)
    {
        writeFile(path, (this as ReplicateBot).PromptString, err => console.log(err));
    }
}

