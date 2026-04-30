import { basicStart, buildUnknownError } from '@pookiesoft/bongbot-core';
import buildCommands from './commands/build_commands.js';
import { Message, MessageReplyOptions } from 'discord.js';

const bot = await basicStart('PookieSoft', 'BongBot-Quote', buildCommands);
/** respond to messages pinging the bot. */
bot.on('messageCreate', async (message: Message) => {
    if (message!.author!.bot || !message!.mentions?.users!.has(bot.user!.id)) return;
    if (!message.reference) return message.reply('You need to reply to a message to create a quote from it.');
    const mentionRegex = new RegExp(`<@!?${bot.user!.id}>`, 'g');
    const content = message.content.replace(mentionRegex, '').trim();
    if (content) return; // if there's extra content besides the mention, ignore it (to avoid conflicts with ai chatbot features from other bots)
    let reply;
    try {
        reply = await message.reply({ content: 'BongBot is thinking...', allowedMentions: { repliedUser: false } });
        const response = await bot.commands!.get('quote')!.executeReply(message, bot);
        await reply.delete();
        await message.reply(response);
    } catch (error) {
        const errorResp = await buildUnknownError(error);
        if (reply) {
            await reply.delete();
        }
        await message.reply(errorResp as MessageReplyOptions);
    }
});
