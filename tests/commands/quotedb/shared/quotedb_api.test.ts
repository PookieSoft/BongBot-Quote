import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';

const mockApis = {
    quotedb: {
        url: 'https://quotes.example.com/api/v1/quotes',
        apikey: 'mock-api-key',
        user_id: 'mock-user-id',
    },
};

const mockBuildError = jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
    isError: true,
    content: 'mock error',
});

jest.unstable_mockModule('@pookiesoft/bongbot-core', () => {
    const config = { apis: mockApis };
    return {
        Caller: jest.fn(),
        buildError: mockBuildError,
        default: config,
        apis: mockApis,
    };
});

const mockSetTitle = jest.fn().mockReturnThis();
const mockAddQuotes = jest.fn().mockReturnThis();
const mockBuild = jest.fn(() => ({ embeds: ['mocked embed'] }));
const mockQuoteBuilder = jest.fn().mockImplementation(() => ({
    setTitle: mockSetTitle,
    addQuotes: mockAddQuotes,
    build: mockBuild,
}));

jest.unstable_mockModule('../../../../src/commands/quotedb/shared/quote_builder.js', () => ({
    default: mockQuoteBuilder,
}));

const { QuoteDBAPI } = await import('../../../../src/commands/quotedb/shared/quotedb_api.js');

const createCaller = () => ({
    get: jest.fn<(...args: any[]) => Promise<any>>(),
    post: jest.fn<(...args: any[]) => Promise<any>>(),
});

const createMockClient = () =>
    ({
        user: { displayAvatarURL: jest.fn(() => 'http://example.com/avatar.png') },
    }) as unknown as ExtendedClient;

const createMockInteraction = () =>
    ({}) as unknown as ChatInputCommandInteraction;

