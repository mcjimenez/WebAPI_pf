// XMLHttpRequest polyfill!
// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest

// I have to define the service protocol, and this is as good place as any. The
// protocol will be as follows:
// * Each request will have a numeric request id, set by the client
// * The answers will include the request id, so the client can know to which
//   request the answer corresponds
// * The request id will also act as identifier for remote objects (locks and
//  observers!)

// createXMLHttpRequest =>
//   * Request: { id: requestId,
//                data: {
//                       operation: 'createXMLHttpRequest',
//                       options: options
//                      }
//              }
//   * Answer:  { id: requestId, error: error}
//     (answer.error truthy means there was an error)
// Once you get an answer you can assume than the id is the identifier of the
// remote XMLHttpRequest

// For all the operations over a XMLHttpRequest:
//  * Request: { id: requestId,
//               data: {
//                 xhrId: xhrId,
//                 operation: methodName,
//                 params: params
//               }
//             }
// * Answer (only those methods that return something): { id: requestId,
//             result|error: Whatever }

// For the EventTarget operations
//  Request: { id: requestId,
//             data: {
//             operation: 'addEventListener|removeEventListener|dispatchEvent',
//             type: eventType (only addEventListener and removeEventListener),
//             useCapture: true|false (only addEventListener),
//             event: eventToDispatch (only dispatchEvent)
//           },
// Answer: When invoked:
//    { id: requestId,
//      data: EventTargetEvent }


