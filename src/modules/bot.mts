import { writeFile } from "fs";
import fetch from "node-fetch";
import { v4 as uuid4} from "uuid";
import Replicate from "replicate";
import EventSource from "eventsource";
import { StringMappingType } from "typescript";

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

export interface ReplicateBot
{
    Version: string,
    Model: string,
    ApiKey: string,
    PromptString: string,
    MessageQueue: Message[],
    Messages: Message[],
    Results: string[],
    EndToken: string,

    Result: () => string[],
    StreamResult: (url: string) => void,
    PollResult: (url: string, maxTokens?: number) => Promise<string[]> 

    Callback: TokenCallback,

    Run: (model?: string, stream?: boolean) => Promise<ReplicateBot>,

    Prompt: (message: string, role?: string) => ReplicateBot,

    Save: (path: string) => void,
}

export function createReplicateBot(Version: string, Model: string, ApiKey: string, EndToken = "RREND", onGenerateCallback: TokenCallback = (tokens: string[]) => {})
    : ReplicateBot
{   
    const MessageQueue: Message[] = [];
 
    const Messages: Message[] = [];

    const Results: string[] = [];

    let PromptString = "";

    let OnGenerateCallback: TokenCallback;

    let JobManager;

    let StreamEventSource: EventSource | null = null; 

    return { 
        Version,
        Model,
        ApiKey,
        PromptString,
        MessageQueue,
        Messages,
        Results,
        EndToken, 

        Result: () => Results.map(result => result.substring(0, result.search(EndToken))),

        async StreamResult(url: string)
        {
            StreamEventSource = new EventSource(url); 
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
        
        async Run(model: string = Model, stream: boolean = false): Promise<ReplicateBot>
        { 
            try
            {  
                while (MessageQueue.length > 0)
                { 
                    const message: Message = MessageQueue.shift() as Message;

                    PromptString += `${message.toString().trim()}\n`;

                    let response = (await (await fetch(`https://api.replicate.com/v1/models/${model}/predictions`,
                                    { 
                                        method: "POST",
                                        headers: { Authorization: `Token ${ApiKey}`},
                                        body: JSON.stringify({
                                            version: Version,
                                            input: {
                                                prompt: PromptString
                                            },
                                            stream: stream
                                        }), 
                                    }
                                )).json()) as any;
                
                    if (message.Role != "system")
                    {
                        Results.push((await this.PollResult(response.urls.get as string))
                                    .filter(token => token !== undefined)
                                    .map(token => token.toString())
                                    .join(""));
                    
                        PromptString += `${Results[Results.length - 1].trim()}\n`;
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

