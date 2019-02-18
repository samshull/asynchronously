# asynchronously

asynchronously iterate over items and resolve promises instead of callbacks

This is the async library for promises, without a lot of extra
dependencies like in bluebird.

### Methods

  - `attempt(fn:Function|AsyncFunction, ...args:Array<Any>):Promise<Any>` - Call a function with the given arguments and reject
    caught errors
  - `auto(tasks:Object<String, AsyncFunction|Array<String|AsyncFunction>>):Promise<Object>` - Run tasks by specifying dependent additional dependent
    tasks, resolves to an object containing the mapping of task property
    names to task result values. See async.auto for how to construct `tasks`
  - `delayed(fn:Function|AsyncFunction, ms:Number = 10):Promise<Any>` - Execute a function after a given number of milliseconds and resolve the promise to the function return value
  - `each(items:Iterable, [limit:Number = POSITIVE_INFINITY,] iterator:Function(item:Any, index:Number, items:Iterable)):Promise` - Execute an iterator for a given set of items with a limit
    on the number of simultaneous operations
  - `every(items:Iterable, [limit:Number = POSITIVE_INFINITY,] iterator:Function(item:Any, index:Number, items:Iterable)):Promise<Boolean>` - Resolves true if all iterated items resolve true, otherwise resolves false
  - `map(items:Iterable, [limit:Number = POSITIVE_INFINITY,] iterator:Function(item:Any, index:Number, items:Iterable))` - Collect the results of all items
    passed to the iterator
  - `reduce(items:Iterable, iterator(previous:Any, item:Any, index:Number, items:Iterable), accumulator:Any)` - Sequentially call an
    iterator for each item and include the previous result starting with
    the value of the accumulator
  - `some(items:Iterable, [limit:Number = POSITIVE_INFINITY,] iterator:Function(item:Any, index:Number, items:Iterable)):Promise<Boolean>` - Resolves true if any iterated items resolve true, otherwise resolves false
  - `wrap(fn:Function, ...args:Array<Any>):Promise<Any>` - Call a function using node callback style and
    resolve or reject to a promise
  - `once(event:String|Array<String>, target:EventEmitter, timeout:Number = -1):Promise<Any>` - Wait for one or more events
    on an EventEmitter and optionally timeout the wait
  - `wait(ms:Number = 10)` - Use a promise for a setTimeout call


### Changelog

- v2.0.0
* Use async / await where possible
* Change behavior in every/some where errors would be swallowed
* Add `once` method
