// navigator.mozMobileMessage polyfill!
// https://developer.mozilla.org/en-US/docs/Web/API/MozMobileMessageManager

(function(exports) {

  // If it's really available you don't need this
  if (exports.navigator.mozMobileMessage) {
    return;
  }

  function debug(text) {
    console.log('*-*-*- SMS PF: ' + text);
  }

  var SMS_SERVICE = 'https://smsservice.gaiamobile.org';

  var _currentRequestId = 1;

  var fakeMozMobileMessage = {
    /**
     * Send SMS.
     *
     * @param number
     *        Either a DOMString (only one number) or an array of numbers.
     * @param text
     *        The text message to be sent.
     * @param sendParameters
     *        A SmsSendParameters object.
     *
     * @return
     *        A DOMRequest object indicating the sending result if one number
     *        has been passed; an array of DOMRequest objects otherwise.
     *
     *  DOMRequest send(DOMString number,
     *                  DOMString text,
     *                  optional SmsSendParameters sendParameters);
     */
    send: function(aNumber, aTxt, aOptions) {
      debug('Called send with number:' + aNumber + ', text:' + aTxt +
            ', params:' + JSON.stringify(aOptions));
      var data = {
        operation: 'send',
        params: {
          number: aNumber,
          txt: aTxt,
          options: aOptions
        }
      };
      var request = new FakeDOMRequest(++_currentRequestId, data);
      navConnHelper.then(navConn => navConn.sendObject(request));
      return request;
    }/*,
    sendMMS: function(aParams) {
      debug('Called sendMMS with params:' + JSON.stringify(aParams));
    },
    getThreads: function() {
      debug('Called getThreads');
    },
    getMessage: function(aId) {
      debug('Called getMessage with id:' + aId);
    },
    getMessages: function(aFilter, aReverse) {
      debug('Called getMessages with filter:' + aFilter +
            ', reverse:'+ aReverse);
    },
    delete: function(aId) {
      debug('Called delete with id:' + aId);
    },
    markMessageRead: function(aId, aReadBool) {
      debug('Called markMessageRead with aid:' + aId +
            ', readBool:'+ aReadBool);
    },
    retrieveMMS: function (aId) {
      debug('Called retrieveMMS with id:' + aId);
    },
    getSegmentInfoForText: function(aTxt) {
      debug('Called getSegmentInfoForText with text:' + aTxt);
    }*/
  };

  var _handlers = {
    ondeliveryerror: null,
    ondeliverysuccess: null,
    onreceived: null,
    onretrieving: null,
    onsent: null,
    onsending: null,
    onfailed: null
  };

  Object.keys(_handlers).forEach(handler =>
    Object.defineProperty(fakeMozMobileMessage, handler, {
      get: function() {
        return _handlers[handler];
      },
      set: function(cb) {
        _handlers[handler] = cb;
        navConnHelper.then(navConn => {
          var commandObject = {
            serialize: function() {
              return {
                id: ++_currentRequestId,
                data: {
                  operation: handler
                },
                processAnswer: answer => cb(answer.data)
              };
            }
          };
          navConn.sendObject(commandObject);
        });
      }
    })
  );

  //exports.navigator.mozMobileMessage.send = fakeMozMobileMessage;
  exports.navigator.mozMobileMessage.send2 = fakeMozMobileMessage.send;

  var navConnHelper = new NavConnectHelper(SMS_SERVICE);

  navConnHelper.then(function() {}, e => {
    debug('Got an exception while connecting. ' + e);
    window.navigator.mozMobileMessage.send2 = null;
/*
    window.navigator.mozMobileMessage.sendMMS = null;
    window.navigator.mozMobileMessage.getThreads = null;
    window.navigator.mozMobileMessage.getMessage = null;
    window.navigator.mozMobileMessage.getMessages = null;
    window.navigator.mozMobileMessage.delete = null;
    window.navigator.mozMobileMessage.markMessageRead = null;
    window.navigator.mozMobileMessage.retrieveMMS = null;
    window.navigator.mozMobileMessage.getSegmentInfoForText = null;
    exports.navigator.mozMobileMessage = null;
*/
  });

})(window);
