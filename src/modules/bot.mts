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

export interface ReplicateBot
{
    Version: string,
    Model: Model,
    ApiKey: string,
    PromptString: string,
    MessageQueue: Message[],
    Messages: Message[],
    Results: string[][],
    EndToken: string,    
    State: BotState,

    Setup: (setupPrompts?: Message[], stream?: boolean) => Promise<boolean>; 

    Result: () => string[],
    
    PollResult: (url: string, maxTokens?: number) => Promise<string[]> 

    Callback: TokenCallback,

    Run: (model?: Model, stream?: boolean) => Promise<ReplicateBot>,

    Prompt: (message: string, role?: string) => ReplicateBot,

    Save: (path: string) => void,

    toString(): string
}

export async function createReplicateBot(Model: Model, ApiKey: string, EndToken = "RREND", onGenerateCallback: TokenCallback = (tokens: string[]) => {})
    : Promise<ReplicateBot>
{   
    const MessageQueue: Message[] = [];
 
    const Messages: Message[] = [];

    const Results: string[][] = [];

    let PromptString = "";

    let _State: BotState = BotState.Idle;

    let OnGenerateCallback: TokenCallback = onGenerateCallback;

    let JobManager;

    let EventSources: EventSource[] = [];

    const ReplicateInstance = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN
    });  

    let Version: string = (await ReplicateInstance.models.get(Model.Owner, Model.Name)).latest_version?.id as string;
    
    return { 
        Version,
        Model,
        ApiKey,
        MessageQueue,
        Messages,
        Results,
        EndToken, 

        get State(): BotState
        {
            return _State;
        },

        get PromptString(): string 
        { 
            return PromptString; 
        },

        async Setup(setupPrompts: Message[] = [], stream: boolean = false): Promise<boolean>
        {   
            setupPrompts.forEach(prompt => MessageQueue.push(prompt));
            
            try
            {
                _State = BotState.Setup;

                await (this as ReplicateBot).Run(Model, stream); 
            }
            catch (e)
            {
                console.log(`Error occurred during setup: ${e}` );
                return false;
            }

            return true; 
        },

        Result: () => Results.map(result => {
            const joined = result.join("");
            
            return joined.substring(0, joined.search(EndToken));
        }),
        
        async PollResult(url: string, maxTokens = 1000): Promise<string[]>
        {
            let output: string[] | null = null;

            while (output == null) 
            {
                let response = await ((await fetch(url, {
                    method: "GET",
                    headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` }
                })).json()) as any;

                if (response.output !== undefined) 
                {
                    let outputSpread = [...response.output];

                    for (let x = 0; outputSpread.join("").search(EndToken) == -1; x++) {
                        output = outputSpread;

                        response = await ((await fetch(url, {
                            method: "GET",
                            headers: { Authorization: `Token ${ApiKey}` }
                        })).json());

                        if (response.output === undefined)
                            break;

                        outputSpread = [...response.output];

                        OnGenerateCallback(outputSpread);
                    }
                }
            }

            return output;
        },
        
        async Run(model: Model = Model, stream: boolean = true): Promise<ReplicateBot>
        { 
            try
            {  
                while (MessageQueue.length > 0)
                { 
                    const message: Message = MessageQueue.shift() as Message;

                    PromptString += `${message.toString().trim()}\n`;

                    if (!stream)
                    {
                        if (message.Role != "system") {
                            Results.push([(await (this as ReplicateBot).PollResult((await ReplicateInstance.predictions.create({version: Version, model: `${Model.Owner}/${Model.Name}`, input: {prompt:  PromptString}})).urls.get as string))
                                .filter(token => token !== undefined)
                                .map(token => token.toString())
                                .join("")]);

                            PromptString += `${Results[Results.length - 1].join("").trim()}\n`;
                        }
                    }
                    else
                    {
                        Results.push([]);

                        console.log(`\nPROMPT: ${PromptString}\n`);

                        for await (const event of ReplicateInstance.stream(`${Model.Owner}/${Model.Name}`, { input: {prompt: PromptString} }))         
                        {
                            OnGenerateCallback([event.data]);  

                            Results[Results.length - 1].push(event.data);
                        }

                        PromptString += `${Results[Results.length - 1].join("")}\n`;
                    }
                }   
                
                console.log("END");
            }
            catch (e) 
            {
                console.error(e);
            }

            return this;
        },

        Prompt(message: string, role = "user"): ReplicateBot
        {
            let messageObj;
           
            MessageQueue.push(messageObj = new Message(role, message));

            return  (this as ReplicateBot); 
        },

        Save(path: string)
        {
            writeFile(path,  (this as ReplicateBot).PromptString, err => console.log(err));
        },

        get Callback()
        {
            return OnGenerateCallback;
        },

        set Callback(callback)
        {
            OnGenerateCallback = callback;
        }
    };
} 

