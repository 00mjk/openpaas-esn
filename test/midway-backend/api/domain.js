'use strict';

var request = require('supertest'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    ObjectId = require('bson').ObjectId;

describe('The domain API', function() {
  var app;
  var user1Domain1Manager, user2Domain1Member;
  var user1Domain2Manager;
  var domain1;
  var domain1Users;
  var password = 'secret';
  var Domain;
  var Invitation;
  var pubsubLocal;
  var utils;
  var helpers;

  beforeEach(function(done) {
    helpers = this.helpers;
    var self = this;
    self.mongoose = require('mongoose');

    self.testEnv.initCore(function() {
      app = helpers.requireBackend('webserver/application');
      Domain = helpers.requireBackend('core/db/mongo/models/domain');
      Invitation = helpers.requireBackend('core/db/mongo/models/invitation');
      pubsubLocal = helpers.requireBackend('core/pubsub').local;
      utils = helpers.requireBackend('webserver/controllers/utils');
      helpers.requireBackend('core/elasticsearch/pubsub').init();

      helpers.api.applyDomainDeployment('linagora_test_domain', function(err, models) {
        expect(err).to.not.exist;
        user1Domain1Manager = models.users[0];
        user2Domain1Member = models.users[1];
        domain1 = models.domain;
        domain1Users = models.users.map(utils.sanitizeUser).map(helpers.toComparableObject);

        helpers.api.applyDomainDeployment('linagora_test_domain2', function(err, models2) {
          expect(err).to.not.exist;
          user1Domain2Manager = models2.users[0];

          helpers.elasticsearch.saveTestConfiguration(helpers.callbacks.noError(done));
        });
      });
    });
  });

  afterEach(function(done) {
    this.helpers.mongo.dropDatabase(done);
  });

  describe('POST /api/domains', function() {
    it('should send back 400 when administrators is not set', function(done) {
      var json = {
        name: 'Marketing',
        company_name: 'Corporate'
      };

      request(app).post('/api/domains').send(json).expect(400).end(helpers.callbacks.noError(done));
    });

    it('should send back 400 when administrators is empty', function(done) {
      var json = {
        name: 'Marketing',
        company_name: 'Corporate',
        administrators: []
      };

      request(app).post('/api/domains').send(json).expect(400).end(helpers.callbacks.noError(done));
    });

    it('should send back 400 when administrator users is not correctly filled (emails is mandatory)', function(done) {
      var user = {
        firstname: 'foo',
        lastname: 'bar'
      };

      var json = {
        name: 'Marketing',
        company_name: 'Corporate',
        administratosr: [user]
      };

      request(app).post('/api/domains').send(json).expect(400).end(helpers.callbacks.noError(done));
    });

    it('should send back 201, create a domain with name, company_name and administrators in lower case', function(done) {
      var user = {
        firstname: 'foo',
        lastname: 'bar',
        accounts: [{
          type: 'email',
          emails: ['foo@linagora.com']
        }]
      };

      var json = {
        name: 'Marketing',
        company_name: 'Corporate',
        administrators: [user]
      };

      request(app).post('/api/domains').send(json).expect(201).end(function(err, res) {
        expect(err).to.not.exist;
        expect(res.body).to.exists;
        expect(res.body).to.be.empty;
        Domain.findOne({name: 'marketing', company_name: 'corporate'}, function(err, doc) {
          expect(err).to.not.exist;
          expect(doc).to.exist;
          expect(doc).to.shallowDeepEqual({
            name: 'marketing',
            company_name: 'corporate',
            administrators: [{}]
          });
          done();
        });
      });
    });
  });

  describe('GET /api/domains/:uuid', function() {
    it('should send back 401 when not logged in', function(done) {
      helpers.api.requireLogin(app, 'get', '/api/domains/' + domain1._id, done);
    });

    it('should send back 403 when current user is not domain member', function(done) {
      helpers.api.loginAsUser(app, user1Domain2Manager.emails[0], password, function(err, loggedInAsUser) {
        expect(err).to.not.exist;
        loggedInAsUser(request(app).get('/api/domains/' + domain1._id)).expect(403).end(done);
      });
    });

    it('should send back 200 with domain information when current user is domain manager', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, loggedInAsUser) {
        expect(err).to.not.exist;
        loggedInAsUser(request(app).get('/api/domains/' + domain1._id)).expect(200).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exist;
          expect(res.body).to.shallowDeepEqual({name: domain1.name, company_name: domain1.company_name});
          done();
        });
      });
    });

    it('should send back 200 with domain information when current user is domain member', function(done) {
      helpers.api.loginAsUser(app, user2Domain1Member.emails[0], password, function(err, loggedInAsUser) {
        expect(err).to.not.exist;
        loggedInAsUser(request(app).get('/api/domains/' + domain1._id)).expect(200).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exist;
          expect(res.body).to.shallowDeepEqual({name: domain1.name, company_name: domain1.company_name});
          done();
        });
      });
    });

    it('should send back 400 when domain ID is not a valid ObjectId', function(done) {
      helpers.api.loginAsUser(app, user2Domain1Member.emails[0], password, function(err, loggedInAsUser) {
        expect(err).to.not.exist;
        loggedInAsUser(request(app).get('/api/domains/invalid')).expect(400).end(helpers.callbacks.noError(done));
      });
    });
  });

  describe('GET /api/domains/:uuid/members', function() {
    it('should send back 401 when not logged in', function(done) {
      helpers.api.requireLogin(app, 'get', '/api/domains/' + domain1._id + '/members', done);
    });

    it('should send back 404 when domain is not found', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).get('/api/domains/' + new ObjectId() + '/members'));
        req.expect(404).end(helpers.callbacks.noError(done));
      });
    });

    it('should send back 200 with all the members of the domain and contain the list size in the header', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).get('/api/domains/' + domain1._id + '/members'));
        req.expect(200).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exist;
          expect(res.headers['x-esn-items-count']).to.exist;
          expect(res.headers['x-esn-items-count']).to.equal(domain1Users.length + '');
          expect(res.body).to.shallowDeepEqual(domain1Users);
          done();
        });
      });
    });

    it('should send back 200 with all the members of the domain and members should have an emails field', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, helpers.callbacks.noErrorAnd(function(requestAsMember) {
        requestAsMember(request(app).get('/api/domains/' + domain1._id + '/members'))
          .expect(200)
          .end(helpers.callbacks.noErrorAnd(function(res) {
            res.body.forEach(function(user) {
              expect(user.emails.length).to.equal(1);
            });

            done();
          }));
      }));
    });

    it('should send back 200 with all the members matching the search terms', function(done) {
      var ids = domain1Users.map(function(user) {
        return user._id;
      });
      helpers.elasticsearch.checkUsersDocumentsIndexed(ids, function(err) {
        expect(err).to.not.exist;

        helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
          expect(err).to.not.exist;
          var req = requestAsMember(request(app).get('/api/domains/' + domain1._id + '/members'));
          req.query({search: 'lng'}).expect(200).end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.exist;
            var expectedUsers = domain1Users.slice(0, 3);
            expect(res.headers['x-esn-items-count']).to.exist;
            expect(res.headers['x-esn-items-count']).to.equal(expectedUsers.length + '');
            expect(res.body).to.shallowDeepEqual(expectedUsers);
            done();
          });
        });
      });
    });

    it('should send back 200 with all the members matching the search terms and members should have an emails field', function(done) {
      var ids = domain1Users.map(function(user) { return user._id; });

      helpers.elasticsearch.checkUsersDocumentsIndexed(ids, helpers.callbacks.noErrorAnd(function() {
        helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, helpers.callbacks.noErrorAnd(function(requestAsMember) {
          requestAsMember(request(app).get('/api/domains/' + domain1._id + '/members'))
            .query({search: 'lng'})
            .expect(200)
            .end(helpers.callbacks.noErrorAnd(function(res) {
              res.body.forEach(function(user) {
                expect(user.emails.length).to.equal(1);
              });

              done();
            }));
        }));
      }));
    });

    it('should send back 200 with the first 2 members', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).get('/api/domains/' + domain1._id + '/members'));
        req.query({limit: 2}).expect(200).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exist;
          expect(res.headers['x-esn-items-count']).to.exist;
          expect(res.headers['x-esn-items-count']).to.equal(domain1Users.length + '');
          var expectedUsers = domain1Users.slice(0, 2);
          expect(res.body).to.shallowDeepEqual(expectedUsers);
          done();
        });
      });
    });

    it('should send back 200 with the last 2 members', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).get('/api/domains/' + domain1._id + '/members'));
        req.query({offset: 2}).expect(200).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exist;
          expect(res.headers['x-esn-items-count']).to.exist;
          expect(res.headers['x-esn-items-count']).to.equal(domain1Users.length + '');
          var expectedUsers = domain1Users.slice(2, 4);
          expect(res.body).to.shallowDeepEqual(expectedUsers);
          done();
        });
      });
    });

    it('should send back 200 with the third member', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).get('/api/domains/' + domain1._id + '/members'));
        req.query({limit: 1, offset: 2}).expect(200).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exist;
          expect(res.headers['x-esn-items-count']).to.exist;
          expect(res.headers['x-esn-items-count']).to.equal(domain1Users.length + '');
          var expectedUsers = domain1Users.slice(2, 3);
          expect(res.body).to.shallowDeepEqual(expectedUsers);
          done();
        });
      });
    });

    it('should send back 400 when domain ID is not a valid ObjectId', function(done) {
      helpers.api.loginAsUser(app, user2Domain1Member.emails[0], password, function(err, loggedInAsUser) {
        expect(err).to.not.exist;
        loggedInAsUser(request(app).get('/api/domains/invalid')).expect(400).end(helpers.callbacks.noError(done));
      });
    });
  });

  describe('POST /api/domains/:uuid/invitations', function() {
    beforeEach(function(done) {
      helpers.mail.saveTestConfiguration(done);
    });

    it('should send back 401 when not logged in', function(done) {
      helpers.api.requireLogin(app, 'post', '/api/domains/' + domain1._id + '/invitations', done);
    });

    it('should send back 202 when current user is a domain member', function(done) {
      var checkpoint = sinon.spy();

      pubsubLocal.topic('domain:invitations:sent').subscribe(function(message) {
        expect(checkpoint).to.have.been.called;
        var expectedMessage = {
          user: user2Domain1Member.id,
          domain: domain1.id,
          emails: ['foo@bar.com']
        };
        expect(message).to.shallowDeepEqual(expectedMessage);
        done();
      });

      helpers.api.loginAsUser(app, user2Domain1Member.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + domain1._id + '/invitations'));

        req.send(['foo@bar.com']).expect(202).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exists;
          expect(res.body).to.be.empty;
          Invitation.find({}, function(err, docs) {
            expect(err).to.not.exist;
            expect(docs).to.exist;
            expect(docs).to.have.length(1);

            var expectedObject = {
              type: 'addmember',
              data: {
                user: helpers.toComparableObject(user2Domain1Member),
                domain: helpers.toComparableObject(domain1)
              }
            };

            expect(helpers.toComparableObject(docs[0])).to.shallowDeepEqual(expectedObject);
            checkpoint();
          });
        });
      });
    });

    it('should send back 403 when current user is not a domain member', function(done) {
      helpers.api.loginAsUser(app, user1Domain2Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + domain1._id + '/invitations'));
        req.send(['inviteme@open-paas.org']).expect(403).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exists;
          expect(res.body.error).to.equal(403);
          done();
        });
      });
    });

    it('should send back 400 when domain ID is not a valid ObjectId', function(done) {
      helpers.api.loginAsUser(app, user2Domain1Member.emails[0], password, function(err, loggedInAsUser) {
        expect(err).to.not.exist;
        loggedInAsUser(request(app).get('/api/domains/invalid')).expect(400).end(helpers.callbacks.noError(done));
      });
    });
  });

  describe('GET /api/domains/:uuid/manager', function() {
    it('should send back 401 when not logged in', function(done) {
      helpers.api.requireLogin(app, 'get', '/api/domains/' + domain1._id + '/manager', done);
    });

    it('should send back 403 when current user is not a domain manager', function(done) {
      helpers.api.loginAsUser(app, user2Domain1Member.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).get('/api/domains/' + domain1._id + '/manager'));
        req.expect(403).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exists;
          expect(res.body.error).to.equal(403);
          done();
        });
      });
    });

    it('should send back 200 with the domain information when current user is a domain manager', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).get('/api/domains/' + domain1._id + '/manager'));
        req.expect(200).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exists;
          expect(res.body).to.shallowDeepEqual({name: domain1.name, company_name: domain1.company_name});
          done();
        });
      });
    });
  });

  describe('POST /api/domains/:uuid/members', function() {
    var newUser;

    beforeEach(function() {
      newUser = {
        password: 'secret',
        firstname: 'new',
        lastname: 'member',
        accounts: [{
          type: 'email',
          hosted: true,
          preferredEmailIndex: 0,
          emails: ['newMember@lng.net']
        }]
      };
    });

    it('should send back 401 when not logged in', function(done) {
      helpers.api.requireLogin(app, 'post', '/api/domains/' + domain1._id + '/members', done);
    });

    it('should send back 400 when request body empty', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + domain1._id + '/members'));
        req.send({});
        req.expect(400).end(done);
      });
    });

    it('should send back 400 when domain ID is not a valid ObjectId', function(done) {
      helpers.api.loginAsUser(app, user2Domain1Member.emails[0], password, function(err, loggedInAsUser) {
        expect(err).to.not.exist;
        loggedInAsUser(request(app).get('/api/domains/invalid')).expect(400).end(helpers.callbacks.noError(done));
      });
    });

    it('should send back 403 when current user is not a domain manager', function(done) {
      helpers.api.loginAsUser(app, user2Domain1Member.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + domain1._id + '/members'));
        req.expect(403).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exists;
          expect(res.body.error).to.equal(403);
          done();
        });
      });
    });

    it('should send back 404 when domain is not found', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + new ObjectId() + '/members'));
        req.expect(404).end(helpers.callbacks.noError(done));
      });
    });

    it('should send back 500 when save fail', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + domain1._id + '/members'));
        req.send({user: 'invalid user'});
        req.expect(500).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exists;
          expect(res.body.error.code).to.equal(500);
          done();
        });
      });
    });

    it('should send back 201 when create success', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + domain1._id + '/members'));
        req.send(newUser);
        req.expect(201).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exists;
          done();
        });
      });
    });
  });

  describe('GET /api/domains/:uuid/administrators', function() {
    it('should send back 401 when not logged in', function(done) {
      helpers.api.requireLogin(app, 'get', '/api/domains/' + domain1._id + '/administrators', done);
    });

    it('should send back 403 when current user is not a domain administrator', function(done) {
      helpers.api.loginAsUser(app, user2Domain1Member.emails[0], password, helpers.callbacks.noErrorAnd(function(requestAsMember) {
        var req = requestAsMember(request(app).get('/api/domains/' + domain1._id + '/administrators'));
        req.expect(403).end(helpers.callbacks.noErrorAnd(function(res) {
          expect(res.body).to.exists;
          expect(res.body.error).to.equal(403);
          done();
        }));
      }));
    });

    it('should send back 404 when domain is not found', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, helpers.callbacks.noErrorAnd(function(requestAsMember) {
        var req = requestAsMember(request(app).get('/api/domains/' + new ObjectId() + '/administrators'));
        req.expect(404).end(helpers.callbacks.noError(done));
      }));
    });

    it('should send back 400 when dpmain ID is not a valid ObjectId', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, helpers.callbacks.noErrorAnd(function(requestAsMember) {
        var req = requestAsMember(request(app).get('/api/domains/invalid/administrators'));

        req.expect(400).end(helpers.callbacks.noError(done));
      }));
    });

    it('should send back 200 when get success', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, helpers.callbacks.noErrorAnd(function(requestAsMember) {
        var req = requestAsMember(request(app).get('/api/domains/' + domain1._id + '/administrators'));

        req.expect(200).end(helpers.callbacks.noErrorAnd(function(res) {
          expect(res.body).to.shallowDeepEqual([
            {
              _id: user1Domain1Manager.id,
              role: {
                timestamps: {},
                user_id: user1Domain1Manager.id
              }
            }
          ]);
          done();
        }));
      }));
    });

  });

  describe('POST /api/domains/:uuid/administrators', function() {

    it('should send back 401 when not logged in', function(done) {
      helpers.api.requireLogin(app, 'post', '/api/domains/' + domain1._id + '/administrators', done);
    });

    it('should send back 400 when request body is not an array', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + domain1._id + '/administrators'));

        req.send({});
        req.expect(400).end(helpers.callbacks.noErrorAnd(function(res) {
          expect(res.body.error.code).to.equal(400);
          done();
        }));
      });
    });

    it('should send back 403 when current user is not a domain manager', function(done) {
      helpers.api.loginAsUser(app, user2Domain1Member.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + domain1._id + '/administrators'));

        req.expect(403).end(helpers.callbacks.noErrorAnd(function(res) {
          expect(res.body.error).to.equal(403);
          done();
        }));
      });
    });

    it('should send back 404 when domain is not found', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + new ObjectId() + '/administrators'));

        req.expect(404).end(helpers.callbacks.noError(done));
      });
    });

    it('should send back 500 when server fails (userID is invalid)', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + domain1._id + '/administrators'));

        req.send(['invalid userID']);
        req.expect(500).end(helpers.callbacks.noErrorAnd(function(res) {
          expect(res.body.error.code).to.equal(500);
          done();
        }));
      });
    });

    it('should send back 204 on success', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).post('/api/domains/' + domain1._id + '/administrators'));

        req.send([user2Domain1Member._id]);
        req.expect(204).end(helpers.callbacks.noErrorAnd(function(res) {
          expect(res.body).to.not.exists;
          Domain.findById(domain1._id, function(err, domain) {
            expect(domain.administrator).to.not.exist;
            expect(domain.administrators.some(function(administrator) {
              return administrator.user_id.equals(user2Domain1Member._id);
            })).to.be.true;
            done(err);
          });
        }));
      });
    });

  });

  describe('DELETE /api/domains/:uuid/administrators/:administratorId', function() {

    var endpoint;

    beforeEach(function() {
      endpoint = '/api/domains/' + domain1._id + '/administrators/' + user1Domain1Manager._id;
    });

    it('should send back 401 when not logged in', function(done) {
      helpers.api.requireLogin(app, 'delete', endpoint, done);
    });

    it('should send back 403 when current user is not a domain manager', function(done) {
      helpers.api.loginAsUser(app, user2Domain1Member.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).delete(endpoint));

        req.expect(403).end(helpers.callbacks.noErrorAnd(function(res) {
          expect(res.body.error).to.equal(403);
          done();
        }));
      });
    });

    it('should send back 403 when an administrator tries to remove himself', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).delete(endpoint));

        req.expect(403).end(helpers.callbacks.noErrorAnd(function(res) {
          expect(res.body.error.code).to.equal(403);
          done();
        }));
      });
    });

    it('should send back 404 when domain is not found', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).delete('/api/domains/' + new ObjectId() + '/administrators/' + user1Domain1Manager._id));

        req.expect(404).end(helpers.callbacks.noError(done));
      });
    });

    it('should send back 400 when domainId is invalid', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;
        var req = requestAsMember(request(app).delete('/api/domains/invalid/administrators/' + user1Domain1Manager._id));

        req.expect(400).end(helpers.callbacks.noError(done));
      });
    });

    it('should send back 204 on success', function(done) {
      helpers.api.loginAsUser(app, user1Domain1Manager.emails[0], password, function(err, requestAsMember) {
        expect(err).to.not.exist;

        // add user2 as administrator
        Domain.findOneAndUpdate(
          { _id: domain1._id },
          {
            $push: {
              administrators: { user_id: user2Domain1Member._id }
            }
          },
          function(err) {
            expect(err).to.not.exist;

            var endpoint = '/api/domains/' + domain1._id + '/administrators/' + user2Domain1Member._id;
            var req = requestAsMember(request(app).delete(endpoint));

            req.expect(204).end(helpers.callbacks.noErrorAnd(function(res) {
              expect(res.body).to.not.exists;
              Domain.findById(domain1._id, function(err, domain) {
                // now only user1 is administrator
                expect(domain.administrators.length).to.equal(1);
                expect(String(domain.administrators[0].user_id)).to.equal(String(user1Domain1Manager._id));
                done(err);
              });
            }));
          }
        );

      });
    });

  });
});