(function(window) {

  'use strict';

  function debug(text) {
    console.log('*-*-*- System XHR PF: ' + text);
  }

  // Wishful thinking at the moment...
  const SYSTEMXHR_SERVICE = 'https://systemxhrservice.gaiamobile.org';

  function VoidRequest(reqId, extraData) {
    this.serialize = function() {
      return {
        id: reqId,
        data: extraData,
        processAnswer: answer => debug('Got an invalid answer for: ' + reqId)
      };
    };
  }

  function OnReadyStateChangeRequest(reqId, extraData) {
    this.serialize = function() {
      return {
        id: reqId,
        data: extraData,
        processAnswer: answer => {
          if (answer.event) {
            this._updateXMLHttpRequestObject.call(this, answer.event);
            this.onreadystatechange && this.onreadystatechange(answer.event);
          }
        }
      };
    };
  }

  function OnChangeRequest(reqId, extraData) {
    this.serialize = function() {
      return {
        id: reqId,
        data: extraData,
        processAnswer: answer => {
          if (answer.event) {
            this['_on' + extraData.operation](answer.event);
          }
        }
      };
    };
  }

  // XMLHttpRequest polyfill..
  function FakeXMLHttpRequest(reqId, extraData) {

    var _resolve, _reject;
    var _systemxhr = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });

    // This will hold the remote object, once the lock is actually created..
    var _xhrId = null;
    _systemxhr.then(id => _xhrId = id);

    function _listenerCallback(evt, cb) {
      this._updateXMLHttpRequestObject.call(this, evt);

      cb(evt);
    }

    FakeEventTarget.call(listenerCallback.bind(this), _systemxhr);

    this.abort = function() {
      navConnPromise.methodCall(navConnPromise,
                               {
                                 methodName: 'abort',
                                 numParams: 0,
                                 returnValue: VoidRequest,
                                 promise: _systemxhr,
                                 field: 'xhrId'
                               });
    };

    this.open = function(method, url, async, user, password) {
      navConnPromise.methodCall(navConnPromise,
                               {
                                 methodName: 'open',
                                 numParams: 5,
                                 returnValue: VoidRequest,
                                 promise: _systemxhr,
                                 field: 'xhrId'
                               }, method, url, async, user, password);
    };

    this.overrideMimeType = function(mymetype) {
      navConnPromise.methodCall(navConnPromise,
                               {
                                 methodName: 'overrideMimeType',
                                 numParams: 1,
                                 returnValue: VoidRequest,
                                 promise: _systemxhr,
                                 field: 'xhrId'
                               }, mymetype);
    };

    // Null if no response has been received yet
    this._responseHeaders = null;
    this.getResponseHeader = function(header) {
      return this._responseHeaders[header] ?
        this._responseHeaders[header] : null;
    }

    this.getAllResponseHeaders = function() {
      var headers = '';

      if (!this._responseHeaders) {
        return null;
      }

      for (var header in this._responseHeaders) {
        headers += header + ': ' + this._responseHeaders[header] + ' \n'
      }

      return headers;
    }

    this.send = function(data) {
      navConnPromise.methodCall(navConnPromise,
                               {
                                 methodName: 'send',
                                 numParams: 1,
                                 returnValue: VoidRequest,
                                 promise: _systemxhr,
                                 field: 'xhrId'
                               }, data);
    };

    this.setRequestHeader = function(header, value) {
      navConnPromise.methodCall(navConnPromise,
                               {
                                 methodName: 'setRequestHeader',
                                 numParams: 2,
                                 returnValue: VoidRequest,
                                 promise: _systemxhr,
                                 field: 'xhrId'
                               }, header, value);
    };

    var readyStates = [
      {property: 'UNSENT', value: 0},
      {property: 'OPENED', value: 1},
      {property: 'HEADERS_RECEIVED', value: 2},
      {property: 'LOADING', value: 3},
      {property: 'DONE', value: 4},
    ];

    readyStates.forEach(state => {
      Object.defineProperty(this, state.property, {
        enumerable: true,
        value: state.value
      });
    });

    this.upload = new FakeXMLHttpRequestUpload();

    var readOnlyProperties = [
      'response', 'responseText', 'responseType', 'responseXML',
      'status', 'statusText', 'readyState',' timeout', 'responseURL'
    ];

    readOnlyProperties.forEach(property => {
      Object.defineProperty(this, property, {
        enumerable: true,
        get: function() {
          return this['_' + property]
        }
      });
    });

    Object.defineProperty(this, 'onreadystatechange', {
      get: function() {
        return this._onreadystatechangecb;
      },

      set: function(cb) {
        this._onreadystatechangecb = cb;
      }
    });

    // Need to listen to readyState events even if the callback is not defined
    this._onreadystatechange = navConnPromise.methodCall.bind(navConnPromise,
                                 {
                                   methodName: 'onreadystatechange',
                                   numParams: 0,
                                   returnValue: OnReadyStateChangeRequest,
                                   promise: _systemxhr,
                                   field: 'xhrId'
                                 });

    this._updateXMLHttpRequestObject = function(evt) {
      readOnlyProperties.forEach(property => {
        this['_' + property] = evt.target[property];
      });
      this['_responseHeaders'] = evt.responseHeaders;
    };

    this._onchange = function(changeType, cb) {
      this['_on' + changeType] = cb;
      navConnPromise.methodCall(navConnPromise,
                               {
                                 methodName: 'on' + changeType,
                                 numParams: 0,
                                 returnValue: OnChangeRequest,
                                 promise: _systemxhr,
                                 field: 'xhrId'
                               });
    };

    // Inherited properties from XMLHttpRequestEventTarget
    var onChangeEvents = [
      'abort',
      'error',
      'load',
      'loadend',
      'loadstart',
      'progress',
      'timeout',
    ];

    onChangeEvents.forEach(changeEvent => {
      Object.defineProperty(this, 'on' + changeEvent, {
        set: function(cb) {
          this._onchange(changeEvent, cb);
        }
      });
    });

    this.serialize = function() {
      return {
        id: reqId,
        data: {
          operation: 'createXMLHttpRequest',
          options: extraData.options
        },
        processAnswer: function(answer) {
          if (!answer.error) {
            _resolve(answer.id);
          } else {
            _reject(answer.error);
          }
        }
      };
    };

    // We need to set up this listener to update the attributes properly
    navConnPromise.then(navConnHelper => {
      // We should send this message ASAP
      this._onreadystatechange();
      navConnHelper.sendObject(this);
    });
  }

  function FakeXMLHttpRequestUpload() {
    // Inherited properties from XMLHttpRequestEventTarget
    var onChangeEvents = [
      'abort',
      'error',
      'load',
      'loadend',
      'loadstart',
      'progress',
      'timeout',
    ];

    onChangeEvents.forEach(changeEvent => {
      Object.defineProperty(this, 'on' + changeEvent, {
        set: function(cb) {
          this._onchange(changeEvent, cb);
        }
      });
    });
  }

  var navConnPromise = new NavConnectHelper(SYSTEMXHR_SERVICE);
  var realXMLHttpRequest = window.XMLHttpRequest.bind(window);

  function XMLHttpRequestShim(options) {
    if (options && options.mozSystem) {
      return navConnPromise.createAndQueueRequest({
                                                    options: options
                                                  }, FakeXMLHttpRequest);
    } else {
      return new realXMLHttpRequest(options);
    }
  };

  window.XMLHttpRequest = XMLHttpRequestShim;

  navConnPromise.then(function(){}, e => {
    debug('Got an exception while connecting ' + e);
    window.XMLHttpRequest = realXMLHttpRequest;
  });

  function FakeEventTarget(listenerCb, field, promise) {
    // _listeners[type][ListenerId] => undefined or a callback function
    var _listeners = {};
    promise = promise || Promise.resolve(null);

    // And this is something else that might be reusable...
    function Listener(reqId, extraData) {
      _listeners[extraData.type][reqId] = extraData.cb;
      this.serialize = function() {
        return {
          id: reqId,
          data: extraData,
          processAnswer: answer => {
            if (answer.event) {
              listenerCb(answer.event, _listeners[extraData.type][reqId]);
            }
          }
        };
      };
    }

    function ListenerRemoval(reqId, extraData) {
      this.serialize = function() {
        return {
          id: reqId,
          data: extraData,
          processAnswer: answer => debug('Got an invalid answer for: ' + reqId)
        };
      };
    }

    function Dispatcher(reqId, extraData event) {
      this.serialize = function() {
        return {
          id: reqId,
          data: extraData,
          processAnswer: answer => debug('Got an invalid answer for: ' + reqId)
        };
      };
    }

    this.addEventListener = function(type, cb, useCapture) {
      if (!_listeners[type]) {
        _listeners[type] = {};
      }
      promise.then(value => {
        var data = {
          operation: 'addEventListener',
          type: type,
          useCapture: useCapture,
          cb: cb
        };

        data[field] = value;
        navConnPromise.createAndQueueRequest(data, Listener);
      })
    };

    this.removeEventListener = function(type, cb) {
      var listeners = _listeners[type];
      var listenerId = -1;
      for (var key in listeners) {
        if (listeners[key] === cb) {
          listenerId = key;
          break;
        }
      }

      if (cbIndex === -1) {
        return;
      }

      promise.then(value => {
        var data = {
          operation: 'removeEventListener',
          type: type,
          listenerId: listenerId
        };

        data[field] = value;
        navConnPromise.createAndQueueRequest(data, ListenerRemoval);
      });
      delete _listeners[type][listenerId];
    };

    this.dispatchEvent = function(event) {
      promise.then(value => {
        var data = {
          operation: 'dispatchEvent',
          event: event
        };

        data[field] = value;
        navConnPromise.createAndQueueRequest(data, Dispatcher);
      });
    };
  }

})(window);
