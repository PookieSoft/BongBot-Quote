import { commandBuilder } from '@pookiesoft/bongbot-core';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import quotedb from './quotedb/master.js';

export default function buildCommands(client: ExtendedClient) {
    return commandBuilder(client, [quotedb]);
}
