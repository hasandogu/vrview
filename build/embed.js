(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (process){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */


var _Group = function () {
	this._tweens = {};
	this._tweensAddedDuringUpdate = {};
};

_Group.prototype = {
	getAll: function () {

		return Object.keys(this._tweens).map(function (tweenId) {
			return this._tweens[tweenId];
		}.bind(this));

	},

	removeAll: function () {

		this._tweens = {};

	},

	add: function (tween) {

		this._tweens[tween.getId()] = tween;
		this._tweensAddedDuringUpdate[tween.getId()] = tween;

	},

	remove: function (tween) {

		delete this._tweens[tween.getId()];
		delete this._tweensAddedDuringUpdate[tween.getId()];

	},

	update: function (time, preserve) {

		var tweenIds = Object.keys(this._tweens);

		if (tweenIds.length === 0) {
			return false;
		}

		time = time !== undefined ? time : TWEEN.now();

		// Tweens are updated in "batches". If you add a new tween during an update, then the
		// new tween will be updated in the next batch.
		// If you remove a tween during an update, it will normally still be updated. However,
		// if the removed tween was added during the current batch, then it will not be updated.
		while (tweenIds.length > 0) {
			this._tweensAddedDuringUpdate = {};

			for (var i = 0; i < tweenIds.length; i++) {

				if (this._tweens[tweenIds[i]].update(time) === false) {
					this._tweens[tweenIds[i]]._isPlaying = false;

					if (!preserve) {
						delete this._tweens[tweenIds[i]];
					}
				}
			}

			tweenIds = Object.keys(this._tweensAddedDuringUpdate);
		}

		return true;

	}
};

var TWEEN = new _Group();

TWEEN.Group = _Group;
TWEEN._nextId = 0;
TWEEN.nextId = function () {
	return TWEEN._nextId++;
};


// Include a performance.now polyfill.
// In node.js, use process.hrtime.
if (typeof (window) === 'undefined' && typeof (process) !== 'undefined') {
	TWEEN.now = function () {
		var time = process.hrtime();

		// Convert [seconds, nanoseconds] to milliseconds.
		return time[0] * 1000 + time[1] / 1000000;
	};
}
// In a browser, use window.performance.now if it is available.
else if (typeof (window) !== 'undefined' &&
         window.performance !== undefined &&
		 window.performance.now !== undefined) {
	// This must be bound, because directly assigning this function
	// leads to an invocation exception in Chrome.
	TWEEN.now = window.performance.now.bind(window.performance);
}
// Use Date.now if it is available.
else if (Date.now !== undefined) {
	TWEEN.now = Date.now;
}
// Otherwise, use 'new Date().getTime()'.
else {
	TWEEN.now = function () {
		return new Date().getTime();
	};
}


TWEEN.Tween = function (object, group) {
	this._object = object;
	this._valuesStart = {};
	this._valuesEnd = {};
	this._valuesStartRepeat = {};
	this._duration = 1000;
	this._repeat = 0;
	this._repeatDelayTime = undefined;
	this._yoyo = false;
	this._isPlaying = false;
	this._reversed = false;
	this._delayTime = 0;
	this._startTime = null;
	this._easingFunction = TWEEN.Easing.Linear.None;
	this._interpolationFunction = TWEEN.Interpolation.Linear;
	this._chainedTweens = [];
	this._onStartCallback = null;
	this._onStartCallbackFired = false;
	this._onUpdateCallback = null;
	this._onCompleteCallback = null;
	this._onStopCallback = null;
	this._group = group || TWEEN;
	this._id = TWEEN.nextId();

};

TWEEN.Tween.prototype = {
	getId: function getId() {
		return this._id;
	},

	isPlaying: function isPlaying() {
		return this._isPlaying;
	},

	to: function to(properties, duration) {

		this._valuesEnd = properties;

		if (duration !== undefined) {
			this._duration = duration;
		}

		return this;

	},

	start: function start(time) {

		this._group.add(this);

		this._isPlaying = true;

		this._onStartCallbackFired = false;

		this._startTime = time !== undefined ? time : TWEEN.now();
		this._startTime += this._delayTime;

		for (var property in this._valuesEnd) {

			// Check if an Array was provided as property value
			if (this._valuesEnd[property] instanceof Array) {

				if (this._valuesEnd[property].length === 0) {
					continue;
				}

				// Create a local copy of the Array with the start value at the front
				this._valuesEnd[property] = [this._object[property]].concat(this._valuesEnd[property]);

			}

			// If `to()` specifies a property that doesn't exist in the source object,
			// we should not set that property in the object
			if (this._object[property] === undefined) {
				continue;
			}

			// Save the starting value.
			this._valuesStart[property] = this._object[property];

			if ((this._valuesStart[property] instanceof Array) === false) {
				this._valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
			}

			this._valuesStartRepeat[property] = this._valuesStart[property] || 0;

		}

		return this;

	},

	stop: function stop() {

		if (!this._isPlaying) {
			return this;
		}

		this._group.remove(this);
		this._isPlaying = false;

		if (this._onStopCallback !== null) {
			this._onStopCallback.call(this._object, this._object);
		}

		this.stopChainedTweens();
		return this;

	},

	end: function end() {

		this.update(this._startTime + this._duration);
		return this;

	},

	stopChainedTweens: function stopChainedTweens() {

		for (var i = 0, numChainedTweens = this._chainedTweens.length; i < numChainedTweens; i++) {
			this._chainedTweens[i].stop();
		}

	},

	delay: function delay(amount) {

		this._delayTime = amount;
		return this;

	},

	repeat: function repeat(times) {

		this._repeat = times;
		return this;

	},

	repeatDelay: function repeatDelay(amount) {

		this._repeatDelayTime = amount;
		return this;

	},

	yoyo: function yoyo(yoyo) {

		this._yoyo = yoyo;
		return this;

	},

	easing: function easing(easing) {

		this._easingFunction = easing;
		return this;

	},

	interpolation: function interpolation(interpolation) {

		this._interpolationFunction = interpolation;
		return this;

	},

	chain: function chain() {

		this._chainedTweens = arguments;
		return this;

	},

	onStart: function onStart(callback) {

		this._onStartCallback = callback;
		return this;

	},

	onUpdate: function onUpdate(callback) {

		this._onUpdateCallback = callback;
		return this;

	},

	onComplete: function onComplete(callback) {

		this._onCompleteCallback = callback;
		return this;

	},

	onStop: function onStop(callback) {

		this._onStopCallback = callback;
		return this;

	},

	update: function update(time) {

		var property;
		var elapsed;
		var value;

		if (time < this._startTime) {
			return true;
		}

		if (this._onStartCallbackFired === false) {

			if (this._onStartCallback !== null) {
				this._onStartCallback.call(this._object, this._object);
			}

			this._onStartCallbackFired = true;
		}

		elapsed = (time - this._startTime) / this._duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		value = this._easingFunction(elapsed);

		for (property in this._valuesEnd) {

			// Don't update properties that do not exist in the source object
			if (this._valuesStart[property] === undefined) {
				continue;
			}

			var start = this._valuesStart[property] || 0;
			var end = this._valuesEnd[property];

			if (end instanceof Array) {

				this._object[property] = this._interpolationFunction(end, value);

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if (typeof (end) === 'string') {

					if (end.charAt(0) === '+' || end.charAt(0) === '-') {
						end = start + parseFloat(end);
					} else {
						end = parseFloat(end);
					}
				}

				// Protect against non numeric properties.
				if (typeof (end) === 'number') {
					this._object[property] = start + (end - start) * value;
				}

			}

		}

		if (this._onUpdateCallback !== null) {
			this._onUpdateCallback.call(this._object, value);
		}

		if (elapsed === 1) {

			if (this._repeat > 0) {

				if (isFinite(this._repeat)) {
					this._repeat--;
				}

				// Reassign starting values, restart by making startTime = now
				for (property in this._valuesStartRepeat) {

					if (typeof (this._valuesEnd[property]) === 'string') {
						this._valuesStartRepeat[property] = this._valuesStartRepeat[property] + parseFloat(this._valuesEnd[property]);
					}

					if (this._yoyo) {
						var tmp = this._valuesStartRepeat[property];

						this._valuesStartRepeat[property] = this._valuesEnd[property];
						this._valuesEnd[property] = tmp;
					}

					this._valuesStart[property] = this._valuesStartRepeat[property];

				}

				if (this._yoyo) {
					this._reversed = !this._reversed;
				}

				if (this._repeatDelayTime !== undefined) {
					this._startTime = time + this._repeatDelayTime;
				} else {
					this._startTime = time + this._delayTime;
				}

				return true;

			} else {

				if (this._onCompleteCallback !== null) {

					this._onCompleteCallback.call(this._object, this._object);
				}

				for (var i = 0, numChainedTweens = this._chainedTweens.length; i < numChainedTweens; i++) {
					// Make the chained tweens start exactly at the time they should,
					// even if the `update()` method was called way past the duration of the tween
					this._chainedTweens[i].start(this._startTime + this._duration);
				}

				return false;

			}

		}

		return true;

	}
};


TWEEN.Easing = {

	Linear: {

		None: function (k) {

			return k;

		}

	},

	Quadratic: {

		In: function (k) {

			return k * k;

		},

		Out: function (k) {

			return k * (2 - k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k;
			}

			return - 0.5 * (--k * (k - 2) - 1);

		}

	},

	Cubic: {

		In: function (k) {

			return k * k * k;

		},

		Out: function (k) {

			return --k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k + 2);

		}

	},

	Quartic: {

		In: function (k) {

			return k * k * k * k;

		},

		Out: function (k) {

			return 1 - (--k * k * k * k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k;
			}

			return - 0.5 * ((k -= 2) * k * k * k - 2);

		}

	},

	Quintic: {

		In: function (k) {

			return k * k * k * k * k;

		},

		Out: function (k) {

			return --k * k * k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k * k * k + 2);

		}

	},

	Sinusoidal: {

		In: function (k) {

			return 1 - Math.cos(k * Math.PI / 2);

		},

		Out: function (k) {

			return Math.sin(k * Math.PI / 2);

		},

		InOut: function (k) {

			return 0.5 * (1 - Math.cos(Math.PI * k));

		}

	},

	Exponential: {

		In: function (k) {

			return k === 0 ? 0 : Math.pow(1024, k - 1);

		},

		Out: function (k) {

			return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if ((k *= 2) < 1) {
				return 0.5 * Math.pow(1024, k - 1);
			}

			return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);

		}

	},

	Circular: {

		In: function (k) {

			return 1 - Math.sqrt(1 - k * k);

		},

		Out: function (k) {

			return Math.sqrt(1 - (--k * k));

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return - 0.5 * (Math.sqrt(1 - k * k) - 1);
			}

			return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return -Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);

		},

		Out: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1;

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			k *= 2;

			if (k < 1) {
				return -0.5 * Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
			}

			return 0.5 * Math.pow(2, -10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI) + 1;

		}

	},

	Back: {

		In: function (k) {

			var s = 1.70158;

			return k * k * ((s + 1) * k - s);

		},

		Out: function (k) {

			var s = 1.70158;

			return --k * k * ((s + 1) * k + s) + 1;

		},

		InOut: function (k) {

			var s = 1.70158 * 1.525;

			if ((k *= 2) < 1) {
				return 0.5 * (k * k * ((s + 1) * k - s));
			}

			return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);

		}

	},

	Bounce: {

		In: function (k) {

			return 1 - TWEEN.Easing.Bounce.Out(1 - k);

		},

		Out: function (k) {

			if (k < (1 / 2.75)) {
				return 7.5625 * k * k;
			} else if (k < (2 / 2.75)) {
				return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
			} else if (k < (2.5 / 2.75)) {
				return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
			} else {
				return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
			}

		},

		InOut: function (k) {

			if (k < 0.5) {
				return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
			}

			return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.Linear;

		if (k < 0) {
			return fn(v[0], v[1], f);
		}

		if (k > 1) {
			return fn(v[m], v[m - 1], m - f);
		}

		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);

	},

	Bezier: function (v, k) {

		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = TWEEN.Interpolation.Utils.Bernstein;

		for (var i = 0; i <= n; i++) {
			b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
		}

		return b;

	},

	CatmullRom: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.CatmullRom;

		if (v[0] === v[m]) {

			if (k < 0) {
				i = Math.floor(f = m * (1 + k));
			}

			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);

		} else {

			if (k < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}

			if (k > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}

			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);

		}

	},

	Utils: {

		Linear: function (p0, p1, t) {

			return (p1 - p0) * t + p0;

		},

		Bernstein: function (n, i) {

			var fc = TWEEN.Interpolation.Utils.Factorial;

			return fc(n) / fc(i) / fc(n - i);

		},

		Factorial: (function () {

			var a = [1];

			return function (n) {

				var s = 1;

				if (a[n]) {
					return a[n];
				}

				for (var i = n; i > 1; i--) {
					s *= i;
				}

				a[n] = s;
				return s;

			};

		})(),

		CatmullRom: function (p0, p1, p2, p3, t) {

			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;

			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;

		}

	}

};

// UMD (Universal Module Definition)
(function (root) {

	if (typeof define === 'function' && define.amd) {

		// AMD
		define([], function () {
			return TWEEN;
		});

	} else if (typeof module !== 'undefined' && typeof exports === 'object') {

		// Node.js
		module.exports = TWEEN;

	} else if (root !== undefined) {

		// Global variable
		root.TWEEN = TWEEN;

	}

})(this);

}).call(this,_dereq_('_process'))
},{"_process":4}],2:[function(_dereq_,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   3.3.1
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  return typeof x === 'function' || typeof x === 'object' && x !== null;
}

function isFunction(x) {
  return typeof x === 'function';
}

var _isArray = undefined;
if (!Array.isArray) {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
} else {
  _isArray = Array.isArray;
}

var isArray = _isArray;

var len = 0;
var vertxNext = undefined;
var customSchedulerFn = undefined;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && ({}).toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  return function () {
    vertxNext(flush);
  };
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var r = _dereq_;
    var vertx = r('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = undefined;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof _dereq_ === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var _arguments = arguments;

  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;

  if (_state) {
    (function () {
      var callback = _arguments[_state - 1];
      asap(function () {
        return invokeCallback(_state, child, callback, parent._result);
      });
    })();
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  _resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(16);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var GET_THEN_ERROR = new ErrorObject();

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    GET_THEN_ERROR.error = error;
    return GET_THEN_ERROR;
  }
}

function tryThen(then, value, fulfillmentHandler, rejectionHandler) {
  try {
    then.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        _resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      _reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      _reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    _reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return _resolve(promise, value);
    }, function (reason) {
      return _reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$) {
  if (maybeThenable.constructor === promise.constructor && then$$ === then && maybeThenable.constructor.resolve === resolve) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$ === GET_THEN_ERROR) {
      _reject(promise, GET_THEN_ERROR.error);
    } else if (then$$ === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$)) {
      handleForeignThenable(promise, maybeThenable, then$$);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function _resolve(promise, value) {
  if (promise === value) {
    _reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function _reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;

  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = undefined,
      callback = undefined,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function ErrorObject() {
  this.error = null;
}

var TRY_CATCH_ERROR = new ErrorObject();

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = undefined,
      error = undefined,
      succeeded = undefined,
      failed = undefined;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      _reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
      _resolve(promise, value);
    } else if (failed) {
      _reject(promise, error);
    } else if (settled === FULFILLED) {
      fulfill(promise, value);
    } else if (settled === REJECTED) {
      _reject(promise, value);
    }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      _resolve(promise, value);
    }, function rejectPromise(reason) {
      _reject(promise, reason);
    });
  } catch (e) {
    _reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function Enumerator(Constructor, input) {
  this._instanceConstructor = Constructor;
  this.promise = new Constructor(noop);

  if (!this.promise[PROMISE_ID]) {
    makePromise(this.promise);
  }

  if (isArray(input)) {
    this._input = input;
    this.length = input.length;
    this._remaining = input.length;

    this._result = new Array(this.length);

    if (this.length === 0) {
      fulfill(this.promise, this._result);
    } else {
      this.length = this.length || 0;
      this._enumerate();
      if (this._remaining === 0) {
        fulfill(this.promise, this._result);
      }
    }
  } else {
    _reject(this.promise, validationError());
  }
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
};

Enumerator.prototype._enumerate = function () {
  var length = this.length;
  var _input = this._input;

  for (var i = 0; this._state === PENDING && i < length; i++) {
    this._eachEntry(_input[i], i);
  }
};

Enumerator.prototype._eachEntry = function (entry, i) {
  var c = this._instanceConstructor;
  var resolve$$ = c.resolve;

  if (resolve$$ === resolve) {
    var _then = getThen(entry);

    if (_then === then && entry._state !== PENDING) {
      this._settledAt(entry._state, i, entry._result);
    } else if (typeof _then !== 'function') {
      this._remaining--;
      this._result[i] = entry;
    } else if (c === Promise) {
      var promise = new c(noop);
      handleMaybeThenable(promise, entry, _then);
      this._willSettleAt(promise, i);
    } else {
      this._willSettleAt(new c(function (resolve$$) {
        return resolve$$(entry);
      }), i);
    }
  } else {
    this._willSettleAt(resolve$$(entry), i);
  }
};

Enumerator.prototype._settledAt = function (state, i, value) {
  var promise = this.promise;

  if (promise._state === PENDING) {
    this._remaining--;

    if (state === REJECTED) {
      _reject(promise, value);
    } else {
      this._result[i] = value;
    }
  }

  if (this._remaining === 0) {
    fulfill(promise, this._result);
  }
};

Enumerator.prototype._willSettleAt = function (promise, i) {
  var enumerator = this;

  subscribe(promise, undefined, function (value) {
    return enumerator._settledAt(FULFILLED, i, value);
  }, function (reason) {
    return enumerator._settledAt(REJECTED, i, reason);
  });
};

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  _reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {function} resolver
  Useful for tooling.
  @constructor
*/
function Promise(resolver) {
  this[PROMISE_ID] = nextId();
  this._result = this._state = undefined;
  this._subscribers = [];

  if (noop !== resolver) {
    typeof resolver !== 'function' && needsResolver();
    this instanceof Promise ? initializePromise(this, resolver) : needsNew();
  }
}

Promise.all = all;
Promise.race = race;
Promise.resolve = resolve;
Promise.reject = reject;
Promise._setScheduler = setScheduler;
Promise._setAsap = setAsap;
Promise._asap = asap;

Promise.prototype = {
  constructor: Promise,

  /**
    The primary way of interacting with a promise is through its `then` method,
    which registers callbacks to receive either a promise's eventual value or the
    reason why the promise cannot be fulfilled.
  
    ```js
    findUser().then(function(user){
      // user is available
    }, function(reason){
      // user is unavailable, and you are given the reason why
    });
    ```
  
    Chaining
    --------
  
    The return value of `then` is itself a promise.  This second, 'downstream'
    promise is resolved with the return value of the first promise's fulfillment
    or rejection handler, or rejected if the handler throws an exception.
  
    ```js
    findUser().then(function (user) {
      return user.name;
    }, function (reason) {
      return 'default name';
    }).then(function (userName) {
      // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
      // will be `'default name'`
    });
  
    findUser().then(function (user) {
      throw new Error('Found user, but still unhappy');
    }, function (reason) {
      throw new Error('`findUser` rejected and we're unhappy');
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
      // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
    });
    ```
    If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
  
    ```js
    findUser().then(function (user) {
      throw new PedagogicalException('Upstream error');
    }).then(function (value) {
      // never reached
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // The `PedgagocialException` is propagated all the way down to here
    });
    ```
  
    Assimilation
    ------------
  
    Sometimes the value you want to propagate to a downstream promise can only be
    retrieved asynchronously. This can be achieved by returning a promise in the
    fulfillment or rejection handler. The downstream promise will then be pending
    until the returned promise is settled. This is called *assimilation*.
  
    ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // The user's comments are now available
    });
    ```
  
    If the assimliated promise rejects, then the downstream promise will also reject.
  
    ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // If `findCommentsByAuthor` fulfills, we'll have the value here
    }, function (reason) {
      // If `findCommentsByAuthor` rejects, we'll have the reason here
    });
    ```
  
    Simple Example
    --------------
  
    Synchronous Example
  
    ```javascript
    let result;
  
    try {
      result = findResult();
      // success
    } catch(reason) {
      // failure
    }
    ```
  
    Errback Example
  
    ```js
    findResult(function(result, err){
      if (err) {
        // failure
      } else {
        // success
      }
    });
    ```
  
    Promise Example;
  
    ```javascript
    findResult().then(function(result){
      // success
    }, function(reason){
      // failure
    });
    ```
  
    Advanced Example
    --------------
  
    Synchronous Example
  
    ```javascript
    let author, books;
  
    try {
      author = findAuthor();
      books  = findBooksByAuthor(author);
      // success
    } catch(reason) {
      // failure
    }
    ```
  
    Errback Example
  
    ```js
  
    function foundBooks(books) {
  
    }
  
    function failure(reason) {
  
    }
  
    findAuthor(function(author, err){
      if (err) {
        failure(err);
        // failure
      } else {
        try {
          findBoooksByAuthor(author, function(books, err) {
            if (err) {
              failure(err);
            } else {
              try {
                foundBooks(books);
              } catch(reason) {
                failure(reason);
              }
            }
          });
        } catch(error) {
          failure(err);
        }
        // success
      }
    });
    ```
  
    Promise Example;
  
    ```javascript
    findAuthor().
      then(findBooksByAuthor).
      then(function(books){
        // found books
    }).catch(function(reason){
      // something went wrong
    });
    ```
  
    @method then
    @param {Function} onFulfilled
    @param {Function} onRejected
    Useful for tooling.
    @return {Promise}
  */
  then: then,

  /**
    `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
    as the catch block of a try/catch statement.
  
    ```js
    function findAuthor(){
      throw new Error('couldn't find that author');
    }
  
    // synchronous
    try {
      findAuthor();
    } catch(reason) {
      // something went wrong
    }
  
    // async with promises
    findAuthor().catch(function(reason){
      // something went wrong
    });
    ```
  
    @method catch
    @param {Function} onRejection
    Useful for tooling.
    @return {Promise}
  */
  'catch': function _catch(onRejection) {
    return this.then(null, onRejection);
  }
};

function polyfill() {
    var local = undefined;

    if (typeof global !== 'undefined') {
        local = global;
    } else if (typeof self !== 'undefined') {
        local = self;
    } else {
        try {
            local = Function('return this')();
        } catch (e) {
            throw new Error('polyfill failed because global object is unavailable in this environment');
        }
    }

    var P = local.Promise;

    if (P) {
        var promiseToString = null;
        try {
            promiseToString = Object.prototype.toString.call(P.resolve());
        } catch (e) {
            // silently ignored
        }

        if (promiseToString === '[object Promise]' && !P.cast) {
            return;
        }
    }

    local.Promise = Promise;
}

polyfill();
// Strange compat..
Promise.polyfill = polyfill;
Promise.Promise = Promise;

return Promise;

})));

}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":4}],3:[function(_dereq_,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

//
// We store our EE objects in a plain object whose properties are event names.
// If `Object.create(null)` is not supported we prefix the event names with a
// `~` to make sure that the built-in object properties are not overridden or
// used as an attack vector.
// We also assume that `Object.create(null)` is available when the event name
// is an ES6 Symbol.
//
var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} [once=false] Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Hold the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var events = this._events
    , names = []
    , name;

  if (!events) return names;

  for (name in events) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events && this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return this;

  var listeners = this._events[evt]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[evt] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[prefix ? prefix + event : event];
  else this._events = prefix ? {} : Object.create(null);

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],4:[function(_dereq_,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(_dereq_,module,exports){
(function (global){
(function(){var g={};
(function(window){var l,aa="function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,c){a!=Array.prototype&&a!=Object.prototype&&(a[b]=c.value)},ba="undefined"!=typeof window&&window===this?this:"undefined"!=typeof global&&null!=global?global:this;function ca(){ca=function(){};ba.Symbol||(ba.Symbol=da)}var da=function(){var a=0;return function(b){return"jscomp_symbol_"+(b||"")+a++}}();
function ea(){ca();var a=ba.Symbol.iterator;a||(a=ba.Symbol.iterator=ba.Symbol("iterator"));"function"!=typeof Array.prototype[a]&&aa(Array.prototype,a,{configurable:!0,writable:!0,value:function(){return fa(this)}});ea=function(){}}function fa(a){var b=0;return ha(function(){return b<a.length?{done:!1,value:a[b++]}:{done:!0}})}function ha(a){ea();a={next:a};a[ba.Symbol.iterator]=function(){return this};return a}function ia(a){ea();var b=a[Symbol.iterator];return b?b.call(a):fa(a)}
function ja(a,b){if(b){for(var c=ba,d=a.split("."),e=0;e<d.length-1;e++){var f=d[e];f in c||(c[f]={});c=c[f]}d=d[d.length-1];e=c[d];f=b(e);f!=e&&null!=f&&aa(c,d,{configurable:!0,writable:!0,value:f})}}
ja("Promise",function(a){function b(a){this.V=0;this.f=void 0;this.a=[];var b=this.c();try{a(b.resolve,b.reject)}catch(k){b.reject(k)}}function c(){this.a=null}function d(a){return a instanceof b?a:new b(function(b){b(a)})}if(a)return a;c.prototype.b=function(a){null==this.a&&(this.a=[],this.f());this.a.push(a)};c.prototype.f=function(){var a=this;this.c(function(){a.h()})};var e=ba.setTimeout;c.prototype.c=function(a){e(a,0)};c.prototype.h=function(){for(;this.a&&this.a.length;){var a=this.a;this.a=
[];for(var b=0;b<a.length;++b){var c=a[b];delete a[b];try{c()}catch(m){this.g(m)}}}this.a=null};c.prototype.g=function(a){this.c(function(){throw a;})};b.prototype.c=function(){function a(a){return function(d){c||(c=!0,a.call(b,d))}}var b=this,c=!1;return{resolve:a(this.l),reject:a(this.b)}};b.prototype.l=function(a){if(a===this)this.b(new TypeError("A Promise cannot resolve to itself"));else if(a instanceof b)this.m(a);else{a:switch(typeof a){case "object":var c=null!=a;break a;case "function":c=
!0;break a;default:c=!1}c?this.j(a):this.g(a)}};b.prototype.j=function(a){var b=void 0;try{b=a.then}catch(k){this.b(k);return}"function"==typeof b?this.s(b,a):this.g(a)};b.prototype.b=function(a){this.h(2,a)};b.prototype.g=function(a){this.h(1,a)};b.prototype.h=function(a,b){if(0!=this.V)throw Error("Cannot settle("+a+", "+b|"): Promise already settled in state"+this.V);this.V=a;this.f=b;this.i()};b.prototype.i=function(){if(null!=this.a){for(var a=this.a,b=0;b<a.length;++b)a[b].call(),a[b]=null;
this.a=null}};var f=new c;b.prototype.m=function(a){var b=this.c();a.rb(b.resolve,b.reject)};b.prototype.s=function(a,b){var c=this.c();try{a.call(b,c.resolve,c.reject)}catch(m){c.reject(m)}};b.prototype.then=function(a,c){function d(a,b){return"function"==typeof a?function(b){try{e(a(b))}catch(v){f(v)}}:b}var e,f,g=new b(function(a,b){e=a;f=b});this.rb(d(a,e),d(c,f));return g};b.prototype["catch"]=function(a){return this.then(void 0,a)};b.prototype.rb=function(a,b){function c(){switch(d.V){case 1:a(d.f);
break;case 2:b(d.f);break;default:throw Error("Unexpected state: "+d.V);}}var d=this;null==this.a?f.b(c):this.a.push(function(){f.b(c)})};b.resolve=d;b.reject=function(a){return new b(function(b,c){c(a)})};b.race=function(a){return new b(function(b,c){for(var e=ia(a),f=e.next();!f.done;f=e.next())d(f.value).rb(b,c)})};b.all=function(a){var c=ia(a),e=c.next();return e.done?d([]):new b(function(a,b){function f(b){return function(c){g[b]=c;h--;0==h&&a(g)}}var g=[],h=0;do g.push(void 0),h++,d(e.value).rb(f(g.length-
1),b),e=c.next();while(!e.done)})};return b});ja("Array.prototype.find",function(a){return a?a:function(a,c){a:{var b=this;b instanceof String&&(b=String(b));for(var e=b.length,f=0;f<e;f++){var g=b[f];if(a.call(c,g,f,b)){b=g;break a}}b=void 0}return b}});var ka=this;ka.Ye=!0;function n(a,b){var c=a.split("."),d=ka;c[0]in d||!d.execScript||d.execScript("var "+c[0]);for(var e;c.length&&(e=c.shift());)c.length||void 0===b?d[e]?d=d[e]:d=d[e]={}:d[e]=b}
function la(a,b){function c(){}c.prototype=b.prototype;a.df=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.bf=function(a,c,f){return b.prototype[c].apply(a,Array.prototype.slice.call(arguments,2))}};/*

 Copyright 2016 Google Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function ma(a){this.c=Math.exp(Math.log(.5)/a);this.b=this.a=0}function na(a,b,c){var d=Math.pow(a.c,b);c=c*(1-d)+d*a.a;isNaN(c)||(a.a=c,a.b+=b)}function oa(a){return a.a/(1-Math.pow(a.c,a.b))};function pa(){this.b=new ma(2);this.c=new ma(5);this.a=0}pa.prototype.getBandwidthEstimate=function(a){return 128E3>this.a?a:Math.min(oa(this.b),oa(this.c))};function qa(){}function ra(){}window.console&&window.console.log.bind&&(qa=console.warn.bind(console));function p(a,b,c,d){this.severity=a;this.category=b;this.code=c;this.data=Array.prototype.slice.call(arguments,3);this.handled=!1}n("shaka.util.Error",p);p.prototype.toString=function(){return"shaka.util.Error "+JSON.stringify(this,null,"  ")};p.Severity={RECOVERABLE:1,CRITICAL:2};p.Category={NETWORK:1,TEXT:2,MEDIA:3,MANIFEST:4,STREAMING:5,DRM:6,PLAYER:7,CAST:8,STORAGE:9};
p.Code={UNSUPPORTED_SCHEME:1E3,BAD_HTTP_STATUS:1001,HTTP_ERROR:1002,TIMEOUT:1003,MALFORMED_DATA_URI:1004,UNKNOWN_DATA_URI_ENCODING:1005,REQUEST_FILTER_ERROR:1006,RESPONSE_FILTER_ERROR:1007,INVALID_TEXT_HEADER:2E3,INVALID_TEXT_CUE:2001,UNABLE_TO_DETECT_ENCODING:2003,BAD_ENCODING:2004,INVALID_XML:2005,INVALID_MP4_TTML:2007,INVALID_MP4_VTT:2008,UNABLE_TO_EXTRACT_CUE_START_TIME:2009,BUFFER_READ_OUT_OF_BOUNDS:3E3,JS_INTEGER_OVERFLOW:3001,EBML_OVERFLOW:3002,EBML_BAD_FLOATING_POINT_SIZE:3003,MP4_SIDX_WRONG_BOX_TYPE:3004,
MP4_SIDX_INVALID_TIMESCALE:3005,MP4_SIDX_TYPE_NOT_SUPPORTED:3006,WEBM_CUES_ELEMENT_MISSING:3007,WEBM_EBML_HEADER_ELEMENT_MISSING:3008,WEBM_SEGMENT_ELEMENT_MISSING:3009,WEBM_INFO_ELEMENT_MISSING:3010,WEBM_DURATION_ELEMENT_MISSING:3011,WEBM_CUE_TRACK_POSITIONS_ELEMENT_MISSING:3012,WEBM_CUE_TIME_ELEMENT_MISSING:3013,MEDIA_SOURCE_OPERATION_FAILED:3014,MEDIA_SOURCE_OPERATION_THREW:3015,VIDEO_ERROR:3016,QUOTA_EXCEEDED_ERROR:3017,UNABLE_TO_GUESS_MANIFEST_TYPE:4E3,DASH_INVALID_XML:4001,DASH_NO_SEGMENT_INFO:4002,
DASH_EMPTY_ADAPTATION_SET:4003,DASH_EMPTY_PERIOD:4004,DASH_WEBM_MISSING_INIT:4005,DASH_UNSUPPORTED_CONTAINER:4006,DASH_PSSH_BAD_ENCODING:4007,DASH_NO_COMMON_KEY_SYSTEM:4008,DASH_MULTIPLE_KEY_IDS_NOT_SUPPORTED:4009,DASH_CONFLICTING_KEY_IDS:4010,UNPLAYABLE_PERIOD:4011,RESTRICTIONS_CANNOT_BE_MET:4012,NO_PERIODS:4014,HLS_PLAYLIST_HEADER_MISSING:4015,INVALID_HLS_TAG:4016,HLS_INVALID_PLAYLIST_HIERARCHY:4017,DASH_DUPLICATE_REPRESENTATION_ID:4018,HLS_MULTIPLE_MEDIA_INIT_SECTIONS_FOUND:4020,HLS_COULD_NOT_GUESS_MIME_TYPE:4021,
HLS_MASTER_PLAYLIST_NOT_PROVIDED:4022,HLS_REQUIRED_ATTRIBUTE_MISSING:4023,HLS_REQUIRED_TAG_MISSING:4024,HLS_COULD_NOT_GUESS_CODECS:4025,HLS_KEYFORMATS_NOT_SUPPORTED:4026,DASH_UNSUPPORTED_XLINK_ACTUATE:4027,DASH_XLINK_DEPTH_LIMIT:4028,HLS_COULD_NOT_PARSE_SEGMENT_START_TIME:4030,CONTENT_UNSUPPORTED_BY_BROWSER:4032,INVALID_STREAMS_CHOSEN:5005,NO_RECOGNIZED_KEY_SYSTEMS:6E3,REQUESTED_KEY_SYSTEM_CONFIG_UNAVAILABLE:6001,FAILED_TO_CREATE_CDM:6002,FAILED_TO_ATTACH_TO_VIDEO:6003,INVALID_SERVER_CERTIFICATE:6004,
FAILED_TO_CREATE_SESSION:6005,FAILED_TO_GENERATE_LICENSE_REQUEST:6006,LICENSE_REQUEST_FAILED:6007,LICENSE_RESPONSE_REJECTED:6008,ENCRYPTED_CONTENT_WITHOUT_DRM_INFO:6010,NO_LICENSE_SERVER_GIVEN:6012,OFFLINE_SESSION_REMOVED:6013,EXPIRED:6014,LOAD_INTERRUPTED:7E3,CAST_API_UNAVAILABLE:8E3,NO_CAST_RECEIVERS:8001,ALREADY_CASTING:8002,UNEXPECTED_CAST_ERROR:8003,CAST_CANCELED_BY_USER:8004,CAST_CONNECTION_TIMED_OUT:8005,CAST_RECEIVER_APP_UNAVAILABLE:8006,STORAGE_NOT_SUPPORTED:9E3,INDEXED_DB_ERROR:9001,OPERATION_ABORTED:9002,
REQUESTED_ITEM_NOT_FOUND:9003,MALFORMED_OFFLINE_URI:9004,CANNOT_STORE_LIVE_OFFLINE:9005,STORE_ALREADY_IN_PROGRESS:9006,NO_INIT_DATA_FOR_OFFLINE:9007,LOCAL_PLAYER_INSTANCE_REQUIRED:9008,UNSUPPORTED_UPGRADE_REQUEST:9010};var sa=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#(.*))?$/;function ta(a){var b;a instanceof ta?(ua(this,a.fa),this.Ba=a.Ba,this.ja=a.ja,va(this,a.Oa),this.Y=a.Y,wa(this,xa(a.a)),this.va=a.va):a&&(b=String(a).match(sa))?(ua(this,b[1]||"",!0),this.Ba=ya(b[2]||""),this.ja=ya(b[3]||"",!0),va(this,b[4]),this.Y=ya(b[5]||"",!0),wa(this,b[6]||"",!0),this.va=ya(b[7]||"")):this.a=new za(null)}l=ta.prototype;l.fa="";l.Ba="";l.ja="";l.Oa=null;l.Y="";l.va="";
l.toString=function(){var a=[],b=this.fa;b&&a.push(Aa(b,Ba,!0),":");if(b=this.ja){a.push("//");var c=this.Ba;c&&a.push(Aa(c,Ba,!0),"@");a.push(encodeURIComponent(b).replace(/%25([0-9a-fA-F]{2})/g,"%$1"));b=this.Oa;null!=b&&a.push(":",String(b))}if(b=this.Y)this.ja&&"/"!=b.charAt(0)&&a.push("/"),a.push(Aa(b,"/"==b.charAt(0)?Ca:Da,!0));(b=this.a.toString())&&a.push("?",b);(b=this.va)&&a.push("#",Aa(b,Ea));return a.join("")};
l.resolve=function(a){var b=new ta(this);"data"===b.fa&&(b=new ta);var c=!!a.fa;c?ua(b,a.fa):c=!!a.Ba;c?b.Ba=a.Ba:c=!!a.ja;c?b.ja=a.ja:c=null!=a.Oa;var d=a.Y;if(c)va(b,a.Oa);else if(c=!!a.Y){if("/"!=d.charAt(0))if(this.ja&&!this.Y)d="/"+d;else{var e=b.Y.lastIndexOf("/");-1!=e&&(d=b.Y.substr(0,e+1)+d)}if(".."==d||"."==d)d="";else if(-1!=d.indexOf("./")||-1!=d.indexOf("/.")){e=0==d.lastIndexOf("/",0);d=d.split("/");for(var f=[],g=0;g<d.length;){var h=d[g++];"."==h?e&&g==d.length&&f.push(""):".."==h?
((1<f.length||1==f.length&&""!=f[0])&&f.pop(),e&&g==d.length&&f.push("")):(f.push(h),e=!0)}d=f.join("/")}}c?b.Y=d:c=""!==a.a.toString();c?wa(b,xa(a.a)):c=!!a.va;c&&(b.va=a.va);return b};function ua(a,b,c){a.fa=c?ya(b,!0):b;a.fa&&(a.fa=a.fa.replace(/:$/,""))}function va(a,b){if(b){b=Number(b);if(isNaN(b)||0>b)throw Error("Bad port number "+b);a.Oa=b}else a.Oa=null}function wa(a,b,c){b instanceof za?a.a=b:(c||(b=Aa(b,Fa)),a.a=new za(b))}
function ya(a,b){return a?b?decodeURI(a):decodeURIComponent(a):""}function Aa(a,b,c){return"string"==typeof a?(a=encodeURI(a).replace(b,Ga),c&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function Ga(a){a=a.charCodeAt(0);return"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var Ba=/[#\/\?@]/g,Da=/[#\?:]/g,Ca=/[#\?]/g,Fa=/[#\?@]/g,Ea=/#/g;function za(a){this.b=a||null}za.prototype.a=null;za.prototype.c=null;
za.prototype.add=function(a,b){if(!this.a&&(this.a={},this.c=0,this.b))for(var c=this.b.split("&"),d=0;d<c.length;d++){var e=c[d].indexOf("="),f=null;if(0<=e){var g=c[d].substring(0,e);f=c[d].substring(e+1)}else g=c[d];g=decodeURIComponent(g.replace(/\+/g," "));f=f||"";this.add(g,decodeURIComponent(f.replace(/\+/g," ")))}this.b=null;(c=this.a.hasOwnProperty(a)&&this.a[a])||(this.a[a]=c=[]);c.push(b);this.c++;return this};
za.prototype.toString=function(){if(this.b)return this.b;if(!this.a)return"";var a=[],b;for(b in this.a)for(var c=encodeURIComponent(b),d=this.a[b],e=0;e<d.length;e++){var f=c;""!==d[e]&&(f+="="+encodeURIComponent(d[e]));a.push(f)}return this.b=a.join("&")};function xa(a){var b=new za;b.b=a.b;if(a.a){var c={},d;for(d in a.a)c[d]=a.a[d].concat();b.a=c;b.c=a.c}return b};function u(){var a,b,c=new Promise(function(c,e){a=c;b=e});c.resolve=a;c.reject=b;return c}u.prototype.resolve=function(){};u.prototype.reject=function(){};function Ha(a,b,c){var d=Ia();this.j=null==a.maxAttempts?d.maxAttempts:a.maxAttempts;this.f=null==a.baseDelay?d.baseDelay:a.baseDelay;this.i=null==a.fuzzFactor?d.fuzzFactor:a.fuzzFactor;this.h=null==a.backoffFactor?d.backoffFactor:a.backoffFactor;this.a=0;this.b=this.f;this.c=b||!1;this.g=c||null;this.c&&(this.a=1)}function Ja(a){if(a.a>=a.j)if(a.c)a.a=1,a.b=a.f;else return Promise.reject();var b=new u;a.a?(Ka(a,b.resolve,a.b*(1+(2*Math.random()-1)*a.i)),a.b*=a.h):b.resolve();a.a++;return b}
function Ia(){return{maxAttempts:2,baseDelay:1E3,backoffFactor:2,fuzzFactor:.5,timeout:0}}function Ka(a,b,c){if(a.g)if(a.g()||0==c)b();else{var d=Math.min(200,c);La(function(){Ka(this,b,c-d)}.bind(a),d)}else La(b,c)}function La(a,b){window.setTimeout(a,b)};function Ma(a,b,c,d,e){var f=e in d,g;for(g in b){var h=e+"."+g,k=f?d[e]:c[g];if(f||g in a)void 0===b[g]?void 0===k||f?delete a[g]:a[g]=k:k.constructor==Object&&b[g]&&b[g].constructor==Object?(a[g]||(a[g]=k),Ma(a[g],b[g],k,d,h)):typeof b[g]==typeof k&&null!=b[g]&&b[g].constructor==k.constructor&&(a[g]=b[g])}}
function Na(a){function b(a){switch(typeof a){case "undefined":case "boolean":case "number":case "string":case "symbol":case "function":return a;default:if(!a)return a;if(0<=c.indexOf(a))return null;var d=a.constructor==Array;if(a.constructor!=Object&&!d)return null;c.push(a);var f=d?[]:{},g;for(g in a)f[g]=b(a[g]);d&&(f.length=a.length);return f}}var c=[];return b(a)};function Oa(a,b){return a.reduce(function(a,b,e){return b["catch"](a.bind(null,e))}.bind(null,b),Promise.reject())}function Pa(a,b){return a.concat(b)}function Qa(){}function Ra(a){return null!=a}function Sa(a,b,c){return c.indexOf(a)==b};function x(a){this.f=!1;this.a=[];this.b=[];this.c=[];this.g=a||null}n("shaka.net.NetworkingEngine",x);x.RequestType={MANIFEST:0,SEGMENT:1,LICENSE:2,APP:3};x.PluginPriority={Ze:1,af:2,We:3};var Ta={};function Ua(a,b,c){c=c||3;var d=Ta[a];if(!d||c>=d.je)Ta[a]={je:c,he:b}}x.registerScheme=Ua;x.unregisterScheme=function(a){delete Ta[a]};x.prototype.le=function(a){this.b.push(a)};x.prototype.registerRequestFilter=x.prototype.le;x.prototype.Pe=function(a){var b=this.b;a=b.indexOf(a);0<=a&&b.splice(a,1)};
x.prototype.unregisterRequestFilter=x.prototype.Pe;x.prototype.bd=function(){this.b=[]};x.prototype.clearAllRequestFilters=x.prototype.bd;x.prototype.me=function(a){this.c.push(a)};x.prototype.registerResponseFilter=x.prototype.me;x.prototype.Qe=function(a){var b=this.c;a=b.indexOf(a);0<=a&&b.splice(a,1)};x.prototype.unregisterResponseFilter=x.prototype.Qe;x.prototype.cd=function(){this.c=[]};x.prototype.clearAllResponseFilters=x.prototype.cd;
function Va(a,b){return{uris:a,method:"GET",body:null,headers:{},allowCrossSiteCredentials:!1,retryParameters:b}}x.prototype.destroy=function(){this.f=!0;this.b=[];this.c=[];for(var a=[],b=0;b<this.a.length;++b)a.push(this.a[b]["catch"](Qa));return Promise.all(a)};x.prototype.destroy=x.prototype.destroy;
x.prototype.request=function(a,b,c){var d=c||function(){return!1};if(this.f)return Promise.reject();b.method=b.method||"GET";b.headers=b.headers||{};b.retryParameters=b.retryParameters?Na(b.retryParameters):Ia();b.uris=Na(b.uris);var e=Date.now(),f=Promise.resolve();this.b.forEach(function(c){f=f.then(c.bind(null,a,b))});f=f["catch"](function(a){throw new p(2,1,1006,a);});f=f.then(function(){var f=Date.now()-e,h=new Ha(b.retryParameters,!1,c);return Ja(h).then(function(){return Wa(this,a,b,h,0,f,
d)}.bind(this))}.bind(this));this.a.push(f);return f.then(function(b){0<=this.a.indexOf(f)&&this.a.splice(this.a.indexOf(f),1);this.g&&!b.fromCache&&1==a&&this.g(b.timeMs,b.data.byteLength);return b}.bind(this))["catch"](function(a){a&&(a.severity=2);0<=this.a.indexOf(f)&&this.a.splice(this.a.indexOf(f),1);return Promise.reject(a)}.bind(this))};x.prototype.request=x.prototype.request;
function Wa(a,b,c,d,e,f,g){if(a.f||g())return Promise.reject();var h=new ta(c.uris[e]),k=h.fa;k||(k=location.protocol,k=k.slice(0,-1),ua(h,k),c.uris[e]=h.toString());k=(k=Ta[k])?k.he:null;if(!k)return Promise.reject(new p(2,1,1E3,h));var m=Date.now();return k(c.uris[e],c,b).then(function(a){void 0==a.timeMs&&(a.timeMs=Date.now()-m);var c=Date.now(),d=Promise.resolve();this.c.forEach(function(c){d=d.then(function(){return Promise.resolve(c(b,a))}.bind(this))}.bind(this));d=d["catch"](function(a){var b=
2;a instanceof p&&(b=a.severity);throw new p(b,1,1007,a);});return d.then(function(){a.timeMs+=Date.now()-c;a.timeMs+=f;return a})}.bind(a))["catch"](function(a){if(a&&1==a.severity)return e=(e+1)%c.uris.length,g()?Promise.reject():Ja(d).then(function(){return Wa(this,b,c,d,e,f,g)}.bind(this),function(){throw a;});throw a;}.bind(a))};function Xa(a,b){for(var c=[],d=0;d<a.length;++d){for(var e=!1,f=0;f<c.length&&!(e=b?b(a[d],c[f]):a[d]===c[f]);++f);e||c.push(a[d])}return c}function Ya(a,b,c){for(var d=0;d<a.length;++d)if(c(a[d],b))return d;return-1}function Za(a,b){var c=a.indexOf(b);-1<c&&a.splice(c,1)}function $a(a,b){var c=0;a.forEach(function(a){c+=b(a)?1:0});return c};function ab(){this.a={}}ab.prototype.push=function(a,b){this.a.hasOwnProperty(a)?this.a[a].push(b):this.a[a]=[b]};ab.prototype.get=function(a){return(a=this.a[a])?a.slice():null};ab.prototype.remove=function(a,b){var c=this.a[a];if(c)for(var d=0;d<c.length;++d)c[d]==b&&(c.splice(d,1),--d)};function z(){this.a=new ab}z.prototype.destroy=function(){bb(this);this.a=null;return Promise.resolve()};function A(a,b,c,d){a.a&&(b=new cb(b,c,d),a.a.push(c,b))}function db(a,b,c,d){A(a,b,c,function(a){this.ia(b,c);d(a)}.bind(a))}z.prototype.ia=function(a,b){if(this.a)for(var c=this.a.get(b)||[],d=0;d<c.length;++d){var e=c[d];e.target==a&&(e.ia(),this.a.remove(b,e))}};function bb(a){if(a.a){var b=a.a,c=[],d;for(d in b.a)c.push.apply(c,b.a[d]);for(b=0;b<c.length;++b)c[b].ia();a.a.a={}}}
function cb(a,b,c){this.target=a;this.type=b;this.a=c;this.target.addEventListener(b,c,!1)}cb.prototype.ia=function(){this.target.removeEventListener(this.type,this.a,!1);this.a=this.target=null};function B(a,b){var c=b||{},d;for(d in c)this[d]=c[d];this.defaultPrevented=this.cancelable=this.bubbles=!1;this.timeStamp=window.performance&&window.performance.now?window.performance.now():Date.now();this.type=a;this.isTrusted=!1;this.target=this.currentTarget=null;this.a=!1}B.prototype.preventDefault=function(){this.cancelable&&(this.defaultPrevented=!0)};B.prototype.stopImmediatePropagation=function(){this.a=!0};B.prototype.stopPropagation=function(){};function C(a,b){if(0==b.length)return a;var c=b.map(function(a){return new ta(a)});return a.map(function(a){return new ta(a)}).map(function(a){return c.map(a.resolve.bind(a))}).reduce(Pa,[]).map(function(a){return a.toString()})}function eb(a,b){return{keySystem:a,licenseServerUri:"",distinctiveIdentifierRequired:!1,persistentStateRequired:!1,audioRobustness:"",videoRobustness:"",serverCertificate:null,initData:b||[],keyIds:[]}}var fb=1/15;function gb(a){return!a||0==Object.keys(a).length}function hb(a){return Object.keys(a).map(function(b){return a[b]})}function ib(a,b){return Object.keys(a).every(function(c){return b(c,a[c])})}function jb(a,b){Object.keys(a).forEach(function(c){b(c,a[c])})};function kb(a,b){var c=a;b&&(c+='; codecs="'+b+'"');return c}var lb={codecs:"codecs",frameRate:"framerate",bandwidth:"bitrate",width:"width",height:"height",channelsCount:"channels"};function D(a){if(!a)return"";a=new Uint8Array(a);239==a[0]&&187==a[1]&&191==a[2]&&(a=a.subarray(3));a=escape(mb(a));try{return decodeURIComponent(a)}catch(b){throw new p(2,2,2004);}}n("shaka.util.StringUtils.fromUTF8",D);
function nb(a,b,c){if(!a)return"";if(!c&&0!=a.byteLength%2)throw new p(2,2,2004);if(a instanceof ArrayBuffer)var d=a;else c=new Uint8Array(a.byteLength),c.set(new Uint8Array(a)),d=c.buffer;a=Math.floor(a.byteLength/2);c=new Uint16Array(a);d=new DataView(d);for(var e=0;e<a;e++)c[e]=d.getUint16(2*e,b);return mb(c)}n("shaka.util.StringUtils.fromUTF16",nb);
function ob(a){var b=new Uint8Array(a);if(239==b[0]&&187==b[1]&&191==b[2])return D(b);if(254==b[0]&&255==b[1])return nb(b.subarray(2),!1);if(255==b[0]&&254==b[1])return nb(b.subarray(2),!0);var c=function(a,b){return a.byteLength<=b||32<=a[b]&&126>=a[b]}.bind(null,b);if(0==b[0]&&0==b[2])return nb(a,!1);if(0==b[1]&&0==b[3])return nb(a,!0);if(c(0)&&c(1)&&c(2)&&c(3))return D(a);throw new p(2,2,2003);}n("shaka.util.StringUtils.fromBytesAutoDetect",ob);
function pb(a){a=encodeURIComponent(a);a=unescape(a);for(var b=new Uint8Array(a.length),c=0;c<a.length;++c)b[c]=a.charCodeAt(c);return b.buffer}n("shaka.util.StringUtils.toUTF8",pb);function mb(a){for(var b="",c=0;c<a.length;c+=16E3)b+=String.fromCharCode.apply(null,a.subarray(c,c+16E3));return b};function qb(a){this.a=null;this.b=function(){this.a=null;a()}.bind(this)}qb.prototype.cancel=function(){null!=this.a&&(clearTimeout(this.a),this.a=null)};function rb(a,b){a.cancel();a.a=setTimeout(a.b,1E3*b)}function sb(a,b){a.cancel();var c=function(){this.b();this.a=setTimeout(c,1E3*b)}.bind(a);a.a=setTimeout(c,1E3*b)};function tb(a,b){var c=void 0==b?!0:b,d=window.btoa(String.fromCharCode.apply(null,a)).replace(/\+/g,"-").replace(/\//g,"_");return c?d:d.replace(/=*$/,"")}n("shaka.util.Uint8ArrayUtils.toBase64",tb);function ub(a){a=window.atob(a.replace(/-/g,"+").replace(/_/g,"/"));for(var b=new Uint8Array(a.length),c=0;c<a.length;++c)b[c]=a.charCodeAt(c);return b}n("shaka.util.Uint8ArrayUtils.fromBase64",ub);
function vb(a){for(var b=new Uint8Array(a.length/2),c=0;c<a.length;c+=2)b[c/2]=window.parseInt(a.substr(c,2),16);return b}n("shaka.util.Uint8ArrayUtils.fromHex",vb);function wb(a){for(var b="",c=0;c<a.length;++c){var d=a[c].toString(16);1==d.length&&(d="0"+d);b+=d}return b}n("shaka.util.Uint8ArrayUtils.toHex",wb);function xb(a,b){if(!a&&!b)return!0;if(!a||!b||a.length!=b.length)return!1;for(var c=0;c<a.length;++c)if(a[c]!=b[c])return!1;return!0}n("shaka.util.Uint8ArrayUtils.equal",xb);
function yb(a){for(var b=0,c=0;c<arguments.length;++c)b+=arguments[c].length;b=new Uint8Array(b);var d=0;for(c=0;c<arguments.length;++c)b.set(arguments[c],d),d+=arguments[c].length;return b}n("shaka.util.Uint8ArrayUtils.concat",yb);function zb(a){this.s=a;this.l=this.j=this.u=null;this.L=!1;this.b=null;this.g=new z;this.a=[];this.m=[];this.i=new u;this.f=null;this.h=function(b){this.i.reject(b);a.onError(b)}.bind(this);this.A={};this.I=new qb(this.ke.bind(this));this.da=this.c=!1;this.K=[];this.ca=!1;this.w=new qb(this.ie.bind(this));sb(this.w,1);this.i["catch"](function(){})}l=zb.prototype;
l.destroy=function(){this.c=!0;var a=[];this.a.forEach(function(b){b=b.ga.close()["catch"](Qa);var c=new Promise(function(a){setTimeout(a,1E3)});a.push(Promise.race([b,c]))});this.i.reject();this.g&&a.push(this.g.destroy());this.l&&a.push(this.l.setMediaKeys(null)["catch"](Qa));this.w&&(this.w.cancel(),this.w=null);this.I&&(this.I.cancel(),this.I=null);this.g=this.l=this.j=this.u=this.b=null;this.a=[];this.m=[];this.s=this.h=this.f=null;return Promise.all(a)};l.configure=function(a){this.f=a};
l.init=function(a,b){var c={},d=[];this.da=b;this.m=a.offlineSessionIds;Ab(this,a,b||0<a.offlineSessionIds.length,c,d);return d.length?Bb(this,c,d):(this.L=!0,Promise.resolve())};
function Cb(a,b){if(!a.j)return db(a.g,b,"encrypted",function(){this.h(new p(2,6,6010))}.bind(a)),Promise.resolve();a.l=b;db(a.g,a.l,"play",a.Nd.bind(a));var c=a.l.setMediaKeys(a.j);c=c["catch"](function(a){return Promise.reject(new p(2,6,6003,a.message))});var d=null;a.b.serverCertificate&&a.b.serverCertificate.length&&(d=a.j.setServerCertificate(a.b.serverCertificate).then(function(){})["catch"](function(a){return Promise.reject(new p(2,6,6004,a.message))}));return Promise.all([c,d]).then(function(){if(this.c)return Promise.reject();
Db(this);this.b.initData.length||this.m.length||A(this.g,this.l,"encrypted",this.Cd.bind(this))}.bind(a))["catch"](function(a){return this.c?Promise.resolve():Promise.reject(a)}.bind(a))}function Eb(a,b){return Promise.all(b.map(function(a){return Fb(this,a).then(function(a){if(a){for(var b=new u,c=0;c<this.a.length;c++)if(this.a[c].ga==a){this.a[c].ma=b;break}return Promise.all([a.remove(),b])}}.bind(this))}.bind(a)))}
function Db(a){var b=a.b?a.b.initData:[];b.forEach(function(a){Gb(this,a.initDataType,a.initData)}.bind(a));a.m.forEach(function(a){Fb(this,a)}.bind(a));b.length||a.m.length||a.i.resolve();return a.i}l.keySystem=function(){return this.b?this.b.keySystem:""};function Hb(a){return a.a.map(function(a){return a.ga.sessionId})}l.ub=function(){var a=this.a.map(function(a){a=a.ga.expiration;return isNaN(a)?Infinity:a});return Math.min.apply(Math,a)};
function Ab(a,b,c,d,e){var f=Ib(a),g=Jb(a,b);b.periods.forEach(function(a){a.variants.forEach(function(a){f&&(a.drmInfos=[f]);g&&(a.drmInfos=g);a.drmInfos.forEach(function(b){Kb(this,b);window.cast&&window.cast.__platform__&&"com.microsoft.playready"==b.keySystem&&(b.keySystem="com.chromecast.playready");var f=d[b.keySystem];f||(f={audioCapabilities:[],videoCapabilities:[],distinctiveIdentifier:"optional",persistentState:c?"required":"optional",sessionTypes:[c?"persistent-license":"temporary"],label:b.keySystem,
drmInfos:[]},d[b.keySystem]=f,e.push(b.keySystem));f.drmInfos.push(b);b.distinctiveIdentifierRequired&&(f.distinctiveIdentifier="required");b.persistentStateRequired&&(f.persistentState="required");var g=[];a.video&&g.push(a.video);a.audio&&g.push(a.audio);g.forEach(function(a){("video"==a.type?f.videoCapabilities:f.audioCapabilities).push({robustness:("video"==a.type?b.videoRobustness:b.audioRobustness)||"",contentType:kb(a.mimeType,a.codecs)})}.bind(this))}.bind(this))}.bind(this))}.bind(a))}
function Bb(a,b,c){if(1==c.length&&""==c[0])return Promise.reject(new p(2,6,6E3));var d=new u,e=d;[!0,!1].forEach(function(a){c.forEach(function(c){var d=b[c];d.drmInfos.some(function(a){return!!a.licenseServerUri})==a&&(0==d.audioCapabilities.length&&delete d.audioCapabilities,0==d.videoCapabilities.length&&delete d.videoCapabilities,e=e["catch"](function(){return this.c?Promise.reject():navigator.requestMediaKeySystemAccess(c,[d])}.bind(this)))}.bind(this))}.bind(a));e=e["catch"](function(){return Promise.reject(new p(2,
6,6001))});e=e.then(function(a){if(this.c)return Promise.reject();var c=0<=navigator.userAgent.indexOf("Edge/"),d=a.getConfiguration();this.u=(d.audioCapabilities||[]).concat(d.videoCapabilities||[]).map(function(a){return a.contentType});c&&(this.u=null);c=b[a.keySystem];Lb(this,a.keySystem,c,c.drmInfos);return this.b.licenseServerUri?a.createMediaKeys():Promise.reject(new p(2,6,6012))}.bind(a)).then(function(a){if(this.c)return Promise.reject();this.j=a;this.L=!0}.bind(a))["catch"](function(a){if(this.c)return Promise.resolve();
this.u=this.b=null;return a instanceof p?Promise.reject(a):Promise.reject(new p(2,6,6002,a.message))}.bind(a));d.reject();return e}
function Kb(a,b){var c=b.keySystem;if(c){if(!b.licenseServerUri){var d=a.f.servers[c];d&&(b.licenseServerUri=d)}b.keyIds||(b.keyIds=[]);if(c=a.f.advanced[c])b.distinctiveIdentifierRequired||(b.distinctiveIdentifierRequired=c.distinctiveIdentifierRequired),b.persistentStateRequired||(b.persistentStateRequired=c.persistentStateRequired),b.videoRobustness||(b.videoRobustness=c.videoRobustness),b.audioRobustness||(b.audioRobustness=c.audioRobustness),b.serverCertificate||(b.serverCertificate=c.serverCertificate)}}
function Ib(a){if(gb(a.f.clearKeys))return null;var b=[],c=[],d;for(d in a.f.clearKeys){var e=a.f.clearKeys[d],f=vb(d);e=vb(e);f={kty:"oct",kid:tb(f,!1),k:tb(e,!1)};b.push(f);c.push(f.kid)}a=JSON.stringify({keys:b});c=JSON.stringify({kids:c});c=[{initData:new Uint8Array(pb(c)),initDataType:"keyids"}];return{keySystem:"org.w3.clearkey",licenseServerUri:"data:application/json;base64,"+window.btoa(a),distinctiveIdentifierRequired:!1,persistentStateRequired:!1,audioRobustness:"",videoRobustness:"",serverCertificate:null,
initData:c,keyIds:[]}}function Jb(a,b){var c=a.f,d=Object.keys(c.servers);return!d.length||b.periods.some(function(a){return a.variants.some(function(a){return a.drmInfos.length})})?null:d.map(function(a){return{keySystem:a,licenseServerUri:c.servers[a],distinctiveIdentifierRequired:!1,persistentStateRequired:!1,audioRobustness:"",videoRobustness:"",serverCertificate:null,initData:[],keyIds:[]}})}
function Lb(a,b,c,d){var e=[],f=[],g=[],h=[];Mb(d,e,f,g,h);a.b={keySystem:b,licenseServerUri:e[0],distinctiveIdentifierRequired:"required"==c.distinctiveIdentifier,persistentStateRequired:"required"==c.persistentState,audioRobustness:c.audioCapabilities?c.audioCapabilities[0].robustness:"",videoRobustness:c.videoCapabilities?c.videoCapabilities[0].robustness:"",serverCertificate:f[0],initData:g,keyIds:h}}
function Mb(a,b,c,d,e){function f(a,b){return a.keyId&&a.keyId==b.keyId?!0:a.initDataType==b.initDataType&&xb(a.initData,b.initData)}a.forEach(function(a){-1==b.indexOf(a.licenseServerUri)&&b.push(a.licenseServerUri);a.serverCertificate&&-1==Ya(c,a.serverCertificate,xb)&&c.push(a.serverCertificate);a.initData&&a.initData.forEach(function(a){-1==Ya(d,a,f)&&d.push(a)});if(a.keyIds)for(var g=0;g<a.keyIds.length;++g)-1==e.indexOf(a.keyIds[g])&&e.push(a.keyIds[g])})}
l.Cd=function(a){for(var b=new Uint8Array(a.initData),c=0;c<this.a.length;++c)if(xb(b,this.a[c].initData))return;Gb(this,a.initDataType,b)};
function Fb(a,b){try{var c=a.j.createSession("persistent-license")}catch(f){var d=new p(2,6,6005,f.message);a.h(d);return Promise.reject(d)}A(a.g,c,"message",a.Cc.bind(a));A(a.g,c,"keystatuseschange",a.yc.bind(a));var e={initData:null,ga:c,loaded:!1,Sb:Infinity,ma:null};a.a.push(e);return c.load(b).then(function(a){if(!this.c){if(a)return e.loaded=!0,this.a.every(function(a){return a.loaded})&&this.i.resolve(),c;this.a.splice(this.a.indexOf(e),1);this.h(new p(2,6,6013))}}.bind(a),function(a){this.c||
(this.a.splice(this.a.indexOf(e),1),this.h(new p(2,6,6005,a.message)))}.bind(a))}
function Gb(a,b,c){try{var d=a.da?a.j.createSession("persistent-license"):a.j.createSession()}catch(e){a.h(new p(2,6,6005,e.message));return}A(a.g,d,"message",a.Cc.bind(a));A(a.g,d,"keystatuseschange",a.yc.bind(a));a.a.push({initData:c,ga:d,loaded:!1,Sb:Infinity,ma:null});d.generateRequest(b,c.buffer)["catch"](function(a){if(!this.c){for(var b=0;b<this.a.length;++b)if(this.a[b].ga==d){this.a.splice(b,1);break}this.h(new p(2,6,6006,a.message))}}.bind(a))}
l.Cc=function(a){this.f.delayLicenseRequestUntilPlayed&&this.l.paused&&!this.ca?this.K.push(a):Nb(this,a)};
function Nb(a,b){for(var c=b.target,d,e=0;e<a.a.length;e++)if(a.a[e].ga==c){d=a.a[e];break}e=Va([a.b.licenseServerUri],a.f.retryParameters);e.body=b.message;e.method="POST";"com.microsoft.playready"!=a.b.keySystem&&"com.chromecast.playready"!=a.b.keySystem||Ob(e);a.s.Ya.request(2,e).then(function(a){return this.c?Promise.reject():c.update(a.data).then(function(){this.s.onEvent(new B("drmsessionupdate"));d&&(d.ma&&d.ma.resolve(),setTimeout(function(){d.loaded=!0;this.a.every(function(a){return a.loaded})&&
this.i.resolve()}.bind(this),5E3))}.bind(this))}.bind(a),function(a){if(this.c)return Promise.resolve();a=new p(2,6,6007,a);this.h(a);d&&d.ma&&d.ma.reject(a)}.bind(a))["catch"](function(a){if(this.c)return Promise.resolve();a=new p(2,6,6008,a.message);this.h(a);d&&d.ma&&d.ma.reject(a)}.bind(a))}
function Ob(a){var b=nb(a.body,!0,!0);if(-1==b.indexOf("PlayReadyKeyMessage"))a.headers["Content-Type"]="text/xml; charset=utf-8";else{b=(new DOMParser).parseFromString(b,"application/xml");for(var c=b.getElementsByTagName("HttpHeader"),d=0;d<c.length;++d)a.headers[c[d].querySelector("name").textContent]=c[d].querySelector("value").textContent;a.body=ub(b.querySelector("Challenge").textContent).buffer}}
l.yc=function(a){a=a.target;var b;for(b=0;b<this.a.length&&this.a[b].ga!=a;++b);if(b!=this.a.length){var c=!1;a.keyStatuses.forEach(function(a,d){if("string"==typeof d){var e=d;d=a;a=e}if("com.microsoft.playready"==this.b.keySystem&&16==d.byteLength){e=new DataView(d);var f=e.getUint32(0,!0),k=e.getUint16(4,!0),m=e.getUint16(6,!0);e.setUint32(0,f,!1);e.setUint16(4,k,!1);e.setUint16(6,m,!1)}"com.microsoft.playready"==this.b.keySystem&&"status-pending"==a&&(a="usable");"status-pending"!=a&&(this.a[b].loaded=
!0,this.a.every(function(a){return a.loaded})&&this.i.resolve());"expired"==a&&(c=!0);e=wb(new Uint8Array(d));this.A[e]=a}.bind(this));var d=a.expiration-Date.now();(0>d||c&&1E3>d)&&!this.a[b].ma&&(this.a.splice(b,1),a.close());rb(this.I,.5)}};l.ke=function(){function a(a,c){return"expired"==c}!gb(this.A)&&ib(this.A,a)&&this.h(new p(2,6,6014));this.s.Tb(this.A)};
function Pb(){var a=[],b=[{contentType:'video/mp4; codecs="avc1.42E01E"'},{contentType:'video/webm; codecs="vp8"'}],c=[{videoCapabilities:b,persistentState:"required",sessionTypes:["persistent-license"]},{videoCapabilities:b}],d={};"org.w3.clearkey com.widevine.alpha com.microsoft.playready com.apple.fps.2_0 com.apple.fps.1_0 com.apple.fps com.adobe.primetime".split(" ").forEach(function(b){var e=navigator.requestMediaKeySystemAccess(b,c).then(function(a){var c=a.getConfiguration().sessionTypes;c=
c?0<=c.indexOf("persistent-license"):!1;0<=navigator.userAgent.indexOf("Tizen 3")&&(c=!1);d[b]={persistentState:c};return a.createMediaKeys()})["catch"](function(){d[b]=null});a.push(e)});return Promise.all(a).then(function(){return d})}l.Nd=function(){for(var a=0;a<this.K.length;a++)Nb(this,this.K[a]);this.ca=!0;this.K=[]};function Qb(a,b){var c=a.keySystem();return 0==b.drmInfos.length||b.drmInfos.some(function(a){return a.keySystem==c})}
function Rb(a,b){if(!a.length)return b;if(!b.length)return a;for(var c=[],d=0;d<a.length;d++)for(var e=0;e<b.length;e++)if(a[d].keySystem==b[e].keySystem){var f=a[d];e=b[e];var g=[];g=g.concat(f.initData||[]);g=g.concat(e.initData||[]);var h=[];h=h.concat(f.keyIds);h=h.concat(e.keyIds);c.push({keySystem:f.keySystem,licenseServerUri:f.licenseServerUri||e.licenseServerUri,distinctiveIdentifierRequired:f.distinctiveIdentifierRequired||e.distinctiveIdentifierRequired,persistentStateRequired:f.persistentStateRequired||
e.persistentStateRequired,videoRobustness:f.videoRobustness||e.videoRobustness,audioRobustness:f.audioRobustness||e.audioRobustness,serverCertificate:f.serverCertificate||e.serverCertificate,initData:g,keyIds:h});break}return c}l.ie=function(){this.a.forEach(function(a){var b=a.Sb,c=a.ga.expiration;isNaN(c)&&(c=Infinity);c!=b&&(this.s.onExpirationUpdated(a.ga.sessionId,c),a.Sb=c)}.bind(this))};function Sb(a){return!a||1==a.length&&1E-6>a.end(0)-a.start(0)?null:a.length?a.end(a.length-1):null}function Tb(a,b){return!a||!a.length||1==a.length&&1E-6>a.end(0)-a.start(0)?!1:b>=a.start(0)&&b<=a.end(a.length-1)}function Ub(a,b){if(!a||!a.length||1==a.length&&1E-6>a.end(0)-a.start(0))return 0;for(var c=0,d=a.length-1;0<=d&&a.end(d)>b;--d)c+=a.end(d)-Math.max(a.start(d),b);return c}function Vb(a){if(!a)return[];for(var b=[],c=0;c<a.length;c++)b.push({start:a.start(c),end:a.end(c)});return b};function Wb(){this.a=new muxjs.mp4.Transmuxer({keepOriginalTimestamps:!0});this.b=null;this.c=[];this.a.on("data",this.g.bind(this));this.a.on("done",this.f.bind(this))}Wb.prototype.destroy=function(){this.a.dispose();this.a=null;return Promise.resolve()};function Xb(a,b){return window.muxjs&&"mp2t"==a.split(";")[0].split("/")[1]?b?MediaSource.isTypeSupported(Yb(b,a)):MediaSource.isTypeSupported(Yb("audio",a))||MediaSource.isTypeSupported(Yb("video",a)):!1}
function Yb(a,b){var c=b.replace("mp2t","mp4");"audio"==a&&(c=c.replace("video","audio"));var d=/avc1\.(66|77|100)\.(\d+)/.exec(c);if(d){var e="avc1.",f=d[1],g=Number(d[2]);e=("66"==f?e+"4200":"77"==f?e+"4d00":e+"6400")+(g>>4).toString(16);e+=(g&15).toString(16);c=c.replace(d[0],e)}return c}function Zb(a,b){a.b=new u;a.c=[];var c=new Uint8Array(b);a.a.push(c);a.a.flush();return a.b}
Wb.prototype.g=function(a){var b=new Uint8Array(a.data.byteLength+a.initSegment.byteLength);b.set(a.initSegment,0);b.set(a.data,a.initSegment.byteLength);this.c.push(b)};Wb.prototype.f=function(){var a=yb.apply(null,this.c);this.b.resolve(a)};function $b(a){this.c=null;this.f=a;this.i=this.g=0;this.h=Infinity;this.b=this.a=null}var E={};n("shaka.text.TextEngine.registerParser",function(a,b){E[a]=b});n("shaka.text.TextEngine.unregisterParser",function(a){delete E[a]});$b.prototype.destroy=function(){this.f=this.c=null;return Promise.resolve()};$b.prototype.ze=function(a){this.f=a};$b.prototype.setDisplayer=$b.prototype.ze;
$b.prototype.Kb=function(a){var b={periodStart:0,segmentStart:null,segmentEnd:0};try{return this.c.parseMedia(new Uint8Array(a),b)[0].startTime}catch(c){throw new p(2,2,2009,c);}};
function ac(a,b,c,d){return Promise.resolve().then(function(){if(this.c&&this.f)if(null==c||null==d)this.c.parseInit(new Uint8Array(b));else{var a={periodStart:this.g,segmentStart:this.g+c,segmentEnd:this.g+d};a=this.c.parseMedia(new Uint8Array(b),a).filter(function(a){return a.startTime>=this.i&&a.startTime<this.h}.bind(this));this.f.append(a);null==this.a&&(this.a=Math.max(c,this.i));this.b=Math.min(d,this.h)}}.bind(a))}
$b.prototype.remove=function(a,b){return Promise.resolve().then(function(){!this.f||!this.f.remove(a,b)||null==this.a||b<=this.a||a>=this.b||(a<=this.a&&b>=this.b?this.a=this.b=null:a<=this.a&&b<this.b?this.a=b:a>this.a&&b>=this.b&&(this.b=a))}.bind(this))};function bc(a,b,c){this.g=a;this.f=b;this.l=c;this.b={};this.a=null;this.c={};this.i=new z;this.j=!1;this.h={}}
function cc(){var a={};'video/mp4; codecs="avc1.42E01E",video/mp4; codecs="avc3.42E01E",video/mp4; codecs="hev1.1.6.L93.90",video/mp4; codecs="hvc1.1.6.L93.90",video/mp4; codecs="hev1.2.4.L153.B0"; eotf="smpte2084",video/mp4; codecs="hvc1.2.4.L153.B0"; eotf="smpte2084",video/mp4; codecs="vp9",video/mp4; codecs="vp09.00.10.08",audio/mp4; codecs="mp4a.40.2",audio/mp4; codecs="ac-3",audio/mp4; codecs="ec-3",audio/mp4; codecs="opus",audio/mp4; codecs="flac",video/webm; codecs="vp8",video/webm; codecs="vp9",video/webm; codecs="av1",audio/webm; codecs="vorbis",audio/webm; codecs="opus",video/mp2t; codecs="avc1.42E01E",video/mp2t; codecs="avc3.42E01E",video/mp2t; codecs="hvc1.1.6.L93.90",video/mp2t; codecs="mp4a.40.2",video/mp2t; codecs="ac-3",video/mp2t; codecs="ec-3",text/vtt,application/mp4; codecs="wvtt",application/ttml+xml,application/mp4; codecs="stpp"'.split(",").forEach(function(b){a[b]=!!E[b]||
MediaSource.isTypeSupported(b)||Xb(b);var c=b.split(";")[0];a[c]=a[c]||a[b]});return a}l=bc.prototype;l.destroy=function(){this.j=!0;var a=[],b;for(b in this.c){var c=this.c[b],d=c[0];this.c[b]=c.slice(0,1);d&&a.push(d.p["catch"](Qa));for(d=1;d<c.length;++d)c[d].p["catch"](Qa),c[d].p.reject()}this.a&&a.push(this.a.destroy());for(b in this.h)a.push(this.h[b].destroy());return Promise.all(a).then(function(){this.i.destroy();this.l=this.a=this.f=this.g=this.i=null;this.b={};this.h={};this.c={}}.bind(this))};
l.init=function(a){for(var b in a){var c=a[b];c=kb(c.mimeType,c.codecs);"text"==b?dc(this,c):(!MediaSource.isTypeSupported(c)&&Xb(c,b)&&(this.h[b]=new Wb,c=Yb(b,c)),c=this.f.addSourceBuffer(c),A(this.i,c,"error",this.Le.bind(this,b)),A(this.i,c,"updateend",this.Ma.bind(this,b)),this.b[b]=c,this.c[b]=[])}};function dc(a,b){a.a||(a.a=new $b(a.l));a.a.c=new E[b]}
function ec(a,b){if("text"==b)var c=a.a.a;else c=fc(a,b),c=!c||1==c.length&&1E-6>c.end(0)-c.start(0)?null:1==c.length&&0>c.start(0)?0:c.length?c.start(0):null;return c}l.Gb=function(){var a=this.a&&null!=this.a.a?[{start:this.a.a,end:this.a.b}]:[];return{total:Vb(this.g.buffered),audio:Vb(fc(this,"audio")),video:Vb(fc(this,"video")),text:a}};function fc(a,b){try{return a.b[b].buffered}catch(c){return null}}
function gc(a,b,c,d,e){return"text"==b?ac(a.a,c,d,e):a.h[b]?Zb(a.h[b],c).then(function(a){return hc(this,b,this.Rc.bind(this,b,a.buffer))}.bind(a)):hc(a,b,a.Rc.bind(a,b,c))}l.remove=function(a,b,c){return"text"==a?this.a.remove(b,c):hc(this,a,this.Sc.bind(this,a,b,c))};function ic(a,b){return"text"==b?a.a?a.a.remove(0,Infinity):Promise.resolve():hc(a,b,a.Sc.bind(a,b,0,a.f.duration))}
function jc(a,b,c,d,e){return"text"==b?(a.a.g=c,a=a.a,a.i=d,a.h=e,Promise.resolve()):Promise.all([hc(a,b,a.Yc.bind(a,b)),hc(a,b,a.Be.bind(a,b,c)),hc(a,b,a.ye.bind(a,b,d,e))])}l.endOfStream=function(a){return kc(this,function(){a?this.f.endOfStream(a):this.f.endOfStream()}.bind(this))};l.ha=function(a){return kc(this,function(){this.f.duration=a}.bind(this))};l.S=function(){return this.f.duration};l.Rc=function(a,b){this.b[a].appendBuffer(b)};
l.Sc=function(a,b,c){c<=b?this.Ma(a):this.b[a].remove(b,c)};l.Yc=function(a){var b=this.b[a].appendWindowStart,c=this.b[a].appendWindowEnd;this.b[a].abort();this.b[a].appendWindowStart=b;this.b[a].appendWindowEnd=c;this.Ma(a)};l.gd=function(a){this.g.currentTime-=.001;this.Ma(a)};l.Be=function(a,b){0>b&&(b+=.001);this.b[a].timestampOffset=b;this.Ma(a)};l.ye=function(a,b,c){this.b[a].appendWindowStart=0;this.b[a].appendWindowEnd=c;this.b[a].appendWindowStart=b;this.Ma(a)};
l.Le=function(a){this.c[a][0].p.reject(new p(2,3,3014,this.g.error?this.g.error.code:0))};l.Ma=function(a){var b=this.c[a][0];b&&(b.p.resolve(),lc(this,a))};function hc(a,b,c){if(a.j)return Promise.reject();c={start:c,p:new u};a.c[b].push(c);if(1==a.c[b].length)try{c.start()}catch(d){"QuotaExceededError"==d.name?c.p.reject(new p(2,3,3017,b)):c.p.reject(new p(2,3,3015,d)),lc(a,b)}return c.p}
function kc(a,b){if(a.j)return Promise.reject();var c=[],d;for(d in a.b){var e=new u,f={start:function(a){a.resolve()}.bind(null,e),p:e};a.c[d].push(f);c.push(e);1==a.c[d].length&&f.start()}return Promise.all(c).then(function(){var a;try{b()}catch(k){var c=Promise.reject(new p(2,3,3015,k))}for(a in this.b)lc(this,a);return c}.bind(a),function(){return Promise.reject()}.bind(a))}function lc(a,b){a.c[b].shift();var c=a.c[b][0];if(c)try{c.start()}catch(d){c.p.reject(new p(2,3,3015,d)),lc(a,b)}};function mc(a,b,c){return c==b||a>=nc&&c==b.split("-")[0]||a>=oc&&c.split("-")[0]==b.split("-")[0]?!0:!1}var nc=1,oc=2;function pc(a){a=a.toLowerCase().split("-");var b=qc[a[0]];b&&(a[0]=b);return a.join("-")}
var qc={aar:"aa",abk:"ab",afr:"af",aka:"ak",alb:"sq",amh:"am",ara:"ar",arg:"an",arm:"hy",asm:"as",ava:"av",ave:"ae",aym:"ay",aze:"az",bak:"ba",bam:"bm",baq:"eu",bel:"be",ben:"bn",bih:"bh",bis:"bi",bod:"bo",bos:"bs",bre:"br",bul:"bg",bur:"my",cat:"ca",ces:"cs",cha:"ch",che:"ce",chi:"zh",chu:"cu",chv:"cv",cor:"kw",cos:"co",cre:"cr",cym:"cy",cze:"cs",dan:"da",deu:"de",div:"dv",dut:"nl",dzo:"dz",ell:"el",eng:"en",epo:"eo",est:"et",eus:"eu",ewe:"ee",fao:"fo",fas:"fa",fij:"fj",fin:"fi",fra:"fr",fre:"fr",
fry:"fy",ful:"ff",geo:"ka",ger:"de",gla:"gd",gle:"ga",glg:"gl",glv:"gv",gre:"el",grn:"gn",guj:"gu",hat:"ht",hau:"ha",heb:"he",her:"hz",hin:"hi",hmo:"ho",hrv:"hr",hun:"hu",hye:"hy",ibo:"ig",ice:"is",ido:"io",iii:"ii",iku:"iu",ile:"ie",ina:"ia",ind:"id",ipk:"ik",isl:"is",ita:"it",jav:"jv",jpn:"ja",kal:"kl",kan:"kn",kas:"ks",kat:"ka",kau:"kr",kaz:"kk",khm:"km",kik:"ki",kin:"rw",kir:"ky",kom:"kv",kon:"kg",kor:"ko",kua:"kj",kur:"ku",lao:"lo",lat:"la",lav:"lv",lim:"li",lin:"ln",lit:"lt",ltz:"lb",lub:"lu",
lug:"lg",mac:"mk",mah:"mh",mal:"ml",mao:"mi",mar:"mr",may:"ms",mkd:"mk",mlg:"mg",mlt:"mt",mon:"mn",mri:"mi",msa:"ms",mya:"my",nau:"na",nav:"nv",nbl:"nr",nde:"nd",ndo:"ng",nep:"ne",nld:"nl",nno:"nn",nob:"nb",nor:"no",nya:"ny",oci:"oc",oji:"oj",ori:"or",orm:"om",oss:"os",pan:"pa",per:"fa",pli:"pi",pol:"pl",por:"pt",pus:"ps",que:"qu",roh:"rm",ron:"ro",rum:"ro",run:"rn",rus:"ru",sag:"sg",san:"sa",sin:"si",slk:"sk",slo:"sk",slv:"sl",sme:"se",smo:"sm",sna:"sn",snd:"sd",som:"so",sot:"st",spa:"es",sqi:"sq",
srd:"sc",srp:"sr",ssw:"ss",sun:"su",swa:"sw",swe:"sv",tah:"ty",tam:"ta",tat:"tt",tel:"te",tgk:"tg",tgl:"tl",tha:"th",tib:"bo",tir:"ti",ton:"to",tsn:"tn",tso:"ts",tuk:"tk",tur:"tr",twi:"tw",uig:"ug",ukr:"uk",urd:"ur",uzb:"uz",ven:"ve",vie:"vi",vol:"vo",wel:"cy",wln:"wa",wol:"wo",xho:"xh",yid:"yi",yor:"yo",zha:"za",zho:"zh",zul:"zu"};function rc(a,b,c){var d=a.video;return d&&(d.width<b.minWidth||d.width>b.maxWidth||d.width>c.width||d.height<b.minHeight||d.height>b.maxHeight||d.height>c.height||d.width*d.height<b.minPixels||d.width*d.height>b.maxPixels)||a.bandwidth<b.minBandwidth||a.bandwidth>b.maxBandwidth?!1:!0}function sc(a,b,c){var d=!1;a.variants.forEach(function(a){var e=a.allowedByApplication;a.allowedByApplication=rc(a,b,c);e!=a.allowedByApplication&&(d=!0)});return d}
function tc(a,b,c,d){d.variants=d.variants.filter(function(d){return a&&a.L&&!Qb(a,d)?!1:uc(d.audio,a,b)&&uc(d.video,a,c)});d.textStreams=d.textStreams.filter(function(a){return!!E[kb(a.mimeType,a.codecs)]})}
function uc(a,b,c){if(!a)return!0;var d=null;b&&b.L&&(d=b.u);b=kb(a.mimeType,a.codecs);var e=kb(a.mimeType,a.codecs),f=a.mimeType,g;for(g in lb){var h=a[g],k=lb[g];h&&(f+="; "+k+'="'+h+'"')}return!(E[e]||MediaSource.isTypeSupported(f)||Xb(e,a.type))||d&&a.encrypted&&0>d.indexOf(b)||c&&(a.mimeType!=c.mimeType||a.codecs.split(".")[0]!=c.codecs.split(".")[0])?!1:!0}
function vc(a){var b=a.audio,c=a.video,d=b?b.codecs:null,e=c?c.codecs:null,f=[];e&&f.push(e);d&&f.push(d);var g=[];c&&g.push(c.mimeType);b&&g.push(b.mimeType);g=g[0]||null;var h=[];b&&h.push(b.kind);c&&h.push(c.kind);h=h[0]||null;var k=[];b&&k.push.apply(k,b.roles);c&&k.push.apply(k,c.roles);k=Xa(k);a={id:a.id,active:!1,type:"variant",bandwidth:a.bandwidth,language:a.language,label:null,kind:h,width:null,height:null,frameRate:null,mimeType:g,codecs:f.join(", "),audioCodec:d,videoCodec:e,primary:a.primary,
roles:k,videoId:null,audioId:null,channelsCount:null,audioBandwidth:null,videoBandwidth:null};c&&(a.videoId=c.id,a.width=c.width||null,a.height=c.height||null,a.frameRate=c.frameRate||null,a.videoBandwidth=c.bandwidth||null);b&&(a.audioId=b.id,a.channelsCount=b.channelsCount,a.audioBandwidth=b.bandwidth||null,a.label=b.label);return a}
function wc(a){return{id:a.id,active:!1,type:"text",bandwidth:0,language:a.language,label:a.label,kind:a.kind||null,width:null,height:null,frameRate:null,mimeType:a.mimeType,codecs:a.codecs||null,audioCodec:null,videoCodec:null,primary:a.primary,roles:a.roles,videoId:null,audioId:null,channelsCount:null,audioBandwidth:null,videoBandwidth:null}}function xc(a){var b=[],c=yc(a.variants);a=a.textStreams;c.forEach(function(a){b.push(vc(a))});a.forEach(function(a){b.push(wc(a))});return b}
function zc(a,b,c){return yc(a.variants).map(function(a){var d=vc(a);a.video&&a.audio?d.active=c==a.video.id&&b==a.audio.id:a.video?d.active=c==a.video.id:a.audio&&(d.active=b==a.audio.id);return d})}function Ac(a,b){return a.textStreams.map(function(a){var c=wc(a);c.active=b==a.id;return c})}function Bc(a,b){for(var c=0;c<a.variants.length;c++)if(a.variants[c].id==b.id)return a.variants[c];return null}
function Cc(a,b){for(var c=0;c<a.textStreams.length;c++)if(a.textStreams[c].id==b.id)return a.textStreams[c];return null}function Dc(a){return a.allowedByApplication&&a.allowedByKeySystem}function yc(a){return a.filter(function(a){return Dc(a)})}
function Ec(a,b,c,d){var e=yc(a),f=e;a=e.filter(function(a){return a.primary});a.length&&(f=a);var g=f.length?f[0].language:"";f=f.filter(function(a){return a.language==g});if(b){var h=pc(b);[oc,nc,0].forEach(function(a){var b=!1;e.forEach(function(c){h=pc(h);var e=pc(c.language);mc(a,h,e)&&(b?f.push(c):(f=[c],b=!0),d&&(d.audio=!0))})})}if(c&&(b=Fc(f,c),b.length))return b;b=f.map(function(a){return(a.audio?a.audio.roles:[]).concat(a.video?a.video.roles:[])}).reduce(Pa,[]);return b.length?Fc(f,b[0]):
f}function Gc(a,b,c,d){var e=a,f=a.filter(function(a){return a.primary});f.length&&(e=f);var g=e.length?e[0].language:"";e=e.filter(function(a){return a.language==g});if(b){var h=pc(b);[oc,nc,0].forEach(function(b){var c=!1;a.forEach(function(a){var f=pc(a.language);mc(b,h,f)&&(c?e.push(a):(e=[a],c=!0),d&&(d.text=!0))})})}b=c?Hc(e,c):e.filter(function(a){return 0==a.roles.length});if(b.length)return b;b=e.map(function(a){return a.roles}).reduce(Pa,[]);return b.length?Hc(e,b[0]):e}
function Fc(a,b){return a.filter(function(a){return a.audio&&0<=a.audio.roles.indexOf(b)||a.video&&0<=a.video.roles.indexOf(b)})}function Hc(a,b){return a.filter(function(a){return 0<=a.roles.indexOf(b)})}function Ic(a,b,c){for(var d=0;d<c.length;d++)if(c[d].audio==a&&c[d].video==b)return c[d];return null}function Jc(a,b,c){function d(a,b){return null==a?null==b:b.id==a}for(var e=0;e<c.length;e++)if(d(a,c[e].audio)&&d(b,c[e].video))return c[e];return null}
function Kc(a,b){for(var c=a.periods.length-1;0<c;--c)if(b+fb>=a.periods[c].startTime)return c;return 0}function Lc(a,b){for(var c=0;c<a.periods.length;++c){var d=a.periods[c];if("text"==b.type)for(var e=0;e<d.textStreams.length;++e){if(d.textStreams[e]==b)return c}else for(e=0;e<d.variants.length;++e){var f=d.variants[e];if(f.audio==b||f.video==b||f.video&&f.video.trickModeVideo==b)return c}}return-1};function F(){this.h=null;this.c=!1;this.b=new pa;this.g=[];this.i=!1;this.a=this.f=null}n("shaka.abr.SimpleAbrManager",F);F.prototype.stop=function(){this.h=null;this.c=!1;this.g=[];this.f=null};F.prototype.stop=F.prototype.stop;F.prototype.init=function(a){this.h=a};F.prototype.init=F.prototype.init;
F.prototype.chooseVariant=function(){var a=Mc(this.a.restrictions,this.g),b=this.b.getBandwidthEstimate(this.a.defaultBandwidthEstimate);if(this.g.length&&!a.length)throw new p(2,4,4012);for(var c=a[0]||null,d=0;d<a.length;++d){var e=a[d],f=(a[d+1]||{bandwidth:Infinity}).bandwidth/this.a.bandwidthUpgradeTarget;b>=e.bandwidth/this.a.bandwidthDowngradeTarget&&b<=f&&(c=e)}this.f=Date.now();return c};F.prototype.chooseVariant=F.prototype.chooseVariant;F.prototype.enable=function(){this.c=!0};
F.prototype.enable=F.prototype.enable;F.prototype.disable=function(){this.c=!1};F.prototype.disable=F.prototype.disable;F.prototype.segmentDownloaded=function(a,b){var c=this.b;if(!(16E3>b)){var d=8E3*b/a,e=a/1E3;c.a+=b;na(c.b,e,d);na(c.c,e,d)}if(null!=this.f&&this.c)a:{if(!this.i){if(!(128E3<=this.b.a))break a;this.i=!0}else if(Date.now()-this.f<1E3*this.a.switchInterval)break a;c=this.chooseVariant();this.b.getBandwidthEstimate(this.a.defaultBandwidthEstimate);this.h(c)}};
F.prototype.segmentDownloaded=F.prototype.segmentDownloaded;F.prototype.getBandwidthEstimate=function(){return this.b.getBandwidthEstimate(this.a.defaultBandwidthEstimate)};F.prototype.getBandwidthEstimate=F.prototype.getBandwidthEstimate;F.prototype.setVariants=function(a){this.g=a};F.prototype.setVariants=F.prototype.setVariants;F.prototype.configure=function(a){this.a=a};F.prototype.configure=F.prototype.configure;
function Mc(a,b){return b.filter(function(b){return rc(b,a,{width:Infinity,height:Infinity})}).sort(function(a,b){return a.bandwidth-b.bandwidth})};var Nc="ended play playing pause pausing ratechange seeked seeking timeupdate volumechange".split(" "),Oc="buffered currentTime duration ended loop muted paused playbackRate seeking videoHeight videoWidth volume".split(" "),Pc=["loop","playbackRate"],Qc=["pause","play"],Rc="adaptation buffering emsg error loading streaming texttrackvisibility timelineregionadded timelineregionenter timelineregionexit trackschanged unloading".split(" "),Sc={drmInfo:20,getAudioLanguages:2,getAudioLanguagesAndRoles:2,
getBufferedInfo:2,getConfiguration:2,getExpiration:2,getManifestUri:2,getPlaybackRate:2,getTextLanguages:2,getTextLanguagesAndRoles:2,getTextTracks:2,getStats:5,getVariantTracks:2,isAudioOnly:10,isBuffering:1,isInProgress:1,isLive:10,isTextTrackVisible:1,keySystem:10,seekRange:1},Tc={getPlayheadTimeAsDate:1,getPresentationStartTimeAsDate:20},Uc=[["getConfiguration","configure"]],Vc=[["isTextTrackVisible","setTextTrackVisibility"]],$c="addTextTrack cancelTrickPlay configure resetConfiguration retryStreaming selectAudioLanguage selectTextLanguage selectTextTrack selectVariantTrack setTextTrackVisibility trickPlay".split(" "),
ad=["load","unload"];function bd(a){return JSON.stringify(a,function(a,c){if("function"!=typeof c){if(c instanceof Event||c instanceof B){var b={},e;for(e in c){var f=c[e];f&&"object"==typeof f?"detail"==e&&(b[e]=f):e in Event||(b[e]=f)}return b}if(c instanceof TimeRanges)for(b={__type__:"TimeRanges",length:c.length,start:[],end:[]},e=0;e<c.length;++e)b.start.push(c.start(e)),b.end.push(c.end(e));else b="number"==typeof c?isNaN(c)?"NaN":isFinite(c)?c:0>c?"-Infinity":"Infinity":c;return b}})}
function cd(a){return JSON.parse(a,function(a,c){return"NaN"==c?NaN:"-Infinity"==c?-Infinity:"Infinity"==c?Infinity:c&&"object"==typeof c&&"TimeRanges"==c.__type__?dd(c):c})}function dd(a){return{length:a.length,start:function(b){return a.start[b]},end:function(b){return a.end[b]}}};function ed(a,b,c,d,e,f){this.K=a;this.g=b;this.L=c;this.j=!1;this.A=d;this.I=e;this.u=f;this.b=this.h=!1;this.w="";this.i=null;this.l=this.wc.bind(this);this.m=this.Jd.bind(this);this.a={video:{},player:{}};this.s=0;this.c={};this.f=null}var fd=!1,G=null;l=ed.prototype;l.destroy=function(){gd(this);G&&hd(this);this.I=this.A=this.g=null;this.b=this.h=!1;this.m=this.l=this.f=this.c=this.a=this.i=null;return Promise.resolve()};l.X=function(){return this.b};l.Xb=function(){return this.w};
l.init=function(){if(window.chrome&&chrome.cast&&chrome.cast.isAvailable){delete window.__onGCastApiAvailable;this.h=!0;this.g();var a=new chrome.cast.SessionRequest(this.K);a=new chrome.cast.ApiConfig(a,this.xc.bind(this),this.Qd.bind(this),"origin_scoped");chrome.cast.initialize(a,function(){},function(){});fd&&setTimeout(this.g.bind(this),20);(a=G)&&a.status!=chrome.cast.SessionStatus.STOPPED?this.xc(a):G=null}else window.__onGCastApiAvailable=function(a){a&&this.init()}.bind(this)};
l.$b=function(a){this.i=a;this.b&&id({type:"appData",appData:this.i})};l.cast=function(a){if(!this.h)return Promise.reject(new p(1,8,8E3));if(!fd)return Promise.reject(new p(1,8,8001));if(this.b)return Promise.reject(new p(1,8,8002));this.f=new u;chrome.cast.requestSession(this.Ub.bind(this,a),this.vc.bind(this));return this.f};l.tb=function(){this.b&&(gd(this),G&&(hd(this),G.stop(function(){},function(){}),G=null))};
l.get=function(a,b){if("video"==a){if(0<=Qc.indexOf(b))return this.Hc.bind(this,a,b)}else if("player"==a){if(Tc[b]&&!this.get("player","isLive")())return function(){};if(0<=$c.indexOf(b))return this.Hc.bind(this,a,b);if(0<=ad.indexOf(b))return this.oe.bind(this,a,b);if(Sc[b])return this.Ec.bind(this,a,b)}return this.Ec(a,b)};l.set=function(a,b,c){this.a[a][b]=c;id({type:"set",targetName:a,property:b,value:c})};
l.Ub=function(a,b){G=b;b.addUpdateListener(this.l);b.addMessageListener("urn:x-cast:com.google.shaka.v2",this.m);this.wc();id({type:"init",initState:a,appData:this.i});this.f.resolve()};l.vc=function(a){var b=8003;switch(a.code){case "cancel":b=8004;break;case "timeout":b=8005;break;case "receiver_unavailable":b=8006}this.f.reject(new p(2,8,b,a))};l.Ec=function(a,b){return this.a[a][b]};l.Hc=function(a,b){id({type:"call",targetName:a,methodName:b,args:Array.prototype.slice.call(arguments,2)})};
l.oe=function(a,b){var c=Array.prototype.slice.call(arguments,2),d=new u,e=this.s.toString();this.s++;this.c[e]=d;id({type:"asyncCall",targetName:a,methodName:b,args:c,id:e});return d};l.xc=function(a){var b=this.u();this.f=new u;this.j=!0;this.Ub(b,a)};l.Qd=function(a){fd="available"==a;this.g()};function hd(a){var b=G;b.removeUpdateListener(a.l);b.removeMessageListener("urn:x-cast:com.google.shaka.v2",a.m)}
l.wc=function(){var a=G?"connected"==G.status:!1;if(this.b&&!a){this.I();for(var b in this.a)this.a[b]={};gd(this)}this.w=(this.b=a)?G.receiver.friendlyName:"";this.g()};function gd(a){for(var b in a.c){var c=a.c[b];delete a.c[b];c.reject(new p(1,7,7E3))}}
l.Jd=function(a,b){var c=cd(b);switch(c.type){case "event":var d=c.targetName,e=c.event;this.A(d,new B(e.type,e));break;case "update":e=c.update;for(d in e){c=this.a[d]||{};for(var f in e[d])c[f]=e[d][f]}this.j&&(this.L(),this.j=!1);break;case "asyncComplete":if(d=c.id,f=c.error,c=this.c[d],delete this.c[d],c)if(f){d=new p(f.severity,f.category,f.code);for(e in f)d[e]=f[e];c.reject(d)}else c.resolve()}};function id(a){a=bd(a);G.sendMessage("urn:x-cast:com.google.shaka.v2",a,function(){},ra)};function H(){this.Bb=new ab;this.jb=this}H.prototype.addEventListener=function(a,b){this.Bb.push(a,b)};H.prototype.removeEventListener=function(a,b){this.Bb.remove(a,b)};H.prototype.dispatchEvent=function(a){for(var b=this.Bb.get(a.type)||[],c=0;c<b.length;++c){a.target=this.jb;a.currentTarget=this.jb;var d=b[c];try{d.handleEvent?d.handleEvent(a):d.call(this,a)}catch(e){}if(a.a)break}return a.defaultPrevented};function I(a,b,c){H.call(this);this.c=a;this.b=b;this.i=this.g=this.f=this.j=this.h=null;this.a=new ed(c,this.Ge.bind(this),this.He.bind(this),this.Ie.bind(this),this.Je.bind(this),this.oc.bind(this));jd(this)}la(I,H);n("shaka.cast.CastProxy",I);I.prototype.destroy=function(a){a&&this.a&&this.a.tb();a=[this.i?this.i.destroy():null,this.b?this.b.destroy():null,this.a?this.a.destroy():null];this.a=this.i=this.j=this.h=this.b=this.c=null;return Promise.all(a)};I.prototype.destroy=I.prototype.destroy;
I.prototype.vd=function(){return this.h};I.prototype.getVideo=I.prototype.vd;I.prototype.nd=function(){return this.j};I.prototype.getPlayer=I.prototype.nd;I.prototype.Zc=function(){return this.a?this.a.h&&fd:!1};I.prototype.canCast=I.prototype.Zc;I.prototype.X=function(){return this.a?this.a.X():!1};I.prototype.isCasting=I.prototype.X;I.prototype.Xb=function(){return this.a?this.a.Xb():""};I.prototype.receiverName=I.prototype.Xb;I.prototype.cast=function(){var a=this.oc();return this.a.cast(a).then(function(){return this.b.zb()}.bind(this))};
I.prototype.cast=I.prototype.cast;I.prototype.$b=function(a){this.a.$b(a)};I.prototype.setAppData=I.prototype.$b;I.prototype.Ne=function(){var a=this.a;if(a.b){var b=a.u();chrome.cast.requestSession(a.Ub.bind(a,b),a.vc.bind(a))}};I.prototype.suggestDisconnect=I.prototype.Ne;I.prototype.tb=function(){this.a.tb()};I.prototype.forceDisconnect=I.prototype.tb;
function jd(a){a.a.init();a.i=new z;Nc.forEach(function(a){A(this.i,this.c,a,this.Ue.bind(this))}.bind(a));Rc.forEach(function(a){A(this.i,this.b,a,this.ge.bind(this))}.bind(a));a.h={};for(var b in a.c)Object.defineProperty(a.h,b,{configurable:!1,enumerable:!0,get:a.Te.bind(a,b),set:a.Ve.bind(a,b)});a.j={};for(b in a.b)Object.defineProperty(a.j,b,{configurable:!1,enumerable:!0,get:a.fe.bind(a,b)});a.f=new H;a.f.jb=a.h;a.g=new H;a.g.jb=a.j}l=I.prototype;
l.oc=function(){var a={video:{},player:{},playerAfterLoad:{},manifest:this.b.Ib(),startTime:null};this.c.pause();Pc.forEach(function(b){a.video[b]=this.c[b]}.bind(this));this.c.ended||(a.startTime=this.c.currentTime);Uc.forEach(function(b){var c=b[1];b=this.b[b[0]]();a.player[c]=b}.bind(this));Vc.forEach(function(b){var c=b[1];b=this.b[b[0]]();a.playerAfterLoad[c]=b}.bind(this));return a};l.Ge=function(){this.dispatchEvent(new B("caststatuschanged"))};
l.He=function(){this.f.dispatchEvent(new B(this.h.paused?"pause":"play"))};
l.Je=function(){Uc.forEach(function(a){var b=a[1];a=this.a.get("player",a[0])();this.b[b](a)}.bind(this));var a=this.a.get("player","getManifestUri")(),b=this.a.get("video","ended"),c=Promise.resolve(),d=this.c.autoplay,e=null;b||(e=this.a.get("video","currentTime"));a&&(this.c.autoplay=!1,c=this.b.load(a,e),c["catch"](function(a){this.b.dispatchEvent(new B("error",{detail:a}))}.bind(this)));var f={};Pc.forEach(function(a){f[a]=this.a.get("video",a)}.bind(this));c.then(function(){Pc.forEach(function(a){this.c[a]=
f[a]}.bind(this));Vc.forEach(function(a){var b=a[1];a=this.a.get("player",a[0])();this.b[b](a)}.bind(this));this.c.autoplay=d;a&&this.c.play()}.bind(this))};
l.Te=function(a){if("addEventListener"==a)return this.f.addEventListener.bind(this.f);if("removeEventListener"==a)return this.f.removeEventListener.bind(this.f);if(this.a.X()&&0==Object.keys(this.a.a.video).length){var b=this.c[a];if("function"!=typeof b)return b}return this.a.X()?this.a.get("video",a):(b=this.c[a],"function"==typeof b&&(b=b.bind(this.c)),b)};l.Ve=function(a,b){this.a.X()?this.a.set("video",a,b):this.c[a]=b};l.Ue=function(a){this.a.X()||this.f.dispatchEvent(new B(a.type,a))};
l.fe=function(a){return"addEventListener"==a?this.g.addEventListener.bind(this.g):"removeEventListener"==a?this.g.removeEventListener.bind(this.g):"getMediaElement"==a?function(){return this.h}.bind(this):"getNetworkingEngine"==a?this.b.pc.bind(this.b):"getManifest"==a?this.a.X()?function(){return null}:this.b.Ga.bind(this.b):this.a.X()&&0==Object.keys(this.a.a.video).length&&Sc[a]||!this.a.X()?(a=this.b[a],a.bind(this.b)):this.a.get("player",a)};l.ge=function(a){this.a.X()||this.g.dispatchEvent(a)};
l.Ie=function(a,b){this.a.X()&&("video"==a?this.f.dispatchEvent(b):"player"==a&&this.g.dispatchEvent(b))};function kd(a,b,c,d){H.call(this);this.a=a;this.b=b;this.s={video:a,player:b};this.u=c||function(){};this.w=d||function(a){return a};this.m=!1;this.g=!0;this.f=0;this.l=!1;this.i=!0;this.j=this.h=this.c=null;ld(this)}la(kd,H);n("shaka.cast.CastReceiver",kd);kd.prototype.isConnected=function(){return this.m};kd.prototype.isConnected=kd.prototype.isConnected;kd.prototype.xd=function(){return this.g};kd.prototype.isIdle=kd.prototype.xd;
kd.prototype.destroy=function(){var a=this.b?this.b.destroy():Promise.resolve();null!=this.j&&window.clearTimeout(this.j);this.u=this.s=this.b=this.a=null;this.m=!1;this.g=!0;this.j=this.h=this.c=null;return a.then(function(){cast.receiver.CastReceiverManager.getInstance().stop()})};kd.prototype.destroy=kd.prototype.destroy;
function ld(a){var b=cast.receiver.CastReceiverManager.getInstance();b.onSenderConnected=a.Bc.bind(a);b.onSenderDisconnected=a.Bc.bind(a);b.onSystemVolumeChanged=a.fd.bind(a);a.h=b.getCastMessageBus("urn:x-cast:com.google.cast.media");a.h.onMessage=a.Ed.bind(a);a.c=b.getCastMessageBus("urn:x-cast:com.google.shaka.v2");a.c.onMessage=a.Td.bind(a);b.start();Nc.forEach(function(a){this.a.addEventListener(a,this.Fc.bind(this,"video"))}.bind(a));Rc.forEach(function(a){this.b.addEventListener(a,this.Fc.bind(this,
"player"))}.bind(a));cast.__platform__&&cast.__platform__.canDisplayType('video/mp4; codecs="avc1.640028"; width=3840; height=2160')?a.b.ac(3840,2160):a.b.ac(1920,1080);a.a.addEventListener("loadeddata",function(){this.l=!0}.bind(a));a.b.addEventListener("loading",function(){this.g=!1;md(this)}.bind(a));a.a.addEventListener("playing",function(){this.g=!1;md(this)}.bind(a));a.a.addEventListener("pause",function(){md(this)}.bind(a));a.b.addEventListener("unloading",function(){this.g=!0;md(this)}.bind(a));
a.a.addEventListener("ended",function(){window.setTimeout(function(){this.a&&this.a.ended&&(this.g=!0,md(this))}.bind(this),5E3)}.bind(a))}l=kd.prototype;l.Bc=function(){this.f=0;this.i=!0;this.m=0!=cast.receiver.CastReceiverManager.getInstance().getSenders().length;md(this)};function md(a){Promise.resolve().then(function(){this.dispatchEvent(new B("caststatuschanged"));nd(this)||od(this,0)}.bind(a))}
function pd(a,b,c){for(var d in b.player)a.b[d](b.player[d]);a.u(c);c=Promise.resolve();var e=a.a.autoplay;b.manifest&&(a.a.autoplay=!1,c=a.b.load(b.manifest,b.startTime),c["catch"](function(a){this.b.dispatchEvent(new B("error",{detail:a}))}.bind(a)));c.then(function(){for(var a in b.video){var c=b.video[a];this.a[a]=c}for(a in b.playerAfterLoad)c=b.playerAfterLoad[a],this.b[a](c);this.a.autoplay=e;b.manifest&&(this.a.play(),od(this,0))}.bind(a))}
l.Fc=function(a,b){this.b&&(this.Vb(),qd(this,{type:"event",targetName:a,event:b},this.c))};
l.Vb=function(){null!=this.j&&window.clearTimeout(this.j);this.j=window.setTimeout(this.Vb.bind(this),500);var a={video:{},player:{}};Oc.forEach(function(b){a.video[b]=this.a[b]}.bind(this));if(this.b.P())for(var b in Tc){var c=Tc[b];0==this.f%c&&(a.player[b]=this.b[b]())}for(b in Sc)c=Sc[b],0==this.f%c&&(a.player[b]=this.b[b]());if(b=cast.receiver.CastReceiverManager.getInstance().getSystemVolume())a.video.volume=b.level,a.video.muted=b.muted;this.l&&(this.f+=1);qd(this,{type:"update",update:a},
this.c);nd(this)};function nd(a){return a.i&&(a.a.duration||a.b.P())?(rd(a),a.i=!1,!0):!1}function rd(a){var b={contentId:a.b.Ib(),streamType:a.b.P()?"LIVE":"BUFFERED",duration:a.a.duration,contentType:""};od(a,0,b)}l.fd=function(){var a=cast.receiver.CastReceiverManager.getInstance().getSystemVolume();a&&qd(this,{type:"update",update:{video:{volume:a.level,muted:a.muted}}},this.c);qd(this,{type:"event",targetName:"video",event:{type:"volumechange"}},this.c)};
l.Td=function(a){var b=cd(a.data);switch(b.type){case "init":this.f=0;this.l=!1;this.i=!0;pd(this,b.initState,b.appData);this.Vb();break;case "appData":this.u(b.appData);break;case "set":var c=b.targetName,d=b.property,e=b.value;if("video"==c)if(b=cast.receiver.CastReceiverManager.getInstance(),"volume"==d){b.setSystemVolumeLevel(e);break}else if("muted"==d){b.setSystemVolumeMuted(e);break}this.s[c][d]=e;break;case "call":c=b.targetName;d=b.methodName;e=b.args;var f=this.s[c];f[d].apply(f,e);break;
case "asyncCall":c=b.targetName,d=b.methodName,"player"==c&&"load"==d&&(this.f=0,this.l=!1),e=b.args,b=b.id,a=a.senderId,f=this.s[c],e=f[d].apply(f,e),"player"==c&&"load"==d&&(e=e.then(function(){this.i=!0}.bind(this))),e.then(this.Mc.bind(this,a,b,null),this.Mc.bind(this,a,b))}};
l.Ed=function(a){var b=cd(a.data);switch(b.type){case "PLAY":this.a.play();od(this,0);break;case "PAUSE":this.a.pause();od(this,0);break;case "SEEK":a=b.currentTime;var c=b.resumeState;null!=a&&(this.a.currentTime=Number(a));c&&"PLAYBACK_START"==c?(this.a.play(),od(this,0)):c&&"PLAYBACK_PAUSE"==c&&(this.a.pause(),od(this,0));break;case "STOP":this.b.zb().then(function(){od(this,0)}.bind(this));break;case "GET_STATUS":od(this,Number(b.requestId));break;case "VOLUME":c=b.volume;a=c.level;c=c.muted;
var d=this.a.volume,e=this.a.muted;null!=a&&(this.a.volume=Number(a));null!=c&&(this.a.muted=c);d==this.a.volume&&e==this.a.muted||od(this,0);break;case "LOAD":this.f=0;this.i=this.l=!1;c=b.media.contentId;a=b.currentTime;c=this.w(c);this.a.autoplay=!0;this.b.load(c,a).then(function(){rd(this)}.bind(this))["catch"](function(a){var c="LOAD_FAILED";7==a.category&&7E3==a.code&&(c="LOAD_CANCELLED");qd(this,{requestId:Number(b.requestId),type:c},this.h)}.bind(this));break;default:qd(this,{requestId:Number(b.requestId),
type:"INVALID_REQUEST",reason:"INVALID_COMMAND"},this.h)}};l.Mc=function(a,b,c){qd(this,{type:"asyncComplete",id:b,error:c},this.c,a)};function qd(a,b,c,d){a.m&&(a=bd(b),d?c.getCastChannel(d).send(a):c.broadcast(a))}
function od(a,b,c){var d=a.a.playbackRate;var e=sd;e=a.g?e.IDLE:a.b.sc()?e.Tc:a.a.paused?e.Vc:e.Wc;d={mediaSessionId:0,playbackRate:d,playerState:e,currentTime:a.a.currentTime,supportedMediaCommands:15,volume:{level:a.a.volume,muted:a.a.muted}};c&&(d.media=c);qd(a,{requestId:b,type:"MEDIA_STATUS",status:[d]},a.h)}var sd={IDLE:"IDLE",Wc:"PLAYING",Tc:"BUFFERING",Vc:"PAUSED"};function td(a,b){var c=J(a,b);return 1!=c.length?null:c[0]}function J(a,b){return Array.prototype.filter.call(a.childNodes,function(a){return a instanceof Element&&a.tagName==b})}function ud(a){var b=a.firstChild;return b&&b.nodeType==Node.TEXT_NODE?a.textContent.trim():null}function K(a,b,c,d){var e=null;a=a.getAttribute(b);null!=a&&(e=c(a));return null==e?void 0!=d?d:null:e}
function vd(a){if(!a)return null;/^\d+-\d+-\d+T\d+:\d+:\d+(\.\d+)?$/.test(a)&&(a+="Z");a=Date.parse(a);return isNaN(a)?null:Math.floor(a/1E3)}function wd(a){if(!a)return null;a=/^P(?:([0-9]*)Y)?(?:([0-9]*)M)?(?:([0-9]*)D)?(?:T(?:([0-9]*)H)?(?:([0-9]*)M)?(?:([0-9.]*)S)?)?$/.exec(a);if(!a)return null;a=31536E3*Number(a[1]||null)+2592E3*Number(a[2]||null)+86400*Number(a[3]||null)+3600*Number(a[4]||null)+60*Number(a[5]||null)+Number(a[6]||null);return isFinite(a)?a:null}
function xd(a){var b=/([0-9]+)-([0-9]+)/.exec(a);if(!b)return null;a=Number(b[1]);if(!isFinite(a))return null;b=Number(b[2]);return isFinite(b)?{start:a,end:b}:null}function yd(a){a=Number(a);return 0===a%1?a:null}function zd(a){a=Number(a);return 0===a%1&&0<a?a:null}function Ad(a){a=Number(a);return 0===a%1&&0<=a?a:null}function Bd(a){var b;a=(b=a.match(/^(\d+)\/(\d+)$/))?Number(b[1]/b[2]):Number(a);return isNaN(a)?null:a};var Cd={"urn:uuid:1077efec-c0b2-4d02-ace3-3c1e52e2fb4b":"org.w3.clearkey","urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed":"com.widevine.alpha","urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95":"com.microsoft.playready","urn:uuid:f239e769-efa3-4850-9c16-a903c6932efb":"com.adobe.primetime"};
function Dd(a,b,c){a=Ed(a);var d=null,e=[],f=[],g=a.map(function(a){return a.keyId}).filter(Ra);if(g.length&&1<g.filter(Sa).length)throw new p(2,4,4010);c||(f=a.filter(function(a){return"urn:mpeg:dash:mp4protection:2011"==a.Lc?(d=a.init||d,!1):!0}),f.length&&(e=Fd(d,b,f),0==e.length&&(e=[eb("",d)])));!a.length||!c&&f.length||(e=hb(Cd).map(function(a){return eb(a,d)}));var h=g[0]||null;h&&e.forEach(function(a){a.initData.forEach(function(a){a.keyId=h})});return{kc:h,cf:d,drmInfos:e,nc:!0}}
function Gd(a,b,c,d){var e=Dd(a,b,d);if(c.nc){a=1==c.drmInfos.length&&!c.drmInfos[0].keySystem;b=0==e.drmInfos.length;if(0==c.drmInfos.length||a&&!b)c.drmInfos=e.drmInfos;c.nc=!1}else if(0<e.drmInfos.length&&(c.drmInfos=c.drmInfos.filter(function(a){return e.drmInfos.some(function(b){return b.keySystem==a.keySystem})}),0==c.drmInfos.length))throw new p(2,4,4008);return e.kc||c.kc}function Fd(a,b,c){return c.map(function(c){var d=Cd[c.Lc];return d?[eb(d,c.init||a)]:b(c.node)||[]}).reduce(Pa,[])}
function Ed(a){return a.map(function(a){var b=a.getAttribute("schemeIdUri"),d=a.getAttribute("cenc:default_KID"),e=J(a,"cenc:pssh").map(ud);if(!b)return null;b=b.toLowerCase();if(d&&(d=d.replace(/-/g,"").toLowerCase(),0<=d.indexOf(" ")))throw new p(2,4,4009);var f=[];try{f=e.map(function(a){return{initDataType:"cenc",initData:ub(a),keyId:null}})}catch(g){throw new p(2,4,4007);}return{node:a,Lc:b,keyId:d,init:0<f.length?f:null}}).filter(Ra)};function Hd(a,b,c,d,e){null!=e&&(e=Math.round(e));var f={RepresentationID:b,Number:c,Bandwidth:d,Time:e};return a.replace(/\$(RepresentationID|Number|Bandwidth|Time)?(?:%0([0-9]+)([diouxX]))?\$/g,function(a,b,c,d){if("$$"==a)return"$";var e=f[b];if(null==e)return a;"RepresentationID"==b&&c&&(c=void 0);switch(d){case void 0:case "d":case "i":case "u":a=e.toString();break;case "o":a=e.toString(8);break;case "x":a=e.toString(16);break;case "X":a=e.toString(16).toUpperCase();break;default:a=e.toString()}c=
window.parseInt(c,10)||1;return Array(Math.max(0,c-a.length)+1).join("0")+a})}
function Id(a,b){var c=Jd(a,b,"timescale"),d=1;c&&(d=zd(c)||1);c=Jd(a,b,"duration");(c=zd(c||""))&&(c/=d);var e=Jd(a,b,"startNumber"),f=Number(Jd(a,b,"presentationTimeOffset"))||0,g=Ad(e||"");if(null==e||null==g)g=1;var h=Kd(a,b,"SegmentTimeline");e=null;if(h){e=d;var k=a.M.duration||Infinity;h=J(h,"S");for(var m=[],q=0,w=0;w<h.length;++w){var r=h[w],t=K(r,"t",Ad),y=K(r,"d",Ad);r=K(r,"r",yd);null!=t&&(t-=f);if(!y)break;t=null!=t?t:q;r=r||0;if(0>r)if(w+1<h.length){r=K(h[w+1],"t",Ad);if(null==r)break;
else if(t>=r)break;r=Math.ceil((r-t)/y)-1}else{if(Infinity==k)break;else if(t/e>=k)break;r=Math.ceil((k*e-t)/y)-1}0<m.length&&t!=q&&(m[m.length-1].end=t/e);for(var v=0;v<=r;++v)q=t+y,m.push({start:t/e,end:q/e,Re:t}),t=q}e=m}return{timescale:d,R:c,Aa:g,aa:f/d||0,gc:f,H:e}}function Jd(a,b,c){return[b(a.v),b(a.T),b(a.Z)].filter(Ra).map(function(a){return a.getAttribute(c)}).reduce(function(a,b){return a||b})}
function Kd(a,b,c){return[b(a.v),b(a.T),b(a.Z)].filter(Ra).map(function(a){return td(a,c)}).reduce(function(a,b){return a||b})}function Ld(a,b){var c=new DOMParser;try{var d=D(a);var e=c.parseFromString(d,"text/xml")}catch(g){}if(e&&e.documentElement.tagName==b)var f=e.documentElement;return f&&0<f.getElementsByTagName("parsererror").length?null:f}
function Md(a,b,c,d,e,f){for(var g=a.getAttribute("xlink:href"),h=a.getAttribute("xlink:actuate")||"onRequest",k=0;k<a.attributes.length;k++){var m=a.attributes[k].nodeName;-1!=m.indexOf("xlink:")&&(a.removeAttribute(m),--k)}if(5<=f)return Promise.reject(new p(2,4,4028));if("onLoad"!=h)return Promise.reject(new p(2,4,4027));var q=C([d],[g]);return e.request(0,Va(q,b)).then(function(d){d=Ld(d.data,a.tagName);if(!d)return Promise.reject(new p(2,4,4001,g));for(;a.childNodes.length;)a.removeChild(a.childNodes[0]);
for(;d.childNodes.length;){var h=d.childNodes[0];d.removeChild(h);a.appendChild(h)}for(h=0;h<d.attributes.length;h++){var k=d.attributes[h].nodeName,m=d.getAttribute(k);a.setAttribute(k,m)}return Nd(a,b,c,q[0],e,f+1)}.bind(a))}
function Nd(a,b,c,d,e,f){f=f||0;if(a.getAttribute("xlink:href")){var g=Md(a,b,c,d,e,f);c&&(g=g["catch"](function(){return Nd(a,b,c,d,e,f)}));return g}for(g=0;g<a.childNodes.length;g++){var h=a.childNodes[g];h instanceof Element&&"urn:mpeg:dash:resolve-to-zero:2013"==h.getAttribute("xlink:href")&&(a.removeChild(h),--g)}var k=[];for(g=0;g<a.childNodes.length;g++)h=a.childNodes[g],h.nodeType==Node.ELEMENT_NODE&&(h=Nd(h,b,c,d,e,f),k.push(h));return Promise.all(k).then(function(){return a})};function L(a,b,c){this.a=a;this.O=b;this.D=c}n("shaka.media.InitSegmentReference",L);L.prototype.Eb=function(){return this.a()};L.prototype.createUris=L.prototype.Eb;L.prototype.Jb=function(){return this.O};L.prototype.getStartByte=L.prototype.Jb;L.prototype.Hb=function(){return this.D};L.prototype.getEndByte=L.prototype.Hb;function M(a,b,c,d,e,f){this.position=a;this.startTime=b;this.endTime=c;this.a=d;this.O=e;this.D=f}n("shaka.media.SegmentReference",M);M.prototype.U=function(){return this.position};
M.prototype.getPosition=M.prototype.U;M.prototype.Kb=function(){return this.startTime};M.prototype.getStartTime=M.prototype.Kb;M.prototype.kd=function(){return this.endTime};M.prototype.getEndTime=M.prototype.kd;M.prototype.Eb=function(){return this.a()};M.prototype.createUris=M.prototype.Eb;M.prototype.Jb=function(){return this.O};M.prototype.getStartByte=M.prototype.Jb;M.prototype.Hb=function(){return this.D};M.prototype.getEndByte=M.prototype.Hb;function N(a,b){this.G=a;this.b=b==Od;this.a=0}n("shaka.util.DataViewReader",N);var Od=1;N.Endianness={Xe:0,$e:Od};N.prototype.ea=function(){return this.a<this.G.byteLength};N.prototype.hasMoreData=N.prototype.ea;N.prototype.U=function(){return this.a};N.prototype.getPosition=N.prototype.U;N.prototype.ld=function(){return this.G.byteLength};N.prototype.getLength=N.prototype.ld;N.prototype.$=function(){try{var a=this.G.getUint8(this.a);this.a+=1;return a}catch(b){Pd()}};N.prototype.readUint8=N.prototype.$;
N.prototype.ab=function(){try{var a=this.G.getUint16(this.a,this.b);this.a+=2;return a}catch(b){Pd()}};N.prototype.readUint16=N.prototype.ab;N.prototype.C=function(){try{var a=this.G.getUint32(this.a,this.b);this.a+=4;return a}catch(b){Pd()}};N.prototype.readUint32=N.prototype.C;N.prototype.Gc=function(){try{var a=this.G.getInt32(this.a,this.b);this.a+=4;return a}catch(b){Pd()}};N.prototype.readInt32=N.prototype.Gc;
N.prototype.Qa=function(){try{if(this.b){var a=this.G.getUint32(this.a,!0);var b=this.G.getUint32(this.a+4,!0)}else b=this.G.getUint32(this.a,!1),a=this.G.getUint32(this.a+4,!1)}catch(c){Pd()}if(2097151<b)throw new p(2,3,3001);this.a+=8;return b*Math.pow(2,32)+a};N.prototype.readUint64=N.prototype.Qa;N.prototype.Pa=function(a){this.a+a>this.G.byteLength&&Pd();var b=new Uint8Array(this.G.buffer,this.G.byteOffset+this.a,a);this.a+=a;return new Uint8Array(b)};N.prototype.readBytes=N.prototype.Pa;
N.prototype.F=function(a){this.a+a>this.G.byteLength&&Pd();this.a+=a};N.prototype.skip=N.prototype.F;N.prototype.Kc=function(a){this.a<a&&Pd();this.a-=a};N.prototype.rewind=N.prototype.Kc;N.prototype.seek=function(a){(0>a||a>this.G.byteLength)&&Pd();this.a=a};N.prototype.seek=N.prototype.seek;N.prototype.Wb=function(){for(var a=this.a;this.ea()&&0!=this.G.getUint8(this.a);)this.a+=1;a=new Uint8Array(this.G.buffer,this.G.byteOffset+a,this.a-a);this.a+=1;return D(a)};
N.prototype.readTerminatedString=N.prototype.Wb;function Pd(){throw new p(2,3,3E3);};function O(){this.c=[];this.b=[];this.a=!1}n("shaka.util.Mp4Parser",O);O.prototype.B=function(a,b){var c=Qd(a);this.c[c]=0;this.b[c]=b;return this};O.prototype.box=O.prototype.B;O.prototype.W=function(a,b){var c=Qd(a);this.c[c]=1;this.b[c]=b;return this};O.prototype.fullBox=O.prototype.W;O.prototype.stop=function(){this.a=!0};O.prototype.stop=O.prototype.stop;
O.prototype.parse=function(a,b){var c=new Uint8Array(a);c=new N(new DataView(c.buffer,c.byteOffset,c.byteLength),0);for(this.a=!1;c.ea()&&!this.a;)this.xb(0,c,b)};O.prototype.parse=O.prototype.parse;
O.prototype.xb=function(a,b,c){var d=b.U(),e=b.C(),f=b.C();switch(e){case 0:e=b.G.byteLength-d;break;case 1:e=b.Qa()}var g=this.b[f];if(g){var h=null,k=null;1==this.c[f]&&(k=b.C(),h=k>>>24,k&=16777215);f=d+e;c&&f>b.G.byteLength&&(f=b.G.byteLength);f-=b.U();b=0<f?b.Pa(f):new Uint8Array(0);b=new N(new DataView(b.buffer,b.byteOffset,b.byteLength),0);g({oa:this,Dc:c||!1,version:h,flags:k,o:b,size:e,start:d+a})}else b.F(d+e-b.U())};O.prototype.parseNext=O.prototype.xb;
function P(a){for(;a.o.ea()&&!a.oa.a;)a.oa.xb(a.start,a.o,a.Dc)}O.children=P;function Rd(a){for(var b=a.o.C();0<b&&!a.oa.a;--b)a.oa.xb(a.start,a.o,a.Dc)}O.sampleDescription=Rd;function Sd(a){return function(b){a(b.o.Pa(b.o.G.byteLength-b.o.U()))}}O.allData=Sd;function Qd(a){for(var b=0,c=0;c<a.length;c++)b=b<<8|a.charCodeAt(c);return b};function Td(a,b,c,d){var e,f=(new O).W("sidx",function(a){e=Ud(b,d,c,a)});a&&f.parse(a);if(e)return e;throw new p(2,3,3004);}
function Ud(a,b,c,d){var e=[];d.o.F(4);var f=d.o.C();if(0==f)throw new p(2,3,3005);if(0==d.version){var g=d.o.C();var h=d.o.C()}else g=d.o.Qa(),h=d.o.Qa();d.o.F(2);var k=d.o.ab();a=a+d.size+h;for(h=0;h<k;h++){var m=d.o.C(),q=(m&2147483648)>>>31;m&=2147483647;var w=d.o.C();d.o.F(4);if(1==q)throw new p(2,3,3006);e.push(new M(e.length,g/f-b,(g+w)/f-b,function(){return c},a,a+m-1));g+=w;a+=m}d.oa.stop();return e};function Q(a){this.a=a}n("shaka.media.SegmentIndex",Q);Q.prototype.destroy=function(){this.a=null;return Promise.resolve()};Q.prototype.destroy=Q.prototype.destroy;Q.prototype.find=function(a){for(var b=this.a.length-1;0<=b;--b){var c=this.a[b];if(a>=c.startTime&&a<c.endTime)return c.position}return this.a.length&&a<this.a[0].startTime?this.a[0].position:null};Q.prototype.find=Q.prototype.find;
Q.prototype.get=function(a){if(0==this.a.length)return null;a-=this.a[0].position;return 0>a||a>=this.a.length?null:this.a[a]};Q.prototype.get=Q.prototype.get;Q.prototype.offset=function(a){for(var b=0;b<this.a.length;++b)this.a[b].startTime+=a,this.a[b].endTime+=a};Q.prototype.offset=Q.prototype.offset;
Q.prototype.Pb=function(a){for(var b=[],c=0,d=0;c<this.a.length&&d<a.length;){var e=this.a[c],f=a[d];e.startTime<f.startTime?(b.push(e),c++):(e.startTime>f.startTime?0==c&&b.push(f):(.1<Math.abs(e.endTime-f.endTime)?(f=new M(e.position,f.startTime,f.endTime,f.a,f.O,f.D),b.push(f)):b.push(e),c++),d++)}for(;c<this.a.length;)b.push(this.a[c++]);if(b.length)for(c=b[b.length-1].position+1;d<a.length;)f=a[d++],f=new M(c++,f.startTime,f.endTime,f.a,f.O,f.D),b.push(f);else b=a;this.a=b};
Q.prototype.merge=Q.prototype.Pb;Q.prototype.Fb=function(a){for(var b=0;b<this.a.length;++b)if(this.a[b].endTime>a){this.a.splice(0,b);return}this.a=[]};Q.prototype.evict=Q.prototype.Fb;
function Vd(a,b){for(;a.a.length;){var c=a.a[a.a.length-1];if(c.startTime>=b)a.a.pop();else break}for(;a.a.length;)if(c=a.a[0],0>=c.endTime)a.a.shift();else break;0!=a.a.length&&(c=a.a[0],c.startTime<fb&&(a.a[0]=new M(c.position,0,c.endTime,c.a,c.O,c.D)),c=a.a[a.a.length-1],a.a[a.a.length-1]=new M(c.position,c.startTime,b,c.a,c.O,c.D))};function Wd(a){this.b=a;this.a=new N(a,0);Xd||(Xd=[new Uint8Array([255]),new Uint8Array([127,255]),new Uint8Array([63,255,255]),new Uint8Array([31,255,255,255]),new Uint8Array([15,255,255,255,255]),new Uint8Array([7,255,255,255,255,255]),new Uint8Array([3,255,255,255,255,255,255]),new Uint8Array([1,255,255,255,255,255,255,255])])}var Xd;Wd.prototype.ea=function(){return this.a.ea()};
function Yd(a){var b=Zd(a);if(7<b.length)throw new p(2,3,3002);for(var c=0,d=0;d<b.length;d++)c=256*c+b[d];b=c;c=Zd(a);a:{for(d=0;d<Xd.length;d++)if(xb(c,Xd[d])){d=!0;break a}d=!1}if(d)c=a.b.byteLength-a.a.U();else{if(8==c.length&&c[1]&224)throw new p(2,3,3001);d=c[0]&(1<<8-c.length)-1;for(var e=1;e<c.length;e++)d=256*d+c[e];c=d}c=a.a.U()+c<=a.b.byteLength?c:a.b.byteLength-a.a.U();d=new DataView(a.b.buffer,a.b.byteOffset+a.a.U(),c);a.a.F(c);return new $d(b,d)}
function Zd(a){var b=a.a.$(),c;for(c=1;8>=c&&!(b&1<<8-c);c++);if(8<c)throw new p(2,3,3002);var d=new Uint8Array(c);d[0]=b;for(b=1;b<c;b++)d[b]=a.a.$();return d}function $d(a,b){this.id=a;this.a=b}function ae(a){if(8<a.a.byteLength)throw new p(2,3,3002);if(8==a.a.byteLength&&a.a.getUint8(0)&224)throw new p(2,3,3001);for(var b=0,c=0;c<a.a.byteLength;c++){var d=a.a.getUint8(c);b=256*b+d}return b};function be(){}
be.prototype.parse=function(a,b,c,d){var e;b=new Wd(new DataView(b));if(440786851!=Yd(b).id)throw new p(2,3,3008);var f=Yd(b);if(408125543!=f.id)throw new p(2,3,3009);b=f.a.byteOffset;f=new Wd(f.a);for(e=null;f.ea();){var g=Yd(f);if(357149030==g.id){e=g;break}}if(!e)throw new p(2,3,3010);f=new Wd(e.a);e=1E6;for(g=null;f.ea();){var h=Yd(f);if(2807729==h.id)e=ae(h);else if(17545==h.id)if(g=h,4==g.a.byteLength)g=g.a.getFloat32(0);else if(8==g.a.byteLength)g=g.a.getFloat64(0);else throw new p(2,3,3003);
}if(null==g)throw new p(2,3,3011);f=e/1E9;e=g*f;a=Yd(new Wd(new DataView(a)));if(475249515!=a.id)throw new p(2,3,3007);return ce(a,b,f,e,c,d)};function ce(a,b,c,d,e,f){function g(){return e}var h=[];a=new Wd(a.a);for(var k=null,m=null;a.ea();){var q=Yd(a);if(187==q.id){var w=de(q);w&&(q=c*w.Se,w=b+w.ne,null!=k&&h.push(new M(h.length,k-f,q-f,g,m,w-1)),k=q,m=w)}}null!=k&&h.push(new M(h.length,k-f,d-f,g,m,null));return h}
function de(a){var b=new Wd(a.a);a=Yd(b);if(179!=a.id)throw new p(2,3,3013);a=ae(a);b=Yd(b);if(183!=b.id)throw new p(2,3,3012);b=new Wd(b.a);for(var c=0;b.ea();){var d=Yd(b);if(241==d.id){c=ae(d);break}}return{Se:a,ne:c}};function ee(a,b){var c=Kd(a,b,"Initialization");if(!c)return null;var d=a.v.ba,e=c.getAttribute("sourceURL");e&&(d=C(a.v.ba,[e]));e=0;var f=null;if(c=K(c,"range",xd))e=c.start,f=c.end;return new L(function(){return d},e,f)}
function fe(a,b){var c=Number(Jd(a,ge,"presentationTimeOffset"))||0,d=Jd(a,ge,"timescale"),e=1;d&&(e=zd(d)||1);c=c/e||0;d=ee(a,ge);var f=a.v.contentType;e=a.v.mimeType.split("/")[1];if("text"!=f&&"mp4"!=e&&"webm"!=e)throw new p(2,4,4006);if("webm"==e&&!d)throw new p(2,4,4005);f=Kd(a,ge,"RepresentationIndex");var g=Jd(a,ge,"indexRange"),h=a.v.ba;g=xd(g||"");if(f){var k=f.getAttribute("sourceURL");k&&(h=C(a.v.ba,[k]));g=K(f,"range",xd,g)}if(!g)throw new p(2,4,4002);e=he(a,b,d,h,g.start,g.end,e,c);return{createSegmentIndex:e.createSegmentIndex,
findSegmentPosition:e.findSegmentPosition,getSegmentReference:e.getSegmentReference,initSegmentReference:d,aa:c}}
function he(a,b,c,d,e,f,g,h){var k=a.presentationTimeline,m=!a.Fa||!a.M.Lb,q=a.M.index,w=a.M.duration,r=b,t=null;return{createSegmentIndex:function(){var a=[r(d,e,f),"webm"==g?r(c.a(),c.O,c.D):null];r=null;return Promise.all(a).then(function(a){var b=a[0];a=a[1]||null;b="mp4"==g?Td(b,e,d,h):(new be).parse(b,a,d,h);k.Za(b,0==q);t=new Q(b);m&&Vd(t,w)})},findSegmentPosition:function(a){return t.find(a)},getSegmentReference:function(a){return t.get(a)}}}function ge(a){return a.bb};function ie(a,b){var c=ee(a,je);var d=ke(a);var e=Id(a,je),f=e.Aa;0==f&&(f=1);var g=0;e.R?g=e.R*(f-1):e.H&&0<e.H.length&&(g=e.H[0].start);d={R:e.R,startTime:g,Aa:f,aa:e.aa,H:e.H,La:d};if(!d.R&&!d.H&&1<d.La.length)throw new p(2,4,4002);if(!d.R&&!a.M.duration&&!d.H&&1==d.La.length)throw new p(2,4,4002);if(d.H&&0==d.H.length)throw new p(2,4,4002);f=e=null;a.Z.id&&a.v.id&&(f=a.Z.id+","+a.v.id,e=b[f]);g=le(a.M.duration,d.Aa,a.v.ba,d);e?(e.Pb(g),f=a.presentationTimeline.Ja(),e.Fb(f-a.M.start)):(a.presentationTimeline.Za(g,
0==a.M.index),e=new Q(g),f&&a.Fa&&(b[f]=e));a.Fa&&a.M.Lb||Vd(e,a.M.duration);return{createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:e.find.bind(e),getSegmentReference:e.get.bind(e),initSegmentReference:c,aa:d.aa}}function je(a){return a.qa}
function le(a,b,c,d){var e=d.La.length;d.H&&d.H.length!=d.La.length&&(e=Math.min(d.H.length,d.La.length));for(var f=[],g=d.startTime,h=0;h<e;h++){var k=d.La[h],m=C(c,[k.zd]);var q=null!=d.R?g+d.R:d.H?d.H[h].end:g+a;f.push(new M(h+b,g,q,function(a){return a}.bind(null,m),k.start,k.end));g=q}return f}
function ke(a){return[a.v.qa,a.T.qa,a.Z.qa].filter(Ra).map(function(a){return J(a,"SegmentURL")}).reduce(function(a,c){return 0<a.length?a:c}).map(function(b){b.getAttribute("indexRange")&&!a.rc&&(a.rc=!0);var c=b.getAttribute("media");b=K(b,"mediaRange",xd,{start:0,end:null});return{zd:c,start:b.start,end:b.end}})};function me(a,b,c,d){var e=ne(a);var f=Id(a,oe);var g=Jd(a,oe,"media"),h=Jd(a,oe,"index");f={R:f.R,timescale:f.timescale,Aa:f.Aa,aa:f.aa,gc:f.gc,H:f.H,Ob:g,Xa:h};g=0+(f.Xa?1:0);g+=f.H?1:0;g+=f.R?1:0;if(0==g)throw new p(2,4,4002);1!=g&&(f.Xa&&(f.H=null),f.R=null);if(!f.Xa&&!f.Ob)throw new p(2,4,4002);if(f.Xa){c=a.v.mimeType.split("/")[1];if("mp4"!=c&&"webm"!=c)throw new p(2,4,4006);if("webm"==c&&!e)throw new p(2,4,4005);d=Hd(f.Xa,a.v.id,null,a.bandwidth||null,null);d=C(a.v.ba,[d]);a=he(a,b,e,d,0,null,
c,f.aa)}else f.R?(d||a.presentationTimeline.wb(f.R),a=pe(a,f)):(d=b=null,a.Z.id&&a.v.id&&(d=a.Z.id+","+a.v.id,b=c[d]),g=qe(a,f),b?(b.Pb(g),c=a.presentationTimeline.Ja(),b.Fb(c-a.M.start)):(a.presentationTimeline.Za(g,0==a.M.index),b=new Q(g),d&&a.Fa&&(c[d]=b)),a.Fa&&a.M.Lb||Vd(b,a.M.duration),a={createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:b.find.bind(b),getSegmentReference:b.get.bind(b)});return{createSegmentIndex:a.createSegmentIndex,findSegmentPosition:a.findSegmentPosition,
getSegmentReference:a.getSegmentReference,initSegmentReference:e,aa:f.aa}}function oe(a){return a.eb}
function pe(a,b){var c=a.M.duration,d=b.R,e=b.Aa,f=b.timescale,g=b.Ob,h=a.bandwidth||null,k=a.v.id,m=a.v.ba;return{createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:function(a){return 0>a||c&&a>=c?null:Math.floor(a/d)},getSegmentReference:function(a){var b=a*d,q=b+d;c&&(q=Math.min(q,c));return 0>q||c&&b>=c?null:new M(a,b,q,function(){var c=Hd(g,k,a+e,h,b*f);return C(m,[c])},0,null)}}}
function qe(a,b){for(var c=[],d=0;d<b.H.length;d++){var e=d+b.Aa;c.push(new M(e,b.H[d].start,b.H[d].end,function(a,b,c,d,e,q){a=Hd(a,b,e,c,q);return C(d,[a]).map(function(a){return a.toString()})}.bind(null,b.Ob,a.v.id,a.bandwidth||null,a.v.ba,e,b.H[d].Re+b.gc),0,null))}return c}function ne(a){var b=Jd(a,oe,"initialization");if(!b)return null;var c=a.v.id,d=a.bandwidth||null,e=a.v.ba;return new L(function(){var a=Hd(b,c,null,d,null);return C(e,[a])},0,null)};var re={},se={};n("shaka.media.ManifestParser.registerParserByExtension",function(a,b){se[a]=b});n("shaka.media.ManifestParser.registerParserByMime",function(a,b){re[a]=b});function te(){var a={},b;for(b in re)a[b]=!0;for(b in se)a[b]=!0;["application/dash+xml","application/x-mpegurl","application/vnd.apple.mpegurl","application/vnd.ms-sstr+xml"].forEach(function(b){a[b]=!!re[b]});["mpd","m3u8","ism"].forEach(function(b){a[b]=!!se[b]});return a}
function ue(a,b,c,d){var e=d;e||(d=(new ta(a)).Y.split("/").pop().split("."),1<d.length&&(d=d.pop().toLowerCase(),e=se[d]));if(e)return Promise.resolve(e);c=Va([a],c);c.method="HEAD";return b.request(0,c).then(function(b){(b=b.headers["content-type"])&&(b=b.toLowerCase());return(e=re[b])?e:Promise.reject(new p(2,4,4E3,a))},function(a){a.severity=2;return Promise.reject(a)})};function R(a,b){this.c=a;this.l=b;this.f=this.a=Infinity;this.b=1;this.j=this.g=0;this.i=!0;this.h=0}n("shaka.media.PresentationTimeline",R);R.prototype.S=function(){return this.a};R.prototype.getDuration=R.prototype.S;R.prototype.ha=function(a){this.a=a};R.prototype.setDuration=R.prototype.ha;R.prototype.pd=function(){return this.c};R.prototype.getPresentationStartTime=R.prototype.pd;R.prototype.Oc=function(a){this.j=a};R.prototype.setClockOffset=R.prototype.Oc;
R.prototype.yb=function(a){this.i=a};R.prototype.setStatic=R.prototype.yb;R.prototype.bc=function(a){this.f=a};R.prototype.setSegmentAvailabilityDuration=R.prototype.bc;R.prototype.Pc=function(a){this.l=a};R.prototype.setDelay=R.prototype.Pc;R.prototype.Za=function(a,b){0!=a.length&&(b&&(this.g=Math.max(this.g,a[0].startTime)),this.b=a.reduce(function(a,b){return Math.max(a,b.endTime-b.startTime)},this.b))};R.prototype.notifySegments=R.prototype.Za;
R.prototype.wb=function(a){this.b=Math.max(this.b,a)};R.prototype.notifyMaxSegmentDuration=R.prototype.wb;R.prototype.P=function(){return Infinity==this.a&&!this.i};R.prototype.isLive=R.prototype.P;R.prototype.xa=function(){return Infinity!=this.a&&!this.i};R.prototype.isInProgress=R.prototype.xa;R.prototype.Ja=function(){if(Infinity==this.f)return this.h;var a=this.Ia()-this.f;return Math.max(this.h,a)};R.prototype.getSegmentAvailabilityStart=R.prototype.Ja;R.prototype.Nc=function(a){this.h=a};
R.prototype.setAvailabilityStart=R.prototype.Nc;R.prototype.Ia=function(){return this.P()||this.xa()?Math.min(Math.max(0,(Date.now()+this.j)/1E3-this.b-this.c),this.a):this.a};R.prototype.getSegmentAvailabilityEnd=R.prototype.Ia;R.prototype.Ha=function(a){Infinity==this.f&&(a=0);var b=this.Ia();a=Math.min(this.g+a,b);return Math.max(this.Ja(),a)};R.prototype.getSafeSeekRangeStart=R.prototype.Ha;R.prototype.Va=function(){return this.Ha(0)};R.prototype.getSeekRangeStart=R.prototype.Va;
R.prototype.wa=function(){var a=this.P()||this.xa()?this.l:0;return Math.max(0,this.Ia()-a)};R.prototype.getSeekRangeEnd=R.prototype.wa;function ve(){this.a=this.b=null;this.g=[];this.c=null;this.i=[];this.h=1;this.j={};this.l=0;this.f=null}n("shaka.dash.DashParser",ve);l=ve.prototype;l.configure=function(a){this.b=a};l.start=function(a,b){this.g=[a];this.a=b;return we(this).then(function(){this.a&&xe(this,0);return this.c}.bind(this))};l.stop=function(){this.b=this.a=null;this.g=[];this.c=null;this.i=[];this.j={};null!=this.f&&(window.clearTimeout(this.f),this.f=null);return Promise.resolve()};l.update=function(){we(this)["catch"](function(a){if(this.a)this.a.onError(a)}.bind(this))};
l.onExpirationUpdated=function(){};function we(a){return a.a.networkingEngine.request(0,Va(a.g,a.b.retryParameters),function(){return!this.a}.bind(a)).then(function(a){if(this.a)return ye(this,a.data,a.uri)}.bind(a))}function ye(a,b,c){b=Ld(b,"MPD");if(!b)throw new p(2,4,4001,c);return Nd(b,a.b.retryParameters,a.b.dash.xlinkFailGracefully,c,a.a.networkingEngine).then(function(a){return ze(this,a,c)}.bind(a))}
function ze(a,b,c){c=[c];var d=J(b,"Location").map(ud).filter(Ra);0<d.length&&(c=a.g=d);d=J(b,"BaseURL").map(ud);c=C(c,d);var e=K(b,"minBufferTime",wd);a.l=K(b,"minimumUpdatePeriod",wd,-1);var f=K(b,"availabilityStartTime",vd);d=K(b,"timeShiftBufferDepth",wd);var g=K(b,"suggestedPresentationDelay",wd),h=K(b,"maxSegmentDuration",wd),k=b.getAttribute("type")||"static";if(a.c)var m=a.c.presentationTimeline;else{var q=Math.max(a.b.dash.defaultPresentationDelay,1.5*e);m=new R(f,null!=g?g:q)}f=Ae(a,{Fa:"static"!=
k,presentationTimeline:m,Z:null,M:null,T:null,v:null,bandwidth:0,rc:!1},c,b);g=f.duration;var w=f.periods;m.yb("static"==k);"static"!=k&&f.lc||m.ha(g||Infinity);m.bc(null!=d?d:Infinity);m.wb(h||1);if(a.c)return Promise.resolve();b=J(b,"UTCTiming");d=m.P();return Be(a,c,b,d).then(function(a){this.a&&(m.Oc(a),this.c={presentationTimeline:m,periods:w,offlineSessionIds:[],minBufferTime:e||0})}.bind(a))}
function Ae(a,b,c,d){var e=K(d,"mediaPresentationDuration",wd),f=[],g=0;d=J(d,"Period");for(var h=0;h<d.length;h++){var k=d[h];g=K(k,"start",wd,g);var m=K(k,"duration",wd),q=null;if(h!=d.length-1){var w=K(d[h+1],"start",wd);null!=w&&(q=w-g)}else null!=e&&(q=e-g);null==q&&(q=m);k=Ce(a,b,c,{start:g,duration:q,node:k,index:h,Lb:null==q||h==d.length-1});f.push(k);m=b.Z.id;-1==a.i.indexOf(m)&&(a.i.push(m),a.c&&(a.a.filterNewPeriod(k),a.c.periods.push(k)));if(null==q){g=null;break}g+=q}null==a.c&&a.a.filterAllPeriods(f);
return null!=e?{periods:f,duration:e,lc:!1}:{periods:f,duration:g,lc:!0}}
function Ce(a,b,c,d){b.Z=De(d.node,null,c);b.M=d;b.Z.id||(b.Z.id="__shaka_period_"+d.start);J(d.node,"EventStream").forEach(a.de.bind(a,d.start,d.duration));c=J(d.node,"AdaptationSet").map(a.be.bind(a,b)).filter(Ra);var e=c.map(function(a){return a.pe}).reduce(Pa,[]),f=e.filter(Sa);if(b.Fa&&e.length!=f.length)throw new p(2,4,4018);var g=c.filter(function(a){return!a.fc});c.filter(function(a){return a.fc}).forEach(function(a){var b=a.streams[0],c=a.fc;g.forEach(function(a){a.id==c&&a.streams.forEach(function(a){a.trickModeVideo=
b})})});e=Ee(g,"video");f=Ee(g,"audio");if(!e.length&&!f.length)throw new p(2,4,4004);f.length||(f=[null]);e.length||(e=[null]);b=[];for(c=0;c<f.length;c++)for(var h=0;h<e.length;h++)Fe(a,f[c],e[h],b);a=Ee(g,"text");e=[];for(c=0;c<a.length;c++)e.push.apply(e,a[c].streams);return{startTime:d.start,textStreams:e,variants:b}}function Ee(a,b){return a.filter(function(a){return a.contentType==b})}
function Fe(a,b,c,d){if(b||c)if(b&&c){var e=b.drmInfos;var f=c.drmInfos;if(e.length&&f.length?0<Rb(e,f).length:1){var g=Rb(b.drmInfos,c.drmInfos);for(e=0;e<b.streams.length;e++)for(var h=0;h<c.streams.length;h++)f=(c.streams[h].bandwidth||0)+(b.streams[e].bandwidth||0),f={id:a.h++,language:b.language,primary:b.Nb||c.Nb,audio:b.streams[e],video:c.streams[h],bandwidth:f,drmInfos:g,allowedByApplication:!0,allowedByKeySystem:!0},d.push(f)}}else for(g=b||c,e=0;e<g.streams.length;e++)f=g.streams[e].bandwidth||
0,f={id:a.h++,language:g.language||"und",primary:g.Nb,audio:b?g.streams[e]:null,video:c?g.streams[e]:null,bandwidth:f,drmInfos:g.drmInfos,allowedByApplication:!0,allowedByKeySystem:!0},d.push(f)}
l.be=function(a,b){a.T=De(b,a.Z,null);var c=!1,d=J(b,"Role"),e=d.map(function(a){return a.getAttribute("value")}).filter(Ra),f=void 0;"text"==a.T.contentType&&(f="subtitle");for(var g=0;g<d.length;g++){var h=d[g].getAttribute("schemeIdUri");if(null==h||"urn:mpeg:dash:role:2011"==h)switch(h=d[g].getAttribute("value"),h){case "main":c=!0;break;case "caption":case "subtitle":f=h}}var k=null,m=!1;J(b,"EssentialProperty").forEach(function(a){"http://dashif.org/guidelines/trickmode"==a.getAttribute("schemeIdUri")?
k=a.getAttribute("value"):m=!0});if(m)return null;d=J(b,"ContentProtection");var q=Dd(d,this.b.dash.customScheme,this.b.dash.ignoreDrmInfo);d=pc(b.getAttribute("lang")||"und");h=b.getAttribute("label");g=J(b,"Representation");e=g.map(this.ee.bind(this,a,q,f,d,h,c,e)).filter(function(a){return!!a});if(0==e.length)throw new p(2,4,4003);a.T.contentType&&"application"!=a.T.contentType||(a.T.contentType=Ge(e[0].mimeType,e[0].codecs),e.forEach(function(b){b.type=a.T.contentType}));e.forEach(function(a){q.drmInfos.forEach(function(b){a.keyId&&
b.keyIds.push(a.keyId)})});f=g.map(function(a){return a.getAttribute("id")}).filter(Ra);return{id:a.T.id||"__fake__"+this.h++,contentType:a.T.contentType,language:d,Nb:c,streams:e,drmInfos:q.drmInfos,fc:k,pe:f}};
l.ee=function(a,b,c,d,e,f,g,h){a.v=De(h,a.T,null);if(!He(a.v))return null;a.bandwidth=K(h,"bandwidth",zd)||0;var k=this.qe.bind(this);if(a.v.bb)k=fe(a,k);else if(a.v.qa)k=ie(a,this.j);else if(a.v.eb)k=me(a,k,this.j,!!this.c);else{var m=a.v.ba,q=a.M.duration||0;k={createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:function(a){return 0<=a&&a<q?1:null},getSegmentReference:function(a){return 1!=a?null:new M(1,0,q,function(){return m},0,null)},initSegmentReference:null,aa:0}}h=J(h,"ContentProtection");
h=Gd(h,this.b.dash.customScheme,b,this.b.dash.ignoreDrmInfo);return{id:this.h++,createSegmentIndex:k.createSegmentIndex,findSegmentPosition:k.findSegmentPosition,getSegmentReference:k.getSegmentReference,initSegmentReference:k.initSegmentReference,presentationTimeOffset:k.aa,mimeType:a.v.mimeType,codecs:a.v.codecs,frameRate:a.v.frameRate,bandwidth:a.bandwidth,width:a.v.width,height:a.v.height,kind:c,encrypted:0<b.drmInfos.length,keyId:h,language:d,label:e,type:a.T.contentType,primary:f,trickModeVideo:null,
containsEmsgBoxes:a.v.containsEmsgBoxes,roles:g,channelsCount:a.v.Rb}};l.Ke=function(){this.f=null;var a=Date.now();we(this).then(function(){this.a&&xe(this,(Date.now()-a)/1E3)}.bind(this))["catch"](function(a){this.a&&(a.severity=1,this.a.onError(a),xe(this,0))}.bind(this))};function xe(a,b){0>a.l||(a.f=window.setTimeout(a.Ke.bind(a),1E3*Math.max(Math.max(3,a.l)-b,0)))}
function De(a,b,c){b=b||{contentType:"",mimeType:"",codecs:"",containsEmsgBoxes:!1,frameRate:void 0,Rb:null};c=c||b.ba;var d=J(a,"BaseURL").map(ud),e=a.getAttribute("contentType")||b.contentType,f=a.getAttribute("mimeType")||b.mimeType,g=a.getAttribute("codecs")||b.codecs,h=K(a,"frameRate",Bd)||b.frameRate,k=!!J(a,"InbandEventStream").length,m=J(a,"AudioChannelConfiguration");m=Ie(m)||b.Rb;e||(e=Ge(f,g));return{ba:C(c,d),bb:td(a,"SegmentBase")||b.bb,qa:td(a,"SegmentList")||b.qa,eb:td(a,"SegmentTemplate")||
b.eb,width:K(a,"width",Ad)||b.width,height:K(a,"height",Ad)||b.height,contentType:e,mimeType:f,codecs:g,frameRate:h,containsEmsgBoxes:k||b.containsEmsgBoxes,id:a.getAttribute("id"),Rb:m}}
function Ie(a){for(var b=0;b<a.length;++b){var c=a[b],d=c.getAttribute("schemeIdUri");if(d&&(c=c.getAttribute("value")))switch(d){case "urn:mpeg:dash:outputChannelPositionList:2012":return c.trim().split(/ +/).length;case "urn:mpeg:dash:23003:3:audio_channel_configuration:2011":case "urn:dts:dash:audio_channel_configuration:2012":d=parseInt(c,10);if(!d)continue;return d;case "tag:dolby.com,2014:dash:audio_channel_configuration:2011":case "urn:dolby:dash:audio_channel_configuration:2011":if(d=parseInt(c,
16)){for(a=0;d;)d&1&&++a,d>>=1;return a}}}return null}function He(a){var b=0+(a.bb?1:0);b+=a.qa?1:0;b+=a.eb?1:0;if(0==b)return"text"==a.contentType||"application"==a.contentType?!0:!1;1!=b&&(a.bb&&(a.qa=null),a.eb=null);return!0}function Je(a,b,c,d){b=C(b,[c]);b=Va(b,a.b.retryParameters);b.method=d;return a.a.networkingEngine.request(0,b).then(function(a){if("HEAD"==d){if(!a.headers||!a.headers.date)return 0;a=a.headers.date}else a=D(a.data);a=Date.parse(a);return isNaN(a)?0:a-Date.now()})}
function Be(a,b,c,d){c=c.map(function(a){return{scheme:a.getAttribute("schemeIdUri"),value:a.getAttribute("value")}});var e=a.b.dash.clockSyncUri;d&&!c.length&&e&&c.push({scheme:"urn:mpeg:dash:utc:http-head:2014",value:e});return Oa(c,function(a){var c=a.value;switch(a.scheme){case "urn:mpeg:dash:utc:http-head:2014":case "urn:mpeg:dash:utc:http-head:2012":return Je(this,b,c,"HEAD");case "urn:mpeg:dash:utc:http-xsdate:2014":case "urn:mpeg:dash:utc:http-iso:2014":case "urn:mpeg:dash:utc:http-xsdate:2012":case "urn:mpeg:dash:utc:http-iso:2012":return Je(this,
b,c,"GET");case "urn:mpeg:dash:utc:direct:2014":case "urn:mpeg:dash:utc:direct:2012":return a=Date.parse(c),isNaN(a)?0:a-Date.now();case "urn:mpeg:dash:utc:http-ntp:2014":case "urn:mpeg:dash:utc:ntp:2014":case "urn:mpeg:dash:utc:sntp:2014":return Promise.reject();default:return Promise.reject()}}.bind(a))["catch"](function(){return 0})}
l.de=function(a,b,c){var d=c.getAttribute("schemeIdUri")||"",e=c.getAttribute("value")||"",f=K(c,"timescale",Ad)||1;J(c,"Event").forEach(function(c){var g=K(c,"presentationTime",Ad)||0,k=K(c,"duration",Ad)||0;g=g/f+a;k=g+k/f;null!=b&&(g=Math.min(g,a+b),k=Math.min(k,a+b));c={schemeIdUri:d,value:e,startTime:g,endTime:k,id:c.getAttribute("id")||"",eventElement:c};this.a.onTimelineRegionAdded(c)}.bind(this))};
l.qe=function(a,b,c){a=Va(a,this.b.retryParameters);null!=b&&(a.headers.Range="bytes="+b+"-"+(null!=c?c:""));return this.a.networkingEngine.request(1,a).then(function(a){return a.data})};function Ge(a,b){return E[kb(a,b)]?"text":a.split("/")[0]}se.mpd=ve;re["application/dash+xml"]=ve;function Ke(a,b,c,d){this.uri=a;this.type=b;this.a=c;this.segments=d||null}function Le(a,b,c,d){this.id=a;this.name=b;this.a=c;this.value=d||null}Le.prototype.toString=function(){function a(a){return a.name+'="'+a.value+'"'}return this.value?"#"+this.name+":"+this.value:0<this.a.length?"#"+this.name+":"+this.a.map(a).join(","):"#"+this.name};function Me(a,b){this.name=a;this.value=b}Le.prototype.getAttribute=function(a){var b=this.a.filter(function(b){return b.name==a});return b.length?b[0]:null};
function Ne(a,b,c){c=c||null;return(a=a.getAttribute(b))?a.value:c}function Oe(a,b){this.a=b;this.uri=a};function Pe(a,b){return a.filter(function(a){return a.name==b})}function Qe(a,b){var c=Pe(a,b);return c.length?c[0]:null}function Re(a,b,c){return a.filter(function(a){var d=a.getAttribute("TYPE");a=a.getAttribute("GROUP-ID");return d.value==b&&a.value==c})}function Se(a,b){return C([a],[b])[0]};function Te(a){this.b=a;this.a=0}function Ue(a,b){b.lastIndex=a.a;var c=b.exec(a.b);c=null==c?null:{position:c.index,length:c[0].length,se:c};if(a.a==a.b.length||null==c||c.position!=a.a)return null;a.a+=c.length;return c.se}function Ve(a){return a.a==a.b.length?null:(a=Ue(a,/[^ \t\n]*/gm))?a[0]:null};function We(){this.a=0}
function Xe(a,b,c){b=D(b);b=b.replace(/\r\n|\r(?=[^\n]|$)/gm,"\n").trim();var d=b.split(/\n+/m);if(!/^#EXTM3U($|[ \t\n])/m.test(d[0]))throw new p(2,4,4015);b=0;for(var e=[],f=1;f<d.length;)if(/^#(?!EXT)/m.test(d[f]))f+=1;else{var g=d[f];g=Ze(a.a++,g);if(0<=$e.indexOf(g.name))b=1;else if(0<=af.indexOf(g.name)){if(1!=b)throw new p(2,4,4017);d=d.splice(f,d.length-f);a=bf(a,d,e);return new Ke(c,b,e,a)}e.push(g);f+=1;"EXT-X-STREAM-INF"==g.name&&(g.a.push(new Me("URI",d[f])),f+=1)}return new Ke(c,b,e)}
function bf(a,b,c){var d=[],e=[];b.forEach(function(a){if(/^(#EXT)/.test(a))a=Ze(this.a++,a),0<=$e.indexOf(a.name)?c.push(a):e.push(a);else{if(/^#(?!EXT)/m.test(a))return[];d.push(new Oe(a.trim(),e));e=[]}}.bind(a));return d}
function Ze(a,b){var c=b.match(/^#(EXT[^:]*)(?::(.*))?$/);if(!c)throw new p(2,4,4016);var d=c[1],e=c[2];c=[];if(e&&0<=e.indexOf("=")){e=new Te(e);for(var f,g=/([^=]+)=(?:"([^"]*)"|([^",]*))(?:,|$)/g;f=Ue(e,g);)c.push(new Me(f[1],f[2]||f[3]))}else if(e)return new Le(a,d,c,e);return new Le(a,d,c)}var $e="EXT-X-TARGETDURATION EXT-X-MEDIA-SEQUENCE EXT-X-DISCONTINUITY-SEQUENCE EXT-X-PLAYLIST-TYPE EXT-X-MAP EXT-X-I-FRAMES-ONLY EXT-X-ENDLIST".split(" "),af="EXTINF EXT-X-BYTERANGE EXT-X-DISCONTINUITY EXT-X-PROGRAM-DATE-TIME EXT-X-KEY EXT-X-DATERANGE".split(" ");function cf(a){return new Promise(function(b){var c=cf.parse(a);b({uri:a,data:c.data,headers:{"content-type":c.contentType}})})}n("shaka.net.DataUriPlugin",cf);
cf.parse=function(a){var b=a.split(":");if(2>b.length||"data"!=b[0])throw new p(2,1,1004,a);b=b.slice(1).join(":").split(",");if(2>b.length)throw new p(2,1,1004,a);var c=b[0];b=window.decodeURIComponent(b.slice(1).join(","));c=c.split(";");var d=null;1<c.length&&(d=c[1]);if("base64"==d)a=ub(b).buffer;else{if(d)throw new p(2,1,1005,a);a=pb(b)}return{data:a,contentType:c[0]}};Ua("data",cf);function df(){this.h=this.c=null;this.I=1;this.u={};this.A={};this.L={};this.a={};this.b=null;this.l="";this.s=new We;this.j=this.i=null;this.f=ef;this.m=null;this.g=0;this.w=Infinity}n("shaka.hls.HlsParser",df);l=df.prototype;l.configure=function(a){this.h=a};l.start=function(a,b){this.c=b;this.l=a;return ff(this,a).then(function(b){return gf(this,b.data,a).then(function(){hf(this,this.i);return this.m}.bind(this))}.bind(this))};
l.stop=function(){this.h=this.c=null;this.u={};this.A={};this.m=null;return Promise.resolve()};l.update=function(){if(this.f!=jf.na){var a=[],b;for(b in this.a)a.push(kf(this,this.a[b],b));return Promise.all(a)}};
function kf(a,b,c){ff(a,c).then(function(a){var d=jf,f=Xe(this.s,a.data,c);if(1!=f.type)throw new p(2,4,4017);a=Qe(f.a,"EXT-X-MEDIA-SEQUENCE");var g=b.stream;lf(this,f,a?Number(a.value):0,g.mimeType,g.codecs).then(function(a){b.cb.a=a;a=a[a.length-1];Qe(f.a,"EXT-X-ENDLIST")&&(mf(this,d.na),this.b.ha(a.endTime))}.bind(this))}.bind(a))}l.onExpirationUpdated=function(){};
function gf(a,b,c){b=Xe(a.s,b,c);if(0!=b.type)throw new p(2,4,4022);return nf(a,b).then(function(a){this.c.filterAllPeriods([a]);var b=Infinity,c=0,d=0,h=Infinity,k;for(k in this.a){var m=this.a[k];b=Math.min(b,m.Qb);c=Math.max(c,m.Qb);d=Math.max(d,m.yd);"text"!=m.stream.type&&(h=Math.min(h,m.duration))}m=null;var q=0;this.f!=jf.na&&(m=Date.now()/1E3-d,q=3*this.g);this.b=new R(m,q);this.b.yb(this.f==jf.na);this.b.wb(this.g);if(this.f!=jf.na){b=3*this.g;this.b.Pc(b);this.i=this.w;this.f==jf.hc&&this.b.bc(b);
for(b=0;95443.7176888889<=c;)b+=95443.7176888889,c-=95443.7176888889;if(b)for(k in this.a)m=this.a[k],95443.7176888889>m.Qb&&(m.stream.presentationTimeOffset=-b,m.cb.offset(b))}else for(k in this.b.ha(h),this.a)m=this.a[k],m.stream.presentationTimeOffset=b,m.cb.offset(-b),Vd(m.cb,h);this.m={presentationTimeline:this.b,periods:[a],offlineSessionIds:[],minBufferTime:0}}.bind(a))}
function nf(a,b){var c=b.a,d=Pe(b.a,"EXT-X-MEDIA").filter(function(a){return"SUBTITLES"==of(a,"TYPE")}.bind(a)).map(function(a){return pf(this,a)}.bind(a));return Promise.all(d).then(function(a){var d=Pe(c,"EXT-X-STREAM-INF").map(function(a){return qf(this,a,b)}.bind(this));return Promise.all(d).then(function(b){return{startTime:0,variants:b.reduce(Pa,[]),textStreams:a}}.bind(this))}.bind(a))}
function qf(a,b,c){var d=Ne(b,"CODECS","avc1.42E01E,mp4a.40.2").split(","),e=b.getAttribute("RESOLUTION"),f=null,g=null,h=Ne(b,"FRAME-RATE"),k=Number(of(b,"BANDWIDTH"));if(e){var m=e.value.split("x");f=m[0];g=m[1]}c=Pe(c.a,"EXT-X-MEDIA");var q=Ne(b,"AUDIO"),w=Ne(b,"VIDEO");q?c=Re(c,"AUDIO",q):w&&(c=Re(c,"VIDEO",w));if(m=rf("text",d)){var r=Ne(b,"SUBTITLES");r&&(r=Re(c,"SUBTITLES",r),r.length&&(a.u[r[0].id].stream.codecs=m));d.splice(d.indexOf(m),1)}c=c.map(function(a){return sf(this,a,d)}.bind(a));
var t=[],y=[];return Promise.all(c).then(function(a){q?t=a:w&&(y=a);a=!1;if(t.length||y.length)if(t.length)if(of(b,"URI")==t[0].Zb){var c="audio";a=!0}else c="video";else c="audio";else 1==d.length?(c=rf("video",d),c=e||h||c?"video":"audio"):(c="video",d=[d.join(",")]);return a?Promise.resolve():tf(this,b,d,c)}.bind(a)).then(function(a){a&&("audio"==a.stream.type?t=[a]:y=[a]);y&&uf(y);t&&uf(t);return vf(this,t,y,k,f,g,h)}.bind(a))}
function uf(a){a.forEach(function(a){var b=a.stream.codecs.split(",");b=b.filter(function(a){return"mp4a.40.34"!=a});a.stream.codecs=b.join(",")})}
function vf(a,b,c,d,e,f,g){c.forEach(function(a){if(a=a.stream)a.width=Number(e)||void 0,a.height=Number(f)||void 0,a.frameRate=Number(g)||void 0}.bind(a));b.length||(b=[null]);c.length||(c=[null]);for(var h=[],k=0;k<b.length;k++)for(var m=0;m<c.length;m++){var q=b[k]?b[k].stream:null,w=c[m]?c[m].stream:null,r=b[k]?b[k].drmInfos:null,t=c[m]?c[m].drmInfos:null;if(q&&w)if(r.length&&t.length?0<Rb(r,t).length:1)var y=Rb(r,t);else continue;else q?y=r:w&&(y=t);r=(c[k]?c[k].Zb:"")+" - "+(b[k]?b[k].Zb:"");
a.A[r]||(q=wf(a,q,w,d,y),h.push(q),a.A[r]=q)}return h}function wf(a,b,c,d,e){return{id:a.I++,language:b?b.language:"und",primary:!!b&&b.primary||!!c&&c.primary,audio:b,video:c,bandwidth:d,drmInfos:e,allowedByApplication:!0,allowedByKeySystem:!0}}function pf(a,b){of(b,"TYPE");return sf(a,b,[]).then(function(a){return a.stream})}
function sf(a,b,c){var d=of(b,"URI");d=Se(a.l,d);if(a.a[d])return Promise.resolve(a.a[d]);var e=of(b,"TYPE").toLowerCase();"subtitles"==e&&(e="text");var f=pc(Ne(b,"LANGUAGE","und")),g=Ne(b,"NAME"),h=b.getAttribute("DEFAULT"),k=b.getAttribute("AUTOSELECT"),m=Ne(b,"CHANNELS");return yf(a,d,c,e,f,!!h||!!k,g,"audio"==e?zf(m):null).then(function(a){if(this.a[d])return this.a[d];this.u[b.id]=a;return this.a[d]=a}.bind(a))}function zf(a){if(!a)return null;a=a.split("/")[0];return parseInt(a,10)}
function tf(a,b,c,d){var e=of(b,"URI");e=Se(a.l,e);return a.a[e]?Promise.resolve(a.a[e]):yf(a,e,c,d,"und",!1,null,null).then(function(a){return this.a[e]?this.a[e]:this.a[e]=a}.bind(a))}
function yf(a,b,c,d,e,f,g,h){var k=b;b=Se(a.l,b);var m,q="",w;return ff(a,b).then(function(a){m=Xe(this.s,a.data,b);if(1!=m.type)throw new p(2,4,4017);a=m;var e=jf,f=Qe(a.a,"EXT-X-PLAYLIST-TYPE"),g=Qe(a.a,"EXT-X-ENDLIST");g=f&&"VOD"==f.value||g;f=f&&"EVENT"==f.value&&!g;f=!g&&!f;g?mf(this,e.na):(f?mf(this,e.hc):mf(this,e.Uc),a=Af(a.a,"EXT-X-TARGETDURATION"),a=Number(a.value),this.g=Math.max(a,this.g),this.w=Math.min(a,this.w));if(1==c.length)q=c[0];else if(a=rf(d,c),null!=a)q=a;else throw new p(2,
4,4025,c);return Bf(this,d,q,m)}.bind(a)).then(function(a){w=a;a=Qe(m.a,"EXT-X-MEDIA-SEQUENCE");return lf(this,m,a?Number(a.value):0,w,q)}.bind(a)).then(function(a){var b=a[0].startTime,c=a[a.length-1].endTime,v=c-b;a=new Q(a);var r=Cf(m),Wc=void 0;"text"==d&&(Wc="subtitle");var Xc=[];m.segments.forEach(function(a){a=Pe(a.a,"EXT-X-KEY");Xc.push.apply(Xc,a)});var Yc=!1,Zc=[],xf=null;Xc.forEach(function(a){if("NONE"!=of(a,"METHOD")){Yc=!0;var b=of(a,"KEYFORMAT");if(a=(b=Df[b])?b(a):null)a.keyIds.length&&
(xf=a.keyIds[0]),Zc.push(a)}});if(Yc&&!Zc.length)throw new p(2,4,4026);r={id:this.I++,createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:a.find.bind(a),getSegmentReference:a.get.bind(a),initSegmentReference:r,presentationTimeOffset:0,mimeType:w,codecs:q,kind:Wc,encrypted:Yc,keyId:xf,language:e,label:g||null,type:d,primary:f,trickModeVideo:null,containsEmsgBoxes:!1,frameRate:void 0,width:void 0,height:void 0,bandwidth:void 0,roles:[],channelsCount:h};this.L[r.id]=a;return{stream:r,
cb:a,drmInfos:Zc,Zb:k,Qb:b,yd:c,duration:v}}.bind(a))}function Cf(a){var b=Pe(a.a,"EXT-X-MAP");if(!b.length)return null;if(1<b.length)throw new p(2,4,4020);b=b[0];var c=of(b,"URI"),d=Se(a.uri,c);a=0;c=null;if(b=Ne(b,"BYTERANGE"))a=b.split("@"),b=Number(a[0]),a=Number(a[1]),c=a+b-1;return new L(function(){return[d]},a,c)}
function Ef(a,b,c,d,e){var f=c.a,g=Se(a.uri,c.uri);a=Af(f,"EXTINF").value.split(",");a=e+Number(a[0]);c=0;var h=null;if(f=Qe(f,"EXT-X-BYTERANGE"))c=f.value.split("@"),f=Number(c[0]),c=c[1]?Number(c[1]):b.D+1,h=c+f-1;return new M(d,e,a,function(){return[g]},c,h)}
function lf(a,b,c,d,e){var f=b.segments,g=[],h=Se(b.uri,f[0].uri),k=Ef(b,null,f[0],c,0),m=Cf(b);return Ff(a,b.uri,m,k,d,e).then(function(a){h.split("/").pop();for(var d=0;d<f.length;++d){var e=g[g.length-1];e=Ef(b,e,f[d],c+d,0==d?a:e.endTime);g.push(e)}return g}.bind(a))}
function Gf(a,b){var c=a.c.networkingEngine,d=Va(b.a(),a.h.retryParameters),e={},f=b.O;e.Range="bytes="+f+"-"+(f+2048-1);var g={};if(0!=f||null!=b.D)f="bytes="+f+"-",null!=b.D&&(f+=b.D),g.Range=f;d.headers=e;return c.request(1,d)["catch"](function(){qa("Unable to fetch a partial HLS segment! Falling back to a full segment request, which is expensive!  Your server should support Range requests and CORS preflights.",d.uris[0]);d.headers=g;return c.request(1,d)})}
function Ff(a,b,c,d,e,f){if(a.m&&(b=a.a[b].cb.get(d.position)))return Promise.resolve(b.startTime);d=[Gf(a,d)];if("video/mp4"==e||"audio/mp4"==e)c?d.push(Gf(a,c)):d.push(d[0]);return Promise.all(d).then(function(a){if("video/mp4"==e||"audio/mp4"==e)return Hf(a[0].data,a[1].data);if("audio/mpeg"==e)return 0;if("video/mp2t"==e)return If(a[0].data);if("application/mp4"==e||0==e.indexOf("text/")){a=a[0].data;var b=kb(e,f);if(E[b]){var c=new $b(null);c.c=new E[b];a=c.Kb(a)}else a=0;return a}throw new p(2,
4,4030);}.bind(a))}function Hf(a,b){var c=0;(new O).B("moov",P).B("trak",P).B("mdia",P).W("mdhd",function(a){a.o.F(0==a.version?8:16);c=a.o.C();a.oa.stop()}).parse(b,!0);if(!c)throw new p(2,4,4030);var d=0,e=!1;(new O).B("moof",P).B("traf",P).W("tfdt",function(a){d=(0==a.version?a.o.C():a.o.Qa())/c;e=!0;a.oa.stop()}).parse(a,!0);if(!e)throw new p(2,4,4030);return d}
function If(a){function b(){throw new p(2,4,4030);}a=new N(new DataView(a),0);for(var c=0,d=0;;)if(c=a.U(),d=a.$(),71!=d&&b(),a.ab()&16384||b(),d=(a.$()&48)>>4,0!=d&&2!=d||b(),3==d&&(d=a.$(),a.F(d)),1!=a.C()>>8)a.seek(c+188),d=a.$(),71!=d&&(a.seek(c+192),d=a.$()),71!=d&&(a.seek(c+204),d=a.$()),71!=d&&b(),a.Kc(1);else return a.F(3),c=a.$()>>6,0!=c&&1!=c||b(),0==a.$()&&b(),c=a.$(),d=a.ab(),a=a.ab(),(1073741824*((c&14)>>1)+((d&65534)<<14|(a&65534)>>1))/9E4}
function rf(a,b){for(var c=Jf[a],d=0;d<c.length;d++)for(var e=0;e<b.length;e++)if(c[d].test(b[e].trim()))return b[e].trim();return"text"==a?"":null}
function Bf(a,b,c,d){d=Se(d.uri,d.segments[0].uri);var e=(new ta(d)).Y.split(".").pop(),f=Kf[b][e];if(f)return Promise.resolve(f);if("text"==b)return c&&"vtt"!=c?Promise.resolve("application/mp4"):Promise.resolve("text/vtt");b=Va([d],a.h.retryParameters);b.method="HEAD";return a.c.networkingEngine.request(1,b).then(function(a){a=a.headers["content-type"];if(!a)throw new p(2,4,4021,e);return a.split(";")[0]})}function of(a,b){var c=a.getAttribute(b);if(!c)throw new p(2,4,4023,b);return c.value}
function Af(a,b){var c=Qe(a,b);if(!c)throw new p(2,4,4024,b);return c}function ff(a,b){return a.c.networkingEngine.request(0,Va([b],a.h.retryParameters),function(){return!this.c}.bind(a))}
var Jf={audio:[/^vorbis$/,/^opus$/,/^flac$/,/^mp4a/,/^[ae]c-3$/],video:[/^avc/,/^hev/,/^hvc/,/^vp0?[89]/,/^av1$/],text:[/^vtt$/,/^wvtt/,/^stpp/]},Kf={audio:{mp4:"audio/mp4",m4s:"audio/mp4",m4i:"audio/mp4",m4a:"audio/mp4",ts:"video/mp2t"},video:{mp4:"video/mp4",m4s:"video/mp4",m4i:"video/mp4",m4v:"video/mp4",ts:"video/mp2t"},text:{mp4:"application/mp4",m4s:"application/mp4",m4i:"application/mp4",vtt:"text/vtt",ttml:"application/ttml+xml"}};
df.prototype.K=function(){this.c&&(this.j=null,this.update().then(function(){hf(this,this.i)}.bind(this))["catch"](function(a){this.c&&(a.severity=1,this.c.onError(a),hf(this,0))}.bind(this)))};function hf(a,b){null!=a.i&&null!=b&&(a.j=window.setTimeout(a.K.bind(a),1E3*b))}function mf(a,b){a.f=b;a.b&&a.b.yb(a.f==jf.na);a.f==jf.na&&null!=a.j&&(window.clearTimeout(a.j),a.j=null,a.i=null)}
var Df={"urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed":function(a){var b=of(a,"METHOD");if("SAMPLE-AES-CENC"!=b&&"SAMPLE-AES-CTR"!=b)return null;b=of(a,"URI");b=cf.parse(b);b=new Uint8Array(b.data);b=eb("com.widevine.alpha",[{initDataType:"cenc",initData:b}]);if(a=Ne(a,"KEYID"))b.keyIds=[a.substr(2).toLowerCase()];return b}},ef="VOD",jf={na:ef,Uc:"EVENT",hc:"LIVE"};se.m3u8=df;re["application/x-mpegurl"]=df;re["application/vnd.apple.mpegurl"]=df;function Lf(a,b,c,d){this.a=a;this.u=b;this.s=c;this.w=d;this.h=new z;this.b=null;this.g=!1;this.m=a.readyState;this.c=!1;this.j=this.A=-1;this.f=this.i=!1;b=this.l.bind(this);A(this.h,a,"waiting",b);this.b=new qb(b);sb(this.b,.25)}Lf.prototype.destroy=function(){var a=this.h.destroy();this.w=this.u=this.a=this.h=null;null!=this.b&&(this.b.cancel(),this.b=null);return a};Lf.prototype.$a=function(){this.f=!0;this.l()};
Lf.prototype.l=function(){if(0!=this.a.readyState){if(this.a.seeking){if(!this.g)return}else this.g=!1;if(!this.a.paused){this.a.readyState!=this.m&&(this.c=!1,this.m=this.a.readyState);var a=this.s.smallGapLimit,b=this.a.currentTime,c=this.a.buffered;a:{if(c&&c.length&&!(1==c.length&&1E-6>c.end(0)-c.start(0))){var d=.1;/(Edge\/|Trident\/|Tizen)/.test(navigator.userAgent)&&(d=.5);for(var e=0;e<c.length;e++)if(c.start(e)>b&&(0==e||c.end(e-1)-b<=d)){d=e;break a}}d=null}if(null==d){if(c=this.a.currentTime,
b=this.a.buffered,3>this.a.readyState&&0<this.a.playbackRate)if(this.j!=c)this.j=c,this.A=Date.now(),this.i=!1;else if(!this.i&&this.A<Date.now()-1E3)for(d=0;d<b.length;d++)if(c>=b.start(d)&&c<b.end(d)-.5){this.a.currentTime+=.1;this.j=this.a.currentTime;this.i=!0;break}}else if(0!=d||this.f){e=c.start(d);var f=this.u.presentationTimeline.wa();if(!(e>=f)){f=e-b;a=f<=a;var g=!1;.001>f||(a||this.c||(this.c=!0,b=new B("largegap",{currentTime:b,gapSize:f}),b.cancelable=!0,this.w(b),this.s.jumpLargeGaps&&
!b.defaultPrevented&&(g=!0)),!a&&!g)||(0!=d&&c.end(d-1),this.a.currentTime=e)}}}}};function Mf(a,b,c){this.a=a;this.j=b;this.i=c;this.b=new z;this.g=1;this.h=!1;this.c=null;this.f=new qb(this.Bd.bind(this));0<a.readyState?this.zc():(db(this.b,a,"loadedmetadata",this.zc.bind(this)),A(this.b,a,"timeupdate",function(){rb(this.f,.1)}.bind(this)));A(this.b,a,"ratechange",this.Pd.bind(this))}l=Mf.prototype;l.destroy=function(){var a=this.b.destroy();this.b=null;null!=this.c&&(this.c.cancel(),this.c=null);null!=this.f&&(this.f.cancel(),this.f=null);this.j=this.a=null;return a};
function Nf(a){return 0<a.a.readyState?a.a.currentTime:a.i}function Of(a,b){0<a.a.readyState?Pf(a,a.a.currentTime,b):(a.i=b,setTimeout(a.j,0))}l.Ua=function(){return this.g};function Qf(a,b){null!=a.c&&(a.c.cancel(),a.c=null);a.g=b;a.a.playbackRate=a.h||0>b?0:b;!a.h&&0>b&&(a.c=new qb(function(){this.a.currentTime+=b/4}.bind(a)),sb(a.c,.25))}l.Pd=function(){var a=this.h||0>this.g?0:this.g;this.a.playbackRate&&this.a.playbackRate!=a&&Qf(this,this.a.playbackRate)};
l.zc=function(){this.b.ia(this.a,"timeupdate");this.f.cancel();.001>Math.abs(this.a.currentTime-this.i)?this.Ac():(db(this.b,this.a,"seeking",this.Ac.bind(this)),this.a.currentTime=this.i)};l.Ac=function(){A(this.b,this.a,"seeking",this.j.bind(this))};l.Bd=function(){this.i=this.a.currentTime;this.j()};function Pf(a,b,c){a.a.currentTime=c;var d=0,e=function(){!this.a||10<=d++||this.a.currentTime!=b||(this.a.currentTime=c,setTimeout(e,100))}.bind(a);setTimeout(e,100)};function Rf(a,b,c,d,e,f){this.b=a;this.c=b;this.h=c;this.i=e;this.f=null;this.g=new Lf(a,b,c,f);b=this.Rd.bind(this);null==d&&(d=this.c.presentationTimeline,d=Infinity>d.S()?d.Va():d.wa());d=Sf(this,Tf(this,d));this.a=new Mf(a,b,d);this.f=new qb(this.Od.bind(this));sb(this.f,.25)}l=Rf.prototype;l.destroy=function(){var a=Promise.all([this.a.destroy(),this.g.destroy()]);this.g=this.a=null;null!=this.f&&(this.f.cancel(),this.f=null);this.i=this.h=this.c=this.b=null;return a};
function Uf(a){var b=Nf(a.a);0<a.b.readyState&&(a.b.paused||(b=Tf(a,b)));return b}l.Ua=function(){return this.a.Ua()};l.$a=function(){this.g.$a()};l.Od=function(){if(0!=this.b.readyState&&!this.b.seeking&&!this.b.paused){var a=this.b.currentTime,b=this.c.presentationTimeline,c=b.Va();.2>b.wa()-c&&(c-=.1);a<c&&(a=Vf(this,a),this.b.currentTime=a)}};l.Rd=function(){var a=this.g;a.g=!0;a.f=!1;a.c=!1;a=Nf(this.a);var b=Vf(this,a);.001<Math.abs(b-a)?Of(this.a,b):this.i()};
function Sf(a,b){var c=a.c.presentationTimeline.S();return b>=c?c-a.h.durationBackoff:b}function Vf(a,b){var c=Tb.bind(null,a.b.buffered),d=1*Math.max(a.c.minBufferTime||0,a.h.rebufferingGoal),e=a.c.presentationTimeline,f=e.Ha(0),g=e.wa(),h=e.S(),k=e.Ha(d),m=e.Ha(5);d=e.Ha(d+5);return b>=h?Sf(a,b):b>g?g:b<f?c(m)?m:d:b>=k||c(b)?b:d}function Tf(a,b){var c=a.c.presentationTimeline.Va();if(b<c)return c;c=a.c.presentationTimeline.wa();return b>c?c:b};function Wf(a,b,c,d,e,f,g){this.a=a;this.w=b;this.g=c;this.u=d;this.l=e;this.h=f;this.A=g;this.c=[];this.j=new z;this.b=!1;this.i=-1;this.f=null;Xf(this)}Wf.prototype.destroy=function(){var a=this.j?this.j.destroy():Promise.resolve();this.j=null;Yf(this);this.A=this.h=this.l=this.u=this.g=this.w=this.a=null;this.c=[];return a};
Wf.prototype.s=function(a){if(!this.c.some(function(b){return b.info.schemeIdUri==a.schemeIdUri&&b.info.startTime==a.startTime&&b.info.endTime==a.endTime})){var b={info:a,status:1};this.c.push(b);var c=new B("timelineregionadded",{detail:Zf(a)});this.h(c);this.m(!0,b)}};function Zf(a){var b=Na(a);b.eventElement=a.eventElement;return b}
Wf.prototype.m=function(a,b){var c=b.info.startTime>this.a.currentTime?1:b.info.endTime<this.a.currentTime?3:2,d=2==b.status,e=2==c;if(c!=b.status){if(!a||d||e)d||this.h(new B("timelineregionenter",{detail:Zf(b.info)})),e||this.h(new B("timelineregionexit",{detail:Zf(b.info)}));b.status=c}};function Xf(a){Yf(a);a.f=window.setTimeout(a.I.bind(a),250)}function Yf(a){a.f&&(window.clearTimeout(a.f),a.f=null)}
Wf.prototype.I=function(){this.f=null;Xf(this);var a=Kc(this.g,this.a.currentTime);a!=this.i&&(-1!=this.i&&this.A(),this.i=a);a=Ub(this.a.buffered,this.a.currentTime);var b=Sb(this.a.buffered),c=this.g.presentationTimeline,d=c.Ia();b=c.P()&&b>=d;c="ended"==this.w.readyState;b=b||this.a.ended||c;this.b?(c=1*Math.max(this.g.minBufferTime||0,this.u.rebufferingGoal),(b||a>=c)&&0!=this.b&&(this.b=!1,this.l(!1))):!b&&.5>a&&1!=this.b&&(this.b=!0,this.l(!0));this.c.forEach(this.m.bind(this,!1))};function $f(a,b){this.a=b;this.b=a;this.h=null;this.i=1;this.m=Promise.resolve();this.g=[];this.j={};this.c={};this.s=!1;this.A=null;this.w=this.f=this.l=!1;this.u=0}l=$f.prototype;l.destroy=function(){for(var a in this.c)ag(this.c[a]);this.h=this.c=this.j=this.g=this.m=this.b=this.a=null;this.f=!0;return Promise.resolve()};
l.configure=function(a){this.h=a;this.A=new Ha({maxAttempts:Math.max(a.retryParameters.maxAttempts,2),baseDelay:a.retryParameters.baseDelay,backoffFactor:a.retryParameters.backoffFactor,fuzzFactor:a.retryParameters.fuzzFactor,timeout:0},!0)};l.init=function(){var a=Uf(this.a.Na);a=this.a.uc(this.b.periods[Kc(this.b,a)]);return a.variant||a.text?bg(this,a).then(function(){this.a&&this.a.Fd&&this.a.Fd()}.bind(this)):Promise.reject(new p(2,5,5005))};
function S(a){var b=Uf(a.a.Na);return a.b.periods[Kc(a.b,b)]}function cg(a){var b=a.c.video||a.c.audio;return b?a.b.periods[b.ya]:null}function dg(a){return eg(a,"audio")}function fg(a){return eg(a,"video")}function eg(a,b){var c=a.c[b];return c?c.pa||c.stream:null}function gg(a,b){ic(a.a.J,"text");a.u++;a.w=!1;var c=a.u;a.a.J.init({text:b});return hg(a,[b]).then(function(){if(this.u==c&&!this.c.text&&!this.w){var a=Uf(this.a.Na);this.c.text=ig(b,Kc(this.b,a));jg(this,this.c.text,0)}}.bind(a))}
function kg(a,b){var c=a.c.video;if(c){var d=c.stream;if(d)if(b){var e=d.trickModeVideo;if(e){var f=c.pa;f||(lg(a,e,!1),c.pa=d)}}else if(f=c.pa)c.pa=null,lg(a,f,!0)}}function mg(a,b,c){b.video&&lg(a,b.video,c);b.audio&&lg(a,b.audio,c)}
function lg(a,b,c){var d=a.c[b.type];if(!d&&"text"==b.type&&a.h.ignoreTextStreamFailures)gg(a,b);else if(d){var e=Lc(a.b,b);c&&e!=d.ya?ng(a):(d.pa&&(b.trickModeVideo?(d.pa=b,b=b.trickModeVideo):d.pa=null),(e=a.g[e])&&e.Ra&&(e=a.j[b.id])&&e.Ra&&d.stream!=b&&("text"==b.type&&dc(a.a.J,kb(b.mimeType,b.codecs)),d.stream=b,d.vb=!0,c&&(d.ua?d.Ab=!0:d.za?(d.sa=!0,d.Ab=!0):(ag(d),og(a,d,!0)))))}}
function pg(a){var b=Uf(a.a.Na);Object.keys(a.c).every(function(a){var c=this.a.J;"text"==a?(a=c.a,a=b>=a.a&&b<a.b):(a=fc(c,a),a=Tb(a,b));return a}.bind(a))||ng(a)}function ng(a){for(var b in a.c){var c=a.c[b];c.ua||c.sa||(c.za?c.sa=!0:null==ec(a.a.J,b)?null==c.ra&&jg(a,c,0):(ag(c),og(a,c,!1)))}}
function bg(a,b,c){var d=Uf(a.a.Na),e=Kc(a.b,d),f={};d=[];b.variant&&b.variant.audio&&(f.audio=b.variant.audio,d.push(b.variant.audio));b.variant&&b.variant.video&&(f.video=b.variant.video,d.push(b.variant.video));b.text&&(f.text=b.text,d.push(b.text));a.a.J.init(f);qg(a);return hg(a,d).then(function(){if(!this.f)for(var a in f){var b=f[a];this.c[a]||(this.c[a]=ig(b,e,c),jg(this,this.c[a],0))}}.bind(a))}
function ig(a,b,c){return{stream:a,type:a.type,Ka:null,ka:null,pa:null,vb:!0,ya:b,endOfStream:!1,za:!1,ra:null,sa:!1,Ab:!1,ua:!1,Yb:!1,Wa:!1,Ic:c||0}}
function rg(a,b){var c=a.g[b];if(c)return c.N;c={N:new u,Ra:!1};a.g[b]=c;var d=a.b.periods[b].variants.map(function(a){var b=[];a.audio&&b.push(a.audio);a.video&&b.push(a.video);a.video&&a.video.trickModeVideo&&b.push(a.video.trickModeVideo);return b}).reduce(Pa,[]).filter(Sa);d.push.apply(d,a.b.periods[b].textStreams);a.m=a.m.then(function(){if(!this.f)return hg(this,d)}.bind(a)).then(function(){this.f||(this.g[b].N.resolve(),this.g[b].Ra=!0)}.bind(a))["catch"](function(a){this.f||(this.g[b].N.reject(),
delete this.g[b],this.a.onError(a))}.bind(a));return c.N}
function hg(a,b){b.map(function(a){return a.id}).filter(Sa);for(var c=[],d=0;d<b.length;++d){var e=b[d],f=a.j[e.id];f?c.push(f.N):(a.j[e.id]={N:new u,Ra:!1},c.push(e.createSegmentIndex()))}return Promise.all(c).then(function(){if(!this.f)for(var a=0;a<b.length;++a){var c=this.j[b[a].id];c.Ra||(c.N.resolve(),c.Ra=!0)}}.bind(a))["catch"](function(a){if(!this.f){for(var c=0;c<b.length;c++)this.j[b[c].id].N.reject(),delete this.j[b[c].id];return Promise.reject(a)}}.bind(a))}
function qg(a){var b=a.b.presentationTimeline.S();Infinity>b?a.a.J.ha(b):a.a.J.ha(Math.pow(2,32))}l.Me=function(a){if(!this.f&&!a.za&&null!=a.ra&&!a.ua)if(a.ra=null,a.sa)og(this,a,a.Ab);else{try{var b=sg(this,a);null!=b&&(jg(this,a,b),a.Wa=!1)}catch(c){tg(this,c);return}b=hb(this.c);ug(this,a);b.every(function(a){return a.endOfStream})&&this.a.J.endOfStream().then(function(){var a=this.a.J.S();a<this.b.presentationTimeline.S()&&this.b.presentationTimeline.ha(a)}.bind(this))}};
function sg(a,b){var c=Uf(a.a.Na),d=b.Ka&&b.ka?a.b.periods[Lc(a.b,b.Ka)].startTime+b.ka.endTime:Math.max(c,b.Ic),e=Lc(a.b,b.stream),f=Kc(a.b,d);var g=a.a.J;var h=b.type;"text"==h?(g=g.a,g=null==g.b||g.b<c?0:g.b-Math.max(c,g.a)):(g=fc(g,h),g=Ub(g,c));h=Math.max(a.i*Math.max(a.b.minBufferTime||0,a.h.rebufferingGoal),a.i*a.h.bufferingGoal);if(d>=a.b.presentationTimeline.S())return b.endOfStream=!0,null;b.endOfStream=!1;b.ya=f;if(f!=e)return null;if(g>=h)return.5;d=a.a.J;f=b.type;d="text"==f?d.a.b:Sb(fc(d,
f));b.ka&&b.stream==b.Ka?(f=b.ka.position+1,d=vg(a,b,e,f)):(f=b.ka?b.stream.findSegmentPosition(Math.max(0,a.b.periods[Lc(a.b,b.Ka)].startTime+b.ka.endTime-a.b.periods[e].startTime)):b.stream.findSegmentPosition(Math.max(0,(d||c)-a.b.periods[e].startTime)),null==f?d=null:(g=null,null==d&&(g=vg(a,b,e,Math.max(0,f-1))),d=g||vg(a,b,e,f)));if(!d)return 1;b.Ic=0;wg(a,b,c,e,d);return null}
function vg(a,b,c,d){c=a.b.periods[c];b=b.stream.getSegmentReference(d);if(!b)return null;d=a.b.presentationTimeline;a=d.Ja();d=d.Ia();return c.startTime+b.endTime<a||c.startTime+b.startTime>d?null:b}
function wg(a,b,c,d,e){var f=a.b.periods[d],g=b.stream,h=a.b.presentationTimeline.S(),k=a.b.periods[d+1];d=xg(a,b,d,Math.max(0,f.startTime-.1),k?k.startTime:h);b.za=!0;b.vb=!1;h=yg(a,e);Promise.all([d,h]).then(function(a){if(!this.f&&!this.l)return zg(this,b,c,f,g,e,a[1])}.bind(a)).then(function(){this.f||this.l||(b.za=!1,b.Yb=!1,b.sa||this.a.$a(),jg(this,b,0),Ag(this,g))}.bind(a))["catch"](function(a){this.f||this.l||(b.za=!1,"text"==b.type&&this.h.ignoreTextStreamFailures?delete this.c.text:3017==
a.code?Bg(this,b,a):(b.Wa=!0,a.severity=2,tg(this,a)))}.bind(a))}function Bg(a,b,c){if(!hb(a.c).some(function(a){return a!=b&&a.Yb})){var d=Math.round(100*a.i);if(20<d)a.i-=.2;else if(4<d)a.i-=.04;else{b.Wa=!0;a.l=!0;a.a.onError(c);return}b.Yb=!0}jg(a,b,4)}
function xg(a,b,c,d,e){if(!b.vb)return Promise.resolve();c=jc(a.a.J,b.type,a.b.periods[c].startTime-b.stream.presentationTimeOffset,d,e);if(!b.stream.initSegmentReference)return c;a=yg(a,b.stream.initSegmentReference).then(function(a){if(!this.f)return gc(this.a.J,b.type,a,null,null)}.bind(a))["catch"](function(a){b.vb=!0;return Promise.reject(a)});return Promise.all([c,a])}
function zg(a,b,c,d,e,f,g){e.containsEmsgBoxes&&(new O).W("emsg",a.ce.bind(a,d,f)).parse(g);return Cg(a,b,c).then(function(){if(!this.f)return gc(this.a.J,b.type,g,f.startTime,f.endTime)}.bind(a)).then(function(){if(!this.f)return b.Ka=e,b.ka=f,Promise.resolve()}.bind(a))}
l.ce=function(a,b,c){var d=c.o.Wb(),e=c.o.Wb(),f=c.o.C(),g=c.o.C(),h=c.o.C(),k=c.o.C();c=c.o.Pa(c.o.G.byteLength-c.o.U());a=a.startTime+b.startTime+g/f;if("urn:mpeg:dash:event:2012"==d)this.a.Hd();else this.a.onEvent(new B("emsg",{detail:{startTime:a,endTime:a+h/f,schemeIdUri:d,value:e,timescale:f,presentationTimeDelta:g,eventDuration:h,id:k,messageData:c}}))};
function Cg(a,b,c){var d=Math.max(a.h.bufferBehind,a.b.presentationTimeline.b),e=ec(a.a.J,b.type);if(null==e)return Promise.resolve();c=c-e-d;return 0>=c?Promise.resolve():a.a.J.remove(b.type,e,e+c).then(function(){}.bind(a))}function Ag(a,b){if(!a.s&&(a.s=hb(a.c).every(function(a){return"text"==a.type?!0:!a.sa&&!a.ua&&a.ka}),a.s)){var c=Lc(a.b,b);a.g[c]||rg(a,c).then(function(){this.a.tc()}.bind(a))["catch"](Qa);for(c=0;c<a.b.periods.length;++c)rg(a,c)["catch"](Qa);a.a.Ud&&a.a.Ud()}}
function ug(a,b){if(b.ya!=Lc(a.b,b.stream)){var c=b.ya,d=hb(a.c);d.every(function(a){return a.ya==c})&&d.every(Dg)&&rg(a,c).then(function(){if(!this.f&&d.every(function(a){var b=Lc(this.b,a.stream);return Dg(a)&&a.ya==c&&b!=c}.bind(this))){var a=this.b.periods[c],b=this.a.uc(a),g={};b.variant&&b.variant.video&&(g.video=b.variant.video);b.variant&&b.variant.audio&&(g.audio=b.variant.audio);b.text&&(g.text=b.text);for(var h in this.c)if(!g[h]&&"text"!=h){this.a.onError(new p(2,5,5005));return}for(h in g)if(!this.c[h])if("text"==
h)bg(this,{text:g.text},a.startTime),delete g[h];else{this.a.onError(new p(2,5,5005));return}for(h in this.c)(a=g[h])?(lg(this,a,!1),jg(this,this.c[h],0)):delete this.c[h];this.a.tc()}}.bind(a))["catch"](Qa)}}function Dg(a){return!a.za&&null==a.ra&&!a.sa&&!a.ua}function yg(a,b){var c=Va(b.a(),a.h.retryParameters);if(0!=b.O||null!=b.D){var d="bytes="+b.O+"-";null!=b.D&&(d+=b.D);c.headers.Range=d}return a.a.Ya.request(1,c).then(function(a){return a.data})}
function og(a,b,c){b.sa=!1;b.Ab=!1;b.ua=!0;ic(a.a.J,b.type).then(function(){if(!this.f&&c){var a=this.a.J,e=b.type;return"text"==e?Promise.resolve():hc(a,e,a.gd.bind(a,e))}}.bind(a)).then(function(){this.f||(b.Ka=null,b.ka=null,b.ua=!1,b.endOfStream=!1,jg(this,b,0))}.bind(a))}function jg(a,b,c){b.ra=window.setTimeout(a.Me.bind(a,b),1E3*c)}function ag(a){null!=a.ra&&(window.clearTimeout(a.ra),a.ra=null)}
function tg(a,b){Ja(a.A).then(function(){this.a.onError(b);b.handled||this.h.failureCallback(b)}.bind(a))};function Eg(a,b){return new Promise(function(c,d){var e=new Eg.c;e.open(b.method,a,!0);e.responseType="arraybuffer";e.timeout=b.retryParameters.timeout;e.withCredentials=b.allowCrossSiteCredentials;e.onload=function(b){b=b.target;var e=b.getAllResponseHeaders().trim().split("\r\n").reduce(function(a,b){var c=b.split(": ");a[c[0].toLowerCase()]=c.slice(1).join(": ");return a},{});if(200<=b.status&&299>=b.status&&202!=b.status)b.responseURL&&(a=b.responseURL),c({uri:a,data:b.response,headers:e,fromCache:!!e["x-shaka-from-cache"]});
else{var f=null;try{f=ob(b.response)}catch(m){}d(new p(401==b.status||403==b.status?2:1,1,1001,a,b.status,f,e))}};e.onerror=function(){d(new p(1,1,1002,a))};e.ontimeout=function(){d(new p(1,1,1003,a))};for(var f in b.headers)e.setRequestHeader(f,b.headers[f]);e.send(b.body)})}n("shaka.net.HttpPlugin",Eg);Eg.c=window.XMLHttpRequest;Ua("http",Eg,1);Ua("https",Eg,1);function Fg(){this.b=null;this.a=[]}function Gg(){if(!window.indexedDB)return Promise.resolve();var a=window.indexedDB.deleteDatabase("shaka_offline_db"),b=new u;a.onsuccess=function(){b.resolve()};a.onerror=Hg.bind(null,a,b);return b}Fg.prototype.init=function(a){return Ig(a).then(function(a){this.b=a}.bind(this))};
Fg.prototype.destroy=function(){return Promise.all(this.a.map(function(a){try{a.transaction.abort()}catch(b){}return a.N["catch"](Qa)})).then(function(){this.b&&(this.b.close(),this.b=null)}.bind(this))};Fg.prototype.Ga=function(a){return Jg(this,"manifest-v3",a)};function Kg(a,b){return Lg(a,b)}function Jg(a,b,c){var d;return Mg(a,b,"readonly",function(a){d=a.get(c)}).then(function(){return d.result})}
function Lg(a,b){return Mg(a,"manifest-v3","readonly",function(a){a.openCursor().onsuccess=function(a){if(a=a.target.result)b(a.key,a.value),a["continue"]()}})}function Ng(a,b,c){return Mg(a,"manifest-v3","readwrite",function(a){a.put(c,b)})}function Og(a,b,c){var d;return Mg(a,b,"readwrite",function(a){a.add(c).onsuccess=function(a){d=a.target.result}}).then(function(){return d})}
function Pg(a,b,c,d){return Mg(a,b,"readwrite",function(a){c.forEach(function(b){a["delete"](b).onsuccess=function(){d&&d(b)}})})}function Mg(a,b,c,d){var e={transaction:a.b.transaction([b],c),N:new u};e.transaction.oncomplete=function(){a.a.splice(a.a.indexOf(e),1);e.N.resolve()};e.transaction.onabort=function(b){a.a.splice(a.a.indexOf(e),1);Hg(e.transaction,e.N,b)};e.transaction.onerror=Qg();b=e.transaction.objectStore(b);d(b);a.a.push(e);return e.N}
function Rg(a,b,c){function d(){var b=f.pop();b?e(b,d):(a.reject(new p(1,9,9010,g)),c.abort())}function e(a,b){c.objectStore(a).openCursor().onsuccess=function(a){(a=a.target.result)?(g.push(a.value.originalManifestUri),a["continue"]()):b()}}var f=["manifest","manifest-v2"].filter(function(a){return b.objectStoreNames.contains(a)}),g=[];d()}function Hg(a,b,c){b.reject(a.error?new p(2,9,9001,a.error):new p(2,9,9002));c.preventDefault()}
function Ig(a){function b(){return new Promise(function(a){setTimeout(a,1E3)})}var c=a||0,d=0<c;a=Sg(d);for(var e=0;e<c;e++)a=a.then(function(a){return a?a:b().then(function(){return Sg(d)})});return a.then(function(a){return a?a:Promise.reject(new p(2,9,9001,"Failed to issue upgrade after "+c+" retries"))})}
function Sg(a){var b=new u,c=!1,d=window.indexedDB.open("shaka_offline_db",3);d.onupgradeneeded=function(a){var d=a.target.transaction,e=d.db,h={autoIncrement:!0};0==a.oldVersion?(e.createObjectStore("manifest-v3",h),e.createObjectStore("segment-v3",h)):Rg(b,e,d);c=!0};d.onsuccess=function(d){d=d.target.result;a&&!c?(d.close(),b.resolve(null)):b.resolve(d)};d.onerror=Qg(function(){b.reject(new p(2,9,9001,"Failed to open IndexedDB Connection",d.error.message))});return b}
function Qg(a){return function(b){b.preventDefault();a&&a(b)}};function Tg(a,b,c){this.b={};this.i=[];this.h=a;this.j=b;this.m=c;this.g=this.a=null;this.f=this.c=0;this.l=[]}function Ug(a,b){a.l.push(b)}Tg.prototype.destroy=function(){var a=this.h,b=this.i,c=this.g||Promise.resolve();b.length&&(c=c.then(function(){return Pg(a,"segment-v3",b,null)}));this.b={};this.i=[];this.g=this.a=this.m=this.j=this.h=null;return c};function Vg(a,b,c,d,e){a.b[b]=a.b[b]||[];a.b[b].push({uris:c.a(),O:c.O,D:c.D,jc:d,Vd:e})}
function Wg(a,b){a.c=0;a.f=0;hb(a.b).forEach(function(a){a.forEach(this.s.bind(this))}.bind(a));a.a=b;var c=hb(a.b).map(function(a){var b=0,c=function(){if(!this.a)return Promise.reject(new p(2,9,9002));if(b>=a.length)return Promise.resolve();var d=a[b++];return Xg(this,d).then(c)}.bind(this);return c()}.bind(a));a.b={};a.g=Promise.all(c).then(function(){return Og(this.h,"manifest-v3",b)}.bind(a)).then(function(a){this.i=[];return a}.bind(a));return a.g}
function Xg(a,b){var c=Va(b.uris,a.m);if(0!=b.O||null!=b.D)c.headers.Range="bytes="+b.O+"-"+(null==b.D?"":b.D);var d;return a.j.request(1,c).then(function(a){if(!this.a)return Promise.reject(new p(2,9,9002));d=a.data.byteLength;return Og(this.h,"segment-v3",{data:a.data})}.bind(a)).then(function(a){if(!this.a)return Promise.reject(new p(2,9,9002));this.a.size+=d;this.f+=null==b.D?b.jc:b.D-b.O+1;this.i.push(a);b.Vd(a);Yg(this)}.bind(a))}Tg.prototype.s=function(a){this.c+=null==a.D?a.jc:a.D-a.O+1};
function Yg(a){var b=0==a.c?0:a.f/a.c,c=a.a.size;a.l.forEach(function(a){a(b,c)})};function Zg(a){return(a=/^offline:manifest\/([0-9]+)$/.exec(a))?Number(a[1]):null};function $g(a,b,c){var d=void 0==b.expiration?Infinity:b.expiration,e=b.presentationTimeline.S();b=xc(b.periods[0]);return{offlineUri:null,originalManifestUri:a,duration:e,size:0,expiration:d,tracks:b,appMetadata:c}}function ah(a,b){var c=bh(b.periods[0],[],new R(null,0)),d=b.appMetadata||{};c=xc(c);return{offlineUri:a,originalManifestUri:b.originalManifestUri,duration:b.duration,size:b.size,expiration:b.expiration,tracks:c,appMetadata:d}}
function bh(a,b,c){var d=a.streams.filter(ch),e=a.streams.filter(dh);b=eh(d,e,b);d=a.streams.filter(fh).map(gh);a.streams.forEach(function(a,b){var d=a.segments.map(function(a,b){return hh(b,a)});c.Za(d,0==b)});return{startTime:a.startTime,variants:b,textStreams:d}}function hh(a,b){var c="offline:segment/"+b.dataKey;return new M(a,b.startTime,b.endTime,function(){return[c]},0,null)}
function eh(a,b,c){var d={},e=[];e.push.apply(e,a);e.push.apply(e,b);e.forEach(function(a){a.variantIds.forEach(function(a){d[a]||(d[a]={id:a,language:"",primary:!1,audio:null,video:null,bandwidth:0,drmInfos:c,allowedByApplication:!0,allowedByKeySystem:!0})})});a.forEach(function(a){var b=gh(a);a.variantIds.forEach(function(a){a=d[a];a.language=b.language;a.primary=a.primary||b.primary;a.audio=b})});b.forEach(function(a){var b=gh(a);a.variantIds.forEach(function(a){a=d[a];a.primary=a.primary||b.primary;
a.video=b})});return hb(d)}
function gh(a){var b=a.segments.map(function(a,b){return hh(b,a)});b=new Q(b);b={id:a.id,createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:b.find.bind(b),getSegmentReference:b.get.bind(b),initSegmentReference:null,presentationTimeOffset:a.presentationTimeOffset,mimeType:a.mimeType,codecs:a.codecs,width:a.width||void 0,height:a.height||void 0,frameRate:a.frameRate||void 0,kind:a.kind,encrypted:a.encrypted,keyId:a.keyId,language:a.language,label:a.label||null,type:a.contentType,primary:a.primary,
trickModeVideo:null,containsEmsgBoxes:!1,roles:[],channelsCount:null};null!=a.initSegmentKey&&(b.initSegmentReference=ih(a.initSegmentKey));return b}function ih(a){var b="offline:segment/"+a;return new L(function(){return[b]},0,null)}function ch(a){return"audio"==a.contentType}function dh(a){return"video"==a.contentType}function fh(a){return"text"==a.contentType};function jh(){return kh().then(function(){var a=new Fg;return a.init().then(function(){return a})})}function lh(){return kh().then(function(){return Gg()})}function kh(){return null!=window.indexedDB?Promise.resolve():Promise.reject(new p(2,9,9E3))};function mh(){this.a=-1}l=mh.prototype;l.configure=function(){};l.start=function(a){var b=Zg(a);if(null==b)return Promise.reject(new p(2,1,9004,a));this.a=b;var c;return jh().then(function(a){c=a;return c.Ga(b)}.bind(this)).then(function(a){if(!a)throw new p(2,9,9003,b);return nh(a)}).then(function(a){return c.destroy().then(function(){return a})},function(a){return c.destroy().then(function(){throw a;})})};l.stop=function(){return Promise.resolve()};l.update=function(){};
l.onExpirationUpdated=function(a,b){var c=this.a,d;jh().then(function(a){d=a;return d.Ga(c)}).then(function(e){if(e&&!(0>e.sessionIds.indexOf(a))&&(void 0==e.expiration||e.expiration>b))return e.expiration=b,Ng(d,c,e)})["catch"](function(){}).then(function(){return d.destroy()})};function nh(a){var b=new R(null,0);b.ha(a.duration);var c=a.drmInfo?[a.drmInfo]:[];return{presentationTimeline:b,minBufferTime:2,offlineSessionIds:a.sessionIds,periods:a.periods.map(function(a){return bh(a,c,b)})}}
re["application/x-offline-manifest"]=mh;function oh(a){if(null!=Zg(a))return oh.a(a);var b=(b=/^offline:segment\/([0-9]+)$/.exec(a))?Number(b[1]):null;return null!=b?oh.b(b,a):Promise.reject(new p(2,1,9004,a))}n("shaka.offline.OfflineScheme",oh);oh.a=function(a){a={uri:a,data:new ArrayBuffer(0),headers:{"content-type":"application/x-offline-manifest"}};return Promise.resolve(a)};
oh.b=function(a,b){var c,d;return jh().then(function(b){c=b;return Jg(c,"segment-v3",a)}).then(function(a){d=a;return c.destroy()}).then(function(){if(!d)throw new p(2,9,9003,a);return{uri:b,data:d.data,headers:{}}})};Ua("offline",oh);function T(a,b,c){this.startTime=a;this.endTime=b;this.payload=c;this.region={x:0,y:0,width:100,height:100};this.position=null;this.positionAlign=ph;this.size=100;this.textAlign=qh;this.writingDirection=rh;this.lineInterpretation=sh;this.line=null;this.lineHeight="";this.lineAlign=th;this.displayAlign=uh;this.fontSize=this.backgroundColor=this.color="";this.fontWeight=vh;this.fontStyle=wh;this.fontFamily="";this.textDecoration=[];this.wrapLine=!0;this.id=""}n("shaka.text.Cue",T);var ph="auto";
T.positionAlign={LEFT:"line-left",RIGHT:"line-right",CENTER:"center",AUTO:ph};var qh="center",xh={LEFT:"left",RIGHT:"right",CENTER:qh,START:"start",END:"end"};T.textAlign=xh;var uh="before",yh={BEFORE:uh,CENTER:"center",AFTER:"after"};T.displayAlign=yh;var rh=0;T.writingDirection={HORIZONTAL_LEFT_TO_RIGHT:rh,HORIZONTAL_RIGHT_TO_LEFT:1,VERTICAL_LEFT_TO_RIGHT:2,VERTICAL_RIGHT_TO_LEFT:3};var sh=0;T.lineInterpretation={LINE_NUMBER:sh,PERCENTAGE:1};var th="center",zh={CENTER:th,START:"start",END:"end"};
T.lineAlign=zh;var vh=400;T.fontWeight={NORMAL:vh,BOLD:700};var wh="normal",Ah={NORMAL:wh,ITALIC:"italic",OBLIQUE:"oblique"};T.fontStyle=Ah;T.textDecoration={UNDERLINE:"underline",LINE_THROUGH:"lineThrough",OVERLINE:"overline"};function U(a){this.a=null;for(var b=0;b<a.textTracks.length;++b){var c=a.textTracks[b];c.mode="disabled";"Shaka Player TextTrack"==c.label&&(this.a=c)}this.a||(this.a=a.addTextTrack("subtitles","Shaka Player TextTrack"));this.a.mode="hidden";this.b=this.a.cues}n("shaka.text.SimpleTextDisplayer",U);U.prototype.remove=function(a,b){if(!this.a)return!1;Bh(this,function(c){return c.startTime>=b||c.endTime<=a?!1:!0});return!0};U.prototype.remove=U.prototype.remove;
U.prototype.append=function(a){for(var b=[],c=0;c<a.length;c++){var d=Ch(a[c]);d&&b.push(d)}b.slice().sort(function(a,c){return a.startTime!=c.startTime?a.startTime-c.startTime:a.endTime!=c.endTime?a.endTime-c.startTime:b.indexOf(c)-b.indexOf(a)}).forEach(function(a){this.a.addCue(a)}.bind(this))};U.prototype.append=U.prototype.append;U.prototype.destroy=function(){this.a&&Bh(this,function(){return!0});this.a=null;return Promise.resolve()};U.prototype.destroy=U.prototype.destroy;
U.prototype.isTextVisible=function(){return"showing"==this.a.mode};U.prototype.isTextVisible=U.prototype.isTextVisible;U.prototype.setTextVisibility=function(a){this.a.mode=a?"showing":"hidden"};U.prototype.setTextVisibility=U.prototype.setTextVisibility;
function Ch(a){if(a.startTime>=a.endTime)return null;var b=new VTTCue(a.startTime,a.endTime,a.payload);b.lineAlign=a.lineAlign;b.positionAlign=a.positionAlign;b.size=a.size;try{b.align=a.textAlign}catch(c){}"center"==a.textAlign&&"center"!=b.align&&(b.align="middle");2==a.writingDirection?b.vertical="lr":3==a.writingDirection&&(b.vertical="rl");1==a.lineInterpretation&&(b.snapToLines=!1);null!=a.line&&(b.line=a.line);null!=a.position&&(b.position=a.position);return b}
function Bh(a,b){for(var c=a.b,d=[],e=0;e<c.length;++e)b(c[e])&&d.push(c[e]);for(e=0;e<d.length;++e)a.a.removeCue(d[e])};function Dh(){this.a=Promise.resolve();this.b=this.c=this.f=!1;this.i=new Promise(function(a){this.g=a}.bind(this));this.l=[];this.j=[]}Dh.prototype.then=function(a){this.a=this.a.then(a).then(function(a){return this.b?(this.g(),Promise.reject(this.h)):Promise.resolve(a)}.bind(this));return this};
function Eh(a){a.f||(a.a=a.a.then(function(a){this.c=!0;this.l.forEach(function(a){a()});return Promise.resolve(a)}.bind(a),function(a){this.c=!0;return this.b?(this.g(),Promise.reject(this.h)):Promise.reject(a)}.bind(a)));a.f=!0;return a.a}Dh.prototype.cancel=function(a){if(this.c)return Promise.resolve();this.b=!0;this.h=a;this.j.forEach(function(a){a()});return this.i};function V(a,b){H.call(this);this.L=!1;this.f=a;this.qb=!1;this.u=null;this.m=new z;this.h=this.Cb=this.b=this.i=this.a=this.w=this.g=this.nb=this.ca=this.da=this.l=this.s=null;this.Xc=1E9;this.lb=[];this.pb=!1;this.ta=!0;this.K=this.Ta=this.Ea=null;this.ic=!1;this.A=null;this.ob=[];this.I={};this.c=Fh(this);this.mb={width:Infinity,height:Infinity};this.j=Gh();this.kb=0;this.Ca=this.c.preferredAudioLanguage;this.Da=this.c.preferredTextLanguage;this.hb=this.ib="";b&&b(this);this.s=new x(this.Ee.bind(this));
this.nb=Hh(this);A(this.m,this.f,"error",this.Xd.bind(this))}la(V,H);n("shaka.Player",V);function Ih(a){if(!a.Ea)return Promise.resolve();var b=Promise.resolve();a.i&&(b=a.i.stop(),a.i=null);a=a.Ea.cancel(new p(2,7,7E3));return Promise.all([b,a])}V.prototype.destroy=function(){this.L=!0;return Ih(this).then(function(){var a=Promise.all([this.Ta,Jh(this),this.m?this.m.destroy():null,this.s?this.s.destroy():null]);this.f=null;this.qb=!1;this.c=this.s=this.h=this.m=null;return a}.bind(this))};
V.prototype.destroy=V.prototype.destroy;V.version="v2.3.4";var Kh={};V.registerSupportPlugin=function(a,b){Kh[a]=b};V.isBrowserSupported=function(){return!!window.Promise&&!!window.Uint8Array&&!!Array.prototype.forEach&&!!window.MediaSource&&!!MediaSource.isTypeSupported&&!!window.MediaKeys&&!!window.navigator&&!!window.navigator.requestMediaKeySystemAccess&&!!window.MediaKeySystemAccess&&!!window.MediaKeySystemAccess.prototype.getConfiguration};
V.probeSupport=function(){return Pb().then(function(a){var b=te(),c=cc();a={manifest:b,media:c,drm:a};for(var d in Kh)a[d]=Kh[d]();return a})};
V.prototype.load=function(a,b,c){var d=this.zb(),e=new Dh;this.Ea=e;this.dispatchEvent(new B("loading"));var f=Date.now();return Eh(e.then(function(){return d}).then(function(){this.j=Gh();A(this.m,this.f,"playing",this.gb.bind(this));A(this.m,this.f,"pause",this.gb.bind(this));A(this.m,this.f,"ended",this.gb.bind(this));this.h=new this.c.abrFactory;this.h.configure(this.c.abr);this.u=new this.c.textDisplayFactory;this.u.setTextVisibility(this.qb);return ue(a,this.s,this.c.manifest.retryParameters,
c)}.bind(this)).then(function(b){this.i=new b;this.i.configure(this.c.manifest);return this.i.start(a,{networkingEngine:this.s,filterNewPeriod:this.sb.bind(this),filterAllPeriods:this.cc.bind(this),onTimelineRegionAdded:this.Wd.bind(this),onEvent:this.fb.bind(this),onError:this.Sa.bind(this)})}.bind(this)).then(function(b){b.periods.some(function(a){return a.variants.some(function(a){return a.video&&a.audio})})&&b.periods.forEach(function(a){a.variants=a.variants.filter(function(a){return a.video&&
a.audio})});if(0==b.periods.length)throw new p(2,4,4014);this.b=b;this.Cb=a;this.l=new zb({Ya:this.s,onError:this.Sa.bind(this),Tb:this.Gd.bind(this),onExpirationUpdated:this.Dd.bind(this),onEvent:this.fb.bind(this)});this.l.configure(this.c.drm);return this.l.init(b,!1)}.bind(this)).then(function(){this.cc(this.b.periods);this.kb=Date.now()/1E3;this.Ca=this.c.preferredAudioLanguage;this.Da=this.c.preferredTextLanguage;var a=this.b.presentationTimeline.S(),b=this.c.playRangeEnd,c=this.c.playRangeStart;
0<c&&(this.P()||this.b.presentationTimeline.Nc(c));b<a&&(this.P()||this.b.presentationTimeline.ha(b));return Promise.all([Cb(this.l,this.f),this.nb])}.bind(this)).then(function(){this.h.init(this.Fe.bind(this));this.g=new Rf(this.f,this.b,this.c.streaming,void 0==b?null:b,this.De.bind(this),this.fb.bind(this));this.w=new Wf(this.f,this.da,this.b,this.c.streaming,this.Qc.bind(this),this.fb.bind(this),this.Ce.bind(this));this.ca=new bc(this.f,this.da,this.u);this.a=new $f(this.b,{Na:this.g,J:this.ca,
Ya:this.s,uc:this.Ad.bind(this),tc:this.$c.bind(this),onError:this.Sa.bind(this),onEvent:this.fb.bind(this),Hd:this.Id.bind(this),$a:this.Sd.bind(this),filterNewPeriod:this.sb.bind(this),filterAllPeriods:this.cc.bind(this)});this.a.configure(this.c.streaming);Lh(this);this.dispatchEvent(new B("streaming"));return this.a.init()}.bind(this)).then(function(){if(this.c.streaming.startAtSegmentBoundary){var a=Mh(this,Uf(this.g));Of(this.g.a,a)}this.b.periods.forEach(this.sb.bind(this));Nh(this);Oh(this);
a=S(this.a);var b=Ec(a.variants,this.Ca,this.ib);this.h.setVariants(b);a.variants.some(function(a){return a.primary});this.ob.forEach(this.w.s.bind(this.w));this.ob=[];db(this.m,this.f,"loadeddata",function(){this.j.loadLatency=(Date.now()-f)/1E3}.bind(this));this.Ea=null}.bind(this)))["catch"](function(a){this.Ea==e&&(this.Ea=null,this.dispatchEvent(new B("unloading")));return Promise.reject(a)}.bind(this))};V.prototype.load=V.prototype.load;
function Lh(a){function b(a){return(a.video?a.video.codecs.split(".")[0]:"")+"-"+(a.audio?a.audio.codecs.split(".")[0]:"")}var c={};a.b.periods.forEach(function(a){a.variants.forEach(function(a){var d=b(a);d in c||(c[d]=[]);c[d].push(a)})});var d=null,e=Infinity;jb(c,function(a,b){var c=0,f=0;b.forEach(function(a){c+=a.bandwidth||0;++f});var g=c/f;g<e&&(d=a,e=g)});a.b.periods.forEach(function(a){a.variants=a.variants.filter(function(a){return b(a)==d?!0:!1})})}
function Hh(a){a.da=new MediaSource;var b=new u;A(a.m,a.da,"sourceopen",b.resolve);a.f.src=window.URL.createObjectURL(a.da);return b}V.prototype.configure=function(a){Ma(this.c,a,Fh(this),Ph(),"");Qh(this)};V.prototype.configure=V.prototype.configure;
function Qh(a){a.i&&a.i.configure(a.c.manifest);a.l&&a.l.configure(a.c.drm);if(a.a){a.a.configure(a.c.streaming);try{a.b.periods.forEach(a.sb.bind(a))}catch(e){a.Sa(e)}var b=dg(a.a),c=fg(a.a),d=S(a.a);(b=Ic(b,c,d.variants))&&b.allowedByApplication&&b.allowedByKeySystem||Rh(a,d)}a.h&&(a.h.configure(a.c.abr),a.c.abr.enabled&&!a.ta?a.h.enable():a.h.disable())}V.prototype.getConfiguration=function(){var a=Fh(this);Ma(a,this.c,Fh(this),Ph(),"");return a};V.prototype.getConfiguration=V.prototype.getConfiguration;
V.prototype.re=function(){this.c=Fh(this);Qh(this)};V.prototype.resetConfiguration=V.prototype.re;V.prototype.md=function(){return this.f};V.prototype.getMediaElement=V.prototype.md;V.prototype.pc=function(){return this.s};V.prototype.getNetworkingEngine=V.prototype.pc;V.prototype.Ib=function(){return this.Cb};V.prototype.getManifestUri=V.prototype.Ib;V.prototype.P=function(){return this.b?this.b.presentationTimeline.P():!1};V.prototype.isLive=V.prototype.P;
V.prototype.xa=function(){return this.b?this.b.presentationTimeline.xa():!1};V.prototype.isInProgress=V.prototype.xa;V.prototype.wd=function(){if(!this.b||!this.b.periods.length)return!1;var a=this.b.periods[0].variants;return a.length?!a[0].video:!1};V.prototype.isAudioOnly=V.prototype.wd;V.prototype.te=function(){var a=0,b=0;this.b&&(b=this.b.presentationTimeline,a=b.Va(),b=b.wa());return{start:a,end:b}};V.prototype.seekRange=V.prototype.te;
V.prototype.keySystem=function(){return this.l?this.l.keySystem():""};V.prototype.keySystem=V.prototype.keySystem;V.prototype.drmInfo=function(){return this.l?this.l.b:null};V.prototype.drmInfo=V.prototype.drmInfo;V.prototype.ub=function(){return this.l?this.l.ub():Infinity};V.prototype.getExpiration=V.prototype.ub;V.prototype.sc=function(){return this.pb};V.prototype.isBuffering=V.prototype.sc;
V.prototype.zb=function(){if(this.L)return Promise.resolve();this.dispatchEvent(new B("unloading"));return Ih(this).then(function(){this.Ta||(this.Ta=Sh(this).then(function(){this.Ta=null}.bind(this)));return this.Ta}.bind(this))};V.prototype.unload=V.prototype.zb;V.prototype.Ua=function(){return this.g?this.g.Ua():0};V.prototype.getPlaybackRate=V.prototype.Ua;V.prototype.Oe=function(a){this.g&&Qf(this.g.a,a);this.a&&kg(this.a,1!=a)};V.prototype.trickPlay=V.prototype.Oe;
V.prototype.ad=function(){this.g&&Qf(this.g.a,1);this.a&&kg(this.a,!1)};V.prototype.cancelTrickPlay=V.prototype.ad;V.prototype.ud=function(){if(!this.b||!this.g)return[];var a=Kc(this.b,Uf(this.g)),b=this.I[a]||{};return zc(this.b.periods[a],b.audio,b.video)};V.prototype.getVariantTracks=V.prototype.ud;V.prototype.td=function(){if(!this.b||!this.g)return[];var a=Kc(this.b,Uf(this.g));return Ac(this.b.periods[a],(this.I[a]||{}).text).filter(function(a){return 0>this.lb.indexOf(a.id)}.bind(this))};
V.prototype.getTextTracks=V.prototype.td;V.prototype.we=function(a){if(this.a){var b=S(this.a);if(a=Cc(b,a))Th(this,a,!1),this.ta?this.A=a:lg(this.a,a,!0),this.Da=a.language}};V.prototype.selectTextTrack=V.prototype.we;
V.prototype.xe=function(a,b){if(this.a){this.c.abr.enabled&&qa("Changing tracks while abr manager is enabled will likely result in the selected track being overriden. Consider disabling abr before calling selectVariantTrack().");var c=S(this.a);(c=Bc(c,a))&&Dc(c)&&(Uh(this,c,!1),Vh(this,c,b),this.Ca=c.language)}};V.prototype.selectVariantTrack=V.prototype.xe;V.prototype.jd=function(){if(!this.a)return[];var a=S(this.a);a=yc(a.variants).map(function(a){return a.audio}).filter(Sa);return Wh(a)};
V.prototype.getAudioLanguagesAndRoles=V.prototype.jd;V.prototype.sd=function(){if(!this.a)return[];var a=S(this.a);return Wh(a.textStreams)};V.prototype.getTextLanguagesAndRoles=V.prototype.sd;V.prototype.hd=function(){if(!this.a)return[];var a=S(this.a);return yc(a.variants).map(function(a){return a.language}).filter(Sa)};V.prototype.getAudioLanguages=V.prototype.hd;V.prototype.rd=function(){return this.a?S(this.a).textStreams.map(function(a){return a.language}).filter(Sa):[]};
V.prototype.getTextLanguages=V.prototype.rd;function Wh(a){var b=[];a.forEach(function(a){if(a){var c=a.language;a.roles.length?a.roles.forEach(function(a){b.push({language:c,role:a})}):b.push({language:c,role:""})}else b.push({language:"und",role:""})});return Xa(b,function(a,b){return a.language==b.language&&a.role==b.role})}V.prototype.ue=function(a,b){if(this.a){var c=S(this.a);this.Ca=a;this.ib=b||"";Rh(this,c)}};V.prototype.selectAudioLanguage=V.prototype.ue;
V.prototype.ve=function(a,b){if(this.a){var c=S(this.a);this.Da=a;this.hb=b||"";Rh(this,c)}};V.prototype.selectTextLanguage=V.prototype.ve;V.prototype.Mb=function(){return this.u?this.u.isTextVisible():this.qb};V.prototype.isTextTrackVisible=V.prototype.Mb;V.prototype.Ae=function(a){this.u&&this.u.setTextVisibility(a);this.qb=a;Xh(this);!this.c.streaming.alwaysStreamText&&this.a&&(a?(a=S(this.a),a=Gc(a.textStreams,this.Da,this.hb)[0],gg(this.a,a)):(a=this.a,a.w=!0,a.c.text&&(ag(a.c.text),delete a.c.text)))};
V.prototype.setTextTrackVisibility=V.prototype.Ae;V.prototype.od=function(){return this.b?new Date(1E3*this.b.presentationTimeline.c+1E3*this.f.currentTime):null};V.prototype.getPlayheadTimeAsDate=V.prototype.od;V.prototype.qd=function(){return this.b?new Date(1E3*this.b.presentationTimeline.c):null};V.prototype.getPresentationStartTimeAsDate=V.prototype.qd;V.prototype.Gb=function(){return this.ca?this.ca.Gb():{total:[],audio:[],video:[],text:[]}};V.prototype.getBufferedInfo=V.prototype.Gb;
V.prototype.getStats=function(){Zh(this);this.gb();var a=null,b=null,c=this.f;c=c&&c.getVideoPlaybackQuality?c.getVideoPlaybackQuality():{};if(this.g&&this.b){var d=Kc(this.b,Uf(this.g)),e=this.b.periods[d];if(d=this.I[d])b=Jc(d.audio,d.video,e.variants),a=b.video||{}}a||(a={});b||(b={});return{width:a.width||0,height:a.height||0,streamBandwidth:b.bandwidth||0,decodedFrames:Number(c.totalVideoFrames),droppedFrames:Number(c.droppedVideoFrames),estimatedBandwidth:this.h?this.h.getBandwidthEstimate():
NaN,loadLatency:this.j.loadLatency,playTime:this.j.playTime,bufferingTime:this.j.bufferingTime,switchHistory:Na(this.j.switchHistory),stateHistory:Na(this.j.stateHistory)}};V.prototype.getStats=V.prototype.getStats;
V.prototype.addTextTrack=function(a,b,c,d,e,f){if(!this.a)return Promise.reject();for(var g=S(this.a),h,k=0;k<this.b.periods.length;k++)if(this.b.periods[k]==g){if(k==this.b.periods.length-1){if(h=this.b.presentationTimeline.S()-g.startTime,Infinity==h)return Promise.reject()}else h=this.b.periods[k+1].startTime-g.startTime;break}var m={id:this.Xc++,createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:function(){return 1},getSegmentReference:function(b){return 1!=b?null:new M(1,0,
h,function(){return[a]},0,null)},initSegmentReference:null,presentationTimeOffset:0,mimeType:d,codecs:e||"",kind:c,encrypted:!1,keyId:null,language:b,label:f||null,type:"text",primary:!1,trickModeVideo:null,containsEmsgBoxes:!1,roles:[],channelsCount:null};this.lb.push(m.id);g.textStreams.push(m);return gg(this.a,m).then(function(){if(!this.L){var a=this.b.periods.indexOf(g),d=eg(this.a,"text");d&&(this.I[a].text=d.id);this.lb.splice(this.lb.indexOf(m.id),1);Rh(this,g);Nh(this);return{id:m.id,active:!1,
type:"text",bandwidth:0,language:b,label:f||null,kind:c,width:null,height:null}}}.bind(this))};V.prototype.addTextTrack=V.prototype.addTextTrack;V.prototype.ac=function(a,b){this.mb.width=a;this.mb.height=b};V.prototype.setMaxHardwareResolution=V.prototype.ac;V.prototype.Jc=function(){if(this.a){var a=this.a;if(a.f)a=!1;else if(a.l)a=!1;else{for(var b in a.c){var c=a.c[b];c.Wa&&(c.Wa=!1,jg(a,c,.1))}a=!0}}else a=!1;return a};V.prototype.retryStreaming=V.prototype.Jc;V.prototype.Ga=function(){return this.b};
V.prototype.getManifest=V.prototype.Ga;function Uh(a,b,c){b.video&&$h(a,b.video);b.audio&&$h(a,b.audio);var d=cg(a.a);b!=Ic(dg(a.a),fg(a.a),d?d.variants:[])&&a.j.switchHistory.push({timestamp:Date.now()/1E3,id:b.id,type:"variant",fromAdaptation:c,bandwidth:b.bandwidth})}function Th(a,b,c){$h(a,b);a.j.switchHistory.push({timestamp:Date.now()/1E3,id:b.id,type:"text",fromAdaptation:c,bandwidth:null})}function $h(a,b){var c=Lc(a.b,b);a.I[c]||(a.I[c]={});a.I[c][b.type]=b.id}
function Jh(a){a.m&&(a.m.ia(a.da,"sourceopen"),a.m.ia(a.f,"loadeddata"),a.m.ia(a.f,"playing"),a.m.ia(a.f,"pause"),a.m.ia(a.f,"ended"));a.f&&(a.f.removeAttribute("src"),a.f.load());var b=Promise.all([a.h?a.h.stop():null,a.l?a.l.destroy():null,a.ca?a.ca.destroy():null,a.g?a.g.destroy():null,a.w?a.w.destroy():null,a.a?a.a.destroy():null,a.i?a.i.stop():null,a.u?a.u.destroy():null]);a.ta=!0;a.l=null;a.ca=null;a.g=null;a.w=null;a.a=null;a.i=null;a.u=null;a.b=null;a.Cb=null;a.nb=null;a.da=null;a.ob=[];a.I=
{};a.j=Gh();return b}function Sh(a){return a.i?Jh(a).then(function(){this.L||(this.Qc(!1),this.nb=Hh(this))}.bind(a)):Promise.resolve()}function Ph(){return{".drm.servers":"",".drm.clearKeys":"",".drm.advanced":{distinctiveIdentifierRequired:!1,persistentStateRequired:!1,videoRobustness:"",audioRobustness:"",serverCertificate:new Uint8Array(0)}}}
function Fh(a){var b=5E5;navigator.connection&&navigator.connection.type&&(b=1E6*navigator.connection.downlink);return{drm:{retryParameters:Ia(),servers:{},clearKeys:{},advanced:{},delayLicenseRequestUntilPlayed:!1},manifest:{retryParameters:Ia(),dash:{customScheme:function(a){if(a)return null},clockSyncUri:"",ignoreDrmInfo:!1,xlinkFailGracefully:!1,defaultPresentationDelay:10}},streaming:{retryParameters:Ia(),failureCallback:a.dd.bind(a),rebufferingGoal:2,bufferingGoal:10,bufferBehind:30,ignoreTextStreamFailures:!1,
alwaysStreamText:!1,startAtSegmentBoundary:!1,smallGapLimit:.5,jumpLargeGaps:!1,durationBackoff:1},abrFactory:F,textDisplayFactory:function(a){return new U(a)}.bind(null,a.f),abr:{enabled:!0,defaultBandwidthEstimate:b,switchInterval:8,bandwidthUpgradeTarget:.85,bandwidthDowngradeTarget:.95,restrictions:{minWidth:0,maxWidth:Infinity,minHeight:0,maxHeight:Infinity,minPixels:0,maxPixels:Infinity,minBandwidth:0,maxBandwidth:Infinity}},preferredAudioLanguage:"",preferredTextLanguage:"",restrictions:{minWidth:0,
maxWidth:Infinity,minHeight:0,maxHeight:Infinity,minPixels:0,maxPixels:Infinity,minBandwidth:0,maxBandwidth:Infinity},playRangeStart:0,playRangeEnd:Infinity}}l=V.prototype;l.dd=function(a){var b=[1001,1002,1003];this.P()&&0<=b.indexOf(a.code)&&(a.severity=1,this.Jc())};function Gh(){return{width:NaN,height:NaN,streamBandwidth:NaN,decodedFrames:NaN,droppedFrames:NaN,estimatedBandwidth:NaN,loadLatency:NaN,playTime:0,bufferingTime:0,switchHistory:[],stateHistory:[]}}
l.cc=function(a){a.forEach(tc.bind(null,this.l,this.a?dg(this.a):null,this.a?fg(this.a):null));var b=$a(a,function(a){return a.variants.some(Dc)});if(0==b)throw new p(2,4,4032);if(b<a.length)throw new p(2,4,4011);a.forEach(function(a){sc(a,this.c.restrictions,this.mb)&&this.a&&S(this.a)==a&&Nh(this);if(!a.variants.some(Dc))throw new p(2,4,4012);}.bind(this))};
l.sb=function(a){tc(this.l,this.a?dg(this.a):null,this.a?fg(this.a):null,a);var b=a.variants,c=b.some(Dc);sc(a,this.c.restrictions,this.mb)&&this.a&&S(this.a)==a&&Nh(this);a=b.some(Dc);if(!c)throw new p(2,4,4011);if(!a)throw new p(2,4,4012);};function Vh(a,b,c){a.ta?(a.K=b,a.ic=c||!1):mg(a.a,b,c||!1)}function Zh(a){if(a.b){var b=Date.now()/1E3;a.pb?a.j.bufferingTime+=b-a.kb:a.j.playTime+=b-a.kb;a.kb=b}}
function Mh(a,b){function c(a,b){if(!a)return null;var c=a.findSegmentPosition(b-f.startTime);return null==c?null:(c=a.getSegmentReference(c))?c.startTime+f.startTime:null}var d=dg(a.a),e=fg(a.a),f=S(a.a);d=c(d,b);e=c(e,b);return null!=e&&null!=d?Math.max(e,d):null!=e?e:null!=d?d:b}l.Ee=function(a,b){this.h&&this.h.segmentDownloaded(a,b)};l.Qc=function(a){Zh(this);this.pb=a;this.gb();if(this.g){var b=this.g.a;a!=b.h&&(b.h=a,Qf(b,b.g))}this.dispatchEvent(new B("buffering",{buffering:a}))};l.Ce=function(){Nh(this)};
l.gb=function(){if(!this.L){var a=this.pb?"buffering":this.f.ended?"ended":this.f.paused?"paused":"playing";var b=Date.now()/1E3;if(this.j.stateHistory.length){var c=this.j.stateHistory[this.j.stateHistory.length-1];c.duration=b-c.timestamp;if(a==c.state)return}this.j.stateHistory.push({timestamp:b,state:a,duration:0})}};l.De=function(){if(this.w){var a=this.w;a.c.forEach(a.m.bind(a,!0))}this.a&&pg(this.a)};
function ai(a,b){if(!b||!b.length)return a.Sa(new p(2,4,4012)),null;a.h.setVariants(b);return a.h.chooseVariant()}function Rh(a,b){var c=Ec(b.variants,a.Ca,a.ib),d=Gc(b.textStreams,a.Da,a.hb);if(c=ai(a,c))Uh(a,c,!0),Vh(a,c,!0);(d=d[0])&&(a.c.streaming.alwaysStreamText||a.Mb())&&(Th(a,d,!0),a.ta?a.A=d:lg(a.a,d,!0));Oh(a)}
l.Ad=function(a){this.ta=!0;this.h.disable();var b={audio:!1,text:!1},c=Ec(a.variants,this.Ca,this.ib,b),d=Gc(a.textStreams,this.Da,this.hb,b);c=ai(this,c);d=d[0]||null;if(this.K){a:{var e=this.b;for(var f=0;f<e.periods.length;++f)for(var g=e.periods[f],h=0;h<g.variants.length;++h)if(g.variants[h]==this.K){e=f;break a}e=-1}e=this.b.periods[e];e==a&&(c=this.K);this.K=null}this.A&&(e=Lc(this.b,this.A),e=this.b.periods[e],e==a&&(d=this.A),this.A=null);c&&Uh(this,c,!0);d&&(Th(this,d,!0),!cg(this.a)&&
c&&c.audio&&b.text&&d.language!=c.audio.language&&(this.u.setTextVisibility(!0),Xh(this)));return this.c.streaming.alwaysStreamText||this.Mb()?{variant:c,text:d}:{variant:c,text:null}};l.$c=function(){this.ta=!1;this.c.abr.enabled&&this.h.enable();this.K&&(mg(this.a,this.K,this.ic),this.K=null);this.A&&(lg(this.a,this.A,!0),this.A=null)};l.Id=function(){this.i&&this.i.update&&this.i.update()};l.Sd=function(){this.g&&this.g.$a()};l.Fe=function(a,b){Uh(this,a,!0);this.a&&(mg(this.a,a,b||!1),Oh(this))};
function Oh(a){Promise.resolve().then(function(){this.L||this.dispatchEvent(new B("adaptation"))}.bind(a))}function Nh(a){Promise.resolve().then(function(){this.L||this.dispatchEvent(new B("trackschanged"))}.bind(a))}function Xh(a){a.dispatchEvent(new B("texttrackvisibility"))}l.Sa=function(a){if(!this.L){var b=new B("error",{detail:a});this.dispatchEvent(b);b.defaultPrevented&&(a.handled=!0)}};l.Wd=function(a){this.w?this.w.s(a):this.ob.push(a)};l.fb=function(a){this.dispatchEvent(a)};
l.Xd=function(){if(this.f.error){var a=this.f.error.code;if(1!=a){var b=this.f.error.msExtendedCode;b&&(0>b&&(b+=Math.pow(2,32)),b=b.toString(16));this.Sa(new p(2,3,3016,a,b,this.f.error.message))}}};
l.Gd=function(a){var b=["output-restricted","internal-error"],c=S(this.a),d=!1,e=Object.keys(a),f=1==e.length&&"00"==e[0];e.length&&c.variants.forEach(function(c){var e=[];c.audio&&e.push(c.audio);c.video&&e.push(c.video);e.forEach(function(e){var g=c.allowedByKeySystem;e.keyId&&(e=a[f?"00":e.keyId],c.allowedByKeySystem=!!e&&0>b.indexOf(e));g!=c.allowedByKeySystem&&(d=!0)})});(e=Ic(dg(this.a),fg(this.a),c.variants))&&!e.allowedByKeySystem&&Rh(this,c);d&&Nh(this)};
l.Dd=function(a,b){if(this.i&&this.i.onExpirationUpdated)this.i.onExpirationUpdated(a,b);this.dispatchEvent(new B("expirationupdated"))};function W(a){if(!a||a.constructor!=V)throw new p(2,9,9008);this.g=null;this.a=a;this.b=bi(this);this.f=null;this.l=!1;this.c=this.s=this.h=this.i=null}n("shaka.offline.Storage",W);function ci(){return null!=window.indexedDB}W.support=ci;W.prototype.destroy=function(){var a=this.g,b=this.c?this.c.destroy()["catch"](function(){}).then(function(){if(a)return a.destroy()}):Promise.resolve();this.b=this.a=this.c=this.g=null;return b};W.prototype.destroy=W.prototype.destroy;
W.prototype.configure=function(a){Ma(this.b,a,bi(this),{},"")};W.prototype.configure=W.prototype.configure;
W.prototype.store=function(a,b,c){function d(a){f=a}if(this.l)return Promise.reject(new p(2,9,9006));this.l=!0;var e=b||{},f=null;return di(this).then(function(){X(this);return ei(this,a,d,c)}.bind(this)).then(function(b){X(this);if(f)throw f;return fi(this,a,b.manifest,e,b.ed)}.bind(this)).then(function(a){X(this);return gi(this).then(function(){return a})}.bind(this))["catch"](function(a){f=f||a;return gi(this).then(function(){throw f;})}.bind(this))};W.prototype.store=W.prototype.store;
function fi(a,b,c,d,e){if(c.presentationTimeline.P()||c.presentationTimeline.xa())throw new p(2,9,9005,b);a.h=c;a.f=e;a.j(c.periods);a.s=$g(b,c,d);var f=hi(a,b,d);return Wg(a.c,f).then(function(a){return ah("offline:manifest/"+a,f)})}W.prototype.remove=function(a){return a.offlineUri?(qa("Removing downloaded content using shakaExtern.StoredContent is deprecated. Please remove using the offline uri."),ii(this,a.offlineUri)):ii(this,a)};W.prototype.remove=W.prototype.remove;
function ii(a,b){function c(a){6013!=a.code&&(e=a)}var d=Zg(b);if(null==d)return Promise.reject(new p(2,9,9004,b));var e=null,f,g;return di(a).then(function(){X(this);return this.g.Ga(d)}.bind(a)).then(function(a){X(this);if(!a)throw new p(2,9,9003,b);f=a;a=nh(f);g=new zb({Ya:this.a.s,onError:c,Tb:function(){},onExpirationUpdated:function(){},onEvent:function(){}});g.configure(this.a.getConfiguration().drm);return g.init(a,this.b.usePersistentLicense||!1)}.bind(a)).then(function(){return Eb(g,f.sessionIds)}.bind(a)).then(function(){return g.destroy()}.bind(a)).then(function(){X(this);
if(e)throw e;return ji(this,b,d,f)}.bind(a))}function ji(a,b,c,d){function e(){k++;f(g,k/m)}var f=a.b.progressCallback,g=ah(b,d),h=ki(d),k=0,m=h.length+1;return Promise.resolve().then(function(){X(this);return Pg(this.g,"segment-v3",h,e)}.bind(a)).then(function(){X(this);return Pg(this.g,"manifest-v3",[c],e)}.bind(a))}W.prototype.list=function(){var a=[];return di(this).then(function(){X(this);return Kg(this.g,function(b,c){var d=ah("offline:manifest/"+b,c);a.push(d)})}.bind(this)).then(function(){return a})};
W.prototype.list=W.prototype.list;
function ei(a,b,c,d){function e(){}var f=a.a.s,g=a.a.getConfiguration(),h,k,m;return ue(b,f,g.manifest.retryParameters,d).then(function(a){X(this);m=new a;m.configure(g.manifest);return m.start(b,{networkingEngine:f,filterAllPeriods:this.j.bind(this),filterNewPeriod:this.m.bind(this),onTimelineRegionAdded:function(){},onEvent:function(){},onError:c})}.bind(a)).then(function(a){X(this);h=a;k=new zb({Ya:f,onError:c,Tb:e,onExpirationUpdated:function(){},onEvent:function(){}});k.configure(g.drm);return k.init(h,
this.b.usePersistentLicense||!1)}.bind(a)).then(function(){X(this);return li(h)}.bind(a)).then(function(){X(this);return Db(k)}.bind(a)).then(function(){X(this);return m.stop()}.bind(a)).then(function(){X(this);return{manifest:h,ed:k}}.bind(a))["catch"](function(a){if(m)return m.stop().then(function(){throw a;});throw a;})}
W.prototype.u=function(a){var b=[],c=pc(this.a.getConfiguration().preferredAudioLanguage),d=[0,nc,oc],e=a.filter(function(a){return"variant"==a.type});d=d.map(function(a){return e.filter(function(b){b=pc(b.language);return mc(a,c,b)})});for(var f,g=0;g<d.length;g++)if(d[g].length){f=d[g];break}f||(d=e.filter(function(a){return a.primary}),d.length&&(f=d));f||(f=e,e.map(function(a){return a.language}).filter(Sa));var h=f.filter(function(a){return a.height&&480>=a.height});h.length&&(h.sort(function(a,
b){return b.height-a.height}),f=h.filter(function(a){return a.height==h[0].height}));f.sort(function(a,b){return a.bandwidth-b.bandwidth});f.length&&b.push(f[Math.floor(f.length/2)]);b.push.apply(b,a.filter(function(a){return"text"==a.type}));return b};function bi(a){return{trackSelectionCallback:a.u.bind(a),progressCallback:function(a,c){if(a||c)return null},usePersistentLicense:!0}}
function di(a){if(null==window.indexedDB)return Promise.reject(new p(2,9,9E3));if(a.g)return Promise.resolve();var b=a.a.s,c=a.a.getConfiguration().streaming.retryParameters;return jh().then(function(a){this.g=a;this.c=new Tg(a,b,c);Ug(this.c,function(a,b){var c=this.s;c.size=b;this.b.progressCallback(c,a)}.bind(this))}.bind(a))}W.prototype.j=function(a){a.forEach(this.m.bind(this))};
W.prototype.m=function(a){var b=null;if(this.i){var c=this.i.filter(function(a){return"variant"==a.type})[0];c&&(b=Bc(a,c))}var d=c=null;b&&(b.audio&&(c=b.audio),b.video&&(d=b.video));tc(this.f,c,d,a);sc(a,this.a.getConfiguration().restrictions,{width:Infinity,height:Infinity})};function gi(a){var b=a.f?a.f.destroy():Promise.resolve();a.f=null;a.h=null;a.l=!1;a.i=null;return b}
function li(a){var b=a.periods.map(function(a){return a.variants}).reduce(Pa,[]).map(function(a){var b=[];a.audio&&b.push(a.audio);a.video&&b.push(a.video);return b}).reduce(Pa,[]).filter(Sa);a=a.periods.map(function(a){return a.textStreams}).reduce(Pa,[]);b.push.apply(b,a);return Promise.all(b.map(function(a){return a.createSegmentIndex()}))}
function hi(a,b,c){var d=a.h.periods.map(a.w.bind(a)),e=a.f.b,f=Hb(a.f);if(e&&a.b.usePersistentLicense){if(!f.length)throw new p(2,9,9007,b);e.initData=[]}return{originalManifestUri:b,duration:a.h.presentationTimeline.S(),size:0,expiration:a.f.ub(),periods:d,sessionIds:a.b.usePersistentLicense?f:[],drmInfo:e,appMetadata:c}}
W.prototype.w=function(a){var b=zc(a,null,null),c=Ac(a,null);b=this.b.trackSelectionCallback(b.concat(c));null==this.i&&(this.i=b,this.j(this.h.periods));for(c=b.length-1;0<c;--c){for(var d=!1,e=c-1;0<=e;--e)if(b[c].type==b[e].type&&b[c].kind==b[e].kind&&b[c].language==b[e].language){d=!0;break}if(d)break}d=[];for(c=0;c<b.length;c++){var f=Bc(a,b[c]);f?(f.audio&&((e=d.filter(function(a){return a.id==f.audio.id})[0])?e.variantIds.push(f.id):(e=f.video?f.bandwidth/2:f.bandwidth,d.push(mi(this,f.audio,
e,f.id)))),f.video&&((e=d.filter(function(a){return a.id==f.video.id})[0])?e.variantIds.push(f.id):(e=f.audio?f.bandwidth/2:f.bandwidth,d.push(mi(this,f.video,e,f.id))))):d.push(mi(this,Cc(a,b[c]),0))}return{startTime:a.startTime,streams:d}};
function mi(a,b,c,d){var e={id:b.id,primary:b.primary,presentationTimeOffset:b.presentationTimeOffset||0,contentType:b.type,mimeType:b.mimeType,codecs:b.codecs,frameRate:b.frameRate,kind:b.kind,language:b.language,label:b.label,width:b.width||null,height:b.height||null,initSegmentKey:null,encrypted:b.encrypted,keyId:b.keyId,segments:[],variantIds:[]};null!=d&&e.variantIds.push(d);d=a.h.presentationTimeline.Ja();ni(b,d,function(a){var d=a.startTime,f=a.endTime;Vg(this.c,b.type,a,(f-d)*c/8,function(a){e.segments.push({startTime:d,
endTime:f,dataKey:a})})}.bind(a));(d=b.initSegmentReference)&&Vg(a.c,b.contentType,d,0,function(a){e.initSegmentKey=a});return e}function ni(a,b,c){b=a.findSegmentPosition(b);for(var d=null==b?null:a.getSegmentReference(b);d;)c(d),d=a.getSegmentReference(++b)}function X(a){if(!a.a)throw new p(2,9,9002);}
function ki(a){var b=[];a.periods.forEach(function(a){a.streams.forEach(function(a){null!=a.initSegmentKey&&b.push(a.initSegmentKey);a.segments.forEach(function(a){b.push(a.dataKey)})})});return b}W.deleteAll=function(){return lh()};Kh.offline=ci;n("shaka.polyfill.installAll",function(){for(var a=0;a<oi.length;++a)oi[a]()});var oi=[];function pi(a){oi.push(a)}n("shaka.polyfill.register",pi);function qi(a){var b=a.type.replace(/^(webkit|moz|MS)/,"").toLowerCase();if("function"===typeof Event)var c=new Event(b,a);else c=document.createEvent("Event"),c.initEvent(b,a.bubbles,a.cancelable);a.target.dispatchEvent(c)}
pi(function(){if(window.Document){var a=Element.prototype;a.requestFullscreen=a.requestFullscreen||a.mozRequestFullScreen||a.msRequestFullscreen||a.webkitRequestFullscreen;a=Document.prototype;a.exitFullscreen=a.exitFullscreen||a.mozCancelFullScreen||a.msExitFullscreen||a.webkitExitFullscreen;"fullscreenElement"in document||(Object.defineProperty(document,"fullscreenElement",{get:function(){return document.mozFullScreenElement||document.msFullscreenElement||document.webkitFullscreenElement}}),Object.defineProperty(document,
"fullscreenEnabled",{get:function(){return document.mozFullScreenEnabled||document.msFullscreenEnabled||document.webkitFullscreenEnabled}}));document.addEventListener("webkitfullscreenchange",qi);document.addEventListener("webkitfullscreenerror",qi);document.addEventListener("mozfullscreenchange",qi);document.addEventListener("mozfullscreenerror",qi);document.addEventListener("MSFullscreenChange",qi);document.addEventListener("MSFullscreenError",qi)}});pi(function(){var a=navigator.userAgent;a&&0<=a.indexOf("CrKey")&&delete window.indexedDB});var ri;function si(a,b,c){if("input"==a)switch(this.type){case "range":a="change"}ri.call(this,a,b,c)}pi(function(){0>navigator.userAgent.indexOf("Trident/")||HTMLInputElement.prototype.addEventListener==si||(ri=HTMLInputElement.prototype.addEventListener,HTMLInputElement.prototype.addEventListener=si)});pi(function(){if(4503599627370497!=Math.round(4503599627370497)){var a=Math.round;Math.round=function(b){var c=b;4503599627370496>=b&&(c=a(b));return c}}});function ti(a){this.f=[];this.b=[];this.a=[];(new O).W("pssh",this.c.bind(this)).parse(a.buffer)}ti.prototype.c=function(a){if(!(1<a.version)){var b=wb(a.o.Pa(16)),c=[];if(0<a.version)for(var d=a.o.C(),e=0;e<d;++e){var f=wb(a.o.Pa(16));c.push(f)}d=a.o.C();a.o.F(d);this.b.push.apply(this.b,c);this.f.push(b);this.a.push({start:a.start,end:a.start+a.size-1})}};function ui(a,b){try{var c=new vi(a,b);return Promise.resolve(c)}catch(d){return Promise.reject(d)}}
function vi(a,b){this.keySystem=a;for(var c=!1,d=0;d<b.length;++d){var e=b[d],f={audioCapabilities:[],videoCapabilities:[],persistentState:"optional",distinctiveIdentifier:"optional",initDataTypes:e.initDataTypes,sessionTypes:["temporary"],label:e.label},g=!1;if(e.audioCapabilities)for(var h=0;h<e.audioCapabilities.length;++h){var k=e.audioCapabilities[h];if(k.contentType){g=!0;var m=k.contentType.split(";")[0];MSMediaKeys.isTypeSupported(this.keySystem,m)&&(f.audioCapabilities.push(k),c=!0)}}if(e.videoCapabilities)for(h=
0;h<e.videoCapabilities.length;++h)k=e.videoCapabilities[h],k.contentType&&(g=!0,m=k.contentType.split(";")[0],MSMediaKeys.isTypeSupported(this.keySystem,m)&&(f.videoCapabilities.push(k),c=!0));g||(c=MSMediaKeys.isTypeSupported(this.keySystem,"video/mp4"));"required"==e.persistentState&&(c=!1);if(c){this.a=f;return}}c=Error("Unsupported keySystem");c.name="NotSupportedError";c.code=DOMException.NOT_SUPPORTED_ERR;throw c;}vi.prototype.createMediaKeys=function(){var a=new wi(this.keySystem);return Promise.resolve(a)};
vi.prototype.getConfiguration=function(){return this.a};function xi(a){var b=this.mediaKeys;b&&b!=a&&yi(b,null);delete this.mediaKeys;return(this.mediaKeys=a)?yi(a,this):Promise.resolve()}function wi(a){this.a=new MSMediaKeys(a);this.b=new z}wi.prototype.createSession=function(a){var b=a||"temporary";if("temporary"!=b)throw new TypeError("Session type "+a+" is unsupported on this platform.");return new zi(this.a,b)};wi.prototype.setServerCertificate=function(){return Promise.resolve(!1)};
function yi(a,b){function c(){b.msSetMediaKeys(d.a);b.removeEventListener("loadedmetadata",c)}bb(a.b);if(!b)return Promise.resolve();A(a.b,b,"msneedkey",Ai);var d=a;try{return 1<=b.readyState?b.msSetMediaKeys(a.a):b.addEventListener("loadedmetadata",c),Promise.resolve()}catch(e){return Promise.reject(e)}}function zi(a){H.call(this);this.c=null;this.g=a;this.b=this.a=null;this.f=new z;this.sessionId="";this.expiration=NaN;this.closed=new u;this.keyStatuses=new Bi}la(zi,H);l=zi.prototype;
l.generateRequest=function(a,b){this.a=new u;try{this.c=this.g.createSession("video/mp4",new Uint8Array(b),null),A(this.f,this.c,"mskeymessage",this.Md.bind(this)),A(this.f,this.c,"mskeyadded",this.Kd.bind(this)),A(this.f,this.c,"mskeyerror",this.Ld.bind(this)),Ci(this,"status-pending")}catch(c){this.a.reject(c)}return this.a};l.load=function(){return Promise.reject(Error("MediaKeySession.load not yet supported"))};l.update=function(a){this.b=new u;try{this.c.update(new Uint8Array(a))}catch(b){this.b.reject(b)}return this.b};
l.close=function(){try{this.c.close(),this.closed.resolve(),bb(this.f)}catch(a){this.closed.reject(a)}return this.closed};l.remove=function(){return Promise.reject(Error("MediaKeySession.remove is only applicable for persistent licenses, which are not supported on this platform"))};
function Ai(a){var b=document.createEvent("CustomEvent");b.initCustomEvent("encrypted",!1,!1,null);b.initDataType="cenc";var c=a.initData;if(c){var d=new ti(c);if(1>=d.a.length)a=c;else{var e=[];for(a=0;a<d.a.length;a++)e.push(c.subarray(d.a[a].start,d.a[a].end+1));c=Xa(e,Di);for(a=d=0;a<c.length;a++)d+=c[a].length;d=new Uint8Array(d);for(a=e=0;a<c.length;a++)d.set(c[a],e),e+=c[a].length;a=d}}else a=c;b.initData=a;this.dispatchEvent(b)}function Di(a,b){return xb(a,b)}
l.Md=function(a){this.a&&(this.a.resolve(),this.a=null);this.dispatchEvent(new B("message",{messageType:void 0==this.keyStatuses.a?"licenserequest":"licenserenewal",message:a.message.buffer}))};l.Kd=function(){this.a?(Ci(this,"usable"),this.a.resolve(),this.a=null):this.b&&(Ci(this,"usable"),this.b.resolve(),this.b=null)};
l.Ld=function(){var a=Error("EME PatchedMediaKeysMs key error");a.errorCode=this.c.error;if(null!=this.a)this.a.reject(a),this.a=null;else if(null!=this.b)this.b.reject(a),this.b=null;else switch(this.c.error.code){case MSMediaKeyError.MS_MEDIA_KEYERR_OUTPUT:case MSMediaKeyError.MS_MEDIA_KEYERR_HARDWARECHANGE:Ci(this,"output-not-allowed");break;default:Ci(this,"internal-error")}};function Ci(a,b){var c=a.keyStatuses;c.size=void 0==b?0:1;c.a=b;a.dispatchEvent(new B("keystatuseschange"))}
function Bi(){this.size=0;this.a=void 0}var Ei;l=Bi.prototype;l.forEach=function(a){this.a&&a(this.a,Ei)};l.get=function(a){if(this.has(a))return this.a};l.has=function(a){var b=Ei;return this.a&&xb(new Uint8Array(a),new Uint8Array(b))?!0:!1};l.entries=function(){};l.keys=function(){};l.values=function(){};function Fi(){return Promise.reject(Error("The key system specified is not supported."))}function Gi(a){return null==a?Promise.resolve():Promise.reject(Error("MediaKeys not supported."))}function Hi(){throw new TypeError("Illegal constructor.");}Hi.prototype.createSession=function(){};Hi.prototype.setServerCertificate=function(){};function Ii(){throw new TypeError("Illegal constructor.");}Ii.prototype.getConfiguration=function(){};Ii.prototype.createMediaKeys=function(){};var Ji="";function Ki(a){Ji=a;Li=(new Uint8Array([0])).buffer;navigator.requestMediaKeySystemAccess=Mi;delete HTMLMediaElement.prototype.mediaKeys;HTMLMediaElement.prototype.mediaKeys=null;HTMLMediaElement.prototype.setMediaKeys=Ni;window.MediaKeys=Oi;window.MediaKeySystemAccess=Pi}function Qi(a){var b=Ji;return b?b+a.charAt(0).toUpperCase()+a.slice(1):a}function Mi(a,b){try{var c=new Pi(a,b);return Promise.resolve(c)}catch(d){return Promise.reject(d)}}
function Ni(a){var b=this.mediaKeys;b&&b!=a&&Ri(b,null);delete this.mediaKeys;(this.mediaKeys=a)&&Ri(a,this);return Promise.resolve()}
function Pi(a,b){this.a=this.keySystem=a;var c=!1;"org.w3.clearkey"==a&&(this.a="webkit-org.w3.clearkey",c=!1);var d=!1;var e=document.getElementsByTagName("video");e=e.length?e[0]:document.createElement("video");for(var f=0;f<b.length;++f){var g=b[f],h={audioCapabilities:[],videoCapabilities:[],persistentState:"optional",distinctiveIdentifier:"optional",initDataTypes:g.initDataTypes,sessionTypes:["temporary"],label:g.label},k=!1;if(g.audioCapabilities)for(var m=0;m<g.audioCapabilities.length;++m){var q=
g.audioCapabilities[m];if(q.contentType){k=!0;var w=q.contentType.split(";")[0];e.canPlayType(w,this.a)&&(h.audioCapabilities.push(q),d=!0)}}if(g.videoCapabilities)for(m=0;m<g.videoCapabilities.length;++m)q=g.videoCapabilities[m],q.contentType&&(k=!0,e.canPlayType(q.contentType,this.a)&&(h.videoCapabilities.push(q),d=!0));k||(d=e.canPlayType("video/mp4",this.a)||e.canPlayType("video/webm",this.a));"required"==g.persistentState&&(c?(h.persistentState="required",h.sessionTypes=["persistent-license"]):
d=!1);if(d){this.b=h;return}}c="Unsupported keySystem";if("org.w3.clearkey"==a||"com.widevine.alpha"==a)c="None of the requested configurations were supported.";c=Error(c);c.name="NotSupportedError";c.code=DOMException.NOT_SUPPORTED_ERR;throw c;}Pi.prototype.createMediaKeys=function(){var a=new Oi(this.a);return Promise.resolve(a)};Pi.prototype.getConfiguration=function(){return this.b};function Oi(a){this.g=a;this.b=null;this.a=new z;this.c=[];this.f={}}
function Ri(a,b){a.b=b;bb(a.a);var c=Ji;b&&(A(a.a,b,c+"needkey",a.ae.bind(a)),A(a.a,b,c+"keymessage",a.$d.bind(a)),A(a.a,b,c+"keyadded",a.Yd.bind(a)),A(a.a,b,c+"keyerror",a.Zd.bind(a)))}l=Oi.prototype;l.createSession=function(a){var b=a||"temporary";if("temporary"!=b&&"persistent-license"!=b)throw new TypeError("Session type "+a+" is unsupported on this platform.");a=this.b||document.createElement("video");a.src||(a.src="about:blank");b=new Si(a,this.g,b);this.c.push(b);return b};
l.setServerCertificate=function(){return Promise.resolve(!1)};l.ae=function(a){var b=document.createEvent("CustomEvent");b.initCustomEvent("encrypted",!1,!1,null);b.initDataType="webm";b.initData=a.initData;this.b.dispatchEvent(b)};l.$d=function(a){var b=Ti(this,a.sessionId);b&&(a=new B("message",{messageType:void 0==b.keyStatuses.a?"licenserequest":"licenserenewal",message:a.message}),b.b&&(b.b.resolve(),b.b=null),b.dispatchEvent(a))};
l.Yd=function(a){if(a=Ti(this,a.sessionId))Ui(a,"usable"),a.a&&a.a.resolve(),a.a=null};
l.Zd=function(a){var b=Ti(this,a.sessionId);if(b){var c=Error("EME v0.1b key error");c.errorCode=a.errorCode;c.errorCode.systemCode=a.systemCode;!a.sessionId&&b.b?(c.method="generateRequest",45==a.systemCode&&(c.message="Unsupported session type."),b.b.reject(c),b.b=null):a.sessionId&&b.a?(c.method="update",b.a.reject(c),b.a=null):(c=a.systemCode,a.errorCode.code==MediaKeyError.MEDIA_KEYERR_OUTPUT?Ui(b,"output-restricted"):1==c?Ui(b,"expired"):Ui(b,"internal-error"))}};
function Ti(a,b){var c=a.f[b];return c?c:(c=a.c.shift())?(c.sessionId=b,a.f[b]=c):null}function Si(a,b,c){H.call(this);this.f=a;this.h=!1;this.a=this.b=null;this.c=b;this.g=c;this.sessionId="";this.expiration=NaN;this.closed=new u;this.keyStatuses=new Vi}la(Si,H);
function Wi(a,b,c){if(a.h)return Promise.reject(Error("The session is already initialized."));a.h=!0;try{if("persistent-license"==a.g)if(c)var d=new Uint8Array(pb("LOAD_SESSION|"+c));else{var e=pb("PERSISTENT|"),f=new Uint8Array(e.byteLength+b.byteLength);f.set(new Uint8Array(e),0);f.set(new Uint8Array(b),e.byteLength);d=f}else d=new Uint8Array(b)}catch(h){return Promise.reject(h)}a.b=new u;var g=Qi("generateKeyRequest");try{a.f[g](a.c,d)}catch(h){if("InvalidStateError"!=h.name)return a.b=null,Promise.reject(h);
setTimeout(function(){try{this.f[g](this.c,d)}catch(k){this.b.reject(k),this.b=null}}.bind(a),10)}return a.b}l=Si.prototype;
l.dc=function(a,b){if(this.a)this.a.then(this.dc.bind(this,a,b))["catch"](this.dc.bind(this,a,b));else{this.a=a;if("webkit-org.w3.clearkey"==this.c){var c=D(b);var d=JSON.parse(c);"oct"!=d.keys[0].kty&&(this.a.reject(Error("Response is not a valid JSON Web Key Set.")),this.a=null);c=ub(d.keys[0].k);d=ub(d.keys[0].kid)}else c=new Uint8Array(b),d=null;var e=Qi("addKey");try{this.f[e](this.c,c,d,this.sessionId)}catch(f){this.a.reject(f),this.a=null}}};
function Ui(a,b){var c=a.keyStatuses;c.size=void 0==b?0:1;c.a=b;a.dispatchEvent(new B("keystatuseschange"))}l.generateRequest=function(a,b){return Wi(this,b,null)};l.load=function(a){return"persistent-license"==this.g?Wi(this,null,a):Promise.reject(Error("Not a persistent session."))};l.update=function(a){var b=new u;this.dc(b,a);return b};
l.close=function(){if("persistent-license"!=this.g){if(!this.sessionId)return this.closed.reject(Error("The session is not callable.")),this.closed;var a=Qi("cancelKeyRequest");try{this.f[a](this.c,this.sessionId)}catch(b){}}this.closed.resolve();return this.closed};l.remove=function(){return"persistent-license"!=this.g?Promise.reject(Error("Not a persistent session.")):this.close()};function Vi(){this.size=0;this.a=void 0}var Li;l=Vi.prototype;l.forEach=function(a){this.a&&a(this.a,Li)};l.get=function(a){if(this.has(a))return this.a};
l.has=function(a){var b=Li;return this.a&&xb(new Uint8Array(a),new Uint8Array(b))?!0:!1};l.entries=function(){};l.keys=function(){};l.values=function(){};pi(function(){!window.HTMLVideoElement||navigator.requestMediaKeySystemAccess&&MediaKeySystemAccess.prototype.getConfiguration||(HTMLMediaElement.prototype.webkitGenerateKeyRequest?Ki("webkit"):HTMLMediaElement.prototype.generateKeyRequest?Ki(""):window.MSMediaKeys?(Ei=(new Uint8Array([0])).buffer,delete HTMLMediaElement.prototype.mediaKeys,HTMLMediaElement.prototype.mediaKeys=null,HTMLMediaElement.prototype.setMediaKeys=xi,window.MediaKeys=wi,window.MediaKeySystemAccess=vi,navigator.requestMediaKeySystemAccess=
ui):(navigator.requestMediaKeySystemAccess=Fi,delete HTMLMediaElement.prototype.mediaKeys,HTMLMediaElement.prototype.mediaKeys=null,HTMLMediaElement.prototype.setMediaKeys=Gi,window.MediaKeys=Hi,window.MediaKeySystemAccess=Ii))});function Xi(){var a=MediaSource.prototype.addSourceBuffer;MediaSource.prototype.addSourceBuffer=function(){var b=a.apply(this,arguments);b.abort=function(){};return b}}function Yi(){var a=SourceBuffer.prototype.remove;SourceBuffer.prototype.remove=function(b,c){return a.call(this,b,c-.001)}}
function Zi(){var a=MediaSource.prototype.endOfStream;MediaSource.prototype.endOfStream=function(){for(var b=0,c=0;c<this.sourceBuffers.length;++c){var f=this.sourceBuffers[c];f=f.buffered.end(f.buffered.length-1);b=Math.max(b,f)}if(!isNaN(this.duration)&&b<this.duration)for(this.qc=!0,c=0;c<this.sourceBuffers.length;++c)f=this.sourceBuffers[c],f.mc=!1;return a.apply(this,arguments)};var b=!1,c=MediaSource.prototype.addSourceBuffer;MediaSource.prototype.addSourceBuffer=function(){var a=c.apply(this,
arguments);a.mediaSource_=this;a.addEventListener("updateend",$i,!1);b||(this.addEventListener("sourceclose",aj,!1),b=!0);return a}}function $i(a){var b=a.target,c=b.mediaSource_;if(c.qc){a.preventDefault();a.stopPropagation();a.stopImmediatePropagation();b.mc=!0;for(a=0;a<c.sourceBuffers.length;++a)if(0==c.sourceBuffers[a].mc)return;c.qc=!1}}
function aj(a){a=a.target;for(var b=0;b<a.sourceBuffers.length;++b)a.sourceBuffers[b].removeEventListener("updateend",$i,!1);a.removeEventListener("sourceclose",aj,!1)}function bj(){var a=MediaSource.isTypeSupported;MediaSource.isTypeSupported=function(b){return"mp2t"==b.split(/ *; */)[0].split("/")[1]?!1:a(b)}}
function cj(){var a=MediaSource.isTypeSupported,b=/^dv(?:he|av)\./;MediaSource.isTypeSupported=function(c){for(var d=c.split(/ *; */),e=d[0],f={},g=1;g<d.length;++g){var h=d[g].split("="),k=h[0];h=h[1].replace(/"(.*)"/,"$1");f[k]=h}d=f.codecs;if(!d)return a(c);var m=!1,q=!1;c=d.split(",").filter(function(a){if(b.test(a))return q=!0,!1;/^(hev|hvc)1\.2/.test(a)&&(m=!0);return!0});q&&(m=!1);f.codecs=c.join(",");m&&(f.eotf="smpte2084");for(k in f)h=f[k],e+="; "+k+'="'+h+'"';return cast.__platform__.canDisplayType(e)}}
pi(function(){if(window.MediaSource)if(window.cast&&cast.__platform__&&cast.__platform__.canDisplayType)cj();else if(navigator.vendor&&0<=navigator.vendor.indexOf("Apple")){var a=navigator.appVersion;bj();0<=a.indexOf("Version/8")?window.MediaSource=null:0<=a.indexOf("Version/9")?Xi():0<=a.indexOf("Version/10")?(Xi(),Zi()):0<=a.indexOf("Version/11")&&(Xi(),Yi())}});function Y(a){this.c=[];this.b=[];this.V=dj;if(a)try{a(this.la.bind(this),this.a.bind(this))}catch(b){this.a(b)}}var dj=0;function ej(a){var b=new Y;b.la(void 0);return b.then(function(){return a})}function fj(a){var b=new Y;b.a(a);return b}function gj(a){function b(a,b,c){a.V==dj&&(e[b]=c,d++,d==e.length&&a.la(e))}var c=new Y;if(!a.length)return c.la([]),c;for(var d=0,e=Array(a.length),f=c.a.bind(c),g=0;g<a.length;++g)a[g]&&a[g].then?a[g].then(b.bind(null,c,g),f):b(c,g,a[g]);return c}
function hj(a){for(var b=new Y,c=b.la.bind(b),d=b.a.bind(b),e=0;e<a.length;++e)a[e]&&a[e].then?a[e].then(c,d):c(a[e]);return b}Y.prototype.then=function(a,b){var c=new Y;switch(this.V){case 1:ij(this,c,a);break;case 2:ij(this,c,b);break;case dj:this.c.push({N:c,Db:a}),this.b.push({N:c,Db:b})}return c};Y.prototype["catch"]=function(a){return this.then(void 0,a)};
Y.prototype.la=function(a){if(this.V==dj){this.f=a;this.V=1;for(a=0;a<this.c.length;++a)ij(this,this.c[a].N,this.c[a].Db);this.c=[];this.b=[]}};Y.prototype.a=function(a){if(this.V==dj){this.f=a;this.V=2;for(a=0;a<this.b.length;++a)ij(this,this.b[a].N,this.b[a].Db);this.c=[];this.b=[]}};
function ij(a,b,c){jj.push(function(){if(c&&"function"==typeof c){try{var a=c(this.f)}catch(f){b.a(f);return}try{var e=a&&a.then}catch(f){b.a(f);return}a instanceof Y?a==b?b.a(new TypeError("Chaining cycle detected")):a.then(b.la.bind(b),b.a.bind(b)):e?kj(a,e,b):b.la(a)}else 1==this.V?b.la(this.f):b.a(this.f)}.bind(a));null==lj&&(lj=mj(nj))}
function kj(a,b,c){try{var d=!1;b.call(a,function(a){if(!d){d=!0;try{var b=a&&a.then}catch(g){c.a(g);return}b?kj(a,b,c):c.la(a)}},c.a.bind(c))}catch(e){c.a(e)}}function nj(){for(;jj.length;){null!=lj&&(oj(lj),lj=null);var a=jj;jj=[];for(var b=0;b<a.length;++b)a[b]()}}function mj(){return 0}function oj(){}var lj=null,jj=[];
pi(function(a){window.setImmediate?(mj=function(a){return window.setImmediate(a)},oj=function(a){window.clearImmediate(a)}):(mj=function(a){return window.setTimeout(a,0)},oj=function(a){window.clearTimeout(a)});if(!window.Promise||a)window.Promise=Y,window.Promise.resolve=ej,window.Promise.reject=fj,window.Promise.all=gj,window.Promise.race=hj,window.Promise.prototype.then=Y.prototype.then,window.Promise.prototype["catch"]=Y.prototype["catch"]});pi(function(){if(window.HTMLMediaElement){var a=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){var b=a.apply(this,arguments);b&&b["catch"](function(){});return b}}});function pj(){return{droppedVideoFrames:this.webkitDroppedFrameCount,totalVideoFrames:this.webkitDecodedFrameCount,corruptedVideoFrames:0,creationTime:NaN,totalFrameDelay:0}}pi(function(){if(window.HTMLVideoElement){var a=HTMLVideoElement.prototype;!a.getVideoPlaybackQuality&&"webkitDroppedFrameCount"in a&&(a.getVideoPlaybackQuality=pj)}});function qj(a,b,c){return new window.TextTrackCue(a,b,c)}function rj(a,b,c){return new window.TextTrackCue(a+"-"+b+"-"+c,a,b,c)}pi(function(){if(!window.VTTCue&&window.TextTrackCue){var a=TextTrackCue.length;if(3==a)window.VTTCue=qj;else if(6==a)window.VTTCue=rj;else{try{var b=!!qj(1,2,"")}catch(c){b=!1}b&&(window.VTTCue=qj)}}});function sj(){}sj.prototype.parseInit=function(){};
sj.prototype.parseMedia=function(a,b){var c=D(a),d=[],e=new DOMParser,f=null;try{f=e.parseFromString(c,"text/xml")}catch(Wc){throw new p(2,2,2005);}if(f){var g=f.getElementsByTagName("tt")[0];if(g){e=g.getAttribute("ttp:frameRate");f=g.getAttribute("ttp:subFrameRate");var h=g.getAttribute("ttp:frameRateMultiplier");var k=g.getAttribute("ttp:tickRate");c=g.getAttribute("xml:space")||"default"}else throw new p(2,2,2005);if("default"!=c&&"preserve"!=c)throw new p(2,2,2005);c="default"==c;e=new tj(e,
f,h,k);f=uj(g.getElementsByTagName("styling")[0]);h=uj(g.getElementsByTagName("layout")[0]);g=uj(g.getElementsByTagName("body")[0]);for(k=0;k<g.length;k++){var m=g[k];var q=b.periodStart;var w=e,r=f,t=h,y=c;if(m.hasAttribute("begin")||m.hasAttribute("end")||!/^\s*$/.test(m.textContent)){vj(m,y);y=wj(m.getAttribute("begin"),w);var v=wj(m.getAttribute("end"),w);w=wj(m.getAttribute("dur"),w);var Yh=m.textContent;null==v&&null!=w&&(v=y+w);if(null==y||null==v)throw new p(2,2,2001);q=new T(y+q,v+q,Yh);
y=xj(m,"region",t);t=q;"rtl"==Z(m,y,r,"tts:direction")&&(t.writingDirection=1);v=Z(m,y,r,"tts:writingMode");"tb"==v||"tblr"==v?t.writingDirection=2:"tbrl"==v?t.writingDirection=3:"rltb"==v||"rl"==v?t.writingDirection=1:v&&(t.writingDirection=rh);if(v=Z(m,y,r,"tts:origin"))v=yj.exec(v),null!=v&&(t.region.x=Number(v[1]),t.region.y=Number(v[2]));if(v=Z(m,y,r,"tts:extent"))v=yj.exec(v),null!=v&&(t.region.width=Number(v[1]),t.region.height=Number(v[2]));if(v=Z(m,y,r,"tts:textAlign"))t.positionAlign=zj[v],
t.lineAlign=Aj[v],t.textAlign=xh[v.toUpperCase()];if(v=Z(m,y,r,"tts:displayAlign"))t.displayAlign=yh[v.toUpperCase()];if(v=Z(m,y,r,"tts:color"))t.color=v;if(v=Z(m,y,r,"tts:backgroundColor"))t.backgroundColor=v;if(v=Z(m,y,r,"tts:fontFamily"))t.fontFamily=v;(v=Z(m,y,r,"tts:fontWeight"))&&"bold"==v&&(t.fontWeight=700);(v=Z(m,y,r,"tts:wrapOption"))&&"noWrap"==v&&(t.wrapLine=!1);(v=Z(m,y,r,"tts:lineHeight"))&&v.match(Bj)&&(t.lineHeight=v);(v=Z(m,y,r,"tts:fontSize"))&&v.match(Bj)&&(t.fontSize=v);if(v=Z(m,
y,r,"tts:fontStyle"))t.fontStyle=Ah[v.toUpperCase()];(y=Cj(y,r,"tts:textDecoration"))&&Dj(t,y);(m=Ej(m,r,"tts:textDecoration"))&&Dj(t,m)}else q=null;q&&d.push(q)}}return d};
var Fj=/^(\d{2,}):(\d{2}):(\d{2}):(\d{2})\.?(\d+)?$/,Gj=/^(?:(\d{2,}):)?(\d{2}):(\d{2})$/,Hj=/^(?:(\d{2,}):)?(\d{2}):(\d{2}\.\d{2,})$/,Ij=/^(\d*(?:\.\d*)?)f$/,Jj=/^(\d*(?:\.\d*)?)t$/,Kj=/^(?:(\d*(?:\.\d*)?)h)?(?:(\d*(?:\.\d*)?)m)?(?:(\d*(?:\.\d*)?)s)?(?:(\d*(?:\.\d*)?)ms)?$/,yj=/^(\d{1,2}|100)% (\d{1,2}|100)%$/,Bj=/^(\d+px|\d+em)$/,Aj={left:"start",center:th,right:"end",start:"start",end:"end"},zj={left:"line-left",center:"center",right:"line-right"};
function uj(a){var b=[];if(!a)return b;for(var c=a.childNodes,d=0;d<c.length;d++){var e="span"==c[d].nodeName&&"p"==a.nodeName;c[d].nodeType!=Node.ELEMENT_NODE||"br"==c[d].nodeName||e||(e=uj(c[d]),b=b.concat(e))}b.length||b.push(a);return b}function vj(a,b){for(var c=a.childNodes,d=0;d<c.length;d++)if("br"==c[d].nodeName&&0<d)c[d-1].textContent+="\n";else if(0<c[d].childNodes.length)vj(c[d],b);else if(b){var e=c[d].textContent.trim();e=e.replace(/\s+/g," ");c[d].textContent=e}}
function Dj(a,b){for(var c=b.split(" "),d=0;d<c.length;d++)switch(c[d]){case "underline":0>a.textDecoration.indexOf("underline")&&a.textDecoration.push("underline");break;case "noUnderline":0<=a.textDecoration.indexOf("underline")&&Za(a.textDecoration,"underline");break;case "lineThrough":0>a.textDecoration.indexOf("lineThrough")&&a.textDecoration.push("lineThrough");break;case "noLineThrough":0<=a.textDecoration.indexOf("lineThrough")&&Za(a.textDecoration,"lineThrough");break;case "overline":0>a.textDecoration.indexOf("overline")&&
a.textDecoration.push("overline");break;case "noOverline":0<=a.textDecoration.indexOf("overline")&&Za(a.textDecoration,"overline")}}function Z(a,b,c,d){return(a=Ej(a,c,d))?a:Cj(b,c,d)}function Cj(a,b,c){for(var d=uj(a),e=0;e<d.length;e++){var f=d[e].getAttribute(c);if(f)return f}return(a=xj(a,"style",b))?a.getAttribute(c):null}function Ej(a,b,c){return(a=xj(a,"style",b))?a.getAttribute(c):null}
function xj(a,b,c){if(!a||1>c.length)return null;var d=null,e=a;for(a=null;e&&!(a=e.getAttribute(b))&&(e=e.parentNode,e instanceof Element););if(b=a)for(a=0;a<c.length;a++)if(c[a].getAttribute("xml:id")==b){d=c[a];break}return d}
function wj(a,b){var c=null;if(Fj.test(a)){c=Fj.exec(a);var d=Number(c[1]),e=Number(c[2]),f=Number(c[3]),g=Number(c[4]);g+=(Number(c[5])||0)/b.b;f+=g/b.frameRate;c=f+60*e+3600*d}else Gj.test(a)?c=Lj(Gj,a):Hj.test(a)?c=Lj(Hj,a):Ij.test(a)?(c=Ij.exec(a),c=Number(c[1])/b.frameRate):Jj.test(a)?(c=Jj.exec(a),c=Number(c[1])/b.a):Kj.test(a)&&(c=Lj(Kj,a));return c}
function Lj(a,b){var c=a.exec(b);return null==c||""==c[0]?null:(Number(c[4])||0)/1E3+(Number(c[3])||0)+60*(Number(c[2])||0)+3600*(Number(c[1])||0)}function tj(a,b,c,d){this.frameRate=Number(a)||30;this.b=Number(b)||1;this.a=Number(d);0==this.a&&(this.a=a?this.frameRate*this.b:1);c&&(a=/^(\d+) (\d+)$/g.exec(c))&&(this.frameRate*=a[1]/a[2])}E["application/ttml+xml"]=sj;function Mj(){this.a=new sj}Mj.prototype.parseInit=function(a){var b=!1;(new O).B("moov",P).B("trak",P).B("mdia",P).B("minf",P).B("stbl",P).W("stsd",Rd).B("stpp",function(a){b=!0;a.oa.stop()}).parse(a);if(!b)throw new p(2,2,2007);};Mj.prototype.parseMedia=function(a,b){var c=!1,d=[];(new O).B("mdat",Sd(function(a){c=!0;d=d.concat(this.a.parseMedia(a,b))}.bind(this))).parse(a);if(!c)throw new p(2,2,2007);return d};E['application/mp4; codecs="stpp"']=Mj;
E['application/mp4; codecs="stpp.TTML.im1t"']=Mj;function Nj(){}Nj.prototype.parseInit=function(){};
Nj.prototype.parseMedia=function(a,b){var c=D(a);c=c.replace(/\r\n|\r(?=[^\n]|$)/gm,"\n");c=c.split(/\n{2,}/m);if(!/^WEBVTT($|[ \t\n])/m.test(c[0]))throw new p(2,2,2E3);var d=b.segmentStart;if(null==d&&(d=0,0<=c[0].indexOf("X-TIMESTAMP-MAP"))){var e=c[0].match(/LOCAL:((?:(\d{1,}):)?(\d{2}):(\d{2})\.(\d{3}))/m),f=c[0].match(/MPEGTS:(\d+)/m);e&&f&&(d=Oj(new Te(e[1])),d=b.periodStart+(Number(f[1])/9E4-d))}f=[];for(e=1;e<c.length;e++){var g=c[e].split("\n"),h=d;if(1==g.length&&!g[0]||/^NOTE($|[ \t])/.test(g[0])||
"STYLE"==g[0])var k=null;else{k=null;0>g[0].indexOf("--\x3e")&&(k=g[0],g.splice(0,1));var m=new Te(g[0]),q=Oj(m),w=Ue(m,/[ \t]+--\x3e[ \t]+/g),r=Oj(m);if(null==q||null==w||null==r)throw new p(2,2,2001);g=new T(q+h,r+h,g.slice(1).join("\n").trim());Ue(m,/[ \t]+/gm);for(h=Ve(m);h;)Pj(g,h),Ue(m,/[ \t]+/gm),h=Ve(m);null!=k&&(g.id=k);k=g}k&&f.push(k)}return f};
function Pj(a,b){var c;if(c=/^align:(start|middle|center|end|left|right)$/.exec(b))c=c[1],"middle"==c?a.textAlign=qh:a.textAlign=xh[c.toUpperCase()];else if(c=/^vertical:(lr|rl)$/.exec(b))a.writingDirection="lr"==c[1]?2:3;else if(c=/^size:([\d.]+)%$/.exec(b))a.size=Number(c[1]);else if(c=/^position:([\d.]+)%(?:,(line-left|line-right|center|start|end))?$/.exec(b))a.position=Number(c[1]),c[2]&&(c=c[2],a.positionAlign="line-left"==c||"start"==c?"line-left":"line-right"==c||"end"==c?"line-right":"center");
else if(c=/^line:([\d.]+)%(?:,(start|end|center))?$/.exec(b))a.lineInterpretation=1,a.line=Number(c[1]),c[2]&&(a.lineAlign=zh[c[2].toUpperCase()]);else if(c=/^line:(-?\d+)(?:,(start|end|center))?$/.exec(b))a.lineInterpretation=sh,a.line=Number(c[1]),c[2]&&(a.lineAlign=zh[c[2].toUpperCase()])}function Oj(a){a=Ue(a,/(?:(\d{1,}):)?(\d{2}):(\d{2})\.(\d{3})/g);if(null==a)return null;var b=Number(a[2]),c=Number(a[3]);return 59<b||59<c?null:Number(a[4])/1E3+c+60*b+3600*(Number(a[1])||0)}E["text/vtt"]=Nj;
E['text/vtt; codecs="vtt"']=Nj;function Qj(){this.a=null}Qj.prototype.parseInit=function(a){var b=!1;(new O).B("moov",P).B("trak",P).B("mdia",P).W("mdhd",function(a){0==a.version?(a.o.F(4),a.o.F(4),this.a=a.o.C(),a.o.F(4)):(a.o.F(8),a.o.F(8),this.a=a.o.C(),a.o.F(8));a.o.F(4)}.bind(this)).B("minf",P).B("stbl",P).W("stsd",Rd).B("wvtt",function(){b=!0}).parse(a);if(!this.a)throw new p(2,2,2008);if(!b)throw new p(2,2,2008);};
Qj.prototype.parseMedia=function(a,b){if(!this.a)throw new p(2,2,2008);var c=0,d=[],e=[],f=[],g=!1,h=!1,k=!1,m=null;(new O).B("moof",P).B("traf",P).W("tfdt",function(a){g=!0;c=0==a.version?a.o.C():a.o.Qa()}).W("tfhd",function(a){var b=a.flags;a=a.o;a.F(4);b&1&&a.F(8);b&2&&a.F(4);m=b&8?a.C():null}).W("trun",function(a){h=!0;var b=a.version,c=a.flags;a=a.o;var e=a.C();c&1&&a.F(4);c&4&&a.F(4);for(var f=[],g=0;g<e;g++){var k={duration:null,ec:null};c&256&&(k.duration=a.C());c&512&&a.F(4);c&1024&&a.F(4);
c&2048&&(k.ec=0==b?a.C():a.Gc());f.push(k)}d=f}).B("vtte",function(){e.push(null)}).B("vttc",Sd(function(a){e.push(a)})).B("mdat",function(a){k=!0;P(a)}).parse(a);if(!k&&!g&&!h)throw new p(2,2,2008);for(var q=c,w=0;w<d.length;w++){var r=d[w],t=e[w],y=r.duration||m;y&&(r=r.ec?c+r.ec:q,q=r+y,t&&f.push(Rj(t,b.periodStart+r/this.a,b.periodStart+q/this.a)))}return f.filter(Ra)};
function Rj(a,b,c){var d,e,f;(new O).B("payl",Sd(function(a){d=D(a)})).B("iden",Sd(function(a){e=D(a)})).B("sttg",Sd(function(a){f=D(a)})).parse(a);return d?Sj(d,e,f,b,c):null}function Sj(a,b,c,d,e){a=new T(d,e,a);b&&(a.id=b);if(c)for(b=new Te(c),c=Ve(b);c;)Pj(a,c),Ue(b,/[ \t]+/gm),c=Ve(b);return a}E['application/mp4; codecs="wvtt"']=Qj;}.call(g,this));
if (typeof(module)!="undefined"&&module.exports)module.exports=g.shaka;
else if (typeof(define)!="undefined" && define.amd)define(function(){return g.shaka});
else this.shaka=g.shaka;
})();


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(_dereq_,module,exports){
// stats.js - http://github.com/mrdoob/stats.js
var Stats=function(){var l=Date.now(),m=l,g=0,n=Infinity,o=0,h=0,p=Infinity,q=0,r=0,s=0,f=document.createElement("div");f.id="stats";f.addEventListener("mousedown",function(b){b.preventDefault();t(++s%2)},!1);f.style.cssText="width:80px;opacity:0.9;cursor:pointer";var a=document.createElement("div");a.id="fps";a.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#002";f.appendChild(a);var i=document.createElement("div");i.id="fpsText";i.style.cssText="color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";
i.innerHTML="FPS";a.appendChild(i);var c=document.createElement("div");c.id="fpsGraph";c.style.cssText="position:relative;width:74px;height:30px;background-color:#0ff";for(a.appendChild(c);74>c.children.length;){var j=document.createElement("span");j.style.cssText="width:1px;height:30px;float:left;background-color:#113";c.appendChild(j)}var d=document.createElement("div");d.id="ms";d.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#020;display:none";f.appendChild(d);var k=document.createElement("div");
k.id="msText";k.style.cssText="color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";k.innerHTML="MS";d.appendChild(k);var e=document.createElement("div");e.id="msGraph";e.style.cssText="position:relative;width:74px;height:30px;background-color:#0f0";for(d.appendChild(e);74>e.children.length;)j=document.createElement("span"),j.style.cssText="width:1px;height:30px;float:left;background-color:#131",e.appendChild(j);var t=function(b){s=b;switch(s){case 0:a.style.display=
"block";d.style.display="none";break;case 1:a.style.display="none",d.style.display="block"}};return{REVISION:12,domElement:f,setMode:t,begin:function(){l=Date.now()},end:function(){var b=Date.now();g=b-l;n=Math.min(n,g);o=Math.max(o,g);k.textContent=g+" MS ("+n+"-"+o+")";var a=Math.min(30,30-30*(g/200));e.appendChild(e.firstChild).style.height=a+"px";r++;b>m+1E3&&(h=Math.round(1E3*r/(b-m)),p=Math.min(p,h),q=Math.max(q,h),i.textContent=h+" FPS ("+p+"-"+q+")",a=Math.min(30,30-30*(h/100)),c.appendChild(c.firstChild).style.height=
a+"px",m=b,r=0);return b},update:function(){l=this.end()}}};"object"===typeof module&&(module.exports=Stats);

},{}],7:[function(_dereq_,module,exports){
/**
 * @author dmarcos / https://github.com/dmarcos
 * @author mrdoob / http://mrdoob.com
 */

THREE.VRControls = function ( object, onError ) {

	var scope = this;

	var vrDisplay, vrDisplays;

	var standingMatrix = new THREE.Matrix4();

	var frameData = null;

	if ( 'VRFrameData' in window ) {

		frameData = new VRFrameData();

	}

	function gotVRDisplays( displays ) {

		vrDisplays = displays;

		if ( displays.length > 0 ) {

			vrDisplay = displays[ 0 ];

		} else {

			if ( onError ) onError( 'VR input not available.' );

		}

	}

	if ( navigator.getVRDisplays ) {

		navigator.getVRDisplays().then( gotVRDisplays ).catch( function () {

			console.warn( 'THREE.VRControls: Unable to get VR Displays' );

		} );

	}

	// the Rift SDK returns the position in meters
	// this scale factor allows the user to define how meters
	// are converted to scene units.

	this.scale = 1;

	// If true will use "standing space" coordinate system where y=0 is the
	// floor and x=0, z=0 is the center of the room.
	this.standing = false;

	// Distance from the users eyes to the floor in meters. Used when
	// standing=true but the VRDisplay doesn't provide stageParameters.
	this.userHeight = 1.6;

	this.getVRDisplay = function () {

		return vrDisplay;

	};

	this.setVRDisplay = function ( value ) {

		vrDisplay = value;

	};

	this.getVRDisplays = function () {

		console.warn( 'THREE.VRControls: getVRDisplays() is being deprecated.' );
		return vrDisplays;

	};

	this.getStandingMatrix = function () {

		return standingMatrix;

	};

	this.update = function () {

		if ( vrDisplay ) {

			var pose;

			if ( vrDisplay.getFrameData ) {

				vrDisplay.getFrameData( frameData );
				pose = frameData.pose;

			} else if ( vrDisplay.getPose ) {

				pose = vrDisplay.getPose();

			}

			if ( pose.orientation !== null ) {

				object.quaternion.fromArray( pose.orientation );

			}

			if ( pose.position !== null ) {

				object.position.fromArray( pose.position );

			} else {

				object.position.set( 0, 0, 0 );

			}

			if ( this.standing ) {

				if ( vrDisplay.stageParameters ) {

					object.updateMatrix();

					standingMatrix.fromArray( vrDisplay.stageParameters.sittingToStandingTransform );
					object.applyMatrix( standingMatrix );

				} else {

					object.position.setY( object.position.y + this.userHeight );

				}

			}

			object.position.multiplyScalar( scope.scale );

		}

	};

	this.dispose = function () {

		vrDisplay = null;

	};

};

},{}],8:[function(_dereq_,module,exports){
/**
 * @author dmarcos / https://github.com/dmarcos
 * @author mrdoob / http://mrdoob.com
 *
 * WebVR Spec: http://mozvr.github.io/webvr-spec/webvr.html
 *
 * Firefox: http://mozvr.com/downloads/
 * Chromium: https://webvr.info/get-chrome
 */

THREE.VREffect = function ( renderer, onError ) {

	var vrDisplay, vrDisplays;
	var eyeTranslationL = new THREE.Vector3();
	var eyeTranslationR = new THREE.Vector3();
	var renderRectL, renderRectR;
	var headMatrix = new THREE.Matrix4();
	var eyeMatrixL = new THREE.Matrix4();
	var eyeMatrixR = new THREE.Matrix4();

	var frameData = null;

	if ( 'VRFrameData' in window ) {

		frameData = new window.VRFrameData();

	}

	function gotVRDisplays( displays ) {

		vrDisplays = displays;

		if ( displays.length > 0 ) {

			vrDisplay = displays[ 0 ];

		} else {

			if ( onError ) onError( 'HMD not available' );

		}

	}

	if ( navigator.getVRDisplays ) {

		navigator.getVRDisplays().then( gotVRDisplays ).catch( function () {

			console.warn( 'THREE.VREffect: Unable to get VR Displays' );

		} );

	}

	//

	this.isPresenting = false;

	var scope = this;

	var rendererSize = renderer.getSize();
	var rendererUpdateStyle = false;
	var rendererPixelRatio = renderer.getPixelRatio();

	this.getVRDisplay = function () {

		return vrDisplay;

	};

	this.setVRDisplay = function ( value ) {

		vrDisplay = value;

	};

	this.getVRDisplays = function () {

		console.warn( 'THREE.VREffect: getVRDisplays() is being deprecated.' );
		return vrDisplays;

	};

	this.setSize = function ( width, height, updateStyle ) {

		rendererSize = { width: width, height: height };
		rendererUpdateStyle = updateStyle;

		if ( scope.isPresenting ) {

			var eyeParamsL = vrDisplay.getEyeParameters( 'left' );
			renderer.setPixelRatio( 1 );
			renderer.setSize( eyeParamsL.renderWidth * 2, eyeParamsL.renderHeight, false );

		} else {

			renderer.setPixelRatio( rendererPixelRatio );
			renderer.setSize( width, height, updateStyle );

		}

	};

	// VR presentation

	var canvas = renderer.domElement;
	var defaultLeftBounds = [ 0.0, 0.0, 0.5, 1.0 ];
	var defaultRightBounds = [ 0.5, 0.0, 0.5, 1.0 ];

	function onVRDisplayPresentChange() {

		var wasPresenting = scope.isPresenting;
		scope.isPresenting = vrDisplay !== undefined && vrDisplay.isPresenting;

		if ( scope.isPresenting ) {

			var eyeParamsL = vrDisplay.getEyeParameters( 'left' );
			var eyeWidth = eyeParamsL.renderWidth;
			var eyeHeight = eyeParamsL.renderHeight;

			if ( ! wasPresenting ) {

				rendererPixelRatio = renderer.getPixelRatio();
				rendererSize = renderer.getSize();

				renderer.setPixelRatio( 1 );
				renderer.setSize( eyeWidth * 2, eyeHeight, false );

			}

		} else if ( wasPresenting ) {

			renderer.setPixelRatio( rendererPixelRatio );
			renderer.setSize( rendererSize.width, rendererSize.height, rendererUpdateStyle );

		}

	}

	window.addEventListener( 'vrdisplaypresentchange', onVRDisplayPresentChange, false );

	this.setFullScreen = function ( boolean ) {

		return new Promise( function ( resolve, reject ) {

			if ( vrDisplay === undefined ) {

				reject( new Error( 'No VR hardware found.' ) );
				return;

			}

			if ( scope.isPresenting === boolean ) {

				resolve();
				return;

			}

			if ( boolean ) {

				resolve( vrDisplay.requestPresent( [ { source: canvas } ] ) );

			} else {

				resolve( vrDisplay.exitPresent() );

			}

		} );

	};

	this.requestPresent = function () {

		return this.setFullScreen( true );

	};

	this.exitPresent = function () {

		return this.setFullScreen( false );

	};

	this.requestAnimationFrame = function ( f ) {

		if ( vrDisplay !== undefined ) {

			return vrDisplay.requestAnimationFrame( f );

		} else {

			return window.requestAnimationFrame( f );

		}

	};

	this.cancelAnimationFrame = function ( h ) {

		if ( vrDisplay !== undefined ) {

			vrDisplay.cancelAnimationFrame( h );

		} else {

			window.cancelAnimationFrame( h );

		}

	};

	this.submitFrame = function () {

		if ( vrDisplay !== undefined && scope.isPresenting ) {

			vrDisplay.submitFrame();

		}

	};

	this.autoSubmitFrame = true;

	// render

	var cameraL = new THREE.PerspectiveCamera();
	cameraL.layers.enable( 1 );

	var cameraR = new THREE.PerspectiveCamera();
	cameraR.layers.enable( 2 );

	this.render = function ( scene, camera, renderTarget, forceClear ) {

		if ( vrDisplay && scope.isPresenting ) {

			var autoUpdate = scene.autoUpdate;

			if ( autoUpdate ) {

				scene.updateMatrixWorld();
				scene.autoUpdate = false;

			}

			if ( Array.isArray( scene ) ) {

				console.warn( 'THREE.VREffect.render() no longer supports arrays. Use object.layers instead.' );
				scene = scene[ 0 ];

			}

			// When rendering we don't care what the recommended size is, only what the actual size
			// of the backbuffer is.
			var size = renderer.getSize();
			var layers = vrDisplay.getLayers();
			var leftBounds;
			var rightBounds;

			if ( layers.length ) {

				var layer = layers[ 0 ];

				leftBounds = layer.leftBounds !== null && layer.leftBounds.length === 4 ? layer.leftBounds : defaultLeftBounds;
				rightBounds = layer.rightBounds !== null && layer.rightBounds.length === 4 ? layer.rightBounds : defaultRightBounds;

			} else {

				leftBounds = defaultLeftBounds;
				rightBounds = defaultRightBounds;

			}

			renderRectL = {
				x: Math.round( size.width * leftBounds[ 0 ] ),
				y: Math.round( size.height * leftBounds[ 1 ] ),
				width: Math.round( size.width * leftBounds[ 2 ] ),
				height: Math.round( size.height * leftBounds[ 3 ] )
			};
			renderRectR = {
				x: Math.round( size.width * rightBounds[ 0 ] ),
				y: Math.round( size.height * rightBounds[ 1 ] ),
				width: Math.round( size.width * rightBounds[ 2 ] ),
				height: Math.round( size.height * rightBounds[ 3 ] )
			};

			if ( renderTarget ) {

				renderer.setRenderTarget( renderTarget );
				renderTarget.scissorTest = true;

			} else {

				renderer.setRenderTarget( null );
				renderer.setScissorTest( true );

			}

			if ( renderer.autoClear || forceClear ) renderer.clear();

			if ( camera.parent === null ) camera.updateMatrixWorld();

			camera.matrixWorld.decompose( cameraL.position, cameraL.quaternion, cameraL.scale );

			cameraR.position.copy( cameraL.position );
			cameraR.quaternion.copy( cameraL.quaternion );
			cameraR.scale.copy( cameraL.scale );

			if ( vrDisplay.getFrameData ) {

				vrDisplay.depthNear = camera.near;
				vrDisplay.depthFar = camera.far;

				vrDisplay.getFrameData( frameData );

				cameraL.projectionMatrix.elements = frameData.leftProjectionMatrix;
				cameraR.projectionMatrix.elements = frameData.rightProjectionMatrix;

				getEyeMatrices( frameData );

				cameraL.updateMatrix();
				cameraL.matrix.multiply( eyeMatrixL );
				cameraL.matrix.decompose( cameraL.position, cameraL.quaternion, cameraL.scale );

				cameraR.updateMatrix();
				cameraR.matrix.multiply( eyeMatrixR );
				cameraR.matrix.decompose( cameraR.position, cameraR.quaternion, cameraR.scale );

			} else {

				var eyeParamsL = vrDisplay.getEyeParameters( 'left' );
				var eyeParamsR = vrDisplay.getEyeParameters( 'right' );

				cameraL.projectionMatrix = fovToProjection( eyeParamsL.fieldOfView, true, camera.near, camera.far );
				cameraR.projectionMatrix = fovToProjection( eyeParamsR.fieldOfView, true, camera.near, camera.far );

				eyeTranslationL.fromArray( eyeParamsL.offset );
				eyeTranslationR.fromArray( eyeParamsR.offset );

				cameraL.translateOnAxis( eyeTranslationL, cameraL.scale.x );
				cameraR.translateOnAxis( eyeTranslationR, cameraR.scale.x );

			}

			// render left eye
			if ( renderTarget ) {

				renderTarget.viewport.set( renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height );
				renderTarget.scissor.set( renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height );

			} else {

				renderer.setViewport( renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height );
				renderer.setScissor( renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height );

			}
			renderer.render( scene, cameraL, renderTarget, forceClear );

			// render right eye
			if ( renderTarget ) {

				renderTarget.viewport.set( renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height );
				renderTarget.scissor.set( renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height );

			} else {

				renderer.setViewport( renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height );
				renderer.setScissor( renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height );

			}
			renderer.render( scene, cameraR, renderTarget, forceClear );

			if ( renderTarget ) {

				renderTarget.viewport.set( 0, 0, size.width, size.height );
				renderTarget.scissor.set( 0, 0, size.width, size.height );
				renderTarget.scissorTest = false;
				renderer.setRenderTarget( null );

			} else {

				renderer.setViewport( 0, 0, size.width, size.height );
				renderer.setScissorTest( false );

			}

			if ( autoUpdate ) {

				scene.autoUpdate = true;

			}

			if ( scope.autoSubmitFrame ) {

				scope.submitFrame();

			}

			return;

		}

		// Regular render mode if not HMD

		renderer.render( scene, camera, renderTarget, forceClear );

	};

	this.dispose = function () {

		window.removeEventListener( 'vrdisplaypresentchange', onVRDisplayPresentChange, false );

	};

	//

	var poseOrientation = new THREE.Quaternion();
	var posePosition = new THREE.Vector3();

	// Compute model matrices of the eyes with respect to the head.
	function getEyeMatrices( frameData ) {

		// Compute the matrix for the position of the head based on the pose
		if ( frameData.pose.orientation ) {

			poseOrientation.fromArray( frameData.pose.orientation );
			headMatrix.makeRotationFromQuaternion( poseOrientation );

		}	else {

			headMatrix.identity();

		}

		if ( frameData.pose.position ) {

			posePosition.fromArray( frameData.pose.position );
			headMatrix.setPosition( posePosition );

		}

		// The view matrix transforms vertices from sitting space to eye space. As such, the view matrix can be thought of as a product of two matrices:
		// headToEyeMatrix * sittingToHeadMatrix

		// The headMatrix that we've calculated above is the model matrix of the head in sitting space, which is the inverse of sittingToHeadMatrix.
		// So when we multiply the view matrix with headMatrix, we're left with headToEyeMatrix:
		// viewMatrix * headMatrix = headToEyeMatrix * sittingToHeadMatrix * headMatrix = headToEyeMatrix

		eyeMatrixL.fromArray( frameData.leftViewMatrix );
		eyeMatrixL.multiply( headMatrix );
		eyeMatrixR.fromArray( frameData.rightViewMatrix );
		eyeMatrixR.multiply( headMatrix );

		// The eye's model matrix in head space is the inverse of headToEyeMatrix we calculated above.

		eyeMatrixL.getInverse( eyeMatrixL );
		eyeMatrixR.getInverse( eyeMatrixR );

	}

	function fovToNDCScaleOffset( fov ) {

		var pxscale = 2.0 / ( fov.leftTan + fov.rightTan );
		var pxoffset = ( fov.leftTan - fov.rightTan ) * pxscale * 0.5;
		var pyscale = 2.0 / ( fov.upTan + fov.downTan );
		var pyoffset = ( fov.upTan - fov.downTan ) * pyscale * 0.5;
		return { scale: [ pxscale, pyscale ], offset: [ pxoffset, pyoffset ] };

	}

	function fovPortToProjection( fov, rightHanded, zNear, zFar ) {

		rightHanded = rightHanded === undefined ? true : rightHanded;
		zNear = zNear === undefined ? 0.01 : zNear;
		zFar = zFar === undefined ? 10000.0 : zFar;

		var handednessScale = rightHanded ? - 1.0 : 1.0;

		// start with an identity matrix
		var mobj = new THREE.Matrix4();
		var m = mobj.elements;

		// and with scale/offset info for normalized device coords
		var scaleAndOffset = fovToNDCScaleOffset( fov );

		// X result, map clip edges to [-w,+w]
		m[ 0 * 4 + 0 ] = scaleAndOffset.scale[ 0 ];
		m[ 0 * 4 + 1 ] = 0.0;
		m[ 0 * 4 + 2 ] = scaleAndOffset.offset[ 0 ] * handednessScale;
		m[ 0 * 4 + 3 ] = 0.0;

		// Y result, map clip edges to [-w,+w]
		// Y offset is negated because this proj matrix transforms from world coords with Y=up,
		// but the NDC scaling has Y=down (thanks D3D?)
		m[ 1 * 4 + 0 ] = 0.0;
		m[ 1 * 4 + 1 ] = scaleAndOffset.scale[ 1 ];
		m[ 1 * 4 + 2 ] = - scaleAndOffset.offset[ 1 ] * handednessScale;
		m[ 1 * 4 + 3 ] = 0.0;

		// Z result (up to the app)
		m[ 2 * 4 + 0 ] = 0.0;
		m[ 2 * 4 + 1 ] = 0.0;
		m[ 2 * 4 + 2 ] = zFar / ( zNear - zFar ) * - handednessScale;
		m[ 2 * 4 + 3 ] = ( zFar * zNear ) / ( zNear - zFar );

		// W result (= Z in)
		m[ 3 * 4 + 0 ] = 0.0;
		m[ 3 * 4 + 1 ] = 0.0;
		m[ 3 * 4 + 2 ] = handednessScale;
		m[ 3 * 4 + 3 ] = 0.0;

		mobj.transpose();
		return mobj;

	}

	function fovToProjection( fov, rightHanded, zNear, zFar ) {

		var DEG2RAD = Math.PI / 180.0;

		var fovPort = {
			upTan: Math.tan( fov.upDegrees * DEG2RAD ),
			downTan: Math.tan( fov.downDegrees * DEG2RAD ),
			leftTan: Math.tan( fov.leftDegrees * DEG2RAD ),
			rightTan: Math.tan( fov.rightDegrees * DEG2RAD )
		};

		return fovPortToProjection( fovPort, rightHanded, zNear, zFar );

	}

};

},{}],9:[function(_dereq_,module,exports){
(function (global){
/**
 * @license
 * webvr-polyfill
 * Copyright (c) 2015-2017 Google
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @license
 * cardboard-vr-display
 * Copyright (c) 2015-2017 Google
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @license
 * webvr-polyfill-dpdb 
 * Copyright (c) 2017 Google
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @license
 * wglu-preserve-state
 * Copyright (c) 2016, Brandon Jones.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @license
 * nosleep.js
 * Copyright (c) 2017, Rich Tibbett
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.WebVRPolyfill = factory());
}(this, (function () { 'use strict';

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};



function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var race = function race(promises) {
  if (Promise.race) {
    return Promise.race(promises);
  }
  return new Promise(function (resolve, reject) {
    for (var i = 0; i < promises.length; i++) {
      promises[i].then(resolve, reject);
    }
  });
};

var isMobile = function isMobile() {
  return (/Android/i.test(navigator.userAgent) || /iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
};
var copyArray = function copyArray(source, dest) {
  for (var i = 0, n = source.length; i < n; i++) {
    dest[i] = source[i];
  }
};
var extend = function extend(dest, src) {
  for (var key in src) {
    if (src.hasOwnProperty(key)) {
      dest[key] = src[key];
    }
  }
  return dest;
};

var cardboardVrDisplay = createCommonjsModule(function (module, exports) {
/**
 * @license
 * cardboard-vr-display
 * Copyright (c) 2015-2017 Google
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * gl-preserve-state
 * Copyright (c) 2016, Brandon Jones.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * @license
 * webvr-polyfill-dpdb
 * Copyright (c) 2015-2017 Google
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * nosleep.js
 * Copyright (c) 2017, Rich Tibbett
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function (global, factory) {
	module.exports = factory();
}(commonjsGlobal, (function () { var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};
var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();
var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;
    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);
        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }
    return _arr;
  }
  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();
var MIN_TIMESTEP = 0.001;
var MAX_TIMESTEP = 1;
var base64 = function base64(mimeType, _base) {
  return 'data:' + mimeType + ';base64,' + _base;
};
var lerp = function lerp(a, b, t) {
  return a + (b - a) * t;
};
var isIOS = function () {
  var isIOS = /iPad|iPhone|iPod/.test(navigator.platform);
  return function () {
    return isIOS;
  };
}();
var isWebViewAndroid = function () {
  var isWebViewAndroid = navigator.userAgent.indexOf('Version') !== -1 && navigator.userAgent.indexOf('Android') !== -1 && navigator.userAgent.indexOf('Chrome') !== -1;
  return function () {
    return isWebViewAndroid;
  };
}();
var isSafari = function () {
  var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  return function () {
    return isSafari;
  };
}();
var isFirefoxAndroid = function () {
  var isFirefoxAndroid = navigator.userAgent.indexOf('Firefox') !== -1 && navigator.userAgent.indexOf('Android') !== -1;
  return function () {
    return isFirefoxAndroid;
  };
}();
var getChromeVersion = function () {
  var match = navigator.userAgent.match(/.*Chrome\/([0-9]+)/);
  var value = match ? parseInt(match[1], 10) : null;
  return function () {
    return value;
  };
}();
var isChromeWithoutDeviceMotion = function () {
  var value = false;
  if (getChromeVersion() === 65) {
    var match = navigator.userAgent.match(/.*Chrome\/([0-9\.]*)/);
    if (match) {
      var _match$1$split = match[1].split('.'),
          _match$1$split2 = slicedToArray(_match$1$split, 4),
          major = _match$1$split2[0],
          minor = _match$1$split2[1],
          branch = _match$1$split2[2],
          build = _match$1$split2[3];
      value = parseInt(branch, 10) === 3325 && parseInt(build, 10) < 148;
    }
  }
  return function () {
    return value;
  };
}();
var isR7 = function () {
  var isR7 = navigator.userAgent.indexOf('R7 Build') !== -1;
  return function () {
    return isR7;
  };
}();
var isLandscapeMode = function isLandscapeMode() {
  var rtn = window.orientation == 90 || window.orientation == -90;
  return isR7() ? !rtn : rtn;
};
var isTimestampDeltaValid = function isTimestampDeltaValid(timestampDeltaS) {
  if (isNaN(timestampDeltaS)) {
    return false;
  }
  if (timestampDeltaS <= MIN_TIMESTEP) {
    return false;
  }
  if (timestampDeltaS > MAX_TIMESTEP) {
    return false;
  }
  return true;
};
var getScreenWidth = function getScreenWidth() {
  return Math.max(window.screen.width, window.screen.height) * window.devicePixelRatio;
};
var getScreenHeight = function getScreenHeight() {
  return Math.min(window.screen.width, window.screen.height) * window.devicePixelRatio;
};
var requestFullscreen = function requestFullscreen(element) {
  if (isWebViewAndroid()) {
    return false;
  }
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  } else {
    return false;
  }
  return true;
};
var exitFullscreen = function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  } else {
    return false;
  }
  return true;
};
var getFullscreenElement = function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
};
var linkProgram = function linkProgram(gl, vertexSource, fragmentSource, attribLocationMap) {
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexSource);
  gl.compileShader(vertexShader);
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentSource);
  gl.compileShader(fragmentShader);
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  for (var attribName in attribLocationMap) {
    gl.bindAttribLocation(program, attribLocationMap[attribName], attribName);
  }gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
};
var getProgramUniforms = function getProgramUniforms(gl, program) {
  var uniforms = {};
  var uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  var uniformName = '';
  for (var i = 0; i < uniformCount; i++) {
    var uniformInfo = gl.getActiveUniform(program, i);
    uniformName = uniformInfo.name.replace('[0]', '');
    uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
  }
  return uniforms;
};
var orthoMatrix = function orthoMatrix(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right),
      bt = 1 / (bottom - top),
      nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
};
var isMobile = function isMobile() {
  var check = false;
  (function (a) {
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
};
var extend = function extend(dest, src) {
  for (var key in src) {
    if (src.hasOwnProperty(key)) {
      dest[key] = src[key];
    }
  }
  return dest;
};
var safariCssSizeWorkaround = function safariCssSizeWorkaround(canvas) {
  if (isIOS()) {
    var width = canvas.style.width;
    var height = canvas.style.height;
    canvas.style.width = parseInt(width) + 1 + 'px';
    canvas.style.height = parseInt(height) + 'px';
    setTimeout(function () {
      canvas.style.width = width;
      canvas.style.height = height;
    }, 100);
  }
  window.canvas = canvas;
};
var frameDataFromPose = function () {
  var piOver180 = Math.PI / 180.0;
  var rad45 = Math.PI * 0.25;
  function mat4_perspectiveFromFieldOfView(out, fov, near, far) {
    var upTan = Math.tan(fov ? fov.upDegrees * piOver180 : rad45),
        downTan = Math.tan(fov ? fov.downDegrees * piOver180 : rad45),
        leftTan = Math.tan(fov ? fov.leftDegrees * piOver180 : rad45),
        rightTan = Math.tan(fov ? fov.rightDegrees * piOver180 : rad45),
        xScale = 2.0 / (leftTan + rightTan),
        yScale = 2.0 / (upTan + downTan);
    out[0] = xScale;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    out[4] = 0.0;
    out[5] = yScale;
    out[6] = 0.0;
    out[7] = 0.0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = (upTan - downTan) * yScale * 0.5;
    out[10] = far / (near - far);
    out[11] = -1.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = far * near / (near - far);
    out[15] = 0.0;
    return out;
  }
  function mat4_fromRotationTranslation(out, q, v) {
    var x = q[0],
        y = q[1],
        z = q[2],
        w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,
        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;
    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  function mat4_translate(out, a, v) {
    var x = v[0],
        y = v[1],
        z = v[2],
        a00,
        a01,
        a02,
        a03,
        a10,
        a11,
        a12,
        a13,
        a20,
        a21,
        a22,
        a23;
    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
      a00 = a[0];a01 = a[1];a02 = a[2];a03 = a[3];
      a10 = a[4];a11 = a[5];a12 = a[6];a13 = a[7];
      a20 = a[8];a21 = a[9];a22 = a[10];a23 = a[11];
      out[0] = a00;out[1] = a01;out[2] = a02;out[3] = a03;
      out[4] = a10;out[5] = a11;out[6] = a12;out[7] = a13;
      out[8] = a20;out[9] = a21;out[10] = a22;out[11] = a23;
      out[12] = a00 * x + a10 * y + a20 * z + a[12];
      out[13] = a01 * x + a11 * y + a21 * z + a[13];
      out[14] = a02 * x + a12 * y + a22 * z + a[14];
      out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }
    return out;
  }
  function mat4_invert(out, a) {
    var a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11],
        a30 = a[12],
        a31 = a[13],
        a32 = a[14],
        a33 = a[15],
        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,
    det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1.0 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }
  var defaultOrientation = new Float32Array([0, 0, 0, 1]);
  var defaultPosition = new Float32Array([0, 0, 0]);
  function updateEyeMatrices(projection, view, pose, fov, offset, vrDisplay) {
    mat4_perspectiveFromFieldOfView(projection, fov || null, vrDisplay.depthNear, vrDisplay.depthFar);
    var orientation = pose.orientation || defaultOrientation;
    var position = pose.position || defaultPosition;
    mat4_fromRotationTranslation(view, orientation, position);
    if (offset) mat4_translate(view, view, offset);
    mat4_invert(view, view);
  }
  return function (frameData, pose, vrDisplay) {
    if (!frameData || !pose) return false;
    frameData.pose = pose;
    frameData.timestamp = pose.timestamp;
    updateEyeMatrices(frameData.leftProjectionMatrix, frameData.leftViewMatrix, pose, vrDisplay._getFieldOfView("left"), vrDisplay._getEyeOffset("left"), vrDisplay);
    updateEyeMatrices(frameData.rightProjectionMatrix, frameData.rightViewMatrix, pose, vrDisplay._getFieldOfView("right"), vrDisplay._getEyeOffset("right"), vrDisplay);
    return true;
  };
}();
var isInsideCrossOriginIFrame = function isInsideCrossOriginIFrame() {
  var isFramed = window.self !== window.top;
  var refOrigin = getOriginFromUrl(document.referrer);
  var thisOrigin = getOriginFromUrl(window.location.href);
  return isFramed && refOrigin !== thisOrigin;
};
var getOriginFromUrl = function getOriginFromUrl(url) {
  var domainIdx;
  var protoSepIdx = url.indexOf("://");
  if (protoSepIdx !== -1) {
    domainIdx = protoSepIdx + 3;
  } else {
    domainIdx = 0;
  }
  var domainEndIdx = url.indexOf('/', domainIdx);
  if (domainEndIdx === -1) {
    domainEndIdx = url.length;
  }
  return url.substring(0, domainEndIdx);
};
var getQuaternionAngle = function getQuaternionAngle(quat) {
  if (quat.w > 1) {
    console.warn('getQuaternionAngle: w > 1');
    return 0;
  }
  var angle = 2 * Math.acos(quat.w);
  return angle;
};
var warnOnce = function () {
  var observedWarnings = {};
  return function (key, message) {
    if (observedWarnings[key] === undefined) {
      console.warn('webvr-polyfill: ' + message);
      observedWarnings[key] = true;
    }
  };
}();
var deprecateWarning = function deprecateWarning(deprecated, suggested) {
  var alternative = suggested ? 'Please use ' + suggested + ' instead.' : '';
  warnOnce(deprecated, deprecated + ' has been deprecated. ' + 'This may not work on native WebVR displays. ' + alternative);
};
function WGLUPreserveGLState(gl, bindings, callback) {
  if (!bindings) {
    callback(gl);
    return;
  }
  var boundValues = [];
  var activeTexture = null;
  for (var i = 0; i < bindings.length; ++i) {
    var binding = bindings[i];
    switch (binding) {
      case gl.TEXTURE_BINDING_2D:
      case gl.TEXTURE_BINDING_CUBE_MAP:
        var textureUnit = bindings[++i];
        if (textureUnit < gl.TEXTURE0 || textureUnit > gl.TEXTURE31) {
          console.error("TEXTURE_BINDING_2D or TEXTURE_BINDING_CUBE_MAP must be followed by a valid texture unit");
          boundValues.push(null, null);
          break;
        }
        if (!activeTexture) {
          activeTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
        }
        gl.activeTexture(textureUnit);
        boundValues.push(gl.getParameter(binding), null);
        break;
      case gl.ACTIVE_TEXTURE:
        activeTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
        boundValues.push(null);
        break;
      default:
        boundValues.push(gl.getParameter(binding));
        break;
    }
  }
  callback(gl);
  for (var i = 0; i < bindings.length; ++i) {
    var binding = bindings[i];
    var boundValue = boundValues[i];
    switch (binding) {
      case gl.ACTIVE_TEXTURE:
        break;
      case gl.ARRAY_BUFFER_BINDING:
        gl.bindBuffer(gl.ARRAY_BUFFER, boundValue);
        break;
      case gl.COLOR_CLEAR_VALUE:
        gl.clearColor(boundValue[0], boundValue[1], boundValue[2], boundValue[3]);
        break;
      case gl.COLOR_WRITEMASK:
        gl.colorMask(boundValue[0], boundValue[1], boundValue[2], boundValue[3]);
        break;
      case gl.CURRENT_PROGRAM:
        gl.useProgram(boundValue);
        break;
      case gl.ELEMENT_ARRAY_BUFFER_BINDING:
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boundValue);
        break;
      case gl.FRAMEBUFFER_BINDING:
        gl.bindFramebuffer(gl.FRAMEBUFFER, boundValue);
        break;
      case gl.RENDERBUFFER_BINDING:
        gl.bindRenderbuffer(gl.RENDERBUFFER, boundValue);
        break;
      case gl.TEXTURE_BINDING_2D:
        var textureUnit = bindings[++i];
        if (textureUnit < gl.TEXTURE0 || textureUnit > gl.TEXTURE31)
          break;
        gl.activeTexture(textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, boundValue);
        break;
      case gl.TEXTURE_BINDING_CUBE_MAP:
        var textureUnit = bindings[++i];
        if (textureUnit < gl.TEXTURE0 || textureUnit > gl.TEXTURE31)
          break;
        gl.activeTexture(textureUnit);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, boundValue);
        break;
      case gl.VIEWPORT:
        gl.viewport(boundValue[0], boundValue[1], boundValue[2], boundValue[3]);
        break;
      case gl.BLEND:
      case gl.CULL_FACE:
      case gl.DEPTH_TEST:
      case gl.SCISSOR_TEST:
      case gl.STENCIL_TEST:
        if (boundValue) {
          gl.enable(binding);
        } else {
          gl.disable(binding);
        }
        break;
      default:
        console.log("No GL restore behavior for 0x" + binding.toString(16));
        break;
    }
    if (activeTexture) {
      gl.activeTexture(activeTexture);
    }
  }
}
var glPreserveState = WGLUPreserveGLState;
var distortionVS = ['attribute vec2 position;', 'attribute vec3 texCoord;', 'varying vec2 vTexCoord;', 'uniform vec4 viewportOffsetScale[2];', 'void main() {', '  vec4 viewport = viewportOffsetScale[int(texCoord.z)];', '  vTexCoord = (texCoord.xy * viewport.zw) + viewport.xy;', '  gl_Position = vec4( position, 1.0, 1.0 );', '}'].join('\n');
var distortionFS = ['precision mediump float;', 'uniform sampler2D diffuse;', 'varying vec2 vTexCoord;', 'void main() {', '  gl_FragColor = texture2D(diffuse, vTexCoord);', '}'].join('\n');
function CardboardDistorter(gl, cardboardUI, bufferScale, dirtySubmitFrameBindings) {
  this.gl = gl;
  this.cardboardUI = cardboardUI;
  this.bufferScale = bufferScale;
  this.dirtySubmitFrameBindings = dirtySubmitFrameBindings;
  this.ctxAttribs = gl.getContextAttributes();
  this.meshWidth = 20;
  this.meshHeight = 20;
  this.bufferWidth = gl.drawingBufferWidth;
  this.bufferHeight = gl.drawingBufferHeight;
  this.realBindFramebuffer = gl.bindFramebuffer;
  this.realEnable = gl.enable;
  this.realDisable = gl.disable;
  this.realColorMask = gl.colorMask;
  this.realClearColor = gl.clearColor;
  this.realViewport = gl.viewport;
  if (!isIOS()) {
    this.realCanvasWidth = Object.getOwnPropertyDescriptor(gl.canvas.__proto__, 'width');
    this.realCanvasHeight = Object.getOwnPropertyDescriptor(gl.canvas.__proto__, 'height');
  }
  this.isPatched = false;
  this.lastBoundFramebuffer = null;
  this.cullFace = false;
  this.depthTest = false;
  this.blend = false;
  this.scissorTest = false;
  this.stencilTest = false;
  this.viewport = [0, 0, 0, 0];
  this.colorMask = [true, true, true, true];
  this.clearColor = [0, 0, 0, 0];
  this.attribs = {
    position: 0,
    texCoord: 1
  };
  this.program = linkProgram(gl, distortionVS, distortionFS, this.attribs);
  this.uniforms = getProgramUniforms(gl, this.program);
  this.viewportOffsetScale = new Float32Array(8);
  this.setTextureBounds();
  this.vertexBuffer = gl.createBuffer();
  this.indexBuffer = gl.createBuffer();
  this.indexCount = 0;
  this.renderTarget = gl.createTexture();
  this.framebuffer = gl.createFramebuffer();
  this.depthStencilBuffer = null;
  this.depthBuffer = null;
  this.stencilBuffer = null;
  if (this.ctxAttribs.depth && this.ctxAttribs.stencil) {
    this.depthStencilBuffer = gl.createRenderbuffer();
  } else if (this.ctxAttribs.depth) {
    this.depthBuffer = gl.createRenderbuffer();
  } else if (this.ctxAttribs.stencil) {
    this.stencilBuffer = gl.createRenderbuffer();
  }
  this.patch();
  this.onResize();
}
CardboardDistorter.prototype.destroy = function () {
  var gl = this.gl;
  this.unpatch();
  gl.deleteProgram(this.program);
  gl.deleteBuffer(this.vertexBuffer);
  gl.deleteBuffer(this.indexBuffer);
  gl.deleteTexture(this.renderTarget);
  gl.deleteFramebuffer(this.framebuffer);
  if (this.depthStencilBuffer) {
    gl.deleteRenderbuffer(this.depthStencilBuffer);
  }
  if (this.depthBuffer) {
    gl.deleteRenderbuffer(this.depthBuffer);
  }
  if (this.stencilBuffer) {
    gl.deleteRenderbuffer(this.stencilBuffer);
  }
  if (this.cardboardUI) {
    this.cardboardUI.destroy();
  }
};
CardboardDistorter.prototype.onResize = function () {
  var gl = this.gl;
  var self = this;
  var glState = [gl.RENDERBUFFER_BINDING, gl.TEXTURE_BINDING_2D, gl.TEXTURE0];
  glPreserveState(gl, glState, function (gl) {
    self.realBindFramebuffer.call(gl, gl.FRAMEBUFFER, null);
    if (self.scissorTest) {
      self.realDisable.call(gl, gl.SCISSOR_TEST);
    }
    self.realColorMask.call(gl, true, true, true, true);
    self.realViewport.call(gl, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    self.realClearColor.call(gl, 0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    self.realBindFramebuffer.call(gl, gl.FRAMEBUFFER, self.framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, self.renderTarget);
    gl.texImage2D(gl.TEXTURE_2D, 0, self.ctxAttribs.alpha ? gl.RGBA : gl.RGB, self.bufferWidth, self.bufferHeight, 0, self.ctxAttribs.alpha ? gl.RGBA : gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, self.renderTarget, 0);
    if (self.ctxAttribs.depth && self.ctxAttribs.stencil) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, self.depthStencilBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, self.bufferWidth, self.bufferHeight);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, self.depthStencilBuffer);
    } else if (self.ctxAttribs.depth) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, self.depthBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, self.bufferWidth, self.bufferHeight);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, self.depthBuffer);
    } else if (self.ctxAttribs.stencil) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, self.stencilBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.STENCIL_INDEX8, self.bufferWidth, self.bufferHeight);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.RENDERBUFFER, self.stencilBuffer);
    }
    if (!gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      console.error('Framebuffer incomplete!');
    }
    self.realBindFramebuffer.call(gl, gl.FRAMEBUFFER, self.lastBoundFramebuffer);
    if (self.scissorTest) {
      self.realEnable.call(gl, gl.SCISSOR_TEST);
    }
    self.realColorMask.apply(gl, self.colorMask);
    self.realViewport.apply(gl, self.viewport);
    self.realClearColor.apply(gl, self.clearColor);
  });
  if (this.cardboardUI) {
    this.cardboardUI.onResize();
  }
};
CardboardDistorter.prototype.patch = function () {
  if (this.isPatched) {
    return;
  }
  var self = this;
  var canvas = this.gl.canvas;
  var gl = this.gl;
  if (!isIOS()) {
    canvas.width = getScreenWidth() * this.bufferScale;
    canvas.height = getScreenHeight() * this.bufferScale;
    Object.defineProperty(canvas, 'width', {
      configurable: true,
      enumerable: true,
      get: function get() {
        return self.bufferWidth;
      },
      set: function set(value) {
        self.bufferWidth = value;
        self.realCanvasWidth.set.call(canvas, value);
        self.onResize();
      }
    });
    Object.defineProperty(canvas, 'height', {
      configurable: true,
      enumerable: true,
      get: function get() {
        return self.bufferHeight;
      },
      set: function set(value) {
        self.bufferHeight = value;
        self.realCanvasHeight.set.call(canvas, value);
        self.onResize();
      }
    });
  }
  this.lastBoundFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  if (this.lastBoundFramebuffer == null) {
    this.lastBoundFramebuffer = this.framebuffer;
    this.gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
  }
  this.gl.bindFramebuffer = function (target, framebuffer) {
    self.lastBoundFramebuffer = framebuffer ? framebuffer : self.framebuffer;
    self.realBindFramebuffer.call(gl, target, self.lastBoundFramebuffer);
  };
  this.cullFace = gl.getParameter(gl.CULL_FACE);
  this.depthTest = gl.getParameter(gl.DEPTH_TEST);
  this.blend = gl.getParameter(gl.BLEND);
  this.scissorTest = gl.getParameter(gl.SCISSOR_TEST);
  this.stencilTest = gl.getParameter(gl.STENCIL_TEST);
  gl.enable = function (pname) {
    switch (pname) {
      case gl.CULL_FACE:
        self.cullFace = true;break;
      case gl.DEPTH_TEST:
        self.depthTest = true;break;
      case gl.BLEND:
        self.blend = true;break;
      case gl.SCISSOR_TEST:
        self.scissorTest = true;break;
      case gl.STENCIL_TEST:
        self.stencilTest = true;break;
    }
    self.realEnable.call(gl, pname);
  };
  gl.disable = function (pname) {
    switch (pname) {
      case gl.CULL_FACE:
        self.cullFace = false;break;
      case gl.DEPTH_TEST:
        self.depthTest = false;break;
      case gl.BLEND:
        self.blend = false;break;
      case gl.SCISSOR_TEST:
        self.scissorTest = false;break;
      case gl.STENCIL_TEST:
        self.stencilTest = false;break;
    }
    self.realDisable.call(gl, pname);
  };
  this.colorMask = gl.getParameter(gl.COLOR_WRITEMASK);
  gl.colorMask = function (r, g, b, a) {
    self.colorMask[0] = r;
    self.colorMask[1] = g;
    self.colorMask[2] = b;
    self.colorMask[3] = a;
    self.realColorMask.call(gl, r, g, b, a);
  };
  this.clearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
  gl.clearColor = function (r, g, b, a) {
    self.clearColor[0] = r;
    self.clearColor[1] = g;
    self.clearColor[2] = b;
    self.clearColor[3] = a;
    self.realClearColor.call(gl, r, g, b, a);
  };
  this.viewport = gl.getParameter(gl.VIEWPORT);
  gl.viewport = function (x, y, w, h) {
    self.viewport[0] = x;
    self.viewport[1] = y;
    self.viewport[2] = w;
    self.viewport[3] = h;
    self.realViewport.call(gl, x, y, w, h);
  };
  this.isPatched = true;
  safariCssSizeWorkaround(canvas);
};
CardboardDistorter.prototype.unpatch = function () {
  if (!this.isPatched) {
    return;
  }
  var gl = this.gl;
  var canvas = this.gl.canvas;
  if (!isIOS()) {
    Object.defineProperty(canvas, 'width', this.realCanvasWidth);
    Object.defineProperty(canvas, 'height', this.realCanvasHeight);
  }
  canvas.width = this.bufferWidth;
  canvas.height = this.bufferHeight;
  gl.bindFramebuffer = this.realBindFramebuffer;
  gl.enable = this.realEnable;
  gl.disable = this.realDisable;
  gl.colorMask = this.realColorMask;
  gl.clearColor = this.realClearColor;
  gl.viewport = this.realViewport;
  if (this.lastBoundFramebuffer == this.framebuffer) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  this.isPatched = false;
  setTimeout(function () {
    safariCssSizeWorkaround(canvas);
  }, 1);
};
CardboardDistorter.prototype.setTextureBounds = function (leftBounds, rightBounds) {
  if (!leftBounds) {
    leftBounds = [0, 0, 0.5, 1];
  }
  if (!rightBounds) {
    rightBounds = [0.5, 0, 0.5, 1];
  }
  this.viewportOffsetScale[0] = leftBounds[0];
  this.viewportOffsetScale[1] = leftBounds[1];
  this.viewportOffsetScale[2] = leftBounds[2];
  this.viewportOffsetScale[3] = leftBounds[3];
  this.viewportOffsetScale[4] = rightBounds[0];
  this.viewportOffsetScale[5] = rightBounds[1];
  this.viewportOffsetScale[6] = rightBounds[2];
  this.viewportOffsetScale[7] = rightBounds[3];
};
CardboardDistorter.prototype.submitFrame = function () {
  var gl = this.gl;
  var self = this;
  var glState = [];
  if (!this.dirtySubmitFrameBindings) {
    glState.push(gl.CURRENT_PROGRAM, gl.ARRAY_BUFFER_BINDING, gl.ELEMENT_ARRAY_BUFFER_BINDING, gl.TEXTURE_BINDING_2D, gl.TEXTURE0);
  }
  glPreserveState(gl, glState, function (gl) {
    self.realBindFramebuffer.call(gl, gl.FRAMEBUFFER, null);
    if (self.cullFace) {
      self.realDisable.call(gl, gl.CULL_FACE);
    }
    if (self.depthTest) {
      self.realDisable.call(gl, gl.DEPTH_TEST);
    }
    if (self.blend) {
      self.realDisable.call(gl, gl.BLEND);
    }
    if (self.scissorTest) {
      self.realDisable.call(gl, gl.SCISSOR_TEST);
    }
    if (self.stencilTest) {
      self.realDisable.call(gl, gl.STENCIL_TEST);
    }
    self.realColorMask.call(gl, true, true, true, true);
    self.realViewport.call(gl, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    if (self.ctxAttribs.alpha || isIOS()) {
      self.realClearColor.call(gl, 0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.useProgram(self.program);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.indexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexBuffer);
    gl.enableVertexAttribArray(self.attribs.position);
    gl.enableVertexAttribArray(self.attribs.texCoord);
    gl.vertexAttribPointer(self.attribs.position, 2, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(self.attribs.texCoord, 3, gl.FLOAT, false, 20, 8);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(self.uniforms.diffuse, 0);
    gl.bindTexture(gl.TEXTURE_2D, self.renderTarget);
    gl.uniform4fv(self.uniforms.viewportOffsetScale, self.viewportOffsetScale);
    gl.drawElements(gl.TRIANGLES, self.indexCount, gl.UNSIGNED_SHORT, 0);
    if (self.cardboardUI) {
      self.cardboardUI.renderNoState();
    }
    self.realBindFramebuffer.call(self.gl, gl.FRAMEBUFFER, self.framebuffer);
    if (!self.ctxAttribs.preserveDrawingBuffer) {
      self.realClearColor.call(gl, 0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    if (!self.dirtySubmitFrameBindings) {
      self.realBindFramebuffer.call(gl, gl.FRAMEBUFFER, self.lastBoundFramebuffer);
    }
    if (self.cullFace) {
      self.realEnable.call(gl, gl.CULL_FACE);
    }
    if (self.depthTest) {
      self.realEnable.call(gl, gl.DEPTH_TEST);
    }
    if (self.blend) {
      self.realEnable.call(gl, gl.BLEND);
    }
    if (self.scissorTest) {
      self.realEnable.call(gl, gl.SCISSOR_TEST);
    }
    if (self.stencilTest) {
      self.realEnable.call(gl, gl.STENCIL_TEST);
    }
    self.realColorMask.apply(gl, self.colorMask);
    self.realViewport.apply(gl, self.viewport);
    if (self.ctxAttribs.alpha || !self.ctxAttribs.preserveDrawingBuffer) {
      self.realClearColor.apply(gl, self.clearColor);
    }
  });
  if (isIOS()) {
    var canvas = gl.canvas;
    if (canvas.width != self.bufferWidth || canvas.height != self.bufferHeight) {
      self.bufferWidth = canvas.width;
      self.bufferHeight = canvas.height;
      self.onResize();
    }
  }
};
CardboardDistorter.prototype.updateDeviceInfo = function (deviceInfo) {
  var gl = this.gl;
  var self = this;
  var glState = [gl.ARRAY_BUFFER_BINDING, gl.ELEMENT_ARRAY_BUFFER_BINDING];
  glPreserveState(gl, glState, function (gl) {
    var vertices = self.computeMeshVertices_(self.meshWidth, self.meshHeight, deviceInfo);
    gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    if (!self.indexCount) {
      var indices = self.computeMeshIndices_(self.meshWidth, self.meshHeight);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      self.indexCount = indices.length;
    }
  });
};
CardboardDistorter.prototype.computeMeshVertices_ = function (width, height, deviceInfo) {
  var vertices = new Float32Array(2 * width * height * 5);
  var lensFrustum = deviceInfo.getLeftEyeVisibleTanAngles();
  var noLensFrustum = deviceInfo.getLeftEyeNoLensTanAngles();
  var viewport = deviceInfo.getLeftEyeVisibleScreenRect(noLensFrustum);
  var vidx = 0;
  for (var e = 0; e < 2; e++) {
    for (var j = 0; j < height; j++) {
      for (var i = 0; i < width; i++, vidx++) {
        var u = i / (width - 1);
        var v = j / (height - 1);
        var s = u;
        var t = v;
        var x = lerp(lensFrustum[0], lensFrustum[2], u);
        var y = lerp(lensFrustum[3], lensFrustum[1], v);
        var d = Math.sqrt(x * x + y * y);
        var r = deviceInfo.distortion.distortInverse(d);
        var p = x * r / d;
        var q = y * r / d;
        u = (p - noLensFrustum[0]) / (noLensFrustum[2] - noLensFrustum[0]);
        v = (q - noLensFrustum[3]) / (noLensFrustum[1] - noLensFrustum[3]);
        u = (viewport.x + u * viewport.width - 0.5) * 2.0;
        v = (viewport.y + v * viewport.height - 0.5) * 2.0;
        vertices[vidx * 5 + 0] = u;
        vertices[vidx * 5 + 1] = v;
        vertices[vidx * 5 + 2] = s;
        vertices[vidx * 5 + 3] = t;
        vertices[vidx * 5 + 4] = e;
      }
    }
    var w = lensFrustum[2] - lensFrustum[0];
    lensFrustum[0] = -(w + lensFrustum[0]);
    lensFrustum[2] = w - lensFrustum[2];
    w = noLensFrustum[2] - noLensFrustum[0];
    noLensFrustum[0] = -(w + noLensFrustum[0]);
    noLensFrustum[2] = w - noLensFrustum[2];
    viewport.x = 1 - (viewport.x + viewport.width);
  }
  return vertices;
};
CardboardDistorter.prototype.computeMeshIndices_ = function (width, height) {
  var indices = new Uint16Array(2 * (width - 1) * (height - 1) * 6);
  var halfwidth = width / 2;
  var halfheight = height / 2;
  var vidx = 0;
  var iidx = 0;
  for (var e = 0; e < 2; e++) {
    for (var j = 0; j < height; j++) {
      for (var i = 0; i < width; i++, vidx++) {
        if (i == 0 || j == 0) continue;
        if (i <= halfwidth == j <= halfheight) {
          indices[iidx++] = vidx;
          indices[iidx++] = vidx - width - 1;
          indices[iidx++] = vidx - width;
          indices[iidx++] = vidx - width - 1;
          indices[iidx++] = vidx;
          indices[iidx++] = vidx - 1;
        } else {
          indices[iidx++] = vidx - 1;
          indices[iidx++] = vidx - width;
          indices[iidx++] = vidx;
          indices[iidx++] = vidx - width;
          indices[iidx++] = vidx - 1;
          indices[iidx++] = vidx - width - 1;
        }
      }
    }
  }
  return indices;
};
CardboardDistorter.prototype.getOwnPropertyDescriptor_ = function (proto, attrName) {
  var descriptor = Object.getOwnPropertyDescriptor(proto, attrName);
  if (descriptor.get === undefined || descriptor.set === undefined) {
    descriptor.configurable = true;
    descriptor.enumerable = true;
    descriptor.get = function () {
      return this.getAttribute(attrName);
    };
    descriptor.set = function (val) {
      this.setAttribute(attrName, val);
    };
  }
  return descriptor;
};
var uiVS = ['attribute vec2 position;', 'uniform mat4 projectionMat;', 'void main() {', '  gl_Position = projectionMat * vec4( position, -1.0, 1.0 );', '}'].join('\n');
var uiFS = ['precision mediump float;', 'uniform vec4 color;', 'void main() {', '  gl_FragColor = color;', '}'].join('\n');
var DEG2RAD = Math.PI / 180.0;
var kAnglePerGearSection = 60;
var kOuterRimEndAngle = 12;
var kInnerRimBeginAngle = 20;
var kOuterRadius = 1;
var kMiddleRadius = 0.75;
var kInnerRadius = 0.3125;
var kCenterLineThicknessDp = 4;
var kButtonWidthDp = 28;
var kTouchSlopFactor = 1.5;
function CardboardUI(gl) {
  this.gl = gl;
  this.attribs = {
    position: 0
  };
  this.program = linkProgram(gl, uiVS, uiFS, this.attribs);
  this.uniforms = getProgramUniforms(gl, this.program);
  this.vertexBuffer = gl.createBuffer();
  this.gearOffset = 0;
  this.gearVertexCount = 0;
  this.arrowOffset = 0;
  this.arrowVertexCount = 0;
  this.projMat = new Float32Array(16);
  this.listener = null;
  this.onResize();
}
CardboardUI.prototype.destroy = function () {
  var gl = this.gl;
  if (this.listener) {
    gl.canvas.removeEventListener('click', this.listener, false);
  }
  gl.deleteProgram(this.program);
  gl.deleteBuffer(this.vertexBuffer);
};
CardboardUI.prototype.listen = function (optionsCallback, backCallback) {
  var canvas = this.gl.canvas;
  this.listener = function (event) {
    var midline = canvas.clientWidth / 2;
    var buttonSize = kButtonWidthDp * kTouchSlopFactor;
    if (event.clientX > midline - buttonSize && event.clientX < midline + buttonSize && event.clientY > canvas.clientHeight - buttonSize) {
      optionsCallback(event);
    }
    else if (event.clientX < buttonSize && event.clientY < buttonSize) {
        backCallback(event);
      }
  };
  canvas.addEventListener('click', this.listener, false);
};
CardboardUI.prototype.onResize = function () {
  var gl = this.gl;
  var self = this;
  var glState = [gl.ARRAY_BUFFER_BINDING];
  glPreserveState(gl, glState, function (gl) {
    var vertices = [];
    var midline = gl.drawingBufferWidth / 2;
    var physicalPixels = Math.max(screen.width, screen.height) * window.devicePixelRatio;
    var scalingRatio = gl.drawingBufferWidth / physicalPixels;
    var dps = scalingRatio * window.devicePixelRatio;
    var lineWidth = kCenterLineThicknessDp * dps / 2;
    var buttonSize = kButtonWidthDp * kTouchSlopFactor * dps;
    var buttonScale = kButtonWidthDp * dps / 2;
    var buttonBorder = (kButtonWidthDp * kTouchSlopFactor - kButtonWidthDp) * dps;
    vertices.push(midline - lineWidth, buttonSize);
    vertices.push(midline - lineWidth, gl.drawingBufferHeight);
    vertices.push(midline + lineWidth, buttonSize);
    vertices.push(midline + lineWidth, gl.drawingBufferHeight);
    self.gearOffset = vertices.length / 2;
    function addGearSegment(theta, r) {
      var angle = (90 - theta) * DEG2RAD;
      var x = Math.cos(angle);
      var y = Math.sin(angle);
      vertices.push(kInnerRadius * x * buttonScale + midline, kInnerRadius * y * buttonScale + buttonScale);
      vertices.push(r * x * buttonScale + midline, r * y * buttonScale + buttonScale);
    }
    for (var i = 0; i <= 6; i++) {
      var segmentTheta = i * kAnglePerGearSection;
      addGearSegment(segmentTheta, kOuterRadius);
      addGearSegment(segmentTheta + kOuterRimEndAngle, kOuterRadius);
      addGearSegment(segmentTheta + kInnerRimBeginAngle, kMiddleRadius);
      addGearSegment(segmentTheta + (kAnglePerGearSection - kInnerRimBeginAngle), kMiddleRadius);
      addGearSegment(segmentTheta + (kAnglePerGearSection - kOuterRimEndAngle), kOuterRadius);
    }
    self.gearVertexCount = vertices.length / 2 - self.gearOffset;
    self.arrowOffset = vertices.length / 2;
    function addArrowVertex(x, y) {
      vertices.push(buttonBorder + x, gl.drawingBufferHeight - buttonBorder - y);
    }
    var angledLineWidth = lineWidth / Math.sin(45 * DEG2RAD);
    addArrowVertex(0, buttonScale);
    addArrowVertex(buttonScale, 0);
    addArrowVertex(buttonScale + angledLineWidth, angledLineWidth);
    addArrowVertex(angledLineWidth, buttonScale + angledLineWidth);
    addArrowVertex(angledLineWidth, buttonScale - angledLineWidth);
    addArrowVertex(0, buttonScale);
    addArrowVertex(buttonScale, buttonScale * 2);
    addArrowVertex(buttonScale + angledLineWidth, buttonScale * 2 - angledLineWidth);
    addArrowVertex(angledLineWidth, buttonScale - angledLineWidth);
    addArrowVertex(0, buttonScale);
    addArrowVertex(angledLineWidth, buttonScale - lineWidth);
    addArrowVertex(kButtonWidthDp * dps, buttonScale - lineWidth);
    addArrowVertex(angledLineWidth, buttonScale + lineWidth);
    addArrowVertex(kButtonWidthDp * dps, buttonScale + lineWidth);
    self.arrowVertexCount = vertices.length / 2 - self.arrowOffset;
    gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  });
};
CardboardUI.prototype.render = function () {
  var gl = this.gl;
  var self = this;
  var glState = [gl.CULL_FACE, gl.DEPTH_TEST, gl.BLEND, gl.SCISSOR_TEST, gl.STENCIL_TEST, gl.COLOR_WRITEMASK, gl.VIEWPORT, gl.CURRENT_PROGRAM, gl.ARRAY_BUFFER_BINDING];
  glPreserveState(gl, glState, function (gl) {
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.colorMask(true, true, true, true);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    self.renderNoState();
  });
};
CardboardUI.prototype.renderNoState = function () {
  var gl = this.gl;
  gl.useProgram(this.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.enableVertexAttribArray(this.attribs.position);
  gl.vertexAttribPointer(this.attribs.position, 2, gl.FLOAT, false, 8, 0);
  gl.uniform4f(this.uniforms.color, 1.0, 1.0, 1.0, 1.0);
  orthoMatrix(this.projMat, 0, gl.drawingBufferWidth, 0, gl.drawingBufferHeight, 0.1, 1024.0);
  gl.uniformMatrix4fv(this.uniforms.projectionMat, false, this.projMat);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.drawArrays(gl.TRIANGLE_STRIP, this.gearOffset, this.gearVertexCount);
  gl.drawArrays(gl.TRIANGLE_STRIP, this.arrowOffset, this.arrowVertexCount);
};
function Distortion(coefficients) {
  this.coefficients = coefficients;
}
Distortion.prototype.distortInverse = function (radius) {
  var r0 = 0;
  var r1 = 1;
  var dr0 = radius - this.distort(r0);
  while (Math.abs(r1 - r0) > 0.0001             ) {
    var dr1 = radius - this.distort(r1);
    var r2 = r1 - dr1 * ((r1 - r0) / (dr1 - dr0));
    r0 = r1;
    r1 = r2;
    dr0 = dr1;
  }
  return r1;
};
Distortion.prototype.distort = function (radius) {
  var r2 = radius * radius;
  var ret = 0;
  for (var i = 0; i < this.coefficients.length; i++) {
    ret = r2 * (ret + this.coefficients[i]);
  }
  return (ret + 1) * radius;
};
var degToRad = Math.PI / 180;
var radToDeg = 180 / Math.PI;
var Vector3 = function Vector3(x, y, z) {
  this.x = x || 0;
  this.y = y || 0;
  this.z = z || 0;
};
Vector3.prototype = {
  constructor: Vector3,
  set: function set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  },
  copy: function copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  },
  length: function length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  },
  normalize: function normalize() {
    var scalar = this.length();
    if (scalar !== 0) {
      var invScalar = 1 / scalar;
      this.multiplyScalar(invScalar);
    } else {
      this.x = 0;
      this.y = 0;
      this.z = 0;
    }
    return this;
  },
  multiplyScalar: function multiplyScalar(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
  },
  applyQuaternion: function applyQuaternion(q) {
    var x = this.x;
    var y = this.y;
    var z = this.z;
    var qx = q.x;
    var qy = q.y;
    var qz = q.z;
    var qw = q.w;
    var ix = qw * x + qy * z - qz * y;
    var iy = qw * y + qz * x - qx * z;
    var iz = qw * z + qx * y - qy * x;
    var iw = -qx * x - qy * y - qz * z;
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
  },
  dot: function dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  },
  crossVectors: function crossVectors(a, b) {
    var ax = a.x,
        ay = a.y,
        az = a.z;
    var bx = b.x,
        by = b.y,
        bz = b.z;
    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
  }
};
var Quaternion = function Quaternion(x, y, z, w) {
  this.x = x || 0;
  this.y = y || 0;
  this.z = z || 0;
  this.w = w !== undefined ? w : 1;
};
Quaternion.prototype = {
  constructor: Quaternion,
  set: function set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  },
  copy: function copy(quaternion) {
    this.x = quaternion.x;
    this.y = quaternion.y;
    this.z = quaternion.z;
    this.w = quaternion.w;
    return this;
  },
  setFromEulerXYZ: function setFromEulerXYZ(x, y, z) {
    var c1 = Math.cos(x / 2);
    var c2 = Math.cos(y / 2);
    var c3 = Math.cos(z / 2);
    var s1 = Math.sin(x / 2);
    var s2 = Math.sin(y / 2);
    var s3 = Math.sin(z / 2);
    this.x = s1 * c2 * c3 + c1 * s2 * s3;
    this.y = c1 * s2 * c3 - s1 * c2 * s3;
    this.z = c1 * c2 * s3 + s1 * s2 * c3;
    this.w = c1 * c2 * c3 - s1 * s2 * s3;
    return this;
  },
  setFromEulerYXZ: function setFromEulerYXZ(x, y, z) {
    var c1 = Math.cos(x / 2);
    var c2 = Math.cos(y / 2);
    var c3 = Math.cos(z / 2);
    var s1 = Math.sin(x / 2);
    var s2 = Math.sin(y / 2);
    var s3 = Math.sin(z / 2);
    this.x = s1 * c2 * c3 + c1 * s2 * s3;
    this.y = c1 * s2 * c3 - s1 * c2 * s3;
    this.z = c1 * c2 * s3 - s1 * s2 * c3;
    this.w = c1 * c2 * c3 + s1 * s2 * s3;
    return this;
  },
  setFromAxisAngle: function setFromAxisAngle(axis, angle) {
    var halfAngle = angle / 2,
        s = Math.sin(halfAngle);
    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(halfAngle);
    return this;
  },
  multiply: function multiply(q) {
    return this.multiplyQuaternions(this, q);
  },
  multiplyQuaternions: function multiplyQuaternions(a, b) {
    var qax = a.x,
        qay = a.y,
        qaz = a.z,
        qaw = a.w;
    var qbx = b.x,
        qby = b.y,
        qbz = b.z,
        qbw = b.w;
    this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
    this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
    this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
    this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
    return this;
  },
  inverse: function inverse() {
    this.x *= -1;
    this.y *= -1;
    this.z *= -1;
    this.normalize();
    return this;
  },
  normalize: function normalize() {
    var l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (l === 0) {
      this.x = 0;
      this.y = 0;
      this.z = 0;
      this.w = 1;
    } else {
      l = 1 / l;
      this.x = this.x * l;
      this.y = this.y * l;
      this.z = this.z * l;
      this.w = this.w * l;
    }
    return this;
  },
  slerp: function slerp(qb, t) {
    if (t === 0) return this;
    if (t === 1) return this.copy(qb);
    var x = this.x,
        y = this.y,
        z = this.z,
        w = this.w;
    var cosHalfTheta = w * qb.w + x * qb.x + y * qb.y + z * qb.z;
    if (cosHalfTheta < 0) {
      this.w = -qb.w;
      this.x = -qb.x;
      this.y = -qb.y;
      this.z = -qb.z;
      cosHalfTheta = -cosHalfTheta;
    } else {
      this.copy(qb);
    }
    if (cosHalfTheta >= 1.0) {
      this.w = w;
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    var halfTheta = Math.acos(cosHalfTheta);
    var sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);
    if (Math.abs(sinHalfTheta) < 0.001) {
      this.w = 0.5 * (w + this.w);
      this.x = 0.5 * (x + this.x);
      this.y = 0.5 * (y + this.y);
      this.z = 0.5 * (z + this.z);
      return this;
    }
    var ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta,
        ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
    this.w = w * ratioA + this.w * ratioB;
    this.x = x * ratioA + this.x * ratioB;
    this.y = y * ratioA + this.y * ratioB;
    this.z = z * ratioA + this.z * ratioB;
    return this;
  },
  setFromUnitVectors: function () {
    var v1, r;
    var EPS = 0.000001;
    return function (vFrom, vTo) {
      if (v1 === undefined) v1 = new Vector3();
      r = vFrom.dot(vTo) + 1;
      if (r < EPS) {
        r = 0;
        if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {
          v1.set(-vFrom.y, vFrom.x, 0);
        } else {
          v1.set(0, -vFrom.z, vFrom.y);
        }
      } else {
        v1.crossVectors(vFrom, vTo);
      }
      this.x = v1.x;
      this.y = v1.y;
      this.z = v1.z;
      this.w = r;
      this.normalize();
      return this;
    };
  }()
};
function Device(params) {
  this.width = params.width || getScreenWidth();
  this.height = params.height || getScreenHeight();
  this.widthMeters = params.widthMeters;
  this.heightMeters = params.heightMeters;
  this.bevelMeters = params.bevelMeters;
}
var DEFAULT_ANDROID = new Device({
  widthMeters: 0.110,
  heightMeters: 0.062,
  bevelMeters: 0.004
});
var DEFAULT_IOS = new Device({
  widthMeters: 0.1038,
  heightMeters: 0.0584,
  bevelMeters: 0.004
});
var Viewers = {
  CardboardV1: new CardboardViewer({
    id: 'CardboardV1',
    label: 'Cardboard I/O 2014',
    fov: 40,
    interLensDistance: 0.060,
    baselineLensDistance: 0.035,
    screenLensDistance: 0.042,
    distortionCoefficients: [0.441, 0.156],
    inverseCoefficients: [-0.4410035, 0.42756155, -0.4804439, 0.5460139, -0.58821183, 0.5733938, -0.48303202, 0.33299083, -0.17573841, 0.0651772, -0.01488963, 0.001559834]
  }),
  CardboardV2: new CardboardViewer({
    id: 'CardboardV2',
    label: 'Cardboard I/O 2015',
    fov: 60,
    interLensDistance: 0.064,
    baselineLensDistance: 0.035,
    screenLensDistance: 0.039,
    distortionCoefficients: [0.34, 0.55],
    inverseCoefficients: [-0.33836704, -0.18162185, 0.862655, -1.2462051, 1.0560602, -0.58208317, 0.21609078, -0.05444823, 0.009177956, -9.904169E-4, 6.183535E-5, -1.6981803E-6]
  })
};
function DeviceInfo(deviceParams) {
  this.viewer = Viewers.CardboardV2;
  this.updateDeviceParams(deviceParams);
  this.distortion = new Distortion(this.viewer.distortionCoefficients);
}
DeviceInfo.prototype.updateDeviceParams = function (deviceParams) {
  this.device = this.determineDevice_(deviceParams) || this.device;
};
DeviceInfo.prototype.getDevice = function () {
  return this.device;
};
DeviceInfo.prototype.setViewer = function (viewer) {
  this.viewer = viewer;
  this.distortion = new Distortion(this.viewer.distortionCoefficients);
};
DeviceInfo.prototype.determineDevice_ = function (deviceParams) {
  if (!deviceParams) {
    if (isIOS()) {
      console.warn('Using fallback iOS device measurements.');
      return DEFAULT_IOS;
    } else {
      console.warn('Using fallback Android device measurements.');
      return DEFAULT_ANDROID;
    }
  }
  var METERS_PER_INCH = 0.0254;
  var metersPerPixelX = METERS_PER_INCH / deviceParams.xdpi;
  var metersPerPixelY = METERS_PER_INCH / deviceParams.ydpi;
  var width = getScreenWidth();
  var height = getScreenHeight();
  return new Device({
    widthMeters: metersPerPixelX * width,
    heightMeters: metersPerPixelY * height,
    bevelMeters: deviceParams.bevelMm * 0.001
  });
};
DeviceInfo.prototype.getDistortedFieldOfViewLeftEye = function () {
  var viewer = this.viewer;
  var device = this.device;
  var distortion = this.distortion;
  var eyeToScreenDistance = viewer.screenLensDistance;
  var outerDist = (device.widthMeters - viewer.interLensDistance) / 2;
  var innerDist = viewer.interLensDistance / 2;
  var bottomDist = viewer.baselineLensDistance - device.bevelMeters;
  var topDist = device.heightMeters - bottomDist;
  var outerAngle = radToDeg * Math.atan(distortion.distort(outerDist / eyeToScreenDistance));
  var innerAngle = radToDeg * Math.atan(distortion.distort(innerDist / eyeToScreenDistance));
  var bottomAngle = radToDeg * Math.atan(distortion.distort(bottomDist / eyeToScreenDistance));
  var topAngle = radToDeg * Math.atan(distortion.distort(topDist / eyeToScreenDistance));
  return {
    leftDegrees: Math.min(outerAngle, viewer.fov),
    rightDegrees: Math.min(innerAngle, viewer.fov),
    downDegrees: Math.min(bottomAngle, viewer.fov),
    upDegrees: Math.min(topAngle, viewer.fov)
  };
};
DeviceInfo.prototype.getLeftEyeVisibleTanAngles = function () {
  var viewer = this.viewer;
  var device = this.device;
  var distortion = this.distortion;
  var fovLeft = Math.tan(-degToRad * viewer.fov);
  var fovTop = Math.tan(degToRad * viewer.fov);
  var fovRight = Math.tan(degToRad * viewer.fov);
  var fovBottom = Math.tan(-degToRad * viewer.fov);
  var halfWidth = device.widthMeters / 4;
  var halfHeight = device.heightMeters / 2;
  var verticalLensOffset = viewer.baselineLensDistance - device.bevelMeters - halfHeight;
  var centerX = viewer.interLensDistance / 2 - halfWidth;
  var centerY = -verticalLensOffset;
  var centerZ = viewer.screenLensDistance;
  var screenLeft = distortion.distort((centerX - halfWidth) / centerZ);
  var screenTop = distortion.distort((centerY + halfHeight) / centerZ);
  var screenRight = distortion.distort((centerX + halfWidth) / centerZ);
  var screenBottom = distortion.distort((centerY - halfHeight) / centerZ);
  var result = new Float32Array(4);
  result[0] = Math.max(fovLeft, screenLeft);
  result[1] = Math.min(fovTop, screenTop);
  result[2] = Math.min(fovRight, screenRight);
  result[3] = Math.max(fovBottom, screenBottom);
  return result;
};
DeviceInfo.prototype.getLeftEyeNoLensTanAngles = function () {
  var viewer = this.viewer;
  var device = this.device;
  var distortion = this.distortion;
  var result = new Float32Array(4);
  var fovLeft = distortion.distortInverse(Math.tan(-degToRad * viewer.fov));
  var fovTop = distortion.distortInverse(Math.tan(degToRad * viewer.fov));
  var fovRight = distortion.distortInverse(Math.tan(degToRad * viewer.fov));
  var fovBottom = distortion.distortInverse(Math.tan(-degToRad * viewer.fov));
  var halfWidth = device.widthMeters / 4;
  var halfHeight = device.heightMeters / 2;
  var verticalLensOffset = viewer.baselineLensDistance - device.bevelMeters - halfHeight;
  var centerX = viewer.interLensDistance / 2 - halfWidth;
  var centerY = -verticalLensOffset;
  var centerZ = viewer.screenLensDistance;
  var screenLeft = (centerX - halfWidth) / centerZ;
  var screenTop = (centerY + halfHeight) / centerZ;
  var screenRight = (centerX + halfWidth) / centerZ;
  var screenBottom = (centerY - halfHeight) / centerZ;
  result[0] = Math.max(fovLeft, screenLeft);
  result[1] = Math.min(fovTop, screenTop);
  result[2] = Math.min(fovRight, screenRight);
  result[3] = Math.max(fovBottom, screenBottom);
  return result;
};
DeviceInfo.prototype.getLeftEyeVisibleScreenRect = function (undistortedFrustum) {
  var viewer = this.viewer;
  var device = this.device;
  var dist = viewer.screenLensDistance;
  var eyeX = (device.widthMeters - viewer.interLensDistance) / 2;
  var eyeY = viewer.baselineLensDistance - device.bevelMeters;
  var left = (undistortedFrustum[0] * dist + eyeX) / device.widthMeters;
  var top = (undistortedFrustum[1] * dist + eyeY) / device.heightMeters;
  var right = (undistortedFrustum[2] * dist + eyeX) / device.widthMeters;
  var bottom = (undistortedFrustum[3] * dist + eyeY) / device.heightMeters;
  return {
    x: left,
    y: bottom,
    width: right - left,
    height: top - bottom
  };
};
DeviceInfo.prototype.getFieldOfViewLeftEye = function (opt_isUndistorted) {
  return opt_isUndistorted ? this.getUndistortedFieldOfViewLeftEye() : this.getDistortedFieldOfViewLeftEye();
};
DeviceInfo.prototype.getFieldOfViewRightEye = function (opt_isUndistorted) {
  var fov = this.getFieldOfViewLeftEye(opt_isUndistorted);
  return {
    leftDegrees: fov.rightDegrees,
    rightDegrees: fov.leftDegrees,
    upDegrees: fov.upDegrees,
    downDegrees: fov.downDegrees
  };
};
DeviceInfo.prototype.getUndistortedFieldOfViewLeftEye = function () {
  var p = this.getUndistortedParams_();
  return {
    leftDegrees: radToDeg * Math.atan(p.outerDist),
    rightDegrees: radToDeg * Math.atan(p.innerDist),
    downDegrees: radToDeg * Math.atan(p.bottomDist),
    upDegrees: radToDeg * Math.atan(p.topDist)
  };
};
DeviceInfo.prototype.getUndistortedViewportLeftEye = function () {
  var p = this.getUndistortedParams_();
  var viewer = this.viewer;
  var device = this.device;
  var eyeToScreenDistance = viewer.screenLensDistance;
  var screenWidth = device.widthMeters / eyeToScreenDistance;
  var screenHeight = device.heightMeters / eyeToScreenDistance;
  var xPxPerTanAngle = device.width / screenWidth;
  var yPxPerTanAngle = device.height / screenHeight;
  var x = Math.round((p.eyePosX - p.outerDist) * xPxPerTanAngle);
  var y = Math.round((p.eyePosY - p.bottomDist) * yPxPerTanAngle);
  return {
    x: x,
    y: y,
    width: Math.round((p.eyePosX + p.innerDist) * xPxPerTanAngle) - x,
    height: Math.round((p.eyePosY + p.topDist) * yPxPerTanAngle) - y
  };
};
DeviceInfo.prototype.getUndistortedParams_ = function () {
  var viewer = this.viewer;
  var device = this.device;
  var distortion = this.distortion;
  var eyeToScreenDistance = viewer.screenLensDistance;
  var halfLensDistance = viewer.interLensDistance / 2 / eyeToScreenDistance;
  var screenWidth = device.widthMeters / eyeToScreenDistance;
  var screenHeight = device.heightMeters / eyeToScreenDistance;
  var eyePosX = screenWidth / 2 - halfLensDistance;
  var eyePosY = (viewer.baselineLensDistance - device.bevelMeters) / eyeToScreenDistance;
  var maxFov = viewer.fov;
  var viewerMax = distortion.distortInverse(Math.tan(degToRad * maxFov));
  var outerDist = Math.min(eyePosX, viewerMax);
  var innerDist = Math.min(halfLensDistance, viewerMax);
  var bottomDist = Math.min(eyePosY, viewerMax);
  var topDist = Math.min(screenHeight - eyePosY, viewerMax);
  return {
    outerDist: outerDist,
    innerDist: innerDist,
    topDist: topDist,
    bottomDist: bottomDist,
    eyePosX: eyePosX,
    eyePosY: eyePosY
  };
};
function CardboardViewer(params) {
  this.id = params.id;
  this.label = params.label;
  this.fov = params.fov;
  this.interLensDistance = params.interLensDistance;
  this.baselineLensDistance = params.baselineLensDistance;
  this.screenLensDistance = params.screenLensDistance;
  this.distortionCoefficients = params.distortionCoefficients;
  this.inverseCoefficients = params.inverseCoefficients;
}
DeviceInfo.Viewers = Viewers;
var format = 1;
var last_updated = "2018-02-20T22:55:10Z";
var devices = [{"type":"android","rules":[{"mdmh":"asus/*/Nexus 7/*"},{"ua":"Nexus 7"}],"dpi":[320.8,323],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"asus/*/ASUS_Z00AD/*"},{"ua":"ASUS_Z00AD"}],"dpi":[403,404.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Google/*/Pixel XL/*"},{"ua":"Pixel XL"}],"dpi":[537.9,533],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Google/*/Pixel/*"},{"ua":"Pixel"}],"dpi":[432.6,436.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"HTC/*/HTC6435LVW/*"},{"ua":"HTC6435LVW"}],"dpi":[449.7,443.3],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One XL/*"},{"ua":"HTC One XL"}],"dpi":[315.3,314.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"htc/*/Nexus 9/*"},{"ua":"Nexus 9"}],"dpi":289,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One M9/*"},{"ua":"HTC One M9"}],"dpi":[442.5,443.3],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One_M8/*"},{"ua":"HTC One_M8"}],"dpi":[449.7,447.4],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One/*"},{"ua":"HTC One"}],"dpi":472.8,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Huawei/*/Nexus 6P/*"},{"ua":"Nexus 6P"}],"dpi":[515.1,518],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LENOVO/*/Lenovo PB2-690Y/*"},{"ua":"Lenovo PB2-690Y"}],"dpi":[457.2,454.713],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"LGE/*/Nexus 5X/*"},{"ua":"Nexus 5X"}],"dpi":[422,419.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LGMS345/*"},{"ua":"LGMS345"}],"dpi":[221.7,219.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"LGE/*/LG-D800/*"},{"ua":"LG-D800"}],"dpi":[422,424.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"LGE/*/LG-D850/*"},{"ua":"LG-D850"}],"dpi":[537.9,541.9],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"LGE/*/VS985 4G/*"},{"ua":"VS985 4G"}],"dpi":[537.9,535.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/Nexus 5/*"},{"ua":"Nexus 5 B"}],"dpi":[442.4,444.8],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/Nexus 4/*"},{"ua":"Nexus 4"}],"dpi":[319.8,318.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LG-P769/*"},{"ua":"LG-P769"}],"dpi":[240.6,247.5],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LGMS323/*"},{"ua":"LGMS323"}],"dpi":[206.6,204.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LGLS996/*"},{"ua":"LGLS996"}],"dpi":[403.4,401.5],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Micromax/*/4560MMX/*"},{"ua":"4560MMX"}],"dpi":[240,219.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Micromax/*/A250/*"},{"ua":"Micromax A250"}],"dpi":[480,446.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Micromax/*/Micromax AQ4501/*"},{"ua":"Micromax AQ4501"}],"dpi":240,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/G5/*"},{"ua":"Moto G (5) Plus"}],"dpi":[403.4,403],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/DROID RAZR/*"},{"ua":"DROID RAZR"}],"dpi":[368.1,256.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT830C/*"},{"ua":"XT830C"}],"dpi":[254,255.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1021/*"},{"ua":"XT1021"}],"dpi":[254,256.7],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1023/*"},{"ua":"XT1023"}],"dpi":[254,256.7],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1028/*"},{"ua":"XT1028"}],"dpi":[326.6,327.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1034/*"},{"ua":"XT1034"}],"dpi":[326.6,328.4],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1053/*"},{"ua":"XT1053"}],"dpi":[315.3,316.1],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1562/*"},{"ua":"XT1562"}],"dpi":[403.4,402.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/Nexus 6/*"},{"ua":"Nexus 6 B"}],"dpi":[494.3,489.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1063/*"},{"ua":"XT1063"}],"dpi":[295,296.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1064/*"},{"ua":"XT1064"}],"dpi":[295,295.6],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1092/*"},{"ua":"XT1092"}],"dpi":[422,424.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1095/*"},{"ua":"XT1095"}],"dpi":[422,423.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/G4/*"},{"ua":"Moto G (4)"}],"dpi":401,"bw":4,"ac":1000},{"type":"android","rules":[{"mdmh":"OnePlus/*/A0001/*"},{"ua":"A0001"}],"dpi":[403.4,401],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"OnePlus/*/ONE E1005/*"},{"ua":"ONE E1005"}],"dpi":[442.4,441.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"OnePlus/*/ONE A2005/*"},{"ua":"ONE A2005"}],"dpi":[391.9,405.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"OnePlus/*/ONEPLUS A5000/*"},{"ua":"ONEPLUS A5000 "}],"dpi":[403.411,399.737],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"OnePlus/*/ONE A5010/*"},{"ua":"ONEPLUS A5010"}],"dpi":[403,400],"bw":2,"ac":1000},{"type":"android","rules":[{"mdmh":"OPPO/*/X909/*"},{"ua":"X909"}],"dpi":[442.4,444.1],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9082/*"},{"ua":"GT-I9082"}],"dpi":[184.7,185.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G360P/*"},{"ua":"SM-G360P"}],"dpi":[196.7,205.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/Nexus S/*"},{"ua":"Nexus S"}],"dpi":[234.5,229.8],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9300/*"},{"ua":"GT-I9300"}],"dpi":[304.8,303.9],"bw":5,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-T230NU/*"},{"ua":"SM-T230NU"}],"dpi":216,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SGH-T399/*"},{"ua":"SGH-T399"}],"dpi":[217.7,231.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SGH-M919/*"},{"ua":"SGH-M919"}],"dpi":[440.8,437.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N9005/*"},{"ua":"SM-N9005"}],"dpi":[386.4,387],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SAMSUNG-SM-N900A/*"},{"ua":"SAMSUNG-SM-N900A"}],"dpi":[386.4,387.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9500/*"},{"ua":"GT-I9500"}],"dpi":[442.5,443.3],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9505/*"},{"ua":"GT-I9505"}],"dpi":439.4,"bw":4,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G900F/*"},{"ua":"SM-G900F"}],"dpi":[415.6,431.6],"bw":5,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G900M/*"},{"ua":"SM-G900M"}],"dpi":[415.6,431.6],"bw":5,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G800F/*"},{"ua":"SM-G800F"}],"dpi":326.8,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G906S/*"},{"ua":"SM-G906S"}],"dpi":[562.7,572.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9300/*"},{"ua":"GT-I9300"}],"dpi":[306.7,304.8],"bw":5,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-T535/*"},{"ua":"SM-T535"}],"dpi":[142.6,136.4],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N920C/*"},{"ua":"SM-N920C"}],"dpi":[515.1,518.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N920P/*"},{"ua":"SM-N920P"}],"dpi":[386.3655,390.144],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N920W8/*"},{"ua":"SM-N920W8"}],"dpi":[515.1,518.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9300I/*"},{"ua":"GT-I9300I"}],"dpi":[304.8,305.8],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9195/*"},{"ua":"GT-I9195"}],"dpi":[249.4,256.7],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SPH-L520/*"},{"ua":"SPH-L520"}],"dpi":[249.4,255.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SAMSUNG-SGH-I717/*"},{"ua":"SAMSUNG-SGH-I717"}],"dpi":285.8,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SPH-D710/*"},{"ua":"SPH-D710"}],"dpi":[217.7,204.2],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-N7100/*"},{"ua":"GT-N7100"}],"dpi":265.1,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SCH-I605/*"},{"ua":"SCH-I605"}],"dpi":265.1,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/Galaxy Nexus/*"},{"ua":"Galaxy Nexus"}],"dpi":[315.3,314.2],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N910H/*"},{"ua":"SM-N910H"}],"dpi":[515.1,518],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N910C/*"},{"ua":"SM-N910C"}],"dpi":[515.2,520.2],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G130M/*"},{"ua":"SM-G130M"}],"dpi":[165.9,164.8],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G928I/*"},{"ua":"SM-G928I"}],"dpi":[515.1,518.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G920F/*"},{"ua":"SM-G920F"}],"dpi":580.6,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G920P/*"},{"ua":"SM-G920P"}],"dpi":[522.5,577],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G925F/*"},{"ua":"SM-G925F"}],"dpi":580.6,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G925V/*"},{"ua":"SM-G925V"}],"dpi":[522.5,576.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G930F/*"},{"ua":"SM-G930F"}],"dpi":576.6,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G935F/*"},{"ua":"SM-G935F"}],"dpi":533,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G950F/*"},{"ua":"SM-G950F"}],"dpi":[562.707,565.293],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G955U/*"},{"ua":"SM-G955U"}],"dpi":[522.514,525.762],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"Sony/*/C6903/*"},{"ua":"C6903"}],"dpi":[442.5,443.3],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"Sony/*/D6653/*"},{"ua":"D6653"}],"dpi":[428.6,427.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Sony/*/E6653/*"},{"ua":"E6653"}],"dpi":[428.6,425.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Sony/*/E6853/*"},{"ua":"E6853"}],"dpi":[403.4,401.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Sony/*/SGP321/*"},{"ua":"SGP321"}],"dpi":[224.7,224.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"TCT/*/ALCATEL ONE TOUCH Fierce/*"},{"ua":"ALCATEL ONE TOUCH Fierce"}],"dpi":[240,247.5],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"THL/*/thl 5000/*"},{"ua":"thl 5000"}],"dpi":[480,443.3],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Fly/*/IQ4412/*"},{"ua":"IQ4412"}],"dpi":307.9,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"ZTE/*/ZTE Blade L2/*"},{"ua":"ZTE Blade L2"}],"dpi":240,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"BENEVE/*/VR518/*"},{"ua":"VR518"}],"dpi":480,"bw":3,"ac":500},{"type":"ios","rules":[{"res":[640,960]}],"dpi":[325.1,328.4],"bw":4,"ac":1000},{"type":"ios","rules":[{"res":[640,1136]}],"dpi":[317.1,320.2],"bw":3,"ac":1000},{"type":"ios","rules":[{"res":[750,1334]}],"dpi":326.4,"bw":4,"ac":1000},{"type":"ios","rules":[{"res":[1242,2208]}],"dpi":[453.6,458.4],"bw":4,"ac":1000},{"type":"ios","rules":[{"res":[1125,2001]}],"dpi":[410.9,415.4],"bw":4,"ac":1000},{"type":"ios","rules":[{"res":[1125,2436]}],"dpi":458,"bw":4,"ac":1000}];
var DPDB_CACHE = {
	format: format,
	last_updated: last_updated,
	devices: devices
};
function Dpdb(url, onDeviceParamsUpdated) {
  this.dpdb = DPDB_CACHE;
  this.recalculateDeviceParams_();
  if (url) {
    this.onDeviceParamsUpdated = onDeviceParamsUpdated;
    var xhr = new XMLHttpRequest();
    var obj = this;
    xhr.open('GET', url, true);
    xhr.addEventListener('load', function () {
      obj.loading = false;
      if (xhr.status >= 200 && xhr.status <= 299) {
        obj.dpdb = JSON.parse(xhr.response);
        obj.recalculateDeviceParams_();
      } else {
        console.error('Error loading online DPDB!');
      }
    });
    xhr.send();
  }
}
Dpdb.prototype.getDeviceParams = function () {
  return this.deviceParams;
};
Dpdb.prototype.recalculateDeviceParams_ = function () {
  var newDeviceParams = this.calcDeviceParams_();
  if (newDeviceParams) {
    this.deviceParams = newDeviceParams;
    if (this.onDeviceParamsUpdated) {
      this.onDeviceParamsUpdated(this.deviceParams);
    }
  } else {
    console.error('Failed to recalculate device parameters.');
  }
};
Dpdb.prototype.calcDeviceParams_ = function () {
  var db = this.dpdb;
  if (!db) {
    console.error('DPDB not available.');
    return null;
  }
  if (db.format != 1) {
    console.error('DPDB has unexpected format version.');
    return null;
  }
  if (!db.devices || !db.devices.length) {
    console.error('DPDB does not have a devices section.');
    return null;
  }
  var userAgent = navigator.userAgent || navigator.vendor || window.opera;
  var width = getScreenWidth();
  var height = getScreenHeight();
  if (!db.devices) {
    console.error('DPDB has no devices section.');
    return null;
  }
  for (var i = 0; i < db.devices.length; i++) {
    var device = db.devices[i];
    if (!device.rules) {
      console.warn('Device[' + i + '] has no rules section.');
      continue;
    }
    if (device.type != 'ios' && device.type != 'android') {
      console.warn('Device[' + i + '] has invalid type.');
      continue;
    }
    if (isIOS() != (device.type == 'ios')) continue;
    var matched = false;
    for (var j = 0; j < device.rules.length; j++) {
      var rule = device.rules[j];
      if (this.matchRule_(rule, userAgent, width, height)) {
        matched = true;
        break;
      }
    }
    if (!matched) continue;
    var xdpi = device.dpi[0] || device.dpi;
    var ydpi = device.dpi[1] || device.dpi;
    return new DeviceParams({ xdpi: xdpi, ydpi: ydpi, bevelMm: device.bw });
  }
  console.warn('No DPDB device match.');
  return null;
};
Dpdb.prototype.matchRule_ = function (rule, ua, screenWidth, screenHeight) {
  if (!rule.ua && !rule.res) return false;
  if (rule.ua && ua.indexOf(rule.ua) < 0) return false;
  if (rule.res) {
    if (!rule.res[0] || !rule.res[1]) return false;
    var resX = rule.res[0];
    var resY = rule.res[1];
    if (Math.min(screenWidth, screenHeight) != Math.min(resX, resY) || Math.max(screenWidth, screenHeight) != Math.max(resX, resY)) {
      return false;
    }
  }
  return true;
};
function DeviceParams(params) {
  this.xdpi = params.xdpi;
  this.ydpi = params.ydpi;
  this.bevelMm = params.bevelMm;
}
function SensorSample(sample, timestampS) {
  this.set(sample, timestampS);
}
SensorSample.prototype.set = function (sample, timestampS) {
  this.sample = sample;
  this.timestampS = timestampS;
};
SensorSample.prototype.copy = function (sensorSample) {
  this.set(sensorSample.sample, sensorSample.timestampS);
};
function ComplementaryFilter(kFilter, isDebug) {
  this.kFilter = kFilter;
  this.isDebug = isDebug;
  this.currentAccelMeasurement = new SensorSample();
  this.currentGyroMeasurement = new SensorSample();
  this.previousGyroMeasurement = new SensorSample();
  if (isIOS()) {
    this.filterQ = new Quaternion(-1, 0, 0, 1);
  } else {
    this.filterQ = new Quaternion(1, 0, 0, 1);
  }
  this.previousFilterQ = new Quaternion();
  this.previousFilterQ.copy(this.filterQ);
  this.accelQ = new Quaternion();
  this.isOrientationInitialized = false;
  this.estimatedGravity = new Vector3();
  this.measuredGravity = new Vector3();
  this.gyroIntegralQ = new Quaternion();
}
ComplementaryFilter.prototype.addAccelMeasurement = function (vector, timestampS) {
  this.currentAccelMeasurement.set(vector, timestampS);
};
ComplementaryFilter.prototype.addGyroMeasurement = function (vector, timestampS) {
  this.currentGyroMeasurement.set(vector, timestampS);
  var deltaT = timestampS - this.previousGyroMeasurement.timestampS;
  if (isTimestampDeltaValid(deltaT)) {
    this.run_();
  }
  this.previousGyroMeasurement.copy(this.currentGyroMeasurement);
};
ComplementaryFilter.prototype.run_ = function () {
  if (!this.isOrientationInitialized) {
    this.accelQ = this.accelToQuaternion_(this.currentAccelMeasurement.sample);
    this.previousFilterQ.copy(this.accelQ);
    this.isOrientationInitialized = true;
    return;
  }
  var deltaT = this.currentGyroMeasurement.timestampS - this.previousGyroMeasurement.timestampS;
  var gyroDeltaQ = this.gyroToQuaternionDelta_(this.currentGyroMeasurement.sample, deltaT);
  this.gyroIntegralQ.multiply(gyroDeltaQ);
  this.filterQ.copy(this.previousFilterQ);
  this.filterQ.multiply(gyroDeltaQ);
  var invFilterQ = new Quaternion();
  invFilterQ.copy(this.filterQ);
  invFilterQ.inverse();
  this.estimatedGravity.set(0, 0, -1);
  this.estimatedGravity.applyQuaternion(invFilterQ);
  this.estimatedGravity.normalize();
  this.measuredGravity.copy(this.currentAccelMeasurement.sample);
  this.measuredGravity.normalize();
  var deltaQ = new Quaternion();
  deltaQ.setFromUnitVectors(this.estimatedGravity, this.measuredGravity);
  deltaQ.inverse();
  if (this.isDebug) {
    console.log('Delta: %d deg, G_est: (%s, %s, %s), G_meas: (%s, %s, %s)', radToDeg * getQuaternionAngle(deltaQ), this.estimatedGravity.x.toFixed(1), this.estimatedGravity.y.toFixed(1), this.estimatedGravity.z.toFixed(1), this.measuredGravity.x.toFixed(1), this.measuredGravity.y.toFixed(1), this.measuredGravity.z.toFixed(1));
  }
  var targetQ = new Quaternion();
  targetQ.copy(this.filterQ);
  targetQ.multiply(deltaQ);
  this.filterQ.slerp(targetQ, 1 - this.kFilter);
  this.previousFilterQ.copy(this.filterQ);
};
ComplementaryFilter.prototype.getOrientation = function () {
  return this.filterQ;
};
ComplementaryFilter.prototype.accelToQuaternion_ = function (accel) {
  var normAccel = new Vector3();
  normAccel.copy(accel);
  normAccel.normalize();
  var quat = new Quaternion();
  quat.setFromUnitVectors(new Vector3(0, 0, -1), normAccel);
  quat.inverse();
  return quat;
};
ComplementaryFilter.prototype.gyroToQuaternionDelta_ = function (gyro, dt) {
  var quat = new Quaternion();
  var axis = new Vector3();
  axis.copy(gyro);
  axis.normalize();
  quat.setFromAxisAngle(axis, gyro.length() * dt);
  return quat;
};
function PosePredictor(predictionTimeS, isDebug) {
  this.predictionTimeS = predictionTimeS;
  this.isDebug = isDebug;
  this.previousQ = new Quaternion();
  this.previousTimestampS = null;
  this.deltaQ = new Quaternion();
  this.outQ = new Quaternion();
}
PosePredictor.prototype.getPrediction = function (currentQ, gyro, timestampS) {
  if (!this.previousTimestampS) {
    this.previousQ.copy(currentQ);
    this.previousTimestampS = timestampS;
    return currentQ;
  }
  var axis = new Vector3();
  axis.copy(gyro);
  axis.normalize();
  var angularSpeed = gyro.length();
  if (angularSpeed < degToRad * 20) {
    if (this.isDebug) {
      console.log('Moving slowly, at %s deg/s: no prediction', (radToDeg * angularSpeed).toFixed(1));
    }
    this.outQ.copy(currentQ);
    this.previousQ.copy(currentQ);
    return this.outQ;
  }
  var predictAngle = angularSpeed * this.predictionTimeS;
  this.deltaQ.setFromAxisAngle(axis, predictAngle);
  this.outQ.copy(this.previousQ);
  this.outQ.multiply(this.deltaQ);
  this.previousQ.copy(currentQ);
  this.previousTimestampS = timestampS;
  return this.outQ;
};
function FusionPoseSensor(kFilter, predictionTime, yawOnly, isDebug) {
  this.yawOnly = yawOnly;
  this.accelerometer = new Vector3();
  this.gyroscope = new Vector3();
  this.filter = new ComplementaryFilter(kFilter, isDebug);
  this.posePredictor = new PosePredictor(predictionTime, isDebug);
  this.isFirefoxAndroid = isFirefoxAndroid();
  this.isIOS = isIOS();
  var chromeVersion = getChromeVersion();
  this.isDeviceMotionInRadians = !this.isIOS && chromeVersion && chromeVersion < 66;
  this.isWithoutDeviceMotion = isChromeWithoutDeviceMotion();
  this.filterToWorldQ = new Quaternion();
  if (isIOS()) {
    this.filterToWorldQ.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
  } else {
    this.filterToWorldQ.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
  }
  this.inverseWorldToScreenQ = new Quaternion();
  this.worldToScreenQ = new Quaternion();
  this.originalPoseAdjustQ = new Quaternion();
  this.originalPoseAdjustQ.setFromAxisAngle(new Vector3(0, 0, 1), -window.orientation * Math.PI / 180);
  this.setScreenTransform_();
  if (isLandscapeMode()) {
    this.filterToWorldQ.multiply(this.inverseWorldToScreenQ);
  }
  this.resetQ = new Quaternion();
  this.orientationOut_ = new Float32Array(4);
  this.start();
}
FusionPoseSensor.prototype.getPosition = function () {
  return null;
};
FusionPoseSensor.prototype.getOrientation = function () {
  var orientation = void 0;
  if (this.isWithoutDeviceMotion && this._deviceOrientationQ) {
    this.deviceOrientationFixQ = this.deviceOrientationFixQ || function () {
      var z = new Quaternion().setFromAxisAngle(new Vector3(0, 0, -1), 0);
      var y = new Quaternion();
      if (window.orientation === -90) {
        y.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / -2);
      } else {
        y.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
      }
      return z.multiply(y);
    }();
    this.deviceOrientationFilterToWorldQ = this.deviceOrientationFilterToWorldQ || function () {
      var q = new Quaternion();
      q.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
      return q;
    }();
    orientation = this._deviceOrientationQ;
    var out = new Quaternion();
    out.copy(orientation);
    out.multiply(this.deviceOrientationFilterToWorldQ);
    out.multiply(this.resetQ);
    out.multiply(this.worldToScreenQ);
    out.multiplyQuaternions(this.deviceOrientationFixQ, out);
    if (this.yawOnly) {
      out.x = 0;
      out.z = 0;
      out.normalize();
    }
    this.orientationOut_[0] = out.x;
    this.orientationOut_[1] = out.y;
    this.orientationOut_[2] = out.z;
    this.orientationOut_[3] = out.w;
    return this.orientationOut_;
  } else {
    var filterOrientation = this.filter.getOrientation();
    orientation = this.posePredictor.getPrediction(filterOrientation, this.gyroscope, this.previousTimestampS);
  }
  var out = new Quaternion();
  out.copy(this.filterToWorldQ);
  out.multiply(this.resetQ);
  out.multiply(orientation);
  out.multiply(this.worldToScreenQ);
  if (this.yawOnly) {
    out.x = 0;
    out.z = 0;
    out.normalize();
  }
  this.orientationOut_[0] = out.x;
  this.orientationOut_[1] = out.y;
  this.orientationOut_[2] = out.z;
  this.orientationOut_[3] = out.w;
  return this.orientationOut_;
};
FusionPoseSensor.prototype.resetPose = function () {
  this.resetQ.copy(this.filter.getOrientation());
  this.resetQ.x = 0;
  this.resetQ.y = 0;
  this.resetQ.z *= -1;
  this.resetQ.normalize();
  if (isLandscapeMode()) {
    this.resetQ.multiply(this.inverseWorldToScreenQ);
  }
  this.resetQ.multiply(this.originalPoseAdjustQ);
};
FusionPoseSensor.prototype.onDeviceOrientation_ = function (e) {
  this._deviceOrientationQ = this._deviceOrientationQ || new Quaternion();
  var alpha = e.alpha,
      beta = e.beta,
      gamma = e.gamma;
  alpha = (alpha || 0) * Math.PI / 180;
  beta = (beta || 0) * Math.PI / 180;
  gamma = (gamma || 0) * Math.PI / 180;
  this._deviceOrientationQ.setFromEulerYXZ(beta, alpha, -gamma);
};
FusionPoseSensor.prototype.onDeviceMotion_ = function (deviceMotion) {
  this.updateDeviceMotion_(deviceMotion);
};
FusionPoseSensor.prototype.updateDeviceMotion_ = function (deviceMotion) {
  var accGravity = deviceMotion.accelerationIncludingGravity;
  var rotRate = deviceMotion.rotationRate;
  var timestampS = deviceMotion.timeStamp / 1000;
  var deltaS = timestampS - this.previousTimestampS;
  if (deltaS < 0) {
    warnOnce('fusion-pose-sensor:invalid:non-monotonic', 'Invalid timestamps detected: non-monotonic timestamp from devicemotion');
    this.previousTimestampS = timestampS;
    return;
  } else if (deltaS <= MIN_TIMESTEP || deltaS > MAX_TIMESTEP) {
    warnOnce('fusion-pose-sensor:invalid:outside-threshold', 'Invalid timestamps detected: Timestamp from devicemotion outside expected range.');
    this.previousTimestampS = timestampS;
    return;
  }
  this.accelerometer.set(-accGravity.x, -accGravity.y, -accGravity.z);
  if (isR7()) {
    this.gyroscope.set(-rotRate.beta, rotRate.alpha, rotRate.gamma);
  } else {
    this.gyroscope.set(rotRate.alpha, rotRate.beta, rotRate.gamma);
  }
  if (!this.isDeviceMotionInRadians) {
    this.gyroscope.multiplyScalar(Math.PI / 180);
  }
  this.filter.addAccelMeasurement(this.accelerometer, timestampS);
  this.filter.addGyroMeasurement(this.gyroscope, timestampS);
  this.previousTimestampS = timestampS;
};
FusionPoseSensor.prototype.onOrientationChange_ = function (screenOrientation) {
  this.setScreenTransform_();
};
FusionPoseSensor.prototype.onMessage_ = function (event) {
  var message = event.data;
  if (!message || !message.type) {
    return;
  }
  var type = message.type.toLowerCase();
  if (type !== 'devicemotion') {
    return;
  }
  this.updateDeviceMotion_(message.deviceMotionEvent);
};
FusionPoseSensor.prototype.setScreenTransform_ = function () {
  this.worldToScreenQ.set(0, 0, 0, 1);
  switch (window.orientation) {
    case 0:
      break;
    case 90:
      this.worldToScreenQ.setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI / 2);
      break;
    case -90:
      this.worldToScreenQ.setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
      break;
    case 180:
      break;
  }
  this.inverseWorldToScreenQ.copy(this.worldToScreenQ);
  this.inverseWorldToScreenQ.inverse();
};
FusionPoseSensor.prototype.start = function () {
  this.onDeviceMotionCallback_ = this.onDeviceMotion_.bind(this);
  this.onOrientationChangeCallback_ = this.onOrientationChange_.bind(this);
  this.onMessageCallback_ = this.onMessage_.bind(this);
  this.onDeviceOrientationCallback_ = this.onDeviceOrientation_.bind(this);
  if (isIOS() && isInsideCrossOriginIFrame()) {
    window.addEventListener('message', this.onMessageCallback_);
  }
  window.addEventListener('orientationchange', this.onOrientationChangeCallback_);
  if (this.isWithoutDeviceMotion) {
    window.addEventListener('deviceorientation', this.onDeviceOrientationCallback_);
  } else {
    window.addEventListener('devicemotion', this.onDeviceMotionCallback_);
  }
};
FusionPoseSensor.prototype.stop = function () {
  window.removeEventListener('devicemotion', this.onDeviceMotionCallback_);
  window.removeEventListener('deviceorientation', this.onDeviceOrientationCallback_);
  window.removeEventListener('orientationchange', this.onOrientationChangeCallback_);
  window.removeEventListener('message', this.onMessageCallback_);
};
var SENSOR_FREQUENCY = 60;
var X_AXIS = new Vector3(1, 0, 0);
var Z_AXIS = new Vector3(0, 0, 1);
var orientation = {};
if (screen.orientation) {
  orientation = screen.orientation;
} else if (screen.msOrientation) {
  orientation = screen.msOrientation;
} else {
  Object.defineProperty(orientation, 'angle', {
    get: function get$$1() {
      return window.orientation || 0;
    }
  });
}
var SENSOR_TO_VR = new Quaternion();
SENSOR_TO_VR.setFromAxisAngle(X_AXIS, -Math.PI / 2);
SENSOR_TO_VR.multiply(new Quaternion().setFromAxisAngle(Z_AXIS, Math.PI / 2));
var PoseSensor = function () {
  function PoseSensor(config) {
    classCallCheck(this, PoseSensor);
    this.config = config;
    this.sensor = null;
    this.fusionSensor = null;
    this._out = new Float32Array(4);
    this.api = null;
    this.errors = [];
    this._sensorQ = new Quaternion();
    this._worldToScreenQ = new Quaternion();
    this._outQ = new Quaternion();
    this._onSensorRead = this._onSensorRead.bind(this);
    this._onSensorError = this._onSensorError.bind(this);
    this._onOrientationChange = this._onOrientationChange.bind(this);
    this._onOrientationChange();
    this.init();
  }
  createClass(PoseSensor, [{
    key: 'init',
    value: function init() {
      var sensor = null;
      try {
        sensor = new RelativeOrientationSensor({ frequency: SENSOR_FREQUENCY });
        sensor.addEventListener('error', this._onSensorError);
      } catch (error) {
        this.errors.push(error);
        if (error.name === 'SecurityError') {
          console.error('Cannot construct sensors due to the Feature Policy');
          console.warn('Attempting to fall back using "devicemotion"; however this will ' + 'fail in the future without correct permissions.');
          this.useDeviceMotion();
        } else if (error.name === 'ReferenceError') {
          this.useDeviceMotion();
        } else {
          console.error(error);
        }
      }
      if (sensor) {
        this.api = 'sensor';
        this.sensor = sensor;
        this.sensor.addEventListener('reading', this._onSensorRead);
        this.sensor.start();
      }
      window.addEventListener('orientationchange', this._onOrientationChange);
    }
  }, {
    key: 'useDeviceMotion',
    value: function useDeviceMotion() {
      this.api = 'devicemotion';
      this.fusionSensor = new FusionPoseSensor(this.config.K_FILTER, this.config.PREDICTION_TIME_S, this.config.YAW_ONLY, this.config.DEBUG);
    }
  }, {
    key: 'getOrientation',
    value: function getOrientation() {
      if (this.fusionSensor) {
        return this.fusionSensor.getOrientation();
      }
      if (!this.sensor || !this.sensor.quaternion) {
        this._out[0] = this._out[1] = this._out[2] = 0;
        this._out[3] = 1;
        return this._out;
      }
      var q = this.sensor.quaternion;
      this._sensorQ.set(q[0], q[1], q[2], q[3]);
      var out = this._outQ;
      out.copy(SENSOR_TO_VR);
      out.multiply(this._sensorQ);
      out.multiply(this._worldToScreenQ);
      if (this.config.YAW_ONLY) {
        out.x = out.z = 0;
        out.normalize();
      }
      this._out[0] = out.x;
      this._out[1] = out.y;
      this._out[2] = out.z;
      this._out[3] = out.w;
      return this._out;
    }
  }, {
    key: '_onSensorError',
    value: function _onSensorError(event) {
      this.errors.push(event.error);
      if (event.error.name === 'NotAllowedError') {
        console.error('Permission to access sensor was denied');
      } else if (event.error.name === 'NotReadableError') {
        console.error('Sensor could not be read');
      } else {
        console.error(event.error);
      }
    }
  }, {
    key: '_onSensorRead',
    value: function _onSensorRead() {}
  }, {
    key: '_onOrientationChange',
    value: function _onOrientationChange() {
      var angle = -orientation.angle * Math.PI / 180;
      this._worldToScreenQ.setFromAxisAngle(Z_AXIS, angle);
    }
  }]);
  return PoseSensor;
}();
var rotateInstructionsAsset = 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+Cjxzdmcgd2lkdGg9IjE5OHB4IiBoZWlnaHQ9IjI0MHB4IiB2aWV3Qm94PSIwIDAgMTk4IDI0MCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWxuczpza2V0Y2g9Imh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaC9ucyI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDMuMy4zICgxMjA4MSkgLSBodHRwOi8vd3d3LmJvaGVtaWFuY29kaW5nLmNvbS9za2V0Y2ggLS0+CiAgICA8dGl0bGU+dHJhbnNpdGlvbjwvdGl0bGU+CiAgICA8ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz4KICAgIDxkZWZzPjwvZGVmcz4KICAgIDxnIGlkPSJQYWdlLTEiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHNrZXRjaDp0eXBlPSJNU1BhZ2UiPgogICAgICAgIDxnIGlkPSJ0cmFuc2l0aW9uIiBza2V0Y2g6dHlwZT0iTVNBcnRib2FyZEdyb3VwIj4KICAgICAgICAgICAgPGcgaWQ9IkltcG9ydGVkLUxheWVycy1Db3B5LTQtKy1JbXBvcnRlZC1MYXllcnMtQ29weS0rLUltcG9ydGVkLUxheWVycy1Db3B5LTItQ29weSIgc2tldGNoOnR5cGU9Ik1TTGF5ZXJHcm91cCI+CiAgICAgICAgICAgICAgICA8ZyBpZD0iSW1wb3J0ZWQtTGF5ZXJzLUNvcHktNCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsIDEwNy4wMDAwMDApIiBza2V0Y2g6dHlwZT0iTVNTaGFwZUdyb3VwIj4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTQ5LjYyNSwyLjUyNyBDMTQ5LjYyNSwyLjUyNyAxNTUuODA1LDYuMDk2IDE1Ni4zNjIsNi40MTggTDE1Ni4zNjIsNy4zMDQgQzE1Ni4zNjIsNy40ODEgMTU2LjM3NSw3LjY2NCAxNTYuNCw3Ljg1MyBDMTU2LjQxLDcuOTM0IDE1Ni40Miw4LjAxNSAxNTYuNDI3LDguMDk1IEMxNTYuNTY3LDkuNTEgMTU3LjQwMSwxMS4wOTMgMTU4LjUzMiwxMi4wOTQgTDE2NC4yNTIsMTcuMTU2IEwxNjQuMzMzLDE3LjA2NiBDMTY0LjMzMywxNy4wNjYgMTY4LjcxNSwxNC41MzYgMTY5LjU2OCwxNC4wNDIgQzE3MS4wMjUsMTQuODgzIDE5NS41MzgsMjkuMDM1IDE5NS41MzgsMjkuMDM1IEwxOTUuNTM4LDgzLjAzNiBDMTk1LjUzOCw4My44MDcgMTk1LjE1Miw4NC4yNTMgMTk0LjU5LDg0LjI1MyBDMTk0LjM1Nyw4NC4yNTMgMTk0LjA5NSw4NC4xNzcgMTkzLjgxOCw4NC4wMTcgTDE2OS44NTEsNzAuMTc5IEwxNjkuODM3LDcwLjIwMyBMMTQyLjUxNSw4NS45NzggTDE0MS42NjUsODQuNjU1IEMxMzYuOTM0LDgzLjEyNiAxMzEuOTE3LDgxLjkxNSAxMjYuNzE0LDgxLjA0NSBDMTI2LjcwOSw4MS4wNiAxMjYuNzA3LDgxLjA2OSAxMjYuNzA3LDgxLjA2OSBMMTIxLjY0LDk4LjAzIEwxMTMuNzQ5LDEwMi41ODYgTDExMy43MTIsMTAyLjUyMyBMMTEzLjcxMiwxMzAuMTEzIEMxMTMuNzEyLDEzMC44ODUgMTEzLjMyNiwxMzEuMzMgMTEyLjc2NCwxMzEuMzMgQzExMi41MzIsMTMxLjMzIDExMi4yNjksMTMxLjI1NCAxMTEuOTkyLDEzMS4wOTQgTDY5LjUxOSwxMDYuNTcyIEM2OC41NjksMTA2LjAyMyA2Ny43OTksMTA0LjY5NSA2Ny43OTksMTAzLjYwNSBMNjcuNzk5LDEwMi41NyBMNjcuNzc4LDEwMi42MTcgQzY3LjI3LDEwMi4zOTMgNjYuNjQ4LDEwMi4yNDkgNjUuOTYyLDEwMi4yMTggQzY1Ljg3NSwxMDIuMjE0IDY1Ljc4OCwxMDIuMjEyIDY1LjcwMSwxMDIuMjEyIEM2NS42MDYsMTAyLjIxMiA2NS41MTEsMTAyLjIxNSA2NS40MTYsMTAyLjIxOSBDNjUuMTk1LDEwMi4yMjkgNjQuOTc0LDEwMi4yMzUgNjQuNzU0LDEwMi4yMzUgQzY0LjMzMSwxMDIuMjM1IDYzLjkxMSwxMDIuMjE2IDYzLjQ5OCwxMDIuMTc4IEM2MS44NDMsMTAyLjAyNSA2MC4yOTgsMTAxLjU3OCA1OS4wOTQsMTAwLjg4MiBMMTIuNTE4LDczLjk5MiBMMTIuNTIzLDc0LjAwNCBMMi4yNDUsNTUuMjU0IEMxLjI0NCw1My40MjcgMi4wMDQsNTEuMDM4IDMuOTQzLDQ5LjkxOCBMNTkuOTU0LDE3LjU3MyBDNjAuNjI2LDE3LjE4NSA2MS4zNSwxNy4wMDEgNjIuMDUzLDE3LjAwMSBDNjMuMzc5LDE3LjAwMSA2NC42MjUsMTcuNjYgNjUuMjgsMTguODU0IEw2NS4yODUsMTguODUxIEw2NS41MTIsMTkuMjY0IEw2NS41MDYsMTkuMjY4IEM2NS45MDksMjAuMDAzIDY2LjQwNSwyMC42OCA2Ni45ODMsMjEuMjg2IEw2Ny4yNiwyMS41NTYgQzY5LjE3NCwyMy40MDYgNzEuNzI4LDI0LjM1NyA3NC4zNzMsMjQuMzU3IEM3Ni4zMjIsMjQuMzU3IDc4LjMyMSwyMy44NCA4MC4xNDgsMjIuNzg1IEM4MC4xNjEsMjIuNzg1IDg3LjQ2NywxOC41NjYgODcuNDY3LDE4LjU2NiBDODguMTM5LDE4LjE3OCA4OC44NjMsMTcuOTk0IDg5LjU2NiwxNy45OTQgQzkwLjg5MiwxNy45OTQgOTIuMTM4LDE4LjY1MiA5Mi43OTIsMTkuODQ3IEw5Ni4wNDIsMjUuNzc1IEw5Ni4wNjQsMjUuNzU3IEwxMDIuODQ5LDI5LjY3NCBMMTAyLjc0NCwyOS40OTIgTDE0OS42MjUsMi41MjcgTTE0OS42MjUsMC44OTIgQzE0OS4zNDMsMC44OTIgMTQ5LjA2MiwwLjk2NSAxNDguODEsMS4xMSBMMTAyLjY0MSwyNy42NjYgTDk3LjIzMSwyNC41NDIgTDk0LjIyNiwxOS4wNjEgQzkzLjMxMywxNy4zOTQgOTEuNTI3LDE2LjM1OSA4OS41NjYsMTYuMzU4IEM4OC41NTUsMTYuMzU4IDg3LjU0NiwxNi42MzIgODYuNjQ5LDE3LjE1IEM4My44NzgsMTguNzUgNzkuNjg3LDIxLjE2OSA3OS4zNzQsMjEuMzQ1IEM3OS4zNTksMjEuMzUzIDc5LjM0NSwyMS4zNjEgNzkuMzMsMjEuMzY5IEM3Ny43OTgsMjIuMjU0IDc2LjA4NCwyMi43MjIgNzQuMzczLDIyLjcyMiBDNzIuMDgxLDIyLjcyMiA2OS45NTksMjEuODkgNjguMzk3LDIwLjM4IEw2OC4xNDUsMjAuMTM1IEM2Ny43MDYsMTkuNjcyIDY3LjMyMywxOS4xNTYgNjcuMDA2LDE4LjYwMSBDNjYuOTg4LDE4LjU1OSA2Ni45NjgsMTguNTE5IDY2Ljk0NiwxOC40NzkgTDY2LjcxOSwxOC4wNjUgQzY2LjY5LDE4LjAxMiA2Ni42NTgsMTcuOTYgNjYuNjI0LDE3LjkxMSBDNjUuNjg2LDE2LjMzNyA2My45NTEsMTUuMzY2IDYyLjA1MywxNS4zNjYgQzYxLjA0MiwxNS4zNjYgNjAuMDMzLDE1LjY0IDU5LjEzNiwxNi4xNTggTDMuMTI1LDQ4LjUwMiBDMC40MjYsNTAuMDYxIC0wLjYxMyw1My40NDIgMC44MTEsNTYuMDQgTDExLjA4OSw3NC43OSBDMTEuMjY2LDc1LjExMyAxMS41MzcsNzUuMzUzIDExLjg1LDc1LjQ5NCBMNTguMjc2LDEwMi4yOTggQzU5LjY3OSwxMDMuMTA4IDYxLjQzMywxMDMuNjMgNjMuMzQ4LDEwMy44MDYgQzYzLjgxMiwxMDMuODQ4IDY0LjI4NSwxMDMuODcgNjQuNzU0LDEwMy44NyBDNjUsMTAzLjg3IDY1LjI0OSwxMDMuODY0IDY1LjQ5NCwxMDMuODUyIEM2NS41NjMsMTAzLjg0OSA2NS42MzIsMTAzLjg0NyA2NS43MDEsMTAzLjg0NyBDNjUuNzY0LDEwMy44NDcgNjUuODI4LDEwMy44NDkgNjUuODksMTAzLjg1MiBDNjUuOTg2LDEwMy44NTYgNjYuMDgsMTAzLjg2MyA2Ni4xNzMsMTAzLjg3NCBDNjYuMjgyLDEwNS40NjcgNjcuMzMyLDEwNy4xOTcgNjguNzAyLDEwNy45ODggTDExMS4xNzQsMTMyLjUxIEMxMTEuNjk4LDEzMi44MTIgMTEyLjIzMiwxMzIuOTY1IDExMi43NjQsMTMyLjk2NSBDMTE0LjI2MSwxMzIuOTY1IDExNS4zNDcsMTMxLjc2NSAxMTUuMzQ3LDEzMC4xMTMgTDExNS4zNDcsMTAzLjU1MSBMMTIyLjQ1OCw5OS40NDYgQzEyMi44MTksOTkuMjM3IDEyMy4wODcsOTguODk4IDEyMy4yMDcsOTguNDk4IEwxMjcuODY1LDgyLjkwNSBDMTMyLjI3OSw4My43MDIgMTM2LjU1Nyw4NC43NTMgMTQwLjYwNyw4Ni4wMzMgTDE0MS4xNCw4Ni44NjIgQzE0MS40NTEsODcuMzQ2IDE0MS45NzcsODcuNjEzIDE0Mi41MTYsODcuNjEzIEMxNDIuNzk0LDg3LjYxMyAxNDMuMDc2LDg3LjU0MiAxNDMuMzMzLDg3LjM5MyBMMTY5Ljg2NSw3Mi4wNzYgTDE5Myw4NS40MzMgQzE5My41MjMsODUuNzM1IDE5NC4wNTgsODUuODg4IDE5NC41OSw4NS44ODggQzE5Ni4wODcsODUuODg4IDE5Ny4xNzMsODQuNjg5IDE5Ny4xNzMsODMuMDM2IEwxOTcuMTczLDI5LjAzNSBDMTk3LjE3MywyOC40NTEgMTk2Ljg2MSwyNy45MTEgMTk2LjM1NSwyNy42MTkgQzE5Ni4zNTUsMjcuNjE5IDE3MS44NDMsMTMuNDY3IDE3MC4zODUsMTIuNjI2IEMxNzAuMTMyLDEyLjQ4IDE2OS44NSwxMi40MDcgMTY5LjU2OCwxMi40MDcgQzE2OS4yODUsMTIuNDA3IDE2OS4wMDIsMTIuNDgxIDE2OC43NDksMTIuNjI3IEMxNjguMTQzLDEyLjk3OCAxNjUuNzU2LDE0LjM1NyAxNjQuNDI0LDE1LjEyNSBMMTU5LjYxNSwxMC44NyBDMTU4Ljc5NiwxMC4xNDUgMTU4LjE1NCw4LjkzNyAxNTguMDU0LDcuOTM0IEMxNTguMDQ1LDcuODM3IDE1OC4wMzQsNy43MzkgMTU4LjAyMSw3LjY0IEMxNTguMDA1LDcuNTIzIDE1Ny45OTgsNy40MSAxNTcuOTk4LDcuMzA0IEwxNTcuOTk4LDYuNDE4IEMxNTcuOTk4LDUuODM0IDE1Ny42ODYsNS4yOTUgMTU3LjE4MSw1LjAwMiBDMTU2LjYyNCw0LjY4IDE1MC40NDIsMS4xMTEgMTUwLjQ0MiwxLjExMSBDMTUwLjE4OSwwLjk2NSAxNDkuOTA3LDAuODkyIDE0OS42MjUsMC44OTIiIGlkPSJGaWxsLTEiIGZpbGw9IiM0NTVBNjQiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNOTYuMDI3LDI1LjYzNiBMMTQyLjYwMyw1Mi41MjcgQzE0My44MDcsNTMuMjIyIDE0NC41ODIsNTQuMTE0IDE0NC44NDUsNTUuMDY4IEwxNDQuODM1LDU1LjA3NSBMNjMuNDYxLDEwMi4wNTcgTDYzLjQ2LDEwMi4wNTcgQzYxLjgwNiwxMDEuOTA1IDYwLjI2MSwxMDEuNDU3IDU5LjA1NywxMDAuNzYyIEwxMi40ODEsNzMuODcxIEw5Ni4wMjcsMjUuNjM2IiBpZD0iRmlsbC0yIiBmaWxsPSIjRkFGQUZBIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTYzLjQ2MSwxMDIuMTc0IEM2My40NTMsMTAyLjE3NCA2My40NDYsMTAyLjE3NCA2My40MzksMTAyLjE3MiBDNjEuNzQ2LDEwMi4wMTYgNjAuMjExLDEwMS41NjMgNTguOTk4LDEwMC44NjMgTDEyLjQyMiw3My45NzMgQzEyLjM4Niw3My45NTIgMTIuMzY0LDczLjkxNCAxMi4zNjQsNzMuODcxIEMxMi4zNjQsNzMuODMgMTIuMzg2LDczLjc5MSAxMi40MjIsNzMuNzcgTDk1Ljk2OCwyNS41MzUgQzk2LjAwNCwyNS41MTQgOTYuMDQ5LDI1LjUxNCA5Ni4wODUsMjUuNTM1IEwxNDIuNjYxLDUyLjQyNiBDMTQzLjg4OCw1My4xMzQgMTQ0LjY4Miw1NC4wMzggMTQ0Ljk1Nyw1NS4wMzcgQzE0NC45Nyw1NS4wODMgMTQ0Ljk1Myw1NS4xMzMgMTQ0LjkxNSw1NS4xNjEgQzE0NC45MTEsNTUuMTY1IDE0NC44OTgsNTUuMTc0IDE0NC44OTQsNTUuMTc3IEw2My41MTksMTAyLjE1OCBDNjMuNTAxLDEwMi4xNjkgNjMuNDgxLDEwMi4xNzQgNjMuNDYxLDEwMi4xNzQgTDYzLjQ2MSwxMDIuMTc0IFogTTEyLjcxNCw3My44NzEgTDU5LjExNSwxMDAuNjYxIEM2MC4yOTMsMTAxLjM0MSA2MS43ODYsMTAxLjc4MiA2My40MzUsMTAxLjkzNyBMMTQ0LjcwNyw1NS4wMTUgQzE0NC40MjgsNTQuMTA4IDE0My42ODIsNTMuMjg1IDE0Mi41NDQsNTIuNjI4IEw5Ni4wMjcsMjUuNzcxIEwxMi43MTQsNzMuODcxIEwxMi43MTQsNzMuODcxIFoiIGlkPSJGaWxsLTMiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTQ4LjMyNyw1OC40NzEgQzE0OC4xNDUsNTguNDggMTQ3Ljk2Miw1OC40OCAxNDcuNzgxLDU4LjQ3MiBDMTQ1Ljg4Nyw1OC4zODkgMTQ0LjQ3OSw1Ny40MzQgMTQ0LjYzNiw1Ni4zNCBDMTQ0LjY4OSw1NS45NjcgMTQ0LjY2NCw1NS41OTcgMTQ0LjU2NCw1NS4yMzUgTDYzLjQ2MSwxMDIuMDU3IEM2NC4wODksMTAyLjExNSA2NC43MzMsMTAyLjEzIDY1LjM3OSwxMDIuMDk5IEM2NS41NjEsMTAyLjA5IDY1Ljc0MywxMDIuMDkgNjUuOTI1LDEwMi4wOTggQzY3LjgxOSwxMDIuMTgxIDY5LjIyNywxMDMuMTM2IDY5LjA3LDEwNC4yMyBMMTQ4LjMyNyw1OC40NzEiIGlkPSJGaWxsLTQiIGZpbGw9IiNGRkZGRkYiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNNjkuMDcsMTA0LjM0NyBDNjkuMDQ4LDEwNC4zNDcgNjkuMDI1LDEwNC4zNCA2OS4wMDUsMTA0LjMyNyBDNjguOTY4LDEwNC4zMDEgNjguOTQ4LDEwNC4yNTcgNjguOTU1LDEwNC4yMTMgQzY5LDEwMy44OTYgNjguODk4LDEwMy41NzYgNjguNjU4LDEwMy4yODggQzY4LjE1MywxMDIuNjc4IDY3LjEwMywxMDIuMjY2IDY1LjkyLDEwMi4yMTQgQzY1Ljc0MiwxMDIuMjA2IDY1LjU2MywxMDIuMjA3IDY1LjM4NSwxMDIuMjE1IEM2NC43NDIsMTAyLjI0NiA2NC4wODcsMTAyLjIzMiA2My40NSwxMDIuMTc0IEM2My4zOTksMTAyLjE2OSA2My4zNTgsMTAyLjEzMiA2My4zNDcsMTAyLjA4MiBDNjMuMzM2LDEwMi4wMzMgNjMuMzU4LDEwMS45ODEgNjMuNDAyLDEwMS45NTYgTDE0NC41MDYsNTUuMTM0IEMxNDQuNTM3LDU1LjExNiAxNDQuNTc1LDU1LjExMyAxNDQuNjA5LDU1LjEyNyBDMTQ0LjY0Miw1NS4xNDEgMTQ0LjY2OCw1NS4xNyAxNDQuNjc3LDU1LjIwNCBDMTQ0Ljc4MSw1NS41ODUgMTQ0LjgwNiw1NS45NzIgMTQ0Ljc1MSw1Ni4zNTcgQzE0NC43MDYsNTYuNjczIDE0NC44MDgsNTYuOTk0IDE0NS4wNDcsNTcuMjgyIEMxNDUuNTUzLDU3Ljg5MiAxNDYuNjAyLDU4LjMwMyAxNDcuNzg2LDU4LjM1NSBDMTQ3Ljk2NCw1OC4zNjMgMTQ4LjE0Myw1OC4zNjMgMTQ4LjMyMSw1OC4zNTQgQzE0OC4zNzcsNTguMzUyIDE0OC40MjQsNTguMzg3IDE0OC40MzksNTguNDM4IEMxNDguNDU0LDU4LjQ5IDE0OC40MzIsNTguNTQ1IDE0OC4zODUsNTguNTcyIEw2OS4xMjksMTA0LjMzMSBDNjkuMTExLDEwNC4zNDIgNjkuMDksMTA0LjM0NyA2OS4wNywxMDQuMzQ3IEw2OS4wNywxMDQuMzQ3IFogTTY1LjY2NSwxMDEuOTc1IEM2NS43NTQsMTAxLjk3NSA2NS44NDIsMTAxLjk3NyA2NS45MywxMDEuOTgxIEM2Ny4xOTYsMTAyLjAzNyA2OC4yODMsMTAyLjQ2OSA2OC44MzgsMTAzLjEzOSBDNjkuMDY1LDEwMy40MTMgNjkuMTg4LDEwMy43MTQgNjkuMTk4LDEwNC4wMjEgTDE0Ny44ODMsNTguNTkyIEMxNDcuODQ3LDU4LjU5MiAxNDcuODExLDU4LjU5MSAxNDcuNzc2LDU4LjU4OSBDMTQ2LjUwOSw1OC41MzMgMTQ1LjQyMiw1OC4xIDE0NC44NjcsNTcuNDMxIEMxNDQuNTg1LDU3LjA5MSAxNDQuNDY1LDU2LjcwNyAxNDQuNTIsNTYuMzI0IEMxNDQuNTYzLDU2LjAyMSAxNDQuNTUyLDU1LjcxNiAxNDQuNDg4LDU1LjQxNCBMNjMuODQ2LDEwMS45NyBDNjQuMzUzLDEwMi4wMDIgNjQuODY3LDEwMi4wMDYgNjUuMzc0LDEwMS45ODIgQzY1LjQ3MSwxMDEuOTc3IDY1LjU2OCwxMDEuOTc1IDY1LjY2NSwxMDEuOTc1IEw2NS42NjUsMTAxLjk3NSBaIiBpZD0iRmlsbC01IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTIuMjA4LDU1LjEzNCBDMS4yMDcsNTMuMzA3IDEuOTY3LDUwLjkxNyAzLjkwNiw0OS43OTcgTDU5LjkxNywxNy40NTMgQzYxLjg1NiwxNi4zMzMgNjQuMjQxLDE2LjkwNyA2NS4yNDMsMTguNzM0IEw2NS40NzUsMTkuMTQ0IEM2NS44NzIsMTkuODgyIDY2LjM2OCwyMC41NiA2Ni45NDUsMjEuMTY1IEw2Ny4yMjMsMjEuNDM1IEM3MC41NDgsMjQuNjQ5IDc1LjgwNiwyNS4xNTEgODAuMTExLDIyLjY2NSBMODcuNDMsMTguNDQ1IEM4OS4zNywxNy4zMjYgOTEuNzU0LDE3Ljg5OSA5Mi43NTUsMTkuNzI3IEw5Ni4wMDUsMjUuNjU1IEwxMi40ODYsNzMuODg0IEwyLjIwOCw1NS4xMzQgWiIgaWQ9IkZpbGwtNiIgZmlsbD0iI0ZBRkFGQSI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMi40ODYsNzQuMDAxIEMxMi40NzYsNzQuMDAxIDEyLjQ2NSw3My45OTkgMTIuNDU1LDczLjk5NiBDMTIuNDI0LDczLjk4OCAxMi4zOTksNzMuOTY3IDEyLjM4NCw3My45NCBMMi4xMDYsNTUuMTkgQzEuMDc1LDUzLjMxIDEuODU3LDUwLjg0NSAzLjg0OCw0OS42OTYgTDU5Ljg1OCwxNy4zNTIgQzYwLjUyNSwxNi45NjcgNjEuMjcxLDE2Ljc2NCA2Mi4wMTYsMTYuNzY0IEM2My40MzEsMTYuNzY0IDY0LjY2NiwxNy40NjYgNjUuMzI3LDE4LjY0NiBDNjUuMzM3LDE4LjY1NCA2NS4zNDUsMTguNjYzIDY1LjM1MSwxOC42NzQgTDY1LjU3OCwxOS4wODggQzY1LjU4NCwxOS4xIDY1LjU4OSwxOS4xMTIgNjUuNTkxLDE5LjEyNiBDNjUuOTg1LDE5LjgzOCA2Ni40NjksMjAuNDk3IDY3LjAzLDIxLjA4NSBMNjcuMzA1LDIxLjM1MSBDNjkuMTUxLDIzLjEzNyA3MS42NDksMjQuMTIgNzQuMzM2LDI0LjEyIEM3Ni4zMTMsMjQuMTIgNzguMjksMjMuNTgyIDgwLjA1MywyMi41NjMgQzgwLjA2NCwyMi41NTcgODAuMDc2LDIyLjU1MyA4MC4wODgsMjIuNTUgTDg3LjM3MiwxOC4zNDQgQzg4LjAzOCwxNy45NTkgODguNzg0LDE3Ljc1NiA4OS41MjksMTcuNzU2IEM5MC45NTYsMTcuNzU2IDkyLjIwMSwxOC40NzIgOTIuODU4LDE5LjY3IEw5Ni4xMDcsMjUuNTk5IEM5Ni4xMzgsMjUuNjU0IDk2LjExOCwyNS43MjQgOTYuMDYzLDI1Ljc1NiBMMTIuNTQ1LDczLjk4NSBDMTIuNTI2LDczLjk5NiAxMi41MDYsNzQuMDAxIDEyLjQ4Niw3NC4wMDEgTDEyLjQ4Niw3NC4wMDEgWiBNNjIuMDE2LDE2Ljk5NyBDNjEuMzEyLDE2Ljk5NyA2MC42MDYsMTcuMTkgNTkuOTc1LDE3LjU1NCBMMy45NjUsNDkuODk5IEMyLjA4Myw1MC45ODUgMS4zNDEsNTMuMzA4IDIuMzEsNTUuMDc4IEwxMi41MzEsNzMuNzIzIEw5NS44NDgsMjUuNjExIEw5Mi42NTMsMTkuNzgyIEM5Mi4wMzgsMTguNjYgOTAuODcsMTcuOTkgODkuNTI5LDE3Ljk5IEM4OC44MjUsMTcuOTkgODguMTE5LDE4LjE4MiA4Ny40ODksMTguNTQ3IEw4MC4xNzIsMjIuNzcyIEM4MC4xNjEsMjIuNzc4IDgwLjE0OSwyMi43ODIgODAuMTM3LDIyLjc4NSBDNzguMzQ2LDIzLjgxMSA3Ni4zNDEsMjQuMzU0IDc0LjMzNiwyNC4zNTQgQzcxLjU4OCwyNC4zNTQgNjkuMDMzLDIzLjM0NyA2Ny4xNDIsMjEuNTE5IEw2Ni44NjQsMjEuMjQ5IEM2Ni4yNzcsMjAuNjM0IDY1Ljc3NCwxOS45NDcgNjUuMzY3LDE5LjIwMyBDNjUuMzYsMTkuMTkyIDY1LjM1NiwxOS4xNzkgNjUuMzU0LDE5LjE2NiBMNjUuMTYzLDE4LjgxOSBDNjUuMTU0LDE4LjgxMSA2NS4xNDYsMTguODAxIDY1LjE0LDE4Ljc5IEM2NC41MjUsMTcuNjY3IDYzLjM1NywxNi45OTcgNjIuMDE2LDE2Ljk5NyBMNjIuMDE2LDE2Ljk5NyBaIiBpZD0iRmlsbC03IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTQyLjQzNCw0OC44MDggTDQyLjQzNCw0OC44MDggQzM5LjkyNCw0OC44MDcgMzcuNzM3LDQ3LjU1IDM2LjU4Miw0NS40NDMgQzM0Ljc3MSw0Mi4xMzkgMzYuMTQ0LDM3LjgwOSAzOS42NDEsMzUuNzg5IEw1MS45MzIsMjguNjkxIEM1My4xMDMsMjguMDE1IDU0LjQxMywyNy42NTggNTUuNzIxLDI3LjY1OCBDNTguMjMxLDI3LjY1OCA2MC40MTgsMjguOTE2IDYxLjU3MywzMS4wMjMgQzYzLjM4NCwzNC4zMjcgNjIuMDEyLDM4LjY1NyA1OC41MTQsNDAuNjc3IEw0Ni4yMjMsNDcuNzc1IEM0NS4wNTMsNDguNDUgNDMuNzQyLDQ4LjgwOCA0Mi40MzQsNDguODA4IEw0Mi40MzQsNDguODA4IFogTTU1LjcyMSwyOC4xMjUgQzU0LjQ5NSwyOC4xMjUgNTMuMjY1LDI4LjQ2MSA1Mi4xNjYsMjkuMDk2IEwzOS44NzUsMzYuMTk0IEMzNi41OTYsMzguMDg3IDM1LjMwMiw0Mi4xMzYgMzYuOTkyLDQ1LjIxOCBDMzguMDYzLDQ3LjE3MyA0MC4wOTgsNDguMzQgNDIuNDM0LDQ4LjM0IEM0My42NjEsNDguMzQgNDQuODksNDguMDA1IDQ1Ljk5LDQ3LjM3IEw1OC4yODEsNDAuMjcyIEM2MS41NiwzOC4zNzkgNjIuODUzLDM0LjMzIDYxLjE2NCwzMS4yNDggQzYwLjA5MiwyOS4yOTMgNTguMDU4LDI4LjEyNSA1NS43MjEsMjguMTI1IEw1NS43MjEsMjguMTI1IFoiIGlkPSJGaWxsLTgiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTQ5LjU4OCwyLjQwNyBDMTQ5LjU4OCwyLjQwNyAxNTUuNzY4LDUuOTc1IDE1Ni4zMjUsNi4yOTcgTDE1Ni4zMjUsNy4xODQgQzE1Ni4zMjUsNy4zNiAxNTYuMzM4LDcuNTQ0IDE1Ni4zNjIsNy43MzMgQzE1Ni4zNzMsNy44MTQgMTU2LjM4Miw3Ljg5NCAxNTYuMzksNy45NzUgQzE1Ni41Myw5LjM5IDE1Ny4zNjMsMTAuOTczIDE1OC40OTUsMTEuOTc0IEwxNjUuODkxLDE4LjUxOSBDMTY2LjA2OCwxOC42NzUgMTY2LjI0OSwxOC44MTQgMTY2LjQzMiwxOC45MzQgQzE2OC4wMTEsMTkuOTc0IDE2OS4zODIsMTkuNCAxNjkuNDk0LDE3LjY1MiBDMTY5LjU0MywxNi44NjggMTY5LjU1MSwxNi4wNTcgMTY5LjUxNywxNS4yMjMgTDE2OS41MTQsMTUuMDYzIEwxNjkuNTE0LDEzLjkxMiBDMTcwLjc4LDE0LjY0MiAxOTUuNTAxLDI4LjkxNSAxOTUuNTAxLDI4LjkxNSBMMTk1LjUwMSw4Mi45MTUgQzE5NS41MDEsODQuMDA1IDE5NC43MzEsODQuNDQ1IDE5My43ODEsODMuODk3IEwxNTEuMzA4LDU5LjM3NCBDMTUwLjM1OCw1OC44MjYgMTQ5LjU4OCw1Ny40OTcgMTQ5LjU4OCw1Ni40MDggTDE0OS41ODgsMjIuMzc1IiBpZD0iRmlsbC05IiBmaWxsPSIjRkFGQUZBIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE5NC41NTMsODQuMjUgQzE5NC4yOTYsODQuMjUgMTk0LjAxMyw4NC4xNjUgMTkzLjcyMiw4My45OTcgTDE1MS4yNSw1OS40NzYgQzE1MC4yNjksNTguOTA5IDE0OS40NzEsNTcuNTMzIDE0OS40NzEsNTYuNDA4IEwxNDkuNDcxLDIyLjM3NSBMMTQ5LjcwNSwyMi4zNzUgTDE0OS43MDUsNTYuNDA4IEMxNDkuNzA1LDU3LjQ1OSAxNTAuNDUsNTguNzQ0IDE1MS4zNjYsNTkuMjc0IEwxOTMuODM5LDgzLjc5NSBDMTk0LjI2Myw4NC4wNCAxOTQuNjU1LDg0LjA4MyAxOTQuOTQyLDgzLjkxNyBDMTk1LjIyNyw4My43NTMgMTk1LjM4NCw4My4zOTcgMTk1LjM4NCw4Mi45MTUgTDE5NS4zODQsMjguOTgyIEMxOTQuMTAyLDI4LjI0MiAxNzIuMTA0LDE1LjU0MiAxNjkuNjMxLDE0LjExNCBMMTY5LjYzNCwxNS4yMiBDMTY5LjY2OCwxNi4wNTIgMTY5LjY2LDE2Ljg3NCAxNjkuNjEsMTcuNjU5IEMxNjkuNTU2LDE4LjUwMyAxNjkuMjE0LDE5LjEyMyAxNjguNjQ3LDE5LjQwNSBDMTY4LjAyOCwxOS43MTQgMTY3LjE5NywxOS41NzggMTY2LjM2NywxOS4wMzIgQzE2Ni4xODEsMTguOTA5IDE2NS45OTUsMTguNzY2IDE2NS44MTQsMTguNjA2IEwxNTguNDE3LDEyLjA2MiBDMTU3LjI1OSwxMS4wMzYgMTU2LjQxOCw5LjQzNyAxNTYuMjc0LDcuOTg2IEMxNTYuMjY2LDcuOTA3IDE1Ni4yNTcsNy44MjcgMTU2LjI0Nyw3Ljc0OCBDMTU2LjIyMSw3LjU1NSAxNTYuMjA5LDcuMzY1IDE1Ni4yMDksNy4xODQgTDE1Ni4yMDksNi4zNjQgQzE1NS4zNzUsNS44ODMgMTQ5LjUyOSwyLjUwOCAxNDkuNTI5LDIuNTA4IEwxNDkuNjQ2LDIuMzA2IEMxNDkuNjQ2LDIuMzA2IDE1NS44MjcsNS44NzQgMTU2LjM4NCw2LjE5NiBMMTU2LjQ0Miw2LjIzIEwxNTYuNDQyLDcuMTg0IEMxNTYuNDQyLDcuMzU1IDE1Ni40NTQsNy41MzUgMTU2LjQ3OCw3LjcxNyBDMTU2LjQ4OSw3LjggMTU2LjQ5OSw3Ljg4MiAxNTYuNTA3LDcuOTYzIEMxNTYuNjQ1LDkuMzU4IDE1Ny40NTUsMTAuODk4IDE1OC41NzIsMTEuODg2IEwxNjUuOTY5LDE4LjQzMSBDMTY2LjE0MiwxOC41ODQgMTY2LjMxOSwxOC43MiAxNjYuNDk2LDE4LjgzNyBDMTY3LjI1NCwxOS4zMzYgMTY4LDE5LjQ2NyAxNjguNTQzLDE5LjE5NiBDMTY5LjAzMywxOC45NTMgMTY5LjMyOSwxOC40MDEgMTY5LjM3NywxNy42NDUgQzE2OS40MjcsMTYuODY3IDE2OS40MzQsMTYuMDU0IDE2OS40MDEsMTUuMjI4IEwxNjkuMzk3LDE1LjA2NSBMMTY5LjM5NywxMy43MSBMMTY5LjU3MiwxMy44MSBDMTcwLjgzOSwxNC41NDEgMTk1LjU1OSwyOC44MTQgMTk1LjU1OSwyOC44MTQgTDE5NS42MTgsMjguODQ3IEwxOTUuNjE4LDgyLjkxNSBDMTk1LjYxOCw4My40ODQgMTk1LjQyLDgzLjkxMSAxOTUuMDU5LDg0LjExOSBDMTk0LjkwOCw4NC4yMDYgMTk0LjczNyw4NC4yNSAxOTQuNTUzLDg0LjI1IiBpZD0iRmlsbC0xMCIgZmlsbD0iIzYwN0Q4QiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xNDUuNjg1LDU2LjE2MSBMMTY5LjgsNzAuMDgzIEwxNDMuODIyLDg1LjA4MSBMMTQyLjM2LDg0Ljc3NCBDMTM1LjgyNiw4Mi42MDQgMTI4LjczMiw4MS4wNDYgMTIxLjM0MSw4MC4xNTggQzExNi45NzYsNzkuNjM0IDExMi42NzgsODEuMjU0IDExMS43NDMsODMuNzc4IEMxMTEuNTA2LDg0LjQxNCAxMTEuNTAzLDg1LjA3MSAxMTEuNzMyLDg1LjcwNiBDMTEzLjI3LDg5Ljk3MyAxMTUuOTY4LDk0LjA2OSAxMTkuNzI3LDk3Ljg0MSBMMTIwLjI1OSw5OC42ODYgQzEyMC4yNiw5OC42ODUgOTQuMjgyLDExMy42ODMgOTQuMjgyLDExMy42ODMgTDcwLjE2Nyw5OS43NjEgTDE0NS42ODUsNTYuMTYxIiBpZD0iRmlsbC0xMSIgZmlsbD0iI0ZGRkZGRiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik05NC4yODIsMTEzLjgxOCBMOTQuMjIzLDExMy43ODUgTDY5LjkzMyw5OS43NjEgTDcwLjEwOCw5OS42NiBMMTQ1LjY4NSw1Ni4wMjYgTDE0NS43NDMsNTYuMDU5IEwxNzAuMDMzLDcwLjA4MyBMMTQzLjg0Miw4NS4yMDUgTDE0My43OTcsODUuMTk1IEMxNDMuNzcyLDg1LjE5IDE0Mi4zMzYsODQuODg4IDE0Mi4zMzYsODQuODg4IEMxMzUuNzg3LDgyLjcxNCAxMjguNzIzLDgxLjE2MyAxMjEuMzI3LDgwLjI3NCBDMTIwLjc4OCw4MC4yMDkgMTIwLjIzNiw4MC4xNzcgMTE5LjY4OSw4MC4xNzcgQzExNS45MzEsODAuMTc3IDExMi42MzUsODEuNzA4IDExMS44NTIsODMuODE5IEMxMTEuNjI0LDg0LjQzMiAxMTEuNjIxLDg1LjA1MyAxMTEuODQyLDg1LjY2NyBDMTEzLjM3Nyw4OS45MjUgMTE2LjA1OCw5My45OTMgMTE5LjgxLDk3Ljc1OCBMMTE5LjgyNiw5Ny43NzkgTDEyMC4zNTIsOTguNjE0IEMxMjAuMzU0LDk4LjYxNyAxMjAuMzU2LDk4LjYyIDEyMC4zNTgsOTguNjI0IEwxMjAuNDIyLDk4LjcyNiBMMTIwLjMxNyw5OC43ODcgQzEyMC4yNjQsOTguODE4IDk0LjU5OSwxMTMuNjM1IDk0LjM0LDExMy43ODUgTDk0LjI4MiwxMTMuODE4IEw5NC4yODIsMTEzLjgxOCBaIE03MC40MDEsOTkuNzYxIEw5NC4yODIsMTEzLjU0OSBMMTE5LjA4NCw5OS4yMjkgQzExOS42Myw5OC45MTQgMTE5LjkzLDk4Ljc0IDEyMC4xMDEsOTguNjU0IEwxMTkuNjM1LDk3LjkxNCBDMTE1Ljg2NCw5NC4xMjcgMTEzLjE2OCw5MC4wMzMgMTExLjYyMiw4NS43NDYgQzExMS4zODIsODUuMDc5IDExMS4zODYsODQuNDA0IDExMS42MzMsODMuNzM4IEMxMTIuNDQ4LDgxLjUzOSAxMTUuODM2LDc5Ljk0MyAxMTkuNjg5LDc5Ljk0MyBDMTIwLjI0Niw3OS45NDMgMTIwLjgwNiw3OS45NzYgMTIxLjM1NSw4MC4wNDIgQzEyOC43NjcsODAuOTMzIDEzNS44NDYsODIuNDg3IDE0Mi4zOTYsODQuNjYzIEMxNDMuMjMyLDg0LjgzOCAxNDMuNjExLDg0LjkxNyAxNDMuNzg2LDg0Ljk2NyBMMTY5LjU2Niw3MC4wODMgTDE0NS42ODUsNTYuMjk1IEw3MC40MDEsOTkuNzYxIEw3MC40MDEsOTkuNzYxIFoiIGlkPSJGaWxsLTEyIiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE2Ny4yMywxOC45NzkgTDE2Ny4yMyw2OS44NSBMMTM5LjkwOSw4NS42MjMgTDEzMy40NDgsNzEuNDU2IEMxMzIuNTM4LDY5LjQ2IDEzMC4wMiw2OS43MTggMTI3LjgyNCw3Mi4wMyBDMTI2Ljc2OSw3My4xNCAxMjUuOTMxLDc0LjU4NSAxMjUuNDk0LDc2LjA0OCBMMTE5LjAzNCw5Ny42NzYgTDkxLjcxMiwxMTMuNDUgTDkxLjcxMiw2Mi41NzkgTDE2Ny4yMywxOC45NzkiIGlkPSJGaWxsLTEzIiBmaWxsPSIjRkZGRkZGIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTkxLjcxMiwxMTMuNTY3IEM5MS42OTIsMTEzLjU2NyA5MS42NzIsMTEzLjU2MSA5MS42NTMsMTEzLjU1MSBDOTEuNjE4LDExMy41MyA5MS41OTUsMTEzLjQ5MiA5MS41OTUsMTEzLjQ1IEw5MS41OTUsNjIuNTc5IEM5MS41OTUsNjIuNTM3IDkxLjYxOCw2Mi40OTkgOTEuNjUzLDYyLjQ3OCBMMTY3LjE3MiwxOC44NzggQzE2Ny4yMDgsMTguODU3IDE2Ny4yNTIsMTguODU3IDE2Ny4yODgsMTguODc4IEMxNjcuMzI0LDE4Ljg5OSAxNjcuMzQ3LDE4LjkzNyAxNjcuMzQ3LDE4Ljk3OSBMMTY3LjM0Nyw2OS44NSBDMTY3LjM0Nyw2OS44OTEgMTY3LjMyNCw2OS45MyAxNjcuMjg4LDY5Ljk1IEwxMzkuOTY3LDg1LjcyNSBDMTM5LjkzOSw4NS43NDEgMTM5LjkwNSw4NS43NDUgMTM5Ljg3Myw4NS43MzUgQzEzOS44NDIsODUuNzI1IDEzOS44MTYsODUuNzAyIDEzOS44MDIsODUuNjcyIEwxMzMuMzQyLDcxLjUwNCBDMTMyLjk2Nyw3MC42ODIgMTMyLjI4LDcwLjIyOSAxMzEuNDA4LDcwLjIyOSBDMTMwLjMxOSw3MC4yMjkgMTI5LjA0NCw3MC45MTUgMTI3LjkwOCw3Mi4xMSBDMTI2Ljg3NCw3My4yIDEyNi4wMzQsNzQuNjQ3IDEyNS42MDYsNzYuMDgyIEwxMTkuMTQ2LDk3LjcwOSBDMTE5LjEzNyw5Ny43MzggMTE5LjExOCw5Ny43NjIgMTE5LjA5Miw5Ny43NzcgTDkxLjc3LDExMy41NTEgQzkxLjc1MiwxMTMuNTYxIDkxLjczMiwxMTMuNTY3IDkxLjcxMiwxMTMuNTY3IEw5MS43MTIsMTEzLjU2NyBaIE05MS44MjksNjIuNjQ3IEw5MS44MjksMTEzLjI0OCBMMTE4LjkzNSw5Ny41OTggTDEyNS4zODIsNzYuMDE1IEMxMjUuODI3LDc0LjUyNSAxMjYuNjY0LDczLjA4MSAxMjcuNzM5LDcxLjk1IEMxMjguOTE5LDcwLjcwOCAxMzAuMjU2LDY5Ljk5NiAxMzEuNDA4LDY5Ljk5NiBDMTMyLjM3Nyw2OS45OTYgMTMzLjEzOSw3MC40OTcgMTMzLjU1NCw3MS40MDcgTDEzOS45NjEsODUuNDU4IEwxNjcuMTEzLDY5Ljc4MiBMMTY3LjExMywxOS4xODEgTDkxLjgyOSw2Mi42NDcgTDkxLjgyOSw2Mi42NDcgWiIgaWQ9IkZpbGwtMTQiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTY4LjU0MywxOS4yMTMgTDE2OC41NDMsNzAuMDgzIEwxNDEuMjIxLDg1Ljg1NyBMMTM0Ljc2MSw3MS42ODkgQzEzMy44NTEsNjkuNjk0IDEzMS4zMzMsNjkuOTUxIDEyOS4xMzcsNzIuMjYzIEMxMjguMDgyLDczLjM3NCAxMjcuMjQ0LDc0LjgxOSAxMjYuODA3LDc2LjI4MiBMMTIwLjM0Niw5Ny45MDkgTDkzLjAyNSwxMTMuNjgzIEw5My4wMjUsNjIuODEzIEwxNjguNTQzLDE5LjIxMyIgaWQ9IkZpbGwtMTUiIGZpbGw9IiNGRkZGRkYiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNOTMuMDI1LDExMy44IEM5My4wMDUsMTEzLjggOTIuOTg0LDExMy43OTUgOTIuOTY2LDExMy43ODUgQzkyLjkzMSwxMTMuNzY0IDkyLjkwOCwxMTMuNzI1IDkyLjkwOCwxMTMuNjg0IEw5Mi45MDgsNjIuODEzIEM5Mi45MDgsNjIuNzcxIDkyLjkzMSw2Mi43MzMgOTIuOTY2LDYyLjcxMiBMMTY4LjQ4NCwxOS4xMTIgQzE2OC41MiwxOS4wOSAxNjguNTY1LDE5LjA5IDE2OC42MDEsMTkuMTEyIEMxNjguNjM3LDE5LjEzMiAxNjguNjYsMTkuMTcxIDE2OC42NiwxOS4yMTIgTDE2OC42Niw3MC4wODMgQzE2OC42Niw3MC4xMjUgMTY4LjYzNyw3MC4xNjQgMTY4LjYwMSw3MC4xODQgTDE0MS4yOCw4NS45NTggQzE0MS4yNTEsODUuOTc1IDE0MS4yMTcsODUuOTc5IDE0MS4xODYsODUuOTY4IEMxNDEuMTU0LDg1Ljk1OCAxNDEuMTI5LDg1LjkzNiAxNDEuMTE1LDg1LjkwNiBMMTM0LjY1NSw3MS43MzggQzEzNC4yOCw3MC45MTUgMTMzLjU5Myw3MC40NjMgMTMyLjcyLDcwLjQ2MyBDMTMxLjYzMiw3MC40NjMgMTMwLjM1Nyw3MS4xNDggMTI5LjIyMSw3Mi4zNDQgQzEyOC4xODYsNzMuNDMzIDEyNy4zNDcsNzQuODgxIDEyNi45MTksNzYuMzE1IEwxMjAuNDU4LDk3Ljk0MyBDMTIwLjQ1LDk3Ljk3MiAxMjAuNDMxLDk3Ljk5NiAxMjAuNDA1LDk4LjAxIEw5My4wODMsMTEzLjc4NSBDOTMuMDY1LDExMy43OTUgOTMuMDQ1LDExMy44IDkzLjAyNSwxMTMuOCBMOTMuMDI1LDExMy44IFogTTkzLjE0Miw2Mi44ODEgTDkzLjE0MiwxMTMuNDgxIEwxMjAuMjQ4LDk3LjgzMiBMMTI2LjY5NSw3Ni4yNDggQzEyNy4xNCw3NC43NTggMTI3Ljk3Nyw3My4zMTUgMTI5LjA1Miw3Mi4xODMgQzEzMC4yMzEsNzAuOTQyIDEzMS41NjgsNzAuMjI5IDEzMi43Miw3MC4yMjkgQzEzMy42ODksNzAuMjI5IDEzNC40NTIsNzAuNzMxIDEzNC44NjcsNzEuNjQxIEwxNDEuMjc0LDg1LjY5MiBMMTY4LjQyNiw3MC4wMTYgTDE2OC40MjYsMTkuNDE1IEw5My4xNDIsNjIuODgxIEw5My4xNDIsNjIuODgxIFoiIGlkPSJGaWxsLTE2IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE2OS44LDcwLjA4MyBMMTQyLjQ3OCw4NS44NTcgTDEzNi4wMTgsNzEuNjg5IEMxMzUuMTA4LDY5LjY5NCAxMzIuNTksNjkuOTUxIDEzMC4zOTMsNzIuMjYzIEMxMjkuMzM5LDczLjM3NCAxMjguNSw3NC44MTkgMTI4LjA2NCw3Ni4yODIgTDEyMS42MDMsOTcuOTA5IEw5NC4yODIsMTEzLjY4MyBMOTQuMjgyLDYyLjgxMyBMMTY5LjgsMTkuMjEzIEwxNjkuOCw3MC4wODMgWiIgaWQ9IkZpbGwtMTciIGZpbGw9IiNGQUZBRkEiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNOTQuMjgyLDExMy45MTcgQzk0LjI0MSwxMTMuOTE3IDk0LjIwMSwxMTMuOTA3IDk0LjE2NSwxMTMuODg2IEM5NC4wOTMsMTEzLjg0NSA5NC4wNDgsMTEzLjc2NyA5NC4wNDgsMTEzLjY4NCBMOTQuMDQ4LDYyLjgxMyBDOTQuMDQ4LDYyLjczIDk0LjA5Myw2Mi42NTIgOTQuMTY1LDYyLjYxMSBMMTY5LjY4MywxOS4wMSBDMTY5Ljc1NSwxOC45NjkgMTY5Ljg0NCwxOC45NjkgMTY5LjkxNywxOS4wMSBDMTY5Ljk4OSwxOS4wNTIgMTcwLjAzMywxOS4xMjkgMTcwLjAzMywxOS4yMTIgTDE3MC4wMzMsNzAuMDgzIEMxNzAuMDMzLDcwLjE2NiAxNjkuOTg5LDcwLjI0NCAxNjkuOTE3LDcwLjI4NSBMMTQyLjU5NSw4Ni4wNiBDMTQyLjUzOCw4Ni4wOTIgMTQyLjQ2OSw4Ni4xIDE0Mi40MDcsODYuMDggQzE0Mi4zNDQsODYuMDYgMTQyLjI5Myw4Ni4wMTQgMTQyLjI2Niw4NS45NTQgTDEzNS44MDUsNzEuNzg2IEMxMzUuNDQ1LDcwLjk5NyAxMzQuODEzLDcwLjU4IDEzMy45NzcsNzAuNTggQzEzMi45MjEsNzAuNTggMTMxLjY3Niw3MS4yNTIgMTMwLjU2Miw3Mi40MjQgQzEyOS41NCw3My41MDEgMTI4LjcxMSw3NC45MzEgMTI4LjI4Nyw3Ni4zNDggTDEyMS44MjcsOTcuOTc2IEMxMjEuODEsOTguMDM0IDEyMS43NzEsOTguMDgyIDEyMS43Miw5OC4xMTIgTDk0LjM5OCwxMTMuODg2IEM5NC4zNjIsMTEzLjkwNyA5NC4zMjIsMTEzLjkxNyA5NC4yODIsMTEzLjkxNyBMOTQuMjgyLDExMy45MTcgWiBNOTQuNTE1LDYyLjk0OCBMOTQuNTE1LDExMy4yNzkgTDEyMS40MDYsOTcuNzU0IEwxMjcuODQsNzYuMjE1IEMxMjguMjksNzQuNzA4IDEyOS4xMzcsNzMuMjQ3IDEzMC4yMjQsNzIuMTAzIEMxMzEuNDI1LDcwLjgzOCAxMzIuNzkzLDcwLjExMiAxMzMuOTc3LDcwLjExMiBDMTM0Ljk5NSw3MC4xMTIgMTM1Ljc5NSw3MC42MzggMTM2LjIzLDcxLjU5MiBMMTQyLjU4NCw4NS41MjYgTDE2OS41NjYsNjkuOTQ4IEwxNjkuNTY2LDE5LjYxNyBMOTQuNTE1LDYyLjk0OCBMOTQuNTE1LDYyLjk0OCBaIiBpZD0iRmlsbC0xOCIgZmlsbD0iIzYwN0Q4QiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMDkuODk0LDkyLjk0MyBMMTA5Ljg5NCw5Mi45NDMgQzEwOC4xMiw5Mi45NDMgMTA2LjY1Myw5Mi4yMTggMTA1LjY1LDkwLjgyMyBDMTA1LjU4Myw5MC43MzEgMTA1LjU5Myw5MC42MSAxMDUuNjczLDkwLjUyOSBDMTA1Ljc1Myw5MC40NDggMTA1Ljg4LDkwLjQ0IDEwNS45NzQsOTAuNTA2IEMxMDYuNzU0LDkxLjA1MyAxMDcuNjc5LDkxLjMzMyAxMDguNzI0LDkxLjMzMyBDMTEwLjA0Nyw5MS4zMzMgMTExLjQ3OCw5MC44OTQgMTEyLjk4LDkwLjAyNyBDMTE4LjI5MSw4Ni45NiAxMjIuNjExLDc5LjUwOSAxMjIuNjExLDczLjQxNiBDMTIyLjYxMSw3MS40ODkgMTIyLjE2OSw2OS44NTYgMTIxLjMzMyw2OC42OTIgQzEyMS4yNjYsNjguNiAxMjEuMjc2LDY4LjQ3MyAxMjEuMzU2LDY4LjM5MiBDMTIxLjQzNiw2OC4zMTEgMTIxLjU2Myw2OC4yOTkgMTIxLjY1Niw2OC4zNjUgQzEyMy4zMjcsNjkuNTM3IDEyNC4yNDcsNzEuNzQ2IDEyNC4yNDcsNzQuNTg0IEMxMjQuMjQ3LDgwLjgyNiAxMTkuODIxLDg4LjQ0NyAxMTQuMzgyLDkxLjU4NyBDMTEyLjgwOCw5Mi40OTUgMTExLjI5OCw5Mi45NDMgMTA5Ljg5NCw5Mi45NDMgTDEwOS44OTQsOTIuOTQzIFogTTEwNi45MjUsOTEuNDAxIEMxMDcuNzM4LDkyLjA1MiAxMDguNzQ1LDkyLjI3OCAxMDkuODkzLDkyLjI3OCBMMTA5Ljg5NCw5Mi4yNzggQzExMS4yMTUsOTIuMjc4IDExMi42NDcsOTEuOTUxIDExNC4xNDgsOTEuMDg0IEMxMTkuNDU5LDg4LjAxNyAxMjMuNzgsODAuNjIxIDEyMy43OCw3NC41MjggQzEyMy43OCw3Mi41NDkgMTIzLjMxNyw3MC45MjkgMTIyLjQ1NCw2OS43NjcgQzEyMi44NjUsNzAuODAyIDEyMy4wNzksNzIuMDQyIDEyMy4wNzksNzMuNDAyIEMxMjMuMDc5LDc5LjY0NSAxMTguNjUzLDg3LjI4NSAxMTMuMjE0LDkwLjQyNSBDMTExLjY0LDkxLjMzNCAxMTAuMTMsOTEuNzQyIDEwOC43MjQsOTEuNzQyIEMxMDguMDgzLDkxLjc0MiAxMDcuNDgxLDkxLjU5MyAxMDYuOTI1LDkxLjQwMSBMMTA2LjkyNSw5MS40MDEgWiIgaWQ9IkZpbGwtMTkiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTEzLjA5Nyw5MC4yMyBDMTE4LjQ4MSw4Ny4xMjIgMTIyLjg0NSw3OS41OTQgMTIyLjg0NSw3My40MTYgQzEyMi44NDUsNzEuMzY1IDEyMi4zNjIsNjkuNzI0IDEyMS41MjIsNjguNTU2IEMxMTkuNzM4LDY3LjMwNCAxMTcuMTQ4LDY3LjM2MiAxMTQuMjY1LDY5LjAyNiBDMTA4Ljg4MSw3Mi4xMzQgMTA0LjUxNyw3OS42NjIgMTA0LjUxNyw4NS44NCBDMTA0LjUxNyw4Ny44OTEgMTA1LDg5LjUzMiAxMDUuODQsOTAuNyBDMTA3LjYyNCw5MS45NTIgMTEwLjIxNCw5MS44OTQgMTEzLjA5Nyw5MC4yMyIgaWQ9IkZpbGwtMjAiIGZpbGw9IiNGQUZBRkEiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTA4LjcyNCw5MS42MTQgTDEwOC43MjQsOTEuNjE0IEMxMDcuNTgyLDkxLjYxNCAxMDYuNTY2LDkxLjQwMSAxMDUuNzA1LDkwLjc5NyBDMTA1LjY4NCw5MC43ODMgMTA1LjY2NSw5MC44MTEgMTA1LjY1LDkwLjc5IEMxMDQuNzU2LDg5LjU0NiAxMDQuMjgzLDg3Ljg0MiAxMDQuMjgzLDg1LjgxNyBDMTA0LjI4Myw3OS41NzUgMTA4LjcwOSw3MS45NTMgMTE0LjE0OCw2OC44MTIgQzExNS43MjIsNjcuOTA0IDExNy4yMzIsNjcuNDQ5IDExOC42MzgsNjcuNDQ5IEMxMTkuNzgsNjcuNDQ5IDEyMC43OTYsNjcuNzU4IDEyMS42NTYsNjguMzYyIEMxMjEuNjc4LDY4LjM3NyAxMjEuNjk3LDY4LjM5NyAxMjEuNzEyLDY4LjQxOCBDMTIyLjYwNiw2OS42NjIgMTIzLjA3OSw3MS4zOSAxMjMuMDc5LDczLjQxNSBDMTIzLjA3OSw3OS42NTggMTE4LjY1Myw4Ny4xOTggMTEzLjIxNCw5MC4zMzggQzExMS42NCw5MS4yNDcgMTEwLjEzLDkxLjYxNCAxMDguNzI0LDkxLjYxNCBMMTA4LjcyNCw5MS42MTQgWiBNMTA2LjAwNiw5MC41MDUgQzEwNi43OCw5MS4wMzcgMTA3LjY5NCw5MS4yODEgMTA4LjcyNCw5MS4yODEgQzExMC4wNDcsOTEuMjgxIDExMS40NzgsOTAuODY4IDExMi45OCw5MC4wMDEgQzExOC4yOTEsODYuOTM1IDEyMi42MTEsNzkuNDk2IDEyMi42MTEsNzMuNDAzIEMxMjIuNjExLDcxLjQ5NCAxMjIuMTc3LDY5Ljg4IDEyMS4zNTYsNjguNzE4IEMxMjAuNTgyLDY4LjE4NSAxMTkuNjY4LDY3LjkxOSAxMTguNjM4LDY3LjkxOSBDMTE3LjMxNSw2Ny45MTkgMTE1Ljg4Myw2OC4zNiAxMTQuMzgyLDY5LjIyNyBDMTA5LjA3MSw3Mi4yOTMgMTA0Ljc1MSw3OS43MzMgMTA0Ljc1MSw4NS44MjYgQzEwNC43NTEsODcuNzM1IDEwNS4xODUsODkuMzQzIDEwNi4wMDYsOTAuNTA1IEwxMDYuMDA2LDkwLjUwNSBaIiBpZD0iRmlsbC0yMSIgZmlsbD0iIzYwN0Q4QiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xNDkuMzE4LDcuMjYyIEwxMzkuMzM0LDE2LjE0IEwxNTUuMjI3LDI3LjE3MSBMMTYwLjgxNiwyMS4wNTkgTDE0OS4zMTgsNy4yNjIiIGlkPSJGaWxsLTIyIiBmaWxsPSIjRkFGQUZBIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE2OS42NzYsMTMuODQgTDE1OS45MjgsMTkuNDY3IEMxNTYuMjg2LDIxLjU3IDE1MC40LDIxLjU4IDE0Ni43ODEsMTkuNDkxIEMxNDMuMTYxLDE3LjQwMiAxNDMuMTgsMTQuMDAzIDE0Ni44MjIsMTEuOSBMMTU2LjMxNyw2LjI5MiBMMTQ5LjU4OCwyLjQwNyBMNjcuNzUyLDQ5LjQ3OCBMMTEzLjY3NSw3NS45OTIgTDExNi43NTYsNzQuMjEzIEMxMTcuMzg3LDczLjg0OCAxMTcuNjI1LDczLjMxNSAxMTcuMzc0LDcyLjgyMyBDMTE1LjAxNyw2OC4xOTEgMTE0Ljc4MSw2My4yNzcgMTE2LjY5MSw1OC41NjEgQzEyMi4zMjksNDQuNjQxIDE0MS4yLDMzLjc0NiAxNjUuMzA5LDMwLjQ5MSBDMTczLjQ3OCwyOS4zODggMTgxLjk4OSwyOS41MjQgMTkwLjAxMywzMC44ODUgQzE5MC44NjUsMzEuMDMgMTkxLjc4OSwzMC44OTMgMTkyLjQyLDMwLjUyOCBMMTk1LjUwMSwyOC43NSBMMTY5LjY3NiwxMy44NCIgaWQ9IkZpbGwtMjMiIGZpbGw9IiNGQUZBRkEiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTEzLjY3NSw3Ni40NTkgQzExMy41OTQsNzYuNDU5IDExMy41MTQsNzYuNDM4IDExMy40NDIsNzYuMzk3IEw2Ny41MTgsNDkuODgyIEM2Ny4zNzQsNDkuNzk5IDY3LjI4NCw0OS42NDUgNjcuMjg1LDQ5LjQ3OCBDNjcuMjg1LDQ5LjMxMSA2Ny4zNzQsNDkuMTU3IDY3LjUxOSw0OS4wNzMgTDE0OS4zNTUsMi4wMDIgQzE0OS40OTksMS45MTkgMTQ5LjY3NywxLjkxOSAxNDkuODIxLDIuMDAyIEwxNTYuNTUsNS44ODcgQzE1Ni43NzQsNi4wMTcgMTU2Ljg1LDYuMzAyIDE1Ni43MjIsNi41MjYgQzE1Ni41OTIsNi43NDkgMTU2LjMwNyw2LjgyNiAxNTYuMDgzLDYuNjk2IEwxNDkuNTg3LDIuOTQ2IEw2OC42ODcsNDkuNDc5IEwxMTMuNjc1LDc1LjQ1MiBMMTE2LjUyMyw3My44MDggQzExNi43MTUsNzMuNjk3IDExNy4xNDMsNzMuMzk5IDExNi45NTgsNzMuMDM1IEMxMTQuNTQyLDY4LjI4NyAxMTQuMyw2My4yMjEgMTE2LjI1OCw1OC4zODUgQzExOS4wNjQsNTEuNDU4IDEyNS4xNDMsNDUuMTQzIDEzMy44NCw0MC4xMjIgQzE0Mi40OTcsMzUuMTI0IDE1My4zNTgsMzEuNjMzIDE2NS4yNDcsMzAuMDI4IEMxNzMuNDQ1LDI4LjkyMSAxODIuMDM3LDI5LjA1OCAxOTAuMDkxLDMwLjQyNSBDMTkwLjgzLDMwLjU1IDE5MS42NTIsMzAuNDMyIDE5Mi4xODYsMzAuMTI0IEwxOTQuNTY3LDI4Ljc1IEwxNjkuNDQyLDE0LjI0NCBDMTY5LjIxOSwxNC4xMTUgMTY5LjE0MiwxMy44MjkgMTY5LjI3MSwxMy42MDYgQzE2OS40LDEzLjM4MiAxNjkuNjg1LDEzLjMwNiAxNjkuOTA5LDEzLjQzNSBMMTk1LjczNCwyOC4zNDUgQzE5NS44NzksMjguNDI4IDE5NS45NjgsMjguNTgzIDE5NS45NjgsMjguNzUgQzE5NS45NjgsMjguOTE2IDE5NS44NzksMjkuMDcxIDE5NS43MzQsMjkuMTU0IEwxOTIuNjUzLDMwLjkzMyBDMTkxLjkzMiwzMS4zNSAxOTAuODksMzEuNTA4IDE4OS45MzUsMzEuMzQ2IEMxODEuOTcyLDI5Ljk5NSAxNzMuNDc4LDI5Ljg2IDE2NS4zNzIsMzAuOTU0IEMxNTMuNjAyLDMyLjU0MyAxNDIuODYsMzUuOTkzIDEzNC4zMDcsNDAuOTMxIEMxMjUuNzkzLDQ1Ljg0NyAxMTkuODUxLDUyLjAwNCAxMTcuMTI0LDU4LjczNiBDMTE1LjI3LDYzLjMxNCAxMTUuNTAxLDY4LjExMiAxMTcuNzksNzIuNjExIEMxMTguMTYsNzMuMzM2IDExNy44NDUsNzQuMTI0IDExNi45OSw3NC42MTcgTDExMy45MDksNzYuMzk3IEMxMTMuODM2LDc2LjQzOCAxMTMuNzU2LDc2LjQ1OSAxMTMuNjc1LDc2LjQ1OSIgaWQ9IkZpbGwtMjQiIGZpbGw9IiM0NTVBNjQiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTUzLjMxNiwyMS4yNzkgQzE1MC45MDMsMjEuMjc5IDE0OC40OTUsMjAuNzUxIDE0Ni42NjQsMTkuNjkzIEMxNDQuODQ2LDE4LjY0NCAxNDMuODQ0LDE3LjIzMiAxNDMuODQ0LDE1LjcxOCBDMTQzLjg0NCwxNC4xOTEgMTQ0Ljg2LDEyLjc2MyAxNDYuNzA1LDExLjY5OCBMMTU2LjE5OCw2LjA5MSBDMTU2LjMwOSw2LjAyNSAxNTYuNDUyLDYuMDYyIDE1Ni41MTgsNi4xNzMgQzE1Ni41ODMsNi4yODQgMTU2LjU0Nyw2LjQyNyAxNTYuNDM2LDYuNDkzIEwxNDYuOTQsMTIuMTAyIEMxNDUuMjQ0LDEzLjA4MSAxNDQuMzEyLDE0LjM2NSAxNDQuMzEyLDE1LjcxOCBDMTQ0LjMxMiwxNy4wNTggMTQ1LjIzLDE4LjMyNiAxNDYuODk3LDE5LjI4OSBDMTUwLjQ0NiwyMS4zMzggMTU2LjI0LDIxLjMyNyAxNTkuODExLDE5LjI2NSBMMTY5LjU1OSwxMy42MzcgQzE2OS42NywxMy41NzMgMTY5LjgxMywxMy42MTEgMTY5Ljg3OCwxMy43MjMgQzE2OS45NDMsMTMuODM0IDE2OS45MDQsMTMuOTc3IDE2OS43OTMsMTQuMDQyIEwxNjAuMDQ1LDE5LjY3IEMxNTguMTg3LDIwLjc0MiAxNTUuNzQ5LDIxLjI3OSAxNTMuMzE2LDIxLjI3OSIgaWQ9IkZpbGwtMjUiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTEzLjY3NSw3NS45OTIgTDY3Ljc2Miw0OS40ODQiIGlkPSJGaWxsLTI2IiBmaWxsPSIjNDU1QTY0Ij48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTExMy42NzUsNzYuMzQyIEMxMTMuNjE1LDc2LjM0MiAxMTMuNTU1LDc2LjMyNyAxMTMuNSw3Ni4yOTUgTDY3LjU4Nyw0OS43ODcgQzY3LjQxOSw0OS42OSA2Ny4zNjIsNDkuNDc2IDY3LjQ1OSw0OS4zMDkgQzY3LjU1Niw0OS4xNDEgNjcuNzcsNDkuMDgzIDY3LjkzNyw0OS4xOCBMMTEzLjg1LDc1LjY4OCBDMTE0LjAxOCw3NS43ODUgMTE0LjA3NSw3NiAxMTMuOTc4LDc2LjE2NyBDMTEzLjkxNCw3Ni4yNzkgMTEzLjc5Niw3Ni4zNDIgMTEzLjY3NSw3Ni4zNDIiIGlkPSJGaWxsLTI3IiBmaWxsPSIjNDU1QTY0Ij48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTY3Ljc2Miw0OS40ODQgTDY3Ljc2MiwxMDMuNDg1IEM2Ny43NjIsMTA0LjU3NSA2OC41MzIsMTA1LjkwMyA2OS40ODIsMTA2LjQ1MiBMMTExLjk1NSwxMzAuOTczIEMxMTIuOTA1LDEzMS41MjIgMTEzLjY3NSwxMzEuMDgzIDExMy42NzUsMTI5Ljk5MyBMMTEzLjY3NSw3NS45OTIiIGlkPSJGaWxsLTI4IiBmaWxsPSIjRkFGQUZBIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTExMi43MjcsMTMxLjU2MSBDMTEyLjQzLDEzMS41NjEgMTEyLjEwNywxMzEuNDY2IDExMS43OCwxMzEuMjc2IEw2OS4zMDcsMTA2Ljc1NSBDNjguMjQ0LDEwNi4xNDIgNjcuNDEyLDEwNC43MDUgNjcuNDEyLDEwMy40ODUgTDY3LjQxMiw0OS40ODQgQzY3LjQxMiw0OS4yOSA2Ny41NjksNDkuMTM0IDY3Ljc2Miw0OS4xMzQgQzY3Ljk1Niw0OS4xMzQgNjguMTEzLDQ5LjI5IDY4LjExMyw0OS40ODQgTDY4LjExMywxMDMuNDg1IEM2OC4xMTMsMTA0LjQ0NSA2OC44MiwxMDUuNjY1IDY5LjY1NywxMDYuMTQ4IEwxMTIuMTMsMTMwLjY3IEMxMTIuNDc0LDEzMC44NjggMTEyLjc5MSwxMzAuOTEzIDExMywxMzAuNzkyIEMxMTMuMjA2LDEzMC42NzMgMTEzLjMyNSwxMzAuMzgxIDExMy4zMjUsMTI5Ljk5MyBMMTEzLjMyNSw3NS45OTIgQzExMy4zMjUsNzUuNzk4IDExMy40ODIsNzUuNjQxIDExMy42NzUsNzUuNjQxIEMxMTMuODY5LDc1LjY0MSAxMTQuMDI1LDc1Ljc5OCAxMTQuMDI1LDc1Ljk5MiBMMTE0LjAyNSwxMjkuOTkzIEMxMTQuMDI1LDEzMC42NDggMTEzLjc4NiwxMzEuMTQ3IDExMy4zNSwxMzEuMzk5IEMxMTMuMTYyLDEzMS41MDcgMTEyLjk1MiwxMzEuNTYxIDExMi43MjcsMTMxLjU2MSIgaWQ9IkZpbGwtMjkiIGZpbGw9IiM0NTVBNjQiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTEyLjg2LDQwLjUxMiBDMTEyLjg2LDQwLjUxMiAxMTIuODYsNDAuNTEyIDExMi44NTksNDAuNTEyIEMxMTAuNTQxLDQwLjUxMiAxMDguMzYsMzkuOTkgMTA2LjcxNywzOS4wNDEgQzEwNS4wMTIsMzguMDU3IDEwNC4wNzQsMzYuNzI2IDEwNC4wNzQsMzUuMjkyIEMxMDQuMDc0LDMzLjg0NyAxMDUuMDI2LDMyLjUwMSAxMDYuNzU0LDMxLjUwNCBMMTE4Ljc5NSwyNC41NTEgQzEyMC40NjMsMjMuNTg5IDEyMi42NjksMjMuMDU4IDEyNS4wMDcsMjMuMDU4IEMxMjcuMzI1LDIzLjA1OCAxMjkuNTA2LDIzLjU4MSAxMzEuMTUsMjQuNTMgQzEzMi44NTQsMjUuNTE0IDEzMy43OTMsMjYuODQ1IDEzMy43OTMsMjguMjc4IEMxMzMuNzkzLDI5LjcyNCAxMzIuODQxLDMxLjA2OSAxMzEuMTEzLDMyLjA2NyBMMTE5LjA3MSwzOS4wMTkgQzExNy40MDMsMzkuOTgyIDExNS4xOTcsNDAuNTEyIDExMi44Niw0MC41MTIgTDExMi44Niw0MC41MTIgWiBNMTI1LjAwNywyMy43NTkgQzEyMi43OSwyMy43NTkgMTIwLjcwOSwyNC4yNTYgMTE5LjE0NiwyNS4xNTggTDEwNy4xMDQsMzIuMTEgQzEwNS42MDIsMzIuOTc4IDEwNC43NzQsMzQuMTA4IDEwNC43NzQsMzUuMjkyIEMxMDQuNzc0LDM2LjQ2NSAxMDUuNTg5LDM3LjU4MSAxMDcuMDY3LDM4LjQzNCBDMTA4LjYwNSwzOS4zMjMgMTEwLjY2MywzOS44MTIgMTEyLjg1OSwzOS44MTIgTDExMi44NiwzOS44MTIgQzExNS4wNzYsMzkuODEyIDExNy4xNTgsMzkuMzE1IDExOC43MjEsMzguNDEzIEwxMzAuNzYyLDMxLjQ2IEMxMzIuMjY0LDMwLjU5MyAxMzMuMDkyLDI5LjQ2MyAxMzMuMDkyLDI4LjI3OCBDMTMzLjA5MiwyNy4xMDYgMTMyLjI3OCwyNS45OSAxMzAuOCwyNS4xMzYgQzEyOS4yNjEsMjQuMjQ4IDEyNy4yMDQsMjMuNzU5IDEyNS4wMDcsMjMuNzU5IEwxMjUuMDA3LDIzLjc1OSBaIiBpZD0iRmlsbC0zMCIgZmlsbD0iIzYwN0Q4QiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xNjUuNjMsMTYuMjE5IEwxNTkuODk2LDE5LjUzIEMxNTYuNzI5LDIxLjM1OCAxNTEuNjEsMjEuMzY3IDE0OC40NjMsMTkuNTUgQzE0NS4zMTYsMTcuNzMzIDE0NS4zMzIsMTQuNzc4IDE0OC40OTksMTIuOTQ5IEwxNTQuMjMzLDkuNjM5IEwxNjUuNjMsMTYuMjE5IiBpZD0iRmlsbC0zMSIgZmlsbD0iI0ZBRkFGQSI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xNTQuMjMzLDEwLjQ0OCBMMTY0LjIyOCwxNi4yMTkgTDE1OS41NDYsMTguOTIzIEMxNTguMTEyLDE5Ljc1IDE1Ni4xOTQsMjAuMjA2IDE1NC4xNDcsMjAuMjA2IEMxNTIuMTE4LDIwLjIwNiAxNTAuMjI0LDE5Ljc1NyAxNDguODE0LDE4Ljk0MyBDMTQ3LjUyNCwxOC4xOTkgMTQ2LjgxNCwxNy4yNDkgMTQ2LjgxNCwxNi4yNjkgQzE0Ni44MTQsMTUuMjc4IDE0Ny41MzcsMTQuMzE0IDE0OC44NSwxMy41NTYgTDE1NC4yMzMsMTAuNDQ4IE0xNTQuMjMzLDkuNjM5IEwxNDguNDk5LDEyLjk0OSBDMTQ1LjMzMiwxNC43NzggMTQ1LjMxNiwxNy43MzMgMTQ4LjQ2MywxOS41NSBDMTUwLjAzMSwyMC40NTUgMTUyLjA4NiwyMC45MDcgMTU0LjE0NywyMC45MDcgQzE1Ni4yMjQsMjAuOTA3IDE1OC4zMDYsMjAuNDQ3IDE1OS44OTYsMTkuNTMgTDE2NS42MywxNi4yMTkgTDE1NC4yMzMsOS42MzkiIGlkPSJGaWxsLTMyIiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE0NS40NDUsNzIuNjY3IEwxNDUuNDQ1LDcyLjY2NyBDMTQzLjY3Miw3Mi42NjcgMTQyLjIwNCw3MS44MTcgMTQxLjIwMiw3MC40MjIgQzE0MS4xMzUsNzAuMzMgMTQxLjE0NSw3MC4xNDcgMTQxLjIyNSw3MC4wNjYgQzE0MS4zMDUsNjkuOTg1IDE0MS40MzIsNjkuOTQ2IDE0MS41MjUsNzAuMDExIEMxNDIuMzA2LDcwLjU1OSAxNDMuMjMxLDcwLjgyMyAxNDQuMjc2LDcwLjgyMiBDMTQ1LjU5OCw3MC44MjIgMTQ3LjAzLDcwLjM3NiAxNDguNTMyLDY5LjUwOSBDMTUzLjg0Miw2Ni40NDMgMTU4LjE2Myw1OC45ODcgMTU4LjE2Myw1Mi44OTQgQzE1OC4xNjMsNTAuOTY3IDE1Ny43MjEsNDkuMzMyIDE1Ni44ODQsNDguMTY4IEMxNTYuODE4LDQ4LjA3NiAxNTYuODI4LDQ3Ljk0OCAxNTYuOTA4LDQ3Ljg2NyBDMTU2Ljk4OCw0Ny43ODYgMTU3LjExNCw0Ny43NzQgMTU3LjIwOCw0Ny44NCBDMTU4Ljg3OCw0OS4wMTIgMTU5Ljc5OCw1MS4yMiAxNTkuNzk4LDU0LjA1OSBDMTU5Ljc5OCw2MC4zMDEgMTU1LjM3Myw2OC4wNDYgMTQ5LjkzMyw3MS4xODYgQzE0OC4zNiw3Mi4wOTQgMTQ2Ljg1LDcyLjY2NyAxNDUuNDQ1LDcyLjY2NyBMMTQ1LjQ0NSw3Mi42NjcgWiBNMTQyLjQ3Niw3MSBDMTQzLjI5LDcxLjY1MSAxNDQuMjk2LDcyLjAwMiAxNDUuNDQ1LDcyLjAwMiBDMTQ2Ljc2Nyw3Mi4wMDIgMTQ4LjE5OCw3MS41NSAxNDkuNyw3MC42ODIgQzE1NS4wMSw2Ny42MTcgMTU5LjMzMSw2MC4xNTkgMTU5LjMzMSw1NC4wNjUgQzE1OS4zMzEsNTIuMDg1IDE1OC44NjgsNTAuNDM1IDE1OC4wMDYsNDkuMjcyIEMxNTguNDE3LDUwLjMwNyAxNTguNjMsNTEuNTMyIDE1OC42Myw1Mi44OTIgQzE1OC42Myw1OS4xMzQgMTU0LjIwNSw2Ni43NjcgMTQ4Ljc2NSw2OS45MDcgQzE0Ny4xOTIsNzAuODE2IDE0NS42ODEsNzEuMjgzIDE0NC4yNzYsNzEuMjgzIEMxNDMuNjM0LDcxLjI4MyAxNDMuMDMzLDcxLjE5MiAxNDIuNDc2LDcxIEwxNDIuNDc2LDcxIFoiIGlkPSJGaWxsLTMzIiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE0OC42NDgsNjkuNzA0IEMxNTQuMDMyLDY2LjU5NiAxNTguMzk2LDU5LjA2OCAxNTguMzk2LDUyLjg5MSBDMTU4LjM5Niw1MC44MzkgMTU3LjkxMyw0OS4xOTggMTU3LjA3NCw0OC4wMyBDMTU1LjI4OSw0Ni43NzggMTUyLjY5OSw0Ni44MzYgMTQ5LjgxNiw0OC41MDEgQzE0NC40MzMsNTEuNjA5IDE0MC4wNjgsNTkuMTM3IDE0MC4wNjgsNjUuMzE0IEMxNDAuMDY4LDY3LjM2NSAxNDAuNTUyLDY5LjAwNiAxNDEuMzkxLDcwLjE3NCBDMTQzLjE3Niw3MS40MjcgMTQ1Ljc2NSw3MS4zNjkgMTQ4LjY0OCw2OS43MDQiIGlkPSJGaWxsLTM0IiBmaWxsPSIjRkFGQUZBIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE0NC4yNzYsNzEuMjc2IEwxNDQuMjc2LDcxLjI3NiBDMTQzLjEzMyw3MS4yNzYgMTQyLjExOCw3MC45NjkgMTQxLjI1Nyw3MC4zNjUgQzE0MS4yMzYsNzAuMzUxIDE0MS4yMTcsNzAuMzMyIDE0MS4yMDIsNzAuMzExIEMxNDAuMzA3LDY5LjA2NyAxMzkuODM1LDY3LjMzOSAxMzkuODM1LDY1LjMxNCBDMTM5LjgzNSw1OS4wNzMgMTQ0LjI2LDUxLjQzOSAxNDkuNyw0OC4yOTggQzE1MS4yNzMsNDcuMzkgMTUyLjc4NCw0Ni45MjkgMTU0LjE4OSw0Ni45MjkgQzE1NS4zMzIsNDYuOTI5IDE1Ni4zNDcsNDcuMjM2IDE1Ny4yMDgsNDcuODM5IEMxNTcuMjI5LDQ3Ljg1NCAxNTcuMjQ4LDQ3Ljg3MyAxNTcuMjYzLDQ3Ljg5NCBDMTU4LjE1Nyw0OS4xMzggMTU4LjYzLDUwLjg2NSAxNTguNjMsNTIuODkxIEMxNTguNjMsNTkuMTMyIDE1NC4yMDUsNjYuNzY2IDE0OC43NjUsNjkuOTA3IEMxNDcuMTkyLDcwLjgxNSAxNDUuNjgxLDcxLjI3NiAxNDQuMjc2LDcxLjI3NiBMMTQ0LjI3Niw3MS4yNzYgWiBNMTQxLjU1OCw3MC4xMDQgQzE0Mi4zMzEsNzAuNjM3IDE0My4yNDUsNzEuMDA1IDE0NC4yNzYsNzEuMDA1IEMxNDUuNTk4LDcxLjAwNSAxNDcuMDMsNzAuNDY3IDE0OC41MzIsNjkuNiBDMTUzLjg0Miw2Ni41MzQgMTU4LjE2Myw1OS4wMzMgMTU4LjE2Myw1Mi45MzkgQzE1OC4xNjMsNTEuMDMxIDE1Ny43MjksNDkuMzg1IDE1Ni45MDcsNDguMjIzIEMxNTYuMTMzLDQ3LjY5MSAxNTUuMjE5LDQ3LjQwOSAxNTQuMTg5LDQ3LjQwOSBDMTUyLjg2Nyw0Ny40MDkgMTUxLjQzNSw0Ny44NDIgMTQ5LjkzMyw0OC43MDkgQzE0NC42MjMsNTEuNzc1IDE0MC4zMDIsNTkuMjczIDE0MC4zMDIsNjUuMzY2IEMxNDAuMzAyLDY3LjI3NiAxNDAuNzM2LDY4Ljk0MiAxNDEuNTU4LDcwLjEwNCBMMTQxLjU1OCw3MC4xMDQgWiIgaWQ9IkZpbGwtMzUiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTUwLjcyLDY1LjM2MSBMMTUwLjM1Nyw2NS4wNjYgQzE1MS4xNDcsNjQuMDkyIDE1MS44NjksNjMuMDQgMTUyLjUwNSw2MS45MzggQzE1My4zMTMsNjAuNTM5IDE1My45NzgsNTkuMDY3IDE1NC40ODIsNTcuNTYzIEwxNTQuOTI1LDU3LjcxMiBDMTU0LjQxMiw1OS4yNDUgMTUzLjczMyw2MC43NDUgMTUyLjkxLDYyLjE3MiBDMTUyLjI2Miw2My4yOTUgMTUxLjUyNSw2NC4zNjggMTUwLjcyLDY1LjM2MSIgaWQ9IkZpbGwtMzYiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTE1LjkxNyw4NC41MTQgTDExNS41NTQsODQuMjIgQzExNi4zNDQsODMuMjQ1IDExNy4wNjYsODIuMTk0IDExNy43MDIsODEuMDkyIEMxMTguNTEsNzkuNjkyIDExOS4xNzUsNzguMjIgMTE5LjY3OCw3Ni43MTcgTDEyMC4xMjEsNzYuODY1IEMxMTkuNjA4LDc4LjM5OCAxMTguOTMsNzkuODk5IDExOC4xMDYsODEuMzI2IEMxMTcuNDU4LDgyLjQ0OCAxMTYuNzIyLDgzLjUyMSAxMTUuOTE3LDg0LjUxNCIgaWQ9IkZpbGwtMzciIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTE0LDEzMC40NzYgTDExNCwxMzAuMDA4IEwxMTQsNzYuMDUyIEwxMTQsNzUuNTg0IEwxMTQsNzYuMDUyIEwxMTQsMTMwLjAwOCBMMTE0LDEzMC40NzYiIGlkPSJGaWxsLTM4IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICA8L2c+CiAgICAgICAgICAgICAgICA8ZyBpZD0iSW1wb3J0ZWQtTGF5ZXJzLUNvcHkiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDYyLjAwMDAwMCwgMC4wMDAwMDApIiBza2V0Y2g6dHlwZT0iTVNTaGFwZUdyb3VwIj4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTkuODIyLDM3LjQ3NCBDMTkuODM5LDM3LjMzOSAxOS43NDcsMzcuMTk0IDE5LjU1NSwzNy4wODIgQzE5LjIyOCwzNi44OTQgMTguNzI5LDM2Ljg3MiAxOC40NDYsMzcuMDM3IEwxMi40MzQsNDAuNTA4IEMxMi4zMDMsNDAuNTg0IDEyLjI0LDQwLjY4NiAxMi4yNDMsNDAuNzkzIEMxMi4yNDUsNDAuOTI1IDEyLjI0NSw0MS4yNTQgMTIuMjQ1LDQxLjM3MSBMMTIuMjQ1LDQxLjQxNCBMMTIuMjM4LDQxLjU0MiBDOC4xNDgsNDMuODg3IDUuNjQ3LDQ1LjMyMSA1LjY0Nyw0NS4zMjEgQzUuNjQ2LDQ1LjMyMSAzLjU3LDQ2LjM2NyAyLjg2LDUwLjUxMyBDMi44Niw1MC41MTMgMS45NDgsNTcuNDc0IDEuOTYyLDcwLjI1OCBDMS45NzcsODIuODI4IDIuNTY4LDg3LjMyOCAzLjEyOSw5MS42MDkgQzMuMzQ5LDkzLjI5MyA2LjEzLDkzLjczNCA2LjEzLDkzLjczNCBDNi40NjEsOTMuNzc0IDYuODI4LDkzLjcwNyA3LjIxLDkzLjQ4NiBMODIuNDgzLDQ5LjkzNSBDODQuMjkxLDQ4Ljg2NiA4NS4xNSw0Ni4yMTYgODUuNTM5LDQzLjY1MSBDODYuNzUyLDM1LjY2MSA4Ny4yMTQsMTAuNjczIDg1LjI2NCwzLjc3MyBDODUuMDY4LDMuMDggODQuNzU0LDIuNjkgODQuMzk2LDIuNDkxIEw4Mi4zMSwxLjcwMSBDODEuNTgzLDEuNzI5IDgwLjg5NCwyLjE2OCA4MC43NzYsMi4yMzYgQzgwLjYzNiwyLjMxNyA0MS44MDcsMjQuNTg1IDIwLjAzMiwzNy4wNzIgTDE5LjgyMiwzNy40NzQiIGlkPSJGaWxsLTEiIGZpbGw9IiNGRkZGRkYiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNODIuMzExLDEuNzAxIEw4NC4zOTYsMi40OTEgQzg0Ljc1NCwyLjY5IDg1LjA2OCwzLjA4IDg1LjI2NCwzLjc3MyBDODcuMjEzLDEwLjY3MyA4Ni43NTEsMzUuNjYgODUuNTM5LDQzLjY1MSBDODUuMTQ5LDQ2LjIxNiA4NC4yOSw0OC44NjYgODIuNDgzLDQ5LjkzNSBMNy4yMSw5My40ODYgQzYuODk3LDkzLjY2NyA2LjU5NSw5My43NDQgNi4zMTQsOTMuNzQ0IEw2LjEzMSw5My43MzMgQzYuMTMxLDkzLjczNCAzLjM0OSw5My4yOTMgMy4xMjgsOTEuNjA5IEMyLjU2OCw4Ny4zMjcgMS45NzcsODIuODI4IDEuOTYzLDcwLjI1OCBDMS45NDgsNTcuNDc0IDIuODYsNTAuNTEzIDIuODYsNTAuNTEzIEMzLjU3LDQ2LjM2NyA1LjY0Nyw0NS4zMjEgNS42NDcsNDUuMzIxIEM1LjY0Nyw0NS4zMjEgOC4xNDgsNDMuODg3IDEyLjIzOCw0MS41NDIgTDEyLjI0NSw0MS40MTQgTDEyLjI0NSw0MS4zNzEgQzEyLjI0NSw0MS4yNTQgMTIuMjQ1LDQwLjkyNSAxMi4yNDMsNDAuNzkzIEMxMi4yNCw0MC42ODYgMTIuMzAyLDQwLjU4MyAxMi40MzQsNDAuNTA4IEwxOC40NDYsMzcuMDM2IEMxOC41NzQsMzYuOTYyIDE4Ljc0NiwzNi45MjYgMTguOTI3LDM2LjkyNiBDMTkuMTQ1LDM2LjkyNiAxOS4zNzYsMzYuOTc5IDE5LjU1NCwzNy4wODIgQzE5Ljc0NywzNy4xOTQgMTkuODM5LDM3LjM0IDE5LjgyMiwzNy40NzQgTDIwLjAzMywzNy4wNzIgQzQxLjgwNiwyNC41ODUgODAuNjM2LDIuMzE4IDgwLjc3NywyLjIzNiBDODAuODk0LDIuMTY4IDgxLjU4MywxLjcyOSA4Mi4zMTEsMS43MDEgTTgyLjMxMSwwLjcwNCBMODIuMjcyLDAuNzA1IEM4MS42NTQsMC43MjggODAuOTg5LDAuOTQ5IDgwLjI5OCwxLjM2MSBMODAuMjc3LDEuMzczIEM4MC4xMjksMS40NTggNTkuNzY4LDEzLjEzNSAxOS43NTgsMzYuMDc5IEMxOS41LDM1Ljk4MSAxOS4yMTQsMzUuOTI5IDE4LjkyNywzNS45MjkgQzE4LjU2MiwzNS45MjkgMTguMjIzLDM2LjAxMyAxNy45NDcsMzYuMTczIEwxMS45MzUsMzkuNjQ0IEMxMS40OTMsMzkuODk5IDExLjIzNiw0MC4zMzQgMTEuMjQ2LDQwLjgxIEwxMS4yNDcsNDAuOTYgTDUuMTY3LDQ0LjQ0NyBDNC43OTQsNDQuNjQ2IDIuNjI1LDQ1Ljk3OCAxLjg3Nyw1MC4zNDUgTDEuODcxLDUwLjM4NCBDMS44NjIsNTAuNDU0IDAuOTUxLDU3LjU1NyAwLjk2NSw3MC4yNTkgQzAuOTc5LDgyLjg3OSAxLjU2OCw4Ny4zNzUgMi4xMzcsOTEuNzI0IEwyLjEzOSw5MS43MzkgQzIuNDQ3LDk0LjA5NCA1LjYxNCw5NC42NjIgNS45NzUsOTQuNzE5IEw2LjAwOSw5NC43MjMgQzYuMTEsOTQuNzM2IDYuMjEzLDk0Ljc0MiA2LjMxNCw5NC43NDIgQzYuNzksOTQuNzQyIDcuMjYsOTQuNjEgNy43MSw5NC4zNSBMODIuOTgzLDUwLjc5OCBDODQuNzk0LDQ5LjcyNyA4NS45ODIsNDcuMzc1IDg2LjUyNSw0My44MDEgQzg3LjcxMSwzNS45ODcgODguMjU5LDEwLjcwNSA4Ni4yMjQsMy41MDIgQzg1Ljk3MSwyLjYwOSA4NS41MiwxLjk3NSA4NC44ODEsMS42MiBMODQuNzQ5LDEuNTU4IEw4Mi42NjQsMC43NjkgQzgyLjU1MSwwLjcyNSA4Mi40MzEsMC43MDQgODIuMzExLDAuNzA0IiBpZD0iRmlsbC0yIiBmaWxsPSIjNDU1QTY0Ij48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTY2LjI2NywxMS41NjUgTDY3Ljc2MiwxMS45OTkgTDExLjQyMyw0NC4zMjUiIGlkPSJGaWxsLTMiIGZpbGw9IiNGRkZGRkYiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTIuMjAyLDkwLjU0NSBDMTIuMDI5LDkwLjU0NSAxMS44NjIsOTAuNDU1IDExLjc2OSw5MC4yOTUgQzExLjYzMiw5MC4wNTcgMTEuNzEzLDg5Ljc1MiAxMS45NTIsODkuNjE0IEwzMC4zODksNzguOTY5IEMzMC42MjgsNzguODMxIDMwLjkzMyw3OC45MTMgMzEuMDcxLDc5LjE1MiBDMzEuMjA4LDc5LjM5IDMxLjEyNyw3OS42OTYgMzAuODg4LDc5LjgzMyBMMTIuNDUxLDkwLjQ3OCBMMTIuMjAyLDkwLjU0NSIgaWQ9IkZpbGwtNCIgZmlsbD0iIzYwN0Q4QiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMy43NjQsNDIuNjU0IEwxMy42NTYsNDIuNTkyIEwxMy43MDIsNDIuNDIxIEwxOC44MzcsMzkuNDU3IEwxOS4wMDcsMzkuNTAyIEwxOC45NjIsMzkuNjczIEwxMy44MjcsNDIuNjM3IEwxMy43NjQsNDIuNjU0IiBpZD0iRmlsbC01IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTguNTIsOTAuMzc1IEw4LjUyLDQ2LjQyMSBMOC41ODMsNDYuMzg1IEw3NS44NCw3LjU1NCBMNzUuODQsNTEuNTA4IEw3NS43NzgsNTEuNTQ0IEw4LjUyLDkwLjM3NSBMOC41Miw5MC4zNzUgWiBNOC43Nyw0Ni41NjQgTDguNzcsODkuOTQ0IEw3NS41OTEsNTEuMzY1IEw3NS41OTEsNy45ODUgTDguNzcsNDYuNTY0IEw4Ljc3LDQ2LjU2NCBaIiBpZD0iRmlsbC02IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTI0Ljk4Niw4My4xODIgQzI0Ljc1Niw4My4zMzEgMjQuMzc0LDgzLjU2NiAyNC4xMzcsODMuNzA1IEwxMi42MzIsOTAuNDA2IEMxMi4zOTUsOTAuNTQ1IDEyLjQyNiw5MC42NTggMTIuNyw5MC42NTggTDEzLjI2NSw5MC42NTggQzEzLjU0LDkwLjY1OCAxMy45NTgsOTAuNTQ1IDE0LjE5NSw5MC40MDYgTDI1LjcsODMuNzA1IEMyNS45MzcsODMuNTY2IDI2LjEyOCw4My40NTIgMjYuMTI1LDgzLjQ0OSBDMjYuMTIyLDgzLjQ0NyAyNi4xMTksODMuMjIgMjYuMTE5LDgyLjk0NiBDMjYuMTE5LDgyLjY3MiAyNS45MzEsODIuNTY5IDI1LjcwMSw4Mi43MTkgTDI0Ljk4Niw4My4xODIiIGlkPSJGaWxsLTciIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTMuMjY2LDkwLjc4MiBMMTIuNyw5MC43ODIgQzEyLjUsOTAuNzgyIDEyLjM4NCw5MC43MjYgMTIuMzU0LDkwLjYxNiBDMTIuMzI0LDkwLjUwNiAxMi4zOTcsOTAuMzk5IDEyLjU2OSw5MC4yOTkgTDI0LjA3NCw4My41OTcgQzI0LjMxLDgzLjQ1OSAyNC42ODksODMuMjI2IDI0LjkxOCw4My4wNzggTDI1LjYzMyw4Mi42MTQgQzI1LjcyMyw4Mi41NTUgMjUuODEzLDgyLjUyNSAyNS44OTksODIuNTI1IEMyNi4wNzEsODIuNTI1IDI2LjI0NCw4Mi42NTUgMjYuMjQ0LDgyLjk0NiBDMjYuMjQ0LDgzLjE2IDI2LjI0NSw4My4zMDkgMjYuMjQ3LDgzLjM4MyBMMjYuMjUzLDgzLjM4NyBMMjYuMjQ5LDgzLjQ1NiBDMjYuMjQ2LDgzLjUzMSAyNi4yNDYsODMuNTMxIDI1Ljc2Myw4My44MTIgTDE0LjI1OCw5MC41MTQgQzE0LDkwLjY2NSAxMy41NjQsOTAuNzgyIDEzLjI2Niw5MC43ODIgTDEzLjI2Niw5MC43ODIgWiBNMTIuNjY2LDkwLjUzMiBMMTIuNyw5MC41MzMgTDEzLjI2Niw5MC41MzMgQzEzLjUxOCw5MC41MzMgMTMuOTE1LDkwLjQyNSAxNC4xMzIsOTAuMjk5IEwyNS42MzcsODMuNTk3IEMyNS44MDUsODMuNDk5IDI1LjkzMSw4My40MjQgMjUuOTk4LDgzLjM4MyBDMjUuOTk0LDgzLjI5OSAyNS45OTQsODMuMTY1IDI1Ljk5NCw4Mi45NDYgTDI1Ljg5OSw4Mi43NzUgTDI1Ljc2OCw4Mi44MjQgTDI1LjA1NCw4My4yODcgQzI0LjgyMiw4My40MzcgMjQuNDM4LDgzLjY3MyAyNC4yLDgzLjgxMiBMMTIuNjk1LDkwLjUxNCBMMTIuNjY2LDkwLjUzMiBMMTIuNjY2LDkwLjUzMiBaIiBpZD0iRmlsbC04IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTEzLjI2Niw4OS44NzEgTDEyLjcsODkuODcxIEMxMi41LDg5Ljg3MSAxMi4zODQsODkuODE1IDEyLjM1NCw4OS43MDUgQzEyLjMyNCw4OS41OTUgMTIuMzk3LDg5LjQ4OCAxMi41NjksODkuMzg4IEwyNC4wNzQsODIuNjg2IEMyNC4zMzIsODIuNTM1IDI0Ljc2OCw4Mi40MTggMjUuMDY3LDgyLjQxOCBMMjUuNjMyLDgyLjQxOCBDMjUuODMyLDgyLjQxOCAyNS45NDgsODIuNDc0IDI1Ljk3OCw4Mi41ODQgQzI2LjAwOCw4Mi42OTQgMjUuOTM1LDgyLjgwMSAyNS43NjMsODIuOTAxIEwxNC4yNTgsODkuNjAzIEMxNCw4OS43NTQgMTMuNTY0LDg5Ljg3MSAxMy4yNjYsODkuODcxIEwxMy4yNjYsODkuODcxIFogTTEyLjY2Niw4OS42MjEgTDEyLjcsODkuNjIyIEwxMy4yNjYsODkuNjIyIEMxMy41MTgsODkuNjIyIDEzLjkxNSw4OS41MTUgMTQuMTMyLDg5LjM4OCBMMjUuNjM3LDgyLjY4NiBMMjUuNjY3LDgyLjY2OCBMMjUuNjMyLDgyLjY2NyBMMjUuMDY3LDgyLjY2NyBDMjQuODE1LDgyLjY2NyAyNC40MTgsODIuNzc1IDI0LjIsODIuOTAxIEwxMi42OTUsODkuNjAzIEwxMi42NjYsODkuNjIxIEwxMi42NjYsODkuNjIxIFoiIGlkPSJGaWxsLTkiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTIuMzcsOTAuODAxIEwxMi4zNyw4OS41NTQgTDEyLjM3LDkwLjgwMSIgaWQ9IkZpbGwtMTAiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNNi4xMyw5My45MDEgQzUuMzc5LDkzLjgwOCA0LjgxNiw5My4xNjQgNC42OTEsOTIuNTI1IEMzLjg2LDg4LjI4NyAzLjU0LDgzLjc0MyAzLjUyNiw3MS4xNzMgQzMuNTExLDU4LjM4OSA0LjQyMyw1MS40MjggNC40MjMsNTEuNDI4IEM1LjEzNCw0Ny4yODIgNy4yMSw0Ni4yMzYgNy4yMSw0Ni4yMzYgQzcuMjEsNDYuMjM2IDgxLjY2NywzLjI1IDgyLjA2OSwzLjAxNyBDODIuMjkyLDIuODg4IDg0LjU1NiwxLjQzMyA4NS4yNjQsMy45NCBDODcuMjE0LDEwLjg0IDg2Ljc1MiwzNS44MjcgODUuNTM5LDQzLjgxOCBDODUuMTUsNDYuMzgzIDg0LjI5MSw0OS4wMzMgODIuNDgzLDUwLjEwMSBMNy4yMSw5My42NTMgQzYuODI4LDkzLjg3NCA2LjQ2MSw5My45NDEgNi4xMyw5My45MDEgQzYuMTMsOTMuOTAxIDMuMzQ5LDkzLjQ2IDMuMTI5LDkxLjc3NiBDMi41NjgsODcuNDk1IDEuOTc3LDgyLjk5NSAxLjk2Miw3MC40MjUgQzEuOTQ4LDU3LjY0MSAyLjg2LDUwLjY4IDIuODYsNTAuNjggQzMuNTcsNDYuNTM0IDUuNjQ3LDQ1LjQ4OSA1LjY0Nyw0NS40ODkgQzUuNjQ2LDQ1LjQ4OSA4LjA2NSw0NC4wOTIgMTIuMjQ1LDQxLjY3OSBMMTMuMTE2LDQxLjU2IEwxOS43MTUsMzcuNzMgTDE5Ljc2MSwzNy4yNjkgTDYuMTMsOTMuOTAxIiBpZD0iRmlsbC0xMSIgZmlsbD0iI0ZBRkFGQSI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik02LjMxNyw5NC4xNjEgTDYuMTAyLDk0LjE0OCBMNi4xMDEsOTQuMTQ4IEw1Ljg1Nyw5NC4xMDEgQzUuMTM4LDkzLjk0NSAzLjA4NSw5My4zNjUgMi44ODEsOTEuODA5IEMyLjMxMyw4Ny40NjkgMS43MjcsODIuOTk2IDEuNzEzLDcwLjQyNSBDMS42OTksNTcuNzcxIDIuNjA0LDUwLjcxOCAyLjYxMyw1MC42NDggQzMuMzM4LDQ2LjQxNyA1LjQ0NSw0NS4zMSA1LjUzNSw0NS4yNjYgTDEyLjE2Myw0MS40MzkgTDEzLjAzMyw0MS4zMiBMMTkuNDc5LDM3LjU3OCBMMTkuNTEzLDM3LjI0NCBDMTkuNTI2LDM3LjEwNyAxOS42NDcsMzcuMDA4IDE5Ljc4NiwzNy4wMjEgQzE5LjkyMiwzNy4wMzQgMjAuMDIzLDM3LjE1NiAyMC4wMDksMzcuMjkzIEwxOS45NSwzNy44ODIgTDEzLjE5OCw0MS44MDEgTDEyLjMyOCw0MS45MTkgTDUuNzcyLDQ1LjcwNCBDNS43NDEsNDUuNzIgMy43ODIsNDYuNzcyIDMuMTA2LDUwLjcyMiBDMy4wOTksNTAuNzgyIDIuMTk4LDU3LjgwOCAyLjIxMiw3MC40MjQgQzIuMjI2LDgyLjk2MyAyLjgwOSw4Ny40MiAzLjM3Myw5MS43MjkgQzMuNDY0LDkyLjQyIDQuMDYyLDkyLjg4MyA0LjY4Miw5My4xODEgQzQuNTY2LDkyLjk4NCA0LjQ4Niw5Mi43NzYgNC40NDYsOTIuNTcyIEMzLjY2NSw4OC41ODggMy4yOTEsODQuMzcgMy4yNzYsNzEuMTczIEMzLjI2Miw1OC41MiA0LjE2Nyw1MS40NjYgNC4xNzYsNTEuMzk2IEM0LjkwMSw0Ny4xNjUgNy4wMDgsNDYuMDU5IDcuMDk4LDQ2LjAxNCBDNy4wOTQsNDYuMDE1IDgxLjU0MiwzLjAzNCA4MS45NDQsMi44MDIgTDgxLjk3MiwyLjc4NSBDODIuODc2LDIuMjQ3IDgzLjY5MiwyLjA5NyA4NC4zMzIsMi4zNTIgQzg0Ljg4NywyLjU3MyA4NS4yODEsMy4wODUgODUuNTA0LDMuODcyIEM4Ny41MTgsMTEgODYuOTY0LDM2LjA5MSA4NS43ODUsNDMuODU1IEM4NS4yNzgsNDcuMTk2IDg0LjIxLDQ5LjM3IDgyLjYxLDUwLjMxNyBMNy4zMzUsOTMuODY5IEM2Ljk5OSw5NC4wNjMgNi42NTgsOTQuMTYxIDYuMzE3LDk0LjE2MSBMNi4zMTcsOTQuMTYxIFogTTYuMTcsOTMuNjU0IEM2LjQ2Myw5My42OSA2Ljc3NCw5My42MTcgNy4wODUsOTMuNDM3IEw4Mi4zNTgsNDkuODg2IEM4NC4xODEsNDguODA4IDg0Ljk2LDQ1Ljk3MSA4NS4yOTIsNDMuNzggQzg2LjQ2NiwzNi4wNDkgODcuMDIzLDExLjA4NSA4NS4wMjQsNC4wMDggQzg0Ljg0NiwzLjM3NyA4NC41NTEsMi45NzYgODQuMTQ4LDIuODE2IEM4My42NjQsMi42MjMgODIuOTgyLDIuNzY0IDgyLjIyNywzLjIxMyBMODIuMTkzLDMuMjM0IEM4MS43OTEsMy40NjYgNy4zMzUsNDYuNDUyIDcuMzM1LDQ2LjQ1MiBDNy4zMDQsNDYuNDY5IDUuMzQ2LDQ3LjUyMSA0LjY2OSw1MS40NzEgQzQuNjYyLDUxLjUzIDMuNzYxLDU4LjU1NiAzLjc3NSw3MS4xNzMgQzMuNzksODQuMzI4IDQuMTYxLDg4LjUyNCA0LjkzNiw5Mi40NzYgQzUuMDI2LDkyLjkzNyA1LjQxMiw5My40NTkgNS45NzMsOTMuNjE1IEM2LjA4Nyw5My42NCA2LjE1OCw5My42NTIgNi4xNjksOTMuNjU0IEw2LjE3LDkzLjY1NCBMNi4xNyw5My42NTQgWiIgaWQ9IkZpbGwtMTIiIGZpbGw9IiM0NTVBNjQiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNNy4zMTcsNjguOTgyIEM3LjgwNiw2OC43MDEgOC4yMDIsNjguOTI2IDguMjAyLDY5LjQ4NyBDOC4yMDIsNzAuMDQ3IDcuODA2LDcwLjczIDcuMzE3LDcxLjAxMiBDNi44MjksNzEuMjk0IDYuNDMzLDcxLjA2OSA2LjQzMyw3MC41MDggQzYuNDMzLDY5Ljk0OCA2LjgyOSw2OS4yNjUgNy4zMTcsNjguOTgyIiBpZD0iRmlsbC0xMyIgZmlsbD0iI0ZGRkZGRiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik02LjkyLDcxLjEzMyBDNi42MzEsNzEuMTMzIDYuNDMzLDcwLjkwNSA2LjQzMyw3MC41MDggQzYuNDMzLDY5Ljk0OCA2LjgyOSw2OS4yNjUgNy4zMTcsNjguOTgyIEM3LjQ2LDY4LjkgNy41OTUsNjguODYxIDcuNzE0LDY4Ljg2MSBDOC4wMDMsNjguODYxIDguMjAyLDY5LjA5IDguMjAyLDY5LjQ4NyBDOC4yMDIsNzAuMDQ3IDcuODA2LDcwLjczIDcuMzE3LDcxLjAxMiBDNy4xNzQsNzEuMDk0IDcuMDM5LDcxLjEzMyA2LjkyLDcxLjEzMyBNNy43MTQsNjguNjc0IEM3LjU1Nyw2OC42NzQgNy4zOTIsNjguNzIzIDcuMjI0LDY4LjgyMSBDNi42NzYsNjkuMTM4IDYuMjQ2LDY5Ljg3OSA2LjI0Niw3MC41MDggQzYuMjQ2LDcwLjk5NCA2LjUxNyw3MS4zMiA2LjkyLDcxLjMyIEM3LjA3OCw3MS4zMiA3LjI0Myw3MS4yNzEgNy40MTEsNzEuMTc0IEM3Ljk1OSw3MC44NTcgOC4zODksNzAuMTE3IDguMzg5LDY5LjQ4NyBDOC4zODksNjkuMDAxIDguMTE3LDY4LjY3NCA3LjcxNCw2OC42NzQiIGlkPSJGaWxsLTE0IiBmaWxsPSIjODA5N0EyIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTYuOTIsNzAuOTQ3IEM2LjY0OSw3MC45NDcgNi42MjEsNzAuNjQgNi42MjEsNzAuNTA4IEM2LjYyMSw3MC4wMTcgNi45ODIsNjkuMzkyIDcuNDExLDY5LjE0NSBDNy41MjEsNjkuMDgyIDcuNjI1LDY5LjA0OSA3LjcxNCw2OS4wNDkgQzcuOTg2LDY5LjA0OSA4LjAxNSw2OS4zNTUgOC4wMTUsNjkuNDg3IEM4LjAxNSw2OS45NzggNy42NTIsNzAuNjAzIDcuMjI0LDcwLjg1MSBDNy4xMTUsNzAuOTE0IDcuMDEsNzAuOTQ3IDYuOTIsNzAuOTQ3IE03LjcxNCw2OC44NjEgQzcuNTk1LDY4Ljg2MSA3LjQ2LDY4LjkgNy4zMTcsNjguOTgyIEM2LjgyOSw2OS4yNjUgNi40MzMsNjkuOTQ4IDYuNDMzLDcwLjUwOCBDNi40MzMsNzAuOTA1IDYuNjMxLDcxLjEzMyA2LjkyLDcxLjEzMyBDNy4wMzksNzEuMTMzIDcuMTc0LDcxLjA5NCA3LjMxNyw3MS4wMTIgQzcuODA2LDcwLjczIDguMjAyLDcwLjA0NyA4LjIwMiw2OS40ODcgQzguMjAyLDY5LjA5IDguMDAzLDY4Ljg2MSA3LjcxNCw2OC44NjEiIGlkPSJGaWxsLTE1IiBmaWxsPSIjODA5N0EyIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTcuNDQ0LDg1LjM1IEM3LjcwOCw4NS4xOTggNy45MjEsODUuMzE5IDcuOTIxLDg1LjYyMiBDNy45MjEsODUuOTI1IDcuNzA4LDg2LjI5MiA3LjQ0NCw4Ni40NDQgQzcuMTgxLDg2LjU5NyA2Ljk2Nyw4Ni40NzUgNi45NjcsODYuMTczIEM2Ljk2Nyw4NS44NzEgNy4xODEsODUuNTAyIDcuNDQ0LDg1LjM1IiBpZD0iRmlsbC0xNiIgZmlsbD0iI0ZGRkZGRiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik03LjIzLDg2LjUxIEM3LjA3NCw4Ni41MSA2Ljk2Nyw4Ni4zODcgNi45NjcsODYuMTczIEM2Ljk2Nyw4NS44NzEgNy4xODEsODUuNTAyIDcuNDQ0LDg1LjM1IEM3LjUyMSw4NS4zMDUgNy41OTQsODUuMjg0IDcuNjU4LDg1LjI4NCBDNy44MTQsODUuMjg0IDcuOTIxLDg1LjQwOCA3LjkyMSw4NS42MjIgQzcuOTIxLDg1LjkyNSA3LjcwOCw4Ni4yOTIgNy40NDQsODYuNDQ0IEM3LjM2Nyw4Ni40ODkgNy4yOTQsODYuNTEgNy4yMyw4Ni41MSBNNy42NTgsODUuMDk4IEM3LjU1OCw4NS4wOTggNy40NTUsODUuMTI3IDcuMzUxLDg1LjE4OCBDNy4wMzEsODUuMzczIDYuNzgxLDg1LjgwNiA2Ljc4MSw4Ni4xNzMgQzYuNzgxLDg2LjQ4MiA2Ljk2Niw4Ni42OTcgNy4yMyw4Ni42OTcgQzcuMzMsODYuNjk3IDcuNDMzLDg2LjY2NiA3LjUzOCw4Ni42MDcgQzcuODU4LDg2LjQyMiA4LjEwOCw4NS45ODkgOC4xMDgsODUuNjIyIEM4LjEwOCw4NS4zMTMgNy45MjMsODUuMDk4IDcuNjU4LDg1LjA5OCIgaWQ9IkZpbGwtMTciIGZpbGw9IiM4MDk3QTIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNNy4yMyw4Ni4zMjIgTDcuMTU0LDg2LjE3MyBDNy4xNTQsODUuOTM4IDcuMzMzLDg1LjYyOSA3LjUzOCw4NS41MTIgTDcuNjU4LDg1LjQ3MSBMNy43MzQsODUuNjIyIEM3LjczNCw4NS44NTYgNy41NTUsODYuMTY0IDcuMzUxLDg2LjI4MiBMNy4yMyw4Ni4zMjIgTTcuNjU4LDg1LjI4NCBDNy41OTQsODUuMjg0IDcuNTIxLDg1LjMwNSA3LjQ0NCw4NS4zNSBDNy4xODEsODUuNTAyIDYuOTY3LDg1Ljg3MSA2Ljk2Nyw4Ni4xNzMgQzYuOTY3LDg2LjM4NyA3LjA3NCw4Ni41MSA3LjIzLDg2LjUxIEM3LjI5NCw4Ni41MSA3LjM2Nyw4Ni40ODkgNy40NDQsODYuNDQ0IEM3LjcwOCw4Ni4yOTIgNy45MjEsODUuOTI1IDcuOTIxLDg1LjYyMiBDNy45MjEsODUuNDA4IDcuODE0LDg1LjI4NCA3LjY1OCw4NS4yODQiIGlkPSJGaWxsLTE4IiBmaWxsPSIjODA5N0EyIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTc3LjI3OCw3Ljc2OSBMNzcuMjc4LDUxLjQzNiBMMTAuMjA4LDkwLjE2IEwxMC4yMDgsNDYuNDkzIEw3Ny4yNzgsNy43NjkiIGlkPSJGaWxsLTE5IiBmaWxsPSIjNDU1QTY0Ij48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTEwLjA4Myw5MC4zNzUgTDEwLjA4Myw0Ni40MjEgTDEwLjE0Niw0Ni4zODUgTDc3LjQwMyw3LjU1NCBMNzcuNDAzLDUxLjUwOCBMNzcuMzQxLDUxLjU0NCBMMTAuMDgzLDkwLjM3NSBMMTAuMDgzLDkwLjM3NSBaIE0xMC4zMzMsNDYuNTY0IEwxMC4zMzMsODkuOTQ0IEw3Ny4xNTQsNTEuMzY1IEw3Ny4xNTQsNy45ODUgTDEwLjMzMyw0Ni41NjQgTDEwLjMzMyw0Ni41NjQgWiIgaWQ9IkZpbGwtMjAiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgIDwvZz4KICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMjUuNzM3LDg4LjY0NyBMMTE4LjA5OCw5MS45ODEgTDExOC4wOTgsODQgTDEwNi42MzksODguNzEzIEwxMDYuNjM5LDk2Ljk4MiBMOTksMTAwLjMxNSBMMTEyLjM2OSwxMDMuOTYxIEwxMjUuNzM3LDg4LjY0NyIgaWQ9IkltcG9ydGVkLUxheWVycy1Db3B5LTIiIGZpbGw9IiM0NTVBNjQiIHNrZXRjaDp0eXBlPSJNU1NoYXBlR3JvdXAiPjwvcGF0aD4KICAgICAgICAgICAgPC9nPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+';
function RotateInstructions() {
  this.loadIcon_();
  var overlay = document.createElement('div');
  var s = overlay.style;
  s.position = 'fixed';
  s.top = 0;
  s.right = 0;
  s.bottom = 0;
  s.left = 0;
  s.backgroundColor = 'gray';
  s.fontFamily = 'sans-serif';
  s.zIndex = 1000000;
  var img = document.createElement('img');
  img.src = this.icon;
  var s = img.style;
  s.marginLeft = '25%';
  s.marginTop = '25%';
  s.width = '50%';
  overlay.appendChild(img);
  var text = document.createElement('div');
  var s = text.style;
  s.textAlign = 'center';
  s.fontSize = '16px';
  s.lineHeight = '24px';
  s.margin = '24px 25%';
  s.width = '50%';
  text.innerHTML = 'Place your phone into your Cardboard viewer.';
  overlay.appendChild(text);
  var snackbar = document.createElement('div');
  var s = snackbar.style;
  s.backgroundColor = '#CFD8DC';
  s.position = 'fixed';
  s.bottom = 0;
  s.width = '100%';
  s.height = '48px';
  s.padding = '14px 24px';
  s.boxSizing = 'border-box';
  s.color = '#656A6B';
  overlay.appendChild(snackbar);
  var snackbarText = document.createElement('div');
  snackbarText.style.float = 'left';
  snackbarText.innerHTML = 'No Cardboard viewer?';
  var snackbarButton = document.createElement('a');
  snackbarButton.href = 'https://www.google.com/get/cardboard/get-cardboard/';
  snackbarButton.innerHTML = 'get one';
  snackbarButton.target = '_blank';
  var s = snackbarButton.style;
  s.float = 'right';
  s.fontWeight = 600;
  s.textTransform = 'uppercase';
  s.borderLeft = '1px solid gray';
  s.paddingLeft = '24px';
  s.textDecoration = 'none';
  s.color = '#656A6B';
  snackbar.appendChild(snackbarText);
  snackbar.appendChild(snackbarButton);
  this.overlay = overlay;
  this.text = text;
  this.hide();
}
RotateInstructions.prototype.show = function (parent) {
  if (!parent && !this.overlay.parentElement) {
    document.body.appendChild(this.overlay);
  } else if (parent) {
    if (this.overlay.parentElement && this.overlay.parentElement != parent) this.overlay.parentElement.removeChild(this.overlay);
    parent.appendChild(this.overlay);
  }
  this.overlay.style.display = 'block';
  var img = this.overlay.querySelector('img');
  var s = img.style;
  if (isLandscapeMode()) {
    s.width = '20%';
    s.marginLeft = '40%';
    s.marginTop = '3%';
  } else {
    s.width = '50%';
    s.marginLeft = '25%';
    s.marginTop = '25%';
  }
};
RotateInstructions.prototype.hide = function () {
  this.overlay.style.display = 'none';
};
RotateInstructions.prototype.showTemporarily = function (ms, parent) {
  this.show(parent);
  this.timer = setTimeout(this.hide.bind(this), ms);
};
RotateInstructions.prototype.disableShowTemporarily = function () {
  clearTimeout(this.timer);
};
RotateInstructions.prototype.update = function () {
  this.disableShowTemporarily();
  if (!isLandscapeMode() && isMobile()) {
    this.show();
  } else {
    this.hide();
  }
};
RotateInstructions.prototype.loadIcon_ = function () {
  this.icon = base64('image/svg+xml', rotateInstructionsAsset);
};
var DEFAULT_VIEWER = 'CardboardV1';
var VIEWER_KEY = 'WEBVR_CARDBOARD_VIEWER';
var CLASS_NAME = 'webvr-polyfill-viewer-selector';
function ViewerSelector() {
  try {
    this.selectedKey = localStorage.getItem(VIEWER_KEY);
  } catch (error) {
    console.error('Failed to load viewer profile: %s', error);
  }
  if (!this.selectedKey) {
    this.selectedKey = DEFAULT_VIEWER;
  }
  this.dialog = this.createDialog_(DeviceInfo.Viewers);
  this.root = null;
  this.onChangeCallbacks_ = [];
}
ViewerSelector.prototype.show = function (root) {
  this.root = root;
  root.appendChild(this.dialog);
  var selected = this.dialog.querySelector('#' + this.selectedKey);
  selected.checked = true;
  this.dialog.style.display = 'block';
};
ViewerSelector.prototype.hide = function () {
  if (this.root && this.root.contains(this.dialog)) {
    this.root.removeChild(this.dialog);
  }
  this.dialog.style.display = 'none';
};
ViewerSelector.prototype.getCurrentViewer = function () {
  return DeviceInfo.Viewers[this.selectedKey];
};
ViewerSelector.prototype.getSelectedKey_ = function () {
  var input = this.dialog.querySelector('input[name=field]:checked');
  if (input) {
    return input.id;
  }
  return null;
};
ViewerSelector.prototype.onChange = function (cb) {
  this.onChangeCallbacks_.push(cb);
};
ViewerSelector.prototype.fireOnChange_ = function (viewer) {
  for (var i = 0; i < this.onChangeCallbacks_.length; i++) {
    this.onChangeCallbacks_[i](viewer);
  }
};
ViewerSelector.prototype.onSave_ = function () {
  this.selectedKey = this.getSelectedKey_();
  if (!this.selectedKey || !DeviceInfo.Viewers[this.selectedKey]) {
    console.error('ViewerSelector.onSave_: this should never happen!');
    return;
  }
  this.fireOnChange_(DeviceInfo.Viewers[this.selectedKey]);
  try {
    localStorage.setItem(VIEWER_KEY, this.selectedKey);
  } catch (error) {
    console.error('Failed to save viewer profile: %s', error);
  }
  this.hide();
};
ViewerSelector.prototype.createDialog_ = function (options) {
  var container = document.createElement('div');
  container.classList.add(CLASS_NAME);
  container.style.display = 'none';
  var overlay = document.createElement('div');
  var s = overlay.style;
  s.position = 'fixed';
  s.left = 0;
  s.top = 0;
  s.width = '100%';
  s.height = '100%';
  s.background = 'rgba(0, 0, 0, 0.3)';
  overlay.addEventListener('click', this.hide.bind(this));
  var width = 280;
  var dialog = document.createElement('div');
  var s = dialog.style;
  s.boxSizing = 'border-box';
  s.position = 'fixed';
  s.top = '24px';
  s.left = '50%';
  s.marginLeft = -width / 2 + 'px';
  s.width = width + 'px';
  s.padding = '24px';
  s.overflow = 'hidden';
  s.background = '#fafafa';
  s.fontFamily = "'Roboto', sans-serif";
  s.boxShadow = '0px 5px 20px #666';
  dialog.appendChild(this.createH1_('Select your viewer'));
  for (var id in options) {
    dialog.appendChild(this.createChoice_(id, options[id].label));
  }
  dialog.appendChild(this.createButton_('Save', this.onSave_.bind(this)));
  container.appendChild(overlay);
  container.appendChild(dialog);
  return container;
};
ViewerSelector.prototype.createH1_ = function (name) {
  var h1 = document.createElement('h1');
  var s = h1.style;
  s.color = 'black';
  s.fontSize = '20px';
  s.fontWeight = 'bold';
  s.marginTop = 0;
  s.marginBottom = '24px';
  h1.innerHTML = name;
  return h1;
};
ViewerSelector.prototype.createChoice_ = function (id, name) {
  var div = document.createElement('div');
  div.style.marginTop = '8px';
  div.style.color = 'black';
  var input = document.createElement('input');
  input.style.fontSize = '30px';
  input.setAttribute('id', id);
  input.setAttribute('type', 'radio');
  input.setAttribute('value', id);
  input.setAttribute('name', 'field');
  var label = document.createElement('label');
  label.style.marginLeft = '4px';
  label.setAttribute('for', id);
  label.innerHTML = name;
  div.appendChild(input);
  div.appendChild(label);
  return div;
};
ViewerSelector.prototype.createButton_ = function (label, onclick) {
  var button = document.createElement('button');
  button.innerHTML = label;
  var s = button.style;
  s.float = 'right';
  s.textTransform = 'uppercase';
  s.color = '#1094f7';
  s.fontSize = '14px';
  s.letterSpacing = 0;
  s.border = 0;
  s.background = 'none';
  s.marginTop = '16px';
  button.addEventListener('click', onclick);
  return button;
};
var commonjsGlobal$$1 = typeof window !== 'undefined' ? window : typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : typeof self !== 'undefined' ? self : {};
function unwrapExports$$1 (x) {
	return x && x.__esModule ? x['default'] : x;
}
function createCommonjsModule$$1(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}
var NoSleep = createCommonjsModule$$1(function (module, exports) {
(function webpackUniversalModuleDefinition(root, factory) {
	module.exports = factory();
})(commonjsGlobal$$1, function() {
return          (function(modules) {
         	var installedModules = {};
         	function __webpack_require__(moduleId) {
         		if(installedModules[moduleId]) {
         			return installedModules[moduleId].exports;
         		}
         		var module = installedModules[moduleId] = {
         			i: moduleId,
         			l: false,
         			exports: {}
         		};
         		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
         		module.l = true;
         		return module.exports;
         	}
         	__webpack_require__.m = modules;
         	__webpack_require__.c = installedModules;
         	__webpack_require__.d = function(exports, name, getter) {
         		if(!__webpack_require__.o(exports, name)) {
         			Object.defineProperty(exports, name, {
         				configurable: false,
         				enumerable: true,
         				get: getter
         			});
         		}
         	};
         	__webpack_require__.n = function(module) {
         		var getter = module && module.__esModule ?
         			function getDefault() { return module['default']; } :
         			function getModuleExports() { return module; };
         		__webpack_require__.d(getter, 'a', getter);
         		return getter;
         	};
         	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
         	__webpack_require__.p = "";
         	return __webpack_require__(__webpack_require__.s = 0);
         })
         ([
      (function(module, exports, __webpack_require__) {
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
var mediaFile = __webpack_require__(1);
var oldIOS = typeof navigator !== 'undefined' && parseFloat(('' + (/CPU.*OS ([0-9_]{3,4})[0-9_]{0,1}|(CPU like).*AppleWebKit.*Mobile/i.exec(navigator.userAgent) || [0, ''])[1]).replace('undefined', '3_2').replace('_', '.').replace('_', '')) < 10 && !window.MSStream;
var NoSleep = function () {
  function NoSleep() {
    _classCallCheck(this, NoSleep);
    if (oldIOS) {
      this.noSleepTimer = null;
    } else {
      this.noSleepVideo = document.createElement('video');
      this.noSleepVideo.setAttribute('playsinline', '');
      this.noSleepVideo.setAttribute('src', mediaFile);
      this.noSleepVideo.addEventListener('timeupdate', function (e) {
        if (this.noSleepVideo.currentTime > 0.5) {
          this.noSleepVideo.currentTime = Math.random();
        }
      }.bind(this));
    }
  }
  _createClass(NoSleep, [{
    key: 'enable',
    value: function enable() {
      if (oldIOS) {
        this.disable();
        this.noSleepTimer = window.setInterval(function () {
          window.location.href = '/';
          window.setTimeout(window.stop, 0);
        }, 15000);
      } else {
        this.noSleepVideo.play();
      }
    }
  }, {
    key: 'disable',
    value: function disable() {
      if (oldIOS) {
        if (this.noSleepTimer) {
          window.clearInterval(this.noSleepTimer);
          this.noSleepTimer = null;
        }
      } else {
        this.noSleepVideo.pause();
      }
    }
  }]);
  return NoSleep;
}();
module.exports = NoSleep;
      }),
      (function(module, exports, __webpack_require__) {
module.exports = 'data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAACKBtZGF0AAAC8wYF///v3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0MiByMjQ3OSBkZDc5YTYxIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTEgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZXggc3VibWU9MiBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0wIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MCA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0wIHRocmVhZHM9NiBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTMgYl9weXJhbWlkPTIgYl9hZGFwdD0xIGJfYmlhcz0wIGRpcmVjdD0xIHdlaWdodGI9MSBvcGVuX2dvcD0wIHdlaWdodHA9MSBrZXlpbnQ9MzAwIGtleWludF9taW49MzAgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD0xMCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIwLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IHZidl9tYXhyYXRlPTIwMDAwIHZidl9idWZzaXplPTI1MDAwIGNyZl9tYXg9MC4wIG5hbF9ocmQ9bm9uZSBmaWxsZXI9MCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAOWWIhAA3//p+C7v8tDDSTjf97w55i3SbRPO4ZY+hkjD5hbkAkL3zpJ6h/LR1CAABzgB1kqqzUorlhQAAAAxBmiQYhn/+qZYADLgAAAAJQZ5CQhX/AAj5IQADQGgcIQADQGgcAAAACQGeYUQn/wALKCEAA0BoHAAAAAkBnmNEJ/8ACykhAANAaBwhAANAaBwAAAANQZpoNExDP/6plgAMuSEAA0BoHAAAAAtBnoZFESwr/wAI+SEAA0BoHCEAA0BoHAAAAAkBnqVEJ/8ACykhAANAaBwAAAAJAZ6nRCf/AAsoIQADQGgcIQADQGgcAAAADUGarDRMQz/+qZYADLghAANAaBwAAAALQZ7KRRUsK/8ACPkhAANAaBwAAAAJAZ7pRCf/AAsoIQADQGgcIQADQGgcAAAACQGe60Qn/wALKCEAA0BoHAAAAA1BmvA0TEM//qmWAAy5IQADQGgcIQADQGgcAAAAC0GfDkUVLCv/AAj5IQADQGgcAAAACQGfLUQn/wALKSEAA0BoHCEAA0BoHAAAAAkBny9EJ/8ACyghAANAaBwAAAANQZs0NExDP/6plgAMuCEAA0BoHAAAAAtBn1JFFSwr/wAI+SEAA0BoHCEAA0BoHAAAAAkBn3FEJ/8ACyghAANAaBwAAAAJAZ9zRCf/AAsoIQADQGgcIQADQGgcAAAADUGbeDRMQz/+qZYADLkhAANAaBwAAAALQZ+WRRUsK/8ACPghAANAaBwhAANAaBwAAAAJAZ+1RCf/AAspIQADQGgcAAAACQGft0Qn/wALKSEAA0BoHCEAA0BoHAAAAA1Bm7w0TEM//qmWAAy4IQADQGgcAAAAC0Gf2kUVLCv/AAj5IQADQGgcAAAACQGf+UQn/wALKCEAA0BoHCEAA0BoHAAAAAkBn/tEJ/8ACykhAANAaBwAAAANQZvgNExDP/6plgAMuSEAA0BoHCEAA0BoHAAAAAtBnh5FFSwr/wAI+CEAA0BoHAAAAAkBnj1EJ/8ACyghAANAaBwhAANAaBwAAAAJAZ4/RCf/AAspIQADQGgcAAAADUGaJDRMQz/+qZYADLghAANAaBwAAAALQZ5CRRUsK/8ACPkhAANAaBwhAANAaBwAAAAJAZ5hRCf/AAsoIQADQGgcAAAACQGeY0Qn/wALKSEAA0BoHCEAA0BoHAAAAA1Bmmg0TEM//qmWAAy5IQADQGgcAAAAC0GehkUVLCv/AAj5IQADQGgcIQADQGgcAAAACQGepUQn/wALKSEAA0BoHAAAAAkBnqdEJ/8ACyghAANAaBwAAAANQZqsNExDP/6plgAMuCEAA0BoHCEAA0BoHAAAAAtBnspFFSwr/wAI+SEAA0BoHAAAAAkBnulEJ/8ACyghAANAaBwhAANAaBwAAAAJAZ7rRCf/AAsoIQADQGgcAAAADUGa8DRMQz/+qZYADLkhAANAaBwhAANAaBwAAAALQZ8ORRUsK/8ACPkhAANAaBwAAAAJAZ8tRCf/AAspIQADQGgcIQADQGgcAAAACQGfL0Qn/wALKCEAA0BoHAAAAA1BmzQ0TEM//qmWAAy4IQADQGgcAAAAC0GfUkUVLCv/AAj5IQADQGgcIQADQGgcAAAACQGfcUQn/wALKCEAA0BoHAAAAAkBn3NEJ/8ACyghAANAaBwhAANAaBwAAAANQZt4NExC//6plgAMuSEAA0BoHAAAAAtBn5ZFFSwr/wAI+CEAA0BoHCEAA0BoHAAAAAkBn7VEJ/8ACykhAANAaBwAAAAJAZ+3RCf/AAspIQADQGgcAAAADUGbuzRMQn/+nhAAYsAhAANAaBwhAANAaBwAAAAJQZ/aQhP/AAspIQADQGgcAAAACQGf+UQn/wALKCEAA0BoHCEAA0BoHCEAA0BoHCEAA0BoHCEAA0BoHCEAA0BoHAAACiFtb292AAAAbG12aGQAAAAA1YCCX9WAgl8AAAPoAAAH/AABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAGGlvZHMAAAAAEICAgAcAT////v7/AAAF+XRyYWsAAABcdGtoZAAAAAPVgIJf1YCCXwAAAAEAAAAAAAAH0AAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAygAAAMoAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAB9AAABdwAAEAAAAABXFtZGlhAAAAIG1kaGQAAAAA1YCCX9WAgl8AAV+QAAK/IFXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAUcbWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAAE3HN0YmwAAACYc3RzZAAAAAAAAAABAAAAiGF2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAygDKAEgAAABIAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAAAyYXZjQwFNQCj/4QAbZ01AKOyho3ySTUBAQFAAAAMAEAAr8gDxgxlgAQAEaO+G8gAAABhzdHRzAAAAAAAAAAEAAAA8AAALuAAAABRzdHNzAAAAAAAAAAEAAAABAAAB8GN0dHMAAAAAAAAAPAAAAAEAABdwAAAAAQAAOpgAAAABAAAXcAAAAAEAAAAAAAAAAQAAC7gAAAABAAA6mAAAAAEAABdwAAAAAQAAAAAAAAABAAALuAAAAAEAADqYAAAAAQAAF3AAAAABAAAAAAAAAAEAAAu4AAAAAQAAOpgAAAABAAAXcAAAAAEAAAAAAAAAAQAAC7gAAAABAAA6mAAAAAEAABdwAAAAAQAAAAAAAAABAAALuAAAAAEAADqYAAAAAQAAF3AAAAABAAAAAAAAAAEAAAu4AAAAAQAAOpgAAAABAAAXcAAAAAEAAAAAAAAAAQAAC7gAAAABAAA6mAAAAAEAABdwAAAAAQAAAAAAAAABAAALuAAAAAEAADqYAAAAAQAAF3AAAAABAAAAAAAAAAEAAAu4AAAAAQAAOpgAAAABAAAXcAAAAAEAAAAAAAAAAQAAC7gAAAABAAA6mAAAAAEAABdwAAAAAQAAAAAAAAABAAALuAAAAAEAADqYAAAAAQAAF3AAAAABAAAAAAAAAAEAAAu4AAAAAQAAOpgAAAABAAAXcAAAAAEAAAAAAAAAAQAAC7gAAAABAAA6mAAAAAEAABdwAAAAAQAAAAAAAAABAAALuAAAAAEAAC7gAAAAAQAAF3AAAAABAAAAAAAAABxzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAEEc3RzegAAAAAAAAAAAAAAPAAAAzQAAAAQAAAADQAAAA0AAAANAAAAEQAAAA8AAAANAAAADQAAABEAAAAPAAAADQAAAA0AAAARAAAADwAAAA0AAAANAAAAEQAAAA8AAAANAAAADQAAABEAAAAPAAAADQAAAA0AAAARAAAADwAAAA0AAAANAAAAEQAAAA8AAAANAAAADQAAABEAAAAPAAAADQAAAA0AAAARAAAADwAAAA0AAAANAAAAEQAAAA8AAAANAAAADQAAABEAAAAPAAAADQAAAA0AAAARAAAADwAAAA0AAAANAAAAEQAAAA8AAAANAAAADQAAABEAAAANAAAADQAAAQBzdGNvAAAAAAAAADwAAAAwAAADZAAAA3QAAAONAAADoAAAA7kAAAPQAAAD6wAAA/4AAAQXAAAELgAABEMAAARcAAAEbwAABIwAAAShAAAEugAABM0AAATkAAAE/wAABRIAAAUrAAAFQgAABV0AAAVwAAAFiQAABaAAAAW1AAAFzgAABeEAAAX+AAAGEwAABiwAAAY/AAAGVgAABnEAAAaEAAAGnQAABrQAAAbPAAAG4gAABvUAAAcSAAAHJwAAB0AAAAdTAAAHcAAAB4UAAAeeAAAHsQAAB8gAAAfjAAAH9gAACA8AAAgmAAAIQQAACFQAAAhnAAAIhAAACJcAAAMsdHJhawAAAFx0a2hkAAAAA9WAgl/VgIJfAAAAAgAAAAAAAAf8AAAAAAAAAAAAAAABAQAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAACsm1kaWEAAAAgbWRoZAAAAADVgIJf1YCCXwAArEQAAWAAVcQAAAAAACdoZGxyAAAAAAAAAABzb3VuAAAAAAAAAAAAAAAAU3RlcmVvAAAAAmNtaW5mAAAAEHNtaGQAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAidzdGJsAAAAZ3N0c2QAAAAAAAAAAQAAAFdtcDRhAAAAAAAAAAEAAAAAAAAAAAACABAAAAAArEQAAAAAADNlc2RzAAAAAAOAgIAiAAIABICAgBRAFQAAAAADDUAAAAAABYCAgAISEAaAgIABAgAAABhzdHRzAAAAAAAAAAEAAABYAAAEAAAAABxzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAAUc3RzegAAAAAAAAAGAAAAWAAAAXBzdGNvAAAAAAAAAFgAAAOBAAADhwAAA5oAAAOtAAADswAAA8oAAAPfAAAD5QAAA/gAAAQLAAAEEQAABCgAAAQ9AAAEUAAABFYAAARpAAAEgAAABIYAAASbAAAErgAABLQAAATHAAAE3gAABPMAAAT5AAAFDAAABR8AAAUlAAAFPAAABVEAAAVXAAAFagAABX0AAAWDAAAFmgAABa8AAAXCAAAFyAAABdsAAAXyAAAF+AAABg0AAAYgAAAGJgAABjkAAAZQAAAGZQAABmsAAAZ+AAAGkQAABpcAAAauAAAGwwAABskAAAbcAAAG7wAABwYAAAcMAAAHIQAABzQAAAc6AAAHTQAAB2QAAAdqAAAHfwAAB5IAAAeYAAAHqwAAB8IAAAfXAAAH3QAAB/AAAAgDAAAICQAACCAAAAg1AAAIOwAACE4AAAhhAAAIeAAACH4AAAiRAAAIpAAACKoAAAiwAAAItgAACLwAAAjCAAAAFnVkdGEAAAAObmFtZVN0ZXJlbwAAAHB1ZHRhAAAAaG1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAAO2lsc3QAAAAzqXRvbwAAACtkYXRhAAAAAQAAAABIYW5kQnJha2UgMC4xMC4yIDIwMTUwNjExMDA=';
      })
         ]);
});
});
var NoSleep$1 = unwrapExports$$1(NoSleep);
var nextDisplayId = 1000;
var defaultLeftBounds = [0, 0, 0.5, 1];
var defaultRightBounds = [0.5, 0, 0.5, 1];
var raf = window.requestAnimationFrame;
var caf = window.cancelAnimationFrame;
function VRFrameData() {
  this.leftProjectionMatrix = new Float32Array(16);
  this.leftViewMatrix = new Float32Array(16);
  this.rightProjectionMatrix = new Float32Array(16);
  this.rightViewMatrix = new Float32Array(16);
  this.pose = null;
}
function VRDisplayCapabilities(config) {
  Object.defineProperties(this, {
    hasPosition: {
      writable: false, enumerable: true, value: config.hasPosition
    },
    hasExternalDisplay: {
      writable: false, enumerable: true, value: config.hasExternalDisplay
    },
    canPresent: {
      writable: false, enumerable: true, value: config.canPresent
    },
    maxLayers: {
      writable: false, enumerable: true, value: config.maxLayers
    },
    hasOrientation: {
      enumerable: true, get: function get() {
        deprecateWarning('VRDisplayCapabilities.prototype.hasOrientation', 'VRDisplay.prototype.getFrameData');
        return config.hasOrientation;
      }
    }
  });
}
function VRDisplay(config) {
  config = config || {};
  var USE_WAKELOCK = 'wakelock' in config ? config.wakelock : true;
  this.isPolyfilled = true;
  this.displayId = nextDisplayId++;
  this.displayName = '';
  this.depthNear = 0.01;
  this.depthFar = 10000.0;
  this.isPresenting = false;
  Object.defineProperty(this, 'isConnected', {
    get: function get() {
      deprecateWarning('VRDisplay.prototype.isConnected', 'VRDisplayCapabilities.prototype.hasExternalDisplay');
      return false;
    }
  });
  this.capabilities = new VRDisplayCapabilities({
    hasPosition: false,
    hasOrientation: false,
    hasExternalDisplay: false,
    canPresent: false,
    maxLayers: 1
  });
  this.stageParameters = null;
  this.waitingForPresent_ = false;
  this.layer_ = null;
  this.originalParent_ = null;
  this.fullscreenElement_ = null;
  this.fullscreenWrapper_ = null;
  this.fullscreenElementCachedStyle_ = null;
  this.fullscreenEventTarget_ = null;
  this.fullscreenChangeHandler_ = null;
  this.fullscreenErrorHandler_ = null;
  if (USE_WAKELOCK && isMobile()) {
    this.wakelock_ = new NoSleep$1();
  }
}
VRDisplay.prototype.getFrameData = function (frameData) {
  return frameDataFromPose(frameData, this._getPose(), this);
};
VRDisplay.prototype.getPose = function () {
  deprecateWarning('VRDisplay.prototype.getPose', 'VRDisplay.prototype.getFrameData');
  return this._getPose();
};
VRDisplay.prototype.resetPose = function () {
  deprecateWarning('VRDisplay.prototype.resetPose');
  return this._resetPose();
};
VRDisplay.prototype.getImmediatePose = function () {
  deprecateWarning('VRDisplay.prototype.getImmediatePose', 'VRDisplay.prototype.getFrameData');
  return this._getPose();
};
VRDisplay.prototype.requestAnimationFrame = function (callback) {
  return raf(callback);
};
VRDisplay.prototype.cancelAnimationFrame = function (id) {
  return caf(id);
};
VRDisplay.prototype.wrapForFullscreen = function (element) {
  if (isIOS()) {
    return element;
  }
  if (!this.fullscreenWrapper_) {
    this.fullscreenWrapper_ = document.createElement('div');
    var cssProperties = ['height: ' + Math.min(screen.height, screen.width) + 'px !important', 'top: 0 !important', 'left: 0 !important', 'right: 0 !important', 'border: 0', 'margin: 0', 'padding: 0', 'z-index: 999999 !important', 'position: fixed'];
    this.fullscreenWrapper_.setAttribute('style', cssProperties.join('; ') + ';');
    this.fullscreenWrapper_.classList.add('webvr-polyfill-fullscreen-wrapper');
  }
  if (this.fullscreenElement_ == element) {
    return this.fullscreenWrapper_;
  }
  if (this.fullscreenElement_) {
    if (this.originalParent_) {
      this.originalParent_.appendChild(this.fullscreenElement_);
    } else {
      this.fullscreenElement_.parentElement.removeChild(this.fullscreenElement_);
    }
  }
  this.fullscreenElement_ = element;
  this.originalParent_ = element.parentElement;
  if (!this.originalParent_) {
    document.body.appendChild(element);
  }
  if (!this.fullscreenWrapper_.parentElement) {
    var parent = this.fullscreenElement_.parentElement;
    parent.insertBefore(this.fullscreenWrapper_, this.fullscreenElement_);
    parent.removeChild(this.fullscreenElement_);
  }
  this.fullscreenWrapper_.insertBefore(this.fullscreenElement_, this.fullscreenWrapper_.firstChild);
  this.fullscreenElementCachedStyle_ = this.fullscreenElement_.getAttribute('style');
  var self = this;
  function applyFullscreenElementStyle() {
    if (!self.fullscreenElement_) {
      return;
    }
    var cssProperties = ['position: absolute', 'top: 0', 'left: 0', 'width: ' + Math.max(screen.width, screen.height) + 'px', 'height: ' + Math.min(screen.height, screen.width) + 'px', 'border: 0', 'margin: 0', 'padding: 0'];
    self.fullscreenElement_.setAttribute('style', cssProperties.join('; ') + ';');
  }
  applyFullscreenElementStyle();
  return this.fullscreenWrapper_;
};
VRDisplay.prototype.removeFullscreenWrapper = function () {
  if (!this.fullscreenElement_) {
    return;
  }
  var element = this.fullscreenElement_;
  if (this.fullscreenElementCachedStyle_) {
    element.setAttribute('style', this.fullscreenElementCachedStyle_);
  } else {
    element.removeAttribute('style');
  }
  this.fullscreenElement_ = null;
  this.fullscreenElementCachedStyle_ = null;
  var parent = this.fullscreenWrapper_.parentElement;
  this.fullscreenWrapper_.removeChild(element);
  if (this.originalParent_ === parent) {
    parent.insertBefore(element, this.fullscreenWrapper_);
  }
  else if (this.originalParent_) {
      this.originalParent_.appendChild(element);
    }
  parent.removeChild(this.fullscreenWrapper_);
  return element;
};
VRDisplay.prototype.requestPresent = function (layers) {
  var wasPresenting = this.isPresenting;
  var self = this;
  if (!(layers instanceof Array)) {
    deprecateWarning('VRDisplay.prototype.requestPresent with non-array argument', 'an array of VRLayers as the first argument');
    layers = [layers];
  }
  return new Promise(function (resolve, reject) {
    if (!self.capabilities.canPresent) {
      reject(new Error('VRDisplay is not capable of presenting.'));
      return;
    }
    if (layers.length == 0 || layers.length > self.capabilities.maxLayers) {
      reject(new Error('Invalid number of layers.'));
      return;
    }
    var incomingLayer = layers[0];
    if (!incomingLayer.source) {
      resolve();
      return;
    }
    var leftBounds = incomingLayer.leftBounds || defaultLeftBounds;
    var rightBounds = incomingLayer.rightBounds || defaultRightBounds;
    if (wasPresenting) {
      var layer = self.layer_;
      if (layer.source !== incomingLayer.source) {
        layer.source = incomingLayer.source;
      }
      for (var i = 0; i < 4; i++) {
        layer.leftBounds[i] = leftBounds[i];
        layer.rightBounds[i] = rightBounds[i];
      }
      self.wrapForFullscreen(self.layer_.source);
      self.updatePresent_();
      resolve();
      return;
    }
    self.layer_ = {
      predistorted: incomingLayer.predistorted,
      source: incomingLayer.source,
      leftBounds: leftBounds.slice(0),
      rightBounds: rightBounds.slice(0)
    };
    self.waitingForPresent_ = false;
    if (self.layer_ && self.layer_.source) {
      var fullscreenElement = self.wrapForFullscreen(self.layer_.source);
      var onFullscreenChange = function onFullscreenChange() {
        var actualFullscreenElement = getFullscreenElement();
        self.isPresenting = fullscreenElement === actualFullscreenElement;
        if (self.isPresenting) {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape-primary').catch(function (error) {
              console.error('screen.orientation.lock() failed due to', error.message);
            });
          }
          self.waitingForPresent_ = false;
          self.beginPresent_();
          resolve();
        } else {
          if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
          }
          self.removeFullscreenWrapper();
          self.disableWakeLock();
          self.endPresent_();
          self.removeFullscreenListeners_();
        }
        self.fireVRDisplayPresentChange_();
      };
      var onFullscreenError = function onFullscreenError() {
        if (!self.waitingForPresent_) {
          return;
        }
        self.removeFullscreenWrapper();
        self.removeFullscreenListeners_();
        self.disableWakeLock();
        self.waitingForPresent_ = false;
        self.isPresenting = false;
        reject(new Error('Unable to present.'));
      };
      self.addFullscreenListeners_(fullscreenElement, onFullscreenChange, onFullscreenError);
      if (requestFullscreen(fullscreenElement)) {
        self.enableWakeLock();
        self.waitingForPresent_ = true;
      } else if (isIOS() || isWebViewAndroid()) {
        self.enableWakeLock();
        self.isPresenting = true;
        self.beginPresent_();
        self.fireVRDisplayPresentChange_();
        resolve();
      }
    }
    if (!self.waitingForPresent_ && !isIOS()) {
      exitFullscreen();
      reject(new Error('Unable to present.'));
    }
  });
};
VRDisplay.prototype.exitPresent = function () {
  var wasPresenting = this.isPresenting;
  var self = this;
  this.isPresenting = false;
  this.layer_ = null;
  this.disableWakeLock();
  return new Promise(function (resolve, reject) {
    if (wasPresenting) {
      if (!exitFullscreen() && isIOS()) {
        self.endPresent_();
        self.fireVRDisplayPresentChange_();
      }
      if (isWebViewAndroid()) {
        self.removeFullscreenWrapper();
        self.removeFullscreenListeners_();
        self.endPresent_();
        self.fireVRDisplayPresentChange_();
      }
      resolve();
    } else {
      reject(new Error('Was not presenting to VRDisplay.'));
    }
  });
};
VRDisplay.prototype.getLayers = function () {
  if (this.layer_) {
    return [this.layer_];
  }
  return [];
};
VRDisplay.prototype.fireVRDisplayPresentChange_ = function () {
  var event = new CustomEvent('vrdisplaypresentchange', { detail: { display: this } });
  window.dispatchEvent(event);
};
VRDisplay.prototype.fireVRDisplayConnect_ = function () {
  var event = new CustomEvent('vrdisplayconnect', { detail: { display: this } });
  window.dispatchEvent(event);
};
VRDisplay.prototype.addFullscreenListeners_ = function (element, changeHandler, errorHandler) {
  this.removeFullscreenListeners_();
  this.fullscreenEventTarget_ = element;
  this.fullscreenChangeHandler_ = changeHandler;
  this.fullscreenErrorHandler_ = errorHandler;
  if (changeHandler) {
    if (document.fullscreenEnabled) {
      element.addEventListener('fullscreenchange', changeHandler, false);
    } else if (document.webkitFullscreenEnabled) {
      element.addEventListener('webkitfullscreenchange', changeHandler, false);
    } else if (document.mozFullScreenEnabled) {
      document.addEventListener('mozfullscreenchange', changeHandler, false);
    } else if (document.msFullscreenEnabled) {
      element.addEventListener('msfullscreenchange', changeHandler, false);
    }
  }
  if (errorHandler) {
    if (document.fullscreenEnabled) {
      element.addEventListener('fullscreenerror', errorHandler, false);
    } else if (document.webkitFullscreenEnabled) {
      element.addEventListener('webkitfullscreenerror', errorHandler, false);
    } else if (document.mozFullScreenEnabled) {
      document.addEventListener('mozfullscreenerror', errorHandler, false);
    } else if (document.msFullscreenEnabled) {
      element.addEventListener('msfullscreenerror', errorHandler, false);
    }
  }
};
VRDisplay.prototype.removeFullscreenListeners_ = function () {
  if (!this.fullscreenEventTarget_) return;
  var element = this.fullscreenEventTarget_;
  if (this.fullscreenChangeHandler_) {
    var changeHandler = this.fullscreenChangeHandler_;
    element.removeEventListener('fullscreenchange', changeHandler, false);
    element.removeEventListener('webkitfullscreenchange', changeHandler, false);
    document.removeEventListener('mozfullscreenchange', changeHandler, false);
    element.removeEventListener('msfullscreenchange', changeHandler, false);
  }
  if (this.fullscreenErrorHandler_) {
    var errorHandler = this.fullscreenErrorHandler_;
    element.removeEventListener('fullscreenerror', errorHandler, false);
    element.removeEventListener('webkitfullscreenerror', errorHandler, false);
    document.removeEventListener('mozfullscreenerror', errorHandler, false);
    element.removeEventListener('msfullscreenerror', errorHandler, false);
  }
  this.fullscreenEventTarget_ = null;
  this.fullscreenChangeHandler_ = null;
  this.fullscreenErrorHandler_ = null;
};
VRDisplay.prototype.enableWakeLock = function () {
  if (this.wakelock_) {
    this.wakelock_.enable();
  }
};
VRDisplay.prototype.disableWakeLock = function () {
  if (this.wakelock_) {
    this.wakelock_.disable();
  }
};
VRDisplay.prototype.beginPresent_ = function () {
};
VRDisplay.prototype.endPresent_ = function () {
};
VRDisplay.prototype.submitFrame = function (pose) {
};
VRDisplay.prototype.getEyeParameters = function (whichEye) {
  return null;
};
var config = {
  MOBILE_WAKE_LOCK: true,
  DEBUG: false,
  DPDB_URL: 'https://dpdb.webvr.rocks/dpdb.json',
  K_FILTER: 0.98,
  PREDICTION_TIME_S: 0.040,
  CARDBOARD_UI_DISABLED: false,
  ROTATE_INSTRUCTIONS_DISABLED: false,
  YAW_ONLY: false,
  BUFFER_SCALE: 0.5,
  DIRTY_SUBMIT_FRAME_BINDINGS: false
};
var Eye = {
  LEFT: 'left',
  RIGHT: 'right'
};
function CardboardVRDisplay(config$$1) {
  var defaults = extend({}, config);
  config$$1 = extend(defaults, config$$1 || {});
  VRDisplay.call(this, {
    wakelock: config$$1.MOBILE_WAKE_LOCK
  });
  this.config = config$$1;
  this.displayName = 'Cardboard VRDisplay';
  this.capabilities = new VRDisplayCapabilities({
    hasPosition: false,
    hasOrientation: true,
    hasExternalDisplay: false,
    canPresent: true,
    maxLayers: 1
  });
  this.stageParameters = null;
  this.bufferScale_ = this.config.BUFFER_SCALE;
  this.poseSensor_ = new PoseSensor(this.config);
  this.distorter_ = null;
  this.cardboardUI_ = null;
  this.dpdb_ = new Dpdb(this.config.DPDB_URL, this.onDeviceParamsUpdated_.bind(this));
  this.deviceInfo_ = new DeviceInfo(this.dpdb_.getDeviceParams());
  this.viewerSelector_ = new ViewerSelector();
  this.viewerSelector_.onChange(this.onViewerChanged_.bind(this));
  this.deviceInfo_.setViewer(this.viewerSelector_.getCurrentViewer());
  if (!this.config.ROTATE_INSTRUCTIONS_DISABLED) {
    this.rotateInstructions_ = new RotateInstructions();
  }
  if (isIOS()) {
    window.addEventListener('resize', this.onResize_.bind(this));
  }
}
CardboardVRDisplay.prototype = Object.create(VRDisplay.prototype);
CardboardVRDisplay.prototype._getPose = function () {
  return {
    position: null,
    orientation: this.poseSensor_.getOrientation(),
    linearVelocity: null,
    linearAcceleration: null,
    angularVelocity: null,
    angularAcceleration: null
  };
};
CardboardVRDisplay.prototype._resetPose = function () {
  if (this.poseSensor_.resetPose) {
    this.poseSensor_.resetPose();
  }
};
CardboardVRDisplay.prototype._getFieldOfView = function (whichEye) {
  var fieldOfView;
  if (whichEye == Eye.LEFT) {
    fieldOfView = this.deviceInfo_.getFieldOfViewLeftEye();
  } else if (whichEye == Eye.RIGHT) {
    fieldOfView = this.deviceInfo_.getFieldOfViewRightEye();
  } else {
    console.error('Invalid eye provided: %s', whichEye);
    return null;
  }
  return fieldOfView;
};
CardboardVRDisplay.prototype._getEyeOffset = function (whichEye) {
  var offset;
  if (whichEye == Eye.LEFT) {
    offset = [-this.deviceInfo_.viewer.interLensDistance * 0.5, 0.0, 0.0];
  } else if (whichEye == Eye.RIGHT) {
    offset = [this.deviceInfo_.viewer.interLensDistance * 0.5, 0.0, 0.0];
  } else {
    console.error('Invalid eye provided: %s', whichEye);
    return null;
  }
  return offset;
};
CardboardVRDisplay.prototype.getEyeParameters = function (whichEye) {
  var offset = this._getEyeOffset(whichEye);
  var fieldOfView = this._getFieldOfView(whichEye);
  var eyeParams = {
    offset: offset,
    renderWidth: this.deviceInfo_.device.width * 0.5 * this.bufferScale_,
    renderHeight: this.deviceInfo_.device.height * this.bufferScale_
  };
  Object.defineProperty(eyeParams, 'fieldOfView', {
    enumerable: true,
    get: function get() {
      deprecateWarning('VRFieldOfView', 'VRFrameData\'s projection matrices');
      return fieldOfView;
    }
  });
  return eyeParams;
};
CardboardVRDisplay.prototype.onDeviceParamsUpdated_ = function (newParams) {
  if (this.config.DEBUG) {
    console.log('DPDB reported that device params were updated.');
  }
  this.deviceInfo_.updateDeviceParams(newParams);
  if (this.distorter_) {
    this.distorter_.updateDeviceInfo(this.deviceInfo_);
  }
};
CardboardVRDisplay.prototype.updateBounds_ = function () {
  if (this.layer_ && this.distorter_ && (this.layer_.leftBounds || this.layer_.rightBounds)) {
    this.distorter_.setTextureBounds(this.layer_.leftBounds, this.layer_.rightBounds);
  }
};
CardboardVRDisplay.prototype.beginPresent_ = function () {
  var gl = this.layer_.source.getContext('webgl');
  if (!gl) gl = this.layer_.source.getContext('experimental-webgl');
  if (!gl) gl = this.layer_.source.getContext('webgl2');
  if (!gl) return;
  if (this.layer_.predistorted) {
    if (!this.config.CARDBOARD_UI_DISABLED) {
      gl.canvas.width = getScreenWidth() * this.bufferScale_;
      gl.canvas.height = getScreenHeight() * this.bufferScale_;
      this.cardboardUI_ = new CardboardUI(gl);
    }
  } else {
    if (!this.config.CARDBOARD_UI_DISABLED) {
      this.cardboardUI_ = new CardboardUI(gl);
    }
    this.distorter_ = new CardboardDistorter(gl, this.cardboardUI_, this.config.BUFFER_SCALE, this.config.DIRTY_SUBMIT_FRAME_BINDINGS);
    this.distorter_.updateDeviceInfo(this.deviceInfo_);
  }
  if (this.cardboardUI_) {
    this.cardboardUI_.listen(function (e) {
      this.viewerSelector_.show(this.layer_.source.parentElement);
      e.stopPropagation();
      e.preventDefault();
    }.bind(this), function (e) {
      this.exitPresent();
      e.stopPropagation();
      e.preventDefault();
    }.bind(this));
  }
  if (this.rotateInstructions_) {
    if (isLandscapeMode() && isMobile()) {
      this.rotateInstructions_.showTemporarily(3000, this.layer_.source.parentElement);
    } else {
      this.rotateInstructions_.update();
    }
  }
  this.orientationHandler = this.onOrientationChange_.bind(this);
  window.addEventListener('orientationchange', this.orientationHandler);
  this.vrdisplaypresentchangeHandler = this.updateBounds_.bind(this);
  window.addEventListener('vrdisplaypresentchange', this.vrdisplaypresentchangeHandler);
  this.fireVRDisplayDeviceParamsChange_();
};
CardboardVRDisplay.prototype.endPresent_ = function () {
  if (this.distorter_) {
    this.distorter_.destroy();
    this.distorter_ = null;
  }
  if (this.cardboardUI_) {
    this.cardboardUI_.destroy();
    this.cardboardUI_ = null;
  }
  if (this.rotateInstructions_) {
    this.rotateInstructions_.hide();
  }
  this.viewerSelector_.hide();
  window.removeEventListener('orientationchange', this.orientationHandler);
  window.removeEventListener('vrdisplaypresentchange', this.vrdisplaypresentchangeHandler);
};
CardboardVRDisplay.prototype.updatePresent_ = function () {
  this.endPresent_();
  this.beginPresent_();
};
CardboardVRDisplay.prototype.submitFrame = function (pose) {
  if (this.distorter_) {
    this.updateBounds_();
    this.distorter_.submitFrame();
  } else if (this.cardboardUI_ && this.layer_) {
    var canvas = this.layer_.source.getContext('webgl').canvas;
    if (canvas.width != this.lastWidth || canvas.height != this.lastHeight) {
      this.cardboardUI_.onResize();
    }
    this.lastWidth = canvas.width;
    this.lastHeight = canvas.height;
    this.cardboardUI_.render();
  }
};
CardboardVRDisplay.prototype.onOrientationChange_ = function (e) {
  this.viewerSelector_.hide();
  if (this.rotateInstructions_) {
    this.rotateInstructions_.update();
  }
  this.onResize_();
};
CardboardVRDisplay.prototype.onResize_ = function (e) {
  if (this.layer_) {
    var gl = this.layer_.source.getContext('webgl');
    var cssProperties = ['position: absolute', 'top: 0', 'left: 0',
    'width: 100vw', 'height: 100vh', 'border: 0', 'margin: 0',
    'padding: 0px', 'box-sizing: content-box'];
    gl.canvas.setAttribute('style', cssProperties.join('; ') + ';');
    safariCssSizeWorkaround(gl.canvas);
  }
};
CardboardVRDisplay.prototype.onViewerChanged_ = function (viewer) {
  this.deviceInfo_.setViewer(viewer);
  if (this.distorter_) {
    this.distorter_.updateDeviceInfo(this.deviceInfo_);
  }
  this.fireVRDisplayDeviceParamsChange_();
};
CardboardVRDisplay.prototype.fireVRDisplayDeviceParamsChange_ = function () {
  var event = new CustomEvent('vrdisplaydeviceparamschange', {
    detail: {
      vrdisplay: this,
      deviceInfo: this.deviceInfo_
    }
  });
  window.dispatchEvent(event);
};
CardboardVRDisplay.VRFrameData = VRFrameData;
CardboardVRDisplay.VRDisplay = VRDisplay;
return CardboardVRDisplay;
})));
});
var CardboardVRDisplay = unwrapExports(cardboardVrDisplay);

var version = "0.10.5";

var DefaultConfig = {
  PROVIDE_MOBILE_VRDISPLAY: true,
  GET_VR_DISPLAYS_TIMEOUT: 1000,
  MOBILE_WAKE_LOCK: true,
  DEBUG: false,
  DPDB_URL: 'https://dpdb.webvr.rocks/dpdb.json',
  K_FILTER: 0.98,
  PREDICTION_TIME_S: 0.040,
  TOUCH_PANNER_DISABLED: true,
  CARDBOARD_UI_DISABLED: false,
  ROTATE_INSTRUCTIONS_DISABLED: false,
  YAW_ONLY: false,
  BUFFER_SCALE: 0.5,
  DIRTY_SUBMIT_FRAME_BINDINGS: false
};

function WebVRPolyfill(config) {
  this.config = extend(extend({}, DefaultConfig), config);
  this.polyfillDisplays = [];
  this.enabled = false;
  this.hasNative = 'getVRDisplays' in navigator;
  this.native = {};
  this.native.getVRDisplays = navigator.getVRDisplays;
  this.native.VRFrameData = window.VRFrameData;
  this.native.VRDisplay = window.VRDisplay;
  if (!this.hasNative || this.config.PROVIDE_MOBILE_VRDISPLAY && isMobile()) {
    this.enable();
    this.getVRDisplays().then(function (displays) {
      if (displays && displays[0] && displays[0].fireVRDisplayConnect_) {
        displays[0].fireVRDisplayConnect_();
      }
    });
  }
}
WebVRPolyfill.prototype.getPolyfillDisplays = function () {
  if (this._polyfillDisplaysPopulated) {
    return this.polyfillDisplays;
  }
  if (isMobile()) {
    var vrDisplay = new CardboardVRDisplay({
      MOBILE_WAKE_LOCK: this.config.MOBILE_WAKE_LOCK,
      DEBUG: this.config.DEBUG,
      DPDB_URL: this.config.DPDB_URL,
      CARDBOARD_UI_DISABLED: this.config.CARDBOARD_UI_DISABLED,
      K_FILTER: this.config.K_FILTER,
      PREDICTION_TIME_S: this.config.PREDICTION_TIME_S,
      TOUCH_PANNER_DISABLED: this.config.TOUCH_PANNER_DISABLED,
      ROTATE_INSTRUCTIONS_DISABLED: this.config.ROTATE_INSTRUCTIONS_DISABLED,
      YAW_ONLY: this.config.YAW_ONLY,
      BUFFER_SCALE: this.config.BUFFER_SCALE,
      DIRTY_SUBMIT_FRAME_BINDINGS: this.config.DIRTY_SUBMIT_FRAME_BINDINGS
    });
    this.polyfillDisplays.push(vrDisplay);
  }
  this._polyfillDisplaysPopulated = true;
  return this.polyfillDisplays;
};
WebVRPolyfill.prototype.enable = function () {
  this.enabled = true;
  if (this.hasNative && this.native.VRFrameData) {
    var NativeVRFrameData = this.native.VRFrameData;
    var nativeFrameData = new this.native.VRFrameData();
    var nativeGetFrameData = this.native.VRDisplay.prototype.getFrameData;
    window.VRDisplay.prototype.getFrameData = function (frameData) {
      if (frameData instanceof NativeVRFrameData) {
        nativeGetFrameData.call(this, frameData);
        return;
      }
      nativeGetFrameData.call(this, nativeFrameData);
      frameData.pose = nativeFrameData.pose;
      copyArray(nativeFrameData.leftProjectionMatrix, frameData.leftProjectionMatrix);
      copyArray(nativeFrameData.rightProjectionMatrix, frameData.rightProjectionMatrix);
      copyArray(nativeFrameData.leftViewMatrix, frameData.leftViewMatrix);
      copyArray(nativeFrameData.rightViewMatrix, frameData.rightViewMatrix);
    };
  }
  navigator.getVRDisplays = this.getVRDisplays.bind(this);
  window.VRDisplay = CardboardVRDisplay.VRDisplay;
  window.VRFrameData = CardboardVRDisplay.VRFrameData;
};
WebVRPolyfill.prototype.getVRDisplays = function () {
  var _this = this;
  var config = this.config;
  if (!this.hasNative) {
    return Promise.resolve(this.getPolyfillDisplays());
  }
  var timeoutId;
  var vrDisplaysNative = this.native.getVRDisplays.call(navigator);
  var timeoutPromise = new Promise(function (resolve) {
    timeoutId = setTimeout(function () {
      console.warn('Native WebVR implementation detected, but `getVRDisplays()` failed to resolve. Falling back to polyfill.');
      resolve([]);
    }, config.GET_VR_DISPLAYS_TIMEOUT);
  });
  return race([vrDisplaysNative, timeoutPromise]).then(function (nativeDisplays) {
    clearTimeout(timeoutId);
    return nativeDisplays.length > 0 ? nativeDisplays : _this.getPolyfillDisplays();
  });
};
WebVRPolyfill.version = version;
WebVRPolyfill.VRFrameData = CardboardVRDisplay.VRFrameData;
WebVRPolyfill.VRDisplay = CardboardVRDisplay.VRDisplay;


var webvrPolyfill = Object.freeze({
	default: WebVRPolyfill
});

var require$$0 = ( webvrPolyfill && WebVRPolyfill ) || webvrPolyfill;

if (typeof commonjsGlobal !== 'undefined' && commonjsGlobal.window) {
  if (!commonjsGlobal.document) {
    commonjsGlobal.document = commonjsGlobal.window.document;
  }
  if (!commonjsGlobal.navigator) {
    commonjsGlobal.navigator = commonjsGlobal.window.navigator;
  }
}
var src = require$$0;

return src;

})));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],10:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var EventEmitter = _dereq_('eventemitter3');
var shaka = _dereq_('shaka-player');

var Types = _dereq_('../video-type');
var Util = _dereq_('../util');

var DEFAULT_BITS_PER_SECOND = 1000000;

/**
 * Supports regular video URLs (eg. mp4), as well as adaptive manifests like
 * DASH (.mpd) and soon HLS (.m3u8).
 *
 * Events:
 *   load(video): When the video is loaded.
 *   error(message): If an error occurs.
 *
 * To play/pause/seek/etc, please use the underlying video element.
 */
function AdaptivePlayer(params) {
  this.video = document.createElement('video');
  // Loop by default.
  if (params.loop === true) {
    this.video.setAttribute('loop', true);
  }

  if (params.volume !== undefined) {
    // XXX: .setAttribute('volume', params.volume) doesn't work for some reason.
    this.video.volume = params.volume;
  }

  // Not muted by default.
  if (params.muted === true) {
    this.video.muted = params.muted;
  }

  // For FF, make sure we enable preload.
  this.video.setAttribute('preload', 'auto');
  // Enable inline video playback in iOS 10+.
  this.video.setAttribute('playsinline', true);
  this.video.setAttribute('crossorigin', 'anonymous');
}
AdaptivePlayer.prototype = new EventEmitter();

AdaptivePlayer.prototype.load = function(url) {
  var self = this;
  // TODO(smus): Investigate whether or not differentiation is best done by
  // mimeType after all. Cursory research suggests that adaptive streaming
  // manifest mime types aren't properly supported.
  //
  // For now, make determination based on extension.
  var extension = Util.getExtension(url);
  switch (extension) {
    case 'm3u8': // HLS
      this.type = Types.HLS;
      if (Util.isSafari()) {
        this.loadVideo_(url).then(function() {
          self.emit('load', self.video, self.type);
        }).catch(this.onError_.bind(this));
      } else {
        self.onError_('HLS is only supported on Safari.');
      }
      break;
    case 'mpd': // MPEG-DASH
      this.type = Types.DASH;
      this.loadShakaVideo_(url).then(function() {
        console.log('The video has now been loaded!');
        self.emit('load', self.video, self.type);
      }).catch(this.onError_.bind(this));
      break;
    default: // A regular video, not an adaptive manifest.
      this.type = Types.VIDEO;
      this.loadVideo_(url).then(function() {
        self.emit('load', self.video, self.type);
      }).catch(this.onError_.bind(this));
      break;
  }
};

AdaptivePlayer.prototype.destroy = function() {
  this.video.pause();
  this.video.src = '';
  this.video = null;
};

/*** PRIVATE API ***/

AdaptivePlayer.prototype.onError_ = function(e) {
  console.error(e);
  this.emit('error', e);
};

AdaptivePlayer.prototype.loadVideo_ = function(url) {
  var self = this, video = self.video;
  return new Promise(function(resolve, reject) {
    video.src = url;
    video.addEventListener('canplaythrough', resolve);
    video.addEventListener('loadedmetadata', function() {
      self.emit('timeupdate', {
        currentTime: video.currentTime,
        duration: video.duration
      });
    });
    video.addEventListener('error', reject);
    video.load();
  });
};

AdaptivePlayer.prototype.initShaka_ = function() {
  this.player = new shaka.Player(this.video);

  this.player.configure({
    abr: { defaultBandwidthEstimate: DEFAULT_BITS_PER_SECOND }
  });

  // Listen for error events.
  this.player.addEventListener('error', this.onError_);
};

AdaptivePlayer.prototype.loadShakaVideo_ = function(url) {
  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();

  if (!shaka.Player.isBrowserSupported()) {
    console.error('Shaka is not supported on this browser.');
    return;
  }

  this.initShaka_();
  return this.player.load(url);
};

module.exports = AdaptivePlayer;

},{"../util":26,"../video-type":27,"eventemitter3":3,"shaka-player":5}],11:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function Analytics() {
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-35315454-8', 'auto');
  ga('send', 'pageview');

  this.lastModeChangeTime = window.performance.now();
  this.lastModeLabel = Analytics.MODE_LABELS[0];
}

Analytics.MODE_LABELS = {
  0: 'UNKNOWN',
  1: 'NORMAL',
  2: 'MAGIC_WINDOW',
  3: 'VR'
};


Analytics.prototype.logModeChanged = function(mode) {
  var modeLabel = Analytics.MODE_LABELS[mode];
  var lastModeLabel = Analytics.MODE_LABELS[this.lastMode];

  console.log('Analytics: going from mode %s to %s', lastModeLabel, modeLabel);

  ga('send', 'screenview', {
    appName: 'EmbedVR',
    screenName: modeLabel
  });

  var now = window.performance.now();
  var msSinceLastModeChange = Math.round(now - this.lastModeChangeTime);
  ga('send', 'timing', 'Time spent in mode', lastModeLabel, msSinceLastModeChange);

  this.lastModeChangeTime = now;
  this.lastMode = mode;
}

window.analytics = new Analytics();

},{}],12:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Eyes = {
  LEFT: 1,
  RIGHT: 2
};

module.exports = Eyes;

},{}],13:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var EventEmitter = _dereq_('eventemitter3');
var TWEEN = _dereq_('@tweenjs/tween.js');

var Util = _dereq_('../util');

// Constants for the focus/blur animation.
var NORMAL_SCALE = new THREE.Vector3(1, 1, 1);
var FOCUS_SCALE = new THREE.Vector3(1.2, 1.2, 1.2);
var FOCUS_DURATION = 200;

// Constants for the active/inactive animation.
var INACTIVE_COLOR = new THREE.Color(1, 1, 1);
var ACTIVE_COLOR = new THREE.Color(0.8, 0, 0);
var ACTIVE_DURATION = 100;

// Constants for opacity.
var MAX_INNER_OPACITY = 0.8;
var MAX_OUTER_OPACITY = 0.5;
var FADE_START_ANGLE_DEG = 35;
var FADE_END_ANGLE_DEG = 60;
/**
 * Responsible for rectangular hot spots that the user can interact with.
 *
 * Specific duties:
 *   Adding and removing hotspots.
 *   Rendering the hotspots (debug mode only).
 *   Notifying when hotspots are interacted with.
 *
 * Emits the following events:
 *   click (id): a hotspot is clicked.
 *   focus (id): a hotspot is focused.
 *   blur (id): a hotspot is no longer hovered over.
 */
function HotspotRenderer(worldRenderer) {
  this.worldRenderer = worldRenderer;
  this.scene = worldRenderer.scene;

  // Note: this event must be added to document.body and not to window for it to
  // work inside iOS iframes.
  var body = document.body;
  // Bind events for hotspot interaction.
  if (!Util.isMobile()) {
    // Only enable mouse events on desktop.
    body.addEventListener('mousedown', this.onMouseDown_.bind(this), false);
    body.addEventListener('mousemove', this.onMouseMove_.bind(this), false);
    body.addEventListener('mouseup', this.onMouseUp_.bind(this), false);
  }
  body.addEventListener('touchstart', this.onTouchStart_.bind(this), false);
  body.addEventListener('touchend', this.onTouchEnd_.bind(this), false);

  // Add a placeholder for hotspots.
  this.hotspotRoot = new THREE.Object3D();
  // Align the center with the center of the camera too.
  this.hotspotRoot.rotation.y = Math.PI / 2;
  this.scene.add(this.hotspotRoot);

  // All hotspot IDs.
  this.hotspots = {};

  // Currently selected hotspots.
  this.selectedHotspots = {};

  // Hotspots that the last touchstart / mousedown event happened for.
  this.downHotspots = {};

  // For raycasting. Initialize mouse to be off screen initially.
  this.pointer = new THREE.Vector2(1, 1);
  this.raycaster = new THREE.Raycaster();
}
HotspotRenderer.prototype = new EventEmitter();

/**
 * @param pitch {Number} The latitude of center, specified in degrees, between
 * -90 and 90, with 0 at the horizon.
 * @param yaw {Number} The longitude of center, specified in degrees, between
 * -180 and 180, with 0 at the image center.
 * @param radius {Number} The radius of the hotspot, specified in meters.
 * @param distance {Number} The distance of the hotspot from camera, specified
 * in meters.
 * @param hotspotId {String} The ID of the hotspot.
 */
HotspotRenderer.prototype.add = function(pitch, yaw, radius, distance, id) {
  // If a hotspot already exists with this ID, stop.
  if (this.hotspots[id]) {
    // TODO: Proper error reporting.
    console.error('Attempt to add hotspot with existing id %s.', id);
    return;
  }
  var hotspot = this.createHotspot_(radius, distance);
  hotspot.name = id;

  // Position the hotspot based on the pitch and yaw specified.
  var quat = new THREE.Quaternion();
  quat.setFromEuler(new THREE.Euler(THREE.Math.degToRad(pitch), THREE.Math.degToRad(yaw), 0, 'ZYX'));
  hotspot.position.applyQuaternion(quat);
  hotspot.lookAt(new THREE.Vector3());

  this.hotspotRoot.add(hotspot);
  this.hotspots[id] = hotspot;
}

/**
 * Removes a hotspot based on the ID.
 *
 * @param ID {String} Identifier of the hotspot to be removed.
 */
HotspotRenderer.prototype.remove = function(id) {
  // If there's no hotspot with this ID, fail.
  if (!this.hotspots[id]) {
    // TODO: Proper error reporting.
    console.error('Attempt to remove non-existing hotspot with id %s.', id);
    return;
  }
  // Remove the mesh from the scene.
  this.hotspotRoot.remove(this.hotspots[id]);

  // If this hotspot was selected, make sure it gets unselected.
  delete this.selectedHotspots[id];
  delete this.downHotspots[id];
  delete this.hotspots[id];
  this.emit('blur', id);
};

/**
 * Clears all hotspots from the pano. Often called when changing panos.
 */
HotspotRenderer.prototype.clearAll = function() {
  for (var id in this.hotspots) {
    this.remove(id);
  }
};

HotspotRenderer.prototype.getCount = function() {
  var count = 0;
  for (var id in this.hotspots) {
    count += 1;
  }
  return count;
};

HotspotRenderer.prototype.update = function(camera) {
  if (this.worldRenderer.isVRMode()) {
    this.pointer.set(0, 0);
  }
  // Update the picking ray with the camera and mouse position.
  this.raycaster.setFromCamera(this.pointer, camera);

  // Fade hotspots out if they are really far from center to avoid overly
  // distorted visuals.
  this.fadeOffCenterHotspots_(camera);

  var hotspots = this.hotspotRoot.children;

  // Go through all hotspots to see if they are currently selected.
  for (var i = 0; i < hotspots.length; i++) {
    var hotspot = hotspots[i];
    //hotspot.lookAt(camera.position);
    var id = hotspot.name;
    // Check if hotspot is intersected with the picking ray.
    var intersects = this.raycaster.intersectObjects(hotspot.children);
    var isIntersected = (intersects.length > 0);

    // If newly selected, emit a focus event.
    if (isIntersected && !this.selectedHotspots[id]) {
      this.emit('focus', id);
      this.focus_(id);
    }
    // If no longer selected, emit a blur event.
    if (!isIntersected && this.selectedHotspots[id]) {
      this.emit('blur', id);
      this.blur_(id);
    }
    // Update the set of selected hotspots.
    if (isIntersected) {
      this.selectedHotspots[id] = true;
    } else {
      delete this.selectedHotspots[id];
    }
  }
};

/**
 * Toggle whether or not hotspots are visible.
 */
HotspotRenderer.prototype.setVisibility = function(isVisible) {
  this.hotspotRoot.visible = isVisible;
};

HotspotRenderer.prototype.onTouchStart_ = function(e) {
  // In VR mode, don't touch the pointer position.
  if (!this.worldRenderer.isVRMode()) {
    this.updateTouch_(e);
  }

  // Force a camera update to see if any hotspots were selected.
  this.update(this.worldRenderer.camera);

  this.downHotspots = {};
  for (var id in this.selectedHotspots) {
    this.downHotspots[id] = true;
    this.down_(id);
  }
  return false;
};

HotspotRenderer.prototype.onTouchEnd_ = function(e) {
  // If no hotspots are pressed, emit an empty click event.
  if (Util.isEmptyObject(this.downHotspots)) {
    this.emit('click');
    return;
  }

  // Only emit a click if the finger was down on the same hotspot before.
  for (var id in this.downHotspots) {
    this.emit('click', id);
    this.up_(id);
    e.preventDefault();
  }
};

HotspotRenderer.prototype.updateTouch_ = function(e) {
  var size = this.getSize_();
  var touch = e.touches[0];
	this.pointer.x = (touch.clientX / size.width) * 2 - 1;
	this.pointer.y = - (touch.clientY / size.height) * 2 + 1;
};

HotspotRenderer.prototype.onMouseDown_ = function(e) {
  this.updateMouse_(e);

  this.downHotspots = {};
  for (var id in this.selectedHotspots) {
    this.downHotspots[id] = true;
    this.down_(id);
  }
};

HotspotRenderer.prototype.onMouseMove_ = function(e) {
  this.updateMouse_(e);
};

HotspotRenderer.prototype.onMouseUp_ = function(e) {
  this.updateMouse_(e);

  // If no hotspots are pressed, emit an empty click event.
  if (Util.isEmptyObject(this.downHotspots)) {
    this.emit('click');
    return;
  }

  // Only emit a click if the mouse was down on the same hotspot before.
  for (var id in this.selectedHotspots) {
    if (id in this.downHotspots) {
      this.emit('click', id);
      this.up_(id);
    }
  }
};

HotspotRenderer.prototype.updateMouse_ = function(e) {
  var size = this.getSize_();
	this.pointer.x = (e.clientX / size.width) * 2 - 1;
	this.pointer.y = - (e.clientY / size.height) * 2 + 1;
};

HotspotRenderer.prototype.getSize_ = function() {
  var canvas = this.worldRenderer.renderer.domElement;
  return this.worldRenderer.renderer.getSize();
};

HotspotRenderer.prototype.createHotspot_ = function(radius, distance) {
  var innerGeometry = new THREE.CircleGeometry(radius, 32);

  var innerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, side: THREE.DoubleSide, transparent: true,
    opacity: MAX_INNER_OPACITY, depthTest: false
  });

  var inner = new THREE.Mesh(innerGeometry, innerMaterial);
  inner.name = 'inner';

  var outerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, side: THREE.DoubleSide, transparent: true,
    opacity: MAX_OUTER_OPACITY, depthTest: false
  });
  var outerGeometry = new THREE.RingGeometry(radius * 0.85, radius, 32);
  var outer = new THREE.Mesh(outerGeometry, outerMaterial);
  outer.name = 'outer';

  // Position at the extreme end of the sphere.
  var hotspot = new THREE.Object3D();
  hotspot.position.z = -distance;
  hotspot.scale.copy(NORMAL_SCALE);

  hotspot.add(inner);
  hotspot.add(outer);

  return hotspot;
};

/**
 * Large aspect ratios tend to cause visually jarring distortions on the sides.
 * Here we fade hotspots out to avoid them.
 */
HotspotRenderer.prototype.fadeOffCenterHotspots_ = function(camera) {
  var lookAt = new THREE.Vector3(1, 0, 0);
  lookAt.applyQuaternion(camera.quaternion);
  // Take into account the camera parent too.
  lookAt.applyQuaternion(camera.parent.quaternion);

  // Go through each hotspot. Calculate how far off center it is.
  for (var id in this.hotspots) {
    var hotspot = this.hotspots[id];
    var angle = hotspot.position.angleTo(lookAt);
    var angleDeg = THREE.Math.radToDeg(angle);
    var isVisible = angleDeg < 45;
    var opacity;
    if (angleDeg < FADE_START_ANGLE_DEG) {
      opacity = 1;
    } else if (angleDeg > FADE_END_ANGLE_DEG) {
      opacity = 0;
    } else {
      // We are in the case START < angle < END. Linearly interpolate.
      var range = FADE_END_ANGLE_DEG - FADE_START_ANGLE_DEG;
      var value = FADE_END_ANGLE_DEG - angleDeg;
      opacity = value / range;
    }

    // Opacity a function of angle. If angle is large, opacity is zero. At some
    // point, ramp opacity down.
    this.setOpacity_(id, opacity);
  }
};

HotspotRenderer.prototype.focus_ = function(id) {
  var hotspot = this.hotspots[id];

  // Tween scale of hotspot.
  this.tween = new TWEEN.Tween(hotspot.scale).to(FOCUS_SCALE, FOCUS_DURATION)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
  
  if (this.worldRenderer.isVRMode()) {
    this.timeForHospotClick = setTimeout(function () {
      this.emit('click', id);
    }, 1200 )
  }
};

HotspotRenderer.prototype.blur_ = function(id) {
  var hotspot = this.hotspots[id];

  this.tween = new TWEEN.Tween(hotspot.scale).to(NORMAL_SCALE, FOCUS_DURATION)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
  
  if (this.timeForHospotClick) {
    clearTimeout( this.timeForHospotClick );
  }
};

HotspotRenderer.prototype.down_ = function(id) {
  // Become active.
  var hotspot = this.hotspots[id];
  var outer = hotspot.getObjectByName('inner');

  this.tween = new TWEEN.Tween(outer.material.color).to(ACTIVE_COLOR, ACTIVE_DURATION)
      .start();
};

HotspotRenderer.prototype.up_ = function(id) {
  // Become inactive.
  var hotspot = this.hotspots[id];
  var outer = hotspot.getObjectByName('inner');

  this.tween = new TWEEN.Tween(outer.material.color).to(INACTIVE_COLOR, ACTIVE_DURATION)
      .start();
};

HotspotRenderer.prototype.setOpacity_ = function(id, opacity) {
  var hotspot = this.hotspots[id];
  var outer = hotspot.getObjectByName('outer');
  var inner = hotspot.getObjectByName('inner');

  outer.material.opacity = opacity * MAX_OUTER_OPACITY;
  inner.material.opacity = opacity * MAX_INNER_OPACITY;
};

module.exports = HotspotRenderer;

},{"../util":26,"@tweenjs/tween.js":1,"eventemitter3":3}],14:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var EventEmitter = _dereq_('eventemitter3');
var Message = _dereq_('../message');
var Util = _dereq_('../util');


/**
 * Sits in an embedded iframe, receiving messages from a containing
 * iFrame. This facilitates an API which provides the following features:
 *
 *    Playing and pausing content.
 *    Adding hotspots.
 *    Sending messages back to the containing iframe when hotspot is clicked
 *    Sending analytics events to containing iframe.
 *
 * Note: this script used to also respond to synthetic devicemotion events, but
 * no longer does so. This is because as of iOS 9.2, Safari disallows listening
 * for devicemotion events within cross-device iframes. To work around this, the
 * webvr-polyfill responds to the postMessage event containing devicemotion
 * information (sent by the iframe-message-sender in the VR View API).
 */
function IFrameMessageReceiver() {
  window.addEventListener('message', this.onMessage_.bind(this), false);
}
IFrameMessageReceiver.prototype = new EventEmitter();

IFrameMessageReceiver.prototype.onMessage_ = function(event) {
  if (Util.isDebug()) {
    console.log('onMessage_', event);
  }

  var message = event.data;
  var type = message.type.toLowerCase();
  var data = message.data;

  switch (type) {
    case Message.SET_CONTENT:
    case Message.SET_VOLUME:
    case Message.MUTED:
    case Message.ADD_HOTSPOT:
    case Message.PLAY:
    case Message.PAUSE:
    case Message.SET_CURRENT_TIME:
    case Message.GET_POSITION:
    case Message.SET_FULLSCREEN:
      this.emit(type, data);
      break;
    default:
      if (Util.isDebug()) {
        console.warn('Got unknown message of type %s from %s', message.type, message.origin);
      }
  }
};

module.exports = IFrameMessageReceiver;

},{"../message":23,"../util":26,"eventemitter3":3}],15:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Shows a 2D loading indicator while various pieces of EmbedVR load.
 */
function LoadingIndicator() {
  this.el = this.build_();
  document.body.appendChild(this.el);
  this.show();
}

LoadingIndicator.prototype.build_ = function() {
  var overlay = document.createElement('div');
  var s = overlay.style;
  s.position = 'fixed';
  s.top = 0;
  s.left = 0;
  s.width = '100%';
  s.height = '100%';
  s.background = '#eee';
  var img = document.createElement('img');
  img.src = 'images/loading.gif';
  var s = img.style;
  s.position = 'absolute';
  s.top = '50%';
  s.left = '50%';
  s.transform = 'translate(-50%, -50%)';

  overlay.appendChild(img);
  return overlay;
};

LoadingIndicator.prototype.hide = function() {
  this.el.style.display = 'none';
};

LoadingIndicator.prototype.show = function() {
  this.el.style.display = 'block';
};

module.exports = LoadingIndicator;

},{}],16:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Initialize the loading indicator as quickly as possible to give the user
// immediate feedback.
var LoadingIndicator = _dereq_('./loading-indicator');
var loadIndicator = new LoadingIndicator();

var ES6Promise = _dereq_('es6-promise');
// Polyfill ES6 promises for IE.
ES6Promise.polyfill();

var IFrameMessageReceiver = _dereq_('./iframe-message-receiver');
var Message = _dereq_('../message');
var SceneInfo = _dereq_('./scene-info');
var Stats = _dereq_('../../node_modules/stats-js/build/stats.min');
var Util = _dereq_('../util');
var WebVRPolyfill = _dereq_('webvr-polyfill');
var WorldRenderer = _dereq_('./world-renderer');

var receiver = new IFrameMessageReceiver();
receiver.on(Message.PLAY, onPlayRequest);
receiver.on(Message.PAUSE, onPauseRequest);
receiver.on(Message.ADD_HOTSPOT, onAddHotspot);
receiver.on(Message.SET_CONTENT, onSetContent);
receiver.on(Message.SET_VOLUME, onSetVolume);
receiver.on(Message.MUTED, onMuted);
receiver.on(Message.SET_CURRENT_TIME, onUpdateCurrentTime);
receiver.on(Message.GET_POSITION, onGetPosition);
receiver.on(Message.SET_FULLSCREEN, onSetFullscreen);

window.addEventListener('load', onLoad);

var stats = new Stats();
var scene = SceneInfo.loadFromGetParams();

var webvr = new WebVRPolyfill(WebVRConfig)

var worldRenderer = new WorldRenderer(scene);
worldRenderer.on('error', onRenderError);
worldRenderer.on('load', onRenderLoad);
worldRenderer.on('modechange', onModeChange);
worldRenderer.on('ended', onEnded);
worldRenderer.on('play', onPlay);
worldRenderer.hotspotRenderer.on('click', onHotspotClick);

window.worldRenderer = worldRenderer;

var isReadySent = false;
var volume = 0;

function onLoad() {
  if (!Util.isWebGLEnabled()) {
    showError('WebGL not supported.');
    return;
  }

  // Load the scene.
  worldRenderer.setScene(scene);

  if (scene.isDebug) {
    // Show stats.
    showStats();
  }

  if (scene.isYawOnly) {
    WebVRConfig = window.WebVRConfig || {};
    WebVRConfig.YAW_ONLY = true;
  }

  requestAnimationFrame(loop);
}


function onVideoTap() {
  worldRenderer.videoProxy.play();
  hidePlayButton();

  // Prevent multiple play() calls on the video element.
  document.body.removeEventListener('touchend', onVideoTap);
}

function onRenderLoad(event) {
  if (event.videoElement) {

    var scene = SceneInfo.loadFromGetParams();

    // On mobile, tell the user they need to tap to start. Otherwise, autoplay.
    if (Util.isMobile()) {
      // Tell user to tap to start.
      showPlayButton();
      document.body.addEventListener('touchend', onVideoTap);
    } else {
      event.videoElement.play();
    }

    // Attach to pause and play events, to notify the API.
    event.videoElement.addEventListener('pause', onPause);
    event.videoElement.addEventListener('play', onPlay);
    event.videoElement.addEventListener('timeupdate', onGetCurrentTime);
    event.videoElement.addEventListener('ended', onEnded);
  }
  // Hide loading indicator.
  loadIndicator.hide();

  // Autopan only on desktop, for photos only, and only if autopan is enabled.
  if (!Util.isMobile() && !worldRenderer.sceneInfo.video && !worldRenderer.sceneInfo.isAutopanOff) {
    worldRenderer.autopan();
  }

  // Notify the API that we are ready, but only do this once.
  if (!isReadySent) {
    if (event.videoElement) {
      Util.sendParentMessage({
        type: 'ready',
        data: {
          duration: event.videoElement.duration
        }
      });
    } else {
      Util.sendParentMessage({
        type: 'ready'
      });
    }

    isReadySent = true;
  }
}

function onPlayRequest() {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to pause, but no video found.');
    return;
  }
  worldRenderer.videoProxy.play();
}

function onPauseRequest() {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to pause, but no video found.');
    return;
  }
  worldRenderer.videoProxy.pause();
}

function onAddHotspot(e) {
  if (Util.isDebug()) {
    console.log('onAddHotspot', e);
  }
  // TODO: Implement some validation?

  var pitch = parseFloat(e.pitch);
  var yaw = parseFloat(e.yaw);
  var radius = parseFloat(e.radius);
  var distance = parseFloat(e.distance);
  var id = e.id;
  worldRenderer.hotspotRenderer.add(pitch, yaw, radius, distance, id);
}

function onSetContent(e) {
  if (Util.isDebug()) {
    console.log('onSetContent', e);
  }
  // Remove all of the hotspots.
  worldRenderer.hotspotRenderer.clearAll();
  // Fade to black.
  worldRenderer.sphereRenderer.setOpacity(0, 500).then(function() {
    // Then load the new scene.
    var scene = SceneInfo.loadFromAPIParams(e.contentInfo);
    worldRenderer.destroy();

    // Update the URL to reflect the new scene. This is important particularily
    // on iOS where we use a fake fullscreen mode.
    var url = scene.getCurrentUrl();
    //console.log('Updating url to be %s', url);
    window.history.pushState(null, 'VR View', url);

    // And set the new scene.
    return worldRenderer.setScene(scene);
  }).then(function() {
    // Then fade the scene back in.
    worldRenderer.sphereRenderer.setOpacity(1, 500);
  });
}

function onSetVolume(e) {
  // Only work for video. If there's no video, send back an error.
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to set volume, but no video found.');
    return;
  }

  worldRenderer.videoProxy.setVolume(e.volumeLevel);
  volume = e.volumeLevel;
  Util.sendParentMessage({
    type: 'volumechange',
    data: e.volumeLevel
  });
}

function onMuted(e) {
  // Only work for video. If there's no video, send back an error.
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to mute, but no video found.');
    return;
  }

  worldRenderer.videoProxy.mute(e.muteState);

  Util.sendParentMessage({
    type: 'muted',
    data: e.muteState
  });
}

function onUpdateCurrentTime(time) {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to pause, but no video found.');
    return;
  }

  worldRenderer.videoProxy.setCurrentTime(time);
  onGetCurrentTime();
}

function onGetCurrentTime() {
  var time = worldRenderer.videoProxy.getCurrentTime();
  Util.sendParentMessage({
    type: 'timeupdate',
    data: time
  });
}

function onSetFullscreen() {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to set fullscreen, but no video found.');
    return;
  }
  worldRenderer.manager.onFSClick_();
}

function onApiError(message) {
  console.error(message);
  Util.sendParentMessage({
    type: 'error',
    data: {message: message}
  });
}

function onModeChange(mode) {
  Util.sendParentMessage({
    type: 'modechange',
    data: {mode: mode}
  });
}

function onHotspotClick(id) {
  Util.sendParentMessage({
    type: 'click',
    data: {id: id}
  });
}

function onPlay() {
  Util.sendParentMessage({
    type: 'paused',
    data: false
  });
}

function onPause() {
  Util.sendParentMessage({
    type: 'paused',
    data: true
  });
}

function onEnded() {
    Util.sendParentMessage({
      type: 'ended',
      data: true
    });
}

function onSceneError(message) {
  showError('Loader: ' + message);
}

function onRenderError(message) {
  showError('Render: ' + message);
}

function showError(message, opt_title) {
  // Hide loading indicator.
  loadIndicator.hide();

  var error = document.querySelector('#error');
  error.classList.add('visible');
  error.querySelector('.message').innerHTML = message;

  var title = (opt_title !== undefined ? opt_title : 'Error');
  error.querySelector('.title').innerHTML = title;
}

function hideError() {
  var error = document.querySelector('#error');
  error.classList.remove('visible');
}

function showPlayButton() {
  var playButton = document.querySelector('#play-overlay');
  playButton.classList.add('visible');
}

function hidePlayButton() {
  var playButton = document.querySelector('#play-overlay');
  playButton.classList.remove('visible');
}

function showStats() {
  stats.setMode(0); // 0: fps, 1: ms

  // Align bottom-left.
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.bottom = '0px';
  document.body.appendChild(stats.domElement);
}

function loop(time) {
  // Use the VRDisplay RAF if it is present.
  if (worldRenderer.vrDisplay) {
    worldRenderer.vrDisplay.requestAnimationFrame(loop);
  } else {
    requestAnimationFrame(loop);
  }

  stats.begin();
  // Update the video if needed.
  if (worldRenderer.videoProxy) {
    worldRenderer.videoProxy.update(time);
  }
  worldRenderer.render(time);
  worldRenderer.submitFrame();
  stats.end();
}
function onGetPosition() {
    Util.sendParentMessage({
        type: 'getposition',
        data: {
            Yaw: worldRenderer.camera.rotation.y * 180 / Math.PI,
            Pitch: worldRenderer.camera.rotation.x * 180 / Math.PI
        }
    });
}

},{"../../node_modules/stats-js/build/stats.min":6,"../message":23,"../util":26,"./iframe-message-receiver":14,"./loading-indicator":15,"./scene-info":18,"./world-renderer":22,"es6-promise":2,"webvr-polyfill":9}],17:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function ReticleRenderer(camera) {
  this.camera = camera;

  this.reticle = this.createReticle_();
  // In front of the hotspot itself, which is at r=0.99.
  this.reticle.position.z = -0.97;
  camera.add(this.reticle);

  this.setVisibility(false);
}

ReticleRenderer.prototype.setVisibility = function(isVisible) {
  // TODO: Tween the transition.
  this.reticle.visible = isVisible;
};

ReticleRenderer.prototype.createReticle_ = function() {
  // Make a torus.
  var geometry = new THREE.TorusGeometry(0.02, 0.005, 10, 20);
  var material = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
  var torus = new THREE.Mesh(geometry, material);

  return torus;
};

module.exports = ReticleRenderer;

},{}],18:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Util = _dereq_('../util');

var CAMEL_TO_UNDERSCORE = {
  video: 'video',
  image: 'image',
  preview: 'preview',
  loop: 'loop',
  volume: 'volume',
  muted: 'muted',
  isStereo: 'is_stereo',
  defaultYaw: 'default_yaw',
  isYawOnly: 'is_yaw_only',
  isDebug: 'is_debug',
  isVROff: 'is_vr_off',
  isAutopanOff: 'is_autopan_off',
  hideFullscreenButton: 'hide_fullscreen_button'
};

/**
 * Contains all information about a given scene.
 */
function SceneInfo(opt_params) {
  var params = opt_params || {};
  params.player = {
    loop: opt_params.loop,
    volume: opt_params.volume,
    muted: opt_params.muted
  };

  this.image = params.image;
  this.preview = params.preview;
  this.video = params.video;
  this.defaultYaw = THREE.Math.degToRad(params.defaultYaw || 0);

  this.isStereo = Util.parseBoolean(params.isStereo);
  this.isYawOnly = Util.parseBoolean(params.isYawOnly);
  this.isDebug = Util.parseBoolean(params.isDebug);
  this.isVROff = Util.parseBoolean(params.isVROff);
  this.isAutopanOff = Util.parseBoolean(params.isAutopanOff);
  this.loop = Util.parseBoolean(params.player.loop);
  this.volume = parseFloat(
      params.player.volume ? params.player.volume : '1');
  this.muted = Util.parseBoolean(params.player.muted);
  this.hideFullscreenButton = Util.parseBoolean(params.hideFullscreenButton);
}

SceneInfo.loadFromGetParams = function() {
  var params = {};
  for (var camelCase in CAMEL_TO_UNDERSCORE) {
    var underscore = CAMEL_TO_UNDERSCORE[camelCase];
    params[camelCase] = Util.getQueryParameter(underscore)
                        || ((window.WebVRConfig && window.WebVRConfig.PLAYER) ? window.WebVRConfig.PLAYER[underscore] : "");
  }
  var scene = new SceneInfo(params);
  if (!scene.isValid()) {
    console.warn('Invalid scene: %s', scene.errorMessage);
  }
  return scene;
};

SceneInfo.loadFromAPIParams = function(underscoreParams) {
  var params = {};
  for (var camelCase in CAMEL_TO_UNDERSCORE) {
    var underscore = CAMEL_TO_UNDERSCORE[camelCase];
    if (underscoreParams[underscore]) {
      params[camelCase] = underscoreParams[underscore];
    }
  }
  var scene = new SceneInfo(params);
  if (!scene.isValid()) {
    console.warn('Invalid scene: %s', scene.errorMessage);
  }
  return scene;
};

SceneInfo.prototype.isValid = function() {
  // Either it's an image or a video.
  if (!this.image && !this.video) {
    this.errorMessage = 'Either image or video URL must be specified.';
    return false;
  }
  if (this.image && !this.isValidImage_(this.image)) {
    this.errorMessage = 'Invalid image URL: ' + this.image;
    return false;
  }
  this.errorMessage = null;
  return true;
};

/**
 * Generates a URL to reflect this scene.
 */
SceneInfo.prototype.getCurrentUrl = function() {
  var url = location.protocol + '//' + location.host + location.pathname + '?';
  for (var camelCase in CAMEL_TO_UNDERSCORE) {
    var underscore = CAMEL_TO_UNDERSCORE[camelCase];
    var value = this[camelCase];
    if (value !== undefined) {
      url += underscore + '=' + value + '&';
    }
  }
  // Chop off the trailing ampersand.
  return url.substring(0, url.length - 1);
};

SceneInfo.prototype.isValidImage_ = function(imageUrl) {
  return true;
};

module.exports = SceneInfo;

},{"../util":26}],19:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Eyes = _dereq_('./eyes');
var TWEEN = _dereq_('@tweenjs/tween.js');
var Util = _dereq_('../util');
var VideoType = _dereq_('../video-type');

function SphereRenderer(scene) {
  this.scene = scene;

  // Create a transparent mask.
  this.createOpacityMask_();
}

/**
 * Sets the photosphere based on the image in the source. Supports stereo and
 * mono photospheres.
 *
 * @return {Promise}
 */
SphereRenderer.prototype.setPhotosphere = function(src, opt_params) {
  return new Promise(function(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;

    var params = opt_params || {};

    this.isStereo = !!params.isStereo;
    this.src = src;

    // Load texture.
    var loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(src, this.onTextureLoaded_.bind(this), undefined,
                this.onTextureError_.bind(this));
  }.bind(this));
};

/**
 * @return {Promise} Yeah.
 */
SphereRenderer.prototype.set360Video = function (videoElement, videoType, opt_params) {
  return new Promise(function(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;

    var params = opt_params || {};

    this.isStereo = !!params.isStereo;

    // Load the video texture.
    var videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;

    if (Util.isSafari() && videoType === VideoType.HLS) {
      // fix black screen issue on safari
      videoTexture.format = THREE.RGBAFormat;
      videoTexture.flipY = false;
    } else {
      videoTexture.format = THREE.RGBFormat;
    }

    videoTexture.needsUpdate = true;

    this.onTextureLoaded_(videoTexture);
  }.bind(this));
};

/**
 * Set the opacity of the panorama.
 *
 * @param {Number} opacity How opaque we want the panorama to be. 0 means black,
 * 1 means full color.
 * @param {Number} duration Number of milliseconds the transition should take.
 *
 * @return {Promise} When the opacity change is complete.
 */
SphereRenderer.prototype.setOpacity = function(opacity, duration) {
  var scene = this.scene;
  // If we want the opacity
  var overlayOpacity = 1 - opacity;
  return new Promise(function(resolve, reject) {
    var mask = scene.getObjectByName('opacityMask');
    var tween = new TWEEN.Tween({opacity: mask.material.opacity})
        .to({opacity: overlayOpacity}, duration)
        .easing(TWEEN.Easing.Quadratic.InOut);
    tween.onUpdate(function(e) {
      mask.material.opacity = this.opacity;
    });
    tween.onComplete(resolve).start();
  });
};

SphereRenderer.prototype.onTextureLoaded_ = function(texture) {
  var sphereLeft;
  var sphereRight;
  if (this.isStereo) {
    sphereLeft = this.createPhotosphere_(texture, {offsetY: 0.5, scaleY: 0.5});
    sphereRight = this.createPhotosphere_(texture, {offsetY: 0, scaleY: 0.5});
  } else {
    sphereLeft = this.createPhotosphere_(texture);
    sphereRight = this.createPhotosphere_(texture);
  }

  // Display in left and right eye respectively.
  sphereLeft.layers.set(Eyes.LEFT);
  sphereLeft.eye = Eyes.LEFT;
  sphereLeft.name = 'eyeLeft';
  sphereRight.layers.set(Eyes.RIGHT);
  sphereRight.eye = Eyes.RIGHT;
  sphereRight.name = 'eyeRight';


    this.scene.getObjectByName('photo').children = [sphereLeft, sphereRight];

  this.resolve();
};

SphereRenderer.prototype.onTextureError_ = function(error) {
  this.reject('Unable to load texture from "' + this.src + '"');
};


SphereRenderer.prototype.createPhotosphere_ = function(texture, opt_params) {
  var p = opt_params || {};
  p.scaleX = p.scaleX || 1;
  p.scaleY = p.scaleY || 1;
  p.offsetX = p.offsetX || 0;
  p.offsetY = p.offsetY || 0;
  p.phiStart = p.phiStart || 0;
  p.phiLength = p.phiLength || Math.PI * 2;
  p.thetaStart = p.thetaStart || 0;
  p.thetaLength = p.thetaLength || Math.PI;

  var geometry = new THREE.SphereGeometry(1, 48, 48,
      p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
  geometry.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));
  var uvs = geometry.faceVertexUvs[0];
  for (var i = 0; i < uvs.length; i ++) {
    for (var j = 0; j < 3; j ++) {
      uvs[i][j].x *= p.scaleX;
      uvs[i][j].x += p.offsetX;
      uvs[i][j].y *= p.scaleY;
      uvs[i][j].y += p.offsetY;
    }
  }

  var material;
  if (texture.format === THREE.RGBAFormat && texture.flipY === false) {
    material = new THREE.ShaderMaterial({
      uniforms: {
        texture: { value: texture }
      },
      vertexShader: [
        "varying vec2 vUV;",
        "void main() {",
        "	vUV = vec2( uv.x, 1.0 - uv.y );",
        "	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform sampler2D texture;",
        "varying vec2 vUV;",
        "void main() {",
        " gl_FragColor = texture2D( texture, vUV  )" + (Util.isIOS() ? ".bgra" : "") + ";",
        "}"
      ].join("\n")
    });
  } else {
    material = new THREE.MeshBasicMaterial({ map: texture });
  }
  var out = new THREE.Mesh(geometry, material);
  //out.visible = false;
  out.renderOrder = -1;
  return out;
};

SphereRenderer.prototype.createOpacityMask_ = function() {
  var geometry = new THREE.SphereGeometry(0.49, 48, 48);
  var material = new THREE.MeshBasicMaterial({
    color: 0x000000, side: THREE.DoubleSide, opacity: 0, transparent: true});
  var opacityMask = new THREE.Mesh(geometry, material);
  opacityMask.name = 'opacityMask';
  opacityMask.renderOrder = 1;

  this.scene.add(opacityMask);
  return opacityMask;
};

module.exports = SphereRenderer;

},{"../util":26,"../video-type":27,"./eyes":12,"@tweenjs/tween.js":1}],20:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Util = _dereq_('../util');

/**
 * A proxy class for working around the fact that as soon as a video is play()ed
 * on iOS, Safari auto-fullscreens the video.
 *
 * TODO(smus): The entire raison d'etre for this class is to work around this
 * issue. Once Safari implements some way to suppress this fullscreen player, we
 * can remove this code.
 */
function VideoProxy(videoElement) {
  this.videoElement = videoElement;
  // True if we're currently manually advancing the playhead (only on iOS).
  this.isFakePlayback = false;

  // When the video started playing.
  this.startTime = null;
}

VideoProxy.prototype.play = function() {
  if (Util.isIOS9OrLess()) {
    this.startTime = performance.now();
    this.isFakePlayback = true;

    // Make an audio element to playback just the audio part.
    this.audioElement = new Audio();
    this.audioElement.src = this.videoElement.src;
    this.audioElement.play();
  } else {
    this.videoElement.play().then(function(e) {
      console.log('Playing video.', e);
    });
  }
};

VideoProxy.prototype.pause = function() {
  if (Util.isIOS9OrLess() && this.isFakePlayback) {
    this.isFakePlayback = true;

    this.audioElement.pause();
  } else {
    this.videoElement.pause();
  }
};

VideoProxy.prototype.setVolume = function(volumeLevel) {
  if (this.videoElement) {
    // On iOS 10, the VideoElement.volume property is read-only. So we special
    // case muting and unmuting.
    if (Util.isIOS()) {
      this.videoElement.muted = (volumeLevel === 0);
    } else {
      this.videoElement.volume = volumeLevel;
    }
  }
  if (this.audioElement) {
    this.audioElement.volume = volumeLevel;
  }
};

/**
 * Set the attribute mute of the elements according with the muteState param.
 *
 * @param bool muteState
 */
VideoProxy.prototype.mute = function(muteState) {
  if (this.videoElement) {
    this.videoElement.muted = muteState;
  }
  if (this.audioElement) {
    this.audioElement.muted = muteState;
  }
};

VideoProxy.prototype.getCurrentTime = function() {
  return Util.isIOS9OrLess() ? this.audioElement.currentTime : this.videoElement.currentTime;
};

/**
 *
 * @param {Object} time
 */
VideoProxy.prototype.setCurrentTime = function(time) {
  if (this.videoElement) {
    this.videoElement.currentTime = time.currentTime;
  }
  if (this.audioElement) {
    this.audioElement.currentTime = time.currentTime;
  }
};

/**
 * Called on RAF to progress playback.
 */
VideoProxy.prototype.update = function() {
  // Fakes playback for iOS only.
  if (!this.isFakePlayback) {
    return;
  }
  var duration = this.videoElement.duration;
  var now = performance.now();
  var delta = now - this.startTime;
  var deltaS = delta / 1000;
  this.videoElement.currentTime = deltaS;

  // Loop through the video
  if (deltaS > duration) {
    this.startTime = now;
    this.videoElement.currentTime = 0;
    // Also restart the audio.
    this.audioElement.currentTime = 0;
  }
};

module.exports = VideoProxy;

},{"../util":26}],21:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Load EmbedVR.
_dereq_('./main');

// Load Analytics for EmbedVR.
_dereq_('./analytics');

},{"./analytics":11,"./main":16}],22:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var AdaptivePlayer = _dereq_('./adaptive-player');
var EventEmitter = _dereq_('eventemitter3');
var Eyes = _dereq_('./eyes');
var HotspotRenderer = _dereq_('./hotspot-renderer');
var ReticleRenderer = _dereq_('./reticle-renderer');
var SphereRenderer = _dereq_('./sphere-renderer');
var TWEEN = _dereq_('@tweenjs/tween.js');
var Util = _dereq_('../util');
var VideoProxy = _dereq_('./video-proxy');
var WebVRManager = _dereq_('../third_party/webvr-boilerplate/build/webvr-manager');

var OrbitControls = _dereq_('../third_party/three/OrbitControls.js');
var VRControls = _dereq_('../../node_modules/three/examples/js/controls/VRControls.js');
var VREffect = _dereq_('../../node_modules/three/examples/js/effects/VREffect.js');


var AUTOPAN_DURATION = 3000;
var AUTOPAN_ANGLE = 0.4;

/**
 * The main WebGL rendering entry point. Manages the scene, camera, VR-related
 * rendering updates. Interacts with the WebVRManager.
 *
 * Coordinates the other renderers: SphereRenderer, HotspotRenderer,
 * ReticleRenderer.
 *
 * Also manages the AdaptivePlayer and VideoProxy.
 *
 * Emits the following events:
 *   load: when the scene is loaded.
 *   error: if there is an error loading the scene.
 *   modechange(Boolean isVR): if the mode (eg. VR, fullscreen, etc) changes.
 */
function WorldRenderer(params) {
  this.init_(params.hideFullscreenButton);

  this.sphereRenderer = new SphereRenderer(this.scene);
  this.hotspotRenderer = new HotspotRenderer(this);
  this.hotspotRenderer.on('focus', this.onHotspotFocus_.bind(this));
  this.hotspotRenderer.on('blur', this.onHotspotBlur_.bind(this));
  this.reticleRenderer = new ReticleRenderer(this.camera);

  var self = this;

  // VR Controls
  self.vrControls = new THREE.VRControls(self.camera);

  // Orbit Controls
  self.orbitControls = new THREE.OrbitControls(self.camera);
  self.orbitControls.enablePan = false;
  self.orbitControls.rotateSpeed = -0.05;
  self.orbitControls.enableDamping = true;
  self.orbitControls.dampingFactor = 0.075;
  self.orbitControls.target.set(0, 0, -0.0001);

  // Get the VR Display as soon as we initialize.
  navigator.getVRDisplays().then(function(displays) {
    if (displays.length > 0) {
      self.vrDisplay = displays[0];
      self.controls = self.vrControls;
    }
    else {
      self.controls = self.orbitControls;
    }
  }.bind(this));

}
WorldRenderer.prototype = new EventEmitter();

WorldRenderer.prototype.render = function(time) {
  // Switch between orbit or VR controls
  if (this.isVRMode()) {
    this.controls = this.vrControls;
  }
  else {
    this.controls = this.orbitControls;  
  }
  
  this.controls.update();
  TWEEN.update(time);
  this.effect.render(this.scene, this.camera);
  this.hotspotRenderer.update(this.camera);
};

/**
 * @return {Promise} When the scene is fully loaded.
 */
WorldRenderer.prototype.setScene = function(scene) {
  var self = this;
  var promise = new Promise(function(resolve, reject) {
    self.sceneResolve = resolve;
    self.sceneReject = reject;
  });

  if (!scene || !scene.isValid()) {
    this.didLoadFail_(scene.errorMessage);
    return;
  }

  var params = {
    isStereo: scene.isStereo,
    loop: scene.loop,
    volume: scene.volume,
    muted: scene.muted
  };

  this.setDefaultYaw_(scene.defaultYaw || 0);

  // Disable VR mode if explicitly disabled, or if we're loading a video on iOS
  // 9 or earlier.
  if (scene.isVROff || (scene.video && Util.isIOS9OrLess())) {
    this.manager.setVRCompatibleOverride(false);
  }

  // Set various callback overrides in iOS.
  if (Util.isIOS()) {
    this.manager.setFullscreenCallback(function() {
      Util.sendParentMessage({type: 'enter-fullscreen'});
    });
    this.manager.setExitFullscreenCallback(function() {
      Util.sendParentMessage({type: 'exit-fullscreen'});
    });
    this.manager.setVRCallback(function() {
      Util.sendParentMessage({type: 'enter-vr'});
    });
  }

  // If we're dealing with an image, and not a video.
  if (scene.image && !scene.video) {
    if (scene.preview) {
      // First load the preview.
      this.sphereRenderer.setPhotosphere(scene.preview, params).then(function() {
        // As soon as something is loaded, emit the load event to hide the
        // loading progress bar.
        self.didLoad_();
        // Then load the full resolution image.
        self.sphereRenderer.setPhotosphere(scene.image, params);
      }).catch(self.didLoadFail_.bind(self));
    } else {
      // No preview -- go straight to rendering the full image.
      this.sphereRenderer.setPhotosphere(scene.image, params).then(function() {
        self.didLoad_();
      }).catch(self.didLoadFail_.bind(self));
    }
  } else if (scene.video) {
    if (Util.isIE11()) {
      // On IE 11, if an 'image' param is provided, load it instead of showing
      // an error.
      //
      // TODO(smus): Once video textures are supported, remove this fallback.
      if (scene.image) {
        this.sphereRenderer.setPhotosphere(scene.image, params).then(function() {
          self.didLoad_();
        }).catch(self.didLoadFail_.bind(self));
      } else {
        this.didLoadFail_('Video is not supported on IE11.');
      }
    } else {
      this.player = new AdaptivePlayer(params);
      this.player.on('load', function(videoElement, videoType) {
        self.sphereRenderer.set360Video(videoElement, videoType, params).then(function() {
          self.didLoad_({videoElement: videoElement});
        }).catch(self.didLoadFail_.bind(self));
      });
      this.player.on('error', function(error) {
        self.didLoadFail_('Video load error: ' + error);
      });
      this.player.load(scene.video);

      this.videoProxy = new VideoProxy(this.player.video);
    }
  }

  this.sceneInfo = scene;
  if (Util.isDebug()) {
    console.log('Loaded scene', scene);
  }

  return promise;
};

WorldRenderer.prototype.isVRMode = function() {
  return !!this.vrDisplay && this.vrDisplay.isPresenting;
};

WorldRenderer.prototype.submitFrame = function() {
  if (this.isVRMode()) {
    this.vrDisplay.submitFrame();
  }
};

WorldRenderer.prototype.disposeEye_ = function(eye) {
  if (eye) {
    if (eye.material.map) {
      eye.material.map.dispose();
    }
    eye.material.dispose();
    eye.geometry.dispose();
  }
};

WorldRenderer.prototype.dispose = function() {
  var eyeLeft = this.scene.getObjectByName('eyeLeft');
  this.disposeEye_(eyeLeft);
  var eyeRight = this.scene.getObjectByName('eyeRight');
  this.disposeEye_(eyeRight);
};

WorldRenderer.prototype.destroy = function() {
  if (this.player) {
    this.player.removeAllListeners();
    this.player.destroy();
    this.player = null;
  }
  var photo = this.scene.getObjectByName('photo');
  var eyeLeft = this.scene.getObjectByName('eyeLeft');
  var eyeRight = this.scene.getObjectByName('eyeRight');

  if (eyeLeft) {
    this.disposeEye_(eyeLeft);
    photo.remove(eyeLeft);
    this.scene.remove(eyeLeft);
  }

  if (eyeRight) {
    this.disposeEye_(eyeRight);
    photo.remove(eyeRight);
    this.scene.remove(eyeRight);
  }
};

WorldRenderer.prototype.didLoad_ = function(opt_event) {
  var event = opt_event || {};
  this.emit('load', event);
  if (this.sceneResolve) {
    this.sceneResolve();
  }
};

WorldRenderer.prototype.didLoadFail_ = function(message) {
  this.emit('error', message);
  if (this.sceneReject) {
    this.sceneReject(message);
  }
};

/**
 * Sets the default yaw.
 * @param {Number} angleRad The yaw in radians.
 */
WorldRenderer.prototype.setDefaultYaw_ = function(angleRad) {
  // Rotate the camera parent to take into account the scene's rotation.
  // By default, it should be at the center of the image.
//  var display = this.controls.getVRDisplay();
  // For desktop, we subtract the current display Y axis
  var theta = 0;
/*  if (display) {
    theta = display.theta_ || 0;
    // For devices with orientation we make the current view center
    if (display.poseSensor_) {
      display.poseSensor_.resetPose();
    }
}*/
  this.camera.parent.rotation.y = (Math.PI / 2.0) + angleRad - theta;
};

/**
 * Do the initial camera tween to rotate the camera, giving an indication that
 * there is live content there (on desktop only).
 */
WorldRenderer.prototype.autopan = function(duration) {
  var targetY = this.camera.parent.rotation.y - AUTOPAN_ANGLE;
  var tween = new TWEEN.Tween(this.camera.parent.rotation)
      .to({y: targetY}, AUTOPAN_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
};

WorldRenderer.prototype.init_ = function(hideFullscreenButton) {
  var container = document.querySelector('body');
  var aspect = window.innerWidth / window.innerHeight;
  var camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
  camera.layers.enable(1);

  var cameraDummy = new THREE.Object3D();
  cameraDummy.add(camera);

  // Antialiasing disabled to improve performance.
  var renderer = new THREE.WebGLRenderer({antialias: false});
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  container.appendChild(renderer.domElement);

//  var controls = new THREE.VRControls(camera);
  var effect = new THREE.VREffect(renderer);

  // Disable eye separation.
  effect.scale = 0;
  effect.setSize(window.innerWidth, window.innerHeight);

  // Present submission of frames automatically. This is done manually in
  // submitFrame().
  effect.autoSubmitFrame = false;

  this.camera = camera;
  this.renderer = renderer;
  this.effect = effect;
//  this.controls = controls;
  this.manager = new WebVRManager(renderer, effect, {predistorted: false, hideButton: hideFullscreenButton});

  this.scene = this.createScene_();
  this.scene.add(this.camera.parent);


  // Watch the resize event.
  window.addEventListener('resize', this.onResize_.bind(this));

  // Prevent context menu.
  window.addEventListener('contextmenu', this.onContextMenu_.bind(this));

  window.addEventListener('vrdisplaypresentchange',
                          this.onVRDisplayPresentChange_.bind(this));
};

WorldRenderer.prototype.onResize_ = function() {
  this.effect.setSize(window.innerWidth, window.innerHeight);
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();
};

WorldRenderer.prototype.onVRDisplayPresentChange_ = function(e) {
  if (Util.isDebug()) {
    console.log('onVRDisplayPresentChange_');
  }
  var isVR = this.isVRMode();

  // If the mode changed to VR and there is at least one hotspot, show reticle.
  var isReticleVisible = isVR && this.hotspotRenderer.getCount() > 0;
  this.reticleRenderer.setVisibility(isReticleVisible);

  // Resize the renderer for good measure.
  this.onResize_();

  // Analytics.
  if (window.analytics) {
    analytics.logModeChanged(isVR);
  }

  // When exiting VR mode from iOS, make sure we emit back an exit-fullscreen event.
  if (!isVR && Util.isIOS()) {
    Util.sendParentMessage({type: 'exit-fullscreen'});
  }

  // Switch between orbit or VR controls
  if (this.isVRMode()) {
    this.orbitControls.orbitControls.enabled = false;
  }
  else {
    this.orbitControls.orbitControls.enabled = true;
  }  

  // Emit a mode change event back to any listeners.
  this.emit('modechange', isVR);
};

WorldRenderer.prototype.createScene_ = function(opt_params) {
  var scene = new THREE.Scene();

  // Add a group for the photosphere.
  var photoGroup = new THREE.Object3D();
  photoGroup.name = 'photo';
  scene.add(photoGroup);

  return scene;
};

WorldRenderer.prototype.onHotspotFocus_ = function(id) {
  // Set the default cursor to be a pointer.
  this.setCursor_('pointer');
};

WorldRenderer.prototype.onHotspotBlur_ = function(id) {
  // Reset the default cursor to be the default one.
  this.setCursor_('');
};

WorldRenderer.prototype.setCursor_ = function(cursor) {
  this.renderer.domElement.style.cursor = cursor;
};

WorldRenderer.prototype.onContextMenu_ = function(e) {
  e.preventDefault();
  e.stopPropagation();
  return false;
};

module.exports = WorldRenderer;

},{"../../node_modules/three/examples/js/controls/VRControls.js":7,"../../node_modules/three/examples/js/effects/VREffect.js":8,"../third_party/three/OrbitControls.js":24,"../third_party/webvr-boilerplate/build/webvr-manager":25,"../util":26,"./adaptive-player":10,"./eyes":12,"./hotspot-renderer":13,"./reticle-renderer":17,"./sphere-renderer":19,"./video-proxy":20,"@tweenjs/tween.js":1,"eventemitter3":3}],23:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Messages from the API to the embed.
 */
var Message = {
  PLAY: 'play',
  PAUSE: 'pause',
  TIMEUPDATE: 'timeupdate',
  ADD_HOTSPOT: 'addhotspot',
  SET_CONTENT: 'setimage',
  SET_VOLUME: 'setvolume',
  MUTED: 'muted',
  SET_CURRENT_TIME: 'setcurrenttime',
  DEVICE_MOTION: 'devicemotion',
  GET_POSITION: 'getposition',
  SET_FULLSCREEN: 'setfullscreen',
};

module.exports = Message;

},{}],24:[function(_dereq_,module,exports){
/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finger swipe

THREE.OrbitControls = function ( object, domElement ) {

	this.object = object;

	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the object orbits around
	this.target = new THREE.Vector3();

	// How far you can dolly in and out ( PerspectiveCamera only )
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// How far you can zoom in and out ( OrthographicCamera only )
	this.minZoom = 0;
	this.maxZoom = Infinity;

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	// How far you can orbit horizontally, upper and lower limits.
	// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
	this.minAzimuthAngle = - Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Set to true to enable damping (inertia)
	// If damping is enabled, you must call controls.update() in your animation loop
	this.enableDamping = false;
	this.dampingFactor = 0.25;

	// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
	// Set to false to disable zooming
	this.enableZoom = true;
	this.zoomSpeed = 1.0;

	// Set to false to disable rotating
	this.enableRotate = true;
	this.rotateSpeed = 1.0;

	// Set to false to disable panning
	this.enablePan = true;
	this.panSpeed = 1.0;
	this.panningMode = THREE.ScreenSpacePanning; // alternate THREE.HorizontalPanning
	this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	// If auto-rotate is enabled, you must call controls.update() in your animation loop
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	// Set to false to disable use of the keys
	this.enableKeys = true;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	// Mouse buttons
	this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

	// for reset
	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.zoom0 = this.object.zoom;

	//
	// public methods
	//

	this.getPolarAngle = function () {

		return spherical.phi;

	};

	this.getAzimuthalAngle = function () {

		return spherical.theta;

	};

	this.saveState = function () {

		scope.target0.copy( scope.target );
		scope.position0.copy( scope.object.position );
		scope.zoom0 = scope.object.zoom;

	};

	this.reset = function () {

		scope.target.copy( scope.target0 );
		scope.object.position.copy( scope.position0 );
		scope.object.zoom = scope.zoom0;

		scope.object.updateProjectionMatrix();
		scope.dispatchEvent( changeEvent );

		scope.update();

		state = STATE.NONE;

	};

	// this method is exposed, but perhaps it would be better if we can make it private...
	this.update = function () {

		var offset = new THREE.Vector3();

		// so camera.up is the orbit axis
		var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
		var quatInverse = quat.clone().inverse();

		var lastPosition = new THREE.Vector3();
		var lastQuaternion = new THREE.Quaternion();

		return function update() {

			var position = scope.object.position;

			offset.copy( position ).sub( scope.target );

			// rotate offset to "y-axis-is-up" space
			offset.applyQuaternion( quat );

			// angle from z-axis around y-axis
			spherical.setFromVector3( offset );

			if ( scope.autoRotate && state === STATE.NONE ) {

				rotateLeft( getAutoRotationAngle() );

			}

			spherical.theta += sphericalDelta.theta;
			spherical.phi += sphericalDelta.phi;

			// restrict theta to be between desired limits
			spherical.theta = Math.max( scope.minAzimuthAngle, Math.min( scope.maxAzimuthAngle, spherical.theta ) );

			// restrict phi to be between desired limits
			spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );

			spherical.makeSafe();


			spherical.radius *= scale;

			// restrict radius to be between desired limits
			spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

			// move target to panned location
			scope.target.add( panOffset );

			offset.setFromSpherical( spherical );

			// rotate offset back to "camera-up-vector-is-up" space
			offset.applyQuaternion( quatInverse );

			position.copy( scope.target ).add( offset );

			scope.object.lookAt( scope.target );

			if ( scope.enableDamping === true ) {

				sphericalDelta.theta *= ( 1 - scope.dampingFactor );
				sphericalDelta.phi *= ( 1 - scope.dampingFactor );

				panOffset.multiplyScalar( 1 - scope.dampingFactor );

			} else {

				sphericalDelta.set( 0, 0, 0 );

				panOffset.set( 0, 0, 0 );

			}

			scale = 1;

			// update condition is:
			// min(camera displacement, camera rotation in radians)^2 > EPS
			// using small-angle approximation cos(x/2) = 1 - x^2 / 8

			if ( zoomChanged ||
				lastPosition.distanceToSquared( scope.object.position ) > EPS ||
				8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

				scope.dispatchEvent( changeEvent );

				lastPosition.copy( scope.object.position );
				lastQuaternion.copy( scope.object.quaternion );
				zoomChanged = false;

				return true;

			}

			return false;

		};

	}();

	this.dispose = function () {

		scope.domElement.removeEventListener( 'contextmenu', onContextMenu, false );
		scope.domElement.removeEventListener( 'mousedown', onMouseDown, false );
		scope.domElement.removeEventListener( 'wheel', onMouseWheel, false );

		scope.domElement.removeEventListener( 'touchstart', onTouchStart, false );
		scope.domElement.removeEventListener( 'touchend', onTouchEnd, false );
		scope.domElement.removeEventListener( 'touchmove', onTouchMove, false );

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );

		window.removeEventListener( 'keydown', onKeyDown, false );

		//scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

	};

	//
	// internals
	//

	var scope = this;

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };

	var STATE = { NONE: - 1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY: 4, TOUCH_PAN: 5 };

	var state = STATE.NONE;

	var EPS = 0.000001;

	// current position in spherical coordinates
	var spherical = new THREE.Spherical();
	var sphericalDelta = new THREE.Spherical();

	var scale = 1;
	var panOffset = new THREE.Vector3();
	var zoomChanged = false;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow( 0.95, scope.zoomSpeed );

	}

	function rotateLeft( angle ) {

		sphericalDelta.theta -= angle;

	}

	function rotateUp( angle ) {

		sphericalDelta.phi -= angle;

	}

	var panLeft = function () {

		var v = new THREE.Vector3();

		return function panLeft( distance, objectMatrix ) {

			v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix
			v.multiplyScalar( - distance );

			panOffset.add( v );

		};

	}();

	var panUp = function () {

		var v = new THREE.Vector3();

		return function panUp( distance, objectMatrix ) {

			switch ( scope.panningMode ) {

				case THREE.ScreenSpacePanning:

					v.setFromMatrixColumn( objectMatrix, 1 );
					break;

				case THREE.HorizontalPanning:

					v.setFromMatrixColumn( objectMatrix, 0 );
					v.crossVectors( scope.object.up, v );
					break;

			}

			v.multiplyScalar( distance );

			panOffset.add( v );

		};

	}();

	// deltaX and deltaY are in pixels; right and down are positive
	var pan = function () {

		var offset = new THREE.Vector3();

		return function pan( deltaX, deltaY ) {

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			if ( scope.object.isPerspectiveCamera ) {

				// perspective
				var position = scope.object.position;
				offset.copy( position ).sub( scope.target );
				var targetDistance = offset.length();

				// half of the fov is center to top of screen
				targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

				// we actually don't use screenWidth, since perspective camera is fixed to screen height
				panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
				panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );

			} else if ( scope.object.isOrthographicCamera ) {

				// orthographic
				panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
				panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );

			} else {

				// camera neither orthographic nor perspective
				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
				scope.enablePan = false;

			}

		};

	}();

	function dollyIn( dollyScale ) {

		if ( scope.object.isPerspectiveCamera ) {

			scale /= dollyScale;

		} else if ( scope.object.isOrthographicCamera ) {

			scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
			scope.object.updateProjectionMatrix();
			zoomChanged = true;

		} else {

			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
			scope.enableZoom = false;

		}

	}

	function dollyOut( dollyScale ) {

		if ( scope.object.isPerspectiveCamera ) {

			scale *= dollyScale;

		} else if ( scope.object.isOrthographicCamera ) {

			scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
			scope.object.updateProjectionMatrix();
			zoomChanged = true;

		} else {

			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
			scope.enableZoom = false;

		}

	}

	//
	// event callbacks - update the object state
	//

	function handleMouseDownRotate( event ) {

		//console.log( 'handleMouseDownRotate' );

		rotateStart.set( event.clientX, event.clientY );

	}

	function handleMouseDownDolly( event ) {

		//console.log( 'handleMouseDownDolly' );

		dollyStart.set( event.clientX, event.clientY );

	}

	function handleMouseDownPan( event ) {

		//console.log( 'handleMouseDownPan' );

		panStart.set( event.clientX, event.clientY );

	}

	function handleMouseMoveRotate( event ) {

		//console.log( 'handleMouseMoveRotate' );

		rotateEnd.set( event.clientX, event.clientY );

		rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );;

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		// rotating across whole screen goes 360 degrees around
		rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth );

		// rotating up and down along whole screen attempts to go 360, but limited to 180
		rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

		rotateStart.copy( rotateEnd );

		scope.update();

	}

	function handleMouseMoveDolly( event ) {

		//console.log( 'handleMouseMoveDolly' );

		dollyEnd.set( event.clientX, event.clientY );

		dollyDelta.subVectors( dollyEnd, dollyStart );

		if ( dollyDelta.y > 0 ) {

			dollyIn( getZoomScale() );

		} else if ( dollyDelta.y < 0 ) {

			dollyOut( getZoomScale() );

		}

		dollyStart.copy( dollyEnd );

		scope.update();

	}

	function handleMouseMovePan( event ) {

		//console.log( 'handleMouseMovePan' );

		panEnd.set( event.clientX, event.clientY );

		panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );

		pan( panDelta.x, panDelta.y );

		panStart.copy( panEnd );

		scope.update();

	}

	function handleMouseUp( event ) {

		// console.log( 'handleMouseUp' );

	}

	function handleMouseWheel( event ) {

		// console.log( 'handleMouseWheel' );

		if ( event.deltaY < 0 ) {

			dollyOut( getZoomScale() );

		} else if ( event.deltaY > 0 ) {

			dollyIn( getZoomScale() );

		}

		scope.update();

	}

	function handleKeyDown( event ) {

		//console.log( 'handleKeyDown' );

		switch ( event.keyCode ) {

			case scope.keys.UP:
				pan( 0, scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.BOTTOM:
				pan( 0, - scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.LEFT:
				pan( scope.keyPanSpeed, 0 );
				scope.update();
				break;

			case scope.keys.RIGHT:
				pan( - scope.keyPanSpeed, 0 );
				scope.update();
				break;

		}

	}

	function handleTouchStartRotate( event ) {

		//console.log( 'handleTouchStartRotate' );

		rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

	}

	function handleTouchStartDolly( event ) {

		//console.log( 'handleTouchStartDolly' );

		var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
		var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

		var distance = Math.sqrt( dx * dx + dy * dy );

		dollyStart.set( 0, distance );

	}

	function handleTouchStartPan( event ) {

		//console.log( 'handleTouchStartPan' );

		panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

	}

	function handleTouchMoveRotate( event ) {

		//console.log( 'handleTouchMoveRotate' );

		rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		// rotating across whole screen goes 360 degrees around
		rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth );

		// rotating up and down along whole screen attempts to go 360, but limited to 180
		rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

		rotateStart.copy( rotateEnd );

		scope.update();

	}

	function handleTouchMoveDolly( event ) {

		//console.log( 'handleTouchMoveDolly' );

		var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
		var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

		var distance = Math.sqrt( dx * dx + dy * dy );

		dollyEnd.set( 0, distance );

		dollyDelta.subVectors( dollyEnd, dollyStart );

		if ( dollyDelta.y > 0 ) {

			dollyOut( getZoomScale() );

		} else if ( dollyDelta.y < 0 ) {

			dollyIn( getZoomScale() );

		}

		dollyStart.copy( dollyEnd );

		scope.update();

	}

	function handleTouchMovePan( event ) {

		//console.log( 'handleTouchMovePan' );

		panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );

		pan( panDelta.x, panDelta.y );

		panStart.copy( panEnd );

		scope.update();

	}

	function handleTouchEnd( event ) {

		//console.log( 'handleTouchEnd' );

	}

	//
	// event handlers - FSM: listen for events and reset state
	//

	function onMouseDown( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		switch ( event.button ) {

			case scope.mouseButtons.ORBIT:

				if ( scope.enableRotate === false ) return;

				handleMouseDownRotate( event );

				state = STATE.ROTATE;

				break;

			case scope.mouseButtons.ZOOM:

				if ( scope.enableZoom === false ) return;

				handleMouseDownDolly( event );

				state = STATE.DOLLY;

				break;

			case scope.mouseButtons.PAN:

				if ( scope.enablePan === false ) return;

				handleMouseDownPan( event );

				state = STATE.PAN;

				break;

		}

		if ( state !== STATE.NONE ) {

			document.addEventListener( 'mousemove', onMouseMove, false );
			document.addEventListener( 'mouseup', onMouseUp, false );

			scope.dispatchEvent( startEvent );

		}

	}

	function onMouseMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		switch ( state ) {

			case STATE.ROTATE:

				if ( scope.enableRotate === false ) return;

				handleMouseMoveRotate( event );

				break;

			case STATE.DOLLY:

				if ( scope.enableZoom === false ) return;

				handleMouseMoveDolly( event );

				break;

			case STATE.PAN:

				if ( scope.enablePan === false ) return;

				handleMouseMovePan( event );

				break;

		}

	}

	function onMouseUp( event ) {

		if ( scope.enabled === false ) return;

		handleMouseUp( event );

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );

		scope.dispatchEvent( endEvent );

		state = STATE.NONE;

	}

	function onMouseWheel( event ) {

		if ( scope.enabled === false || scope.enableZoom === false || ( state !== STATE.NONE && state !== STATE.ROTATE ) ) return;

		event.preventDefault();
		event.stopPropagation();

		scope.dispatchEvent( startEvent );

		handleMouseWheel( event );

		scope.dispatchEvent( endEvent );

	}

	function onKeyDown( event ) {

		if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

		handleKeyDown( event );

	}

	function onTouchStart( event ) {

		if ( scope.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:	// one-fingered touch: rotate

				if ( scope.enableRotate === false ) return;

				handleTouchStartRotate( event );

				state = STATE.TOUCH_ROTATE;

				break;

			case 2:	// two-fingered touch: dolly

				if ( scope.enableZoom === false ) return;

				handleTouchStartDolly( event );

				state = STATE.TOUCH_DOLLY;

				break;

			case 3: // three-fingered touch: pan

				if ( scope.enablePan === false ) return;

				handleTouchStartPan( event );

				state = STATE.TOUCH_PAN;

				break;

			default:

				state = STATE.NONE;

		}

		if ( state !== STATE.NONE ) {

			scope.dispatchEvent( startEvent );

		}

	}

	function onTouchMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		switch ( event.touches.length ) {

			case 1: // one-fingered touch: rotate

				if ( scope.enableRotate === false ) return;
				if ( state !== STATE.TOUCH_ROTATE ) return; // is this needed?...

				handleTouchMoveRotate( event );

				break;

			case 2: // two-fingered touch: dolly

				if ( scope.enableZoom === false ) return;
				if ( state !== STATE.TOUCH_DOLLY ) return; // is this needed?...

				handleTouchMoveDolly( event );

				break;

			case 3: // three-fingered touch: pan

				if ( scope.enablePan === false ) return;
				if ( state !== STATE.TOUCH_PAN ) return; // is this needed?...

				handleTouchMovePan( event );

				break;

			default:

				state = STATE.NONE;

		}

	}

	function onTouchEnd( event ) {

		if ( scope.enabled === false ) return;

		handleTouchEnd( event );

		scope.dispatchEvent( endEvent );

		state = STATE.NONE;

	}

	function onContextMenu( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

	}

	//

	scope.domElement.addEventListener( 'contextmenu', onContextMenu, false );

	scope.domElement.addEventListener( 'mousedown', onMouseDown, false );
	scope.domElement.addEventListener( 'wheel', onMouseWheel, false );

	scope.domElement.addEventListener( 'touchstart', onTouchStart, false );
	scope.domElement.addEventListener( 'touchend', onTouchEnd, false );
	scope.domElement.addEventListener( 'touchmove', onTouchMove, { capture: false, passive: false } );

	window.addEventListener( 'keydown', onKeyDown, false );

	// force an update at start

	this.update();

};

THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

Object.defineProperties( THREE.OrbitControls.prototype, {

	center: {

		get: function () {

			console.warn( 'THREE.OrbitControls: .center has been renamed to .target' );
			return this.target;

		}

	},

	// backward compatibility

	noZoom: {

		get: function () {

			console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
			return ! this.enableZoom;

		},

		set: function ( value ) {

			console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
			this.enableZoom = ! value;

		}

	},

	noRotate: {

		get: function () {

			console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
			return ! this.enableRotate;

		},

		set: function ( value ) {

			console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
			this.enableRotate = ! value;

		}

	},

	noPan: {

		get: function () {

			console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
			return ! this.enablePan;

		},

		set: function ( value ) {

			console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
			this.enablePan = ! value;

		}

	},

	noKeys: {

		get: function () {

			console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
			return ! this.enableKeys;

		},

		set: function ( value ) {

			console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
			this.enableKeys = ! value;

		}

	},

	staticMoving: {

		get: function () {

			console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
			return ! this.enableDamping;

		},

		set: function ( value ) {

			console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
			this.enableDamping = ! value;

		}

	},

	dynamicDampingFactor: {

		get: function () {

			console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
			return this.dampingFactor;

		},

		set: function ( value ) {

			console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
			this.dampingFactor = value;

		}

	}

} );

THREE.ScreenSpacePanning = 0;
THREE.HorizontalPanning = 1;

},{}],25:[function(_dereq_,module,exports){
(function (global){
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WebVRManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Emitter = _dereq_('./emitter.js');
var Modes = _dereq_('./modes.js');
var Util = _dereq_('./util.js');

/**
 * Everything having to do with the WebVR button.
 * Emits a 'click' event when it's clicked.
 */
function ButtonManager(opt_root) {
  var root = opt_root || document.body;
  this.loadIcons_();

  // Make the fullscreen button.
  var fsButton = this.createButton();
  fsButton.src = this.ICONS.fullscreen;
  fsButton.title = 'Fullscreen mode';
  var s = fsButton.style;
  s.bottom = 0;
  s.right = 0;
  fsButton.addEventListener('click', this.createClickHandler_('fs'));
  root.appendChild(fsButton);
  this.fsButton = fsButton;

  // Make the VR button.
  var vrButton = this.createButton();
  vrButton.src = this.ICONS.cardboard;
  vrButton.title = 'Virtual reality mode';
  var s = vrButton.style;
  s.bottom = 0;
  s.right = '48px';
  vrButton.addEventListener('click', this.createClickHandler_('vr'));
  root.appendChild(vrButton);
  this.vrButton = vrButton;

  this.isVisible = true;

}
ButtonManager.prototype = new Emitter();

ButtonManager.prototype.createButton = function() {
  var button = document.createElement('img');
  button.className = 'webvr-button';
  var s = button.style;
  s.position = 'absolute';
  s.width = '24px'
  s.height = '24px';
  s.backgroundSize = 'cover';
  s.backgroundColor = 'transparent';
  s.border = 0;
  s.userSelect = 'none';
  s.webkitUserSelect = 'none';
  s.MozUserSelect = 'none';
  s.cursor = 'pointer';
  s.padding = '12px';
  s.zIndex = 1;
  s.display = 'none';
  s.boxSizing = 'content-box';

  // Prevent button from being selected and dragged.
  button.draggable = false;
  button.addEventListener('dragstart', function(e) {
    e.preventDefault();
  });

  // Style it on hover.
  button.addEventListener('mouseenter', function(e) {
    s.filter = s.webkitFilter = 'drop-shadow(0 0 5px rgba(255,255,255,1))';
  });
  button.addEventListener('mouseleave', function(e) {
    s.filter = s.webkitFilter = '';
  });
  return button;
};

ButtonManager.prototype.setMode = function(mode, isVRCompatible) {
  isVRCompatible = isVRCompatible || WebVRConfig.FORCE_ENABLE_VR;
  if (!this.isVisible) {
    return;
  }
  switch (mode) {
    case Modes.NORMAL:
      this.fsButton.style.display = 'block';
      this.fsButton.src = this.ICONS.fullscreen;
      this.vrButton.style.display = (isVRCompatible ? 'block' : 'none');
      break;
    case Modes.MAGIC_WINDOW:
      this.fsButton.style.display = 'block';
      this.fsButton.src = this.ICONS.exitFullscreen;
      this.vrButton.style.display = 'none';
      break;
    case Modes.VR:
      this.fsButton.style.display = 'none';
      this.vrButton.style.display = 'none';
      break;
  }

  // Hack for Safari Mac/iOS to force relayout (svg-specific issue)
  // http://goo.gl/hjgR6r
  var oldValue = this.fsButton.style.display;
  this.fsButton.style.display = 'inline-block';
  this.fsButton.offsetHeight;
  this.fsButton.style.display = oldValue;
};

ButtonManager.prototype.setVisibility = function(isVisible) {
  this.isVisible = isVisible;
  this.fsButton.style.display = isVisible ? 'block' : 'none';
  this.vrButton.style.display = isVisible ? 'block' : 'none';
};

ButtonManager.prototype.createClickHandler_ = function(eventName) {
  return function(e) {
    e.stopPropagation();
    e.preventDefault();
    this.emit(eventName);
  }.bind(this);
};

ButtonManager.prototype.loadIcons_ = function() {
  // Preload some hard-coded SVG.
  this.ICONS = {};
  this.ICONS.cardboard = Util.base64('image/svg+xml', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+CiAgICA8cGF0aCBkPSJNMjAuNzQgNkgzLjIxQzIuNTUgNiAyIDYuNTcgMiA3LjI4djEwLjQ0YzAgLjcuNTUgMS4yOCAxLjIzIDEuMjhoNC43OWMuNTIgMCAuOTYtLjMzIDEuMTQtLjc5bDEuNC0zLjQ4Yy4yMy0uNTkuNzktMS4wMSAxLjQ0LTEuMDFzMS4yMS40MiAxLjQ1IDEuMDFsMS4zOSAzLjQ4Yy4xOS40Ni42My43OSAxLjExLjc5aDQuNzljLjcxIDAgMS4yNi0uNTcgMS4yNi0xLjI4VjcuMjhjMC0uNy0uNTUtMS4yOC0xLjI2LTEuMjh6TTcuNSAxNC42MmMtMS4xNyAwLTIuMTMtLjk1LTIuMTMtMi4xMiAwLTEuMTcuOTYtMi4xMyAyLjEzLTIuMTMgMS4xOCAwIDIuMTIuOTYgMi4xMiAyLjEzcy0uOTUgMi4xMi0yLjEyIDIuMTJ6bTkgMGMtMS4xNyAwLTIuMTMtLjk1LTIuMTMtMi4xMiAwLTEuMTcuOTYtMi4xMyAyLjEzLTIuMTNzMi4xMi45NiAyLjEyIDIuMTMtLjk1IDIuMTItMi4xMiAyLjEyeiIvPgogICAgPHBhdGggZmlsbD0ibm9uZSIgZD0iTTAgMGgyNHYyNEgwVjB6Ii8+Cjwvc3ZnPgo=');
  this.ICONS.fullscreen = Util.base64('image/svg+xml', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+CiAgICA8cGF0aCBkPSJNMCAwaDI0djI0SDB6IiBmaWxsPSJub25lIi8+CiAgICA8cGF0aCBkPSJNNyAxNEg1djVoNXYtMkg3di0zem0tMi00aDJWN2gzVjVINXY1em0xMiA3aC0zdjJoNXYtNWgtMnYzek0xNCA1djJoM3YzaDJWNWgtNXoiLz4KPC9zdmc+Cg==');
  this.ICONS.exitFullscreen = Util.base64('image/svg+xml', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+CiAgICA8cGF0aCBkPSJNMCAwaDI0djI0SDB6IiBmaWxsPSJub25lIi8+CiAgICA8cGF0aCBkPSJNNSAxNmgzdjNoMnYtNUg1djJ6bTMtOEg1djJoNVY1SDh2M3ptNiAxMWgydi0zaDN2LTJoLTV2NXptMi0xMVY1aC0ydjVoNVY4aC0zeiIvPgo8L3N2Zz4K');
  this.ICONS.settings = Util.base64('image/svg+xml', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+CiAgICA8cGF0aCBkPSJNMCAwaDI0djI0SDB6IiBmaWxsPSJub25lIi8+CiAgICA8cGF0aCBkPSJNMTkuNDMgMTIuOThjLjA0LS4zMi4wNy0uNjQuMDctLjk4cy0uMDMtLjY2LS4wNy0uOThsMi4xMS0xLjY1Yy4xOS0uMTUuMjQtLjQyLjEyLS42NGwtMi0zLjQ2Yy0uMTItLjIyLS4zOS0uMy0uNjEtLjIybC0yLjQ5IDFjLS41Mi0uNC0xLjA4LS43My0xLjY5LS45OGwtLjM4LTIuNjVDMTQuNDYgMi4xOCAxNC4yNSAyIDE0IDJoLTRjLS4yNSAwLS40Ni4xOC0uNDkuNDJsLS4zOCAyLjY1Yy0uNjEuMjUtMS4xNy41OS0xLjY5Ljk4bC0yLjQ5LTFjLS4yMy0uMDktLjQ5IDAtLjYxLjIybC0yIDMuNDZjLS4xMy4yMi0uMDcuNDkuMTIuNjRsMi4xMSAxLjY1Yy0uMDQuMzItLjA3LjY1LS4wNy45OHMuMDMuNjYuMDcuOThsLTIuMTEgMS42NWMtLjE5LjE1LS4yNC40Mi0uMTIuNjRsMiAzLjQ2Yy4xMi4yMi4zOS4zLjYxLjIybDIuNDktMWMuNTIuNCAxLjA4LjczIDEuNjkuOThsLjM4IDIuNjVjLjAzLjI0LjI0LjQyLjQ5LjQyaDRjLjI1IDAgLjQ2LS4xOC40OS0uNDJsLjM4LTIuNjVjLjYxLS4yNSAxLjE3LS41OSAxLjY5LS45OGwyLjQ5IDFjLjIzLjA5LjQ5IDAgLjYxLS4yMmwyLTMuNDZjLjEyLS4yMi4wNy0uNDktLjEyLS42NGwtMi4xMS0xLjY1ek0xMiAxNS41Yy0xLjkzIDAtMy41LTEuNTctMy41LTMuNXMxLjU3LTMuNSAzLjUtMy41IDMuNSAxLjU3IDMuNSAzLjUtMS41NyAzLjUtMy41IDMuNXoiLz4KPC9zdmc+Cg==');
};

module.exports = ButtonManager;

},{"./emitter.js":2,"./modes.js":3,"./util.js":4}],2:[function(_dereq_,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function Emitter() {
  this.callbacks = {};
}

Emitter.prototype.emit = function(eventName) {
  var callbacks = this.callbacks[eventName];
  if (!callbacks) {
    //console.log('No valid callback specified.');
    return;
  }
  var args = [].slice.call(arguments);
  // Eliminate the first param (the callback).
  args.shift();
  for (var i = 0; i < callbacks.length; i++) {
    callbacks[i].apply(this, args);
  }
};

Emitter.prototype.on = function(eventName, callback) {
  if (eventName in this.callbacks) {
    this.callbacks[eventName].push(callback);
  } else {
    this.callbacks[eventName] = [callback];
  }
};

module.exports = Emitter;

},{}],3:[function(_dereq_,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Modes = {
  UNKNOWN: 0,
  // Not fullscreen, just tracking.
  NORMAL: 1,
  // Magic window immersive mode.
  MAGIC_WINDOW: 2,
  // Full screen split screen VR mode.
  VR: 3,
};

module.exports = Modes;

},{}],4:[function(_dereq_,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Util = {};

Util.base64 = function(mimeType, base64) {
  return 'data:' + mimeType + ';base64,' + base64;
};

Util.isMobile = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

Util.isFirefox = function() {
  return /firefox/i.test(navigator.userAgent);
};

Util.isIOS = function() {
  return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
};

Util.isIFrame = function() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

Util.appendQueryParameter = function(url, key, value) {
  // Determine delimiter based on if the URL already GET parameters in it.
  var delimiter = (url.indexOf('?') < 0 ? '?' : '&');
  url += delimiter + key + '=' + value;
  return url;
};

// From http://goo.gl/4WX3tg
Util.getQueryParameter = function(name) {
  var name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};

Util.isLandscapeMode = function() {
  return (window.orientation == 90 || window.orientation == -90);
};

Util.getScreenWidth = function() {
  return Math.max(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

Util.getScreenHeight = function() {
  return Math.min(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

module.exports = Util;

},{}],5:[function(_dereq_,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var ButtonManager = _dereq_('./button-manager.js');
var Emitter = _dereq_('./emitter.js');
var Modes = _dereq_('./modes.js');
var Util = _dereq_('./util.js');

/**
 * Helper for getting in and out of VR mode.
 */
function WebVRManager(renderer, effect, params) {
  this.params = params || {};

  this.mode = Modes.UNKNOWN;

  // Set option to hide the button.
  this.hideButton = this.params.hideButton || false;
  // Whether or not the FOV should be distorted or un-distorted. By default, it
  // should be distorted, but in the case of vertex shader based distortion,
  // ensure that we use undistorted parameters.
  this.predistorted = !!this.params.predistorted;

  // Save the THREE.js renderer and effect for later.
  this.renderer = renderer;
  this.effect = effect;
  var polyfillWrapper = document.querySelector('.webvr-polyfill-fullscreen-wrapper');
  this.button = new ButtonManager(polyfillWrapper);

  this.isFullscreenDisabled = !!Util.getQueryParameter('no_fullscreen');
  this.startMode = Modes.NORMAL;
  var startModeParam = parseInt(Util.getQueryParameter('start_mode'));
  if (!isNaN(startModeParam)) {
    this.startMode = startModeParam;
  }

  if (this.hideButton) {
    this.button.setVisibility(false);
  }

  // Check if the browser is compatible with WebVR.
  this.getDeviceByType_(VRDisplay).then(function(hmd) {
    this.hmd = hmd;

    // Only enable VR mode if there's a VR device attached or we are running the
    // polyfill on mobile.
    if (hmd && !this.isVRCompatibleOverride) {
      this.isVRCompatible =  !hmd.isPolyfilled || Util.isMobile();
    }

    switch (this.startMode) {
      case Modes.MAGIC_WINDOW:
        this.setMode_(Modes.MAGIC_WINDOW);
        break;
      case Modes.VR:
        this.enterVRMode_();
        this.setMode_(Modes.VR);
        break;
      default:
        this.setMode_(Modes.NORMAL);
    }

    this.emit('initialized');
  }.bind(this));

  // Hook up button listeners.
  this.button.on('fs', this.onFSClick_.bind(this));
  this.button.on('vr', this.onVRClick_.bind(this));

  // Bind to fullscreen events.
  document.addEventListener('webkitfullscreenchange',
      this.onFullscreenChange_.bind(this));
  document.addEventListener('mozfullscreenchange',
      this.onFullscreenChange_.bind(this));
  document.addEventListener('msfullscreenchange',
      this.onFullscreenChange_.bind(this));

  // Bind to VR* specific events.
  window.addEventListener('vrdisplaypresentchange',
      this.onVRDisplayPresentChange_.bind(this));
  window.addEventListener('vrdisplaydeviceparamschange',
      this.onVRDisplayDeviceParamsChange_.bind(this));
}

WebVRManager.prototype = new Emitter();

// Expose these values externally.
WebVRManager.Modes = Modes;

WebVRManager.prototype.render = function(scene, camera, timestamp) {
  // Scene may be an array of two scenes, one for each eye.
  if (scene instanceof Array) {
    this.effect.render(scene[0], camera);
  } else {
    this.effect.render(scene, camera);
  }
};

WebVRManager.prototype.setVRCompatibleOverride = function(isVRCompatible) {
  this.isVRCompatible = isVRCompatible;
  this.isVRCompatibleOverride = true;

  // Don't actually change modes, just update the buttons.
  this.button.setMode(this.mode, this.isVRCompatible);
};

WebVRManager.prototype.setFullscreenCallback = function(callback) {
  this.fullscreenCallback = callback;
};

WebVRManager.prototype.setVRCallback = function(callback) {
  this.vrCallback = callback;
};

WebVRManager.prototype.setExitFullscreenCallback = function(callback) {
  this.exitFullscreenCallback = callback;
}

/**
 * Promise returns true if there is at least one HMD device available.
 */
WebVRManager.prototype.getDeviceByType_ = function(type) {
  return new Promise(function(resolve, reject) {
    navigator.getVRDisplays().then(function(displays) {
      // Promise succeeds, but check if there are any displays actually.
      for (var i = 0; i < displays.length; i++) {
        if (displays[i] instanceof type) {
          resolve(displays[i]);
          break;
        }
      }
      resolve(null);
    }, function() {
      // No displays are found.
      resolve(null);
    });
  });
};

/**
 * Helper for entering VR mode.
 */
WebVRManager.prototype.enterVRMode_ = function() {
  this.hmd.requestPresent([{
    source: this.renderer.domElement,
    predistorted: this.predistorted
  }]);
};

WebVRManager.prototype.setMode_ = function(mode) {
  var oldMode = this.mode;
  if (mode == this.mode) {
    console.warn('Not changing modes, already in %s', mode);
    return;
  }
  // console.log('Mode change: %s => %s', this.mode, mode);
  this.mode = mode;
  this.button.setMode(mode, this.isVRCompatible);

  // Emit an event indicating the mode changed.
  this.emit('modechange', mode, oldMode);
};

/**
 * Main button was clicked.
 */
WebVRManager.prototype.onFSClick_ = function() {
  switch (this.mode) {
    case Modes.NORMAL:
      // TODO: Remove this hack if/when iOS gets real fullscreen mode.
      // If this is an iframe on iOS, break out and open in no_fullscreen mode.
      if (Util.isIOS() && Util.isIFrame()) {
        if (this.fullscreenCallback) {
          this.fullscreenCallback();
        } else {
          var url = window.location.href;
          url = Util.appendQueryParameter(url, 'no_fullscreen', 'true');
          url = Util.appendQueryParameter(url, 'start_mode', Modes.MAGIC_WINDOW);
          top.location.href = url;
          return;
        }
      }
      this.setMode_(Modes.MAGIC_WINDOW);
      this.requestFullscreen_();
      break;
    case Modes.MAGIC_WINDOW:
      if (this.isFullscreenDisabled) {
        window.history.back();
        return;
      }
      if (this.exitFullscreenCallback) {
        this.exitFullscreenCallback();
      }
      this.setMode_(Modes.NORMAL);
      this.exitFullscreen_();
      break;
  }
};

/**
 * The VR button was clicked.
 */
WebVRManager.prototype.onVRClick_ = function() {
  // TODO: Remove this hack when iOS has fullscreen mode.
  // If this is an iframe on iOS, break out and open in no_fullscreen mode.
  if (this.mode == Modes.NORMAL && Util.isIOS() && Util.isIFrame()) {
    if (this.vrCallback) {
      this.vrCallback();
    } else {
      var url = window.location.href;
      url = Util.appendQueryParameter(url, 'no_fullscreen', 'true');
      url = Util.appendQueryParameter(url, 'start_mode', Modes.VR);
      top.location.href = url;
      return;
    }
  }
  this.enterVRMode_();
};

WebVRManager.prototype.requestFullscreen_ = function() {
  var canvas = document.body;
  //var canvas = this.renderer.domElement;
  if (canvas.requestFullscreen) {
    canvas.requestFullscreen();
  } else if (canvas.mozRequestFullScreen) {
    canvas.mozRequestFullScreen();
  } else if (canvas.webkitRequestFullscreen) {
    canvas.webkitRequestFullscreen();
  } else if (canvas.msRequestFullscreen) {
    canvas.msRequestFullscreen();
  }
};

WebVRManager.prototype.exitFullscreen_ = function() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
};

WebVRManager.prototype.onVRDisplayPresentChange_ = function(e) {
  console.log('onVRDisplayPresentChange_', e);
  if (this.hmd.isPresenting) {
    this.setMode_(Modes.VR);
  } else {
    this.setMode_(Modes.NORMAL);
  }
};

WebVRManager.prototype.onVRDisplayDeviceParamsChange_ = function(e) {
  console.log('onVRDisplayDeviceParamsChange_', e);
};

WebVRManager.prototype.onFullscreenChange_ = function(e) {
  // If we leave full-screen, go back to normal mode.
  if (document.webkitFullscreenElement === null ||
      document.mozFullScreenElement === null) {
    this.setMode_(Modes.NORMAL);
  }
};

module.exports = WebVRManager;

},{"./button-manager.js":1,"./emitter.js":2,"./modes.js":3,"./util.js":4}]},{},[5])(5)
});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],26:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Util = window.Util || {};

Util.isDataURI = function(src) {
  return src && src.indexOf('data:') == 0;
};

Util.generateUUID = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

Util.isMobile = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

Util.isIOS = function() {
  return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
};

Util.isSafari = function() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

Util.cloneObject = function(obj) {
  var out = {};
  for (key in obj) {
    out[key] = obj[key];
  }
  return out;
};

Util.hashCode = function(s) {
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
};

Util.loadTrackSrc = function(context, src, callback, opt_progressCallback) {
  var request = new XMLHttpRequest();
  request.open('GET', src, true);
  request.responseType = 'arraybuffer';

  // Decode asynchronously.
  request.onload = function() {
    context.decodeAudioData(request.response, function(buffer) {
      callback(buffer);
    }, function(e) {
      console.error(e);
    });
  };
  if (opt_progressCallback) {
    request.onprogress = function(e) {
      var percent = e.loaded / e.total;
      opt_progressCallback(percent);
    };
  }
  request.send();
};

Util.isPow2 = function(n) {
  return (n & (n - 1)) == 0;
};

Util.capitalize = function(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

Util.isIFrame = function() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

// From http://goo.gl/4WX3tg
Util.getQueryParameter = function(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};


// From http://stackoverflow.com/questions/11871077/proper-way-to-detect-webgl-support.
Util.isWebGLEnabled = function() {
  var canvas = document.createElement('canvas');
  try { gl = canvas.getContext("webgl"); }
  catch (x) { gl = null; }

  if (gl == null) {
    try { gl = canvas.getContext("experimental-webgl"); experimental = true; }
    catch (x) { gl = null; }
  }
  return !!gl;
};

Util.clone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

// From http://stackoverflow.com/questions/10140604/fastest-hypotenuse-in-javascript
Util.hypot = Math.hypot || function(x, y) {
  return Math.sqrt(x*x + y*y);
};

// From http://stackoverflow.com/a/17447718/693934
Util.isIE11 = function() {
  return navigator.userAgent.match(/Trident/);
};

Util.getRectCenter = function(rect) {
  return new THREE.Vector2(rect.x + rect.width/2, rect.y + rect.height/2);
};

Util.getScreenWidth = function() {
  return Math.max(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

Util.getScreenHeight = function() {
  return Math.min(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

Util.isIOS9OrLess = function() {
  if (!Util.isIOS()) {
    return false;
  }
  var re = /(iPhone|iPad|iPod) OS ([\d_]+)/;
  var iOSVersion = navigator.userAgent.match(re);
  if (!iOSVersion) {
    return false;
  }
  // Get the last group.
  var versionString = iOSVersion[iOSVersion.length - 1];
  var majorVersion = parseFloat(versionString);
  return majorVersion <= 9;
};

Util.getExtension = function(url) {
  return url.split('.').pop().split('?')[0];
};

Util.createGetParams = function(params) {
  var out = '?';
  for (var k in params) {
    var paramString = k + '=' + params[k] + '&';
    out += paramString;
  }
  // Remove the trailing ampersand.
  out.substring(0, params.length - 2);
  return out;
};

Util.sendParentMessage = function(message) {
  if (window.parent) {
    parent.postMessage(message, '*');
  }
};

Util.parseBoolean = function(value) {
  if (value == 'false' || value == 0) {
    return false;
  } else if (value == 'true' || value == 1) {
    return true;
  } else {
    return !!value;
  }
};

/**
 * @param base {String} An absolute directory root.
 * @param relative {String} A relative path.
 *
 * @returns {String} An absolute path corresponding to the rootPath.
 *
 * From http://stackoverflow.com/a/14780463/693934.
 */
Util.relativeToAbsolutePath = function(base, relative) {
  var stack = base.split('/');
  var parts = relative.split('/');
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] == '.') {
      continue;
    }
    if (parts[i] == '..') {
      stack.pop();
    } else {
      stack.push(parts[i]);
    }
  }
  return stack.join('/');
};

/**
 * @return {Boolean} True iff the specified path is an absolute path.
 */
Util.isPathAbsolute = function(path) {
  return ! /^(?:\/|[a-z]+:\/\/)/.test(path);
}

Util.isEmptyObject = function(obj) {
  return Object.getOwnPropertyNames(obj).length == 0;
};

Util.isDebug = function() {
  return Util.parseBoolean(Util.getQueryParameter('debug'));
};

Util.getCurrentScript = function() {
  // Note: in IE11, document.currentScript doesn't work, so we fall back to this
  // hack, taken from https://goo.gl/TpExuH.
  if (!document.currentScript) {
    console.warn('This browser does not support document.currentScript. Trying fallback.');
  }
  return document.currentScript || document.scripts[document.scripts.length - 1];
}


module.exports = Util;

},{}],27:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Video Types
 */
var VideoTypes = {
  HLS: 1,
  DASH: 2,
  VIDEO: 3
};

module.exports = VideoTypes;
},{}]},{},[21]);
