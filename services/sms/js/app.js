(function(window) {
  'use strict';

  function debug(str) {
    console.log('SMSService -*-:' + str);
  }

  debug('/services/sms/js/app.js --> loading!!');

  // Ok, this kinda sucks because most APIs (and sms is one of them) cannot
  // be accessed from outside the main thread. So basically everything has to go
  // down to the SW thread, then back up here for processing, then back down to
  // be sent to the client. Yay us!
  var _locks = {};
  var _observers = {};

  var _sms = navigator.mozMobileMessage;

  function setHandler(eventType, channel, request) {
    var remotePortId = request.remotePortId;

    function handlerTemplate(evt) {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: request.id,
          data: evt.data
        }
      });
    }
    _sms[eventType] = handlerTemplate;
  };

  function cloneMessage(msg) {
    // http://mxr.mozilla.org/mozilla-central/source/dom/mobilemessage/interfaces/nsIDOMMozSmsMessage.idl
    // http://mxr.mozilla.org/mozilla-central/source/dom/mobilemessage/interfaces/nsIDOMMozMmsMessage.idl
    var newMsg = {};
    msg.type && (newMsg.type = msg.type);
    msg.id && (newMsg.id = msg.id);
    msg.threadId && (newMsg.threadId = msg.threadId);
    msg.iccId && (newMsg.iccId = msg.iccId);
    msg.delivery && (newMsg.delivery = msg.delivery);
    msg.sender && (newMsg.sender = msg.sender);
    msg.timestamp && (newMsg.timestamp = msg.timestamp);
    msg.sentTimestamp && (newMsg.sentTimestamp = msg.sentTimestamp);
    msg.read && (newMsg.read = msg.read);

    // Only in sms
    msg.deliveryStatus && (newMsg.deliveryStatus = msg.deliveryStatus);
    msg.receiver && (newMsg.receiver = msg.receiver);
    msg.body && (newMsg.body = msg.body);
    msg.messageClass && (newMsg.messageClass = msg.messageClass);
    msg.deliveryTimestamp && (newMsg.deliveryTimestamp = msg.deliveryTimestamp);

    // Only in mms
    msg.deliveryInfo && (newMsg.deliveryInfo = msg.deliveryInfo);
    msg.receivers && (newMsg.receivers = msg.receivers);
    msg.subject && (newMsg.subject = msg.subject);
    msg.smil && (newMsg.smil = msg.smil);
    msg.attachments && (newMsg.attachments = msg.attachments);
    msg.expiryDate && (newMsg.expiryDate = msg.expiryDate);
    msg.readReportRequested &&
      (newMsg.readReportRequested = msg.readReportRequested);

    return newMsg;
  }

  var _operations = {
    send: function(channel, request) {
      debug('Calling send --> ' + JSON.stringify(request));
      var remotePortId = request.remotePortId;
      // Params for the local operation:
      var opData = request.remoteData.data.params;
      var reqId = request.remoteData.id;
      _sms.send(opData.number, opData.txt, opData.options).
        then(successData =>
          channel.postMessage({
            remotePortId: remotePortId,
            data: {
              id: request.id,
              data: {
                target: {
                  result: successData
                }
              }
            }
          })
        ).catch(error => channel.postMessage({
          remotePortId: remotePortId,
          data: {
            id: request.id,
            data: {
              target: {
                error: {
                  name: error.name,
                  message: error.message
                }
              }
            }
          }
        })
      );
    },

    sendMMS: function(channel, request) {
    },
    getThreads: function(channel, request) {
    },
    getMessages: function(channel, request) {
      var remotePortId = request.remotePortId;
      // Params for the local operation:
      var opData = request.remoteData.data.params;
      var reqId = request.remoteData.id;

      // FIX-ME: Due to the way FakeDOMCursorRequest is implemented, we
      // have to return all the fetched data on a single message
      var cursor = _sms.getMessages(opData.filter, opData.reverse);
      var _messages = [];
      cursor.onsuccess = function onsuccess() {
        debug("getMessages.cursor.onsuccess: " + this.done + ", " +
              JSON.stringify(this.result));
        if (!this.done) {
for (var kk in this.result) {
debug(kk+':'+JSON.stringify(this.result[kk]));
}

          _messages.push(cloneMessage(this.result));
          this.continue();
        } else {
          // Send the data back
          channel.postMessage({
            remotePortId: remotePortId,
            data: {
              id: request.id,
              data: {
                id: request.id,
                result: _messages
              }
            }
          });
        }
      };
      cursor.onerror = function onerror() {
        var msg = 'getMessages. Error: ' + this.error.name;
        debug(msg);
        channel.postMessage({
          remotePortId: remotePortId,
          data: {
            id: request.id,
            data: {
              error: this.error.name
            }
          }
        });
      };
    },

    getMessage: function(channel, request) {
    },
    delete: function(channel, request) {
    },
    markMessageRead: function(channel, request) {
    },
    retrieveMMS: function(channel, request) {
    },
    getSegmentInfoForText: function(channel, request) {
    }
  };
  ['ondeliveryerror', 'ondeliverysuccess', 'onreceived', 'onretrieving',
   'onsent', 'onsending', 'onfailed'].forEach( evt => {
    _operations[evt] = setHandler.bind(undefined, evt);
  });


  var processSWRequest = function(channel, evt) {
    debug('processSWRequest --> processing a msg:' +
          (evt.data ? JSON.stringify(evt.data): 'msg without data'));
var data = evt.data;
for (var kk in data) {
  debug(kk + ':' + JSON.stringify(data[kk]));
}
    var remotePortId = evt.data.remotePortId;
    var request = evt.data.remoteData;
    var requestOp = request.data.operation;
debug('operation:' + requestOp);
    if (requestOp in _operations) {
debug('we know ' + requestOp +' operation');
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
