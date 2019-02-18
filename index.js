'use strict';

async function delayed(fn, ms = 10) {
  await wait(ms);
  return await fn();
}

async function wait(ms = 10) {
  const timer = accept => {
    const time = setTimeout(accept, ms);
    if (typeof time.unref === 'function') time.unref();
  };
  await new Promise(timer);
}

async function attempt(fn, ...args) {
  return await fn(...args);
}

async function each(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const parts = Array.from(items);
  const length = parts.length > limit ? limit : parts.length;
  let i = 0;
  const chainer = async (position, item) => {
    await attempt(iterator, item, position, items);
    return parts.length && chainer(i++, parts.shift());
  };
  const simultaneous = Array.from({ length }, (_, n) => chainer(i++, parts.shift()));
  await Promise.all(simultaneous);
  return items;
}

async function map(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const parts = Array.from(items);
  const length = parts.length > limit ? limit : parts.length;
  const results = [];
  let i = 0;
  const chainer = async (position, item) => {
    results[position] = await attempt(iterator, item, position, items);
    return parts.length && chainer(i++, parts.shift());
  };
  const simultaneous = Array.from({ length }, () => chainer(i++, parts.shift()));
  await Promise.all(simultaneous);
  return results;
}

async function reduce(items, iterator, accumulator) {
  const parts = Array.from(items);
  let i = 0;
  const chainer = async (value, item, position) => {
    const previous = await attempt(iterator, value, item, position, items);
    return parts.length ? chainer(previous, parts.shift(), i++) : previous;
  };
  return await chainer(accumulator, parts.shift(), i++);
}

async function auto(tasks) {
  const keys = Object.keys(tasks);
  const promises = {};
  const values = {};
  const creator = async key => {
    if (promises[key]) return promises[key];

    const task = tasks[key];

    if (Array.isArray(task)) {
      promises[key] = task.reduce((promise, entry) => {
        if (['string', 'symbol'].includes(typeof entry))
          return promise.then(() => creator(entry));
        return promise.then(() => entry(values));
      }, Promise.resolve());
    } else {
      promises[key] = attempt(task, values);
    }

    return promises[key]
      .then(value => {
        values[key] = value;
        return value;
      });
  };
  await Promise.all(keys.map(creator));
  return values;
}

async function wrap(fn, ...args) {
  return await new Promise((accept, reject) => {
    fn(...args, (e, ...results) => {
      if (e) return void reject(e);
      if (results.length === 1) return accept(results[0]);
      accept(results);
    });
  });
}

async function some(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const parts = Array.from(items);
  const length = parts.length > limit ? limit : parts.length;
  let i = 0;
  let passed = false;
  const chainer = async (position, item) => {
    if (passed) return true;
    passed = await attempt(iterator, item, position, items);
    if (passed) return true;
    if (parts.length) return chainer(i++, parts.shift());
  };
  const simultaneous = Array.from({ length }, () => chainer(i++, parts.shift()));
  await Promise.race(simultaneous);
  return !!passed;
}

async function every(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const parts = Array.from(items);
  const length = parts.length > limit ? limit : parts.length;
  let i = 0;
  let passing = true;
  const chainer = async (position, item) => {
    if (!passing) return;
    const passed = await attempt(iterator, item, position, items);
    passing = passing && !!passed;
    if (passing && parts.length) return chainer(i++, parts.shift());
  };
  const simultaneous = Array.from({ length }, () => chainer(i++, parts.shift()));
  await Promise.all(simultaneous);
  return passing;
}

function on(target, event, callback) {
  const on = target.addEventListener || target.addListener;
  const off = target.removeEventListener || target.removeListener;
  on.call(target, event, function handler(...args) {
    off.call(target, event, handler);
    if (args.length === 1) return void callback(args[0]);
    callback(args);
  });
}

async function once(events, target, timeout = -1) {
  let result;
  const simultaneous = [].concat(events).map(event => new Promise(accept => on(target, event, accept)));
  if (timeout > -1) {
    simultaneous.push(delayed(() => { if (!result) throw new Error('timeout'); }, timeout));
  }
  result = await Promise.race(simultaneous);
  if (result instanceof Error) throw result;
  return result;
}

module.exports = {
  attempt,
  auto,
  delayed,
  each,
  every,
  map,
  once,
  reduce,
  some,
  wait,
  wrap
};

