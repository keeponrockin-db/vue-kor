import { MongoClient, ObjectId, ObjectID } from 'mongodb';
import { Channel, Character, PartialMatch, Player, Match, MatchQuery, Version, YoutubeData } from './models';
import { ParsedQs } from 'qs';
import axios, { AxiosResponse } from 'axios';

export class Keeponrockin {
  private mongoConnectionString: string;
  private mongoConfig: any;
  private itemsPerPage: number;
  private defaultSort: any;

  public constructor(mongoConnectionString: string) {
    this.mongoConnectionString = mongoConnectionString;
    this.mongoConfig = { useUnifiedTopology: true };
    this.itemsPerPage = 50;
    this.defaultSort = {
      date: -1,
      video: 1,
      timestamp: 1
    };
  }

  public GetChannels(): Promise<Channel[]> {
    return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
      .then(client => client.db()
        .collection('channels')
        .find()
        .toArray()
      ).then(channels => channels.map(channel => new Channel(channel)));
  }

  public GetCharacters(): Promise<Character[]> {
    return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
      .then(client => client.db()
        .collection('characters')
        .find()
        .toArray()
      ).then(characters => characters.map(character => new Character(character)));
  }

  // TODO
  public SaveCharacter(body: any): Promise<any> {
    let character = new Character({
      name: body.name,
      id: body.id,
      iconUrl: body.iconUrl
    });

    return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
      .then(client => {
        let session = client.startSession();
        return { session, client };
      })
      .then(({ session, client }) => client.db()
        .collection('characters')
        .updateOne({ id: body.oldId || body.id }, { $set: character }, { upsert: true })
        .then(() => session)
      ).then(session => session.endSession());
  }

  public DeleteCharacter(query: ParsedQs): Promise<any> {
    return this.GetMatches({ p1chars: query.id }).then((matches: Match[]) => {
      if (matches.length === 0) {
        return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
          .then((client: MongoClient) => client.db()
            .collection('characters')
            .deleteOne({ id: query.id })
          );
      } else {
        throw new Error(`Character: ${query.id} is used in ${matches.length} matches`);
      }
    });
  }

  private GetPartialMatches(query: ParsedQs, players: Player[]): Promise<PartialMatch[]> {
    let sort = this.defaultSort;
    let skip = 0;
    let limit = 0;
    if (query.page !== 'all') {
      skip = Number(query.page) > 0 ? (Number(query.page) - 1) * this.itemsPerPage : 0;
      limit = this.itemsPerPage;
    }

    return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
      .then(client => client.db()
        .collection('matches')
        .find(new MatchQuery(query, players).getFilterQuery())
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray()
      ).then(matches => matches.map(match => new PartialMatch(match)));
  }

  public GetMatches(query: ParsedQs): Promise<Match[]> {
    return this.GetPlayers()
      .then((players: Player[]) => {
        return Promise.all([
          this.GetPartialMatches(query, players),
          this.GetCharacters()
        ]).then((results: [PartialMatch[], Character[]]) => {
          let matches = results[0];
          let characters = results[1];
          return ({ characters, matches, players });
        });
      }).then(({ characters, matches, players }) => matches.map((match: PartialMatch) => new Match(match, characters, players)));
  }

  // TODO
  public SaveMatches(body: any): Promise<any> {
    let version = '';
    let channel = {
      id: ''
    };
    let matches = [{ video: '' }];

    return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
      .then((client: MongoClient) => {
        let session = client.startSession();
        return { session, client };
      })
      .then(({ session, client }) => client.db()
        .collection('versions')
        .updateOne({ name: version }, { $set: { name: version } }, { upsert: true })
        .then(() => ({ session, client }))
      ).then(({ session, client }) => client.db()
        .collection('channels')
        .updateOne({ id: channel.id }, { $set: channel }, { upsert: true })
        .then(() => ({ session, client }))
      ).then(({ session, client }) => client.db()
        .collection('matches')
        .deleteMany({ video: matches[0].video })
        .then(() => ({ session, client }))
      ).then(({ session, client }) => client.db()
        .collection('matches')
        .insertMany(matches)
        .then(() => session)
      ).then(session => session.endSession());
  }

