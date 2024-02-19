import { writeFile } from "fs";
import fetch from "node-fetch";
import EventSource from "eventsource";
import Replicate from "replicate";
import { waitForDebugger } from "inspector";

interface Message {
    Role: string,
    Content: string,

    toString: () => string
}

function createMessage(role: string, content: string): Message {
    return {
        Role: role,
        Content: content,

        toString: () => (role == "user") ? `[INST] ${content} [/INST]` : content
    };
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
    StreamResult: (url: string) => number,
    PollResult: (url: string, maxTokens?: number) => Promise<string[]> 

    Callback: TokenCallback,

    Run: (model?: Model, stream?: boolean) => Promise<ReplicateBot>,

    Prompt: (message: string, role?: string) => ReplicateBot,

    Save: (path: string) => void,

    toString(): string
}

export function createReplicateBot(Model: Model, ApiKey: string, EndToken = "RREND", onGenerateCallback: TokenCallback = (tokens: string[]) => {})
    : ReplicateBot
{   
    const MessageQueue: Message[] = [];
 
    const Messages: Message[] = [];

    const Results: string[][] = [];

    let PromptString = "";

    let _State: BotState = BotState.Idle;

    let OnGenerateCallback: TokenCallback = onGenerateCallback;

    let JobManager;

    let StreamEventSource: EventSource | null = null; 

    const ReplicateInstance = new Replicate();  

    let Version: string = ""; 

    ReplicateInstance.models.get(Model.Owner, Model.Name).then(
        e => {
            Version = e.latest_version?.id as string
        }
    );

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
                await this.Run(); 
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

        StreamResult(url: string): number 
        { 
            StreamEventSource = new EventSource(url, { withCredentials: true });

            Results.push([]);
            
            let index: number = Results.length - 1;

            _State = BotState.Generate;

            StreamEventSource.addEventListener("output", (e) => {
                OnGenerateCallback(e.data);

                Results[index].push(e.data);
              });

            StreamEventSource.addEventListener("error", (e) => {
                throw new Error(`Error occured while streaming: ${JSON.parse(e.data)}`);
            });

            StreamEventSource.addEventListener("done", (e) => {
                (StreamEventSource as EventSource).close();

                console.log("done", JSON.parse(e.data));

                _State = BotState.Idle;
            });

            return index;
        },
        
        async PollResult(url: string, maxTokens = 1000): Promise<string[]>
        {
            let output: string[] | null = null;

            while (output == null) 
            {
                let response = await ((await fetch(url, {
                    method: "GET",
                    headers: { Authorization: `Token ${ApiKey}` }
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
        
        async Run(model: Model = Model, stream: boolean = false): Promise<ReplicateBot>
        { 
            try
            {  
                while (MessageQueue.length > 0)
                { 
                    const message: Message = MessageQueue.shift() as Message;

                    PromptString += `${message.toString().trim()}\n`;

                    if (!stream)
                    {
                        let response = (await (await fetch(`https://api.replicate.com/v1/models/${model}/predictions`,
                            {
                                method: "POST",
                                headers: { Authorization: `Token ${ApiKey}` },
                                body: JSON.stringify({
                                    version: Version,
                                    input: {
                                        prompt: PromptString
                                    },
                                    stream: stream
                                }),
                            }
                        )).json()) as any;

                        if (message.Role != "system") {
                            Results.push([(await this.PollResult(response.urls.get as string))
                                .filter(token => token !== undefined)
                                .map(token => token.toString())
                                .join("")]);

                            PromptString += `${Results[Results.length - 1].join("").trim()}\n`;
                        }
                    }
                    else
                    {
                        this.StreamResult((await ReplicateInstance.predictions.create({
                            version: Version,
                            input: { prompt: PromptString },    
                            stream: stream
                        })).urls.stream as string);

                        while (this.State == BotState.Generate) // wait until idle before generating further
                            await new Promise((resolve) => setTimeout(resolve, 30));
                    } 
                }
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
           
            MessageQueue.push(messageObj = createMessage(role, message));

            return this; 
        },

        Save(path: string)
        {
            writeFile(path, this.PromptString, err => console.log(err));
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

