'use strict';

var sinon = require('sinon');
var chai = require('chai');
var mockery = require('mockery');
var expect = chai.expect;

describe('The JWT based authentication module', function() {

  var getModule;

  before(function() {
    getModule = this.helpers.requireBackend.bind(this.helpers, 'core/auth/jwt');
  });

  describe('The WebTokenConfig', function() {

    var WebTokenConfig;

    beforeEach(function() {
      WebTokenConfig = getModule().WebTokenConfig;
    });

    it('should throw an error when there is no privateKey in the config', function() {
      expect(function() {
        new WebTokenConfig({publicKey: 'public', algorithm: 'algo'});
      }).to.throw(Error);
    });

    it('should throw an error when there is no publicKey in the config', function() {
      expect(function() {
        new WebTokenConfig({privateKey: 'private', algorithm: 'algo'});
      }).to.throw(Error);
    });

    it('should throw an error when there is no algorithm in the config', function() {
      expect(function() {
        new WebTokenConfig({privateKey: 'private', publicKey: 'public'});
      }).to.throw(Error);
    });

    it('should have only expected fields when the config is valid', function() {
      var testee = new WebTokenConfig({
        privateKey: 'private',
        publicKey: 'public',
        algorithm: 'algo',
        not: 'expected'
      });

      expect(testee.privateKey).to.equal('private');
      expect(testee.publicKey).to.equal('public');
      expect(testee.algorithm).to.equal('algo');
      expect(testee.not).to.not.exist;
    });

  });

  describe('The getWebTokenConfig function', function() {
    it('should fail if esnConfig search fails', function(done) {
      var esnConfigMock = function(key) {
        expect(key).to.equal('jwt');

        return {
          get: function(callback) {
            return callback(new Error());
          }
        };
      };

      mockery.registerMock('../esn-config', esnConfigMock);

      getModule().getWebTokenConfig(function(err, config) {
        expect(err).to.exist;
        expect(config).to.not.exist;
        done();
      });
    });

    it('should return esnConfig for jwt key', function(done) {
      var expectedConfig = {
        privateKey: 'private key',
        publicKey: 'public key',
        algorithm: 'algo'
      };
      var esnConfigMock = function(key) {
        expect(key).to.equal('jwt');

        return {
          get: function(callback) {
            return callback(null, expectedConfig);
          }
        };
      };

      mockery.registerMock('../esn-config', esnConfigMock);

      getModule().getWebTokenConfig(function(err, config) {
        expect(err).to.not.exist;
        expect(config).to.deep.equal(expectedConfig);
        done();
      });
    });

  });

  describe('The generateWebToken function', function() {
    it('should fail if no payload is provided', function() {
      getModule().generateWebToken(null, function(err, token) {
        expect(err).to.exist;
        expect(token).to.not.exist;
      });
    });

    it('should fail if webtoken config retrieval fails', function() {
      mockery.registerMock('../esn-config', function() {
        return {
          get: function(callback) {
            callback(new Error('some_error'));
          }
        };
      });

      var payload = {user: 'me', email: 'me@me.me'};
      var jwt = getModule();

      jwt.getWebTokenConfig = function(callback) {
        return callback(new Error());
      };
      jwt.generateWebToken(payload, function(err, token) {
        expect(err).to.exist;
        expect(token).to.not.exist;
      });
    });

    it('should return a webtoken', function(done) {
      var payload = {user: 'me', email: 'me@me.me'};
      var config = {publicKey: 'public key', privateKey: 'private key', algorithm: 'algo'};
      var token = 'aaabbbcccddd123456';
      var jwtLibMock = {
        sign: function(_payload, _privateKey, opts, callback) {
          expect(_payload).to.deep.equal(payload);
          expect(_privateKey).to.equal(config.privateKey);
          expect(opts).to.deep.equal({algorithm: 'algo'});

          return callback(null, token);
        }
      };

      mockery.registerMock('jsonwebtoken', jwtLibMock);
      mockery.registerMock('../esn-config', function() {
        return {
          get: function(callback) {
            callback(null, config);
          }
        };
      });

      getModule().generateWebToken(payload, function(err, _token) {
        expect(err).to.not.exist;
        expect(_token).to.equal(token);
        done();
      });
    });
  });

  describe('The generateKeyPair fn', function() {

    var ursaMock;

    beforeEach(function() {
      ursaMock = {};
      mockery.registerMock('ursa', ursaMock);
    });

    it('should call callback with private and public keys on success', function(done) {
      ursaMock.generatePrivateKey = sinon.stub().returns({
        toPrivatePem: function() {
          return 'privateKey';
        },
        toPublicPem: function() {
          return 'publicKey';
        }
      });

      getModule().generateKeyPair(function(err, keys) {
        expect(ursaMock.generatePrivateKey).to.have.been.calledOnce;
        expect(err).to.not.exist;
        expect(keys).to.deep.equal({
          privateKey: 'privateKey',
          publicKey: 'publicKey'
        });

        done();
      });

    });

    it('should call callback with error on failure', function(done) {
      ursaMock.generatePrivateKey = sinon.stub().throws(new Error('some_error'));

      getModule().generateKeyPair(function(err, keys) {
        expect(ursaMock.generatePrivateKey).to.have.been.calledOnce;
        expect(err.message).to.equal('some_error');
        expect(keys).to.not.exist;

        done();
      });
    });

  });
});
