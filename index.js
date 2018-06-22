'use strict';

function delayed(fn, ms=10) {
  const timer = accept => {
    const t = setTimeout(accept, ms);
    if (t.unref) return t.unref();
    return t;
  };
  return new Promise(timer).then(fn);
}

function attempt(fn, ...args) {
  return new Promise(accept => accept(fn(...args)));
}

function each(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const length = items.length > limit ? limit : items.length;
  let position = length - 1;
  const end = items.length - 1;
  const chainer = i => {
    return attempt(iterator, items[i], i, items)
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
    return attempt(iterator, items[i], i, items)
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
    return attempt(iterator, r, items[i], i, items)
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

function wrap(fn, ...args) {
  return new Promise((accept, reject) => {
    fn(...args, (e, ...results) => {
      if (e) return void reject(e);
      accept(...results);
    });
  });
}

function some(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const errors = [];
  const length = items.length > limit ? limit : items.length;
  let position = length - 1;
  const end = items.length - 1;

  return new Promise((accept, reject) => {
    let accepted = false;
    const complete = v => {
      if (accepted) return;
      accepted = true;
      accept(v);
    };
    const chainer = i => attempt(iterator, items[i], i, items).then(complete, (e) => {
      errors[i] = e;
      return position < end ? chainer(++position) : Promise.resolve();
    });
    Promise.all(Array.from({ length }, (_, n) => chainer(n))).then(() => {
      if (accepted) return;
      reject(errors);
    });
  });
}

function every(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const length = items.length > limit ? limit : items.length;
  let position = length - 1;
  const end = items.length - 1;

  return new Promise((accept, reject) => {
    let failed = false;
    const fail = e => {
      if (failed) return;
      failed = true;
      reject(e);
    };
    const next = () => {
      return position < end && chainer(++position);
    };
    const chainer = i => {
      return attempt(iterator, items[i], i, items).then(next, fail);
    };
    Promise.all(Array.from({ length }, (_, n) => chainer(n))).then(() => {
      if (failed) return;
      accept();
    }, reject);
  });
}

module.exports = {
  attempt,
  auto,
  delayed,
  each,
  every,
  map,
  reduce,
  some,
  wrap
};

