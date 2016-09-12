'use strict';

var chai = require('chai');
var expect = chai.expect;

describe('The graceperiod controller', function() {

  var deps = {
    logger: {
      debug: function() {}
    }
  };

  var dependencies = function(name) {
    return deps[name];
  };

  function getController() {
    return require('../../../../../backend/webserver/api/controller')({}, dependencies);
  }

  describe('The flush function', function() {
    it('should send back HTTP 404 when task is not in request', function(done) {
      getController().flush({}, this.helpers.express.jsonResponse(function(code) {
        expect(code).to.equal(404);
        done();
      }));
    });

    it('should call cancel on task and return HTTP 204', function(done) {
      var called = false;
      getController().flush({
        task: {
          flush: function() {
            called = true;
          }
        }
      }, this.helpers.express.response(function(code) {
        expect(code).to.equal(204);
        expect(called).to.be.true;

        done();
      }));
    });
  });

  describe('The cancel function', function() {

    it('should send back HTTP 404 when task is not in request', function(done) {
      getController().cancel({}, this.helpers.express.jsonResponse(function(code) {
        expect(code).to.equal(404);
        done();
      }));
    });

    it('should call cancel on task and return HTTP 204', function(done) {
      var called = false;
      getController().cancel({
        task: {
          cancel: function() {
            called = true;
          }
        }
      }, this.helpers.express.response(function(code) {
        expect(code).to.equal(204);
        expect(called).to.be.true;

        done();
      }));
    });
  });
});
