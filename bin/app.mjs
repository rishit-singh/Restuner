import { readFileSync } from "fs";
import { ResumeBot } from "./modules/resumebot.mjs";
const bot = ResumeBot(process.env.REPLICATE_VERSION, process.argv[3], process.env.MISTRALKEY, (tokens) => console.log([...tokens].join("")));
async function main() {
    await bot.LoadResume(readFileSync(process.argv[2]).buffer);
    await bot.Initialize(process.argv[2]);
    await bot.Tune(`Buyatab is not just about team lunches, fun company events or puppies in the office (although we have all 3!). A finTech maverick and officially one of the most popular technology companies in BC, Buyatab is a leading supplier of advanced online gift card infrastructure, technology and marketing services for leading brands. Working with some of the world’s leading brands (including Four Seasons, Fairmont, Whole Foods Market, Tim Hortons), we are recognized for our solution and design flexibility, focus on client brand standards, high-quality customer support, and fraud protection guarantee. As a result, our clients are positioned to grow their gift card business, enhance their brands, gain a competitive edge, and leverage the rapid growth in mobile device use and social media.
            
            We’re growing our technology team and are looking for an experienced Senior Full Stack .NET Developer to join the team and make a real impact!
            
            You have a wealth of hands on experience using C# and .NET technologies. You are passionate about agile methodology, and want to contribute to a fast paced, highly collaborative Scrum team. You love learning, being challenged, and challenging others to grow and improve. You bring creative ideas and novel approaches to solving problems. 

            
            If you love to work amongst genuine, supportive people who are passionate about revolutionizing an industry, get in touch!
            

            Position Summary:

            Provides technical direction, planning, and vision to development team members.
            As a lead programmer on new projects, creates, maintains, and owns technical specifications, designs, and schedules with little direction from manager
            Forges strong relationships across departments and to other companies. Communicates programming needs and interests to product team and others.
            Anticipates and acts upon issues and problems that arise, providing alternative approaches and solutions.
            Architects and implements significant portions of code, leveraging work across more than one product. Seeks out new tools and techniques to facilitate work. Insists on highest quality in own work and that of others.
            Design and implement complex transaction control systems involving secure web application development and integrating with third party web services
            Refactor and migrate legacy applications to distributed application architecture in AWS cloud
            Leads by example
            

            We are looking for someone who:

            has 8+ years of experience using C#, Javascript and debugging techniques for developing ASP.Net, Asp.Net Core applications
            has years of experience building applications using .Net Full Framework (4.0 – 4.8) and .Net Core (2.2 – 7.0)
            is expert in using web technologies, such as HTML, CSS, Javascript, Internet technologies, communication protocols, and techniques
            has experience in building applications using React, Redux / Flux, KnockoutJS
            has experience with database methodologies and database systems including SQL Server and MongoDB.
            has knowledge of current software design practices, including modularity, event-driven architecture, object-oriented design, interface design, localization, portability, extensibility, and testability
            has experience working in a Scrum / Agile development environment with great understanding of CI / CD practices
            has good communication skills
            is self-motivated and works with minimal supervision
            has B.S./M.S. in Computer Science, experience in developing two or more commercially used applications, or equivalent experience`);
}
// console.log((await bot.Prompt(process.argv[2])
//         .Prompt("thanks")
//         .Run()).Result());
main();
