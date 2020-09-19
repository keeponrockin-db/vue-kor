import { ObjectID } from "mongodb";

export class Version {
  public _id: ObjectID;
  public name: string;
  public newName: string;

  constructor(version: Partial<Version>) {
    if (!version.name) { throw new Error('Incomplete version data'); }

    this._id = new ObjectID(version._id);
    this.name = version.name;
    this.newName = version.newName ?? version.name;
  }
  
  public equals(version: Version) {
    return this.name === version.name;
  }
}