'use strict';
var async = require('async');
var escapeStringRegexp = require('escape-string-regexp');
var ObjectId = require('mongoose').Types.ObjectId;

var acceptedImageTypes = ['image/jpeg', 'image/gif', 'image/png'];

function transform(lib, project, user, callback) {
  if (!project) {
    return {};
  }

  var membershipRequest = lib.getMembershipRequest(project, user);

  if (typeof (project.toObject) === 'function') {
    project = project.toObject();
  }

  project.members_count = project.members ? project.members.length : 0;
  if (membershipRequest) {
    project.membershipRequest = membershipRequest.timestamp.creation.getTime();
  }

  var tuple = {objectType: 'user', id: user._id + ''};
  async.waterfall([
    function(callback) {
      lib.isMember(project, tuple, callback);
    },
    function(membership, callback) {
      if (membership) {
        project.member_status = 'member';
        return callback(null, null);
      } else {
        lib.isIndirectMember(project, tuple, callback);
      }
    },
    function(isIndirect, callback) {
      if (isIndirect) {
        project.member_status = 'indirect';
      }
      return callback();
    }
  ], function() {
    delete project.members;
    delete project.membershipRequests;
    return callback(project);
  });
}

function projectControllers(lib, dependencies) {
  var controllers = {};

  controllers.getAll = function(req, res, next) {
    var permission = dependencies('collaboration').permission;
    var query = {};
    if (req.domain) {
      query.domain_ids = [req.domain._id];
    }

    if (req.query.creator) {
      query.creator = req.query.creator;
    }

    if (req.query.title) {
      var escapedString = escapeStringRegexp(req.query.title);
      query.title = new RegExp('^' + escapedString + '$', 'i');
    }

    lib.query(query, function(err, response) {
      if (err) {
        return res.status(500).json({ error: { code: 500, message: 'Project list failed', details: err}});
      }

      async.filter(response, function(project, callback) {
        permission.canFind(project, {objectType: 'user', id: req.user._id}, callback);
      }, function(err, filterResults) {
        async.map(filterResults, function(project, callback) {
          transform(lib, project, req.user, function(transformed) {
            return callback(null, transformed);
          });
        }, function(err, mapResults) {
          return res.status(200).json(mapResults);
        });
      });
    });
  };

  controllers.get = function(req, res, next) {
    var permission = dependencies('collaboration').permission;
    var query = { _id: req.params.id };

    lib.queryOne(query, function(err, project) {
      if (err) {
        return res.status(500).json({ error: { code: 500, message: 'Project retrieval failed', details: err }});
      }
      if (!project) {
        return res.status(404).json({ error: { code: 404, message: 'Not found', details: 'Project not found' }});
      }

      transform(lib, project, req.user, function(transformed) {
        permission.canWrite(project, {objectType: 'user', id: req.user._id + ''}, function(err, writable) {
          var result = transformed;
          result.writable = writable;
          return res.status(200).json(result);
        });
      });
    });
  };

  controllers.create = function(req, res, next) {
    function copyIfSet(key) {
      if (req.body[key]) {
        project[key] = req.body[key];
      }
    }

    var project = {
      title: req.body.title,
      creator: req.user._id,
      domain_ids: req.body.domain_ids,
      type: 'open',
      members: [
        { member: { id: req.user._id, objectType: 'user' } }
      ]
    };

    ['description', 'startDate', 'endDate', 'type',
     'status', 'avatar'].forEach(copyIfSet);

    var startDate = new Date(project.startDate);
    var endDate = new Date(project.endDate);
    if (project.startDate && isNaN(startDate)) {
      return res.status(400).json({ error: { code: 400, message: 'Bad request', details: 'Start date is invalid'}});
    } else if (project.endDate && isNaN(endDate)) {
      return res.status(400).json({ error: { code: 400, message: 'Bad request', details: 'End date is invalid'}});
    }
    if (project.startDate && project.endDate && startDate.getTime() > endDate.getTime()) {
      return res.status(400).json({ error: { code: 400, message: 'Bad request', details: 'Start date is after end date'}});
    }

    if (!project.domain_ids || project.domain_ids.length === 0) {
      return res.status(400).json({ error: { code: 400, message: 'Bad request', details: 'At least a domain is required'}});
    }

    lib.create(project, function(err, project) {
      if (err) {
        res.status(400).json({ error: { code: 400, message: 'Project creation failed', details: err.message }});
      } else {
        res.status(201).json(project);
      }
    });
  };

  controllers.getUserProjectStreams = function(req, res, next, json) {
    var options = {};

    if (req.query && req.query.domainid) {
      options.domainid = req.query.domainid;
    }

    if (req.query && req.query.name) {
      var escapedString = escapeStringRegexp(req.query.name);
      options.name = new RegExp(escapedString, 'i');
    }

    lib.getStreamsForUser(req.user._id, options, function(err, streams) {
      if (err) { return next(err); }

      Array.prototype.push.apply(json, streams);
      next();
    });
  };

  controllers.uploadAvatar = function(req, res) {
    var imageModule = dependencies('image');

    if (!req.project) {
      return res.status(404).json({error: 404, message: 'Not found', details: 'Project not found'});
    }

    if (!req.query.mimetype) {
      return res.status(400).json({error: 400, message: 'Parameter missing', details: 'mimetype parameter is required'});
    }

    var mimetype = req.query.mimetype.toLowerCase();
    if (acceptedImageTypes.indexOf(mimetype) < 0) {
      return res.status(400).json({error: 400, message: 'Bad parameter', details: 'mimetype ' + req.query.mimetype + ' is not acceptable'});
    }

    if (!req.query.size) {
      return res.status(400).json({error: 400, message: 'Parameter missing', details: 'size parameter is required'});
    }

    var size = parseInt(req.query.size, 10);
    if (isNaN(size)) {
      return res.status(400).json({error: 400, message: 'Bad parameter', details: 'size parameter should be an integer'});
    }
    var avatarId = new ObjectId();

    function updateProjectAvatar() {
      lib.updateAvatar(req.project, avatarId, function(err, update) {
        if (err) {
          return res.status(500).json({error: 500, message: 'Datastore failure', details: err.message});
        }
        return res.status(200).json({_id: avatarId});
      });
    }

    function avatarRecordResponse(err, storedBytes) {
      if (err) {
        if (err.code === 1) {
          return res.status(500).json({error: 500, message: 'Datastore failure', details: err.message});
        } else if (err.code === 2) {
          return res.status(500).json({error: 500, message: 'Image processing failure', details: err.message});
        } else {
          return res.status(500).json({error: 500, message: 'Internal server error', details: err.message});
        }
      } else if (storedBytes !== size) {
        return res.status(412).json({error: 412, message: 'Image size does not match', details: 'Image size given by user agent is ' + size +
        ' and image size returned by storage system is ' + storedBytes});
      }
      updateProjectAvatar();
    }

    var metadata = {};
    if (req.user) {
      metadata.creator = {objectType: 'user', id: req.user._id};
    }

    return imageModule.recordAvatar(avatarId, mimetype, metadata, req, avatarRecordResponse);
  };

  controllers.getAvatar = function(req, res) {
    var imageModule = dependencies('image');

    if (!req.project) {
      return res.status(404).json({error: 404, message: 'Not found', details: 'Project not found'});
    }

    if (!req.project.avatar) {
      return res.redirect('/project/images/project.png');
    }

    imageModule.getAvatar(req.project.avatar, req.query.format, function(err, fileStoreMeta, readable) {
      if (err) {
        return res.redirect('/project/images/project.png');
      }

      if (!readable) {
        return res.redirect('/project/images/project.png');
      }

      if (req.headers['if-modified-since'] && Number(new Date(req.headers['if-modified-since']).setMilliseconds(0)) === Number(fileStoreMeta.uploadDate.setMilliseconds(0))) {
        return res.send(304);
      } else {
        res.header('Last-Modified', fileStoreMeta.uploadDate);
        res.status(200);
        return readable.pipe(res);
      }
    });
  };

  return controllers;
}

module.exports = projectControllers;
