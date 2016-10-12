'use strict';

var expect = require('chai').expect,
  ObjectId = require('bson').ObjectId;

describe('The feedback module', function() {
  before(function() {
    this.testEnv.writeDBConfigFile();
  });

  after(function() {
    this.testEnv.removeDBConfigFile();
  });

  beforeEach(function(done) {
    this.mongoose = require('mongoose');
    this.connectMongoose(this.mongoose, done);
  });

  afterEach(function(done) {
    this.helpers.mongo.dropDatabase(done);
  });

  it('should create a document in mongo with the feedback content, subject and the author', function(done) {
    var feedbackObject = {
      subject: 'A feedback subject',
      content: 'A feedback content',
      author: new ObjectId('538d8cd99f4e7e271e082b36')
    };

    var self = this;

    this.helpers.requireBackend('core/db/mongo/models/feedback');
    this.helpers.requireBackend('core/feedback').save(feedbackObject, function(err, response) {
      expect(err).to.not.exist;
      expect(response).to.exist;
      expect(response.__v).to.deep.equal(0);
      expect(response.content).to.deep.equal(feedbackObject.content);
      expect(response.subject).to.deep.equal(feedbackObject.subject);
      expect(feedbackObject.author.equals(response.author)).to.be.true;
      expect(response.published).to.exist;

      var functionCheckDoc = function(doc) {
        expect(response.__v).to.deep.equal(doc.__v);
        expect(response.content).to.deep.equal(doc.content);
        expect(response.subject).to.deep.equal(doc.subject);
        expect(doc.author.equals(response.author)).to.be.true;
        expect(response.published).to.deep.equal(doc.published);
        return true;
      };

      self.helpers.mongo.checkDoc('feedbacks', response._id, functionCheckDoc, function(err) {
        expect(err).to.be.true;
        done();
      });
    });
  });
});
