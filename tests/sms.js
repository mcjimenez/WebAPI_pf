// mozSettings API tests (polyfilled!)
(function(window) {
  window.Tests = window.Tests || {};

  window.Tests['sms'] = {
    dependencies : [
      '/WebAPI_pf/polyfills/common/webapi_poly_common.js',
      '/WebAPI_pf/polyfills/sms/sms.js'],

    runTest: function() {
      var log = window.Tests.log.bind(undefined, 'sms');
      var abort = window.Tests.abort;

      var _mozSMS = window.navigator.mozMobileMessage;

      function testSend() {
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

      try {
        log('Starting sms polyfill tests');
        window.navigator.mozMobileMessage ||
          abort('window.navigator.mozMobileMessage not defined.');

        testSend();
      } catch (e) {
        log("Finished early with " + e);
      }
    }
  };
})(window);
