// INVITE: https://discord.com/api/oauth2/authorize?client_id=1051219333499588760&permissions=109569&scope=bot

import * as Discord from "discord.js";
import { MongoClient } from "mongodb";
import * as fs from "fs";

const secrets = JSON.parse(fs.readFileSync('secrets.json'));
const uri = `mongodb+srv://${secrets.mongoUser}:${secrets.mongoPass}@cluster0.mn0nlma.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

// connect to db
async function startDb() {
    await client.connect();
}

startDb();
// -------------

async function checkIfUserCanCook(userId, guildId) {
    const collection = client.db("chefs").collection("chefs");

    const chef = await collection.findOne({userId: userId, guildId: guildId});

    return chef?.canCook;
}

async function setIfUserCanCook(userId, guildId, canCook, isDiscordUserIdString=false) {
    const collection = client.db("chefs").collection("chefs");

    let doc = await collection.findOne({userId: userId, guildId: guildId});

    if(!doc) {
        await collection.insertOne({userId: userId, guildId: guildId, canCook: canCook, isDiscordUserIdString: isDiscordUserIdString});
    } else {
        await collection.updateOne({userId: userId, guildId: guildId}, {$set:{canCook: canCook}});
    }
}

async function getAllChefsByGuild(guildId, canCook) {
    const collection = client.db("chefs").collection("chefs");

    let docs = await collection.find({guildId: guildId, canCook: canCook}).toArray();

    return docs;
}

const bot = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });

const letMeCookRegex = /^let me cook$/i;
const letCookRegex = /^let\b.*\bcook$/i;
const mayICookRegex = /^(may|can) I cook\?$/i;
const mayCookRegex = /^(may|can)\b.*\bcook\?$/i;
const dontLetMeCookRegex = /^don(')?t let me cook$/i;
const dontLetCookRegex = /^don(')?t let\b.*\bcook$/i;
const whoCanCookRegex = /^who (may|can) cook\?$/i;
const whoCantCookRegex = /^who (can(')?t|may not|cannot) cook\?$/i;

bot.on('messageCreate', async (msg) => {
    const content = msg.content;

    // let ___ cook
    if(letCookRegex.test(content)) {
        const mentioned = msg.mentions?.users?.first();
        var userId = "";
        var self = false;
        var at = false;
        if(mentioned) {
            userId = mentioned.id;
            at = true;
        } else if(letMeCookRegex.test(content)) {
            self = true;
            userId = msg.author.id;
            at = true;
        } else {
            // take content between 'let' and 'cook' as id
            userId = content.slice(4, -5);
        }

        await setIfUserCanCook(userId, msg.guildId, true, at);

        if(mentioned) {
            msg.channel.send(`<@${userId}>, you may now cook.`);
        }
        else if(self) {
            msg.channel.send('You may cook.');
        } else {
            msg.channel.send(`${userId} may now cook.`);
        }
    }

    // may ___ cook
    else if(mayCookRegex.test(content)) {
        const mentioned = msg.mentions?.users?.first();
        var userId = "";
        var self = false;
        if(mentioned) {
            userId = mentioned.id;
        } else if(mayICookRegex.test(content)) {
            self = true;
            userId = msg.author.id;
        } else {
            // take content between 'let' and 'cook' as id
            userId = content.slice(4, -6);
        }

        const canCook = await checkIfUserCanCook(userId, msg.guildId, true);

        if(mentioned) {
            if(canCook) {
                msg.channel.send(`<@${userId}> may cook.`);
            } else {
                msg.channel.send(`<@${userId}> may not cook under any circumstance.`);
            }
        }
        else if(self) {
            if(canCook) {
                msg.channel.send('You may cook.');
            } else {
                msg.channel.send('You may not cook under any circumstance.');
            }
        } else {
            if(canCook) {
                msg.channel.send(`${userId} may cook.`);
            } else {
                msg.channel.send(`${userId} may not cook under any circumstance.`);
            }
        }
    }

    // don't let ___ cook
    else if(dontLetCookRegex.test(content)) {
        const mentioned = msg.mentions?.users?.first();
        var userId = "";
        var self = false;
        var at = false;
        if(mentioned) {
            userId = mentioned.id;
            at = true;
        } else if(dontLetMeCookRegex.test(content)) {
            self = true;
            userId = msg.author.id;
            at = true;
        } else {
            // take content between 'dont' and 'cook' as id
            var temp = content.replace(/^don(')?t let /i, "");
            temp = temp.replace(/ cook$/i, "");
            userId = temp;
        }

        await setIfUserCanCook(userId, msg.guildId, false, at);

        if(mentioned) {
            msg.channel.send(`<@${userId}>, you are forbidden from cooking.`);
        }
        else if(self) {
            msg.channel.send('You may not cook.');
        } else {
            msg.channel.send(`${userId} may not cook under any circumstance.`);
        }
    }

    // list all chefs
    else if(whoCanCookRegex.test(content)) {
        const chefs = await getAllChefsByGuild(msg.guildId, true);
        var joined = "";
        chefs.forEach((doc) => {
            if(doc.isDiscordUserIdString) {
                joined = `${joined}<@${doc.userId}>\n`;
            } else {
                joined = `${joined}${doc.userId}\n`;
            }
        });
        msg.channel.send(`👍 Those who are authorized to cook 👍\n\n${joined}`);
    }

    // list all non cookers
    else if(whoCantCookRegex.test(content)) {
        const chefs = await getAllChefsByGuild(msg.guildId, false);
        var joined = "";
        chefs.forEach((doc) => {
            if(doc.isDiscordUserIdString) {
                joined = `${joined}<@${doc.userId}>\n`;
            } else {
                joined = `${joined}${doc.userId}\n`;
            }
        });
        msg.channel.send(`❌ Those who must be prevented from cooking by any means ❌\n\n${joined}`);
    }
});

const botLogin = secrets.botLogin;
bot.login(botLogin);
