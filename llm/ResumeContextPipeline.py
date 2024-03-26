from tinytune.pipeline import Pipeline
from tinytune.prompt import PromptJob, prompt_job
from tinytune.llmcontext import LLMContext, Message
from typing import Any
from gptcontext import GPTContext

import os
import PyPDF2

class ResumeContextPipeline:
    def __init__(self, defaultLLM: LLMContext):
        self.Pipe: Pipeline = Pipeline(defaultLLM)
        self.LLM: LLMContext = defaultLLM
    
    def Save(self, file: str):
        self.LLM.Save(file)

    def Build(self, resume: str):
        @prompt_job("setup", self.LLM)
        def Setup(id: str, context: LLMContext, prevResult: Any):
            (context.Prompt(Message("system", "You are a resume analyzer. You will be provided with a resume and you must build a context around it, and represent it in form of JSON"))
                    .Prompt(Message("user", f"Heres the resume: {resume} \ngenerate the JSON, and make sure the response is the JSON only, no explanations, formatting or backticks"))
                    .Run(stream=True))
            return context.Messages[-1]
        
        Setup()

        return self


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

llm = GPTContext("gpt-4-0125-preview", os.getenv("OPENAI_KEY"))

llm.OnGenerateCallback = Callback

pipeline: ResumeContextPipeline = ResumeContextPipeline(llm)

pipeline.Build(ExtractPDFBuffer("resume.pdf")).Save("resume_context.json")






