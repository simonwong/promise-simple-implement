'use strict'

// 定义了一个空函数
function noop () {}

let LAST_ERROR = null
let IS_ERROR = null

function getThen (obj) {
  try {
    return obj.then
  } catch (err) {
    LAST_ERROR = err
    return IS_ERROR
  }
}

function asyncFn () {
  if (typeof process === 'object' && process !== null &&
      typeof(process.nextTick) === 'function'
  ) {
    return process.nextTick
  } else if (typeof(setImmediate) === 'function') {
    return setImmediate
  }
  return setTimeout
}

function Promise (fn) {
  // 非 new 实例化处理
  if (typeof this !== 'object') {
    throw new TypeError('Promises must be constructed via new')
  }
  if (typeof fn !== 'function') {
    throw new TypeError('Promise constructor\'s argument is not a function')
  }

  // 0 - pending
  // 1 - fulfilled(resolved)
  // 2 - rejected
  this._state = 0

  // 执行结果
  this._value = null

  // then  的回调处理数组
  this._deferreds = []

  // 如果是个空函数 return
  if (fn === noop) return

  // 立即执行 fn
  // doResolve -> tryCallTwo
  doResolve(fn, this)
}

/**
 * 封装存储 onResolved, onRejected 函数，和新 promise
 * @param {*} onResolved
 * @param {*} onRejected
 * @param {*} promise
 */
function Handler (onResolved, onRejected, promise) {
  this.onResolved = typeof onResolved === 'function' ? onResolved : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.promise = promise
}

Promise.prototype.then = function (onFulfilled, onRejected) {
  // this.constructor !== Promise safeThen
  const res = new Promise(noop)
  const defferred = new Handler(onFulfilled, onRejected, res)
  // handle -> 状态处理...
  // 当状态为 pending ，存储延迟处理
  if (this._state === 0) {
    // _deferredState 判断略
    this._deferreds.push(defferd)

    return res
  }

  // 不为 pending
  handleResolved(this, defferred)

  // 返回新的 promise 对象，维持链式调用
  return res
}

function handleResolved (self, deferred) {
  // asap 尽快执行
  asyncFn(function () {
    const cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected

    if (cb === null) {
      if (self._state === 1) {
        resolve(deferred.promise, self._value)
      } else {
        reject(deferred.promise, self._value)
      }

      // try call one
      try {
        const res = cb(self._value)
        resolve(deferred.promise, res)
      } catch (err) {
        reject(deferred.promise, err)
      }
    }
  })
}

function finale (self) {
  for (let i = 0; i < self._deferreds.length; i++) {
    // TODO: handle
    handleResolved(self, self._deferreds[i])
  }
  self._deferreds = []
}

function resolve (self, newValue) {
  // 如果指向同一个对象
  if (newValue === self) {
    return reject(self, new TypeError('A promise cannot be resolved with itself.'))
  }

  // value 是一个 promise
  if (newValue && newValue instanceof Promise && value.then === promise.then) {
    const deferreds = promise._deferreds

    if (value._state === 0) {
      value._deferreds.push(...deferreds)
    } else if (deferreds.length !== 0) {
      finale(self)
    }
    return
  }

  // value 是对象或函数
  if (
    newValue &&
    (typeof newValue === 'object' || typeof newValue === 'function')
  ) {
    const then = getThen(newValue)

    if (then === IS_ERROR) {
      return reject(self, LAST_ERROR)
    }
    // 如果 then 是一个函数
    if (typeof then === 'function') {
      doResolve(then.bind(newValue), self)
      return
    }
  }

  // 改变内部状态为 resolved
  self._state = 1
  self._value = newValue

  finale(self)
}

function reject (self, newValue) {
  // 直接改变内部状态
  self._state = 2
  self._value = newValue

  finale(self)
}

function doResolve (fn, promise) {
  try {
    // resolve , reject 入参
    fn(value => {
      resolve(promise, value)
    }, reason => {
      reject(promise, reason)
    })
  } catch (err) {
    // 异常处理
    reject(promise, err)
  }
}

export default Promise
