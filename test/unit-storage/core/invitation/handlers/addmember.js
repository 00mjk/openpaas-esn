'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');

describe('The addmember handler', function() {

  describe('The validate fn', function() {

    it('should fail if invitation data is not set', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');
      addmember.validate({}, function(err, result) {
        expect(result).to.be.false;
        done();
      });
    });

    it('should fail if email is not set', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');
      addmember.validate({data: {user: {}, domain: {}, foo: 'bar'}}, function(err, result) {
        expect(result).to.be.false;
        done();
      });
    });

    it('should be ok if required data is set', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');
      addmember.validate({data: {user: {}, domain: {}, email: 'baz@me.org'}}, function(err, result) {
        expect(result).to.be.true;
        done();
      });
    });

    it('should fail is email is not an email', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');
      addmember.validate({data: {user: {}, domain: {}, email: 'baz'}}, function(err, result) {
        expect(result).to.be.false;
        done();
      });
    });
  });

  describe('The init fn', function() {

    it('should fail if invitation uuid is not set', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');
      addmember.init({}, function(err, result) {
        expect(err).to.exist;
        done();
      });
    });

    it('should fail if invitation url is not set', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');
      addmember.init({uuid: 123, data: {}}, function(err, result) {
        expect(err).to.exist;
        done();
      });
    });

    it('should send an invitation email if all data is valid', function(done) {
      var mock = function(invitation, cb) {
        return cb(null, true);
      };

      mockery.registerMock('../../email/system/addMember', mock);
      var invitation = {
        uuid: '123456789',
        data: {
          email: 'foo@bar.com',
          url: 'http://localhost:8080/invitation/123456789'
        }
      };

      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');
      addmember.init(invitation, function(err, response) {
        expect(err).to.not.exist;
        expect(response).to.be.true;
        done();
      });
    });
  });

  describe('The process fn', function() {

    it('should redirect to the invitation app if invitation is found', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');

      var invitation = {
        uuid: 12345678
      };

      addmember.process(invitation, {}, function(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist;
        expect(data.redirect).to.exist;
        done();
      });
    });

    it('should send back error if invitation is not found', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');
      addmember.process(null, {}, function(err) {
        expect(err).to.exist;
        done();
      });
    });
  });

  describe('The finalize fn', function() {
    var User;
    var Domain;
    var Invitation;
    var userFixtures;

    before(function() {
      this.testEnv.writeDBConfigFile();
    });

    after(function() {
      this.testEnv.removeDBConfigFile();
    });

    beforeEach(function(done) {
      this.mongoose = require('mongoose');
      this.mongoose.connect(this.testEnv.mongoUrl);

      Domain = this.helpers.requireBackend('core/db/mongo/models/domain');
      User = this.helpers.requireBackend('core/db/mongo/models/user');
      Invitation = this.helpers.requireBackend('core/db/mongo/models/invitation');
      userFixtures = this.helpers.requireFixture('models/users.js')(User);

      var template = this.helpers.requireBackend('core/templates');
      template.user.store(done);
    });

    afterEach(function(done) {
      this.helpers.mongo.dropDatabase(done);
    });

    it('should send back error if invitation is not set', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');
      addmember.finalize(null, {}, function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should send back error if data is not set', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');
      addmember.finalize({}, null, function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should send back error if invitation is already finalized', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');

      var invitation = {
        type: 'test',
        timestamps: {
          finalized: new Date()
        },
        data: {}
      };

      var invit = new Invitation(invitation);
      invit.save(function(err, saved) {
        if (err) {
          return done(err);
        }

        var emptyData = {body: {data: {}}};

        addmember.finalize(saved, emptyData, function(err) {
          expect(err).to.exist;
          done();
        });
      });
    });

    it('should send back error when domain / company do not exist', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');

      var invitation = {
        data: {
          email: 'foo@bar.com'
        }
      };
      var data = {
        body: {
          data: {
            firstname: 'foo',
            lastname: 'bar',
            password: 'secret',
            confirmpassword: 'secret',
            company: 'Linagora',
            domain: 'ESN'
          }
        }
      };

      addmember.finalize(invitation, data, function(err) {
        expect(err).to.exist;
        done();
      });

    });

    it('should create a user if invitation and form data are set', function(done) {
      var addmember = this.helpers.requireBackend('core/invitation/handlers/addmember');
      var invitation = {
        type: 'test',
        data: {
          email: 'foo@bar.com'
        }
      };

      var emails = ['toto@foo.com'];
      var u = userFixtures.newDummyUser(emails);

      u.save(function(err, savedUser) {
        if (err) {
          return done(err);
        }

        var dom = {
          name: 'ESN',
          company_name: 'Linagora',
          administrator: savedUser
        };

        var domain = new Domain(dom);
        domain.save(function(err, saved) {
          if (err) {
            return done(err);
          }

          var invit = new Invitation(invitation);
          invit.save(function(err, saved) {
            if (err) {
              return done(err);
            }

            var data = {
              body: {
                data: {
                  firstname: 'foo',
                  lastname: 'bar',
                  password: 'secret',
                  confirmpassword: 'secret',
                  company: 'Linagora',
                  domain: 'ESN'
                }
              }
            };

            addmember.finalize(saved, data, function(err, result) {
              expect(err).to.not.exist;
              expect(result).to.exist;
              expect(result.status).to.equal(201);

              User.findOne({_id: result.result.resources.user}, function(err, user) {
                if (err) {
                  return done(err);
                }
                expect(user).to.exist;
                var isMember = new User(user).isMemberOfDomain(result.result.resources.domain);
                expect(isMember).to.be.true;
                done();
              });
            });
          });

        });
      });
    });

  });

});
