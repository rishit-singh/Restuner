import { kMaxLength } from "buffer";
import { writeFile } from "fs";
import fetch from "node-fetch";
import {v4 as uuidv4} from "uuid";

function Message(role: string, content: string)
{
    return {
        Role: role,
        Content: content,
        
        toString: () => (role == "user") ? `[INST] ${content} [/INST]` : content
    }
}
            
function PromptJob(model, apikey, _stream) 
{
    const MessageQueue = [];

    return {
        ID: uuidv4(),

        Stage: "Initialize",

        PromptString: "",

        Result: {},

        Prompt(message, stage = "Initialize")
        {
            MessageQueue.push({ Message: message, State: stage });

            return this;
        },

        async Run()
        {
            while (MessageQueue.length > 0)
            {
                const message = MessageQueue.shift();
           
                this.PromptString += `${message.toString()}\n`;
            }

            this.Result = await (await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, 
                                {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Token ${apikey}`
                                    },
                                    body: JSON.stringify(
                                        {
                                            input: {
                                                "prompt": message                                            
                                            },
                                            stream: _stream
                                        }
                                    )
                                })).json(); 
            return this.Result;
        }
    };
}

export function PromptJobManager()
{  
    const Jobs = new Map();
    const ResultTokens = new Map();

    return {
        AddJob(job)
        {
            Jobs.set(job.ID, { Promise: job.Run(), Result: null });
        },
        
        async RunJob(id)
        {
            Jobs[id].Result = await Jobs[id].Promise;
        },

        async RunAllJobs()
        {
            Jobs.forEach(async (value, key, map) => {
                map[key].Result = await value;
            });
        }
    };
} 

export function ReplicateBot(Version, Model, ApiKey, EndToken = "RREND", onGenerateCallback = tokens => {})
{   
    const MessageQueue = [];

    const Messages = [];

    const Results = [];

    let PromptString = "";

    let OnGenerateCallback; 

    let JobManager;

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

        async PollResult(url, maxTokens = 1000) 
        {
            let output = null;

            while (output == null) 
            {
                let response = await ((await fetch(url, {
                    method: "GET",
                    headers: { Authorization: `Token ${ApiKey}` }
                })).json());

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
        
        async Run(model = Model, stream = false) 
        { 
            try
            {  
                while (MessageQueue.length > 0)
                { 
                    const message = MessageQueue.shift();

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
                                )).json());
                
                    if (message.Role != "system")
                    {
                        Results.push((await this.PollResult(response.urls.get))
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

        Prompt(message, role = "user") {
            let messageObj;
           
            MessageQueue.push(messageObj = Message(role, message));

            return this; 
        },

        Save(path)
        {
            writeFile(path, this.PromptString, err => console.log(err));
        },

        get Callback()
        {
            return callback;
        },

        set Callback(callback)
        {
            OnGenerateCallback = callback;
        }
    };
} 
