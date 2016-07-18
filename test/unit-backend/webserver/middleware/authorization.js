'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var ObjectId = require('bson').ObjectId;

describe('The authorization middleware', function() {

  beforeEach(function() {
    mockery.registerMock('../../core/user', {});
  });

  describe('The loginAndContinue fn', function() {
    it('does nothing when authenticated', function(done) {
      mockery.registerMock('../../core/community', {});
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').loginAndContinue;
      var redirectTarget = null;
      var req = {
        isAuthenticated: function() {
          return true;
        }
      };
      var res = {
        redirect: function(target) {
          redirectTarget = target;
        }
      };
      var next = function() {
        expect(redirectTarget).to.be.null;
        done();
      };
      middleware(req, res, next);
    });

    it('redirects when not authenticated', function(done) {
      mockery.registerMock('../../core/community', {});
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').loginAndContinue;
      var req = {
        originalUrl: 'http://localhost/oauth/authorize',
        isAuthenticated: function() {
          return false;
        }
      };
      var res = {
        redirect: function(target) {
          expect(target).to.be.equal('/login?continue=' + encodeURIComponent(req.originalUrl));
          done();
        }
      };
      var next = function() {
      };
      middleware(req, res, next);
    });
  });

  describe('The requiresAPILogin fn', function() {

    it('should send an error if user is not autenticated', function(done) {
      mockery.registerMock('../../core/community', {});
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresAPILogin;
      var req = {
        isAuthenticated: function() {
          return false;
        }
      };
      var res = {
        json: function(code, error) {
          done();
        }
      };
      var next = function() {
      };
      middleware(req, res, next);
    });

    it('should call next if user is autenticated', function(done) {
      mockery.registerMock('../../core/community', {});
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresAPILogin;
      var req = {
        isAuthenticated: function() {
          return true;
        }
      };
      var res = {};
      var next = function() {
        done();
      };
      middleware(req, res, next);
    });

    it('should call passport if user is not autenticated and bearer strategy is active', function(done) {
      var mock = {
        config: function() {
          return {
            auth: {
              strategies: ['bearer']
            }
          };
        }
      };
      mockery.registerMock('../../core', mock);
      mockery.registerMock('../../core/community', {});

      var passport = {
        authenticate: function() {
          return function() {
            return done();
          };
        }
      };
      mockery.registerMock('passport', passport);

      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresAPILogin;
      var req = {
        isAuthenticated: function() {
          return false;
        }
      };
      var res = {};
      var next = function() {
        return done(new Error());
      };
      middleware(req, res, next);
    });
  });

  describe('The requiresDomainManager fn', function() {
    it('should return 400 is req.user does not exist', function(done) {
      mockery.registerMock('../../core/community', {});
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainManager;
      var req = {
        domain: {
          _id: 123456789
        }
      };
      var res = {
        json: function(status) {
          expect(status).to.equal(400);
          done();
        }
      };
      var next = function() {
      };
      middleware(req, res, next);
    });

    it('should return 400 if req.domain does not exist', function(done) {
      mockery.registerMock('../../core/community', {});
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainManager;
      var req = {
        user: {
          _id: 123456789
        }
      };
      var res = {
        json: function(status) {
          expect(status).to.equal(400);
          done();
        }
      };
      var next = function() {
      };
      middleware(req, res, next);
    });

    it('should return 400 if req.user._id does not exist', function(done) {
      mockery.registerMock('../../core/community', {});
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainManager;
      var req = {
        user: {
        },
        domain: {
        }
      };
      var res = {
        json: function(status) {
          expect(status).to.equal(400);
          done();
        }
      };
      var next = function() {
      };
      middleware(req, res, next);
    });

    it('should return 400 if req.domain.administrator does not exist', function(done) {
      mockery.registerMock('../../core/community', {});
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainManager;
      var req = {
        user: {
          _id: 123456789
        },
        domain: {
          _id: 987654321
        }
      };
      var res = {
        json: function(status) {
          expect(status).to.equal(400);
          done();
        }
      };
      var next = function() {
      };
      middleware(req, res, next);
    });
  });

  it('should return 403 if req.user is not the domain administrator', function(done) {
    mockery.registerMock('../../core/community', {});
    var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainManager;

    var req = {
      user: {
        _id: 123
      },
      domain: {
        _id: 111,
        administrator: {
          equals: function(id) {
            return id === 124;
          }
        }
      }
    };
    var res = {
      json: function(status) {
        expect(status).to.equal(403);
        done();
      }
    };
    var next = function() {
    };
    middleware(req, res, next);
  });

  it('should call next if req.user is the domain administrator', function(done) {
    mockery.registerMock('../../core/community', {});
    var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainManager;

    var req = {
      user: {
        _id: 123
      },
      domain: {
        _id: 111,
        administrator: {
          equals: function(id) {
            return id === 123;
          }
        }
      }
    };
    var res = {
    };
    var next = function() {
      done();
    };
    middleware(req, res, next);
  });

  describe('The requiresDomainManager fn', function() {
    it('should send back 400 is there are no user in request', function(done) {
      mockery.registerMock('../../core/community', {});
      var req = {
        domain: {}
      };
      var next = function() {};
      var res = {
        json: function(code) {
          expect(code).to.equal(400);
          done();
        }
      };
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainMember;
      middleware(req, res, next);
    });

    it('should send back 400 is there are no domain in request', function(done) {
      mockery.registerMock('../../core/community', {});
      var req = {
        user: {}
      };
      var next = function() {};
      var res = {
        json: function(code) {
          expect(code).to.equal(400);
          done();
        }
      };
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainMember;
      middleware(req, res, next);
    });

    it('should call next if user is the domain manager', function(done) {
      mockery.registerMock('../../core/community', {});
      var user_id = new ObjectId();
      var req = {
        domain: {
          administrator: user_id
        },
        user: {
          _id: user_id
        }
      };
      var res = {
      };

      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainMember;
      middleware(req, res, done);
    });

    it('should send back 403 if current user domain list is null', function(done) {
      mockery.registerMock('../../core/community', {});
      var user_id = new ObjectId();
      var req = {
        domain: {
          administrator: new ObjectId()
        },
        user: {
          _id: user_id
        }
      };
      var res = {
        json: function(code) {
          expect(code).to.equal(403);
          done();
        }
      };

      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainMember;
      middleware(req, res, function() {});
    });

    it('should send back 403 if current user domain list is empty', function(done) {
      mockery.registerMock('../../core/community', {});
      var user_id = new ObjectId();
      var req = {
        domain: {
          administrator: new ObjectId()
        },
        user: {
          _id: user_id,
          domains: []
        }
      };
      var res = {
        json: function(code) {
          expect(code).to.equal(403);
          done();
        }
      };

      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainMember;
      middleware(req, res, function() {});
    });

    it('should send back 403 if current user does not belongs to the domain', function(done) {
      mockery.registerMock('../../core/community', {});
      var user_id = new ObjectId();
      var req = {
        domain: {
          administrator: new ObjectId()
        },
        user: {
          _id: user_id,
          domains: [{domain_id: new ObjectId()}, {domain_id: new ObjectId()}]
        }
      };
      var res = {
        json: function(code) {
          expect(code).to.equal(403);
          done();
        }
      };

      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainMember;
      middleware(req, res, function() {});
    });

    it('should call next if current user belongs to the domain', function(done) {
      mockery.registerMock('../../core/community', {});
      var user_id = new ObjectId();
      var domain_id = new ObjectId();
      var req = {
        domain: {
          _id: domain_id,
          administrator: new ObjectId()
        },
        user: {
          _id: user_id,
          domains: [{domain_id: new ObjectId()}, {domain_id: domain_id}]
        }
      };
      var res = {
        json: function(code) {
          done(new Error());
        }
      };

      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresDomainMember;
      middleware(req, res, done);
    });
  });

  describe('The requiresCommunityCreator fn', function() {
    it('should send back 400 if user is not defined in request', function(done) {
      mockery.registerMock('../../core/community', {});
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresCommunityCreator;
      var req = {
        community: {}
      };
      var res = {
        json: function(code) {
          expect(code).to.equal(400);
          done();
        }
      };
      middleware(req, res);
    });

    it('should send back 400 if community is not defined in request', function(done) {
      mockery.registerMock('../../core/community', {});
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresCommunityCreator;
      var req = {
        user: {}
      };
      var res = {
        json: function(code) {
          expect(code).to.equal(400);
          done();
        }
      };
      middleware(req, res);
    });

    it('should send back 403 if user is not the community creator', function(done) {
      mockery.registerMock('../../core/community', {});
      var user_id = new ObjectId();
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresCommunityCreator;
      var req = {
        user: {_id: user_id},
        community: {creator: new ObjectId()}
      };
      var res = {
        json: function(code) {
          expect(code).to.equal(403);
          done();
        }
      };
      middleware(req, res);
    });

    it('should call next if user is the community creator', function(done) {
      mockery.registerMock('../../core/community', {});
      var user_id = new ObjectId();
      var middleware = this.helpers.requireBackend('webserver/middleware/authorization').requiresCommunityCreator;
      var req = {
        user: {_id: user_id},
        community: {creator: user_id}
      };
      middleware(req, {}, done);
    });
  });

});
