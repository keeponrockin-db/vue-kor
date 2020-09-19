import 'mocha';
import { Keeponrockin } from './keeponrockin';
import { Channel, Character, Match, Player, Version } from './models';
const assert = require('assert');

require('dotenv').config();

describe('Keeponrockin', () => {
  context('Character CRUD tests', () => {
    const mongoDbUri = String(process.env.MONGODB);
    const context = new Keeponrockin(mongoDbUri);

    it('Can save new characters', () => {
      return context.SaveCharacter(new Character({ id: 'test', iconUrl: 'test', name: 'test' }))
        .then(() => context.GetCharacters().then((characters: Character[]) => {
          assert.ok(characters.find((character: Character) => character.equals(new Character({ id: 'test', iconUrl: 'test', name: 'test' }))));
        }));
    });

    it('Can edit characters', () => {
      return context.SaveCharacter(new Character({ oldId: 'test', id: 'test2', iconUrl: 'test2', name: 'test2' }))
        .then(() => context.GetCharacters().then((characters: Character[]) => {
          assert.ok(characters.find((character: Character) => character.equals(new Character({ id: 'test', iconUrl: 'test', name: 'test' }))) === undefined);
          assert.ok(characters.find((character: Character) => character.equals(new Character({ id: 'test2', iconUrl: 'test2', name: 'test2' }))));
        }));
    });

    it('Can delete characters', () => {
      return context.DeleteCharacter({ id: 'test2' })
        .then(() => context.GetCharacters().then((characters: Character[]) => {
          assert.ok(characters.find((character: Character) => character.equals(new Character({ id: 'test2', iconUrl: 'test2', name: 'test2' }))) === undefined);
        }));
    })
  });

  context('Version CRUD tests', () => {
    const mongoDbUri = String(process.env.MONGODB);
    const context = new Keeponrockin(mongoDbUri);

    it('Can save new versions', () => {
      return context.SaveVersion(new Version({ name: 'test' }))
        .then(() => context.GetVersions().then((versions: Version[]) => {
          assert.ok(versions.find((version: Version) => version.equals(new Version({ name: 'test' }))));
        }));
    });

    it('Can edit versions', () => {
      return context.SaveVersion(new Version({ name: 'test', newName: 'test2' }))
        .then(() => context.GetVersions().then((versions: Version[]) => {
          assert.ok(versions.find((version: Version) => version.equals(new Version({ name: 'test' }))) === undefined);
          assert.ok(versions.find((version: Version) => version.equals(new Version({ name: 'test2' }))));
        }));
    });

    it('Can delete versions', () => {
      return context.DeleteVersion({ version: 'test2' })
        .then(() => context.GetVersions().then((versions: Version[]) => {
          assert.ok(versions.find((version: Version) => version.equals(new Version({ name: 'test2' }))) === undefined);
        }));
    })
  });

  context('Match CRUD tests', () => {
    const mongoDbUri = String(process.env.MONGODB);
    const context = new Keeponrockin(mongoDbUri);

    it('Can save matches', () => {
      return context.SaveCharacter(new Character({ id: 'test', iconUrl: 'test', name: 'test' }))
        .then(() => context.SaveVersion(new Version({ name: 'test' })))
        .then(() => context.SaveMatches([
          {
            channel: { id: 'test', name: 'test' },
            date: '2000-01-01',
            players: [
              { name: 'test1', characters: ['test'] },
              { name: 'test2', characters: ['test'] }
            ],
            timestamp: '00h00m00s',
            title: 'test',
            version: 'test',
            video: 'test'
          }, {
            channel: { id: 'test', name: 'test' },
            date: '2000-01-01',
            players: [
              { name: 'test1', characters: ['test'] },
              { name: 'test2', characters: ['test'] }
            ],
            timestamp: '00h01m00s',
            title: 'test',
            version: 'test',
            video: 'test'
          }
        ]))
        .then(() => context.GetMatches({}).then((matches: Match[]) => {
          assert.ok();
        }));
    });

    it('Can get channels', () => {
      return context.GetChannels().then((channels: Channel[]) => {
        assert.ok();
      });
    })

    it('Can get players', () => {
      return context.GetPlayers().then((players: Player[]) => {
        assert.ok();
      })
    })

    it('Can edit matches', () => {
      return context.SaveMatches({})
        .then(() => context.GetMatches({}).then((matches: Match[]) => {
          assert.ok();
        }));
    })

    it('Can delete matches', () => {
      return context.DeleteMatches({})
        .then(() => context.GetMatches({}).then((matches: Match[]) => {
          assert.ok();
        }))
        .then(() => context.DeleteCharacter({ id: 'test' }))
        .then(() => context.DeleteVersion({ id: 'test' }));
    });

    it('Can delete players', () => {
      return context.DeletePlayer({})
        .then(() => context.GetPlayers().then((players: Player[]) => {
          assert.ok();
        }));
    })
  })
});