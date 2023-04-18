import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import {
  Channel,
  Character,
  Player,
  Version,
  YoutubeData,
  Match,
  PartialMatch,
  MatchQuery,
} from "./models";
import { ParsedQs } from "qs";
import axios, { AxiosResponse } from "axios";

export class Keeponrockin {
  private mongoClient: MongoClient;
  private itemsPerPage: number;
  private defaultSort: any;
  private dbName: string;

  public constructor(mongoConnectionString: string, dbName: string) {
    this.mongoClient = new MongoClient(mongoConnectionString, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    this.itemsPerPage = 50;

    this.defaultSort = {
      date: -1,
      video: 1,
      timestamp: 1,
    };

    this.dbName = dbName;
  }

  public getChannels(): Promise<Channel[]> {
    return this.mongoClient.db(this.dbName)
      .collection("channels")
      .find()
      .toArray()
      .then((channels) => channels.map((channel) => new Channel(channel)));
  }

  public getCharacters(): Promise<Character[]> {
    return this.mongoClient.db(this.dbName)
      .collection("characters")
      .find()
      .toArray()
      .then((characters) => characters.map(
        (character) => new Character(character as Partial<Character>))
      );
  }

  // TODO (update matches with updated character)
  public saveCharacter(body: any): Promise<any> {
    const character = new Character({
      name: body.name,
      id: body.id,
      iconUrl: body.iconUrl,
    });

    return this.getMatches({ p1chars: body.oldId }).then((matches: Match[]) => {
      if (matches.length === 0) {
        return this.mongoClient.db(this.dbName)
          .collection("characters")
          .updateOne({ id: body.oldId || body.id },
            { $set: character },
            { upsert: true });
      } else {
        throw new Error(
          `Character: ${body.oldId} is used in ${matches.length} matches`
        );
      }
    });
  }

  public deleteCharacter(query: ParsedQs): Promise<any> {
    return this.getMatches({ p1chars: query.id }).then((matches: Match[]) => {
      if (matches.length === 0) {
        return this.mongoClient.db(this.dbName)
          .collection("characters")
          .deleteOne({ id: query.id });
      } else {
        throw new Error(
          `Character: ${query.id} is used in ${matches.length} matches`
        );
      }
    });
  }

  public getPlayers(): Promise<Player[]> {
    return this.mongoClient.db(this.dbName)
      .collection("players")
      .find()
      .toArray()
      .then((players) => players
        .map((player) => new Player(player)));
  }

  public savePlayer(body: any): Promise<any> {
    const player = new Player({
      _id: body.id,
      name: body.name,
      aliases: body.aliases,
    });

    return this.mongoClient.db(this.dbName)
      .collection("players")
      .updateOne({ _id: player._id },
        {
          $set: { name: player.name, aliases: player.aliases },
        });
  }

  public deletePlayer(query: ParsedQs): Promise<any> {
    return this.getPlayers()
      .then((players: Player[]) => players.find(
        (player) => player._id.equals(String(query.id)))?.name
      ).then((name?: string) => this.getMatches({ p1: String(name) })
      ).then((matches: Match[]) => {
        if (matches.length === 0) {
          return this.mongoClient.db(this.dbName)
            .collection("players")
            .deleteOne({ _id: new ObjectId(String(query.id)) });
        } else {
          throw new Error(
            `Player: ${query._id} is used in ${matches.length} matches`
          );
        }
      });
  }

  // TEST THOROUGHLY
  public mergePlayers(query: ParsedQs): Promise<any> {
    return this.getPlayers().then((players: Player[]) => {
      const p1 = new Player(
        players.find((player: Player) =>
          player.aliases.includes(String(query.p1)))
      );

      const p2 = new Player(
        players.find((player: Player) =>
          player.aliases.includes(String(query.p2)))
      );

      if (new ObjectId(p1?._id).equals(new ObjectId(p2?._id))) {
        throw new Error("Players with the same id cannot be merged");
      }

      const session = this.mongoClient.startSession();

      return this.mongoClient.db(this.dbName)
        .collection("matches")
        .updateMany({ "players.id": String(p1?._id) },
          { $set: { "$players.$[player].id": String(p2?._id) } },
          { arrayFilters: [{ "player.id": String(p1?._id) }] }
        ).then(() => this.mongoClient.db(this.dbName)
          .collection("players")
          .updateOne({ "_id": new ObjectId(p1?._id) },
            { $set: { "aliases": new Set([...p1?.aliases, ...p2?.aliases]) } }
          )
        ).then(() => this.mongoClient.db(this.dbName)
          .collection("players")
          .deleteOne({ _id: new ObjectId(p2._id) })
        ).then(() => session.endSession());
    });
  }

  public getVersions(): Promise<Version[]> {
    return this.mongoClient.db(this.dbName)
      .collection("versions")
      .find()
      .toArray()
      .then((versions) => versions.map((version) => new Version(version)));
  }

  public saveVersion(body: any): Promise<any> {
    const version = new Version({ name: body.name, newName: body.newName });
    return this.mongoClient.db(this.dbName)
      .collection("versions")
      .updateOne({ name: version.name },
        { $set: { name: version.newName } },
        { upsert: true },
      );
  }

  public deleteVersion(query: ParsedQs): Promise<any> {
    return this.getMatches({ versions: query.version })
      .then((matches: Match[]) => {
        if (matches.length === 0) {
          return this.mongoClient.db(this.dbName)
            .collection("versions")
            .deleteOne({ name: query.version });
        } else {
          throw new Error(
            `Version: ${query.version} is used in ${matches.length} matches`
          );
        }
      });
  }

  public getYoutubeData(query: ParsedQs,
    youtubeKey: string): Promise<YoutubeData> {
    const videoId = String(query.v);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeKey}`;
    return axios.get(url).then((response: AxiosResponse) =>
      new YoutubeData(videoId, response));
  }

  public getMatches(query: ParsedQs): Promise<Match[]> {
    return this.getPlayers()
      .then((players: Player[]) => {
        return Promise.all([
          this._getPartialMatches(query, players),
          this.getCharacters(),
        ]).then((results: [PartialMatch[], Character[]]) => {
          const matches = results[0];
          const characters = results[1];
          return ({ characters, matches, players });
        });
      }).then(({ characters, matches, players }) =>
        matches.map((match: PartialMatch) =>
          new Match(match, characters, players)));
  }

  private _getPartialMatches(query: ParsedQs,
    players: Player[]): Promise<PartialMatch[]> {
    const sort = this.defaultSort;
    let skip = 0;
    let limit = 0;
    if (query.page !== "all") {
      skip = Number(query.page) > 0 ?
        (Number(query.page) - 1) * this.itemsPerPage : 0;
      limit = this.itemsPerPage;
    }

    return this.mongoClient.db(this.dbName)
      .collection("matches")
      .find(new MatchQuery(query, players).getFilter())
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray()
      .then((matches) => matches.map(
        (match) => new PartialMatch(match as unknown as PartialMatch))
      );
  }


  // TODO WHOLE THING NOT DONE
  public saveMatches(body: any): Promise<any> {
    const version = "";
    const channel = {
      id: "",
    };
    const matches = [{ video: "" }];

    const session = this.mongoClient.startSession();

    return this.mongoClient.db(this.dbName)
      .collection("versions")
      .updateOne({ name: version },
        { $set: { name: version } },
        { upsert: true },
      ).then(() => this.mongoClient.db(this.dbName)
        .collection("channels")
        .updateOne({ id: channel.id },
          { $set: channel },
          { upsert: true },
        )
      ).then(() => this.mongoClient.db(this.dbName)
        .collection("matches")
        .deleteMany({ video: matches[0].video })
      ).then(() => this.mongoClient.db(this.dbName)
        .collection("matches")
        .insertMany(matches)
      ).then(() => session.endSession());
  }

  // TODO
  public deleteMatches(query: ParsedQs): Promise<any> {
    return this.mongoClient.db(this.dbName)
      .collection("matches")
      .deleteMany({ video: query.videoId });
  }
}
