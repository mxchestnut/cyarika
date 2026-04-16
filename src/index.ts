import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { handleProxy } from "./handlers/proxy";
import { handleProfile } from "./handlers/profile";

// Validate required env
const required = ["DISCORD_TOKEN", "WORKSHELF_URL", "BOT_API_KEY"] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Cyarika is online as ${client.user?.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return; // DMs ignored

  // Profile lookup: !CharacterName
  if (message.content.startsWith("!")) {
    const handled = await handleProfile(message).catch((err) => {
      console.error("Profile handler error:", err);
      return false;
    });
    if (handled) return;
  }

  // Proxy: CharacterName: message text
  await handleProxy(message).catch((err) => {
    console.error("Proxy handler error:", err);
  });
});

client.login(process.env.DISCORD_TOKEN);
