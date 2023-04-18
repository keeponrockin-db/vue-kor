import { ObjectId } from "mongodb";

export class Player {
  public _id: ObjectId;
  public name: string;
  public aliases: Array<string>;

  public constructor(player: Partial<Player> = {} as Player) {
    if (!player.name) {
      throw new Error("Incomplete player data");
    }

    this._id = new ObjectId(player._id);
    this.name = player.name;
    this.aliases = Array.from(new Set([player.name, ...player.aliases ?? []]));
  }
}
