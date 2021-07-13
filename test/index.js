const { deferred, resolved, rejected } = require('./adapter')

function xFactory() {
  return deferred().promise;
}

const dummy = { dummy: 'dummy' }

var promise = resolved(dummy).then(function onBasePromiseFulfilled() {
  return xFactory();
});

var promise2 = rejected(dummy).then(null, function onBasePromiseRejected() {
  return xFactory();
});

var wasFulfilled = false;
var wasRejected = false;

promise.then(
  function onPromiseFulfilled() {
    wasFulfilled = true;
  },
  function onPromiseRejected() {
    wasRejected = true;
  }
);
promise2.then(
  function onPromiseFulfilled() {
    wasFulfilled = true;
  },
  function onPromiseRejected() {
    wasRejected = true;
  }
);

setTimeout(function () {
  console.log(`wasFulfilled === false`, wasFulfilled === false)
  console.log(`wasRejected === false`, wasRejected === false)
}, 100);
