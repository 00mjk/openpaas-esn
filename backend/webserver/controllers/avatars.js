'use strict';

var userModule = require('../../core/user');
var userController = require('./users');
var imageModule = require('../../core/image');
var collaborationController = require('./collaborations');
var collaborationMiddleware = require('../middleware/collaboration');
var avatarModule = require('../../core/avatar');

function getUserAvatarFromEmail(req, res) {
  userModule.findByEmail(req.query.email, function(err, user) {
    if (err || !user) {
      return res.redirect('/images/not_a_user.png');
    }
    req.user = user;
    return userController.getProfileAvatar(req, res);
  });
}

function getCollaborationAvatar(req, res) {
  if (!req.query.id) {
    return res.status(400).json({ error: { code: 400, message: 'Bad request', details: 'Collaboration id is mandatory'}});
  }

  req.params.id = req.query.id;
  req.params.objectType = req.query.objectType;

  collaborationMiddleware.load(req, res, function(err) {
    if (err) {
      return res.status(500).json({ error: { code: 500, message: 'Server Error', details: 'Error while getting avatar'}});
    }
    return collaborationController.getAvatar(req, res);
  });
}

function getAvatar(req, res) {
  if (!req.query.id) {
    return res.status(400).json({ error: { code: 400, message: 'Bad request', details: 'Avatar id is mandatory'}});
  }

  imageModule.getAvatar(req.query.id, req.query.format, function(err, fileStoreMeta, readable) {
    if (err) {
      return res.redirect('/images/activitystream.png');
    }

    if (!readable) {
      return res.redirect('/images/activitystream.png');
    }

    if (req.headers['if-modified-since'] && Number(new Date(req.headers['if-modified-since']).setMilliseconds(0)) === Number(fileStoreMeta.uploadDate.setMilliseconds(0))) {
      return res.status(304).end();
    } else {
      res.header('Last-Modified', fileStoreMeta.uploadDate);
      res.status(200);
      return readable.pipe(res);
    }
  });
}

function getGeneratedAvatar(req, res) {
  if (!req.query.email || typeof req.query.email !== 'string' ||  req.query.email.length === 0) {
    return res.status(400).json({ error: { code: 400, message: 'Bad request', details: 'Email is mandatory and must be a non-empty string'}});
  }
  var options = {
    text: req.query.email.charAt(0)
  };
  return res.send(imageModule.avatarGenerationModule.generateFromText(options));
}

avatarModule.registerProvider('user', {
  findByEmail: userModule.findByEmail,
  getAvatar: function(user, req, res) {
    req.user = user;
    return userController.getProfileAvatar(req, res);
  }
});

module.exports.get = function(req, res) {
  if (!req.query.objectType) {
    if (!req.query.email || typeof req.query.email !== 'string' || req.query.email.length === 0) {
      return res.status(400).json({ error: { code: 400, message: 'Bad request', details: 'When no objectType is provided, email is mandatory and must be a non-empty string'}});
    }

    return avatarModule.getAvatarFromEmail(req.query.email, function(error, object, controller) {
      if (error) {
        return res.status(500).json({ error: { code: 500, message: 'Server Error', details: 'Error while getting avatar'}});
      }
      if (!object) {
        return getGeneratedAvatar(req, res);
      }
      return controller(object, req, res);
    });
  }

  if (req.query.objectType === 'user') {
    return getUserAvatarFromEmail(req, res);
  }

  if (req.query.objectType === 'community' || req.query.objectType === 'project') {
    return getCollaborationAvatar(req, res);
  }

  if (req.query.objectType === 'image') {
    return getAvatar(req, res);
  }

  if (req.query.objectType === 'email') {
    return getGeneratedAvatar(req, res);
  }

  return res.status(400).json({ error: { code: 400, message: 'Bad request', details: 'Unknown objectType parameter'}});
};
