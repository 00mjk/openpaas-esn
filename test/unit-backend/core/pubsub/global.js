'use strict';

var expect = require('chai').expect;

describe('The global Pubsub object', function() {
  var GlobalPubsub = null;

  beforeEach(function() {
    GlobalPubsub = this.helpers.requireBackend('core/pubsub/pubsub');
  });

  it('should have a topic method', function() {
    expect(GlobalPubsub).to.respondTo('topic');
  });

  describe('topic method result', function() {

    it('should have publish, subscribe and unsubscribe methods', function() {
      var pubsub = new GlobalPubsub();
      var topic = pubsub.topic('test');
      expect(topic).to.respondTo('publish');
      expect(topic).to.respondTo('subscribe');
      expect(topic).to.respondTo('unsubscribe');
    });
  });

  it('should call the client "on" method when subscribing to an event', function(done) {
    var client = {
      on: function(topicName) {
        expect(topicName).to.equal('test');
        done();
      }
    };

    var handler = function() { /*nothing*/ };

    var pubsub = new GlobalPubsub('global', client);
    var topic = pubsub.topic('test');
    topic.subscribe(handler);
  });

  it('should call the client "emit" method when publishing an event', function(done) {
    var data = {test: true};
    var client = {
      emit: function(topicName, topicData) {
        expect(topicName).to.equal('test');
        expect(topicData).to.deep.equal(data);
        done();
      }
    };

    var pubsub = new GlobalPubsub('global', client);
    var topic = pubsub.topic('test');
    topic.publish(data);
  });

  it('should call the subscribed handlers when publishing an event', function(done) {
    var EventEmitter = require('events').EventEmitter;
    var client = new EventEmitter();
    var data = {test: true};
    var handler = function(topicData) {
      expect(topicData).to.deep.equal(data);
      done();
    };

    var pubsub = new GlobalPubsub('global', client);
    var topic = pubsub.topic('test');
    topic.subscribe(handler);
    topic.publish(data);
  });

  it('should not call an unsubscribed handler', function(done) {
    var EventEmitter = require('events').EventEmitter;
    var client = new EventEmitter();
    var counter = 0;
    var data = {test: true};
    var handler1 = function() {
      counter++;
      if (counter === 3) {
        throw new Error('The counter should equal 2');
      } else if (counter === 2) {
        done();
      }
    };
    var handler3 = function() {
      counter++;
      if (counter === 3) {
        throw new Error('The counter should equal 2');
      } else if (counter === 2) {
        done();
      }
    };
    var handler2 = function() {
      counter++;
    };

    var pubsub = new GlobalPubsub('global', client);
    var topic = pubsub.topic('test');
    topic.subscribe(handler1);
    topic.subscribe(handler2);
    topic.subscribe(handler3);
    topic.unsubscribe(handler2);
    topic.publish(data);
  });

  it('should cache the requests until a client is provided', function() {
    var counter = 0;
    var publishData = {test: true};
    var subscribeHandler = function() {};
    var subscribeHandler2 = function() {};
    var client = {
      emit: function(topic, data) {
        expect(topic).to.equal('test');
        expect(data).to.deep.equal(publishData);
        counter++;
      },
      removeListener: function(topic, handler) {
        expect(topic).to.equal('test');
        expect(handler).to.deep.equal(subscribeHandler2);
        counter++;
      },
      on: function(topic) {
        expect(topic).to.equal('test');
        counter++;
      }
    };

    var pubsub = new GlobalPubsub(null);
    var topic = pubsub.topic('test');
    topic.subscribe(subscribeHandler);
    topic.subscribe(subscribeHandler2);
    topic.unsubscribe(subscribeHandler2);
    topic.publish(publishData);
    expect(counter).to.equal(0);
    pubsub.setClient(client);
    expect(counter).to.equal(4);
  });

});
