const Promise = require('./core')

module.exports = Promise

Promise.prototype.done = function (onFulfilled, onRejected) {
  const self = arguments.length ? this.then.call(this, arguments) : this

  self.then(null, function (err) {
    setTimeout(() => {
      throw err
    }, 0)
  })
}
