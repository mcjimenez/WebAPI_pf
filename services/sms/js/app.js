(function(window) {
  'use strict';

  function debug(str) {
    console.log('SMSService -*-:' + str);
  }

  // Ok, this kinda sucks because most APIs (and sms is one of them) cannot
  // be accessed from outside the main thread. So basically everything has to go
  // down to the SW thread, then back up here for processing, then back down to
  // be sent to the client. Yay us!
  var _locks = {};
  var _observers = {};

  var processSWRequest = function(channel, evt) {

    var _sms = navigator.mozMobileMessage;
    // we cat get:
    // send(number, text, success, error)
    // sendMMS(params)
    //   where params:
    //     {
    //       receivers: [...recipients],
    //       subject: '',
    //       smil: smil string,
    //       attachments: ...
    //     }
    // getThreads
    // getMessage(id)
    // getMessages(filter, reverse)
    // delete (id)
    // markMessageRead(id, readBool)
    // retrieveMMS(id)
    // getSegmentInfoForText(text)
    // Ergo accepted values for evt.data.remoteData.data.operation are:
    // [send, sendMMS, getThreads, getMessages, getMessages, delete,
    //  markMessageRead, retrieveMMS, getSegmentInfoForText]
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
