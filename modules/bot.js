import { writeFile } from "fs";
import fetch from "node-fetch";

function Message(role, content)
{
    return {
        Role: role,
        Content: content,
        toString: () => (role == "user") ? `[INST] ${content} [/INST]` : content
    }
}

export function ReplicateBot(Version, Model, ApiKey, EndToken = "RREND", onGenerateCallback = tokens => {})
{   
    const MessageQueue = [];

    const Messages = [];

    const Results = [];

    let PromptString = "";

    const PollResult = async (url, maxTokens = 1000) => {
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

                for (let x = 0; outputSpread.join("").search(EndToken) == -1; x++)
                {
                    output = outputSpread;
                    
                    response = await ((await fetch(url, {
                        method: "GET",
                        headers: { Authorization: `Token ${ApiKey}` }
                    })).json());

                    if (response.output === undefined)
                        break;

                    outputSpread = [...response.output];

                    onGenerateCallback(outputSpread);
                }
            }
        }
        
        return output;
    }
    
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

       async Run(model = Model) { 
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
                                                prompt: PromptString,
                                                max_new_tokens: 1024
                                            }
                                        }) 
                                    }
                                )).json());
                               
                    Results.push((await PollResult(response.urls.get))
                                .filter(token => token !== undefined)
                                .map(token => token.toString())
                                .join(""));
                    

                    PromptString += `${Results[Results.length - 1].trim()}\n`;
                }
            }
            catch (e) 
            {
                console.error(e);
            }

            return this;
        },

        Prompt(message, stream = false) {
            let messageObj;
           
            MessageQueue.push(messageObj = Message("user", message));
            Messages.push(messageObj);

            return this; 
        },

        Save(path)
        {
            console.log(); 

            writeFile(path, this.PromptString, err => err);
        }
    }
}