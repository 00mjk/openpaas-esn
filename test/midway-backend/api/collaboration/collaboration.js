'use strict';

var expect = require('chai').expect;
var request = require('supertest');
var async = require('async');

describe('The collaborations API', function() {
  var webserver;

  beforeEach(function(done) {
    var self = this;

    this.mongoose = require('mongoose');
    this.testEnv.initCore(function() {
      webserver = self.helpers.requireBackend('webserver').webserver;
      done();
    });
  });

  afterEach(function(done) {
    this.helpers.mongo.dropDatabase(done);
  });

  describe('GET /api/collaborations/membersearch', function() {

    beforeEach(function(done) {
      var self = this;
      this.helpers.api.applyDomainDeployment('collaborationMembers', function(err, models) {
        if (err) { return done(err); }
        self.domain = models.domain;
        self.user = models.users[0];
        self.user2 = models.users[1];
        self.user3 = models.users[2];
        self.models = models;
        done();
      });
    });

    afterEach(function(done) {
      var self = this;
      self.helpers.api.cleanDomainDeployment(self.models, done);
    });

    it('should 401 when not logged in', function(done) {
      this.helpers.api.requireLogin(webserver.application, 'get', '/api/collaborations/membersearch?objectType=user&id=123456789', done);
    });

    it('should 400 when req.query.objectType is not set', function(done) {
      var self = this;
      self.helpers.api.loginAsUser(webserver.application, this.user2.emails[0], 'secret', function(err, loggedInAsUser) {
        if (err) { return done(err); }

        var req = loggedInAsUser(request(webserver.application).get('/api/collaborations/membersearch?id=' + self.user3._id));
        req.expect(400);
        done();
      });
    });

    it('should 400 when req.query.id is not set', function(done) {
      var self = this;
      self.helpers.api.loginAsUser(webserver.application, this.user2.emails[0], 'secret', function(err, loggedInAsUser) {
        if (err) { return done(err); }

        var req = loggedInAsUser(request(webserver.application).get('/api/collaborations/membersearch?objectType=community'));
        req.expect(400);
        done();
      });
    });

    it('should find all the collaborations where the given community is a member of', function(done) {

      var self = this;
      var tuples = [{
        objectType: 'community',
        id: self.models.communities[0]._id
      }];

      self.helpers.api.addMembersInCommunity(self.models.communities[1], tuples, function(err) {
        if (err) {
          return done(err);
        }

        self.helpers.api.loginAsUser(webserver.application, self.user.emails[0], 'secret', function(err, loggedInAsUser) {
          if (err) { return done(err); }

          var req = loggedInAsUser(request(webserver.application).get('/api/collaborations/membersearch?objectType=community&id=' + self.models.communities[0]._id));
          req.expect(200);
          req.end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.exist;
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(1);
            expect(res.body[0]._id).to.equal(self.models.communities[1].id);
            done();
          });
        });
      });
    });

    it('should find all the visible collaborations where the given community is a member of', function(done) {

      var self = this;
      var publicTuples = [{
        objectType: 'community',
        id: self.models.communities[0]._id
      }];

      function test() {
        self.helpers.api.loginAsUser(webserver.application, self.models.users[3].emails[0], 'secret', function(err, loggedInAsUser) {
          if (err) { return done(err); }

          var req = loggedInAsUser(request(webserver.application).get('/api/collaborations/membersearch?objectType=community&id=' + self.models.communities[0]._id));
          req.expect(200);
          req.end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.exist;
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(1);
            expect(res.body[0]._id).to.equal(self.models.communities[2].id);
            done();
          });
        });
      }

      async.parallel([
        function(callback) {
          return self.helpers.api.addMembersInCommunity(self.models.communities[1], publicTuples, callback);
        },
        function(callback) {
          return self.helpers.api.addMembersInCommunity(self.models.communities[2], publicTuples, callback);
        }
      ], function(err) {
        if (err) {
          return done(err);
        }
        return test();
      });
    });
  });

  describe('GET /api/collaborations/writable', function() {

    beforeEach(function(done) {
      var self = this;
      this.helpers.api.applyDomainDeployment('openAndPrivateCommunities', function(err, models) {
        if (err) { return done(err); }
        self.models = models;
        var jobs = models.users.map(function(user) {
          return function(done) {
            user.domains.push({domain_id: self.models.domain._id});
            user.save(done);
          };
        });
        async.parallel(jobs, done);
      });
    });

    it('should return 401 if user is not authenticated', function(done) {
      this.helpers.api.requireLogin(webserver.application, 'get', '/api/collaborations/writable', done);
    });

    it('should return the list of collaborations the user can write into', function(done) {
      var self = this;
      var correctIds = [self.models.communities[0].id, self.models.communities[1].id, self.models.communities[3].id];
      self.helpers.api.loginAsUser(webserver.application, self.models.users[2].emails[0], 'secret', function(err, loggedInAsUser) {
        if (err) {
          return done(err);
        }
        var req = loggedInAsUser(request(webserver.application).get('/api/collaborations/writable'));
        req.expect(200);
        req.end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.be.an.array;
          expect(res.body).to.have.length(correctIds.length);
          res.body.forEach(function(returnedCollaboration) {
            expect(correctIds).to.contain(returnedCollaboration._id);
          });
          done();
        });
      });
    });
  });
});
