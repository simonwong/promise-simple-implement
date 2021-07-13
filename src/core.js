/* ============== helper ============== */
function noop () {}

// to avoid using try/catch inside critical functions, we
// extract them to here.
var LAST_ERROR = null;
var IS_ERROR = {};
function getThen(obj) {
  try {
    return obj.then;
  } catch (error) {
    LAST_ERROR = error;
    return IS_ERROR;
  }
}

function tryCallOne(fn, a) {
  try {
    return fn(a);
  } catch (error) {
    LAST_ERROR = error;
    console.log(`tryCallOne LAST_ERROR`, LAST_ERROR)
    return IS_ERROR;
  }
}
function tryCallTwo(fn, a, b) {
  try {
    fn(a, b);
  } catch (error) {
    LAST_ERROR = error;
    return IS_ERROR;
  }
}

/* ============== helper done ============== */

/**
 * States:
 * 0 - pending
 * 1 - fulfilled with _value
 * 2 - rejected with _value
 * 3 - adopted the state of another promise, _value
 * 
 * 一旦状态不再是 pending ，它就不可再改变
 */

function Promise(executor) {
  if (typeof this !== 'object') {
    throw new TypeError('Promises must be constructed via new');
  }
  if (typeof executor !== 'function') {
    throw new TypeError('Promise constructor\'s argument is not a function');
  }

  // 2.1 Promise 状态 一个 promise 必须是以下三种状态之一：pending, fulfilled, rejected
  this._state = 0
  this._value = null
  this._deferreds = null // then 的执行队列

  if (executor === noop) {
    // 说明是 then 调的 Promise
    return
  }
  doResolve(executor, this)
}

Promise._noop = noop

// 2.2 then 方法 => https://promisesaplus.com/#the-then-method
// promise 必须提供一个 then 方法来访问其当前值，或最终值，或被拒绝的理由。
// promise.then(onFulfilled, onRejected)
Promise.prototype.then = function (onFulfilled, onRejected) {
  if (this.constructor !== Promise) {
    return safeThen(this, onFulfilled, onRejected)
  }
  const res = new Promise(noop)

  handle(this, new Handler(onFulfilled, onRejected, res))

  // 2.2.7 then 必须返回一个 promise
  return res
}

function safeThen (self, onFulfilled, onRejected) {
  return new self.constructor(function (_resolve, _reject) {
    const res = new Promise(noop)
    res.then(_resolve, _reject)
    handle(self, new Handler(onFulfilled, onRejected, res))
  })
}

function handle(self, deferred) {
  while (self._state === 3) {
    self = self._value
  }
  // 2.2.6 then 可以在同一个 promise 上多次调用。
  // 2.2.6.1 如果/当 promise 处于已处理状态时，所有相应的 onFulfilled 回调必须按照它们对 then 的组织顺序依次调用。
  // 2.2.6.2 如果/当 promise 处于已拒绝状态时，所有相应的 onRejected 回调必须按照它们对 then 的组织顺序依次调用。
  if (self._state === 0) {
    self._deferreds = self._deferreds || []
    self._deferreds.push(deferred)
    return
  }
  handleResolved(self, deferred)
}

function handleResolved(self, deferred) {
  // 2.2.4 在执行上下文堆栈仅包含平台代码之前，不得调用 onFulfilled 或 onRejected
  queueMicrotask(function () {
    const callback = self._state === 1 ? deferred.onFulfilled : deferred.onRejected
    if (callback === null) {
      if (self._state === 1) {
        resolve(deferred.promise, self._value)
      } else {
        reject(deferred.promise, self._value)
      }
      return
    }
    // 2.2.7.1 如果 onFulfilled 或 onRejected 返回值 x，执行 Promise 解决步骤 [[Resolve]](promise2, x)。
    // 2.2.7.2 如果 onFulfilled 或 onRejected 抛出异常 e, promise2 必须被拒绝，并把 e 作为被拒绝的原因。
    var ret = tryCallOne(callback, self._value);
    if (ret === IS_ERROR) {
      reject(deferred.promise, LAST_ERROR);
    } else {
      resolve(deferred.promise, ret);
    }
  })
}

// 2.3 Promise 处理程序 => https://promisesaplus.com/#the-promise-resolution-procedure
// 下面的 x 指的是 newValue，处理程序表示为 `[[Resolve]](promise, x)`
function resolve(self, newValue) {
  // 2.3.1 如果 promise 和 x 引用同一个对象，则以一个 TypeError 类型的值作为拒绝 promise 的原因
  if (newValue === self) {
    return reject(
      self,
      new TypeError('A promise cannot be resolved with itself.')
    )
  }
  
  // 2.3.3 否则，当 x 是对象或函数
  if (
    newValue &&
    (typeof newValue === 'object' || typeof newValue === 'function')
  ) {
    // 2.3.3.1 用 x.then 代替 then。
    const then = getThen(newValue)
    // 2.3.3.2 如果在获取属性 x.then 的过程中导致抛出异常 e，则拒绝 promise 并用 e 作为拒绝原因
    if (then === IS_ERROR) {
      return reject(self, LAST_ERROR)
    }

    // 返回了一个 Promise ，需要等这个 Promise 处理完
    // 2.3.2 如果 x 是一个 promise，接收其状态
    if (then === self.then && newValue instanceof Promise) {
      self._state = 3
      self._value = newValue
      finale(self)
      return
    
    // 2.3.3.3 如果 then 是函数，则用 x 作为 this 调用该函数，并将 resolvePromise 作为函数第一个参数，rejectPromise 作为函数第二个参数
    } else if (typeof then === 'function') {
      doResolve(then.bind(newValue), self)
      return
    }
  }
  
  // 2.3.4 如果 x 不是对象或函数，用 x 去执行 promise
  self._state = 1
  self._value = newValue
  finale(self)
}

function reject(self, newValue) {
  self._state = 2
  self._value = newValue
  finale(self)
}

function finale(self) {
  if (self._deferreds) {
    for (var i = 0; i < self._deferreds.length; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = null
  }
}

// 2.2.1 onFulfilled 和 onRejected 都是可选的参数
function Handler(onFulfilled, onRejected, promise) {
  // 2.2.1.1 如果 onFulfilled 不是函数，它必须被忽略
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  // 2.2.1.2 如果 onRejected 不是函数，它必须被忽略
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.promise = promise
}

/**
 * 确保 resolve reject 只调用一次，并对错误的执行 reject
 */
function doResolve (executor, promise) {
  let done = false
  const res = tryCallTwo(
    executor,
    // 2.2.5 必须将 onFulfilled 和 onRejected 作为函数调用（即没有 this 值）
    function (value) {
      // 2.2.2.3 onFulfilled 该函数被调用次数不超过一次
      if (done) return
      done = true
      resolve(promise, value)
    },
    function (reason) {
      // 2.2.2.3 onRejected 该函数被调用次数不超过一次
      if (done) return
      done = true
      reject(promise, reason)
    },
  )
  if (!done && res === IS_ERROR) {
    done = true
    reject(promise, LAST_ERROR)
  }
}

module.exports = Promise
