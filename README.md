# Roxi

Roxi is an open-source AI agent for group chats. Add it to a Telegram group, and it becomes the group's shared assistant.

Anyone can install Roxi and run their own Telegram bot powered by it.

> [!WARNING]
> Roxi is an experimental hobby project in active development, so some features may be unstable or change. To try it out, use a [tagged version](https://github.com/benedya/roxi-agent/tags) rather than the latest code.

## Features

- **Group instructions:** group admins can set how Roxi behaves in their chat, such as its tone, language, or response format. [See it in action](docs/examples/group-instructions.md)
- **Notes:** members can ask Roxi to save notes and later remind them. Notes can be added, listed, searched, edited, and removed. [See it in action](docs/examples/notes.md)
- **Assignments:** members can ask Roxi to give another member a set of questions or steps. Roxi sends them in a private chat and posts the result in the group. [See it in action](docs/examples/assignments.md)
- **Your language:** Roxi replies in the language you write in. Its fixed messages follow your Telegram language and are translated automatically on first use.

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

## Technical details

### One session per group

All messages addressed to Roxi in a group go into one long-lived session, so Roxi remembers earlier conversations and can follow what any member said before.

- **Addressed messages only:** mentions, replies to Roxi, and commands reach the session. Other group messages are ignored.
- **Messages are queued:** when several members write at once, Roxi handles their messages in order, so one member doesn't interrupt another.
- **Forum topics:** in a group with topics, each topic has its own session.
- **Private chats:** each member's private chat with Roxi has its own session, separate from the group's.
- **No expiry:** sessions are stored in Postgres and don't time out.

### Compaction

A session's history is sent to the model on every turn, so it grows and costs more over time. To keep it in check, Roxi compacts the session: when it reaches a set share of the model's context window, the older turns are replaced by a summary written by the main model (`AGENT_MODEL`).

Details that the summary leaves out are no longer available to Roxi in the conversation. Saved notes aren't affected, because they are stored separately.

To adjust when compaction happens, set `COMPACTION_THRESHOLD_PERCENT` in `.env.local` to a value from 0 to 1 (default: `0.5`), then restart the agent:

| Value | Effect |
| --- | --- |
| Lower | Compacts sooner: less history is sent on each turn, so turns use fewer tokens, but less of the conversation is kept word for word |
| Higher | Compacts later: more of the conversation is kept word for word, but turns use more tokens |

## Built with

Roxi is built with [eve](https://eve.dev), a framework for building AI agents.

## License

[MIT](LICENSE)
