'use strict';

var expect = require('chai').expect;

describe('The local pubsub for MongoDB configuration', function() {

  beforeEach(function() {
    this.testEnv.writeDBConfigFile();
  });

  afterEach(function() {
    this.testEnv.removeDBConfigFile();
  });

  it('should fire a publish when mongodb configuration is available', function(done) {
    var mongodbConfiguration = {
      connectionString: this.testEnv.mongoUrl,
      connectionOptions: this.testEnv.mongoConnectionOptions
    };
    var core = this.helpers.requireBackend('core');
    var pubsub = core.pubsub.local;
    var topic = pubsub.topic('mongodb:configurationAvailable');

    topic.subscribe(function(config) {
      expect(config).to.deep.equal(mongodbConfiguration);
      done();
    });

    core.configured();
  });

});
