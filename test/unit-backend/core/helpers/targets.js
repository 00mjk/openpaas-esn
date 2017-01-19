'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var ObjectId = require('mongoose').Types.ObjectId;

describe('The targets helpers module', function() {
  var collaborationMock = {};

  function setupMock() {
    collaborationMock.getMembers = function(id, type, query, callback) {
      return callback(null, {});
    };
  }

  beforeEach(function() {
    setupMock();
    mockery.registerMock('../core/collaboration', collaborationMock);
  });

  describe('the getUserIds fn', function() {
    it('should send back an error if targets is undefined', function(done) {
      this.helpers.requireBackend('helpers/targets').getUserIds(null, function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should send back an error if targets is not an array', function(done) {
      this.helpers.requireBackend('helpers/targets').getUserIds('test', function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should send back an error if community.getMembers fail', function(done) {
      var isPassedByGetMembers = false;
      collaborationMock.getMembers = function(id, type, query, callback) {
        isPassedByGetMembers = true;
        return callback(new Error());
      };

      var targets = [{
        objectType: 'community'
      }];

      this.helpers.requireBackend('helpers/targets').getUserIds(targets, function(err) {
        expect(err).to.exist;
        expect(isPassedByGetMembers).to.be.true;
        done();
      });
    });

    it('should send back an array of users with no duplicate and correct context', function(done) {
      var users = [
        {_id: new ObjectId()},
        {_id: new ObjectId()},
        {_id: new ObjectId()}
      ];

      collaborationMock.getMembers = function(id, type, query, callback) {
        return callback(null, [{member: {id: users[0]._id, objectType: 'user'}}]);
      };

      var targets = [{
        objectType: 'community',
        id: '123'
      }, {
        objectType: 'user',
        id: users[0]._id
      }, {
        objectType: 'user',
        id: users[1]._id
      }, {
        objectType: 'user',
        id: users[2]._id
      }];

      this.helpers.requireBackend('helpers/targets').getUserIds(targets, function(err, usersResult) {
        expect(err).to.not.exist;
        expect(usersResult).to.exist;
        expect(usersResult).to.have.length(3);
        expect(usersResult[0]).to.deep.equal({ _id: users[0]._id.toString(), context: '123' });
        expect(usersResult[1]).to.deep.equal({ _id: users[1]._id.toString(), context: undefined});
        expect(usersResult[2]).to.deep.equal({ _id: users[2]._id.toString(), context: undefined});
        done();
      });
    });
  });
});
