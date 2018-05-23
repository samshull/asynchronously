'use strict';

const chai = require('chai');
const { stub } = require('sinon');

const { expect } = chai;

chai.use(require('sinon-chai'));

const { each, map, reduce, auto, wrap } = require('../');

const delay = (ms = 10) => new Promise(a => setTimeout(a, ms));

describe('promise helpers', function () {
  describe('each', function () {
    it('should call the iterator for each item in the array', () => {
      const iterator = stub().resolves('yes');
      return each([1, 2, 3], 2, iterator)
        .then(() => {
          expect(iterator).calledThrice;
          expect(iterator).calledWith(1);
          expect(iterator).calledWith(2);
          expect(iterator).calledWith(3);
        });
    });

    it('should default the limit to 5 or the length of items if not specified', () => {
      const iterator = stub().resolves('yes');
      return each([1, 2, 3], iterator)
        .then(() => {
          expect(iterator).calledThrice;
          expect(iterator).calledWith(1);
          expect(iterator).calledWith(2);
          expect(iterator).calledWith(3);
        });
    });

    it('should wait until the one of the limited iterations has completed before continuing', () => {
      const resolved = {};
      const base = [1, 2, 3, 4, 5];
      return each(base, 2, function (arg, index, array) {
        expect(array).equals(base);
        expect(index).to.be.lessThan(array.length);
        if (arg === 3) {
          expect(resolved[1]).to.equal(true);
          expect(resolved[2]).to.be.undefined;
        }
        if (arg === 5) {
          expect(resolved[1] && resolved[2]).to.equal(true);
          expect(resolved[3]).to.equal(true);
          expect(resolved[4]).to.be.undefined;
        }
        return delay(10 * arg).then(() => { resolved[arg] = true; });
      })
        .then(() => {
          expect(resolved[1]).to.equal(true);
          expect(resolved[2]).to.equal(true);
          expect(resolved[3]).to.equal(true);
          expect(resolved[4]).to.equal(true);
          expect(resolved[5]).to.equal(true);
        });
    });
  });

  describe('map', function () {
    it('should collect the results in a new array', () => {
      return map([1, 2, 3, 4, 5], 3, a => a * 2)
        .then(result => {
          expect(Array.isArray(result)).to.equal(true);
          expect(result.length).to.equal(5);
          expect(result).to.deep.equal([2, 4, 6, 8, 10]);
        });
    });

    it('should default the limit to 5 or the length of items if not specified', () => {
      const iterator = stub().resolves('yes');
      return map([1, 2, 3], iterator)
        .then(() => {
          expect(iterator).calledThrice;
          expect(iterator).calledWith(1);
          expect(iterator).calledWith(2);
          expect(iterator).calledWith(3);
        });
    });

    it('should call the iterator for each item in the array', () => {
      const iterator = stub().resolves('yes');
      return map([1, 2, 3], 2, iterator)
        .then(() => {
          expect(iterator).calledThrice;
          expect(iterator).calledWith(1);
          expect(iterator).calledWith(2);
          expect(iterator).calledWith(3);
        });
    });

    it('should wait until the one of the limited iterations has completed before continuing', () => {
      const resolved = {};
      const base = [1, 2, 3, 4, 5];
      return map(base, 2, function (arg, index, array) {
        expect(array).equals(base);
        expect(index).to.be.lessThan(array.length);
        if (arg === 3) {
          expect(resolved[1]).to.equal(true);
          expect(resolved[2]).to.be.undefined;
        }
        if (arg === 5) {
          expect(resolved[1] && resolved[2]).to.equal(true);
          expect(resolved[3]).to.equal(true);
          expect(resolved[4]).to.be.undefined;
        }
        return delay(10 * arg).then(() => { resolved[arg] = true; }).then(() => arg * 2);
      })
        .then(result => {
          expect(resolved[1]).to.equal(true);
          expect(resolved[2]).to.equal(true);
          expect(resolved[3]).to.equal(true);
          expect(resolved[4]).to.equal(true);
          expect(resolved[5]).to.equal(true);
          expect(Array.isArray(result)).to.equal(true);
          expect(result.length).to.equal(5);
          expect(result).to.deep.equal([2, 4, 6, 8, 10]);
        });
    });
  });

  describe('reduce', function () {
    it('should pass the accumulator value in each iteration', () => {
      const resolved = {};
      const base = [1, 2, 3, 4, 5];
      const accumulator = [];
      return reduce(base, function (memo, arg, index, array) {
        expect(memo).to.equal(accumulator);
        expect(array).to.equal(base);
        expect(index).to.be.lessThan(array.length);
        return delay(10 * arg)
          .then(() => {
            resolved[arg] = true;
          }).then(() => {
            memo.push(arg * 2);
            return memo;
          });
      }, accumulator)
        .then(result => {
          expect(resolved[1]).to.equal(true);
          expect(resolved[2]).to.equal(true);
          expect(resolved[3]).to.equal(true);
          expect(resolved[4]).to.equal(true);
          expect(resolved[5]).to.equal(true);
          expect(Array.isArray(result)).to.equal(true);
          expect(result.length).to.equal(5);
          expect(result).to.deep.equal([2, 4, 6, 8, 10]);
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
          expect(fourth).to.be.undefined;
          expect(first).to.equal('first-done');
          return 'second-done';
        }],
        third: ['fourth', ({ fourth }) => {
          expect(fourth).to.equal('fourth-done');
          return 'third-done';
        }],
        fourth: ['second', ({ second }) => {
          expect(second).to.equal('second-done');
          return Promise.resolve('fourth-done');
        }]
      }).then(result => {
        expect(Object.keys(result)).to.deep.equal(['first', 'second', 'fourth', 'third']);
        expect(Object.values(result)).to.deep.equal(['first-done', 'second-done', 'fourth-done', 'third-done']);
      });
    });
  });

  describe('wrap', function () {
    it('should wrap a callback function into a promise', () => {
      return wrap(cb => setTimeout(() => cb(null, 123), 10))
        .then(result => {
          expect(result).to.equal(123);
        });
    });

    it('should wrap a callback function into a promise and reject an error', () => {
      return wrap(cb => setTimeout(() => cb(new Error('expected')), 10))
        .then(() => {
          throw new Error('this should not have been called');
        }, err => {
          expect(err.message).to.equal('expected');
        });
    });

    it('should call a finishing callback if passed', () => {
      return wrap(cb => setTimeout(() => cb(null, 123), 10), (e, r) => {
        expect(e).not.to.exist;
        expect(r).to.equal(123);
      });
    });

    it('should call a finishing callback with an error if passed', () => {
      return wrap(cb => setTimeout(() => cb(new Error('expected')), 10), e => {
        expect(e).to.exist;
        expect(e.message).to.equal('expected');
      });
    });

    it('should reject on error', () => {
      return wrap(cb => setTimeout(() => cb(new Error('expected')), 10))
        .then(() => {
          throw new Error('this should not have been called');
        }, err => {
          expect(err.message).to.equal('expected');
        });
    });
  });
});

