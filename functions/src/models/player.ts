import { ObjectID } from 'mongodb';

export class Player {
  public _id: ObjectID;
  public name: string;
  public aliases: Array<string>;

  public constructor(player: Partial<Player> = {} as Player) {
    if (!player.name) { throw new Error('Incomplete player data'); }

    this._id = new ObjectID(player._id);
    this.name = player.name;
    this.aliases = Array.from(new Set([player.name, ...player.aliases ?? []]));
  }
}