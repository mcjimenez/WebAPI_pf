// navigator.mozMobileMessage polyfill!
// https://developer.mozilla.org/en-US/docs/Web/API/MozMobileMessageManager

(function(exports) {

  // If it's really available you don't need this
  if (exports.navigator.mozMobileMessage) {
    return;
  }

  var SMS_SERVICE = 'https://smsservice.gaiamobile.org';


  exports.navigator.mozMobileMessage = {
    send: function(aNumber, aTxt, aSuccess, aError) {
      debug('Called send with number:' + aNumber + ', text:' + aTxt);
    },
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
    }
  };

  var navConnHelper = new NavConnectHelper(SMS_SERVICE);

  navConnHelper.then(function() {}, e => {
    debug('Got an exception while connecting. ' + e);
    window.navigator.mozMobileMessage.send = null;
    window.navigator.mozMobileMessage.sendMMS = null;
    window.navigator.mozMobileMessage.getThreads = null;
    window.navigator.mozMobileMessage.getMessage = null;
    window.navigator.mozMobileMessage.getMessages = null;
    window.navigator.mozMobileMessage.delete = null;
    window.navigator.mozMobileMessage.markMessageRead = null;
    window.navigator.mozMobileMessage.retrieveMMS = null;
    window.navigator.mozMobileMessage.getSegmentInfoForText = null;
    exports.navigator.mozMobileMessage = null;
  });

})(window);
