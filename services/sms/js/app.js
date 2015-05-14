(function(window) {
  'use strict';

  function debug(str) {
    console.log('SMSService -*-:' + str);
  }

  // Ok, this kinda sucks because most APIs (and sms is one of them) cannot
  // be accessed from outside the main thread. So basically everything has to go
  // down to the SW thread, then back up here for processing, then back down to
  // be sent to the client. Yay us!
  var _sms = navigator.mozMobileMessage;

  function buildDOMCursorAnswer(operation, channel, request) {
    var remotePortId = request.remotePortId;
    // Params for the local operation:
    var opData = request.remoteData.data.params || [];
    var reqId = request.remoteData.id;

    // FIX-ME: Due to the way FakeDOMCursorRequest is implemented, we
    // have to return all the fetched data on a single message
    var cursor = _sms[operation](...opData);
    var _messages = [];
    cursor.onsuccess = function onsuccess() {
      debug(operation + '.cursor.onsuccess: ' + this.done + ', ' +
            JSON.stringify(this.result));
      if (!this.done) {
        if (this.result === undefined) {
          debug('APP Q ya no hay mas');
        } else if (this.result === null) {
          debug('APP q es nulo');
          } else {
        _messages.push(window.ServiceHelper.cloneObject(this.result));
          }
        this.continue();
      } else {
        // Send the data back
        channel.postMessage({
          remotePortId: remotePortId,
          data: {
            id: reqId,
            result: _messages
          }
        });
      }
    };
    cursor.onerror = function onerror() {
      var msg = operation + '. Error: ' + this.error.name;
      debug(msg);
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: reqId,
          data: {
            error: {
              name: this.error.name,
              message: this.error.message
            }
          }
        }
      });
    };
  };

  function buildDOMRequestAnswer(operation, channel, request) {
    debug('Building call --> ' + JSON.stringify(request));
    var remotePortId = request.remotePortId;
    // Params for the local operation:
    var opData = request.remoteData.data.params || [];
    var reqId = request.remoteData.id;
    _sms[operation](...opData).
      then(successData =>
           channel.postMessage({
             remotePortId: remotePortId,
             data: {
               id: reqId,
               result: window.ServiceHelper.cloneObject(successData)
             }
           })
          ).catch(error => channel.postMessage({
            remotePortId: remotePortId,
            data: {
              id: reqId,
              error: {
                name: error.name,
                message: error.message
              }
            }
          })
      );
  }

  function setHandler(eventType, channel, request) {
debug('launch setHandler ' + eventType + ', request:' + JSON.stringify(request));
    var reqId = request.remoteData.id;
    var remotePortId = request.remotePortId;

    function handlerTemplate(evt) {
 //request.id === request.data.remoteData.id
debug('handlerTemplate :'+JSON.stringify(request));
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: reqId,
          data: {
            event: window.ServiceHelper.cloneObject(evt)
          }
        }
      });
    }
debug('load handler for ' + eventType);
    _sms[eventType] = handlerTemplate;
  };

  var _operations = {
    send: buildDOMRequestAnswer.bind(this, 'send'),

    sendMMS: buildDOMRequestAnswer.bind(this, 'sendMMS'),

    getThreads: buildDOMCursorAnswer.bind(this, 'getThreads'),

    getMessages: buildDOMCursorAnswer.bind(this, 'getMessages'),

    getMessage: buildDOMRequestAnswer.bind(this, 'getMessage'),

    delete: buildDOMRequestAnswer.bind(this, 'delete'),

    markMessageRead: buildDOMRequestAnswer.bind(this, 'markMessageRead'),

    retrieveMMS: buildDOMRequestAnswer.bind(this, 'retrieveMMS'),

    getSegmentInfoForText: buildDOMRequestAnswer.bind(this,
                                                      'getSegmentInfoForText')
  };
  ['ondeliveryerror', 'ondeliverysuccess', 'onreceived', 'onretrieving',
   'onsent', 'onsending', 'onfailed'].forEach( evt => {
    _operations[evt] = setHandler.bind(undefined, evt);
  });


  var processSWRequest = function(channel, evt) {
    debug('processSWRequest --> processing a msg:' +
          (evt.data ? JSON.stringify(evt.data): 'msg without data'));

    var request = evt.data.remoteData;
    var requestOp = request.data.operation;
    if (requestOp in _operations) {
      _operations[requestOp] &&
        _operations[requestOp](channel, evt.data);
    } else {
      console.error('SMS service unknown operation:' + requestOp.op);
    }
  };


  // Testing purpose only!!!!
  window.addEventListener('load', function () {
    if (window.ServiceHelper) {
      debug('APP serviceWorker in navigator');
      window.ServiceHelper.register(processSWRequest);
    } else {
      debug('APP navigator does not have ServiceWorker');
      return;
    }
  });

})(window);
