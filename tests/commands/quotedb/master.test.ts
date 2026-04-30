import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { ChatInputCommandInteraction, Message } from 'discord.js';

const mockBuildError = jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
    isError: true,
    content: 'mocked build error',
});
const mockBuildUnknownError = jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
    isError: true,
    content: 'mocked unknown error',
});
const mockCallerCtor = jest.fn();

jest.unstable_mockModule('@pookiesoft/bongbot-core', () => ({
    Caller: mockCallerCtor,
    buildError: mockBuildError,
    buildUnknownError: mockBuildUnknownError,
}));

const mockCreateQuote = jest.fn<(...args: any[]) => Promise<any>>();
const mockGetQuotes = jest.fn<(...args: any[]) => Promise<any>>();

jest.unstable_mockModule('../../../src/commands/quotedb/shared/quotedb_api.js', () => ({
    QuoteDBAPI: jest.fn().mockImplementation(() => ({
        createQuote: mockCreateQuote,
        getQuotes: mockGetQuotes,
    })),
}));

const { default: quoteCommand } = await import('../../../src/commands/quotedb/master.js');
const { QuoteDBAPI } = await import('../../../src/commands/quotedb/shared/quotedb_api.js');

const createInteraction = (overrides: Partial<any> = {}) =>
    ({
        options: {
            getSubcommand: jest.fn(),
            getString: jest.fn(),
            getInteger: jest.fn(),
        },
        ...overrides,
    }) as unknown as ChatInputCommandInteraction;

const fakeClient = { user: { displayAvatarURL: jest.fn() } } as any;

