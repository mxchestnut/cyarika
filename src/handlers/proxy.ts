import { Message, WebhookClient } from "discord.js";
import { fetchCharacter } from "../workshelf";

// Matches "CharacterName: message text" — name can include spaces and apostrophes
const PROXY_PATTERN = /^([A-Za-z][A-Za-z\s']{0,49}):\s+(.+)/s;

// Cached webhook clients per channel so we don't re-fetch on every message
const webhookCache = new Map<string, WebhookClient>();

async function getOrCreateWebhook(message: Message): Promise<WebhookClient | null> {
  const cached = webhookCache.get(message.channelId);
  if (cached) return cached;

  if (!message.channel.isTextBased() || !("fetchWebhooks" in message.channel)) return null;

  const existing = await message.channel.fetchWebhooks();
  let wh = existing.find(
    (w) => w.owner?.id === message.client.user?.id && w.name === "Cyarika Proxy"
  );

  if (!wh) {
    wh = await message.channel.createWebhook({ name: "Cyarika Proxy" });
  }

  if (!wh.token) {
    console.error("[proxy] webhook has no token — cannot send proxy message");
    return null;
  }

  const client = new WebhookClient({ id: wh.id, token: wh.token });
  webhookCache.set(message.channelId, client);
  return client;
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

  const payload = {
    content: text,
    username: character.fullName ?? character.name,
    avatarURL: character.avatarUrl ?? undefined,
    allowedMentions: { parse: [] as [] },
  };

  let webhook = await getOrCreateWebhook(message);
  if (!webhook) return false;

  try {
    await webhook.send(payload);
  } catch (err) {
    // Webhook may have been deleted — invalidate cache and retry once with a fresh one
    console.error("[proxy] webhook send failed, retrying with fresh webhook:", err);
    webhookCache.delete(message.channelId);
    webhook = await getOrCreateWebhook(message);
    if (!webhook) return false;
    await webhook.send(payload); // throws on second failure — propagates to index.ts
  }

  // Delete original only after the proxy message is confirmed sent
  try {
    await message.delete();
  } catch {
    // Missing permissions or already deleted — not critical
  }

  return true;
}
