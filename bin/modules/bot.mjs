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
export function createBotEventSource(URL, InitDict) {
    return {
        Source: new EventSource(URL, InitDict),
        State: BotState.Idle,
        AddEventListener(eventName) {
            return this;
        }
    };
}
export async function createReplicateBot(Model, ApiKey, EndToken = "RREND", onGenerateCallback = (tokens) => { }) {
    const MessageQueue = [];
    const Messages = [];
    const Results = [];
    let PromptString = "";
    let _State = BotState.Idle;
    let OnGenerateCallback = onGenerateCallback;
    let JobManager;
    let EventSources = [];
    const ReplicateInstance = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN
    });
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
                _State = BotState.Setup;
                await this.Run(Model, stream);
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
        async PollResult(url, maxTokens = 1000) {
            let output = null;
            while (output == null) {
                let response = await ((await fetch(url, {
                    method: "GET",
                    headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` }
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
        async Run(model = Model, stream = true) {
            try {
                while (MessageQueue.length > 0) {
                    const message = MessageQueue.shift();
                    PromptString += `${message.toString().trim()}\n`;
                    if (!stream) {
                        if (message.Role != "system") {
                            Results.push([(await this.PollResult((await ReplicateInstance.predictions.create({ version: Version, model: `${Model.Owner}/${Model.Name}`, input: { prompt: PromptString } })).urls.get))
                                    .filter(token => token !== undefined)
                                    .map(token => token.toString())
                                    .join("")]);
                            PromptString += `${Results[Results.length - 1].join("").trim()}\n`;
                        }
                    }
                    else {
                        Results.push([]);
                        for await (const event of ReplicateInstance.stream(`${Model.Owner}/${Model.Name}`, { input: { prompt: PromptString } })) {
                            OnGenerateCallback([event.data.toString()]);
                            Results[Results.length - 1].push(event.data.toString());
                        }
                        PromptString += `${Results[Results.length - 1].join("")}\n`;
                    }
                }
                console.log("END");
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