describe('quote master command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('command structure', () => {
        it('exports a command object', () => {
            expect(quoteCommand).toBeDefined();
            expect(typeof quoteCommand).toBe('object');
        });

        it('has a SlashCommandBuilder data property named "quote"', () => {
            expect(quoteCommand.data).toBeDefined();
            expect(quoteCommand.data.name).toBe('quote');
            expect(quoteCommand.data.description).toBeTruthy();
        });

        it('has execute and executeReply methods', () => {
            expect(quoteCommand.execute).toBeInstanceOf(Function);
            expect(quoteCommand.executeReply).toBeInstanceOf(Function);
        });

        it('has 3 subcommands: create, recent, random', () => {
            const json = quoteCommand.data.toJSON();
            expect(json.options).toBeDefined();
            const names = json.options!.map((o: any) => o.name);
            expect(names).toEqual(expect.arrayContaining(['create', 'recent', 'random']));
            expect(json.options!.length).toBe(3);
        });

        it('create subcommand has required quote and author string options', () => {
            const json = quoteCommand.data.toJSON();
            const create = json.options!.find((o: any) => o.name === 'create')!;
            expect('options' in create).toBe(true);
            const opts = (create as any).options;
            const quoteOpt = opts.find((o: any) => o.name === 'quote');
            const authorOpt = opts.find((o: any) => o.name === 'author');
            expect(quoteOpt.required).toBe(true);
            expect(authorOpt.required).toBe(true);
        });

        it('recent subcommand has an optional integer amount option', () => {
            const json = quoteCommand.data.toJSON();
            const recent = json.options!.find((o: any) => o.name === 'recent')! as any;
            const amount = recent.options.find((o: any) => o.name === 'amount');
            expect(amount.required).toBe(false);
        });

        it('random subcommand has an optional integer amount option', () => {
            const json = quoteCommand.data.toJSON();
            const random = json.options!.find((o: any) => o.name === 'random')! as any;
            const amount = random.options.find((o: any) => o.name === 'amount');
            expect(amount.required).toBe(false);
        });

        it('has a fullDesc with description and options', () => {
            expect(quoteCommand.fullDesc).toBeDefined();
            expect(quoteCommand.fullDesc.description).toBeTruthy();
            expect(quoteCommand.fullDesc.options).toHaveLength(3);
        });
    });

    describe('execute', () => {
        it('routes the create subcommand to QuoteDBAPI.createQuote with the option values', async () => {
            const interaction = createInteraction();
            (interaction.options.getSubcommand as jest.Mock).mockReturnValue('create');
            (interaction.options.getString as jest.Mock).mockImplementation((name: string) =>
                name === 'quote' ? 'a quote' : 'an author'
            );
            mockCreateQuote.mockResolvedValueOnce({ embeds: ['created'] });

            const result = await quoteCommand.execute(interaction, fakeClient);

            expect(QuoteDBAPI).toHaveBeenCalledTimes(1);
            expect(mockCreateQuote).toHaveBeenCalledWith({ quote: 'a quote', author: 'an author' }, fakeClient);
            expect(result).toEqual({ embeds: ['created'] });
        });

        it('routes the recent subcommand to QuoteDBAPI.getQuotes with the search route', async () => {
            const interaction = createInteraction();
            (interaction.options.getSubcommand as jest.Mock).mockReturnValue('recent');
            (interaction.options.getInteger as jest.Mock).mockReturnValue(5);
            mockGetQuotes.mockResolvedValueOnce({ embeds: ['recent'] });

            const result = await quoteCommand.execute(interaction, fakeClient);

            expect(mockGetQuotes).toHaveBeenCalledWith(fakeClient, interaction, 5, 'search');
            expect(result).toEqual({ embeds: ['recent'] });
        });

        it('routes the random subcommand to QuoteDBAPI.getQuotes with the random route', async () => {
            const interaction = createInteraction();
            (interaction.options.getSubcommand as jest.Mock).mockReturnValue('random');
            (interaction.options.getInteger as jest.Mock).mockReturnValue(2);
            mockGetQuotes.mockResolvedValueOnce({ embeds: ['random'] });

            const result = await quoteCommand.execute(interaction, fakeClient);

            expect(mockGetQuotes).toHaveBeenCalledWith(fakeClient, interaction, 2, 'random');
            expect(result).toEqual({ embeds: ['random'] });
        });

        it('defaults the amount to 1 when not provided', async () => {
            const interaction = createInteraction();
            (interaction.options.getSubcommand as jest.Mock).mockReturnValue('recent');
            (interaction.options.getInteger as jest.Mock).mockReturnValue(null);
            mockGetQuotes.mockResolvedValueOnce({ embeds: [] });

            await quoteCommand.execute(interaction, fakeClient);

            expect(mockGetQuotes).toHaveBeenCalledWith(fakeClient, interaction, 1, 'search');
        });

        it('returns a buildError when amount is below 1', async () => {
            const interaction = createInteraction();
            (interaction.options.getSubcommand as jest.Mock).mockReturnValue('recent');
            (interaction.options.getInteger as jest.Mock).mockReturnValue(0);

            const result = await quoteCommand.execute(interaction, fakeClient);

            expect(mockBuildError).toHaveBeenCalledWith(
                interaction,
                expect.objectContaining({ message: 'Amount must be between 1 and 10' })
            );
            expect(mockGetQuotes).not.toHaveBeenCalled();
            expect(result).toEqual({ isError: true, content: 'mocked build error' });
        });

        it('returns a buildError when amount is above 10', async () => {
            const interaction = createInteraction();
            (interaction.options.getSubcommand as jest.Mock).mockReturnValue('random');
            (interaction.options.getInteger as jest.Mock).mockReturnValue(11);

            await quoteCommand.execute(interaction, fakeClient);

            expect(mockBuildError).toHaveBeenCalledWith(
                interaction,
                expect.objectContaining({ message: 'Amount must be between 1 and 10' })
            );
            expect(mockGetQuotes).not.toHaveBeenCalled();
        });

        it('accepts amount = 10 (the boundary)', async () => {
            const interaction = createInteraction();
            (interaction.options.getSubcommand as jest.Mock).mockReturnValue('recent');
            (interaction.options.getInteger as jest.Mock).mockReturnValue(10);
            mockGetQuotes.mockResolvedValueOnce({ embeds: [] });

            await quoteCommand.execute(interaction, fakeClient);

            expect(mockGetQuotes).toHaveBeenCalledWith(fakeClient, interaction, 10, 'search');
        });

        it('returns an unknown subcommand response for an unrecognised subcommand', async () => {
            const interaction = createInteraction();
            (interaction.options.getSubcommand as jest.Mock).mockReturnValue('mystery');

            const result = await quoteCommand.execute(interaction, fakeClient);

            expect(result).toEqual({ content: 'Unknown subcommand', ephemeral: true });
            expect(mockGetQuotes).not.toHaveBeenCalled();
            expect(mockCreateQuote).not.toHaveBeenCalled();
        });

        it('catches errors from the API and forwards them to buildError', async () => {
            const interaction = createInteraction();
            (interaction.options.getSubcommand as jest.Mock).mockReturnValue('create');
            (interaction.options.getString as jest.Mock).mockReturnValue('val');
            const err = new Error('api fail');
            mockCreateQuote.mockRejectedValueOnce(err);

            const result = await quoteCommand.execute(interaction, fakeClient);

            expect(mockBuildError).toHaveBeenCalledWith(interaction, err);
            expect(result).toEqual({ isError: true, content: 'mocked build error' });
        });
    });

    describe('executeReply', () => {
        const createMessage = (overrides: Partial<any> = {}): Message =>
            ({
                fetchReference: jest.fn(),
                ...overrides,
            }) as unknown as Message;

        it('returns a hint when the replied-to message has no content', async () => {
            const message = createMessage();
            (message.fetchReference as jest.Mock).mockResolvedValue({ content: '' });

            const result = await quoteCommand.executeReply(message, fakeClient);

            expect(result).toBe("The message you replied to is empty or I can't access it.");
            expect(mockCreateQuote).not.toHaveBeenCalled();
        });

        it('returns a hint when fetchReference resolves to null', async () => {
            const message = createMessage();
            (message.fetchReference as jest.Mock).mockResolvedValue(null);

            const result = await quoteCommand.executeReply(message, fakeClient);

            expect(result).toBe("The message you replied to is empty or I can't access it.");
        });

        it('uses the displayName when the replied-to author has a guild member', async () => {
            const message = createMessage();
            (message.fetchReference as jest.Mock).mockResolvedValue({
                content: 'a wise quote',
                member: { displayName: 'Nick' },
                author: { username: 'fallback' },
            });
            mockCreateQuote.mockResolvedValueOnce({ embeds: ['created'] });

            const result = await quoteCommand.executeReply(message, fakeClient);

            expect(mockCreateQuote).toHaveBeenCalledWith({ quote: 'a wise quote', author: 'Nick' }, fakeClient);
            expect(result).toEqual({ embeds: ['created'] });
        });

        it('falls back to the author username when no guild member is present', async () => {
            const message = createMessage();
            (message.fetchReference as jest.Mock).mockResolvedValue({
                content: 'a quote',
                member: null,
                author: { username: 'someone' },
            });
            mockCreateQuote.mockResolvedValueOnce({ embeds: ['created'] });

            await quoteCommand.executeReply(message, fakeClient);

            expect(mockCreateQuote).toHaveBeenCalledWith({ quote: 'a quote', author: 'someone' }, fakeClient);
        });

        it('catches fetchReference errors and forwards them to buildUnknownError', async () => {
            const message = createMessage();
            const err = new Error('cannot fetch');
            (message.fetchReference as jest.Mock).mockRejectedValue(err);

            const result = await quoteCommand.executeReply(message, fakeClient);

            expect(mockBuildUnknownError).toHaveBeenCalledWith(err);
            expect(result).toEqual({ isError: true, content: 'mocked unknown error' });
        });

        it('catches createQuote errors and forwards them to buildUnknownError', async () => {
            const message = createMessage();
            (message.fetchReference as jest.Mock).mockResolvedValue({
                content: 'a quote',
                member: { displayName: 'Nick' },
                author: { username: 'someone' },
            });
            const err = new Error('post failed');
            mockCreateQuote.mockRejectedValueOnce(err);

            const result = await quoteCommand.executeReply(message, fakeClient);

            expect(mockBuildUnknownError).toHaveBeenCalledWith(err);
            expect(result).toEqual({ isError: true, content: 'mocked unknown error' });
        });
    });
});