describe('QuoteDBAPI', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockBuild.mockReturnValue({ embeds: ['mocked embed'] });
    });

    describe('constructor', () => {
        it('stores the caller it is given', () => {
            const caller = createCaller();
            const api = new QuoteDBAPI(caller as any);
            expect(api._caller).toBe(caller);
        });
    });

    describe('getQuotes', () => {
        it('calls the search route with the correct URL, query and headers', async () => {
            const caller = createCaller();
            caller.get.mockResolvedValueOnce({
                quotes: [{ quote: 'q1', author: 'a1' }],
            });

            await new QuoteDBAPI(caller as any).getQuotes(
                createMockClient(),
                createMockInteraction(),
                3,
                'search',
            );

            expect(caller.get).toHaveBeenCalledWith(
                'https://quotes.example.com/api/v1/quotes',
                '/search/user/mock-user-id',
                'max_quotes=3',
                {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer mock-api-key',
                },
            );
        });

        it('uses the random route when asked', async () => {
            const caller = createCaller();
            caller.get.mockResolvedValueOnce({
                quotes: [{ quote: 'q', author: 'a' }],
            });

            await new QuoteDBAPI(caller as any).getQuotes(
                createMockClient(),
                createMockInteraction(),
                1,
                'random',
            );

            expect(caller.get).toHaveBeenCalledWith(
                'https://quotes.example.com/api/v1/quotes',
                '/random/user/mock-user-id',
                'max_quotes=1',
                expect.any(Object),
            );
        });

        it('builds the embed titled "Recent Quote" for a single search result', async () => {
            const caller = createCaller();
            caller.get.mockResolvedValueOnce({
                quotes: [{ quote: 'only one', author: 'solo' }],
            });

            const result = await new QuoteDBAPI(caller as any).getQuotes(
                createMockClient(),
                createMockInteraction(),
                1,
                'search',
            );

            expect(mockSetTitle).toHaveBeenCalledWith('Recent Quote');
            expect(mockAddQuotes).toHaveBeenCalledWith([{ quote: 'only one', author: 'solo' }]);
            expect(result).toEqual({ embeds: ['mocked embed'] });
        });

        it('pluralizes the search title when multiple quotes are returned', async () => {
            const caller = createCaller();
            caller.get.mockResolvedValueOnce({
                quotes: [
                    { quote: 'q1', author: 'a1' },
                    { quote: 'q2', author: 'a2' },
                ],
            });

            await new QuoteDBAPI(caller as any).getQuotes(
                createMockClient(),
                createMockInteraction(),
                2,
                'search',
            );

            expect(mockSetTitle).toHaveBeenCalledWith('Recent Quotes');
        });

        it('builds the embed titled "Random Quote" for the random route', async () => {
            const caller = createCaller();
            caller.get.mockResolvedValueOnce({
                quotes: [{ quote: 'q', author: 'a' }],
            });

            await new QuoteDBAPI(caller as any).getQuotes(
                createMockClient(),
                createMockInteraction(),
                1,
                'random',
            );

            expect(mockSetTitle).toHaveBeenCalledWith('Random Quote');
        });

        it('pluralizes the random title when multiple quotes are returned', async () => {
            const caller = createCaller();
            caller.get.mockResolvedValueOnce({
                quotes: [
                    { quote: 'q1', author: 'a1' },
                    { quote: 'q2', author: 'a2' },
                ],
            });

            await new QuoteDBAPI(caller as any).getQuotes(
                createMockClient(),
                createMockInteraction(),
                2,
                'random',
            );

            expect(mockSetTitle).toHaveBeenCalledWith('Random Quotes');
        });

        it('returns a buildError result when no quotes are returned', async () => {
            const caller = createCaller();
            caller.get.mockResolvedValueOnce({ quotes: [] });
            const interaction = createMockInteraction();

            const result = await new QuoteDBAPI(caller as any).getQuotes(
                createMockClient(),
                interaction,
                1,
                'search',
            );

            expect(mockBuildError).toHaveBeenCalledWith(
                interaction,
                expect.objectContaining({ message: 'No quotes found.' }),
            );
            expect(mockQuoteBuilder).not.toHaveBeenCalled();
            expect(result).toEqual({ isError: true, content: 'mock error' });
        });

        it('passes through caller errors', async () => {
            const caller = createCaller();
            const err = new Error('boom');
            caller.get.mockRejectedValueOnce(err);

            await expect(
                new QuoteDBAPI(caller as any).getQuotes(
                    createMockClient(),
                    createMockInteraction(),
                    1,
                    'search',
                ),
            ).rejects.toBe(err);
        });

        it('passes the client into build', async () => {
            const caller = createCaller();
            caller.get.mockResolvedValueOnce({ quotes: [{ quote: 'q', author: 'a' }] });
            const client = createMockClient();

            await new QuoteDBAPI(caller as any).getQuotes(
                client,
                createMockInteraction(),
                1,
                'search',
            );

            expect(mockBuild).toHaveBeenCalledWith(client);
        });
    });

    describe('createQuote', () => {
        it('posts the new quote with the correct URL, headers and payload', async () => {
            const caller = createCaller();
            caller.post.mockResolvedValueOnce({
                quote: { quote: 'new', author: 'me' },
            });

            await new QuoteDBAPI(caller as any).createQuote(
                { quote: 'new', author: 'me' },
                createMockClient(),
            );

            expect(caller.post).toHaveBeenCalledWith(
                'https://quotes.example.com/api/v1/quotes',
                null,
                {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer mock-api-key',
                },
                expect.objectContaining({
                    quote: 'new',
                    author: 'me',
                    user_id: 'mock-user-id',
                    date: expect.any(String),
                }),
            );
        });

        it('builds an embed with the "New Quote Created" title and the returned quote', async () => {
            const caller = createCaller();
            caller.post.mockResolvedValueOnce({
                quote: { quote: 'new', author: 'me' },
            });

            const result = await new QuoteDBAPI(caller as any).createQuote(
                { quote: 'new', author: 'me' },
                createMockClient(),
            );

            expect(mockSetTitle).toHaveBeenCalledWith('New Quote Created');
            expect(mockAddQuotes).toHaveBeenCalledWith([{ quote: 'new', author: 'me' }]);
            expect(result).toEqual({ embeds: ['mocked embed'] });
        });

        it('passes the client into build', async () => {
            const caller = createCaller();
            caller.post.mockResolvedValueOnce({
                quote: { quote: 'new', author: 'me' },
            });
            const client = createMockClient();

            await new QuoteDBAPI(caller as any).createQuote(
                { quote: 'new', author: 'me' },
                client,
            );

            expect(mockBuild).toHaveBeenCalledWith(client);
        });

        it('passes through caller errors', async () => {
            const caller = createCaller();
            const err = new Error('post failed');
            caller.post.mockRejectedValueOnce(err);

            await expect(
                new QuoteDBAPI(caller as any).createQuote(
                    { quote: 'q', author: 'a' },
                    createMockClient(),
                ),
            ).rejects.toBe(err);
        });
    });
});
