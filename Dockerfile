FROM oven/bun:1 AS builder

WORKDIR /app

COPY ./src /app/src
COPY ./package.json /app/package.json
COPY ./tsconfig.json /app/tsconfig.json
COPY ./bunfig.toml /app/bunfig.toml

RUN --mount=type=secret,id=NODE_AUTH_TOKEN \
    export NODE_AUTH_TOKEN=$(cat /run/secrets/NODE_AUTH_TOKEN) && bun install --ignore-scripts

RUN mkdir -p /app/logs
# Marking better-sqlite3 as external to avoid bundling it, since it has native bindings that may not work correctly when bundled.
# As we are using the bun runtime, this package is not needed and can be ignored.
RUN bun build src/standalone.ts --outdir dist --minify --target bun --sourcemap --external better-sqlite3

FROM oven/bun:1-distroless AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules/@pookiesoft/bongbot-core/dist/responses /app/dist/responses
COPY --from=builder /app/logs /app/logs

CMD ["run", "--no-deprecation", "--enable-source-maps", "dist/standalone.js"]