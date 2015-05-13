(function(window) {
  'use strict';

  function debug(str) {
    console.log('-*-*- ServHelper: ' + str);
  }

  // This is a very basic sample app that uses a SW and acts as a server for
  // navigator.connect. I'm going to mark with a comment where the app MUST
  // add some extra code to use the navigator.connect SHIM
  // So if you just want to know that, search for:
  // ADDED FOR SHIM

  var register = function(evt) {
    debug('APP executing register...');
    var origin = document.location.origin;
    navigator.serviceWorker.
      register('/WebAPI_pf/services/sw.js', {scope: './'}).
      then(function(reg) {
        debug('APP Registration succeeded. Scope: ' + reg.scope);
        if (reg.installing) {
          debug('APP registration --> installing');
        } else if (reg.waiting) {
          debug('APP registration --> waiting');
        } else if (reg.active) {
          debug('APP registration --> active');
        }
      }).catch(function(error) {
        debug('APP Registration failed with ' + error);
      });
  };

  var unregister = function(evt) {
    debug('APP Unregister...');
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => {
        reg.unregister();
        debug('APP Unregister done');
      });
    });
  };

  // Circular objects will cause this to hang
  var cloneObject = function(obj) {
    var cloned = {};
    for (var key in obj) {
      if (typeof obj[key] === 'object') {
        cloned[key] = cloneObject(obj[key]);
        continue;
      }

      if (typeof obj[key] !== 'function' || obj[key] === null) {
          cloned[key] = obj[key];
      }
    }
    return cloned;
  };

if ('serviceWorker' in navigator) {
  window.ServiceHelper = {
    register: function(processSWRequest) {
      register();
      navigator.serviceWorker.ready.then(sw => {
        // Let's pass the SW some way to talk to us...
        var mc = new MessageChannel();
        mc.port1.onmessage = processSWRequest.bind(this, mc.port1);
        sw.active && sw.active.postMessage({}, [mc.port2]);
      });
    },
    unregister: unregister,
    cloneObject: cloneObject
  };
} else {
  debug('APP navigator does not have ServiceWorker');
  return;
}

})(window);
