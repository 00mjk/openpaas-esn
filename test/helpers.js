'use strict';

var async = require('async'),
  expect = require('chai').expect,
  rewire = require('rewire'),
  MongoClient = require('mongodb').MongoClient,
  mockery = require('mockery'),
  pathLib = require('path'),
  fs = require('fs-extra');

/*
 * Mocks esnConf(<key>) object.
 * get: callback of the esnConf(<key>).get(get) method.
 */
function mockEsnConfig(get) {
  var mockedEsnConfig = {
    'esn-config': function() {
      return {
        get: get
      };
    }
  };
  var mockedEsnConfigFunction = function() {
    return {
      get: get
    };
  };
  mockery.registerMock('../../core', mockedEsnConfig);
  mockery.registerMock('../esn-config', mockedEsnConfigFunction);
}

/*
 * mockedModels = {
 *   'User': function User() {
 *     ...
 *   },
 *   'Domain': function Domain() {
 *     ...
 *   }
 * }
 *
 */
function mockModels(mockedModels) {
  var types = {
    ObjectId: function(id) {
      return {id: id};
    },
    Mixed: ''
  };

  var schema = function() {};
  schema.Types = types;

  var mongooseMock = {
    Types: types,
    Schema: schema,
    model: function(model) {
      return mockedModels[model];
    },
    __replaceObjectId: function(newObjectId) {
      types.ObjectId = newObjectId;
    }
  };
  mockery.registerMock('mongoose', mongooseMock);
  return mongooseMock;
}

/*
 * stub.topics is an Array which contains every topic.
 * stub.topics[topic].data is an Array named topic and contains every published data for the 'topic' topic.
 * stub.topics[topic].handler is the handler for the 'topic' topic.
 */
function mockPubSub(path, localStub, globalStub) {
  localStub.topics = [];
  localStub.subscribe = {};
  if (!globalStub) {
    globalStub = {};
  }
  globalStub.topics = [];
  globalStub.subscribe = {};

  var mockedPubSub = {
    local: {
      topic: function(topic) {
        localStub.topics.push(topic);
        localStub.topics[topic] = {
          data: [],
          handler: {}
        };
        return {
          publish: function(data) {
            localStub.topics[topic].data.push(data);
          },
          subscribe: function(handler) {
            localStub.topics[topic].handler = handler;
          },
          forward: function(pubsub, data) {
            localStub.topics[topic].data.push(data);
            globalStub.topics.push(topic);
            globalStub.topics[topic] = {
              data: [],
              handler: {}
            };
            globalStub.topics[topic].data.push(data);
          }
        };
      }
    },
    global: {
      topic: function(topic) {
        globalStub.topics.push(topic);
        globalStub.topics[topic] = {
          data: [],
          handler: {}
        };
        return {
          publish: function(data) {
            globalStub.topics[topic].data.push(data);
          },
          subscribe: function(handler) {
            globalStub.topics[topic].handler = handler;
          }
        };
      }
    }
  };

  mockery.registerMock(path, mockedPubSub);
  return mockedPubSub;
}

