import 'mocha';
import { Character } from './character';
const assert = require('assert');

describe('Character', () => {
  context('has no details', () => {
    let getCharacter = new Promise((resolve, reject) => {
      resolve({});
    });

    it('should throw an error', () => {
      return getCharacter.then((character: any) => {
        assert.throws(() => {
          new Character(character);
        }, Error);
      });
    });
  });

  context('is missing an id', () => {
    let getCharacter = new Promise((resolve, reject) => {
      resolve({
        iconUrl: 'test',
        name: 'test'
      });
    });

    it('should throw an error', () => {
      return getCharacter.then((character: any) => {
        assert.throws(() => {
          new Character(character);
        }, Error);
      });
    });
  });

  context('is missing an icon url', () => {
    let getCharacter = new Promise((resolve, reject) => {
      resolve({
        id: 'test',
        name: 'test'
      });
    });

    it('should throw an error', () => {
      return getCharacter.then((character: any) => {
        assert.throws(() => {
          new Character(character);
        }, Error);
      });
    });
  });

  context('is missing a name', () => {
    let getCharacter = new Promise((resolve, reject) => {
      resolve({
        id: 'test',
        iconUrl: 'test'
      });
    });

    it('should throw an error', () => {
      return getCharacter.then((character: any) => {
        assert.throws(() => {
          new Character(character);
        }, Error);
      });
    });
  });
});