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

async function setIfUserCanCook(userId, guildId, canCook) {
    const collection = client.db("chefs").collection("chefs");

    let doc = await collection.findOne({userId: userId, guildId: guildId});

    if(!doc) {
        await collection.insertOne({userId: userId, guildId: guildId, canCook: canCook});
    } else {
        await collection.updateOne({userId: userId, guildId: guildId}, {$set:{canCook: canCook}});
    }
}

const bot = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });

bot.on('messageCreate', async (msg) => {
    const content = msg.content;

    // let ___ cook
    const letMeCookRegex = /^let me cook$/i;
    const letCookRegex = /^let\b.*\bcook$/i;
    if(letCookRegex.test(content)) {
        const mentioned = msg.mentions?.users?.first();
        var userId = "";
        var self = false;
        if(mentioned) {
            userId = mentioned.id;
        } else if(letMeCookRegex.test(content)) {
            self = true;
            userId = msg.author.id;
        } else {
            // take content between 'let' and 'cook' as id
            userId = content.slice(4, -5);
        }

        await setIfUserCanCook(userId, msg.guildId, true);

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
    const mayICookRegex = /^may I cook\?$/i;
    const mayCookRegex = /^may\b.*\bcook\?$/i;
    if(mayCookRegex.test(content)) {
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
    const dontLetMeCookRegex = /^don(')?t let me cook$/i;
    const dontLetCookRegex = /^don(')?t let\b.*\bcook$/i;
    if(dontLetCookRegex.test(content)) {
        const mentioned = msg.mentions?.users?.first();
        var userId = "";
        var self = false;
        if(mentioned) {
            userId = mentioned.id;
        } else if(dontLetMeCookRegex.test(content)) {
            self = true;
            userId = msg.author.id;
        } else {
            // take content between 'dont' and 'cook' as id
            var temp = content;
            temp = content.replace(/^don(')?t let /i, "");
            temp = temp.replace(/ cook$/i, "");
            userId = temp;
        }

        await setIfUserCanCook(userId, msg.guildId, false);

        if(mentioned) {
            msg.channel.send(`<@${userId}>, you are forbidden from cooking.`);
        }
        else if(self) {
            msg.channel.send('You may not cook.');
        } else {
            msg.channel.send(`${userId} may not cook under any circumstance.`);
        }
    }
});

const botLogin = secrets.botLogin;
bot.login(botLogin);
