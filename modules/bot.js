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
    constructor(version, model, apiKey)
    {
        this.Version = version;
        this.Model = model;
        this.ApiKey = apiKey;

        this.PromptString = "";

        this.MessageQueue = [];

        this.Messages = [];
    
        this.Results = []; 
    }

    Result()
    {
        return this.Messages;
    }

    GeneratePromptString()
    {
        this.PromptString = this.Messages.map(message => message.toString()).join("\n"); 
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

            let fetched = 0;

            if (response.output !== undefined)
            {
                console.log(response.output);
                let outputSpread = [...response.output];

                for (let x = 0; !outputSpread.filter(token => token.search("END") != -1).length < 1 ; x++)
                {
                    output = outputSpread;

                    fetched = output.length;
                    
                    response = await ((await fetch(url, {
                        method: "get",
                        headers: { Authorization: `Token ${this.apikey}` }
                    })).json());

                    if (response.output === undefined)
                        break;

                    outputSpread = [...response.output];
                    console.log(outputSpread[outputSpread - 1]);

                    if ((x % 10) == 0)
                        console.log(`${outputSpread.join("")}\nTokens: ${outputSpread.length}`);
                }
            }
        }
        
        return output;
    }

    async Run()
    {
        this.GeneratePromptString();

        console.log(this.PromptString);

        try
        {   
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
        }
        catch (e) 
        {
            console.error(e);
        }

        return this.Results;
    }

    Prompt(message, stream = false)
    {
        this.Messages.push(new Message("user", message));

        return this;
    }
}

