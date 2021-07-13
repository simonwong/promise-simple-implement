const Promise = require('./core')

Promise.prototype.finally = function (f) {
  return this.then(function (value) {
    Promise.resolve(f()).then(() => value)
  }, function (err) {
    Promise.resolve(f()).then(() => {
      throw err
    })
  })
}