module.exports = function(mixin, testEnv) {
  mixin.mongo = {
    connect: function(callback) {
      require('mongoose').connect(testEnv.mongoUrl, callback);
    },
    disconnect: function(callback) {
      require('mongoose').disconnect(callback);
    },
    dropDatabase: function(callback) {
      function _dropDatabase() {
        MongoClient.connect(testEnv.mongoUrl, function(err, db) {
          if (err) {
            return callback(err);
          }
          db.dropDatabase(function(err) {
            if (err) {
              console.log('Error while droping the database, retrying...', err);
              return _dropDatabase();
            }
            db.close(callback);
          });
        });
      }
      _dropDatabase();
    },
    clearCollection: function(collectionName, callback) {
      require('mongoose').connection.db.collection(collectionName).remove(callback);
    },
    dropCollections: function(callback) {
      require('mongoose').connection.db.collections(function(err, collections) {
        if (err) { return callback(err); }
        collections = collections.filter(function(collection) {
          return collection.collectionName !== 'system.indexes';
        });
        async.forEach(collections, function(collection, done) {
          require('mongoose').connection.db.dropCollection(collection.collectionName, done);
        }, callback);
      });
    },
    saveDoc: function(collection, doc, done) {
      MongoClient.connect(testEnv.mongoUrl, function(err, db) {
        function close(err) { db.close(function() { done(err); }); }

        if (err) { return done(err); }

        db.collection(collection).save(doc, close);
      });
    },
    /*
    *check a mongodb document
    * @param collection string - the mongodb collection to get the doc
    * @param id string|object - the doc _id (string) or the find criteria (object)
    * @param check function|object - the function that checks the doc (function). This function should return something in case of error
    *                                or the doc to check against (object)
    * @param done function - the callback. No arguments on success, error on error
    */
    checkDoc: function(collection, id, check, done) {
      MongoClient.connect(testEnv.mongoUrl, function(err, db) {

        function close(err) {
          db.close(function() {
            done(err);
          });
        }

        if (err) {
          return done(err);
        }

        if (typeof id === 'string') {
          id = {_id: id};
        }

        db.collection(collection).findOne(id, function(err, doc) {
          if (err) {
            return close(err);
          }
          expect(doc).to.exist;

          if (typeof check === 'function') {
            var checkErr = check(doc);
            if (checkErr) {
              return close(checkErr);
            }
          } else {
            doc = JSON.parse(JSON.stringify(doc));
            expect(doc).to.deep.equal(check);
          }

          close();
        });
      });
    }
  };
  mixin.elasticsearch = {
    /**
     * Check if documents are present in Elasticsearch by using "search" request
     *
     * @param {hash}
     *  - options.index the index where documents are located
     *  - options.type the type of documents
     *  - options.ids array of string of ids of document to check
     *  - options.check function to check if document is indexed
     * @param {function} callback fn like callback(err)
     */
    checkDocumentsIndexed: function(options, callback) {
      var request = require('superagent');
      var elasticsearchURL = testEnv.serversConfig.host + ':' + testEnv.serversConfig.elasticsearch.port;

      var index = options.index;
      var type = options.type;
      var ids = options.ids;
      var check = options.check || function(res) {
        return res.status === 200 && res.body.hits.total === 1;
      };

      async.each(ids, function(id, callback) {

        var nbExecuted = 0;
        var finish = false;
        async.doWhilst(function(callback) {
          setTimeout(function() {
            request
              .get(elasticsearchURL + '/' + index + '/' + type + '/_search?q=_id:' + id)
              .end(function(err, res) {
                if (err) {
                  return callback(err);
                }

                if (check(res)) {
                  finish = true;
                  return callback();
                }
                nbExecuted++;
                if (nbExecuted >= testEnv.serversConfig.elasticsearch.tries_index) {
                  return callback(new Error(
                    'Number of tries of check document indexed in Elasticsearch reached the maximum allowed. Increase the number of tries!'));
                }
                return callback();
              });
          }, testEnv.serversConfig.elasticsearch.interval_index);

        }, function() {
          return (!finish) && nbExecuted < testEnv.serversConfig.elasticsearch.tries_index;
        }, function(err) {
          callback(err);
        });

      }, function(err) {
        callback(err);
      });
    },
    /**
     * Check if documents in index "users.idx" and with type "users"
     * are present in Elasticsearch by using "search" request
     *
     * @param {string[]} ids array of string of ids of document to check
     * @param {function} callback fn like callback(err)
     */
    checkUsersDocumentsIndexed: function(ids, callback) {
      mixin.elasticsearch.checkDocumentsIndexed({index: 'users.idx', type: 'users', ids: ids}, callback);
    },

    checkUsersDocumentsFullyIndexed: function(ids, check, callback) {
      mixin.elasticsearch.checkDocumentsIndexed({index: 'users.idx', type: 'users', ids: ids, check: check}, callback);
    },

    saveTestConfiguration: function(callback) {
      mixin.requireBackend('core/esn-config')('elasticsearch').store({
        host: testEnv.serversConfig.host + ':' + testEnv.serversConfig.elasticsearch.port
      }, callback);
    }
  };

  mixin.mock = {
    models: mockModels,
    pubsub: mockPubSub,
    esnConfig: mockEsnConfig
  };

  mixin.requireBackend = function(path) {
    return require(testEnv.basePath + '/backend/' + path);
  };

  mixin.rewireBackend = function(path) {
    return rewire(testEnv.basePath + '/backend/' + path);
  };

  mixin.requireFixture = function(path) {
    return require(testEnv.fixtures + '/' + path);
  };

  mixin.getFixturePath = function(path) {
    return pathLib.resolve(testEnv.fixtures, path);
  };

  mixin.callbacks = {
    noErrorAnd: function(next) {
      return function(err, data) {
        expect(err).to.not.exist;

        next(data);
      };
    },
    noError: function(done) {
      return mixin.callbacks.noErrorAnd(function() { done(); });
    },
    noErrorAndNoData: function(done) {
      return mixin.callbacks.noErrorAnd(function(data) {
        expect(data).to.not.exist;

        done();
      });
    },
    noErrorAndData: function(done) {
      return mixin.callbacks.noErrorAnd(function(data) {
        expect(data).to.exist;

        done();
      });
    },
    error: function(done) {
      return function(err) {
        expect(err).to.exist;
        done();
      };
    },
    errorWithMessage: function(done, message) {
      return function(err) {
        expect(err).to.exist;
        expect(err.message).to.equals(message);
        done();
      };
    },
    notCalled: function(done) {
      return function(result) {
        done(new Error('Should not be called' + result));
      };
    },
    called: function(done) {
      done();
    }
  };

  mixin.express = {
    response: function(callback) {
      return {
        status: function(code) {
          callback(code);

          return {
            end: function() {}
          }
        }
      };
    },
    jsonResponse: function(callback) {
      var _headers = {};

      return {
        header: function(key, value) {
          _headers[key] = value;
        },
        status: function(code) {
          return {
            json: function(data) {
              return callback(code, data, _headers);
            }
          };
        }
      };
    }
  };

  mixin.toComparableObject = function(object) {
    return JSON.parse(JSON.stringify(typeof object.toObject === 'function' ? object.toObject() : object));
  };

  mixin.mail = {
    saveConfiguration: function(configuration, callback) {
      mixin.requireBackend('core/esn-config')('mail').store(configuration, callback);
    },
    saveTestConfiguration: function(callback) {
      mixin.requireBackend('core/esn-config')('mail').store({
        mail: {
          noreply: 'noreply@open-paas.org'
        },
        transport: {
          module: 'nodemailer-stub-transport'
        }
      }, callback);
    }
  };

  mixin.jwt = {
    saveTestConfiguration: function(callback) {
      var publicKey = fs.readFileSync(testEnv.fixtures + '/crypto/public-key', 'utf8'),
          privateKey = fs.readFileSync(testEnv.fixtures + '/crypto/private-key', 'utf8');
      mixin.requireBackend('core/esn-config')('jwt').store({
        publicKey: publicKey,
        privateKey: privateKey,
        algorithm: 'RS256'
      }, callback);
    }
  };

  mixin.redis = {
    publishConfiguration: function() {
      var pubsub = mixin.requireBackend('core/pubsub');
      pubsub.local.topic('redis:configurationAvailable').publish({
        host: testEnv.serversConfig.host,
        port: testEnv.serversConfig.redis.port
      });
    }
  };
};
