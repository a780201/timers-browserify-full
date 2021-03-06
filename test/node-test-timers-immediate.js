var mockProcess = new (require('events').EventEmitter)()
mockProcess.nextTick = process.nextTick
mockProcess.hrtime = function (last) {
  var now = typeof performance !== 'undefined' && performance.now ?
    performance.now() : +new Date
  return [now / 1e3 - (last && last[0] || 0), 0]
}
var origSetTimeout = setTimeout
var test = require('tape-catch-onerror')
test('test-timers-immediate.js', function (tape) {
  var process = mockProcess
  var timers = require('../timers')
  var setTimeout = timers.setTimeout
  var clearTimeout = timers.clearTimeout
  var setInterval = timers.setInterval
  var clearInterval = timers.clearInterval
  var setImmediate = timers.setImmediate
  var clearImmediate = timers.clearImmediate


// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// var common = require('../common');
var assert = require('assert');

var immediateA = false,
    immediateB = false,
    immediateC = [],
    before;

setImmediate(function() {
  try {
    immediateA = process.hrtime(before);
  } catch(e) {
//     console.log('failed to get hrtime with offset');
  }
  clearImmediate(immediateB);
});

before = process.hrtime();

immediateB = setImmediate(function() {
  immediateB = true;
});

setImmediate(function(x, y, z) {
  immediateC = [x, y, z];
}, 1, 2, 3);

process.on('exit', function() {
  assert.ok(immediateA, 'Immediate should happen after normal execution');
  assert.notStrictEqual(immediateB, true, 'immediateB should not fire');
  assert.deepEqual(immediateC, [1, 2, 3], 'immediateC args should match');
});




  origSetTimeout(function () {
    process.emit('exit')
    tape.pass()
    tape.end()
  }, 200)
})
