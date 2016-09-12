'use strict';

var expressSession = require('express-session'),
    MongoStore = require('awesome-sessionstore')(expressSession),
    mongoose = require('mongoose'),
    core = require('../../core'),
    mongo = core.db.mongo,
    mongotopic = core.pubsub.local.topic('mongodb:connectionAvailable'),
    mongosessiontopic = core.pubsub.local.topic('webserver:mongosessionstoreEnabled'),
    logger = core.logger;

function setupSession(session) {
  var setSession = function() {
    logger.debug('mongo is connected, setting up mongo session store');

    session.setMiddleware(expressSession({
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 6000000 },
      secret: 'this is the secret!',
      store: new MongoStore({
        mongoose: mongoose
      })
    }));
    mongosessiontopic.publish({});
  };
  if (mongo.isConnected()) {
    setSession();
  }
  mongotopic.subscribe(setSession);
}

module.exports = setupSession;
