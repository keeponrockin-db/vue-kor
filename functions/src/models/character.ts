export class Character {
  public oldId?: string;
  public id: string;
  public iconUrl: string;
  public name: string;

  public constructor(character: Partial<Character> = {} as Character) {
    if (!character.id || !character.iconUrl || !character.name) {
      throw new Error("Incomplete character data");
    }

    this.oldId = character.oldId;
    this.id = character.id;
    this.iconUrl = character.iconUrl;
    this.name = character.name;
  }

  public equals(character: Character) {
    return this.id === character.id &&
      this.iconUrl === character.iconUrl &&
      this.name === character.name;
  }
}
