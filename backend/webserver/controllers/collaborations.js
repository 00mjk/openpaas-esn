'use strict';

var collaborationModule = require('../../core/collaboration/index');
var userDomain = require('../../core/user/domain');
var memberAdapter = require('../../helpers/collaboration').memberAdapter;
var permission = require('../../core/collaboration/permission');
var imageModule = require('../../core/image');
var logger = require('../../core/logger');
var async = require('async');

function transform(collaboration, user, callback) {
  if (!collaboration) {
    return callback({});
  }

  var membershipRequest = collaborationModule.getMembershipRequest(collaboration, user);

  if (typeof collaboration.toObject === 'function') {
    collaboration = collaboration.toObject();
  }

  collaboration.members_count = collaboration.members ? collaboration.members.length : 0;
  if (membershipRequest) {
    collaboration.membershipRequest = membershipRequest.timestamp.creation.getTime();
  }

  var userTuple = {objectType: 'user', id: user._id + ''};

  collaborationModule.isMember(collaboration, userTuple, function(err, membership) {
    if (membership) {
      collaboration.member_status = 'member';
    } else {
      collaborationModule.isIndirectMember(collaboration, userTuple, function(err, indirect) {
        if (indirect) {
          collaboration.member_status = 'indirect';
        } else {
          collaboration.member_status = 'none';
        }
      });
    }

    permission.canWrite(collaboration, userTuple, function(err, writable) {
      collaboration.writable = writable || false;
      delete collaboration.members;
      delete collaboration.membershipRequests;
      return callback(collaboration);
    });
  });
}

module.exports.searchWhereMember = function(req, res) {

  if (!req.query.objectType || !req.query.id) {
    return res.status(400).json({error: {code: 400, message: 'Bad request', details: 'objectType and id query parameters are required'}});
  }

  collaborationModule.getCollaborationsForTuple({objectType: req.query.objectType, id: req.query.id}, function(err, collaborations) {
    if (err) {
      return res.status(500).json({error: {code: 500, message: 'Server error', details: err.message}});
    }

    var tuple = {objectType: 'user', id: req.user._id};
    async.filter(collaborations, function(collaboration, callback) {

      permission.canRead(collaboration, tuple, function(err, canRead) {
        if (err) {
          return callback(false);
        }

        if (canRead) {
          return callback(true);
        }

        collaborationModule.isMember(collaboration, tuple, function(err, member) {
          return callback(err ? false : member);
        });
      });
    }, function(results) {
      async.map(results, function(element, callback) {
        transform(element, req.user, function(transformed) {
          return callback(null, transformed);
        });
      }, function(err, results) {
        if (err) {
          return res.status(500).json({error: {code: 500, message: 'Server error', details: err.message}});
        }
        return res.status(200).json(results);
      });
    });
  });
};

module.exports.getWritable = function(req, res) {
  var user = req.user;

  if (!user) {
    return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'User is missing'}});
  }

  collaborationModule.getCollaborationsForUser(user._id, {writable: true}, function(err, collaborations) {
    if (err) {
      return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.details}});
    }
    async.map(collaborations, function(collaboration, callback) {
      transform(collaboration, req.user, function(transformed) {
        return callback(null, transformed);
      });
    }, function(err, results) {
      return res.status(200).json(results);
    });
  });
};

function getMembers(req, res) {
  if (!req.collaboration) {
    return res.status(500).json({error: {code: 500, message: 'Server error', details: 'Collaboration is mandatory here'}});
  }

  var query = {};
  if (req.query.limit) {
    var limit = parseInt(req.query.limit, 10);
    if (!isNaN(limit)) {
      query.limit = limit;
    }
  }

  if (req.query.offset) {
    var offset = parseInt(req.query.offset, 10);
    if (!isNaN(offset)) {
      query.offset = offset;
    }
  }

  if (req.query.objectTypeFilter) {
    query.objectTypeFilter = req.query.objectTypeFilter;
  }

  collaborationModule.getMembers(req.collaboration, req.params.objectType, query, function(err, members) {
    if (err) {
      return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.message}});
    }

    res.header('X-ESN-Items-Count', members.total_count || 0);

    function format(member) {
      var result = Object.create(null);
      if (!member || !member.member) {
        return null;
      }

      result.objectType = member.objectType;
      result.id = member.id;

      var Adapter = memberAdapter(member.objectType);
      if (Adapter) {
        result[member.objectType] = new Adapter(member.member || member);
      } else {
        result[member.objectType] = member.member || member;
      }

      result.metadata = {
        timestamps: member.timestamps
      };

      return result;
    }

    var result = members.map(function(member) {
      return format(member);
    }).filter(function(member) {
      return member !== null;
    });

    return res.status(200).json(result || []);
  });
}
module.exports.getMembers = getMembers;

