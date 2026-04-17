import { Message, WebhookClient } from "discord.js";
import { fetchCharacter } from "../workshelf";

// Matches "CharacterName: message text" — name can include spaces and apostrophes
const PROXY_PATTERN = /^([A-Za-z][A-Za-z\s']{0,49}):\s+(.+)/s;

// Cached webhook clients per channel so we don't re-fetch on every message
const webhookCache = new Map<string, WebhookClient>();

export async function handleProxy(message: Message): Promise<boolean> {
  const match = message.content.match(PROXY_PATTERN);
  if (!match) {
    console.log(`[proxy] no match for: ${JSON.stringify(message.content)}`);
    return false;
  }

  const name = match[1].trim();
  const text = match[2];
  console.log(`[proxy] matched name="${name}" text="${text.slice(0, 40)}"`);

  const character = await fetchCharacter(name);
  if (!character) {
    console.log(`[proxy] character "${name}" not found — skipping`);
    return false;
  }
  console.log(`[proxy] found character: ${character.name}`);
  if (!character) return false; // Not a known character — ignore

  // Get or create a Cyarika-owned webhook in this channel
  let webhook = webhookCache.get(message.channelId);
  if (!webhook) {
    if (!message.channel.isTextBased() || !("fetchWebhooks" in message.channel)) return false;

    const existing = await message.channel.fetchWebhooks();
    let wh = existing.find(
      (w) => w.owner?.id === message.client.user?.id && w.name === "Cyarika Proxy"
    );

    if (!wh) {
      wh = await message.channel.createWebhook({ name: "Cyarika Proxy" });
    }

    if (!wh.token) {
      console.error("Webhook has no token — cannot send proxy message");
      return false;
    }

    webhook = new WebhookClient({ id: wh.id, token: wh.token });
    webhookCache.set(message.channelId, webhook);
  }

  try {
    await message.delete();
  } catch {
    // Missing permissions or already deleted — proceed anyway
  }

  await webhook.send({
    content: text,
    username: character.fullName ?? character.name,
    avatarURL: character.avatarUrl ?? undefined,
    allowedMentions: { parse: [] }, // Don't ping anyone via proxy
  });

  return true;
}
