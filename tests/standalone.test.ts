import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

const fakeBotUserId = 'bot123';
const mockOn = jest.fn();
const mockExecuteReply = jest.fn<(...args: any[]) => Promise<any>>();
const fakeBot: any = {
    user: { id: fakeBotUserId },
    on: mockOn,
    commands: new Map([['quote', { data: { name: 'quote' }, executeReply: mockExecuteReply }]]),
};

const mockBasicStart = jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(fakeBot);
const mockBuildUnknownError = jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
    content: 'mock-unknown-error',
    isError: true,
});

jest.unstable_mockModule('@pookiesoft/bongbot-core', () => ({
    basicStart: mockBasicStart,
    buildUnknownError: mockBuildUnknownError,
}));

const mockBuildCommands = jest.fn();
jest.unstable_mockModule('../src/commands/build_commands.js', () => ({
    default: mockBuildCommands,
}));

const createMessage = (overrides: Partial<any> = {}) => {
    const mentions = {
        users: { has: jest.fn(() => true) },
    };
    const message: any = {
        author: { bot: false },
        mentions,
        reference: { messageId: 'parent' },
        content: `<@${fakeBotUserId}>`,
        reply: jest.fn(),
        ...overrides,
    };
    if (overrides.mentions) message.mentions = overrides.mentions;
    return message;
};

describe('standalone (quote bot entry point)', () => {
    let messageHandler: (message: any) => Promise<any>;

    beforeAll(async () => {
        await import('../src/standalone.js');
        const onCall = mockOn.mock.calls.find((c) => c[0] === 'messageCreate');
        if (!onCall) throw new Error('messageCreate handler was not registered');
        messageHandler = onCall[1] as any;
    });

    beforeEach(() => {
        mockExecuteReply.mockReset();
        mockBuildUnknownError.mockClear();
        mockBuildUnknownError.mockResolvedValue({
            content: 'mock-unknown-error',
            isError: true,
        });
    });

    it('calls basicStart with the right owner, repo and command builder', () => {
        expect(mockBasicStart).toHaveBeenCalledTimes(1);
        expect(mockBasicStart).toHaveBeenCalledWith('PookieSoft', 'BongBot-Quote', mockBuildCommands);
    });

    it('registers a messageCreate listener on the bot', () => {
        expect(mockOn).toHaveBeenCalledWith('messageCreate', expect.any(Function));
    });

    describe('messageCreate handler', () => {
        it('ignores messages from other bots', async () => {
            const msg = createMessage({ author: { bot: true } });
            await messageHandler(msg);
            expect(msg.reply).not.toHaveBeenCalled();
            expect(mockExecuteReply).not.toHaveBeenCalled();
        });

        it('ignores messages that do not mention the bot', async () => {
            const msg = createMessage({
                mentions: { users: { has: jest.fn(() => false) } },
            });
            await messageHandler(msg);
            expect(msg.reply).not.toHaveBeenCalled();
            expect(mockExecuteReply).not.toHaveBeenCalled();
        });

        it('replies with a hint when the message is not a reply', async () => {
            const msg = createMessage({ reference: null });
            await messageHandler(msg);
            expect(msg.reply).toHaveBeenCalledWith('You need to reply to a message to create a quote from it.');
            expect(mockExecuteReply).not.toHaveBeenCalled();
        });

        it('shows a thinking message, calls executeReply, deletes the thinking message and replies with the result', async () => {
            const thinking = { delete: jest.fn<() => Promise<any>>().mockResolvedValue(undefined) };
            const msg = createMessage();
            (msg.reply as jest.Mock).mockResolvedValueOnce(thinking).mockResolvedValueOnce(undefined);
            mockExecuteReply.mockResolvedValueOnce({ embeds: ['quote-embed'] });

            await messageHandler(msg);

            expect(msg.reply).toHaveBeenNthCalledWith(1, {
                content: 'BongBot is thinking...',
                allowedMentions: { repliedUser: false },
            });
            expect(mockExecuteReply).toHaveBeenCalledWith(msg, fakeBot);
            expect(thinking.delete).toHaveBeenCalled();
            expect(msg.reply).toHaveBeenNthCalledWith(2, { embeds: ['quote-embed'] });
        });

        it('strips the bot mention before checking for additional content', async () => {
            const thinking = { delete: jest.fn<() => Promise<any>>().mockResolvedValue(undefined) };
            const msg = createMessage({ content: `   <@${fakeBotUserId}>   ` });
            (msg.reply as jest.Mock).mockResolvedValueOnce(thinking).mockResolvedValueOnce(undefined);
            mockExecuteReply.mockResolvedValueOnce({ embeds: ['quote-embed'] });

            await messageHandler(msg);

            expect(mockExecuteReply).toHaveBeenCalled();
        });

        it('also handles the nickname mention form (<@!id>)', async () => {
            const thinking = { delete: jest.fn<() => Promise<any>>().mockResolvedValue(undefined) };
            const msg = createMessage({ content: `<@!${fakeBotUserId}>` });
            (msg.reply as jest.Mock).mockResolvedValueOnce(thinking).mockResolvedValueOnce(undefined);
            mockExecuteReply.mockResolvedValueOnce({ embeds: ['quote-embed'] });

            await messageHandler(msg);

            expect(mockExecuteReply).toHaveBeenCalled();
        });

        it('returns early without replying when there is extra content beyond the mention', async () => {
            const msg = createMessage({
                content: `<@${fakeBotUserId}> some extra text`,
            });

            await messageHandler(msg);

            expect(msg.reply).not.toHaveBeenCalled();
            expect(mockExecuteReply).not.toHaveBeenCalled();
        });

        it('falls back to buildUnknownError and deletes the thinking reply when an error is thrown', async () => {
            const thinking = { delete: jest.fn<() => Promise<any>>().mockResolvedValue(undefined) };
            const msg = createMessage();
            (msg.reply as jest.Mock).mockResolvedValueOnce(thinking).mockResolvedValueOnce(undefined);
            const err = new Error('boom');
            mockExecuteReply.mockRejectedValueOnce(err);

            await messageHandler(msg);

            expect(mockBuildUnknownError).toHaveBeenCalledWith(err);
            expect(thinking.delete).toHaveBeenCalled();
            expect(msg.reply).toHaveBeenNthCalledWith(2, {
                content: 'mock-unknown-error',
                isError: true,
            });
        });

        it('does not try to delete a thinking reply if creating it failed', async () => {
            const msg = createMessage();
            const err = new Error('reply failed');
            (msg.reply as jest.Mock).mockImplementationOnce(() => {
                throw err;
            });
            (msg.reply as jest.Mock).mockResolvedValueOnce(undefined);

            await messageHandler(msg);

            expect(mockBuildUnknownError).toHaveBeenCalledWith(err);
            expect(msg.reply).toHaveBeenLastCalledWith({
                content: 'mock-unknown-error',
                isError: true,
            });
        });
    });
});
