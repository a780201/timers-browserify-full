#!/usr/bin/env node

/*
This file is a fork of https://github.com/feross/buffer/blob/master/bin/download-node-tests.js
It is modified for use with the timers module.

The MIT License (MIT)

Copyright (c) Feross Aboukhadijeh, and other contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var hyperquest = require('hyperquest')
var concat = require('concat-stream')
var split = require('split')
var thru = require('through2')
var fs = require('fs')
var async = require('async')

async.series([
  // clean-up: delete test files starting with node-
  function (cb) {
    fs.readdir(__dirname + '/../test', function(err, files) {
      if (err) {
        return cb(err)
      }
      async.map(
        files.filter(function (file) {
          return /^node-.*$/.test(file)
        }).map(function (file) {
          return __dirname + '/../test/' + file
        }),
        fs.unlink,
        cb
      )
    })
  },
  function (cb) {
    var url = 'https://api.github.com/repos/joyent/node/contents'
    var dirs = [
      '/test/simple',
      '/test/pummel'
    ]
    var params = '?ref=v0.12.0-release'

    var httpOpts = {
      headers: {
        'User-Agent': null
        // auth if github rate-limits you...
        // 'Authorization': 'Basic ' + Buffer('username:password').toString('base64')
      }
    }

    async.each(dirs, function (dir, cb) {
      var req = hyperquest(url + dir + params, httpOpts)
      req.pipe(concat(function (data) {
        if (req.response.statusCode !== 200) {
          throw new Error(url + dir + params + ': ' + data.toString())
        }
        downloadBufferTests(dir, JSON.parse(data), cb)
      }))
    }, cb)

    function downloadBufferTests (dir, files, cb) {
      async.each(files, function (file, cb) {
        if (!/^test-timers.*$/.test(file.name) ||
            // exclude tests
            [
              // This would require sockets
              'test-timers-socket-timeout-removes-other-socket-unref-timer.js',
              // It is difficult to do process.on('uncaughtException', ...) in
              // browsers
              'test-timers-uncaught-exception.js',
              // removed the long time intervals and timeout, because unref
              // doesn't work in browser and it would keep the loop open in node
              // The modified test now simply tests that unref does not throw
              // and still fires.
              'test-timers-unref.js'
            ].indexOf(file.name) !== -1)
          return cb()

        if (dir === '/test/pummel') {
          file.name = 'pummel-' + file.name
        }

        hyperquest(file.download_url, httpOpts)
          .pipe(split())
          .pipe(testfixer(file.name))
          .pipe(fs.createWriteStream(__dirname + '/../test/node-' + file.name))
          .on('error', cb)
          .on('finish', cb)
      }, cb)
    }

    /*var path = __dirname + '/node-tests/'
    fs.readdir(path, function (err, files) {
      if (err) {
        throw err
      }
      files.forEach(function (file) {
        if ([
              'test-timers-socket-timeout-removes-other-socket-unref-timer.js',
              'test-timers-uncaught-exception.js',
              'test-timers-unref.js'
            ].indexOf(file) !== -1) {
          return
        }
        fs.createReadStream(path + file)
          .pipe(split())
          .pipe(testfixer(file))
          .pipe(fs.createWriteStream(__dirname + '/../test/node-' + file))
      })
    })*/
  },
  function (cb) {
    fs.readdir(__dirname + '/../test', function(err, files) {
      if (err) {
        return cb(err)
      }

      var allTests = '// This file is automatically generated by bin/download-node-tests.js\n' +
          files.filter(function (file) {
            return /^.*\.js$/.test(file)
          }).map(function (file) {
            return "require('./test/" + file + "')"
          }).join('\n') + '\n'

      fs.writeFile(__dirname + '/../all-tests.js', allTests, cb)
    })
  }
], function (err) {
  if (err) {
    throw err
  }
})

