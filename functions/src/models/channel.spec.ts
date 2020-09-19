import 'mocha';
import { Channel } from './channel';
const assert = require('assert');

describe('Channel', () => {
  context('has no details', () => {
    let getChannel = new Promise((resolve, reject) => {
      resolve({});
    });

    it('should throw an error', () => {
      return getChannel.then((channel: any) => {
        assert.throws(() => {
          new Channel(channel);
        }, Error);
      });
    });
  });

  context('has no id', () => {
    let getChannel = new Promise((resolve, reject) => {
      resolve({
        name: 'test'
      });
    });

    it('should throw an error', () => {
      return getChannel.then((channel: any) => {
        assert.throws(() => {
          new Channel(channel);
        }, Error);
      });
    });
  });

  context('has no name', () => {
    let getChannel = new Promise((resolve, reject) => {
      resolve({
        id: 'test'
      });
    });

    it('should throw an error', () => {
      return getChannel.then((channel: any) => {
        assert.throws(() => {
          new Channel(channel);
        }, Error);
      });
    });
  });
});