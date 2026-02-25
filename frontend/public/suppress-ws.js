// Suppress WebSocket connection attempts from webpack-dev-server
(function() {
  'use strict';

  // Store original WebSocket
  var OriginalWebSocket = window.WebSocket;
  var wsConnections = [];

  // Create a mock WebSocket that silently fails
  function MockWebSocket(url, protocols) {
    // Store connection attempt
    wsConnections.push({ url: url, protocols: protocols });

    // Check if this is a webpack-dev-server WebSocket
    var isDevServer = url && (
      url.indexOf('ws://localhost:3000') !== -1 ||
      url.indexOf('/ws') !== -1 ||
      url.indexOf('sockjs-node') !== -1
    );

    if (isDevServer) {
      // Create a fake WebSocket-like object
      var fakeWs = {
        url: url,
        readyState: 3, // CLOSED
        bufferedAmount: 0,
        extensions: '',
        protocol: '',
        binaryType: 'blob',
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3,

        close: function() {},
        send: function() {},

        addEventListener: function(event, handler) {
          // Silently ignore
        },
        removeEventListener: function(event, handler) {
          // Silently ignore
        },
        dispatchEvent: function(event) {
          return true;
        },

        // Properties that might be accessed
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null
      };

      // Immediately "close" the connection
      setTimeout(function() {
        if (fakeWs.onclose) {
          try {
            fakeWs.onclose({ code: 1000, reason: 'Suppressed', wasClean: true });
          } catch (e) {
            // Ignore errors
          }
        }
      }, 0);

      return fakeWs;
    }

    // For non-dev-server WebSockets, use the original
    return new OriginalWebSocket(url, protocols);
  }

  // Copy static properties
  MockWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  MockWebSocket.OPEN = OriginalWebSocket.OPEN;
  MockWebSocket.CLOSING = OriginalWebSocket.CLOSING;
  MockWebSocket.CLOSED = OriginalWebSocket.CLOSED;
  MockWebSocket.prototype = OriginalWebSocket.prototype;

  // Replace global WebSocket
  window.WebSocket = MockWebSocket;

  // Also intercept EventSource for SSE
  if (window.EventSource) {
    var OriginalEventSource = window.EventSource;

    window.EventSource = function(url, config) {
      var isDevServer = url && (
        url.indexOf('localhost:3000') !== -1 ||
        url.indexOf('/ws') !== -1
      );

      if (isDevServer) {
        // Return a fake EventSource
        return {
          url: url,
          readyState: 2, // CLOSED
          CONNECTING: 0,
          OPEN: 1,
          CLOSED: 2,
          close: function() {},
          addEventListener: function() {},
          removeEventListener: function() {},
          dispatchEvent: function() { return true; },
          onerror: null,
          onmessage: null,
          onopen: null
        };
      }

      return new OriginalEventSource(url, config);
    };

    window.EventSource.CONNECTING = OriginalEventSource.CONNECTING;
    window.EventSource.OPEN = OriginalEventSource.OPEN;
    window.EventSource.CLOSED = OriginalEventSource.CLOSED;
  }
})();
