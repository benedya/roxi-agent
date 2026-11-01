# Roxi

Roxi is an open-source AI agent for group chats. Add it to a Telegram group, and it becomes the group's shared assistant.

Anyone can install Roxi and run their own Telegram bot powered by it.

<p align="center">
  <img src="docs/demo.gif" alt="Roxi saving, recalling and editing a note in a Telegram group chat" width="420">
</p>

> **Note:** Roxi is in active development, so some features may be unstable or change.

## Features

- **Group instructions:** group admins can set how Roxi behaves in their chat, such as its tone, language, or response format.
- **Notes:** members can ask Roxi to save notes and later remind them. Notes can be added, listed, searched, edited, and removed.

More features are coming.

## Supported platforms

- Telegram

## Installation

You need [Docker](https://docs.docker.com/get-docker/), a Telegram bot token, and an API key for an AI model provider (DeepSeek or OpenAI).

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-username>/roxi-agent.git
   cd roxi-agent
   ```

2. Create a Telegram bot with [@BotFather](https://t.me/BotFather) (`/newbot`) and copy its token. To let the bot see all group messages, turn off its privacy mode: `/setprivacy` → **Disable**.

3. Create your environment file and fill in the values (model provider and API key, bot token, database password). Each variable is described in the file:

   ```bash
   cp .env.example .env.local
   ```

4. Start the agent. On each start it creates the database schema and applies pending migrations:

   ```bash
   make run
   ```

5. Add the bot to a Telegram group. Mention it by its @username or reply to its messages to talk to it.

### Other commands

| Command | What it does |
| --- | --- |
| `make up` | Start everything in the background |
| `make down` | Stop all containers (data is kept) |
| `make logs` | Follow the agent logs |
| `make tui` | Open the eve terminal UI against the running agent |
| `make db-migrate` | Apply pending database migrations |

## Built with

Roxi is built with [eve](https://eve.dev), a framework for building AI agents.

## License

[MIT](LICENSE)
