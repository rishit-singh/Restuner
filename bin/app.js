import { readFileSync } from "fs";
import { createResumeBot } from "./modules/resumebot.mjs";
import { UnsafeCast } from "./util.js";
async function main() {
    let model;
    model = {
        Owner: "mistralai",
        Name: "mixtral-8x7b-instruct-v0.1"
    };
    const bot = await createResumeBot(model, (tokens) => { console.log(tokens); throw new Error(); });
    bot.Callback = (tokens) => process.stdout.write(UnsafeCast(tokens[0]));
    bot.LoadResume(readFileSync(process.argv[2]).buffer);
    try {
        bot.Initialize();
        bot.Tune(`As a Full Stack Developer at Krux you will make an impact by building a core component of our product that allows our customers to derive value and insight. You will work with a team that is self-motivated to solve problems, excited to learn and be challenged, and likes to have fun.
 
        Who are we?
        
        Krux builds innovative SAAS solutions for the mining industry. We empower our customers to make better decisions through real-time data management and analytics. Understanding our customer's needs and the ability to solve their problems is what sets us apart. Krux, founded in 2016 and headquartered in Alberta, has global reach. We support client's operations on every continent (well, except Antarctica).
         
        What you will do
        
        Develop attractive and highly useable applications with a focus on performance, security, and scalability.
        Work with business and engineering teams to define, design, develop, test, troubleshoot, and deploy solutions.
        Collaborate with the team to continuously improve our best practices and mentor other developers.
        
        
        Who you are
        
        You are passionate about building software.
        You embrace new technology and are excited to expand your skills.
        You love being challenged to solve a new problem.
        You are a self-starter who thrives in a fast-paced environment.
        You are a team player that is always ready to help out a co-worker.
        You are a champion for code review and automated testing.
        
        
        What you bring
        
        7+ years experience working as a full stack developer or similar role.
        Post-secondary training in computer science or software development.
        Broad technical experience with emphasis on the following areas:
        Web Development using Angular 4+, .NET, C#, ASP.NET MVC, JavaScript, jQuery, CSS, Bootstrap
        NET Core API development
        Database Development using Microsoft SQL, T-SQL
        Unit and integration tests
        Microsoft Azure PAAS environment
        Experience with dev tools including Git, Azure DevOps, Visual Studio, Jira.
        Excellent written and verbal communication skills.
        Strong attention to detail, critical thinking, and problem-solving skills.
        Ability to collaborate and operate in an agile environment.
        `);
    }
    catch (e) {
        console.log(e);
    }
}
main();
