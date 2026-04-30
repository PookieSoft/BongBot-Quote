# BongBot-Quote

![Build Status](https://img.shields.io/github/actions/workflow/status/PookieSoft/BongBot-Quote/deploy.yml?label=Production%20Deploy&logo=github)
![Coverage](https://codecov.io/gh/PookieSoft/BongBot-Quote/branch/main/graph/badge.svg)
![License](https://img.shields.io/github/license/PookieSoft/BongBot-Quote?v=2)
![Node Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen?logo=node.js)

Welcome to BongBot-Quote! 🤖

BongBot-Quote is a microservice in the BongBot ecosystem, integration with quotedb features via a Discord bot. It leverages slash commands for retrieving and creating quotes.

## Features

- **Quote Creation**: Create Quotes into an ElmuDB Quote Instance
- **Quote Retrieval**: Retrieve up to 10 recent or random quotes from an ElmuDB Quote Instance

## Quick Start with Docker

### Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your system
- A Discord Bot Token (see [Discord Developer Portal](https://discord.com/developers/applications))

### Running the Bot

1. **Clone the repository**:

    ```bash
    git clone https://github.com/PookieSoft/BongBot-Quote.git
    cd BongBot-Quote
    ```

2. **Configure environment variables**:
   Copy the example environment file and update it with your credentials:

    ```bash
    cp .env.example .env
    ```

    Edit `.env` and add your Discord bot token and other API keys:

    ```env
    DISCORD_API_KEY=your_discord_bot_token_here
    DISCORD_CHANNEL_ID=your_channel_id_here
    # Add other API keys as needed
    ```

3. **Run with Docker**:

    ```bash
    # Build and run the container
    docker build --secret id=NODE_AUTH_TOKEN,env=NODE_AUTH_TOKEN -t bongbot-quote .
    docker run --env-file .env --volume ./logs:/app/logs bongbot-quote
    ```

    Or use the pre-built image:

    ```bash
    # Dev Build
    docker run --env-file .env --volume --volume ./logs:/app/logs mirasi/bongbot-Quote-develop:latest
    ```

    ```bash
    # Release Build
    docker run --env-file .env --volume --volume ./logs:/app/logs mirasi/bongbot-Quote:latest
    ```

    **It is recommended you use docker for local development.**

## Environment Configuration

| Variable              | Required | Description                                               |
| --------------------- | -------- | --------------------------------------------------------- |
| `DISCORD_API_KEY`     | ✅       | Your Discord bot token                                    |
| `DISCORD_BOT_USER_ID` | ✅       | Your Discord Bot User Id for detecting replies to the bot |
| `DISCORD_CHANNEL_ID`  | ❌       | Default channel ID for info card on bot launch            |
| `QUOTEDB_API_KEY`     | ✅       | API Key for interacting with QuoteDB                      |
| `QUOTEDB_USER_ID`     | ✅       | User Id for the QuoteDB Instance                          |

## Available Commands

- `/quote` - Interact with quotedb instance using the following subcommands:
    - `create` - Create a new quote entry in the quote database
    - `recent` - Get up to 10 recent quotes from the database
    - `random` - Get up to 10 random quotes from the database

## Local Development Setup

This project uses `@pookiesoft/bongbot-core` from GitHub Packages (private). You'll need a GitHub Personal Access Token to install dependencies.

1. **Create a GitHub Classic PAT**:
    - Go to **GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)**
    - Generate a new token with the `read:packages` scope
    - Ensure the token is authorized for the **PookieSoft** organization

2. **Set the token in your environment**:

    ```bash
    echo 'export NODE_AUTH_TOKEN=ghp_yourTokenHere' >> ~/.bashrc
    source ~/.bashrc
    ```

3. **Install dependencies**:

    ```bash
    npm install
    ```

4. **Build and run locally with Docker**:
    ```bash
    docker build --secret id=NODE_AUTH_TOKEN,env=NODE_AUTH_TOKEN -t bongbot-Quote .
    docker run --env-file .env --volume ./data:/app/data --volume ./logs:/app/logs bongbot-Quote
    ```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## Testing

The bot includes comprehensive test coverage using Jest:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- tests/commands/Quotedactyl/register_server.test.ts
```

## License

This project is open source and available under the [MIT License](LICENSE).
