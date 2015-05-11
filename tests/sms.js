// mozSettings API tests (polyfilled!)
(function(window) {
  window.Tests = window.Tests || {};

  var dependencies = ['/WebAPI_pf/polyfills/common/webapi_poly_common.js',
                      '/WebAPI_pf/polyfills/sms/sms.js'];

  window.Tests['sms'] =
    LazyLoader.dependencyLoad(dependencies).then(() => {
      var log = window.Tests.log.bind(undefined, 'sms');
      return {
        runTest: function() {
          function abort(e) {
            throw e;
          }

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
            log('Starting settings polyfill tests');
            window.navigator.mozMobileMessage ||
              abort('window.navigator.mozMobileMessage not defined.');

            testSend();
          } catch (e) {
            log("Finished early with " + e);
          }

        }
      };
    });

})(window);