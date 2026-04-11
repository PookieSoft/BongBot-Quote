import { jest, describe, it, expect, beforeAll } from '@jest/globals';

jest.unstable_mockModule('../src/commands/quotedb/master.js', () => ({
    default: { data: { name: 'quote' }, execute: jest.fn() },
}));

describe('index.ts (composite-bot entry point)', () => {
    let indexModule: any;

    beforeAll(async () => {
        indexModule = await import('../src/index.js');
    });

    it('re-exports the quote master command as `quotedb` for composite use', () => {
        expect(indexModule.quotedb).toBeDefined();
        expect(indexModule.quotedb.data.name).toBe('quote');
        expect(typeof indexModule.quotedb.execute).toBe('function');
    });
});
