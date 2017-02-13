'use strict';

var express = require('express');
var path = require('path');
var FRONTEND_PATH = path.normalize(__dirname + '/../../frontend');

let i18n;

function projectApplication(projectLib, dependencies) {
  var app = express();

  i18n = require('../i18n')(dependencies);
  app.use(i18n.init);

  app.use(express.static(FRONTEND_PATH));
  app.set('views', FRONTEND_PATH + '/views');
  require('./routes')(app, projectLib, dependencies);

  return app;
}

module.exports = projectApplication;
