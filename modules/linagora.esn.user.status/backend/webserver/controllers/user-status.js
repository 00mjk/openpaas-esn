'use strict';

const CONSTANTS = require('../../lib/constants');
const Q = require('q');

module.exports = function(dependencies, lib) {

  const logger = dependencies('logger');

  return {
    getUserStatus,
    getUsersStatus
  };

  function denormalize(userId, status) {
    const result = {_id: userId, status: getConnectedStatus(status)};

    if (status && status.last_active) {
      result.last_active = status.last_active;
    }

    return Q(result);
  }

  function getConnectedStatus(status) {
    return !!status && (Date.now() - status.last_active) < CONSTANTS.DISCONNECTED_DELAY ? CONSTANTS.STATUS.CONNECTED : CONSTANTS.STATUS.DISCONNECTED;
  }

  function getUserStatus(req, res) {
    lib.userStatus.getStatus(req.params.id)
    .then(denormalize.bind(null, req.params.id))
    .then(status => {
      res.status(200).json(status);
    }).catch(err => {
      logger.error(`Error while getting user ${req.params.id} status`, err);

      res.status(500).json({
        error: {
          code: 500,
          message: 'Server Error',
          details: `Error while fetching user status for user ${req.params.id}`
        }
      });
    });
  }

  function getUsersStatus(req, res) {
    lib.userStatus.getStatuses(req.body)
    .then(result => Q.all(result.map(userStatus => denormalize(userStatus._id, userStatus))))
    .then(status => {
      res.status(200).json(status);
    }).catch(err => {
      logger.error('Error while getting users status', err);

      res.status(500).json({
        error: {
          code: 500,
          message: 'Server Error',
          details: 'Error while fetching user statuses'
        }
      });
    });
  }
};
