import { Filter } from "mongodb";
import { ParsedQs } from "qs";
import { Player } from "../models";

export class MatchQuery {
  private filter: Filter<any>;
  constructor(query: ParsedQs, players: Player[]) {
    this.filter = {
      players: {
        $all: [{ $elemMatch: {} }, { $elemMatch: {} }],
      },
    };

    if (query.versions) {
      this.filter.version = {
        $in: String(query.versions).split(","),
      };
    }

    if (query.channels) {
      this.filter.channel = {
        id: {
          $in: String(query.channels).split(","),
        },
      };
    }

    if (query.title) {
      this.filter.$text = {
        $search: String(query.title),
      };
    }

    const playerNames = [query.p1, query.p2];
    for (let i = 0; i < 2; i++) {
      const playerName = playerNames[i];

      if (playerName) {
        const foundPlayers = players.filter((player: Player) => {
          return player.aliases.map((alias) => alias.toLowerCase())
            .includes(String(playerName).toLowerCase());
        });

        if (foundPlayers) {
          if (!this.filter.players.$all[i].$elemMatch.id) {
            this.filter.players.$all[i].$elemMatch.id = {};
          }

          this.filter.players.$all[i].$elemMatch.id.$in = foundPlayers.map(
            (player) => String(player._id)
          );
        }
      }
    }

    const characters = [query.p1chars, query.p2chars];
    const isMirrorMatch = characters[0] && characters[0] === characters[1];
    if (isMirrorMatch) {
      this.filter.mirror = {
        $all: String(characters[0]).split(","),
      };
    } else {
      for (let i = 0; i < 2; i++) {
        if (characters[i]) {
          this.filter.players.$all[i].$elemMatch.characters = {
            $all: String(characters[i]).split(","),
          };
        }
      }
    }
  }

  public getFilter() {
    return this.filter;
  }
}
