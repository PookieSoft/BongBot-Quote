import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { EmbedBuilder, Colors } from 'discord.js';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';

const { default: QuoteBuilder } = await import('../../../../src/commands/quotedb/shared/quote_builder.js');

const createMockClient = () =>
    ({
        user: {
            displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
        },
    }) as unknown as ExtendedClient;

describe('QuoteBuilder', () => {
    let builder: InstanceType<typeof QuoteBuilder>;

    beforeEach(() => {
        builder = new QuoteBuilder();
    });

    it('returns itself from setTitle for chaining', () => {
        expect(builder.setTitle('Hello')).toBe(builder);
    });

    it('returns itself from addQuotes for chaining', () => {
        expect(builder.addQuotes([{ quote: 'q', author: 'a' }])).toBe(builder);
    });

    it('prefixes the title with a scroll emoji', () => {
        builder.setTitle('A Title');
        const result = builder.build(createMockClient());
        const json = result.embeds[0].toJSON();
        expect(json.title).toBe('📜 A Title');
    });

    it('adds each quote as a non-inline field formatted with quote and author', () => {
        const quotes = [
            { quote: 'Hello world', author: 'Alice' },
            { quote: 'Goodbye', author: 'Bob' },
        ];
        builder.addQuotes(quotes);
        const json = builder.build(createMockClient()).embeds[0].toJSON();
        expect(json.fields).toEqual([
            { name: '*"Hello world"*', value: '🪶 - Alice', inline: false },
            { name: '*"Goodbye"*', value: '🪶 - Bob', inline: false },
        ]);
    });

    it('handles an empty quotes array without throwing', () => {
        expect(() => builder.addQuotes([])).not.toThrow();
        const json = builder.build(createMockClient()).embeds[0].toJSON();
        expect(json.fields).toEqual([]);
    });

    it('build sets the footer using the client avatar URL', () => {
        const client = createMockClient();
        const json = builder.build(client).embeds[0].toJSON();
        expect(client.user!.displayAvatarURL).toHaveBeenCalled();
        expect(json.footer).toEqual({
            text: 'BongBot • Quotes from quotes.elmu.dev',
            icon_url: 'http://example.com/bot_avatar.jpg',
        });
    });

    it('build sets a timestamp and the purple color', () => {
        const json = builder.build(createMockClient()).embeds[0].toJSON();
        expect(json.timestamp).toBeDefined();
        expect(json.color).toBe(Colors.Purple);
    });

    it('build returns the embed wrapped in an embeds array', () => {
        const result = builder.build(createMockClient());
        expect(result).toHaveProperty('embeds');
        expect(result.embeds).toHaveLength(1);
        expect(result.embeds[0]).toBeInstanceOf(EmbedBuilder);
    });

    it('build still works when client.user is undefined (icon URL is undefined)', () => {
        const client = { user: undefined } as unknown as ExtendedClient;
        const result = builder.build(client);
        const json = result.embeds[0].toJSON();
        expect(json.footer?.text).toBe('BongBot • Quotes from quotes.elmu.dev');
    });
});
