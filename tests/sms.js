// mozSettings API tests (polyfilled!)
(function(window) {
  window.Tests = window.Tests || {};

  function onMessageReceived(log, e) {
    var message = e.message;

    if (message.messageClass && message.messageClass === 'class-0') {
      return;
    }

    // Here we can only have one sender, so deliveryInfo[0].deliveryStatus =>
    // message status from sender. Ignore 'pending' messages that are received
    // this means we are in automatic download mode
    if (message.delivery === 'not-downloaded' &&
        message.deliveryInfo[0].deliveryStatus === 'pending') {
      return;
    }

    log('message-received' + JSON.stringify(message));
  };

  function setHandlers(mozSMS, log) {
    mozSMS.addEventListener(
      'received', onMessageReceived.bind(undefined, log)
    );
  };

  window.Tests['sms'] = {
    dependencies : [
      '/WebAPI_pf/polyfills/common/webapi_poly_common.js',
      '/WebAPI_pf/polyfills/sms/sms.js'],

    runTest: function() {
      var log = window.Tests.log.bind(undefined, 'sms');
      var abort = window.Tests.abort;

      var _mozSMS = window.navigator.mozMobileMessage;

      function testSend() {
        log('***** TESTING send');
        var recipients = '682681246';
        var content = 'POLYFILL testing message';
        var options = {};

        log('window.navigator.mozMobileMessage defined!');
        var lock = _mozSMS.send(recipients, content, options);

        lock.then(success => {
          log('Successfuly sent msg' + JSON.stringify(success));
        }).catch(error => {
          log('Failured sending msg' + JSON.stringify(error));
        });
      }
      function testGetMessages() {
        log('***** TESTING getMessages');
        var cursor = _mozSMS.getMessages({}, true);

        cursor.onsuccess = function onsuccess() {
          log("testGetMessages.cursor.onsuccess: " + this.done + ", " +
              JSON.stringify(this.result));
          if (!this.done) {
            this.continue();
          } else {
            log("testGetMessages: All done!");
          }
        };
        cursor.onerror = function onerror() {
          var msg = 'getMessages. Error: ' + this.error.name;
          log(msg);
        };
      }

      function testGetMessage() {
        log('***** TESTING getMessage');
        var id = 1;

        _mozSMS.getMessage(id).then( message => {
          log('Successful getMessage ' + id + ":" +JSON.stringify(message));
        }, error => {
          log('Failed getMessage ' + id + ":" +JSON.stringify(error));
        });
      };

      function testDelete() {
        log('***** TESTING delete');
        var id = 1;

        var req = _mozSMS.delete(id);
        req.onsuccess = function onsuccess() {
          log('Successful delete msg ' + id + 'result:' +
              JSON.stringify(this.result));
          log('Trying to retrieve the same msg');
          testGetMessage();
        };

        req.onerror = function onerror() {
          var msg = 'Deleting in the database. Error: ' + req.error.name;
          log('Failed delete msg ' + id + ':' + msg);
        };
      }

      function testGetThreads() {
        log('***** TESTING getThreads');
        var cursor;
        try {
          cursor = _mozSMS.getThreads();
        } catch (e) {
          log('Exception retrieving threads ' + JSON.stringify(e));
        }

        cursor.onsuccess = function onsuccess() {
          log("testGetThreads.cursor.onsuccess: " + this.done + ", " +
              JSON.stringify(this.result));
          if (!this.done) {
            this.continue();
          } else {
            log("testGetThreads: All done!");
          }
        };
        cursor.onerror = function onerror() {
          var msg = 'getThreads. Error: ' + this.error.name;
          log(msg);
        };
      }

      try {
        log('Starting sms polyfill tests');
        window.navigator.mozMobileMessage ||
          abort('window.navigator.mozMobileMessage not defined.');

        setHandlers(_mozSMS, log);

        //testSend();
        //testGetMessages();
        testGetMessage();
        testDelete();
        testGetThreads();
      } catch (e) {
        log("Finished early with " + e);
      }
    }
  };
})(window);
