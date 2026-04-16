export interface Character {
  id: string;
  repoId: string;
  name: string;
  fullName: string | null;
  titles: string | null;
  pronouns: string | null;
  race: string | null;
  species: string | null;
  characterClass: string | null;
  level: number | null;
  alignment: string | null;
  avatarUrl: string | null;
  occupation: string | null;
  currentLocation: string | null;
  personalityOneSentence: string | null;
  keyVirtues: string | null;
  keyFlaws: string | null;
  coreMotivation: string | null;
  deepestFear: string | null;
  system: string | null;
}
