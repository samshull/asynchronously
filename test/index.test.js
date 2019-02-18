'use strict';

const { EventEmitter } = require('events');

const assume = require('assume');
const { stub } = require('sinon');

assume.use(require('assume-sinon'));

const { delayed, each, map, reduce, auto, wrap, attempt, some, every, once } = require('../');

const delay = (ms = 10) => new Promise(a => setTimeout(a, ms));

describe('promise helpers', function () {
  describe('attempt', function () {
    it('should catch and reject when the function throws', () => {
      const error = new Error('rejected on purpose');
      return attempt(() => { throw error; }).catch(e => assume(e).equals(error));
    });

    it('should resolve as expected for the arguments given', () => {
      return attempt((a, b, c) => ({ a, b, c }), 1, 2, 3).then(r => assume(r).eqls({ a: 1, b: 2, c: 3 }));
    });
  });

  describe('some', function () {
    it('should not catch errors in the iterator', async () => {
      const error = new Error('intentional error');
      try {
        await some([1, 2, 3, 4, 5], i => { throw error; });
        throw new Error('this should not be called');
      } catch (err) {
        assume(err).equals(error);
      }
    });

    it('should only process the limit of items simultaneously', async () => {
      const resolved = [];
      return await some([1, 2, 3, 4, 5], 3, i => {
        if (i === 3) assume(resolved.length).eq(0);
        if (i === 4) assume(resolved.length).gt(0);
        if (i === 5) assume(resolved.length).gt(1);
        return delay(i*100).then(() => { resolved.push(i); });
      });
    });

    it('should resolve if any items resolve', async () => {
      return assume(await some([1, 2, 3, 4, 5], i => i)).equals(true);
    });

    it('should race to completion', async () => {
      return assume(await some([1, 2, 3, 4, 5], i => i === 3 ? i : delay(i*100))).equals(true);
    });
  });

  describe('every', function () {
    it('should throw any errors', async () => {
      const error = new Error('reject on purpose');
      try {
        await every([1, 2, 3], i => { throw error; });
        throw new Error('this should not be called');
      } catch (err) {
        assume(err).equals(error);
      }
    });

    it('should only process the limit of items simultaneously', () => {
      const resolved = [];
      return every([1, 2, 3, 4, 5], 3, i => {
        if (i === 3) assume(resolved.length).eq(0);
        if (i === 4) assume(resolved.length).gt(0);
        if (i === 5) assume(resolved.length).gt(1);
        return delay(i*100).then(() => { resolved.push(i); });
      });
    });

    it('should resolve if all items resolve', () => {
      return every([1, 2, 3, 4, 5], i => i);
    });
  });

  describe('each', function () {
    it('should call the iterator for each item in the array', async () => {
      const iterator = stub().resolves('yes');
      await each([1, 2, 3], 2, iterator);
      assume(iterator).called(3);
      assume(iterator).calledWith(1);
      assume(iterator).calledWith(2);
      assume(iterator).calledWith(3);
    });

    it('should default the limit to 5 or the length of items if not specified', async () => {
      const iterator = stub().resolves('yes');
      await each([1, 2, 3], iterator);
      assume(iterator).called(3);
      assume(iterator).calledWith(1);
      assume(iterator).calledWith(2);
      assume(iterator).calledWith(3);
    });

    it('should wait until the one of the limited iterations has completed before continuing', async () => {
      const resolved = {};
      const base = [1, 2, 3, 4, 5];
      await each(base, 2, function (arg, index, array) {
        assume(array).equals(base);
        assume(index).to.be.lessThan(array.length);
        if (arg === 3) {
          assume(resolved[1]).to.equal(true);
          assume(resolved[2]).to.be.undefined;
        }
        if (arg === 5) {
          assume(resolved[1] && resolved[2]).to.equal(true);
          assume(resolved[3]).to.equal(true);
          assume(resolved[4]).to.be.undefined;
        }
        return delay(10 * arg).then(() => { resolved[arg] = true; });
      });
      assume(resolved[1]).to.equal(true);
      assume(resolved[2]).to.equal(true);
      assume(resolved[3]).to.equal(true);
      assume(resolved[4]).to.equal(true);
      assume(resolved[5]).to.equal(true);
    });
  });

  describe('map', function () {
    it('should collect the results in a new array', async () => {
      const result = await map([1, 2, 3, 4, 5], 3, a => a * 2);
      assume(Array.isArray(result)).to.equal(true);
      assume(result.length).to.equal(5);
      assume(result).to.deep.equal([2, 4, 6, 8, 10]);
    });

    it('should default the limit to 5 or the length of items if not specified', async () => {
      const iterator = stub().resolves('yes');
      await map([1, 2, 3], iterator);
      assume(iterator).calledThrice;
      assume(iterator).calledWith(1);
      assume(iterator).calledWith(2);
      assume(iterator).calledWith(3);
    });

    it('should call the iterator for each item in the array', async () => {
      const iterator = stub().resolves('yes');
      await map([1, 2, 3], 2, iterator);
      assume(iterator).calledThrice;
      assume(iterator).calledWith(1);
      assume(iterator).calledWith(2);
      assume(iterator).calledWith(3);
    });

    it('should wait until the one of the limited iterations has completed before continuing', async () => {
      const resolved = {};
      const base = [1, 2, 3, 4, 5];
      const result = await map(base, 2, function (arg, index, array) {
        assume(array).equals(base);
        assume(index).to.be.lessThan(array.length);
        if (arg === 3) {
          assume(resolved[1]).to.equal(true);
          assume(resolved[2]).to.be.undefined;
        }
        if (arg === 5) {
          assume(resolved[1] && resolved[2]).to.equal(true);
          assume(resolved[3]).to.equal(true);
          assume(resolved[4]).to.be.undefined;
        }
        return delay(10 * arg).then(() => { resolved[arg] = true; }).then(() => arg * 2);
      });
      assume(resolved[1]).to.equal(true);
      assume(resolved[2]).to.equal(true);
      assume(resolved[3]).to.equal(true);
      assume(resolved[4]).to.equal(true);
      assume(resolved[5]).to.equal(true);
      assume(Array.isArray(result)).to.equal(true);
      assume(result.length).to.equal(5);
      assume(result).to.deep.equal([2, 4, 6, 8, 10]);
    });
  });

  describe('reduce', function () {
    it('should pass the accumulator value in each iteration', async () => {
      const resolved = {};
      const base = [1, 2, 3, 4, 5];
      const accumulator = [];
      const result = await reduce(base, function (memo, arg, index, array) {
        assume(memo).to.equal(accumulator);
        assume(array).to.equal(base);
        assume(index).to.be.lessThan(array.length);
        return delay(10 * arg)
          .then(() => {
            resolved[arg] = true;
          }).then(() => {
            memo.push(arg * 2);
            return memo;
          });
      }, accumulator);
      assume(resolved[1]).to.equal(true);
      assume(resolved[2]).to.equal(true);
      assume(resolved[3]).to.equal(true);
      assume(resolved[4]).to.equal(true);
      assume(resolved[5]).to.equal(true);
      assume(Array.isArray(result)).to.equal(true);
      assume(result.length).to.equal(5);
      assume(result).to.deep.equal([2, 4, 6, 8, 10]);
    });
  });

  describe('auto', function () {
    const insertion = Symbol.for('test');
    it('should pass the result of each task to the next tasks', async () => {
      const result = await auto({
        first() {
          return Promise.resolve('first-done');
        },
        second: ['first', async ({ first, fourth }) => {
          // fourth depends on second and will not evaluate until second is resolved
          assume(fourth).to.be.undefined;
          assume(first).to.equal('first-done');
          await delayed(() => {}, 100);
          return 'second-done';
        }],
        third: ['fourth', ({ fourth }) => {
          assume(fourth).to.equal('fourth-done');
          return 'third-done';
        }],
        [insertion]() {
          return 'called';
        },
        fourth: ['second', insertion, async ({ second, [insertion]: insert }) => {
          assume(second).to.equal('second-done');
          assume(insert).equals('called');
          return 'fourth-done';
        }]
      });

      assume(result[insertion]).equals('called');
      assume(Object.keys(result)).to.deep.equal(['first', 'second', 'fourth', 'third']);
      assume(Object.values(result)).to.deep.equal(['first-done', 'second-done', 'fourth-done', 'third-done']);
    });
  });

  describe('wrap', function () {
    it('should wrap a callback function into a promise', async () => {
      const result = await wrap(cb => setTimeout(() => cb(null, 123), 10));
      assume(result).to.equal(123);
    });

    it('should wrap a callback function into a promise and reject an error', async () => {
      try {
        await wrap(cb => setTimeout(() => cb(new Error('expected')), 10))
        throw new Error('this should not have been called');
      } catch (err) {
        assume(err.message).equals('expected');
      }
    });

    it('should reject on error', async () => {
      try {
        await wrap(cb => setTimeout(() => cb(new Error('expected')), 10));
        throw new Error('this should not have been called');
      } catch (err) {
        assume(err.message).to.equal('expected');
      }
    });
  });

  describe('once', function () {
    it('should resolve the promise with the yielded argument', async () => {
      const emitter = new EventEmitter();
      setTimeout(() => emitter.emit('test', 123));
      const result = await once('test', emitter);
      assume(result).equals(123);
    });

    it('should resolve the promise with the yielded arguments', async () => {
      const emitter = new EventEmitter();
      setTimeout(() => emitter.emit('test', 123, 'abc'));
      const result = await once('test', emitter);
      assume(Array.isArray(result)).equals(true);
      assume(result[0]).equals(123);
      assume(result[1]).equals('abc');
    });

    it('should throw an error on timeout', async () => {
      const emitter = new EventEmitter();
      try {
        await once('test', emitter, 10);
        assume(false).equals(true);
      } catch (e) {
        assume(e.message).equals('timeout');
      }
    });
  });
});

