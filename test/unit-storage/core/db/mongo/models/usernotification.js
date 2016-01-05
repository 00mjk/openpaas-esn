'use strict';

var expect = require('chai').expect;

describe('the Usernotification mongoose model', function() {
  var moduleFile;
  var Model;
  var mongoose;

  before(function() {
    moduleFile = this.testEnv.basePath + '/backend/core/db/mongo/models/usernotification';
  });

  beforeEach(function() {
    mongoose = require('mongoose');
    Model = require(moduleFile);
    mongoose.connect(this.testEnv.mongoUrl);
  });

  afterEach(function(done) {
    this.helpers.mongo.dropDatabase(done);
  });

  describe('subject field', function() {
    it('should not validate if missing', function(done) {
      var data = {
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        context: null,
        category: 'link:follow',
        target: mongoose.Types.ObjectId()
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        expect(err.errors).to.have.property('subject');
        expect(err.errors.subject.message).to.match(/required/);
        done();
      });
    });
    it('should not validate if badly formatted', function(done) {
      var data = {
        subject: {badSubject: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        context: null,
        category: 'link:follow',
        target: mongoose.Types.ObjectId()
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        expect(err.errors).to.have.property('subject');
        done();
      });
    });
  });
  describe('verb field', function() {
    it('should not validate if is missing', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        context: null,
        category: 'link:follow',
        target: mongoose.Types.ObjectId()
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        expect(err.errors).to.have.property('verb');
        expect(err.errors.verb.message).to.match(/required/);
        done();
      });
    });
    it('should not validate if badly formatted', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {bad: 'yes'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        context: null,
        category: 'link:follow',
        target: mongoose.Types.ObjectId()
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        expect(err.errors).to.have.property('verb');
        done();
      });
    });
  });
  describe('complement field', function() {
    it('should not validate if missing', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        context: null,
        category: 'link:follow',
        target: mongoose.Types.ObjectId()
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        expect(err.errors).to.have.property('complement');
        expect(err.errors.complement.message).to.match(/required/);
        done();
      });
    });
    it('should not validate if badly formatted', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {bad: 'yes'},
        context: null,
        category: 'link:follow',
        target: mongoose.Types.ObjectId()
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        expect(err.errors).to.have.property('complement');
        done();
      });
    });
  });
  describe('context field', function() {
    it('should not validate if badly formatted', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        context: {badTuple: true, id: 'bad'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId()
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        expect(err.errors).to.have.property('context');
        done();
      });
    });
  });
  describe('category field', function() {
    it('should not validate if missing', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        target: mongoose.Types.ObjectId()
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        expect(err.errors).to.have.property('category');
        expect(err.errors.category.message).to.match(/required/);
        done();
      });
    });
  });
  describe('parent target field', function() {
    it('should  validate if empty', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        parentTarget: []
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.null;
        done();
      });
    });
    it('should not validate if garbage', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        parentTarget: ['some', true, 123]
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        done();
      });
    });
    it('should not validate if members are bad formatted tuples', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        parentTarget: [
          {bad: 'tuple'},
          {badTuple: 'too'}
        ]
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        done();
      });
    });
    it('should not validate if members objectType are not target object types', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        parentTarget: [
          {objectType: 'idontexist', id: 'null'}
        ]
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        done();
      });
    });
    it('should validate if members objectType are target object types', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        parentTarget: [
          {objectType: 'user', id: 'user1'},
          {objectType: 'community', id: 'community1'}
        ]
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.null;
        expect(data.parentTarget).to.have.length(2);
        done();
      });
    });
  });
  describe('icon field', function() {
    it('should not validate if the tuple is badly formatted', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        icon: {garbage: true}
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        done();
      });
    });
    it('should not validate if the tuple is not icon|url objectType', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        icon: {objectType: 'user', id: 'user1'}
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        done();
      });
    });
    it('should validate if the tuple is icon objectType', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        icon: {objectType: 'icon', id: 'mdi-bell'}
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.not.ok;
        done();
      });
    });
    it('should validate if the tuple is url objectType', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        icon: {objectType: 'url', id: 'http://test.com/image.png'}
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.not.ok;
        done();
      });
    });
  });
  describe('action field', function() {
    it('should record an empty array if not an array', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        action: {notAnArray: true}
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.not.ok;
        expect(data.action).to.be.an('array');
        expect(data.action).to.have.length(0);
        done();
      });
    });

    it('should not validate if array contains garbage', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        action: ['yep', 'nope', null]
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        done();
      });
    });
    it('should not validate if display is not an i18n structure', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        action: [{url: 'http', display: 'none'}]
      };
      var notif = new Model(data);
      notif.save(function(err, data) {
        expect(err).to.be.ok;
        done();
      });
    });
    it('should validate a valid action', function(done) {
      var data = {
        subject: {objectType: 'user', id: 'user1'},
        verb: {label: 'ESN_LABEL_FOLLOW', text: 'followed'},
        complement: {objectType: 'email', id: 'test@linagora.com'},
        category: 'link:follow',
        target: mongoose.Types.ObjectId(),
        action: [{url: 'http', display: {text: 'text', label: 'label'}}]
      };
      var notif = new Model(data);
      notif.save(function(err) {
        expect(err).to.be.null;
        done();
      });
    });
  });
});
