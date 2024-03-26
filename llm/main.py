from ReplicateContext import ReplicateMessage, ReplicateContext, Model, Any
from tinytune.prompt import PromptJob, prompt_job
from tinytune.pipeline import Pipeline
from gptcontext import GPTContext, GPTMessage

import os
import json
import PyPDF2

contexts = {
    "gpt": GPTContext("gpt-4-0125-preview", os.getenv("OPENAI_KEY")), 
    "replicate": ReplicateContext(Model("mistralai", "mixtral-8x7b-instruct-v0.1"), os.getenv("REPLICATE_API_TOKEN")) 
}

def ExtractPDFBuffer(path) -> str:
    bufferStr: str = ""

    with open(path, "rb") as fp:
        reader = PyPDF2.PdfReader(fp)
        for page in reader.pages:
            bufferStr += page.extract_text()

    return bufferStr 


def Callback(content):
    if (content != None):
        print(content, end="")
    else:   
        print()

contexts["gpt"].OnGenerateCallback = Callback
contexts["replicate"].OnGenerateCallback = Callback

@prompt_job("setup")
def Setup(id: str,  context: GPTContext, prevResult: Any):  
    pdf: str = ExtractPDFBuffer("resume.pdf")

    jobDesc: str = """
    looking to hire one experienced Senior Power Platform Developer to supplement and mentor our existing team with Environment Administration and the Support of Power Platform citizen developers. The ideal candidate will have a deep understanding of all types of Power Platform development and a proven track record in designing, developing, and maintaining various Power Platform solutions. As a Senior Power Platform Developer, they will be responsible for collaborating with cross-functional teams to validate requirements, propose and develop solutions, customize Power Platform and Dataverse-based solutions as required, and ensure seamless integration with existing development environments and standards. This role requires strong technical expertise, problem-solving skills, and the ability to lead, mentor and transfer skills and abilities to other developers and administrators.


Must have at least 5-10yrs of Power Platform development experience

Must have at least 5 years of design, architecture experience 

The Senior Power Platform Developer will be responsible to provide solution design, development, and support services including, but not limited to:
• Design, develop, implement, and sustain Power Platform and Dataverse-based solutions according to business requirements.
• Collaborate with stakeholders to gather and analyze project requirements, business-value, and translate them into technical specifications.
• Customize Power Platform solutions, including staged development of power apps, cloud flows, power pages, and copilots (aka power virtual agents) in the new Copilot Studio.
• Develop and document solution architectures, ensuring scalability, security, and performance, ensuring ease of maintenance and support.
• Troubleshoot and resolve data connector-related issues, ensuring high availability and user satisfaction.
• Integrate solutions with other M365 services and enterprise systems, ensuring secure data flow and interoperability.
• Provide technical guidance, mentorship, support, and knowledge transfer to internal developers who are new to the Power Platform.
• Conduct regular testing, quality assurance, and documentation of all solutions.
• Collaborate with product owners and cross-functional teams to deliver high-quality solutions.
• Reporting on issues and progress.
• Other tasks as required.
    """

    (context.Prompt(GPTMessage("user", "You are a resume analyzer. You will be provide you a resume in form of text and then a job description. You must analyze and understand the context of the resume and later generate the requested information based on it. You must only respond with requested info once you're given both resume and job description."))
        .Prompt(GPTMessage("user", f"Here is the resume, {pdf}, wait for the job description to do the analysis"))
        .Prompt(GPTMessage("user", f"Here is the job description, start the analysis: {jobDesc}"))
        .Prompt(GPTMessage("user", "Represent this analysis in form of JSON, and only respond with JSON, no explanation, formatting or backticks"))
        .Run(stream=True)
        .Save("initial_prompts_tune.json"))

with open("initial_prompts_tune.json") as fp:
    for message in json.load(fp):
        contexts["replicate"].Messages.append(str(ReplicateMessage(message["role"], message["content"])))

@prompt_job("followup", contexts["replicate"])
def FollowUp(id: str, llm: ReplicateContext, prevResult: Any):
    llm.Prompt("""
        Here's another job description, 
            
Develop, test, and maintain high-quality software products
Collaborate with cross-functional teams to design and implement software features
Write clean, efficient, and well-documented code
Troubleshoot and debug software issues
Stay up-to-date with emerging trends and technologies in software development
Required Skills:

Minimum 3 years of experience in software development
Proficiency with TypeScript (or similar languages)
Full-stack development experience (frontend and server-side)
Experience working with databases and APIs
Strong problem-solving skills
Excellent communication skills
Ability to work independently and as part of a team
Desired Skills:

Strong knowledge of TypeScript
Familiarity with OpenAI APIs
Experience with Hasura, Pinecone DB, Postgres, Vue JS
Experience with cloud technologies such as Google Cloud or AWS
Experience with Kubernetes
Our Tech Stack:

TypeScript
Vue JS
Node JS
Google Cloud (Pub/Sub, Postgres, Kubernetes, Scheduler, Redis)
Docker / Docker Compose
API integrations (Salesforce, Slack, Outreach, Zendesk, Zoom, Gong, Asana, etc.)
OpenAI (GPT-4 and Embeddings)
Auth0
Hasura
GraphQL
If you meet these requirements and are excited about the opportunity to join a dynamic and growing team building the next generation of Sales tools, then we encourage you to apply for this position.       
        ,give me the analysis
    """).Run(stream=True)
    return llm.Messages[-1].Content[:llm.Messages[-1].Content.find("{}")]

@prompt_job("validate", contexts["gpt"])
def Validate(id: str, llm: GPTContext, prevResult: str):
    try:
        loaded = json.loads(prevResult)
    except json.JSONDecodeError:
        llm.Prompt(GPTMessage("user", f"fix this JSON, and only respond with the fixed json, no formatting, explanation, or backticks: {prevResult}")).Run(stream=True)

    if (len(llm.Messages) > 0):
        return llm.Messages[-1]

    return ""

pipeline = Pipeline(contexts["replicate"])
  
(pipeline.AddJob(FollowUp)
    .AddJob(Validate)
    .Run())

with open("pipeline.json", 'w') as fp:
    if (pipeline.Results["validate"] == None):
        fp.write(pipeline.Results["followup"][-1])
    else:
        fp.write(pipeline.Results["validate"][-1].Content)

