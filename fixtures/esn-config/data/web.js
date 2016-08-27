'use strict';

module.exports = function() {
  var host = process.env.WEB_HOST || 'localhost';
  var port = process.env.WEB_PORT || '8080';

  return {
    proxy: {
      trust: true
    },
    base_url: 'http://' + host + ':' + port
  };
};
