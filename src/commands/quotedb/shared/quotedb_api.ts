import { Caller, ExtendedClient, buildError } from '@pookiesoft/bongbot-core';
import config from '@pookiesoft/bongbot-core';
import { ChatInputCommandInteraction } from 'discord.js';
import QuoteBuilder from './quote_builder.js';
const api = config.apis.quotedb;

export class QuoteDBAPI {
    readonly _caller: Caller;

    constructor(caller: Caller) {
        this._caller = caller;
    }

    async getQuotes(client: ExtendedClient, interaction: ChatInputCommandInteraction, amount: number, route: string) {
        const response = await this._caller.get(
            api.url,
            `/${route}/user/${api.user_id}`,
            `max_quotes=${amount}`,
            { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.apikey}` },
        );
        if (response?.quotes?.length === 0) {
            return await buildError(interaction, new Error("No quotes found."));
        }
        return new QuoteBuilder()
            .setTitle(`${route === 'random' ? 'Random Quote' : 'Recent Quote'}${response.quotes.length > 1 ? `s` : ''}`)
            .addQuotes(response.quotes)
            .build(client);
    }

    async createQuote(content: NewQuote, client: ExtendedClient) {
        const response = await this._caller.post(
            api.url,
            null,
            { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.apikey}` },
            {
                quote: content.quote,
                author: content.author,
                user_id: api.user_id,
                date: new Date().toLocaleString()
            }
        );
        return new QuoteBuilder()
            .setTitle(`New Quote Created`)
            .addQuotes([response.quote])
            .build(client);
    }

}

interface NewQuote {
    quote: string;
    author: string;
}