(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.VRView = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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
var Message = require('../message');

/**
 * Sends events to the embedded VR view IFrame via postMessage. Also handles
 * messages sent back from the IFrame:
 *
 *    click: When a hotspot was clicked.
 *    modechange: When the user changes viewing mode (VR|Fullscreen|etc).
 */
function IFrameMessageSender(iframe) {
  if (!iframe) {
    console.error('No iframe specified');
    return;
  }
  this.iframe = iframe;

  // On iOS, if the iframe is across domains, also send DeviceMotion data.
  if (this.isIOS_()) {
    window.addEventListener('devicemotion', this.onDeviceMotion_.bind(this), false);
  }
}

/**
 * Sends a message to the associated VR View IFrame.
 */
IFrameMessageSender.prototype.send = function(message) {
  var iframeWindow = this.iframe.contentWindow;
  iframeWindow.postMessage(message, '*');
};

IFrameMessageSender.prototype.onDeviceMotion_ = function(e) {
  var message = {
    type: Message.DEVICE_MOTION,
    deviceMotionEvent: this.cloneDeviceMotionEvent_(e)
  };

  this.send(message);
};

IFrameMessageSender.prototype.cloneDeviceMotionEvent_ = function(e) {
  return {
    acceleration: {
      x: e.acceleration.x,
      y: e.acceleration.y,
      z: e.acceleration.z,
    },
    accelerationIncludingGravity: {
      x: e.accelerationIncludingGravity.x,
      y: e.accelerationIncludingGravity.y,
      z: e.accelerationIncludingGravity.z,
    },
    rotationRate: {
      alpha: e.rotationRate.alpha,
      beta: e.rotationRate.beta,
      gamma: e.rotationRate.gamma,
    },
    interval: e.interval,
    timeStamp: e.timeStamp
  };
};

IFrameMessageSender.prototype.isIOS_ = function() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

module.exports = IFrameMessageSender;

},{"../message":5}],3:[function(require,module,exports){
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

var Player = require('./player');

var VRView = {
  Player: Player
};

module.exports = VRView;

},{"./player":4}],4:[function(require,module,exports){
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

var EventEmitter = require('eventemitter3');
var IFrameMessageSender = require('./iframe-message-sender');
var Message = require('../message');
var Util = require('../util');

// Save the executing script. This will be used to calculate the embed URL.
var CURRENT_SCRIPT_SRC = Util.getCurrentScript().src;
var FAKE_FULLSCREEN_CLASS = 'vrview-fake-fullscreen';

/**
 * Entry point for the VR View JS API.
 *
 * Emits the following events:
 *    ready: When the player is loaded.
 *    modechange: When the viewing mode changes (normal, fullscreen, VR).
 *    click (id): When a hotspot is clicked.
 */
function Player(selector, contentInfo) {
  // Create a VR View iframe depending on the parameters.
  var iframe = this.createIframe_(contentInfo);
  this.iframe = iframe;

  var parentEl = document.querySelector(selector);
  parentEl.appendChild(iframe);

  // Make a sender as well, for relying commands to the child IFrame.
  this.sender = new IFrameMessageSender(iframe);

  // Listen to messages from the IFrame.
  window.addEventListener('message', this.onMessage_.bind(this), false);

  // Expose a public .isPaused attribute.
  this.isPaused = false;

  if (Util.isIOS()) {
    this.injectFullscreenStylesheet_();
  }
}
Player.prototype = new EventEmitter();

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
Player.prototype.addHotspot = function(hotspotId, params) {
  // TODO: Add validation to params.
  var data = {
    pitch: params.pitch,
    yaw: params.yaw,
    radius: params.radius,
    distance: params.distance,
    id: hotspotId
  };
  this.sender.send({type: Message.ADD_HOTSPOT, data: data});
};

Player.prototype.play = function() {
  this.sender.send({type: Message.PLAY});
};

Player.prototype.pause = function() {
  this.sender.send({type: Message.PAUSE});
};

Player.prototype.setContent = function(contentInfo) {
  this.absolutifyPaths_(contentInfo);
  var data = {
    contentInfo: contentInfo
  };
  this.sender.send({type: Message.SET_CONTENT, data: data});
};

/**
 * Sets the software volume of the video. 0 is mute, 1 is max.
 */
Player.prototype.setVolume = function(volumeLevel) {
  var data = {
    volumeLevel: volumeLevel
  };
  this.sender.send({type: Message.SET_VOLUME, data: data});
};

/**
 * Helper for creating an iframe.
 *
 * @return {IFrameElement} The iframe.
 */
Player.prototype.createIframe_ = function(contentInfo) {
  this.absolutifyPaths_(contentInfo);

  var iframe = document.createElement('iframe');
  iframe.setAttribute('allowfullscreen', true);
  iframe.setAttribute('scrolling', 'no');
  iframe.style.border = 0;

  // Handle iframe size if width and height are specified.
  if (contentInfo.hasOwnProperty('width')) {
    iframe.setAttribute('width', contentInfo.width);
    delete contentInfo.width;
  }
  if (contentInfo.hasOwnProperty('height')) {
    iframe.setAttribute('height', contentInfo.height);
    delete contentInfo.height;
  }

  var url = this.getEmbedUrl_() + Util.createGetParams(contentInfo);
  iframe.src = url;

  return iframe;
};

Player.prototype.onMessage_ = function(event) {
  var message = event.data;
  if (!message || !message.type) {
    console.warn('Received message with no type.');
    return;
  }
  var type = message.type.toLowerCase();
  var data = message.data;

  switch (type) {
    case 'ready':
    case 'modechange':
    case 'error':
    case 'click':
      this.emit(type, data);
      break;
    case 'paused':
      this.isPaused = data;
      break;
    case 'enter-fullscreen':
    case 'enter-vr':
      this.setFakeFullscreen_(true);
      break;
    case 'exit-fullscreen':
      this.setFakeFullscreen_(false);
      break;
    default:
      console.warn('Got unknown message of type %s from %s', message.type, message.origin);
  }
};

/**
 * Note: iOS doesn't support the fullscreen API.
 * In standalone <iframe> mode, VR View emulates fullscreen by redirecting to
 * another page.
 * In JS API mode, we stretch the iframe to cover the extent of the page using
 * CSS. To do this cleanly, we also inject a stylesheet.
 */
Player.prototype.setFakeFullscreen_ = function(isFullscreen) {
  if (isFullscreen) {
    this.iframe.classList.add(FAKE_FULLSCREEN_CLASS);
  } else {
    this.iframe.classList.remove(FAKE_FULLSCREEN_CLASS);
  }
};

Player.prototype.injectFullscreenStylesheet_ = function() {
  var styleString = [
    'iframe.' + FAKE_FULLSCREEN_CLASS,
    '{',
      'position: fixed !important;',
      'display: block !important;',
      'z-index: 9999999999 !important;',
      'top: 0 !important;',
      'left: 0 !important;',
      'width: 100% !important;',
      'height: 100% !important;',
      'margin: 0 !important;',
    '}',
  ].join('\n');
  var style = document.createElement('style');
  style.innerHTML = styleString;
  document.body.appendChild(style);
};

Player.prototype.getEmbedUrl_ = function() {
  // Assume that the script is in $ROOT/build/something.js, and that the iframe
  // HTML is in $ROOT/index.html.
  //
  // E.g: /vrview/2.0/build/vrview.min.js => /vrview/2.0/index.html.
  var path = CURRENT_SCRIPT_SRC;
  var split = path.split('/');
  var rootSplit = split.slice(0, split.length - 2);
  var rootPath = rootSplit.join('/');
  return rootPath + '/index.html';
};

Player.prototype.getDirName_ = function() {
  var path = window.location.pathname;
  path = path.substring(0, path.lastIndexOf('/'));
  return location.protocol + '//' + location.host + path;
};

/**
 * Make all of the URLs inside contentInfo absolute instead of relative.
 */
Player.prototype.absolutifyPaths_ = function(contentInfo) {
  var dirName = this.getDirName_();
  var urlParams = ['image', 'preview', 'video'];

  for (var i = 0; i < urlParams.length; i++) {
    var name = urlParams[i];
    var path = contentInfo[name];
    if (path && Util.isPathAbsolute(path)) {
      var absolute = Util.relativeToAbsolutePath(dirName, path);
      contentInfo[name] = absolute;
      //console.log('Converted to absolute: %s', absolute);
    }
  }
};


module.exports = Player;

},{"../message":5,"../util":6,"./iframe-message-sender":2,"eventemitter3":1}],5:[function(require,module,exports){
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
  ADD_HOTSPOT: 'addhotspot',
  SET_CONTENT: 'setimage',
  SET_VOLUME: 'setvolume',
  DEVICE_MOTION: 'devicemotion',
};

module.exports = Message;

},{}],6:[function(require,module,exports){
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

Util = window.Util || {};

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
  return url.split('.').pop();
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

},{}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMy9pbmRleC5qcyIsInNyYy9hcGkvaWZyYW1lLW1lc3NhZ2Utc2VuZGVyLmpzIiwic3JjL2FwaS9tYWluLmpzIiwic3JjL2FwaS9wbGF5ZXIuanMiLCJzcmMvbWVzc2FnZS5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vXG4vLyBXZSBzdG9yZSBvdXIgRUUgb2JqZWN0cyBpbiBhIHBsYWluIG9iamVjdCB3aG9zZSBwcm9wZXJ0aWVzIGFyZSBldmVudCBuYW1lcy5cbi8vIElmIGBPYmplY3QuY3JlYXRlKG51bGwpYCBpcyBub3Qgc3VwcG9ydGVkIHdlIHByZWZpeCB0aGUgZXZlbnQgbmFtZXMgd2l0aCBhXG4vLyBgfmAgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIGJ1aWx0LWluIG9iamVjdCBwcm9wZXJ0aWVzIGFyZSBub3Qgb3ZlcnJpZGRlbiBvclxuLy8gdXNlZCBhcyBhbiBhdHRhY2sgdmVjdG9yLlxuLy8gV2UgYWxzbyBhc3N1bWUgdGhhdCBgT2JqZWN0LmNyZWF0ZShudWxsKWAgaXMgYXZhaWxhYmxlIHdoZW4gdGhlIGV2ZW50IG5hbWVcbi8vIGlzIGFuIEVTNiBTeW1ib2wuXG4vL1xudmFyIHByZWZpeCA9IHR5cGVvZiBPYmplY3QuY3JlYXRlICE9PSAnZnVuY3Rpb24nID8gJ34nIDogZmFsc2U7XG5cbi8qKlxuICogUmVwcmVzZW50YXRpb24gb2YgYSBzaW5nbGUgRXZlbnRFbWl0dGVyIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIEV2ZW50IGhhbmRsZXIgdG8gYmUgY2FsbGVkLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBDb250ZXh0IGZvciBmdW5jdGlvbiBleGVjdXRpb24uXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvbmNlPWZhbHNlXSBPbmx5IGVtaXQgb25jZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIEVFKGZuLCBjb250ZXh0LCBvbmNlKSB7XG4gIHRoaXMuZm4gPSBmbjtcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5vbmNlID0gb25jZSB8fCBmYWxzZTtcbn1cblxuLyoqXG4gKiBNaW5pbWFsIEV2ZW50RW1pdHRlciBpbnRlcmZhY2UgdGhhdCBpcyBtb2xkZWQgYWdhaW5zdCB0aGUgTm9kZS5qc1xuICogRXZlbnRFbWl0dGVyIGludGVyZmFjZS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHsgLyogTm90aGluZyB0byBzZXQgKi8gfVxuXG4vKipcbiAqIEhvbGQgdGhlIGFzc2lnbmVkIEV2ZW50RW1pdHRlcnMgYnkgbmFtZS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICogQHByaXZhdGVcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIFJldHVybiBhbiBhcnJheSBsaXN0aW5nIHRoZSBldmVudHMgZm9yIHdoaWNoIHRoZSBlbWl0dGVyIGhhcyByZWdpc3RlcmVkXG4gKiBsaXN0ZW5lcnMuXG4gKlxuICogQHJldHVybnMge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudE5hbWVzID0gZnVuY3Rpb24gZXZlbnROYW1lcygpIHtcbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1xuICAgICwgbmFtZXMgPSBbXVxuICAgICwgbmFtZTtcblxuICBpZiAoIWV2ZW50cykgcmV0dXJuIG5hbWVzO1xuXG4gIGZvciAobmFtZSBpbiBldmVudHMpIHtcbiAgICBpZiAoaGFzLmNhbGwoZXZlbnRzLCBuYW1lKSkgbmFtZXMucHVzaChwcmVmaXggPyBuYW1lLnNsaWNlKDEpIDogbmFtZSk7XG4gIH1cblxuICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykge1xuICAgIHJldHVybiBuYW1lcy5jb25jYXQoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhldmVudHMpKTtcbiAgfVxuXG4gIHJldHVybiBuYW1lcztcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgbGlzdCBvZiBhc3NpZ25lZCBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudHMgdGhhdCBzaG91bGQgYmUgbGlzdGVkLlxuICogQHBhcmFtIHtCb29sZWFufSBleGlzdHMgV2Ugb25seSBuZWVkIHRvIGtub3cgaWYgdGhlcmUgYXJlIGxpc3RlbmVycy5cbiAqIEByZXR1cm5zIHtBcnJheXxCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiBsaXN0ZW5lcnMoZXZlbnQsIGV4aXN0cykge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudFxuICAgICwgYXZhaWxhYmxlID0gdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1tldnRdO1xuXG4gIGlmIChleGlzdHMpIHJldHVybiAhIWF2YWlsYWJsZTtcbiAgaWYgKCFhdmFpbGFibGUpIHJldHVybiBbXTtcbiAgaWYgKGF2YWlsYWJsZS5mbikgcmV0dXJuIFthdmFpbGFibGUuZm5dO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXZhaWxhYmxlLmxlbmd0aCwgZWUgPSBuZXcgQXJyYXkobCk7IGkgPCBsOyBpKyspIHtcbiAgICBlZVtpXSA9IGF2YWlsYWJsZVtpXS5mbjtcbiAgfVxuXG4gIHJldHVybiBlZTtcbn07XG5cbi8qKlxuICogRW1pdCBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBuYW1lIG9mIHRoZSBldmVudC5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBJbmRpY2F0aW9uIGlmIHdlJ3ZlIGVtaXR0ZWQgYW4gZXZlbnQuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KGV2ZW50LCBhMSwgYTIsIGEzLCBhNCwgYTUpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tldnRdKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldnRdXG4gICAgLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgLCBhcmdzXG4gICAgLCBpO1xuXG4gIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgbGlzdGVuZXJzLmZuKSB7XG4gICAgaWYgKGxpc3RlbmVycy5vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcnMuZm4sIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cbiAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgY2FzZSAxOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQpLCB0cnVlO1xuICAgICAgY2FzZSAyOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExKSwgdHJ1ZTtcbiAgICAgIGNhc2UgMzogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIpLCB0cnVlO1xuICAgICAgY2FzZSA0OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMpLCB0cnVlO1xuICAgICAgY2FzZSA1OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMsIGE0KSwgdHJ1ZTtcbiAgICAgIGNhc2UgNjogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzLCBhNCwgYTUpLCB0cnVlO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lcnMuZm4uYXBwbHkobGlzdGVuZXJzLmNvbnRleHQsIGFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIHZhciBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoXG4gICAgICAsIGo7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChsaXN0ZW5lcnNbaV0ub25jZSkgdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgbGlzdGVuZXJzW2ldLmZuLCB1bmRlZmluZWQsIHRydWUpO1xuXG4gICAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgICBjYXNlIDE6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0KTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMjogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMzogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExLCBhMik7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGlmICghYXJncykgZm9yIChqID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpc3RlbmVyc1tpXS5mbi5hcHBseShsaXN0ZW5lcnNbaV0uY29udGV4dCwgYXJncyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgbmV3IEV2ZW50TGlzdGVuZXIgZm9yIHRoZSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgTmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IFtjb250ZXh0PXRoaXNdIFRoZSBjb250ZXh0IG9mIHRoZSBmdW5jdGlvbi5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbihldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgdmFyIGxpc3RlbmVyID0gbmV3IEVFKGZuLCBjb250ZXh0IHx8IHRoaXMpXG4gICAgLCBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSBwcmVmaXggPyB7fSA6IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHRoaXMuX2V2ZW50c1tldnRdID0gbGlzdGVuZXI7XG4gIGVsc2Uge1xuICAgIGlmICghdGhpcy5fZXZlbnRzW2V2dF0uZm4pIHRoaXMuX2V2ZW50c1tldnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIGVsc2UgdGhpcy5fZXZlbnRzW2V2dF0gPSBbXG4gICAgICB0aGlzLl9ldmVudHNbZXZ0XSwgbGlzdGVuZXJcbiAgICBdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZCBhbiBFdmVudExpc3RlbmVyIHRoYXQncyBvbmx5IGNhbGxlZCBvbmNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBOYW1lIG9mIHRoZSBldmVudC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gW2NvbnRleHQ9dGhpc10gVGhlIGNvbnRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZShldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgdmFyIGxpc3RlbmVyID0gbmV3IEVFKGZuLCBjb250ZXh0IHx8IHRoaXMsIHRydWUpXG4gICAgLCBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSBwcmVmaXggPyB7fSA6IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHRoaXMuX2V2ZW50c1tldnRdID0gbGlzdGVuZXI7XG4gIGVsc2Uge1xuICAgIGlmICghdGhpcy5fZXZlbnRzW2V2dF0uZm4pIHRoaXMuX2V2ZW50c1tldnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIGVsc2UgdGhpcy5fZXZlbnRzW2V2dF0gPSBbXG4gICAgICB0aGlzLl9ldmVudHNbZXZ0XSwgbGlzdGVuZXJcbiAgICBdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudCB3ZSB3YW50IHRvIHJlbW92ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBsaXN0ZW5lciB0aGF0IHdlIG5lZWQgdG8gZmluZC5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgT25seSByZW1vdmUgbGlzdGVuZXJzIG1hdGNoaW5nIHRoaXMgY29udGV4dC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb25jZSBPbmx5IHJlbW92ZSBvbmNlIGxpc3RlbmVycy5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcihldmVudCwgZm4sIGNvbnRleHQsIG9uY2UpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tldnRdKSByZXR1cm4gdGhpcztcblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW2V2dF1cbiAgICAsIGV2ZW50cyA9IFtdO1xuXG4gIGlmIChmbikge1xuICAgIGlmIChsaXN0ZW5lcnMuZm4pIHtcbiAgICAgIGlmIChcbiAgICAgICAgICAgbGlzdGVuZXJzLmZuICE9PSBmblxuICAgICAgICB8fCAob25jZSAmJiAhbGlzdGVuZXJzLm9uY2UpXG4gICAgICAgIHx8IChjb250ZXh0ICYmIGxpc3RlbmVycy5jb250ZXh0ICE9PSBjb250ZXh0KVxuICAgICAgKSB7XG4gICAgICAgIGV2ZW50cy5wdXNoKGxpc3RlbmVycyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgIGxpc3RlbmVyc1tpXS5mbiAhPT0gZm5cbiAgICAgICAgICB8fCAob25jZSAmJiAhbGlzdGVuZXJzW2ldLm9uY2UpXG4gICAgICAgICAgfHwgKGNvbnRleHQgJiYgbGlzdGVuZXJzW2ldLmNvbnRleHQgIT09IGNvbnRleHQpXG4gICAgICAgICkge1xuICAgICAgICAgIGV2ZW50cy5wdXNoKGxpc3RlbmVyc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvL1xuICAvLyBSZXNldCB0aGUgYXJyYXksIG9yIHJlbW92ZSBpdCBjb21wbGV0ZWx5IGlmIHdlIGhhdmUgbm8gbW9yZSBsaXN0ZW5lcnMuXG4gIC8vXG4gIGlmIChldmVudHMubGVuZ3RoKSB7XG4gICAgdGhpcy5fZXZlbnRzW2V2dF0gPSBldmVudHMubGVuZ3RoID09PSAxID8gZXZlbnRzWzBdIDogZXZlbnRzO1xuICB9IGVsc2Uge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbZXZ0XTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYWxsIGxpc3RlbmVycyBvciBvbmx5IHRoZSBsaXN0ZW5lcnMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudCB3YW50IHRvIHJlbW92ZSBhbGwgbGlzdGVuZXJzIGZvci5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKGV2ZW50KSB7XG4gIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gdGhpcztcblxuICBpZiAoZXZlbnQpIGRlbGV0ZSB0aGlzLl9ldmVudHNbcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudF07XG4gIGVsc2UgdGhpcy5fZXZlbnRzID0gcHJlZml4ID8ge30gOiBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIEFsaWFzIG1ldGhvZHMgbmFtZXMgYmVjYXVzZSBwZW9wbGUgcm9sbCBsaWtlIHRoYXQuXG4vL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbi8vXG4vLyBUaGlzIGZ1bmN0aW9uIGRvZXNuJ3QgYXBwbHkgYW55bW9yZS5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIHNldE1heExpc3RlbmVycygpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBwcmVmaXguXG4vL1xuRXZlbnRFbWl0dGVyLnByZWZpeGVkID0gcHJlZml4O1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBtb2R1bGUuXG4vL1xuaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgbW9kdWxlKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xufVxuIiwiLypcclxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG52YXIgTWVzc2FnZSA9IHJlcXVpcmUoJy4uL21lc3NhZ2UnKTtcclxuXHJcbi8qKlxyXG4gKiBTZW5kcyBldmVudHMgdG8gdGhlIGVtYmVkZGVkIFZSIHZpZXcgSUZyYW1lIHZpYSBwb3N0TWVzc2FnZS4gQWxzbyBoYW5kbGVzXHJcbiAqIG1lc3NhZ2VzIHNlbnQgYmFjayBmcm9tIHRoZSBJRnJhbWU6XHJcbiAqXHJcbiAqICAgIGNsaWNrOiBXaGVuIGEgaG90c3BvdCB3YXMgY2xpY2tlZC5cclxuICogICAgbW9kZWNoYW5nZTogV2hlbiB0aGUgdXNlciBjaGFuZ2VzIHZpZXdpbmcgbW9kZSAoVlJ8RnVsbHNjcmVlbnxldGMpLlxyXG4gKi9cclxuZnVuY3Rpb24gSUZyYW1lTWVzc2FnZVNlbmRlcihpZnJhbWUpIHtcclxuICBpZiAoIWlmcmFtZSkge1xyXG4gICAgY29uc29sZS5lcnJvcignTm8gaWZyYW1lIHNwZWNpZmllZCcpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLmlmcmFtZSA9IGlmcmFtZTtcclxuXHJcbiAgLy8gT24gaU9TLCBpZiB0aGUgaWZyYW1lIGlzIGFjcm9zcyBkb21haW5zLCBhbHNvIHNlbmQgRGV2aWNlTW90aW9uIGRhdGEuXHJcbiAgaWYgKHRoaXMuaXNJT1NfKCkpIHtcclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2Vtb3Rpb24nLCB0aGlzLm9uRGV2aWNlTW90aW9uXy5iaW5kKHRoaXMpLCBmYWxzZSk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogU2VuZHMgYSBtZXNzYWdlIHRvIHRoZSBhc3NvY2lhdGVkIFZSIFZpZXcgSUZyYW1lLlxyXG4gKi9cclxuSUZyYW1lTWVzc2FnZVNlbmRlci5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcclxuICB2YXIgaWZyYW1lV2luZG93ID0gdGhpcy5pZnJhbWUuY29udGVudFdpbmRvdztcclxuICBpZnJhbWVXaW5kb3cucG9zdE1lc3NhZ2UobWVzc2FnZSwgJyonKTtcclxufTtcclxuXHJcbklGcmFtZU1lc3NhZ2VTZW5kZXIucHJvdG90eXBlLm9uRGV2aWNlTW90aW9uXyA9IGZ1bmN0aW9uKGUpIHtcclxuICB2YXIgbWVzc2FnZSA9IHtcclxuICAgIHR5cGU6IE1lc3NhZ2UuREVWSUNFX01PVElPTixcclxuICAgIGRldmljZU1vdGlvbkV2ZW50OiB0aGlzLmNsb25lRGV2aWNlTW90aW9uRXZlbnRfKGUpXHJcbiAgfTtcclxuXHJcbiAgdGhpcy5zZW5kKG1lc3NhZ2UpO1xyXG59O1xyXG5cclxuSUZyYW1lTWVzc2FnZVNlbmRlci5wcm90b3R5cGUuY2xvbmVEZXZpY2VNb3Rpb25FdmVudF8gPSBmdW5jdGlvbihlKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIGFjY2VsZXJhdGlvbjoge1xyXG4gICAgICB4OiBlLmFjY2VsZXJhdGlvbi54LFxyXG4gICAgICB5OiBlLmFjY2VsZXJhdGlvbi55LFxyXG4gICAgICB6OiBlLmFjY2VsZXJhdGlvbi56LFxyXG4gICAgfSxcclxuICAgIGFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHk6IHtcclxuICAgICAgeDogZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LngsXHJcbiAgICAgIHk6IGUuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS55LFxyXG4gICAgICB6OiBlLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkueixcclxuICAgIH0sXHJcbiAgICByb3RhdGlvblJhdGU6IHtcclxuICAgICAgYWxwaGE6IGUucm90YXRpb25SYXRlLmFscGhhLFxyXG4gICAgICBiZXRhOiBlLnJvdGF0aW9uUmF0ZS5iZXRhLFxyXG4gICAgICBnYW1tYTogZS5yb3RhdGlvblJhdGUuZ2FtbWEsXHJcbiAgICB9LFxyXG4gICAgaW50ZXJ2YWw6IGUuaW50ZXJ2YWwsXHJcbiAgICB0aW1lU3RhbXA6IGUudGltZVN0YW1wXHJcbiAgfTtcclxufTtcclxuXHJcbklGcmFtZU1lc3NhZ2VTZW5kZXIucHJvdG90eXBlLmlzSU9TXyA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiAvaVBhZHxpUGhvbmV8aVBvZC8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSAmJiAhd2luZG93Lk1TU3RyZWFtO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBJRnJhbWVNZXNzYWdlU2VuZGVyO1xyXG4iLCIvKlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcblxyXG52YXIgUGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcclxuXHJcbnZhciBWUlZpZXcgPSB7XHJcbiAgUGxheWVyOiBQbGF5ZXJcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVlJWaWV3O1xyXG4iLCIvKlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcblxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMycpO1xyXG52YXIgSUZyYW1lTWVzc2FnZVNlbmRlciA9IHJlcXVpcmUoJy4vaWZyYW1lLW1lc3NhZ2Utc2VuZGVyJyk7XHJcbnZhciBNZXNzYWdlID0gcmVxdWlyZSgnLi4vbWVzc2FnZScpO1xyXG52YXIgVXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcclxuXHJcbi8vIFNhdmUgdGhlIGV4ZWN1dGluZyBzY3JpcHQuIFRoaXMgd2lsbCBiZSB1c2VkIHRvIGNhbGN1bGF0ZSB0aGUgZW1iZWQgVVJMLlxyXG52YXIgQ1VSUkVOVF9TQ1JJUFRfU1JDID0gVXRpbC5nZXRDdXJyZW50U2NyaXB0KCkuc3JjO1xyXG52YXIgRkFLRV9GVUxMU0NSRUVOX0NMQVNTID0gJ3Zydmlldy1mYWtlLWZ1bGxzY3JlZW4nO1xyXG5cclxuLyoqXHJcbiAqIEVudHJ5IHBvaW50IGZvciB0aGUgVlIgVmlldyBKUyBBUEkuXHJcbiAqXHJcbiAqIEVtaXRzIHRoZSBmb2xsb3dpbmcgZXZlbnRzOlxyXG4gKiAgICByZWFkeTogV2hlbiB0aGUgcGxheWVyIGlzIGxvYWRlZC5cclxuICogICAgbW9kZWNoYW5nZTogV2hlbiB0aGUgdmlld2luZyBtb2RlIGNoYW5nZXMgKG5vcm1hbCwgZnVsbHNjcmVlbiwgVlIpLlxyXG4gKiAgICBjbGljayAoaWQpOiBXaGVuIGEgaG90c3BvdCBpcyBjbGlja2VkLlxyXG4gKi9cclxuZnVuY3Rpb24gUGxheWVyKHNlbGVjdG9yLCBjb250ZW50SW5mbykge1xyXG4gIC8vIENyZWF0ZSBhIFZSIFZpZXcgaWZyYW1lIGRlcGVuZGluZyBvbiB0aGUgcGFyYW1ldGVycy5cclxuICB2YXIgaWZyYW1lID0gdGhpcy5jcmVhdGVJZnJhbWVfKGNvbnRlbnRJbmZvKTtcclxuICB0aGlzLmlmcmFtZSA9IGlmcmFtZTtcclxuXHJcbiAgdmFyIHBhcmVudEVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XHJcbiAgcGFyZW50RWwuYXBwZW5kQ2hpbGQoaWZyYW1lKTtcclxuXHJcbiAgLy8gTWFrZSBhIHNlbmRlciBhcyB3ZWxsLCBmb3IgcmVseWluZyBjb21tYW5kcyB0byB0aGUgY2hpbGQgSUZyYW1lLlxyXG4gIHRoaXMuc2VuZGVyID0gbmV3IElGcmFtZU1lc3NhZ2VTZW5kZXIoaWZyYW1lKTtcclxuXHJcbiAgLy8gTGlzdGVuIHRvIG1lc3NhZ2VzIGZyb20gdGhlIElGcmFtZS5cclxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHRoaXMub25NZXNzYWdlXy5iaW5kKHRoaXMpLCBmYWxzZSk7XHJcblxyXG4gIC8vIEV4cG9zZSBhIHB1YmxpYyAuaXNQYXVzZWQgYXR0cmlidXRlLlxyXG4gIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcclxuXHJcbiAgaWYgKFV0aWwuaXNJT1MoKSkge1xyXG4gICAgdGhpcy5pbmplY3RGdWxsc2NyZWVuU3R5bGVzaGVldF8oKTtcclxuICB9XHJcbn1cclxuUGxheWVyLnByb3RvdHlwZSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcbi8qKlxyXG4gKiBAcGFyYW0gcGl0Y2gge051bWJlcn0gVGhlIGxhdGl0dWRlIG9mIGNlbnRlciwgc3BlY2lmaWVkIGluIGRlZ3JlZXMsIGJldHdlZW5cclxuICogLTkwIGFuZCA5MCwgd2l0aCAwIGF0IHRoZSBob3Jpem9uLlxyXG4gKiBAcGFyYW0geWF3IHtOdW1iZXJ9IFRoZSBsb25naXR1ZGUgb2YgY2VudGVyLCBzcGVjaWZpZWQgaW4gZGVncmVlcywgYmV0d2VlblxyXG4gKiAtMTgwIGFuZCAxODAsIHdpdGggMCBhdCB0aGUgaW1hZ2UgY2VudGVyLlxyXG4gKiBAcGFyYW0gcmFkaXVzIHtOdW1iZXJ9IFRoZSByYWRpdXMgb2YgdGhlIGhvdHNwb3QsIHNwZWNpZmllZCBpbiBtZXRlcnMuXHJcbiAqIEBwYXJhbSBkaXN0YW5jZSB7TnVtYmVyfSBUaGUgZGlzdGFuY2Ugb2YgdGhlIGhvdHNwb3QgZnJvbSBjYW1lcmEsIHNwZWNpZmllZFxyXG4gKiBpbiBtZXRlcnMuXHJcbiAqIEBwYXJhbSBob3RzcG90SWQge1N0cmluZ30gVGhlIElEIG9mIHRoZSBob3RzcG90LlxyXG4gKi9cclxuUGxheWVyLnByb3RvdHlwZS5hZGRIb3RzcG90ID0gZnVuY3Rpb24oaG90c3BvdElkLCBwYXJhbXMpIHtcclxuICAvLyBUT0RPOiBBZGQgdmFsaWRhdGlvbiB0byBwYXJhbXMuXHJcbiAgdmFyIGRhdGEgPSB7XHJcbiAgICBwaXRjaDogcGFyYW1zLnBpdGNoLFxyXG4gICAgeWF3OiBwYXJhbXMueWF3LFxyXG4gICAgcmFkaXVzOiBwYXJhbXMucmFkaXVzLFxyXG4gICAgZGlzdGFuY2U6IHBhcmFtcy5kaXN0YW5jZSxcclxuICAgIGlkOiBob3RzcG90SWRcclxuICB9O1xyXG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuQUREX0hPVFNQT1QsIGRhdGE6IGRhdGF9KTtcclxufTtcclxuXHJcblBsYXllci5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKCkge1xyXG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuUExBWX0pO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xyXG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuUEFVU0V9KTtcclxufTtcclxuXHJcblBsYXllci5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uKGNvbnRlbnRJbmZvKSB7XHJcbiAgdGhpcy5hYnNvbHV0aWZ5UGF0aHNfKGNvbnRlbnRJbmZvKTtcclxuICB2YXIgZGF0YSA9IHtcclxuICAgIGNvbnRlbnRJbmZvOiBjb250ZW50SW5mb1xyXG4gIH07XHJcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5TRVRfQ09OVEVOVCwgZGF0YTogZGF0YX0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldHMgdGhlIHNvZnR3YXJlIHZvbHVtZSBvZiB0aGUgdmlkZW8uIDAgaXMgbXV0ZSwgMSBpcyBtYXguXHJcbiAqL1xyXG5QbGF5ZXIucHJvdG90eXBlLnNldFZvbHVtZSA9IGZ1bmN0aW9uKHZvbHVtZUxldmVsKSB7XHJcbiAgdmFyIGRhdGEgPSB7XHJcbiAgICB2b2x1bWVMZXZlbDogdm9sdW1lTGV2ZWxcclxuICB9O1xyXG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuU0VUX1ZPTFVNRSwgZGF0YTogZGF0YX0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEhlbHBlciBmb3IgY3JlYXRpbmcgYW4gaWZyYW1lLlxyXG4gKlxyXG4gKiBAcmV0dXJuIHtJRnJhbWVFbGVtZW50fSBUaGUgaWZyYW1lLlxyXG4gKi9cclxuUGxheWVyLnByb3RvdHlwZS5jcmVhdGVJZnJhbWVfID0gZnVuY3Rpb24oY29udGVudEluZm8pIHtcclxuICB0aGlzLmFic29sdXRpZnlQYXRoc18oY29udGVudEluZm8pO1xyXG5cclxuICB2YXIgaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XHJcbiAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnYWxsb3dmdWxsc2NyZWVuJywgdHJ1ZSk7XHJcbiAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnc2Nyb2xsaW5nJywgJ25vJyk7XHJcbiAgaWZyYW1lLnN0eWxlLmJvcmRlciA9IDA7XHJcblxyXG4gIC8vIEhhbmRsZSBpZnJhbWUgc2l6ZSBpZiB3aWR0aCBhbmQgaGVpZ2h0IGFyZSBzcGVjaWZpZWQuXHJcbiAgaWYgKGNvbnRlbnRJbmZvLmhhc093blByb3BlcnR5KCd3aWR0aCcpKSB7XHJcbiAgICBpZnJhbWUuc2V0QXR0cmlidXRlKCd3aWR0aCcsIGNvbnRlbnRJbmZvLndpZHRoKTtcclxuICAgIGRlbGV0ZSBjb250ZW50SW5mby53aWR0aDtcclxuICB9XHJcbiAgaWYgKGNvbnRlbnRJbmZvLmhhc093blByb3BlcnR5KCdoZWlnaHQnKSkge1xyXG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgY29udGVudEluZm8uaGVpZ2h0KTtcclxuICAgIGRlbGV0ZSBjb250ZW50SW5mby5oZWlnaHQ7XHJcbiAgfVxyXG5cclxuICB2YXIgdXJsID0gdGhpcy5nZXRFbWJlZFVybF8oKSArIFV0aWwuY3JlYXRlR2V0UGFyYW1zKGNvbnRlbnRJbmZvKTtcclxuICBpZnJhbWUuc3JjID0gdXJsO1xyXG5cclxuICByZXR1cm4gaWZyYW1lO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5vbk1lc3NhZ2VfID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICB2YXIgbWVzc2FnZSA9IGV2ZW50LmRhdGE7XHJcbiAgaWYgKCFtZXNzYWdlIHx8ICFtZXNzYWdlLnR5cGUpIHtcclxuICAgIGNvbnNvbGUud2FybignUmVjZWl2ZWQgbWVzc2FnZSB3aXRoIG5vIHR5cGUuJyk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHZhciB0eXBlID0gbWVzc2FnZS50eXBlLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIGRhdGEgPSBtZXNzYWdlLmRhdGE7XHJcblxyXG4gIHN3aXRjaCAodHlwZSkge1xyXG4gICAgY2FzZSAncmVhZHknOlxyXG4gICAgY2FzZSAnbW9kZWNoYW5nZSc6XHJcbiAgICBjYXNlICdlcnJvcic6XHJcbiAgICBjYXNlICdjbGljayc6XHJcbiAgICAgIHRoaXMuZW1pdCh0eXBlLCBkYXRhKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdwYXVzZWQnOlxyXG4gICAgICB0aGlzLmlzUGF1c2VkID0gZGF0YTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdlbnRlci1mdWxsc2NyZWVuJzpcclxuICAgIGNhc2UgJ2VudGVyLXZyJzpcclxuICAgICAgdGhpcy5zZXRGYWtlRnVsbHNjcmVlbl8odHJ1ZSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnZXhpdC1mdWxsc2NyZWVuJzpcclxuICAgICAgdGhpcy5zZXRGYWtlRnVsbHNjcmVlbl8oZmFsc2UpO1xyXG4gICAgICBicmVhaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIGNvbnNvbGUud2FybignR290IHVua25vd24gbWVzc2FnZSBvZiB0eXBlICVzIGZyb20gJXMnLCBtZXNzYWdlLnR5cGUsIG1lc3NhZ2Uub3JpZ2luKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogTm90ZTogaU9TIGRvZXNuJ3Qgc3VwcG9ydCB0aGUgZnVsbHNjcmVlbiBBUEkuXHJcbiAqIEluIHN0YW5kYWxvbmUgPGlmcmFtZT4gbW9kZSwgVlIgVmlldyBlbXVsYXRlcyBmdWxsc2NyZWVuIGJ5IHJlZGlyZWN0aW5nIHRvXHJcbiAqIGFub3RoZXIgcGFnZS5cclxuICogSW4gSlMgQVBJIG1vZGUsIHdlIHN0cmV0Y2ggdGhlIGlmcmFtZSB0byBjb3ZlciB0aGUgZXh0ZW50IG9mIHRoZSBwYWdlIHVzaW5nXHJcbiAqIENTUy4gVG8gZG8gdGhpcyBjbGVhbmx5LCB3ZSBhbHNvIGluamVjdCBhIHN0eWxlc2hlZXQuXHJcbiAqL1xyXG5QbGF5ZXIucHJvdG90eXBlLnNldEZha2VGdWxsc2NyZWVuXyA9IGZ1bmN0aW9uKGlzRnVsbHNjcmVlbikge1xyXG4gIGlmIChpc0Z1bGxzY3JlZW4pIHtcclxuICAgIHRoaXMuaWZyYW1lLmNsYXNzTGlzdC5hZGQoRkFLRV9GVUxMU0NSRUVOX0NMQVNTKTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5pZnJhbWUuY2xhc3NMaXN0LnJlbW92ZShGQUtFX0ZVTExTQ1JFRU5fQ0xBU1MpO1xyXG4gIH1cclxufTtcclxuXHJcblBsYXllci5wcm90b3R5cGUuaW5qZWN0RnVsbHNjcmVlblN0eWxlc2hlZXRfID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHN0eWxlU3RyaW5nID0gW1xyXG4gICAgJ2lmcmFtZS4nICsgRkFLRV9GVUxMU0NSRUVOX0NMQVNTLFxyXG4gICAgJ3snLFxyXG4gICAgICAncG9zaXRpb246IGZpeGVkICFpbXBvcnRhbnQ7JyxcclxuICAgICAgJ2Rpc3BsYXk6IGJsb2NrICFpbXBvcnRhbnQ7JyxcclxuICAgICAgJ3otaW5kZXg6IDk5OTk5OTk5OTkgIWltcG9ydGFudDsnLFxyXG4gICAgICAndG9wOiAwICFpbXBvcnRhbnQ7JyxcclxuICAgICAgJ2xlZnQ6IDAgIWltcG9ydGFudDsnLFxyXG4gICAgICAnd2lkdGg6IDEwMCUgIWltcG9ydGFudDsnLFxyXG4gICAgICAnaGVpZ2h0OiAxMDAlICFpbXBvcnRhbnQ7JyxcclxuICAgICAgJ21hcmdpbjogMCAhaW1wb3J0YW50OycsXHJcbiAgICAnfScsXHJcbiAgXS5qb2luKCdcXG4nKTtcclxuICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gIHN0eWxlLmlubmVySFRNTCA9IHN0eWxlU3RyaW5nO1xyXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc3R5bGUpO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5nZXRFbWJlZFVybF8gPSBmdW5jdGlvbigpIHtcclxuICAvLyBBc3N1bWUgdGhhdCB0aGUgc2NyaXB0IGlzIGluICRST09UL2J1aWxkL3NvbWV0aGluZy5qcywgYW5kIHRoYXQgdGhlIGlmcmFtZVxyXG4gIC8vIEhUTUwgaXMgaW4gJFJPT1QvaW5kZXguaHRtbC5cclxuICAvL1xyXG4gIC8vIEUuZzogL3Zydmlldy8yLjAvYnVpbGQvdnJ2aWV3Lm1pbi5qcyA9PiAvdnJ2aWV3LzIuMC9pbmRleC5odG1sLlxyXG4gIHZhciBwYXRoID0gQ1VSUkVOVF9TQ1JJUFRfU1JDO1xyXG4gIHZhciBzcGxpdCA9IHBhdGguc3BsaXQoJy8nKTtcclxuICB2YXIgcm9vdFNwbGl0ID0gc3BsaXQuc2xpY2UoMCwgc3BsaXQubGVuZ3RoIC0gMik7XHJcbiAgdmFyIHJvb3RQYXRoID0gcm9vdFNwbGl0LmpvaW4oJy8nKTtcclxuICByZXR1cm4gcm9vdFBhdGggKyAnL2luZGV4Lmh0bWwnO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5nZXREaXJOYW1lXyA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciBwYXRoID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lO1xyXG4gIHBhdGggPSBwYXRoLnN1YnN0cmluZygwLCBwYXRoLmxhc3RJbmRleE9mKCcvJykpO1xyXG4gIHJldHVybiBsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0ICsgcGF0aDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBNYWtlIGFsbCBvZiB0aGUgVVJMcyBpbnNpZGUgY29udGVudEluZm8gYWJzb2x1dGUgaW5zdGVhZCBvZiByZWxhdGl2ZS5cclxuICovXHJcblBsYXllci5wcm90b3R5cGUuYWJzb2x1dGlmeVBhdGhzXyA9IGZ1bmN0aW9uKGNvbnRlbnRJbmZvKSB7XHJcbiAgdmFyIGRpck5hbWUgPSB0aGlzLmdldERpck5hbWVfKCk7XHJcbiAgdmFyIHVybFBhcmFtcyA9IFsnaW1hZ2UnLCAncHJldmlldycsICd2aWRlbyddO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVybFBhcmFtcy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIG5hbWUgPSB1cmxQYXJhbXNbaV07XHJcbiAgICB2YXIgcGF0aCA9IGNvbnRlbnRJbmZvW25hbWVdO1xyXG4gICAgaWYgKHBhdGggJiYgVXRpbC5pc1BhdGhBYnNvbHV0ZShwYXRoKSkge1xyXG4gICAgICB2YXIgYWJzb2x1dGUgPSBVdGlsLnJlbGF0aXZlVG9BYnNvbHV0ZVBhdGgoZGlyTmFtZSwgcGF0aCk7XHJcbiAgICAgIGNvbnRlbnRJbmZvW25hbWVdID0gYWJzb2x1dGU7XHJcbiAgICAgIC8vY29uc29sZS5sb2coJ0NvbnZlcnRlZCB0byBhYnNvbHV0ZTogJXMnLCBhYnNvbHV0ZSk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyO1xyXG4iLCIvKlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcblxyXG4vKipcclxuICogTWVzc2FnZXMgZnJvbSB0aGUgQVBJIHRvIHRoZSBlbWJlZC5cclxuICovXHJcbnZhciBNZXNzYWdlID0ge1xyXG4gIFBMQVk6ICdwbGF5JyxcclxuICBQQVVTRTogJ3BhdXNlJyxcclxuICBBRERfSE9UU1BPVDogJ2FkZGhvdHNwb3QnLFxyXG4gIFNFVF9DT05URU5UOiAnc2V0aW1hZ2UnLFxyXG4gIFNFVF9WT0xVTUU6ICdzZXR2b2x1bWUnLFxyXG4gIERFVklDRV9NT1RJT046ICdkZXZpY2Vtb3Rpb24nLFxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlO1xyXG4iLCIvKlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcblxyXG5VdGlsID0gd2luZG93LlV0aWwgfHwge307XHJcblxyXG5VdGlsLmlzRGF0YVVSSSA9IGZ1bmN0aW9uKHNyYykge1xyXG4gIHJldHVybiBzcmMgJiYgc3JjLmluZGV4T2YoJ2RhdGE6JykgPT0gMDtcclxufTtcclxuXHJcblV0aWwuZ2VuZXJhdGVVVUlEID0gZnVuY3Rpb24oKSB7XHJcbiAgZnVuY3Rpb24gczQoKSB7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcclxuICAgIC50b1N0cmluZygxNilcclxuICAgIC5zdWJzdHJpbmcoMSk7XHJcbiAgfVxyXG4gIHJldHVybiBzNCgpICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICtcclxuICAgIHM0KCkgKyAnLScgKyBzNCgpICsgczQoKSArIHM0KCk7XHJcbn07XHJcblxyXG5VdGlsLmlzTW9iaWxlID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIGNoZWNrID0gZmFsc2U7XHJcbiAgKGZ1bmN0aW9uKGEpe2lmKC8oYW5kcm9pZHxiYlxcZCt8bWVlZ28pLittb2JpbGV8YXZhbnRnb3xiYWRhXFwvfGJsYWNrYmVycnl8YmxhemVyfGNvbXBhbHxlbGFpbmV8ZmVubmVjfGhpcHRvcHxpZW1vYmlsZXxpcChob25lfG9kKXxpcmlzfGtpbmRsZXxsZ2UgfG1hZW1vfG1pZHB8bW1wfG1vYmlsZS4rZmlyZWZveHxuZXRmcm9udHxvcGVyYSBtKG9ifGluKWl8cGFsbSggb3MpP3xwaG9uZXxwKGl4aXxyZSlcXC98cGx1Y2tlcnxwb2NrZXR8cHNwfHNlcmllcyg0fDYpMHxzeW1iaWFufHRyZW98dXBcXC4oYnJvd3NlcnxsaW5rKXx2b2RhZm9uZXx3YXB8d2luZG93cyBjZXx4ZGF8eGlpbm8vaS50ZXN0KGEpfHwvMTIwN3w2MzEwfDY1OTB8M2dzb3w0dGhwfDUwWzEtNl1pfDc3MHN8ODAyc3xhIHdhfGFiYWN8YWMoZXJ8b298c1xcLSl8YWkoa298cm4pfGFsKGF2fGNhfGNvKXxhbW9pfGFuKGV4fG55fHl3KXxhcHR1fGFyKGNofGdvKXxhcyh0ZXx1cyl8YXR0d3xhdShkaXxcXC1tfHIgfHMgKXxhdmFufGJlKGNrfGxsfG5xKXxiaShsYnxyZCl8YmwoYWN8YXopfGJyKGV8dil3fGJ1bWJ8YndcXC0obnx1KXxjNTVcXC98Y2FwaXxjY3dhfGNkbVxcLXxjZWxsfGNodG18Y2xkY3xjbWRcXC18Y28obXB8bmQpfGNyYXd8ZGEoaXR8bGx8bmcpfGRidGV8ZGNcXC1zfGRldml8ZGljYXxkbW9ifGRvKGN8cClvfGRzKDEyfFxcLWQpfGVsKDQ5fGFpKXxlbShsMnx1bCl8ZXIoaWN8azApfGVzbDh8ZXooWzQtN10wfG9zfHdhfHplKXxmZXRjfGZseShcXC18Xyl8ZzEgdXxnNTYwfGdlbmV8Z2ZcXC01fGdcXC1tb3xnbyhcXC53fG9kKXxncihhZHx1bil8aGFpZXxoY2l0fGhkXFwtKG18cHx0KXxoZWlcXC18aGkocHR8dGEpfGhwKCBpfGlwKXxoc1xcLWN8aHQoYyhcXC18IHxffGF8Z3xwfHN8dCl8dHApfGh1KGF3fHRjKXxpXFwtKDIwfGdvfG1hKXxpMjMwfGlhYyggfFxcLXxcXC8pfGlicm98aWRlYXxpZzAxfGlrb218aW0xa3xpbm5vfGlwYXF8aXJpc3xqYSh0fHYpYXxqYnJvfGplbXV8amlnc3xrZGRpfGtlaml8a2d0KCB8XFwvKXxrbG9ufGtwdCB8a3djXFwtfGt5byhjfGspfGxlKG5vfHhpKXxsZyggZ3xcXC8oa3xsfHUpfDUwfDU0fFxcLVthLXddKXxsaWJ3fGx5bnh8bTFcXC13fG0zZ2F8bTUwXFwvfG1hKHRlfHVpfHhvKXxtYygwMXwyMXxjYSl8bVxcLWNyfG1lKHJjfHJpKXxtaShvOHxvYXx0cyl8bW1lZnxtbygwMXwwMnxiaXxkZXxkb3x0KFxcLXwgfG98dil8enopfG10KDUwfHAxfHYgKXxtd2JwfG15d2F8bjEwWzAtMl18bjIwWzItM118bjMwKDB8Mil8bjUwKDB8Mnw1KXxuNygwKDB8MSl8MTApfG5lKChjfG0pXFwtfG9ufHRmfHdmfHdnfHd0KXxub2soNnxpKXxuenBofG8yaW18b3AodGl8d3YpfG9yYW58b3dnMXxwODAwfHBhbihhfGR8dCl8cGR4Z3xwZygxM3xcXC0oWzEtOF18YykpfHBoaWx8cGlyZXxwbChheXx1Yyl8cG5cXC0yfHBvKGNrfHJ0fHNlKXxwcm94fHBzaW98cHRcXC1nfHFhXFwtYXxxYygwN3wxMnwyMXwzMnw2MHxcXC1bMi03XXxpXFwtKXxxdGVrfHIzODB8cjYwMHxyYWtzfHJpbTl8cm8odmV8em8pfHM1NVxcL3xzYShnZXxtYXxtbXxtc3xueXx2YSl8c2MoMDF8aFxcLXxvb3xwXFwtKXxzZGtcXC98c2UoYyhcXC18MHwxKXw0N3xtY3xuZHxyaSl8c2doXFwtfHNoYXJ8c2llKFxcLXxtKXxza1xcLTB8c2woNDV8aWQpfHNtKGFsfGFyfGIzfGl0fHQ1KXxzbyhmdHxueSl8c3AoMDF8aFxcLXx2XFwtfHYgKXxzeSgwMXxtYil8dDIoMTh8NTApfHQ2KDAwfDEwfDE4KXx0YShndHxsayl8dGNsXFwtfHRkZ1xcLXx0ZWwoaXxtKXx0aW1cXC18dFxcLW1vfHRvKHBsfHNoKXx0cyg3MHxtXFwtfG0zfG01KXx0eFxcLTl8dXAoXFwuYnxnMXxzaSl8dXRzdHx2NDAwfHY3NTB8dmVyaXx2aShyZ3x0ZSl8dmsoNDB8NVswLTNdfFxcLXYpfHZtNDB8dm9kYXx2dWxjfHZ4KDUyfDUzfDYwfDYxfDcwfDgwfDgxfDgzfDg1fDk4KXx3M2MoXFwtfCApfHdlYmN8d2hpdHx3aShnIHxuY3xudyl8d21sYnx3b251fHg3MDB8eWFzXFwtfHlvdXJ8emV0b3x6dGVcXC0vaS50ZXN0KGEuc3Vic3RyKDAsNCkpKWNoZWNrID0gdHJ1ZX0pKG5hdmlnYXRvci51c2VyQWdlbnR8fG5hdmlnYXRvci52ZW5kb3J8fHdpbmRvdy5vcGVyYSk7XHJcbiAgcmV0dXJuIGNoZWNrO1xyXG59O1xyXG5cclxuVXRpbC5pc0lPUyA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiAvKGlQYWR8aVBob25lfGlQb2QpL2cudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcclxufTtcclxuXHJcblV0aWwuaXNTYWZhcmkgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gL14oKD8hY2hyb21lfGFuZHJvaWQpLikqc2FmYXJpL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcclxufTtcclxuXHJcblV0aWwuY2xvbmVPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcclxuICB2YXIgb3V0ID0ge307XHJcbiAgZm9yIChrZXkgaW4gb2JqKSB7XHJcbiAgICBvdXRba2V5XSA9IG9ialtrZXldO1xyXG4gIH1cclxuICByZXR1cm4gb3V0O1xyXG59O1xyXG5cclxuVXRpbC5oYXNoQ29kZSA9IGZ1bmN0aW9uKHMpIHtcclxuICByZXR1cm4gcy5zcGxpdChcIlwiKS5yZWR1Y2UoZnVuY3Rpb24oYSxiKXthPSgoYTw8NSktYSkrYi5jaGFyQ29kZUF0KDApO3JldHVybiBhJmF9LDApO1xyXG59O1xyXG5cclxuVXRpbC5sb2FkVHJhY2tTcmMgPSBmdW5jdGlvbihjb250ZXh0LCBzcmMsIGNhbGxiYWNrLCBvcHRfcHJvZ3Jlc3NDYWxsYmFjaykge1xyXG4gIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgcmVxdWVzdC5vcGVuKCdHRVQnLCBzcmMsIHRydWUpO1xyXG4gIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcclxuXHJcbiAgLy8gRGVjb2RlIGFzeW5jaHJvbm91c2x5LlxyXG4gIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XHJcbiAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcclxuICAgICAgY2FsbGJhY2soYnVmZmVyKTtcclxuICAgIH0sIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihlKTtcclxuICAgIH0pO1xyXG4gIH07XHJcbiAgaWYgKG9wdF9wcm9ncmVzc0NhbGxiYWNrKSB7XHJcbiAgICByZXF1ZXN0Lm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgIHZhciBwZXJjZW50ID0gZS5sb2FkZWQgLyBlLnRvdGFsO1xyXG4gICAgICBvcHRfcHJvZ3Jlc3NDYWxsYmFjayhwZXJjZW50KTtcclxuICAgIH07XHJcbiAgfVxyXG4gIHJlcXVlc3Quc2VuZCgpO1xyXG59O1xyXG5cclxuVXRpbC5pc1BvdzIgPSBmdW5jdGlvbihuKSB7XHJcbiAgcmV0dXJuIChuICYgKG4gLSAxKSkgPT0gMDtcclxufTtcclxuXHJcblV0aWwuY2FwaXRhbGl6ZSA9IGZ1bmN0aW9uKHMpIHtcclxuICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSk7XHJcbn07XHJcblxyXG5VdGlsLmlzSUZyYW1lID0gZnVuY3Rpb24oKSB7XHJcbiAgdHJ5IHtcclxuICAgIHJldHVybiB3aW5kb3cuc2VsZiAhPT0gd2luZG93LnRvcDtcclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbn07XHJcblxyXG4vLyBGcm9tIGh0dHA6Ly9nb28uZ2wvNFdYM3RnXHJcblV0aWwuZ2V0UXVlcnlQYXJhbWV0ZXIgPSBmdW5jdGlvbihuYW1lKSB7XHJcbiAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW10vLCBcIlxcXFxbXCIpLnJlcGxhY2UoL1tcXF1dLywgXCJcXFxcXVwiKTtcclxuICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFwiW1xcXFw/Jl1cIiArIG5hbWUgKyBcIj0oW14mI10qKVwiKSxcclxuICAgICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWMobG9jYXRpb24uc2VhcmNoKTtcclxuICByZXR1cm4gcmVzdWx0cyA9PT0gbnVsbCA/IFwiXCIgOiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1sxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKTtcclxufTtcclxuXHJcblxyXG4vLyBGcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTE4NzEwNzcvcHJvcGVyLXdheS10by1kZXRlY3Qtd2ViZ2wtc3VwcG9ydC5cclxuVXRpbC5pc1dlYkdMRW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuICB0cnkgeyBnbCA9IGNhbnZhcy5nZXRDb250ZXh0KFwid2ViZ2xcIik7IH1cclxuICBjYXRjaCAoeCkgeyBnbCA9IG51bGw7IH1cclxuXHJcbiAgaWYgKGdsID09IG51bGwpIHtcclxuICAgIHRyeSB7IGdsID0gY2FudmFzLmdldENvbnRleHQoXCJleHBlcmltZW50YWwtd2ViZ2xcIik7IGV4cGVyaW1lbnRhbCA9IHRydWU7IH1cclxuICAgIGNhdGNoICh4KSB7IGdsID0gbnVsbDsgfVxyXG4gIH1cclxuICByZXR1cm4gISFnbDtcclxufTtcclxuXHJcblV0aWwuY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcclxuICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvYmopKTtcclxufTtcclxuXHJcbi8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDE0MDYwNC9mYXN0ZXN0LWh5cG90ZW51c2UtaW4tamF2YXNjcmlwdFxyXG5VdGlsLmh5cG90ID0gTWF0aC5oeXBvdCB8fCBmdW5jdGlvbih4LCB5KSB7XHJcbiAgcmV0dXJuIE1hdGguc3FydCh4KnggKyB5KnkpO1xyXG59O1xyXG5cclxuLy8gRnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNzQ0NzcxOC82OTM5MzRcclxuVXRpbC5pc0lFMTEgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvVHJpZGVudC8pO1xyXG59O1xyXG5cclxuVXRpbC5nZXRSZWN0Q2VudGVyID0gZnVuY3Rpb24ocmVjdCkge1xyXG4gIHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMihyZWN0LnggKyByZWN0LndpZHRoLzIsIHJlY3QueSArIHJlY3QuaGVpZ2h0LzIpO1xyXG59O1xyXG5cclxuVXRpbC5nZXRTY3JlZW5XaWR0aCA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiBNYXRoLm1heCh3aW5kb3cuc2NyZWVuLndpZHRoLCB3aW5kb3cuc2NyZWVuLmhlaWdodCkgKlxyXG4gICAgICB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcclxufTtcclxuXHJcblV0aWwuZ2V0U2NyZWVuSGVpZ2h0ID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIE1hdGgubWluKHdpbmRvdy5zY3JlZW4ud2lkdGgsIHdpbmRvdy5zY3JlZW4uaGVpZ2h0KSAqXHJcbiAgICAgIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xyXG59O1xyXG5cclxuVXRpbC5pc0lPUzlPckxlc3MgPSBmdW5jdGlvbigpIHtcclxuICBpZiAoIVV0aWwuaXNJT1MoKSkge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuICB2YXIgcmUgPSAvKGlQaG9uZXxpUGFkfGlQb2QpIE9TIChbXFxkX10rKS87XHJcbiAgdmFyIGlPU1ZlcnNpb24gPSBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKHJlKTtcclxuICBpZiAoIWlPU1ZlcnNpb24pIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbiAgLy8gR2V0IHRoZSBsYXN0IGdyb3VwLlxyXG4gIHZhciB2ZXJzaW9uU3RyaW5nID0gaU9TVmVyc2lvbltpT1NWZXJzaW9uLmxlbmd0aCAtIDFdO1xyXG4gIHZhciBtYWpvclZlcnNpb24gPSBwYXJzZUZsb2F0KHZlcnNpb25TdHJpbmcpO1xyXG4gIHJldHVybiBtYWpvclZlcnNpb24gPD0gOTtcclxufTtcclxuXHJcblV0aWwuZ2V0RXh0ZW5zaW9uID0gZnVuY3Rpb24odXJsKSB7XHJcbiAgcmV0dXJuIHVybC5zcGxpdCgnLicpLnBvcCgpO1xyXG59O1xyXG5cclxuVXRpbC5jcmVhdGVHZXRQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpIHtcclxuICB2YXIgb3V0ID0gJz8nO1xyXG4gIGZvciAodmFyIGsgaW4gcGFyYW1zKSB7XHJcbiAgICB2YXIgcGFyYW1TdHJpbmcgPSBrICsgJz0nICsgcGFyYW1zW2tdICsgJyYnO1xyXG4gICAgb3V0ICs9IHBhcmFtU3RyaW5nO1xyXG4gIH1cclxuICAvLyBSZW1vdmUgdGhlIHRyYWlsaW5nIGFtcGVyc2FuZC5cclxuICBvdXQuc3Vic3RyaW5nKDAsIHBhcmFtcy5sZW5ndGggLSAyKTtcclxuICByZXR1cm4gb3V0O1xyXG59O1xyXG5cclxuVXRpbC5zZW5kUGFyZW50TWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcclxuICBpZiAod2luZG93LnBhcmVudCkge1xyXG4gICAgcGFyZW50LnBvc3RNZXNzYWdlKG1lc3NhZ2UsICcqJyk7XHJcbiAgfVxyXG59O1xyXG5cclxuVXRpbC5wYXJzZUJvb2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xyXG4gIGlmICh2YWx1ZSA9PSAnZmFsc2UnIHx8IHZhbHVlID09IDApIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9IGVsc2UgaWYgKHZhbHVlID09ICd0cnVlJyB8fCB2YWx1ZSA9PSAxKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuICEhdmFsdWU7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSBiYXNlIHtTdHJpbmd9IEFuIGFic29sdXRlIGRpcmVjdG9yeSByb290LlxyXG4gKiBAcGFyYW0gcmVsYXRpdmUge1N0cmluZ30gQSByZWxhdGl2ZSBwYXRoLlxyXG4gKlxyXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBBbiBhYnNvbHV0ZSBwYXRoIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHJvb3RQYXRoLlxyXG4gKlxyXG4gKiBGcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzE0NzgwNDYzLzY5MzkzNC5cclxuICovXHJcblV0aWwucmVsYXRpdmVUb0Fic29sdXRlUGF0aCA9IGZ1bmN0aW9uKGJhc2UsIHJlbGF0aXZlKSB7XHJcbiAgdmFyIHN0YWNrID0gYmFzZS5zcGxpdCgnLycpO1xyXG4gIHZhciBwYXJ0cyA9IHJlbGF0aXZlLnNwbGl0KCcvJyk7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHBhcnRzW2ldID09ICcuJykge1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuICAgIGlmIChwYXJ0c1tpXSA9PSAnLi4nKSB7XHJcbiAgICAgIHN0YWNrLnBvcCgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc3RhY2sucHVzaChwYXJ0c1tpXSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBzdGFjay5qb2luKCcvJyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZmYgdGhlIHNwZWNpZmllZCBwYXRoIGlzIGFuIGFic29sdXRlIHBhdGguXHJcbiAqL1xyXG5VdGlsLmlzUGF0aEFic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xyXG4gIHJldHVybiAhIC9eKD86XFwvfFthLXpdKzpcXC9cXC8pLy50ZXN0KHBhdGgpO1xyXG59XHJcblxyXG5VdGlsLmlzRW1wdHlPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcclxuICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqKS5sZW5ndGggPT0gMDtcclxufTtcclxuXHJcblV0aWwuaXNEZWJ1ZyA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiBVdGlsLnBhcnNlQm9vbGVhbihVdGlsLmdldFF1ZXJ5UGFyYW1ldGVyKCdkZWJ1ZycpKTtcclxufTtcclxuXHJcblV0aWwuZ2V0Q3VycmVudFNjcmlwdCA9IGZ1bmN0aW9uKCkge1xyXG4gIC8vIE5vdGU6IGluIElFMTEsIGRvY3VtZW50LmN1cnJlbnRTY3JpcHQgZG9lc24ndCB3b3JrLCBzbyB3ZSBmYWxsIGJhY2sgdG8gdGhpc1xyXG4gIC8vIGhhY2ssIHRha2VuIGZyb20gaHR0cHM6Ly9nb28uZ2wvVHBFeHVILlxyXG4gIGlmICghZG9jdW1lbnQuY3VycmVudFNjcmlwdCkge1xyXG4gICAgY29uc29sZS53YXJuKCdUaGlzIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBkb2N1bWVudC5jdXJyZW50U2NyaXB0LiBUcnlpbmcgZmFsbGJhY2suJyk7XHJcbiAgfVxyXG4gIHJldHVybiBkb2N1bWVudC5jdXJyZW50U2NyaXB0IHx8IGRvY3VtZW50LnNjcmlwdHNbZG9jdW1lbnQuc2NyaXB0cy5sZW5ndGggLSAxXTtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVXRpbDtcclxuIl19
