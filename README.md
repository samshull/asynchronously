# asynchronously

asynchronously iterate over items and resolve promises instead of callbacks

This is the async library for promises, without a lot of extra
dependencies like in bluebird.

### Methods

  - `attempt(fn, ...args)` - Call a function with the given arguments and reject
    caught errors
  - `auto(tasks)` - Run tasks by specifying dependent additional dependent
    tasks, resolves to an object containing the mapping of task property
    names to task result values
  - `delayed(fn, ms)` - Execute a function after a given number of milliseconds
    and resolve
  - `each(items, [limit,] iterator(item, index, array))` - Execute an iterator for a given set of items with a limit
    on the number of simultaneous operations
  - `every(items, [limit,] iterator(item, index, array))` - Resolve only if the iterator
    resolves for each item
  - `map(items, [limit,] iterator(item, index, array))` - Collect the results of all items
    passed to the iterator
  - `reduce(items, iterator(previous, item, index, array), accumulator = [])` - Sequentially call an
    iterator for each item and include the previous result starting with
    the value of the accumulator
  - `some(items, [limit,] iterator(item, index, array))` - Resolve the first item that
    resolves for the iterator, rejects if all reject
  - `wrap(fn, ...args)` - Call a function using node callback style and
    resolve or reject to a promise
