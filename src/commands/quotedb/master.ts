import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, Message } from 'discord.js';
import { buildError, buildUnknownError, Caller } from '@pookiesoft/bongbot-core';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { QuoteDBAPI } from './shared/quotedb_api.js';

const GET_LIMIT = 10;
var _caller: Caller;
var _quotedb: QuoteDBAPI;

export default {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Manage your Pterodactyl panel servers')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('create')
                .setDescription('Create a new quote with the specified content and author')
                .addStringOption((option) =>
                    option.setName('quote').setDescription('The content of the quote').setRequired(true)
                )
                .addStringOption((option) =>
                    option.setName('author').setDescription('The author of the quote').setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('recent')
                .setDescription('List of the most recently recorded quotes. Up to 10 quotes will be shown at a time.')
                .addIntegerOption((option) =>
                    option.setName('amount').setDescription('The amount of quotes to show (max: 10)').setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('random')
                .setDescription('View a random quote')
                .addIntegerOption((option) =>
                    option.setName('amount').setDescription('The amount of quotes to show (max: 10)').setRequired(false)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
        const subcommand = interaction.options.getSubcommand();
        try {
            if (!_quotedb) {
                await initialize();
            }
            return await handleSubcommand(subcommand, client, interaction);
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    async executeReply(message: Message, client: ExtendedClient) {
        try {
            const repliedToMessage = await message.fetchReference();
            if (!repliedToMessage || !repliedToMessage.content)
                return "The message you replied to is empty or I can't access it.";

            const content = {
                quote: repliedToMessage.content,
                author: repliedToMessage.member?.displayName ?? repliedToMessage.author.username,
            };
            if (!_quotedb) {
                await initialize();
            }
            return await _quotedb.createQuote(content, client);
        } catch (error) {
            return await buildUnknownError(error);
        }
    },
    fullDesc: {
        description: 'Create and retrieve quotes from the quote database!',
        options: [
            {
                name: 'create',
                description: 'Create a new quote with the specified content and author',
            },
            {
                name: 'recent',
                description: 'List the most recently recorded quotes. Up to 10 quotes will be shown at a time.',
            },
            {
                name: 'random',
                description: 'View a random selection of quotes. Up to 10 quotes will be shown at a time.',
            },
        ],
    },
};

async function initialize() {
    _caller = new Caller();
    _quotedb = new QuoteDBAPI(_caller);
}

async function handleSubcommand(subcommand: string, client: ExtendedClient, interaction: ChatInputCommandInteraction) {
    switch (subcommand) {
        case 'create':
            const content = {
                quote: interaction.options.getString('quote', true),
                author: interaction.options.getString('author', true),
            };
            return await _quotedb.createQuote(content, client);
        case 'recent':
        case 'random':
            const route = subcommand === 'random' ? 'random' : 'search';
            const amount = interaction.options.getInteger('amount') ?? 1;
            if (amount < 1 || amount > GET_LIMIT) {
                return await buildError(interaction, new Error(`Amount must be between 1 and ${GET_LIMIT}`));
            }
            return await _quotedb.getQuotes(client, interaction, amount, route);
        default:
            return {
                content: 'Unknown subcommand',
                ephemeral: true,
            };
    }
}
