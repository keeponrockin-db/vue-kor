import { ObjectId } from "mongodb";

export class Channel {
  public _id: ObjectId;
  public id: string;
  public name: string;

  constructor(channel: Partial<Channel>) {
    if (!channel.id || !channel.name) {
      throw new Error("Incomplete channel data");
    }

    this._id = new ObjectId(channel._id);
    this.id = channel.id;
    this.name = channel.name;
  }
}
