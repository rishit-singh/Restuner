import { writeFile } from "fs";
import fetch from "node-fetch";
import EventSource from "eventsource";
import Replicate from "replicate";
export function createMessage(role, content) {
    return {
        Role: role,
        Content: content,
        toString: () => (role == "user") ? `[INST] ${content} [/INST]` : content
    };
}
export var BotState;
(function (BotState) {
    BotState[BotState["Setup"] = 0] = "Setup";
    BotState[BotState["Generate"] = 1] = "Generate";
    BotState[BotState["Idle"] = 2] = "Idle";
})(BotState || (BotState = {}));
export async function createReplicateBot(Model, ApiKey, EndToken = "RREND", onGenerateCallback = (tokens) => { }) {
    const MessageQueue = [];
    const Messages = [];
    const Results = [];
    let PromptString = "";
    let _State = BotState.Idle;
    let OnGenerateCallback = onGenerateCallback;
    let JobManager;
    let StreamEventSource = null;
    const ReplicateInstance = new Replicate();
    let Version = (await ReplicateInstance.models.get(Model.Owner, Model.Name)).latest_version?.id;
    return {
        Version,
        Model,
        ApiKey,
        MessageQueue,
        Messages,
        Results,
        EndToken,
        get State() {
            return _State;
        },
        get PromptString() {
            return PromptString;
        },
        async Setup(setupPrompts = [], stream = false) {
            setupPrompts.forEach(prompt => MessageQueue.push(prompt));
            try {
                this.Run(Model, stream);
            }
            catch (e) {
                console.log(`Error occurred during setup: ${e}`);
                return false;
            }
            return true;
        },
        Result: () => Results.map(result => {
            const joined = result.join("");
            return joined.substring(0, joined.search(EndToken));
        }),
        StreamResult(url) {
            StreamEventSource = new EventSource(url, { withCredentials: true });
            Results.push([]);
            let index = Results.length - 1;
            _State = BotState.Generate;
            StreamEventSource.addEventListener("output", (e) => {
                OnGenerateCallback(e.data);
                Results[index].push(e.data);
            });
            StreamEventSource.addEventListener("error", (e) => {
                throw new Error(`Error occured while streaming: ${JSON.parse(e.data)}`);
            });
            StreamEventSource.addEventListener("done", (e) => {
                StreamEventSource.close();
                console.log("done", JSON.parse(e.data));
                _State = BotState.Idle;
            });
            return index;
        },
        async PollResult(url, maxTokens = 1000) {
            let output = null;
            while (output == null) {
                let response = await ((await fetch(url, {
                    method: "GET",
                    headers: { Authorization: `Token ${ApiKey}` }
                })).json());
                if (response.output !== undefined) {
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
        async Run(model = Model, stream = false) {
            try {
                while (MessageQueue.length > 0) {
                    const message = MessageQueue.shift();
                    PromptString += `${message.toString().trim()}\n`;
                    if (!stream) {
                        let response = (await (await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
                            method: "POST",
                            headers: { Authorization: `Token ${ApiKey}` },
                            body: JSON.stringify({
                                version: Version,
                                input: {
                                    prompt: PromptString
                                },
                                stream: stream
                            }),
                        })).json());
                        if (message.Role != "system") {
                            Results.push([(await this.PollResult(response.urls.get))
                                    .filter(token => token !== undefined)
                                    .map(token => token.toString())
                                    .join("")]);
                            PromptString += `${Results[Results.length - 1].join("").trim()}\n`;
                        }
                    }
                    else {
                        console.log(Model);
                        console.log(Version);
                        this.StreamResult((await ReplicateInstance.predictions.create({
                            version: Version,
                            input: { prompt: PromptString },
                            stream: stream
                        })).urls.stream);
                        while (this.State == BotState.Generate) // wait until idle before generating further
                            await new Promise((resolve) => setTimeout(resolve, 30));
                    }
                }
            }
            catch (e) {
                console.error(e);
            }
            return this;
        },
        Prompt(message, role = "user") {
            let messageObj;
            MessageQueue.push(messageObj = createMessage(role, message));
            return this;
        },
        Save(path) {
            writeFile(path, this.PromptString, err => console.log(err));
        },
        get Callback() {
            return OnGenerateCallback;
        },
        set Callback(callback) {
            OnGenerateCallback = callback;
        }
    };
}
