import { Message, EmbedBuilder } from "discord.js";
import { fetchCharacter } from "../workshelf";

// Matches !CharacterName (name may include spaces/apostrophes)
const PROFILE_PATTERN = /^!([A-Za-z][A-Za-z\s']{0,49})\s*$/;

export async function handleProfile(message: Message): Promise<boolean> {
  const match = message.content.match(PROFILE_PATTERN);
  if (!match) return false;

  const name = match[1].trim();
  const character = await fetchCharacter(name, message.author.id);

  if (!character) {
    await message.reply({
      content: `No character named **${name}** found on Workshelf.`,
      allowedMentions: { repliedUser: false },
    });
    return true;
  }

  const embed = new EmbedBuilder().setColor(0x6366f1);

  // Title
  const displayName = character.fullName ?? character.name;
  embed.setTitle(displayName);
  if (character.titles) embed.setDescription(`*${character.titles}*`);
  if (character.avatarUrl) embed.setThumbnail(character.avatarUrl);

  // Identity block
  const identityParts: string[] = [];
  if (character.pronouns) identityParts.push(`**Pronouns:** ${character.pronouns}`);
  const raceOrSpecies = character.species ?? character.race;
  if (raceOrSpecies) identityParts.push(`**Race/Species:** ${raceOrSpecies}`);
  if (character.alignment) identityParts.push(`**Alignment:** ${character.alignment}`);
  if (character.occupation) identityParts.push(`**Occupation:** ${character.occupation}`);
  if (character.currentLocation) identityParts.push(`**Location:** ${character.currentLocation}`);
  if (identityParts.length > 0) {
    embed.addFields({ name: "Identity", value: identityParts.join("\n"), inline: false });
  }

  // Class/level (only if relevant)
  if (character.characterClass || character.level) {
    const parts: string[] = [];
    if (character.characterClass) parts.push(`**Class:** ${character.characterClass}`);
    if (character.level) parts.push(`**Level:** ${character.level}`);
    embed.addFields({ name: "Stats", value: parts.join("  ·  "), inline: false });
  }

  // Personality
  if (character.personalityOneSentence) {
    embed.addFields({ name: "Personality", value: character.personalityOneSentence, inline: false });
  }

  // Psychology
  if (character.coreMotivation) {
    embed.addFields({ name: "Motivation", value: character.coreMotivation, inline: true });
  }
  if (character.deepestFear) {
    embed.addFields({ name: "Fear", value: character.deepestFear, inline: true });
  }
  if (character.keyVirtues) {
    embed.addFields({ name: "Virtues", value: character.keyVirtues, inline: true });
  }
  if (character.keyFlaws) {
    embed.addFields({ name: "Flaws", value: character.keyFlaws, inline: true });
  }

  embed.setFooter({ text: `Workshelf · ${character.name}` });

  await message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false },
  });

  return true;
}
