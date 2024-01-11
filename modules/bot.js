import fetch from "node-fetch";

export class Message
{
    constructor(role, content)
    {
        this.Role = role;
        this.Content = content;
    }

    toString() 
    {
        return (this.Role == "user") ? `[INST] ${this.Content} [/INST]` : this.Content;
    }
}

export class ReplicateBot
{   
    constructor(version, model, apiKey, endToken = "RESPONSEEND")
    {
        this.Version = version;
        this.Model = model;
        this.ApiKey = apiKey;
        this.PromptString = "";
        this.MessageQueue = [];
        this.Messages = [];
        this.Results = [];
        this.EndToken = endToken; 
    }

    Result()
    {
        return this.Results;
    }

    async PollResult(url, maxTokens = 1000)
    {
        let output = null;

        while (output == null)
        {
            let response = await ((await fetch(url, {
                method: "GET",
                headers: { Authorization: `Token ${this.ApiKey}` }
            })).json());

            if (response.output !== undefined)
            {
                let outputSpread = [...response.output];


                for (let x = 0; outputSpread.join("").search(this.EndToken) != -1; x++)
                {
                    output = outputSpread;

                    response = await ((await fetch(url, {
                        method: "GET",
                        headers: { Authorization: `Token ${this.apikey}` }
                    })).json());
                    console.log(output.join(""));

                    if (response.output === undefined)
                        break;

                    outputSpread = [...response.output];
                }
            }
        }
        
        return output;
    }

    async Run()
    {
        try
        {  
            while (this.MessageQueue.length > 0)
            { 
                const message = this.MessageQueue.shift();

                this.PromptString += `${message.toString().trim()}\n`;

                let response = (await (await fetch(`https://api.replicate.com/v1/models/${this.Model}/predictions`,
                                { 
                                    method: "POST",
                                    headers: { Authorization: `Token ${this.ApiKey}`},
                                    body: JSON.stringify({
                                        version: this.Version,
                                        input: {
                                            prompt: this.PromptString,
                                            max_new_tokens: 1000
                                        }
                                    }) 
                                }
                            )).json());
                            
                this.Results.push((await this.PollResult(response.urls.get))
                            .filter(token => token !== undefined)
                            .map(token => token.toString())
                            .join(""));

                this.PromptString += `${this.Results[this.Results.length - 1].trim()}\n`;
                
                console.log(this.PromptString);
            }
        }
        catch (e) 
        {
            console.error(e);
        }

        return this;
    }

    Prompt(message, stream = false)
    {
        let messageObj;
        this.MessageQueue.push(messageObj = new Message("user", message));
        this.Messages.push(messageObj);

        return this;
    }
}

