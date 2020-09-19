import 'mocha';
import { Version } from './version';
const assert = require('assert');

describe('Version', () => {
  context('has no details', () => {
    let getVersion = new Promise((resolve, reject) => {
      resolve({});
    });

    it('should throw an error', () => {
      return getVersion.then((version: any) => {
        assert.throws(() => {
          new Version(version);
        }, Error);
      });
    });
  });

  context('has no name', () => {
    let getVersion = new Promise((resolve, reject) => {
      resolve({
        newName: 'test'
      });
    });

    it('should throw an error', () => {
      return getVersion.then((version: any) => {
        assert.throws(() => {
          new Version(version);
        }, Error);
      });
    });
  });
});