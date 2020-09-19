import { FilterQuery } from 'mongodb';
import { ParsedQs } from 'qs'
import { Player } from '../models';

export class MatchQuery {
  private filterQuery: FilterQuery<any>;
  constructor(query: ParsedQs, players: Player[]) {
    this.filterQuery = {
      players: {
        $all: [{ $elemMatch: {} }, { $elemMatch: {} }]
      }
    };

    if (query.versions) { this.filterQuery.version = { $in: String(query.versions).split(',') } };
    if (query.channels) { this.filterQuery.channel = { id: { $in: String(query.channels).split(',') } } };
    if (query.title) { this.filterQuery.$text = { $search: String(query.title) } };

    let playerNames = [query.p1, query.p2];
    for (let i = 0; i < 2; i++) {
      let playerName = playerNames[i] ?? playerNames[1 - i];

      if (playerName) {
        let foundPlayers = players.filter((player: Player) => player.aliases.map(alias => alias.toLowerCase()).includes(String(playerName).toLowerCase()));

        if (foundPlayers) {
          if (!this.filterQuery.players.$all[i].$elemMatch.id) { this.filterQuery.players.$all[i].$elemMatch.id = {} }
          this.filterQuery.players.$all[i].$elemMatch.id.$in = foundPlayers.map(player => String(player._id));
        }
      }
    }

    let characters = [query.p1chars, query.p2chars];
    let isMirrorMatch = characters[0] && characters[0] === characters[1];
    if (isMirrorMatch) {
      this.filterQuery.mirror = { $all: String(characters[0]).split(',') }
    } else {
      for (let i = 0; i < 2; i++) {
        if (characters[i]) { this.filterQuery.players.$all[i].$elemMatch.characters = { $all: String(characters[i]).split(',') } }
      }
    }
  }

  public getFilterQuery() {
    return this.filterQuery;
  }
}