// setupProxy.js - Configuration for webpack-dev-server proxy
// This file is automatically loaded by react-scripts

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests to backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://localhost:8080',
      changeOrigin: true,
      logLevel: 'silent'
    })
  );
};