var timeout = {
  'pummel-test-timers.js': 3200,
  'test-timers.js': 210,
  'test-timers-first-fire.js': 250,
  'test-timers-immediate.js': 200,
  'test-timers-immediate-queue.js': 1000,
  'test-timers-linked-list.js': 0,
  'test-timers-non-integer-delay.js': 5000,
  'test-timers-ordering.js': 230,
  // 'test-timers-socket-timeout-removes-other-socket-unref-timer.js': 1000,
  'test-timers-this.js': 200,
  // 'test-timers-uncaught-exception.js': 300,
  // 'test-timers-unref.js': 300,
  'test-timers-unref-active.js': 300,
  'test-timers-unref-remove-other-unref-timers.js': 300,
  'test-timers-unref-remove-other-unref-timers-only-one-fires.js': 220,
  'test-timers-unrefd-interval-still-fires.js': 300,
  'test-timers-zero-timeout.js': 200
}

function testfixer (filename) {
  var firstline = true
  var callsExit = false

  var ms = timeout[filename]
  if (typeof ms !== 'number') {
    console.warn('No timeout specified for test ' + filename +
      '. This probably means a new test was added.')
    ms = 5000 // default
  }

  return thru(function (line, enc, cb) {
    line = line.toString()

    if (firstline) {
      // require timers explicitly and set global functions
      line = "var mockProcess = new (require('events').EventEmitter)()\n" +
        'mockProcess.nextTick = process.nextTick\n' +
        'mockProcess.hrtime = function (last) {\n' +
        "  var now = typeof performance !== 'undefined' && performance.now ?\n" +
        '    performance.now() : +new Date\n' +
        '  return [now / 1e3 - (last && last[0] || 0), 0]\n' +
        '}\n' +
        'var origSetTimeout = setTimeout\n' +
        "var test = require('tape-catch-onerror')\n" +
        "test('" + filename + "', function (tape) {\n" +
        '  var process = mockProcess\n' +
        "  var timers = require('../timers')\n" +
        ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
         'setImmediate', 'clearImmediate']
          .map(function (func) {
            return '  var ' + func + ' = timers.' + func
          })
          .join('\n') +
        '\n\n\n' + line

      // forEach polyfill
      if (filename === 'test-timers.js') {
        line = 'Array.prototype.forEach||(Array.prototype.forEach=function(r,t){var o,n;if(null==this)throw new TypeError("this is null or not defined");var e=Object(this),i=e.length>>>0;if("function"!=typeof r)throw new TypeError(r+" is not a function");for(arguments.length>1&&(o=t),n=0;i>n;){var a;n in e&&(a=e[n],r.call(o,a,n,e)),n++}});\n' +
          line
      }

      firstline = false
    }

    // fix to ignore rounding errors
    if (filename === 'test-timers-first-fire.js') {
      line = line.replace("assert.ok(delta > 0, 'Timer fired early');", "assert.ok(delta > -0.001, 'Timer fired early');")
    }

    // comment out require('common')
    line = line.replace(/^(var common = require.*)/, '// $1')

    // require timers
    line = line.replace(/(.*)require\('timers'\)(.*)/, "$1require('../timers')$2")

    // require linklist
    line = line.replace(/(.*)require\('_linklist'\)(.*)/, "$1require('../_linklist')$2")

    // comment out console logs
    line = line.replace(/(.*console\..*)/, '// $1')

    if (/process\.exit/.test(line)) {
      callsExit = true
    }

    line = line.replace(/(var Timer = process\.binding\('timer_wrap'\)\.Timer;)$/,
      '// $1\n' +
      'var Timer = {}\n' +
      "Timer.now = !!(typeof performance !== 'undefined' && performance.now) ?\n" +
      '  performance.now.bind(performance) : function() { return +new Date }')

    cb(null, line + '\n')
  },
  function (cb) {
    var code
    if (callsExit) {
      code = '  process.exit = function () {\n' +
        '    tape.pass()\n' +
        '    tape.end()\n' +
        '  }\n' +
        '  tape.timeoutAfter(' + ms + ')\n'
    } else {
      code = '  origSetTimeout(function () {\n' +
        "    process.emit('exit')\n" +
        '    tape.pass()\n' +
        '    tape.end()\n' +
        '  }, ' + ms + ')\n'
    }
    this.push('\n\n\n' + code + '})\n')
    cb()
  })
}
