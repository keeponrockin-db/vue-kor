import { Channel, Character, Player } from "../models";

export class PartialMatch {
  public video: string;
  public title: string;
  public channel: Channel;
  public date: Date;
  public version: string;
  public timestamp: string;
  public players: Array<PartialMatchPlayer>;

  constructor(match: PartialMatch) {
    this.video = match.video;
    this.title = match.title;
    this.channel = new Channel(match.channel);
    this.date = match.date;
    this.version = match.version;
    this.timestamp = match.timestamp;
    this.players = match.players.map(
      (player: PartialMatchPlayer) => new PartialMatchPlayer(player)
    );
  }
}

class PartialMatchPlayer {
  public characters: Array<string>;
  public id: string;

  constructor(matchPlayer: PartialMatchPlayer) {
    this.characters = matchPlayer.characters;
    this.id = matchPlayer.id;
  }
}

export class Match {
  public video: string;
  public title: string;
  public channel: Channel;
  public date: Date;
  public version: string;
  public timestamp: string;
  public players: Array<MatchPlayer>;

  constructor(match: PartialMatch, characters: Character[], players: Player[]) {
    this.video = match.video;
    this.title = match.title;
    this.channel = new Channel(match.channel);
    this.date = match.date;
    this.version = match.version;
    this.timestamp = match.timestamp;
    this.players = match.players.map(
      (matchPlayer: PartialMatchPlayer) => new MatchPlayer({
        characters: matchPlayer.characters.map(
          (matchCharacter: string) => new Character(
            characters.find((character) => character.id === matchCharacter)
          )
        ),
        name: players.find(
          (player: Player) => player._id.equals(matchPlayer.id)
        )?.name,
        aliases: players.find(
          (player: Player) => player._id.equals(matchPlayer.id)
        )?.aliases,
      }));
  }
}

class MatchPlayer {
  public characters?: Array<Character>;
  public name?: string;
  public aliases?: string[];

  constructor(matchFullPlayer: MatchPlayer) {
    this.characters = matchFullPlayer.characters;
    this.name = matchFullPlayer.name;
    this.aliases = matchFullPlayer.aliases;
  }
}
