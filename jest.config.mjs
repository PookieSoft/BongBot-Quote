/**
 * Plain .mjs rather than .ts on purpose: a TypeScript config file would need a
 * TS loader (ts-node), which reaches for the same TypeScript compiler API that
 * TS 7 no longer exposes. Keeping the config in JS is what lets the toolchain
 * move to TS 7 at all.
 *
 * @type {import('jest').Config}
 */
const config = {
    testEnvironment: 'node',

    // ✅ Handle TypeScript + ESM
    // @swc/jest strips types and emits ESM; it does not type-check. Type safety
    // is enforced separately by `npm run typecheck` (see package.json), which
    // the `test` script runs first.
    transform: {
        '^.+\\.[tj]sx?$': [
            '@swc/jest',
            {
                jsc: {
                    parser: { syntax: 'typescript', tsx: false },
                    target: 'es2024',
                },
                module: { type: 'es6' },
                // Required for accurate coverage line mapping back to the .ts source.
                sourceMaps: true,
            },
        ],
    },
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    // ✅ Fix imports like "./something.js" inside ESM
    // This replaces ts-jest-resolver, which did the same .js -> .ts remap.
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },

    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

    // ✅ Ignore transformation for ESM-compatible node_modules
    transformIgnorePatterns: [
        'node_modules/(?!(msw|@mswjs|@bundled-es-modules|until-async|strict-event-emitter|outvariant|@inquirer|statuses)/)',
    ],

    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{js,ts}', '!**/node_modules/**', '!**/dist/**'],
    coverageReporters: ['text', 'text-summary', 'json', 'json-summary', 'lcov'],
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
        '/babel.config.js',
        '/jest.config.mjs',
        '/tests/utils/*',
        '/tests/mocks/*',
        '/coverage/*',
        '/dist/*',
    ],

    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: './test-results',
                outputName: 'junit.xml',
                ancestorSeparator: ' › ',
                uniqueOutputName: 'false',
                suiteNameTemplate: '{filepath}',
                classNameTemplate: '{classname}',
                titleTemplate: '{title}',
            },
        ],
    ],

    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

export default config;
