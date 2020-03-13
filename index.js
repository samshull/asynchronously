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
  const length = Math.min(limit, parts.length);
  let i = 0;
  const chainer = async (position, item) => {
    await attempt(iterator, item, position, items);
    return parts.length && chainer(i++, parts.shift());
  };
  const simultaneous = Array.from({ length }, () => chainer(i++, parts.shift()));
  await Promise.all(simultaneous);
  return items;
}

async function collect(iterator) {
  const result = [];
  for await (const item of iterator) {
    result.push(item);
  }
  return result;
}

async function map(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const parts = Array.from(items);
  const length = Math.min(limit, parts.length);
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

async function reduceRight(items, iterator, accumulator) {
  const parts = Array.from(items);
  let i = parts.length;
  const chainer = async (value, item, position) => {
    const previous = await attempt(iterator, value, item, position, items);
    return parts.length ? chainer(previous, parts.pop(), --i) : previous;
  };
  return await chainer(accumulator, parts.pop(), --i);
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

async function find(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const parts = Array.from(items);
  const length = Math.min(limit, parts.length);
  let i = 0;
  let found;
  const chainer = async (position, item) => {
    if (found) return;
    if (await attempt(iterator, item, position, items)) {
      if (found) return;
      found = item;
      return item;
    }
    if (parts.length) return chainer(i++, parts.shift());
  };
  const simultaneous = Array.from({ length }, () => chainer(i++, parts.shift()));
  await Promise.all(simultaneous);
  return found;
}

async function findIndex(items, limit, iterator) {
  return Array.from(items).indexOf(await find(items, limit, iterator));
}

async function filter(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const parts = Array.from(items);
  const length = Math.min(limit, parts.length);
  let i = 0;
  const found = [];
  const chainer = async (position, item) => {
    if (await attempt(iterator, item, position, items)) {
      found.push(item);
    }
    if (parts.length) return chainer(i++, parts.shift());
  };
  const simultaneous = Array.from({ length }, () => chainer(i++, parts.shift()));
  await Promise.all(simultaneous);
  return found;
}

function comparator(a, b) {
  return a.criteria - b.criteria;
}

async function sortBy(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const meta = await map(items, limit, async (item, index) => {
    return { item, criteria: await attempt(iterator, item, index, items) };
  });
  return meta.sort(comparator).map(entry => entry.item);
}

async function some(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const parts = Array.from(items);
  const length = Math.min(limit, parts.length);
  let i = 0;
  let passed = false;
  const chainer = async (position, item) => {
    if (passed) return true;
    if (await attempt(iterator, item, position, items)) {
      passed = true;
      return true;
    }
    if (parts.length) return chainer(i++, parts.shift());
  };
  const simultaneous = Array.from({ length }, () => chainer(i++, parts.shift()));
  await Promise.all(simultaneous);
  return !!passed;
}

async function anySettled(promises) {
  const completed = arg => Promise.resolve(arg);
  const list = [];

  for (const promise of promises) {
    list.push(promise.then(completed, completed));
  }

  return await Promise.race(list);
}

async function allSettled(promises) {
  const completed = arg => Promise.resolve(arg);
  const list = [];

  for (const promise of promises) {
    list.push(promise.then(completed, completed));
  }

  return await Promise.all(list);
}

async function every(items, limit, iterator) {
  if (typeof limit === 'function') {
    [limit, iterator] = [Number.POSITIVE_INFINITY, limit];
  }
  const parts = Array.from(items);
  const length = Math.min(limit, parts.length);
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

async function once(events, target, timeout = -1) {
  events = [].concat(events);
  return await new Promise(function (accept, reject) {
    let timer, complete;
    const on = target.addEventListener || target.addListener;
    const off = target.removeEventListener || target.removeListener;
    events.forEach(event => on.call(target, event, finish));
    if (timeout > 0) {
      timer = setTimeout(() => finish(new Error('timeout')), timeout);
      if (typeof timer.unref === 'function') timer.unref();
    }

    function finish(...args) {
      if (complete) return;
      complete = true;
      events.map(event => off.call(target, event, finish));
      if (timer) clearTimeout(timer);
      timer = null;
      if (args.length === 1) {
        if (args[0] instanceof Error) {
          return void reject(args[0]);
        }
        return void accept(args[0]);
      }
      accept(args);
    }
  });
}

module.exports = {
  allSettled,
  anySettled,
  attempt,
  auto,
  collect,
  delayed,
  each,
  every,
  find,
  filter,
  findIndex,
  map,
  once,
  reduce,
  reduceRight,
  some,
  sortBy,
  wait,
  wrap
};

