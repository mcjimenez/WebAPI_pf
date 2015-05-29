(function(window) {
  'use strict';

  function debug(str) {
    console.log('DeviceStorageService -*-:' + str);
  }

  // Ok, this kinda sucks because most APIs (and settings is one of them) cannot
  // be accessed from outside the main thread. So basically everything has to go
  // down to the SW thread, then back up here for processing, then back down to
  // be sent to the client. Yay us!
  var _deviceStorages = {};
  var _listeners = {};

  var processSWRequest = function(aAcl, aChannel, aEvt) {
    // We can get:
    // * methodName
    // * onchange
    // * getDeviceStorage
    // * addEventListener
    // * removeEventListener
    // * dispatchEvent
    // All the operations have a requestId, and the lock operations also include
    // a deviceStorage id.
    var remotePortId = aEvt.data.remotePortId;
    var request = aEvt.data.remoteData;
    var requestOp = request.data;
    var targetURL = aEvt.data.targetURL;

    // TODO: Add resource access constraint
    // It should return true if resource access is forbidden,
    // false if it's allowed
    var forbidCall = function(constraints) {
      return false;
    };

    if (window.ServiceHelper.isForbidden(aAcl, targetURL, requestOp.operation,
                                        forbidCall)) {
      return;
    }

    function observerTemplate(evt) {
      aChannel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: request.id,
          data: {
            path: evt.path,
            reason: evt.reason
          }
        }
      });
    }

    function listenerTemplate(evt) {
      aChannel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: request.id,
          data: {
            event: window.ServiceHelper.cloneObject(evt)
          }
        }
      });
    }

    if (requestOp.operation === 'getDeviceStorage') {
      var deviceStorages = navigator.getDeviceStorages(requestOp.params);
      deviceStorages.forEach(ds => {
        if (ds.storageName === requestOp.storageName) {
          _deviceStorages[request.id] = ds;
          return;
        }
      });
      // Let's assume this works always...
      aChannel.postMessage({remotePortId: remotePortId, data: {id: request.id}});
    } else if (requestOp.operation === 'onchange') {
      _deviceStorages[requestOp.deviceStorageId].onchange = observerTemplate;
    } else if (requestOp.operation === 'addEventListener') {
      _listeners[request.id] = listenerTemplate;
      _deviceStorages[requestOp.deviceStorageId].
        addEventListener(requestOp.type, _listeners[request.id], requestOp.useCapture);
    } else if (requestOp.operation === 'removeEventListener') {
      _deviceStorages[requestOp.deviceStorageId].
        removeObserver(_listeners[request.id]);
    } else if (requestOp.operation === 'dispatchEvent') {
      _deviceStorages[requestOp.deviceStorageId].dispatchEvent(requestOp.event);
    } else if (requestOp.operation === 'enumerate' ||
      requestOp.operation === 'enumerateEditable') {
        var cursor =
          _deviceStorages[requestOp.deviceStorageId][requestOp.operation].
          apply(_deviceStorages[requestOp.deviceStorageId], requestOp.params);
        var files = [];

        cursor.onsuccess = () => {
          var file = cursor.result;
          // 'cursor.done' flag should be activated when the last file is
          // reached. However, it seems that the flag is only is enabled in 
          // the next iteration so we've always got an undefined file
          if (typeof file !== 'undefined') {
            files.push(cursor.result);
          }

          if (!cursor.done) {
            cursor.continue();
          } else {
            console.info(files);
            // Send message
            aChannel.postMessage({
              remotePortId: remotePortId,
              data: { id : request.id, result: files}}
            );
          }
        };

        cursor.onerror = () => {
          aChannel.postMessage({
            remotePortId: remotePortId,
            data: {
              id : request.id,
              error: window.ServiceHelper.cloneObject(cursor.error)
            }}
          );
        };
    } else {
      var method = 'call';
      if (requestOp.params && typeof requestOp.params === 'object') {
        method = 'apply';
      }
      _deviceStorages[requestOp.deviceStorageId][requestOp.operation]
        [method](_deviceStorages[requestOp.deviceStorageId], requestOp.params).
          then(result => {
            aChannel.postMessage({
              remotePortId: remotePortId,
              data: { id : request.id, result: result}}
            );
      }).catch(error => {
        aChannel.postMessage({
          remotePortId: remotePortId,
          data: {
            id : request.id,
            error: window.ServiceHelper.cloneObject(error)
          }}
        );
      });
    }
  };

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
