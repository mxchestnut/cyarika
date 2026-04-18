import { Message, WebhookClient, TextChannel } from "discord.js";
import { fetchCharacter } from "../workshelf";

// Matches "CharacterName: message text" — name can include spaces and apostrophes
const PROXY_PATTERN = /^([A-Za-z][A-Za-z\s']{0,49}):\s+(.+)/s;

// Cached webhook clients per parent channel so we don't re-fetch on every message
const webhookCache = new Map<string, WebhookClient>();

async function getOrCreateWebhook(
  message: Message
): Promise<{ client: WebhookClient; threadId?: string } | null> {
  const channel = message.channel;
  let parentChannel: TextChannel;
  let threadId: string | undefined;

  // Forum posts and threads: webhook must live on the parent channel
  if (channel.isThread()) {
    threadId = channel.id;
    const parent = channel.parent;
    if (!parent || !("fetchWebhooks" in parent)) return null;
    parentChannel = parent as TextChannel;
  } else if ("fetchWebhooks" in channel) {
    parentChannel = channel as TextChannel;
  } else {
    return null;
  }

  const cacheKey = parentChannel.id;
  const cached = webhookCache.get(cacheKey);
  if (cached) return { client: cached, threadId };

  const existing = await parentChannel.fetchWebhooks();
  let wh = existing.find(
    (w) => w.owner?.id === message.client.user?.id && w.name === "Cyarika Proxy"
  );

  if (!wh) {
    wh = await parentChannel.createWebhook({ name: "Cyarika Proxy" });
  }

  if (!wh.token) {
    console.error("[proxy] webhook has no token — cannot send proxy message");
    return null;
  }

  const client = new WebhookClient({ id: wh.id, token: wh.token });
  webhookCache.set(cacheKey, client);
  return { client, threadId };
}

export async function handleProxy(message: Message): Promise<boolean> {
  const match = message.content.match(PROXY_PATTERN);
  if (!match) {
    console.log(`[proxy] no match for: ${JSON.stringify(message.content)}`);
    return false;
  }

  const name = match[1].trim();
  const text = match[2];
  console.log(`[proxy] matched name="${name}" text="${text.slice(0, 40)}"`);

  const character = await fetchCharacter(name, message.author.id);
  if (!character) {
    console.log(`[proxy] character "${name}" not found — skipping`);
    return false;
  }
  console.log(`[proxy] found character: ${character.name}`);

  let result = await getOrCreateWebhook(message);
  if (!result) return false;

  const payload = {
    content: text,
    username: character.fullName ?? character.name,
    avatarURL: character.avatarUrl ?? undefined,
    allowedMentions: { parse: [] as [] },
    threadId: result.threadId,
  };

  try {
    await result.client.send(payload);
  } catch (err) {
    // Webhook may have been deleted — invalidate cache and retry once with a fresh one
    console.error("[proxy] webhook send failed, retrying with fresh webhook:", err);
    const parentId = message.channel.isThread()
      ? message.channel.parentId!
      : message.channelId;
    webhookCache.delete(parentId);
    result = await getOrCreateWebhook(message);
    if (!result) return false;
    await result.client.send({ ...payload, threadId: result.threadId });
  }

  // Delete original only after the proxy message is confirmed sent
  try {
    await message.delete();
  } catch {
    // Missing permissions or already deleted — not critical
  }

  return true;
}
