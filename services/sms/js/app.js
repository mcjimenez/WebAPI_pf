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

  var _operations = {
    send: function(channel, request) {
      debug('Calling send --> ' + JSON.stringify(request));
      var remotePortId = request.remotePortId;
      // Params for the local operation:
      var opData = request.remoteData.data.params;
      var reqId = request.remoteData.id;
      _sms.send(opData.number, opData.txt, opData.options).
        then(sucessData => {
debug('SMS sended, result:');
for (var kk in sucessData){
debug(kk +':'+JSON.stringify(sucessData[kk]));
}

          channel.postMessage({
            remotePortId: remotePortId,
            data: {
              id: request.id,
              data: {
                target: {
                  result: sucessData
                }
              }
            }
          });
        }
        ).catch(
          error => {
debug('SMS sended, ERROR:');
for (var kk in error){
debug(kk +':'+JSON.stringify(error[kk]));
}

          channel.postMessage({
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
        });
    },
    sendMMS: function(channel, request) {
    },
    getThreads: function(channel, request) {
    },
    getMessages: function(channel, request) {
    },
    getMessages: function(channel, request) {
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
debug('we known ' + requestOp+'operation');
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
