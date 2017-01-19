'use strict';

var expect = require('chai').expect;
var request = require('supertest');

describe('The davserver API', function() {
  var user;
  var password = 'secret';
  var moduleName = 'linagora.esn.davserver';

  beforeEach(function(done) {
    var self = this;
    this.helpers.modules.initMidway(moduleName, function(err) {
      if (err) {
        return done(err);
      }

      self.helpers.api.applyDomainDeployment('linagora_IT', function(err, models) {
        if (err) {
          return done(err);
        }
        user = models.users[0];
        self.models = models;
        done();
      });
    });
  });

  afterEach(function(done) {
    this.helpers.api.cleanDomainDeployment(this.models, done);
  });

  describe('GET /api/info', function() {

    beforeEach(function() {
      var expressApp = require('../../backend/webserver/application')(this.helpers.modules.current.deps);
      expressApp.use('/', this.helpers.modules.current.lib.api.davserver);
      this.app = this.helpers.modules.getWebServer(expressApp);
    });

    it('should return 401 if user is not authenticated', function(done) {
      this.helpers.api.requireLogin(this.app, 'get', '/api/info', done);
    });

    it('should return 200 with the default DAV server url', function(done) {
      var self = this;
      this.helpers.api.loginAsUser(this.app, user.emails[0], password, function(err, loggedInAsUser) {
        if (err) {
          return done(err);
        }

        var req = loggedInAsUser(request(self.app).get('/api/info'));
        req.expect(200).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.exist;
          expect(res.body).to.deep.equal({
            url: 'http://localhost:80'
          });
          done();
        });
      });
    });

    it('should return 200 with the DAV server url define in the database', function(done) {
      var self = this;

      var caldavConfiguration = {
        backend: {
          url: 'backendUrl'
        },
        frontend: {
          url: 'http://localhost:80'
        }
      };

      self.helpers.requireBackend('core/esn-config')('davserver').store(caldavConfiguration, function(err) {
        if (err) {
          done(err);
        }

        self.helpers.api.loginAsUser(self.app, user.emails[0], password, function(err, loggedInAsUser) {
          if (err) {
            return done(err);
          }

          var req = loggedInAsUser(request(self.app).get('/api/info'));
          req.expect(200).end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.exist;
            expect(res.body).to.deep.equal({
              url: caldavConfiguration.frontend.url
            });
            done();
          });
        });
      });
    });
  });
});