function getInvitablePeople(req, res) {
  var collaboration = req.collaboration;
  var user = req.user;

  if (!user) {
    return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'You must be logged in to access this resource'}});
  }

  if (!collaboration) {
    return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'Collaboration is missing'}});
  }

  var query = {
    limit: req.query.limit || 5,
    search: req.query.search || null,
    not_in_collaboration: collaboration
  };

  var domainIds = collaboration.domain_ids.map(function(domainId) {
    return domainId;
  });

  var search = query.search ? userDomain.getUsersSearch : userDomain.getUsersList;
  search(domainIds, query, function(err, result) {
    if (err) {
      return res.status(500).json({ error: { status: 500, message: 'Server error', details: 'Error while searching invitable people: ' + err.message}});
    }

    res.header('X-ESN-Items-Count', result.total_count);
    return res.status(200).json(result.list);
  });
}
module.exports.getInvitablePeople = getInvitablePeople;

function ensureLoginCollaborationAndUserId(req, res) {
  var collaboration = req.collaboration;
  var user = req.user;

  if (!user) {
    res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'You must be logged in to access this resource'}});
    return false;
  }

  if (!req.params || !req.params.user_id) {
    res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'The user_id parameter is missing'}});
    return false;
  }

  if (!collaboration) {
    res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'Community is missing'}});
    return false;
  }
  return true;
}
module.exports.ensureLoginCollaborationAndUserId = ensureLoginCollaborationAndUserId;

function addMembershipRequest(req, res) {
  if (!ensureLoginCollaborationAndUserId(req, res)) {
    return;
  }
  var collaboration = req.collaboration;
  var userAuthor = req.user;
  var userTargetId = req.params.user_id;
  var objectType = req.params.objectType;

  var member = collaboration.members.filter(function(m) {
    return m.member.objectType === 'user' && m.member.id.equals(userTargetId);
  });

  if (member.length) {
    return res.status(400).json({error: {code: 400, message: 'Bad request', details: 'User is already member'}});
  }

  function addMembership(objectType, collaboration, userAuthor, userTarget, workflow, actor) {
    collaborationModule.addMembershipRequest(objectType, collaboration, userAuthor, userTarget, workflow, actor, function(err, collaboration) {
      if (err) {
        return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.message}});
      }
      return transform(collaboration, userAuthor, function(transformed) {
        return res.status(200).json(transformed);
      });
    });
  }

  if (req.isCollaborationManager) {
    addMembership(objectType, collaboration, userAuthor, userTargetId, collaborationModule.MEMBERSHIP_TYPE_INVITATION, 'manager');
  } else {
    addMembership(objectType, collaboration, userAuthor, userTargetId, collaborationModule.MEMBERSHIP_TYPE_REQUEST, 'user');
  }
}
module.exports.addMembershipRequest = addMembershipRequest;

function getMembershipRequests(req, res) {
  var collaboration = req.collaboration;

  if (!collaboration) {
    return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'Collaboration is missing'}});
  }

  if (!req.isCollaborationManager) {
    return res.status(403).json({error: {code: 403, message: 'Forbidden', details: 'Only collaboration managers can get requests'}});
  }

  var query = {};
  if (req.query.limit) {
    var limit = parseInt(req.query.limit, 10);
    if (!isNaN(limit)) {
      query.limit = limit;
    }
  }

  if (req.query.offset) {
    var offset = parseInt(req.query.offset, 10);
    if (!isNaN(offset)) {
      query.offset = offset;
    }
  }

  collaborationModule.getMembershipRequests(req.params.objectType, collaboration, query, function(err, membershipRequests) {
    if (err) {
      return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.details}});
    }
    res.header('X-ESN-Items-Count', req.collaboration.membershipRequests ? req.collaboration.membershipRequests.length : 0);
    var result = membershipRequests.map(function(request) {
      var result = collaborationModule.userToMember({member: request.user, timestamp: request.timestamp});
      result.workflow = request.workflow;
      result.timestamp = request.timestamp;
      return result;
    });
    return res.status(200).json(result || []);
  });
}
module.exports.getMembershipRequests = getMembershipRequests;