  public DeleteMatches(query: ParsedQs): Promise<any> {
    return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
      .then((client: MongoClient) => client.db()
        .collection('matches')
        .deleteMany({ video: query.videoId })
      );
  }

  public GetPlayers(): Promise<Player[]> {
    return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
      .then((client: MongoClient) => client.db()
        .collection('players')
        .find()
        .toArray()
      ).then(players => players.map(player => new Player(player)));
  }

  public SavePlayer(body: any): Promise<any> {
    let player = new Player({ _id: body.id, name: body.name, aliases: body.aliases });

    return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
      .then((client: MongoClient) => client.db()
        .collection('players')
        .updateOne({ _id: player._id }, { $set: { name: player.name, aliases: player.aliases } })
      );
  }

  public DeletePlayer(query: ParsedQs): Promise<any> {
    return this.GetPlayers().then((players: Player[]) => players.find(player => player._id.equals(String(query.id)))?.name)
      .then((name?: String) => this.GetMatches({ p1: String(name) }))
      .then((matches: Match[]) => {
        if (matches.length === 0) {
          return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
            .then((client: MongoClient) => client.db()
              .collection('players')
              .deleteOne({ _id: new ObjectID(String(query.id)) })
            );
        } else {
          throw new Error(`Player: ${query._id} is used in ${matches.length} matches`)
        }
      });
  }

  public MergePlayers(query: ParsedQs): Promise<any> {
    return this.GetPlayers().then((players: Player[]) => {
      let p1 = new Player(players.find((player: Player) => player.aliases.includes(String(query.p1))));
      let p2 = new Player(players.find((player: Player) => player.aliases.includes(String(query.p2))));

      if (new ObjectID(p1?._id).equals(new ObjectID(p2?._id))) { throw new Error('Players with the same id cannot be merged'); }

      return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
        .then((client: MongoClient) => {
          let session = client.startSession();
          return { session, client };
        })
        .then(({ session, client }) => client.db()
          .collection('matches')
          .updateMany({ 'players.id': String(p1?._id) },
            { $set: { '$players.$[player].id': String(p2?._id) } },
            { arrayFilters: [{ 'player.id': String(p1?._id) }] }
          ).then(() => ({ session, client }))
        ).then(({ session, client }) => client.db()
          .collection('players')
          .updateOne({ '_id': new ObjectID(p1?._id) },
            { $set: { 'aliases': new Set([...p1?.aliases, ...p2?.aliases]) } }
          ).then(() => ({ session, client }))
        ).then(({ session, client }) => client.db()
          .collection('players')
          .deleteOne({ _id: new ObjectId(p2._id) })
          .then(() => session)
        ).then(session => session.endSession());
    });
  }

  public GetVersions(): Promise<Version[]> {
    return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
      .then((client: MongoClient) => client.db()
        .collection('versions')
        .find()
        .toArray()
      ).then(versions => versions.map(version => new Version(version)));
  }

  public SaveVersion(body: any): Promise<any> {
    let version = new Version({ name: body.name, newName: body.newName });
    return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
      .then((client: MongoClient) => client.db()
        .collection('versions')
        .updateOne({ name: version.name }, { $set: { name: version.newName } }, { upsert: true }));
  }

  public DeleteVersion(query: ParsedQs): Promise<any> {
    return this.GetMatches({ versions: query.version }).then((matches: Match[]) => {
      if (matches.length === 0) {
        return new MongoClient(this.mongoConnectionString, this.mongoConfig).connect()
          .then((client: MongoClient) => client.db()
            .collection('versions')
            .deleteOne({ name: query.version })
          );
      } else {
        throw new Error(`Version: ${query.version} is used in ${matches.length} matches`);
      }
    });
  }

  public GetYoutubeData(query: ParsedQs, youtubeKey: string): Promise<YoutubeData> {
    let videoId = String(query.v);
    let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeKey}`;
    return axios.get(url).then((response: AxiosResponse) => new YoutubeData(videoId, response));
  }
}
