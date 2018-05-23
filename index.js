'use strict';

function delayed(fn, delay=10) {
  return new Promise(accept => setTimeout(accept, delay).unref()).then(fn);
}

function each(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const length = items.length > limit ? limit : items.length;
  let position = length - 1;
  const end = items.length - 1;
  const chainer = i => {
    return Promise.resolve(iterator(items[i], i, items))
      .then(() => {
        return position < end && chainer(++position);
      });
  };
  return Promise.all(Array.from({ length }, (_, n) => chainer(n)));
}

function map(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const length = items.length > limit ? limit : items.length;
  const results = [];
  let position = length - 1;
  const end = items.length - 1;
  const chainer = i => {
    return Promise.resolve(iterator(items[i], i, items))
      .then(result => {
        results[i] = result;
        if (position < end) {
          return chainer(++position);
        }
      });
  };
  const promises = Array.from({ length }, (_, n) => chainer(n));
  return Promise.all(promises).then(() => results);
}

function reduce(items, iterator, accumulator = []) {
  let position = 0;
  const end = items.length - 1;
  const chainer = (r, i) => {
    return Promise.resolve(iterator(r, items[i], i, items))
      .then(result => {
        return position < end ? chainer(result, ++position) : result;
      });
  };
  return chainer(accumulator, position);
}

function auto(tasks) {
  const keys = Object.keys(tasks);
  const promises = {};
  const values = {};
  const creator = key => {
    if (promises[key]) return promises[key];

    const task = tasks[key];

    if (Array.isArray(task)) {
      promises[key] = task.reduce((promise, entry) => {
        if (typeof entry === 'function')
          return promise.then(() => entry(values));
        return promise.then(() => creator(entry));
      }, Promise.resolve());
    } else {
      promises[key] = Promise.resolve(values).then(task);
    }

    return promises[key]
      .then(value => {
        values[key] = value;
        return value;
      });
  };
  return Promise.all(keys.map(creator)).then(() => values);
}

function wrap(fn, done) {
  const promise = new Promise((accept, reject) => {
    fn((e, ...args) => {
      if (e) return void reject(e);
      accept(...args);
    });
  });
  if (done) return promise.then((...args) => done(null, ...args), done);
  return promise;
}

module.exports = {
  auto,
  delayed,
  each,
  map,
  reduce,
  wrap
};

