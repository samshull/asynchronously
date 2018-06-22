'use strict';

const assume = require('assume');
const { stub } = require('sinon');

assume.use(require('assume-sinon'));

const { delayed, each, map, reduce, auto, wrap, attempt, some, every } = require('../');

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
    it('should reject if all items reject', () => {
      return some([1, 2, 3, 4, 5], i => { throw new Error(`${i} error`); })
        .catch(errors => {
          assume(errors.length).equals(5);
          assume(errors[0].message).equals('1 error');
          assume(errors[1].message).equals('2 error');
          assume(errors[2].message).equals('3 error');
          assume(errors[3].message).equals('4 error');
          assume(errors[4].message).equals('5 error');
        });
    });

    it('should only process the limit of items simultaneously', () => {
      const resolved = [];
      return some([1, 2, 3, 4, 5], 3, i => {
        if (i === 4) assume(resolved.length).gt(0);
        if (i === 5) assume(resolved.length).gt(1);
        return delay(i*100).then(() => { resolved.push(i); });
      });
    });

    it('should resolve if any items resolve', () => {
      return some([1, 2, 3, 4, 5], i => i).then(v => assume(v).equals(1));
    });

    it('should race to completion', () => {
      return some([1, 2, 3, 4, 5], i => i === 3 ? i : delay(i*100)).then(v => assume(v).equals(3));
    });
  });

  describe('every', function () {
    it('should reject if any item rejects', () => {
      const error = new Error('reject on purpose');
      return every([1, 2, 3], i => { throw error; }).catch(e => assume(error).equals(e));
    });

    it('should only process the limit of items simultaneously', () => {
      const resolved = [];
      return every([1, 2, 3, 4, 5], 3, i => {
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
    it('should call the iterator for each item in the array', () => {
      const iterator = stub().resolves('yes');
      return each([1, 2, 3], 2, iterator)
        .then(() => {
          assume(iterator).called(3);
          assume(iterator).calledWith(1);
          assume(iterator).calledWith(2);
          assume(iterator).calledWith(3);
        });
    });

    it('should default the limit to 5 or the length of items if not specified', () => {
      const iterator = stub().resolves('yes');
      return each([1, 2, 3], iterator)
        .then(() => {
          assume(iterator).called(3);
          assume(iterator).calledWith(1);
          assume(iterator).calledWith(2);
          assume(iterator).calledWith(3);
        });
    });

    it('should wait until the one of the limited iterations has completed before continuing', () => {
      const resolved = {};
      const base = [1, 2, 3, 4, 5];
      return each(base, 2, function (arg, index, array) {
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
      })
        .then(() => {
          assume(resolved[1]).to.equal(true);
          assume(resolved[2]).to.equal(true);
          assume(resolved[3]).to.equal(true);
          assume(resolved[4]).to.equal(true);
          assume(resolved[5]).to.equal(true);
        });
    });
  });

  describe('map', function () {
    it('should collect the results in a new array', () => {
      return map([1, 2, 3, 4, 5], 3, a => a * 2)
        .then(result => {
          assume(Array.isArray(result)).to.equal(true);
          assume(result.length).to.equal(5);
          assume(result).to.deep.equal([2, 4, 6, 8, 10]);
        });
    });

    it('should default the limit to 5 or the length of items if not specified', () => {
      const iterator = stub().resolves('yes');
      return map([1, 2, 3], iterator)
        .then(() => {
          assume(iterator).calledThrice;
          assume(iterator).calledWith(1);
          assume(iterator).calledWith(2);
          assume(iterator).calledWith(3);
        });
    });

    it('should call the iterator for each item in the array', () => {
      const iterator = stub().resolves('yes');
      return map([1, 2, 3], 2, iterator)
        .then(() => {
          assume(iterator).calledThrice;
          assume(iterator).calledWith(1);
          assume(iterator).calledWith(2);
          assume(iterator).calledWith(3);
        });
    });

    it('should wait until the one of the limited iterations has completed before continuing', () => {
      const resolved = {};
      const base = [1, 2, 3, 4, 5];
      return map(base, 2, function (arg, index, array) {
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
      })
        .then(result => {
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
  });

  describe('reduce', function () {
    it('should pass the accumulator value in each iteration', () => {
      const resolved = {};
      const base = [1, 2, 3, 4, 5];
      const accumulator = [];
      return reduce(base, function (memo, arg, index, array) {
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
      }, accumulator)
        .then(result => {
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
  });

  describe('auto', function () {
    it('should pass the result of each task to the next tasks', () => {
      return auto({
        first() {
          return Promise.resolve('first-done');
        },
        second: ['first', ({ first, fourth }) => {
          // fourth depends on second and will not evaluate until second is resolved
          assume(fourth).to.be.undefined;
          assume(first).to.equal('first-done');
          return 'second-done';
        }],
        third: ['fourth', ({ fourth }) => {
          assume(fourth).to.equal('fourth-done');
          return 'third-done';
        }],
        fourth: ['second', ({ second }) => {
          assume(second).to.equal('second-done');
          return Promise.resolve('fourth-done');
        }]
      }).then(result => {
        assume(Object.keys(result)).to.deep.equal(['first', 'second', 'fourth', 'third']);
        assume(Object.values(result)).to.deep.equal(['first-done', 'second-done', 'fourth-done', 'third-done']);
      });
    });
  });

  describe('wrap', function () {
    it('should wrap a callback function into a promise', () => {
      return wrap(cb => setTimeout(() => cb(null, 123), 10))
        .then(result => {
          assume(result).to.equal(123);
        });
    });

    it('should wrap a callback function into a promise and reject an error', () => {
      return wrap(cb => setTimeout(() => cb(new Error('expected')), 10))
        .then(() => {
          throw new Error('this should not have been called');
        }, err => {
          assume(err.message).to.equal('expected');
        });
    });

    it('should reject on error', () => {
      return wrap(cb => setTimeout(() => cb(new Error('expected')), 10))
        .then(() => {
          throw new Error('this should not have been called');
        }, err => {
          assume(err.message).to.equal('expected');
        });
    });
  });
});

