# timers-browserify-full

This module is based on the original source files of node v0.12.0. This means that it is
as compatible to node as possible, and it also uses linked lists like node. But
it also means that it is quite heavy, and not necessary for most browserify
projects. If you don't heavily use timers, the [timers-browserify](https://www.npmjs.com/package/timers-browserify)
module, which is already integrated in browserify, is probably better suited.

## install / usage with browserify

```bash
npm install timers-browserify-full
```

To use it with browserify, you have to use the js API of browserify;
the command line API does not support changing builtins.

Example:

```js
var browserify = require('browserify');

var builtins = require('browserify/lib/builtins.js');
builtins.timers = require.resolve('timers-browserify-full');

var b = browserify();

b.add(...
```

The above example will use timers-browserify-full for all browserify builds.
If you only want it for a specific build of a larger build script:

```js
var browserify = require('browserify');

var builtins = require('browserify/lib/builtins.js');
var myBuiltins = {};
Object.keys(builtins).forEach(function(key) {
  myBuiltins[key] = builtins[key];
});

myBuiltins.timers = require.resolve('timers-browserify-full')

var b = browserify({builtins: myBuiltins});

b.add(...
```

## license

MIT