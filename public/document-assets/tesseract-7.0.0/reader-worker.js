/* Local bootstrap cleanup around the unmodified, pinned Tesseract worker. */
'use strict';

const forwardMessage = self.postMessage.bind(self);
self.postMessage = (...args) => {
  forwardMessage(...args);
  const message = args[0];
  // createWorker exposes no handle until bootstrap completes. Failed bootstrap
  // must release this worker itself after the SDK has received its rejection.
  if (message?.status === 'reject' && ['load', 'loadLanguage', 'initialize'].includes(message.action)) {
    self.close();
  }
};

importScripts('./worker.min.js');
