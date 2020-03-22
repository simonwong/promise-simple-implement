'use strict'

// 定义了一个空函数
function noop () {}

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

  return res
}

function handleResolved () {
  // TODO: asap
  // reject() / resolve()
}

function resolve () {
  // TODO:
}

function reject () {
  // TODO:
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
