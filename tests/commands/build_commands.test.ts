import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';

const mockQuotedbCommand = {
    data: { name: 'quote', toJSON: () => ({ name: 'quote' }) },
};

jest.unstable_mockModule('../../src/commands/quotedb/master.js', () => ({
    default: mockQuotedbCommand,
}));

const mockCommandBuilder = jest.fn((bot: any, commands: any[]) => commands.map((c) => c.data.toJSON()));

jest.unstable_mockModule('@pookiesoft/bongbot-core', () => ({
    commandBuilder: mockCommandBuilder,
}));

const { default: buildCommands } = await import('../../src/commands/build_commands.js');

describe('buildCommands', () => {
    let mockClient: ExtendedClient;

    beforeEach(() => {
        jest.clearAllMocks();
        mockClient = { commands: new Map() } as unknown as ExtendedClient;
    });

    it('delegates to commandBuilder from bongbot-core with the client and the quotedb command', () => {
        buildCommands(mockClient);

        expect(mockCommandBuilder).toHaveBeenCalledTimes(1);
        expect(mockCommandBuilder).toHaveBeenCalledWith(mockClient, [mockQuotedbCommand]);
    });

    it('returns whatever commandBuilder returns', () => {
        mockCommandBuilder.mockReturnValueOnce(['serialized-quote']);

        const result = buildCommands(mockClient);

        expect(result).toEqual(['serialized-quote']);
    });

    it('does not throw on a fresh client', () => {
        expect(() => buildCommands(mockClient)).not.toThrow();
    });
});
