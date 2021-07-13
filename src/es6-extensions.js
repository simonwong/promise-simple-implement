const Promise = require('./core')

module.exports = Promise

function valuePromise (value) {
  const p = new Promise(Promise._noop)
  p._state = 1
  p._value = value
  return p
}

const TRUE = valuePromise(true);
const FALSE = valuePromise(false);
const NULL = valuePromise(null);
const UNDEFINED = valuePromise(undefined);
const ZERO = valuePromise(0);
const EMPTYSTRING = valuePromise('')

/**
 * resolve
 */
Promise.resolve = function (value) {
  if (value instanceof Promise) return value

  if (value === null) return NULL
  if (value === undefined) return UNDEFINED
  if (value === true) return TRUE
  if (value === false) return FALSE
  if (value === 0) return ZERO
  if (value === '') return EMPTYSTRING

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      const then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (e) {
      return new Promise(function (res, rej) {
        rej(e)
      })
    }
  }
  return valuePromise(value)
}

/**
 * reject
 */
Promise.reject = function (reason) {
  return new Promise((res, rej) => {
    rej(reason)
  })
}

/**
 * Promise catch
 */
Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected)
}

const iterableToArray = function (iterable) {
  if (typeof Array.from === 'function') {
    // ES2015+, iterables exist
    iterableToArray = Array.from;
    return Array.from(iterable);
  }

  // ES5, only arrays and array-likes exist
  iterableToArray = function (x) { return Array.prototype.slice.call(x); };
  return Array.prototype.slice.call(iterable);
}

/**
 * Promise all
 */
Promise.all = function (arr) {
  const args = iterableToArray(arr)

  return new Promise(function (resolve, reject) {
    if (args.length === 0) {
      return resolve([])
    }

    let remaining = args.length

    function res (i, val) {
      if (val && (typeof val === 'object' || typeof val === 'function')) {
        if (val instanceof Promise && val.then === Promise.then) {
          while (val._state === 3) {
            val = val._value
          }
          if (val._state === 1) {
            return res(i, val._value)
          }
          if (val._state === 2) {
            reject(val._value)
          }
          val.then(function (v) {
            res(i, v)
          }, reject)
          return

        // Promise Like
        } else {
          const then = Promise.then
          if (typeof then === 'function') {
            const p = new Promise(then.bind(val._value))
            p.then(function (v) {
              res(i, v)
            }, reject)
            return
          }
        }
      }
      args[i] = val
      if (--remaining === 0) {
        resolve(args)
      }
    }
    for (let i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}
