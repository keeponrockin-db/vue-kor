import 'mocha';
import { Player } from './player';
const assert = require('assert');

describe('Player', () => {
  context('has no details', () => {
    let getPlayer = new Promise((resolve, reject) => {
      resolve({});
    });

    it('should throw an error', () => {
      return getPlayer.then((player: any) => {
        assert.throws(() => {
          new Player(player);
        }, Error);
      });
    });
  });

  context('has empty aliases', () => {
    const name = 'test';
    let getPlayer = new Promise((resolve, reject) => {
      resolve({ name: name, aliases: [] });
    });

    it('should put the name in aliases', () => {
      return getPlayer.then((player: any) => {
        let newPlayer = new Player(player);
        assert.ok(newPlayer.aliases.includes(name));
      });
    })
  });

  context('has null aliases', () => {
    const name = 'test';
    let getPlayer = new Promise((resolve, reject) => {
      resolve({ name: name });
    });

    it('should put the name in aliases', () => {
      return getPlayer.then((player: any) => {
        let newPlayer = new Player(player);
        assert.ok(newPlayer.aliases.includes(name));
      });
    })
  });

  context('has a name and aliases', () => {
    const name = 'test';
    const aliases = ['test'];

    let getPlayer = new Promise((resolve, reject) => {
      resolve({ name: name, aliases: aliases });
    });

    it('only has one alias', () => {
      return getPlayer.then((player: any) => {
        let newPlayer = new Player(player);
        assert.ok(newPlayer.aliases.length == 1);
      });
    })
  });
});