function join(req, res) {
  if (!ensureLoginCollaborationAndUserId(req, res)) {
    return;
  }

  var collaboration = req.collaboration;
  var user = req.user;
  var targetUserId = req.params.user_id;

  if (req.isCollaborationManager) {

    if (user._id.equals(targetUserId)) {
      return res.status(400).json({error: {code: 400, message: 'Bad request', details: 'Community Manager can not add himself to a collaboration'}});
    }

    if (!req.query.withoutInvite && !collaborationModule.getMembershipRequest(collaboration, {_id: targetUserId})) {
      return res.status(400).json({error: {code: 400, message: 'Bad request', details: 'User did not request to join collaboration'}});
    }

    collaborationModule.join(req.params.objectType, collaboration, user, targetUserId, 'manager', function(err) {
      if (err) {
        return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.details}});
      }

      collaborationModule.cleanMembershipRequest(collaboration, targetUserId, function(err) {
        if (err) {
          return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.details}});
        }
        return res.status(204).end();
      });
    });

  } else {

    if (!user._id.equals(targetUserId)) {
      return res.status(400).json({error: {code: 400, message: 'Bad request', details: 'Current user is not the target user'}});
    }

    if (req.collaboration.type !== collaborationModule.CONSTANTS.COLLABORATION_TYPES.OPEN) {
      var membershipRequest = collaborationModule.getMembershipRequest(collaboration, user);
      if (!membershipRequest) {
        return res.status(400).json({error: {code: 400, message: 'Bad request', details: 'User was not invited to join collaboration'}});
      }

      collaborationModule.join(req.params.objectType, collaboration, user, user, null, function(err) {
        if (err) {
          return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.details}});
        }

        collaborationModule.cleanMembershipRequest(collaboration, user, function(err) {
          if (err) {
            return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.details}});
          }
          return res.status(204).end();
        });
      });
    } else {
      collaborationModule.join(req.params.objectType, collaboration, user, targetUserId, 'user', function(err) {
        if (err) {
          return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.details}});
        }

        collaborationModule.cleanMembershipRequest(collaboration, user, function(err) {
          if (err) {
            return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.details}});
          }
          return res.status(204).end();
        });
      });
    }
  }
}
module.exports.join = join;

function leave(req, res) {
  if (!ensureLoginCollaborationAndUserId(req, res)) {
    return;
  }
  var collaboration = req.collaboration;
  var user = req.user;
  var targetUserId = req.params.user_id;

  collaborationModule.leave(req.params.objectType, collaboration, user, targetUserId, function(err) {
    if (err) {
      return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.details}});
    }
    return res.status(204).end();
  });
}
module.exports.leave = leave;

function removeMembershipRequest(req, res) {
  if (!ensureLoginCollaborationAndUserId(req, res)) {
    return;
  }
  if (!req.isCollaborationManager && !req.user._id.equals(req.params.user_id)) {
    return res.status(403).json({error: {code: 403, message: 'Forbidden', details: 'Current user is not the target user'}});
  }

  if (!req.collaboration.membershipRequests || !('filter' in req.collaboration.membershipRequests)) {
    return res.status(204).end();
  }

  var memberships = req.collaboration.membershipRequests.filter(function(mr) {
    return mr.user.equals(req.params.user_id);
  });

  if (!memberships.length) {
    return res.status(204).end();
  }
  var membership = memberships[0];

  function onResponse(err, resp) {
    if (err) {
      return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.message}});
    }
    res.status(204).end();
  }

  /*
   *      workflow   |   isCommunityManager   |  What does it mean ?
   *      -----------------------------------------------------------
   *      INVITATION |           yes          | manager cancel the invitation of the user
   *      INVITATION |            no          | attendee declines the invitation
   *      REQUEST    |           yes          | manager refuses the user's request to enter the community
   *      REQUEST    |            no          | user cancels her request to enter the commity
   */

  if (req.isCollaborationManager) {
    if (membership.workflow === collaborationModule.MEMBERSHIP_TYPE_INVITATION) {
      collaborationModule.cancelMembershipInvitation(req.params.objectType, req.collaboration, membership, req.user, onResponse);
    } else {
      collaborationModule.refuseMembershipRequest(req.params.objectType, req.collaboration, membership, req.user, onResponse);
    }
  } else {
    if (membership.workflow === collaborationModule.MEMBERSHIP_TYPE_INVITATION) {
      collaborationModule.declineMembershipInvitation(req.params.objectType, req.collaboration, membership, req.user, onResponse);
    } else {
      collaborationModule.cancelMembershipRequest(req.params.objectType, req.collaboration, membership, req.user, onResponse);
    }
  }
}
module.exports.removeMembershipRequest = removeMembershipRequest;

function getMember(req, res) {
  var collaboration = req.collaboration;

  if (!collaboration) {
    return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'Collaboration is missing'}});
  }

  collaborationModule.isMember(collaboration, {objectType: 'user', id: req.params.user_id}, function(err, result) {
    if (err) {
      return res.status(500).json({error: {code: 500, message: 'Server Error', details: err.message}});
    }

    if (result) {
      return res.status(200).end();
    }
    return res.status(404).end();
  });
}
module.exports.getMember = getMember;

function getAvatar(req, res) {
  if (!req.collaboration) {
    return res.status(404).json({error: 404, message: 'Not found', details: 'Community not found'});
  }

  if (!req.collaboration.avatar) {
    return res.redirect('/images/collaboration.png');
  }

  imageModule.getAvatar(req.collaboration.avatar, req.query.format, function(err, fileStoreMeta, readable) {
    if (err) {
      logger.warn('Can not get collaboration avatar : %s', err.message);
      return res.redirect('/images/collaboration.png');
    }

    if (!readable) {
      logger.warn('Can not retrieve avatar stream for collaboration %s', req.collaboration._id);
      return res.redirect('/images/collaboration.png');
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
module.exports.getAvatar = getAvatar;
