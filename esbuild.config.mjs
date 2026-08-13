import esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync } from 'fs';

const nativeModulePlugin = {
    name: 'native-module-plugin',
    setup(build) {
        build.onLoad({ filter: /\.node$/ }, (args) => {
            return {
                contents: `
                    import { createRequire } from 'module';
                    const require = createRequire(import.meta.url);
                    module.exports = require(${JSON.stringify(args.path)});
                `,
                loader: 'js',
            };
        });
    },
};

const isWatch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');
const isLib = process.argv.includes('--lib');

const standaloneBuildOptions = {
    entryPoints: ['src/standalone.ts'],
    bundle: true,
    platform: 'node',
    target: 'esnext',
    format: 'esm',
    outdir: 'dist',
    external: ['node:*'],
    banner: {
        js: 'import { createRequire } from "module"; import { fileURLToPath } from "url"; import { dirname } from "path"; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);',
    },
    plugins: [nativeModulePlugin],
    minify: true,
    sourcemap: true,
    keepNames: true,
    sourcesContent: true,
    loader: {
        '.node': 'copy',
    },
};

const libBuildOptions = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'esnext',
    format: 'esm',
    outdir: 'dist',
    external: ['node:*', 'discord.js', 'better-sqlite3'],
    plugins: [nativeModulePlugin],
    minify: false,
    sourcemap: true,
    keepNames: true,
};

const buildOptions = isLib ? libBuildOptions : standaloneBuildOptions;

// Copy bongbot-core response files to dist
function copyCoreResponses() {
    const coreResponsesDir = 'node_modules/@pookiesoft/bongbot-core/dist/responses';
    const destDir = 'dist/responses';

    if (!existsSync(coreResponsesDir)) {
        console.warn('⚠ bongbot-core responses not found, skipping copy');
        return;
    }

    try {
        if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true });
        }
        cpSync(coreResponsesDir, destDir, { recursive: true });
        console.log('✓ Copied core response files');
    } catch (error) {
        throw new Error(`Error copying core responses: ${error.message}`);
    }
}

if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
} else {
    await esbuild.build(buildOptions);
    copyCoreResponses();
    console.log('Build complete!');
}
