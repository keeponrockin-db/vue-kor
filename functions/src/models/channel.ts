import { ObjectID } from "mongodb";

export class Channel {
  public _id: ObjectID;
  public id: string;
  public name: string;

  constructor(channel: Partial<Channel>) {
    if (!channel.id || !channel.name) { throw new Error('Incomplete channel data'); }

    this._id = new ObjectID(channel._id);
    this.id = channel.id;
    this.name = channel.name;
  }
}