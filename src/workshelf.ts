import type { Character } from "./types";

// 5-minute TTL cache so the API isn't hit on every message
const cache = new Map<string, { character: Character; expiresAt: number }>();
const TTL_MS = 5 * 60 * 1000;

export async function fetchCharacter(name: string): Promise<Character | null> {
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.character;
  }

  try {
    const url = `${process.env.WORKSHELF_URL}/api/bot/characters?name=${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      headers: { "x-bot-api-key": process.env.BOT_API_KEY ?? "" },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`Workshelf API error ${res.status} for character "${name}"`);
      return null;
    }

    const data = (await res.json()) as { character: Character };
    cache.set(key, { character: data.character, expiresAt: Date.now() + TTL_MS });
    return data.character;
  } catch (err) {
    console.error("Failed to fetch character from Workshelf:", err);
    return null;
  }
}
