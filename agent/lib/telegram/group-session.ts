import type { RouteHandlerArgs } from "eve/channels";
import type { TelegramChannel, TelegramChannelState } from "eve/channels/telegram";

/**
 * eve's Telegram address is `chatId:threadId:conversationId`, and in groups conversationId
 * is a message id, so every new @mention would start its own session. Dropping it leaves one
 * session per group (per topic in forums). Private addresses have none, so they stay as they are.
 */
function toGroupSessionAddress(address: string): string {
  return address.slice(0, address.lastIndexOf(":") + 1);
}

/** Routes every message of a group chat to one session, so the agent remembers earlier conversations. */
export function shareSessionPerGroup(channel: TelegramChannel): TelegramChannel {
  return {
    ...channel,
    routes: channel.routes.map((route) =>
      route.transport === "websocket"
        ? route
        : {
            ...route,
            handler: (request: Request, args: RouteHandlerArgs<TelegramChannelState>) =>
              route.handler(request, {
                ...args,
                from: (address) => args.from(toGroupSessionAddress(address)),
                resolveSession: (address) => args.resolveSession(toGroupSessionAddress(address)),
              }),
          },
    ),
  };
}
