import fetch from "node-fetch";

export class Bot
{   
    constructor(model, accountID, apiKey)
    {
        this.Model = model;
        this.AccountID = accountID;
        this.ApiKey = apiKey;

        this.Messages = [];

        this.MessageQueue = [];
        this.Results = []; 
    }

    Result()
    {
        return this.Messages;
    }

    async Run()
    {
        while (this.MessageQueue.length > 0)
        {
            this.Messages.push(this.MessageQueue.shift());

            try
            {   
                let response = (await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.AccountID}/ai/run/${this.Model}`,
                                { 
                                    method: "POST",
                                    headers: { Authorization: `Bearer ${this.ApiKey}`},
                                    body: JSON.stringify({ messages: [...this.Messages] }) 
                                }
                            )).json());


                           
                if (response.result !== undefined)
                    this.Messages.push({
                        role: "assistant",
                        content: response.result.response 
                    });
                else
                    console.log(`Messed up response: ${response}`); 
            }
            catch (e) 
            {
                console.error(e);
            }
        }
        
        return this.Messages;
    }

    Prompt(message)
    {
        this.MessageQueue.push({ role: "user", content: message });

        return this;
    }
}
