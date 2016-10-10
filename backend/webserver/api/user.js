'use strict';

var authorize = require('../middleware/authorization');
var users = require('../controllers/users');
var usernotifications = require('../controllers/usernotifications');
var usernotificationsAsMiddleware = require('../middleware/usernotifications');
var oauthclients = require('../controllers/oauthclients');

module.exports = function(router) {

  /**
   * @swagger
   * /user:
   *   get:
   *     tags:
   *      - User
   *     description: Get the authenticated user informations.
   *     security:
   *       - openpaas_auth : []
   *     responses:
   *       200:
   *         $ref: "#/responses/us_informations"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       404:
   *         $ref: "#/responses/cm_404"
   */
  router.get('/user', authorize.requiresAPILogin, users.user);

  /**
   * @swagger
   * /user/profile :
   *   get:
   *     tags:
   *      - User
   *      - Profile
   *     description: Get the current user profile.
   *     responses:
   *       200:
   *         $ref: "#/responses/us_profile"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       404:
   *         $ref: "#/responses/cm_404"
   */
  router.get('/user/profile', authorize.requiresAPILogin, users.user);

  /**
   * @swagger
   * /user/profile/{attribute_name} :
   * /api/user/profile/ :
   *   put:
   *     tags:
   *      - User
   *      - Profile
   *     description: Update the current user profile.
   *     parameters:
   *       - name: profile
   *         in: body
   *         schema:
   *           $ref: "#/definitions/Profile"
   *         description: The new profile value attributes
   *         required: true
   *     responses:
   *       200:
   *         $ref: "#/responses/us_update_profile"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       404:
   *         $ref: "#/responses/cm_404"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.put('/user/profile', authorize.requiresAPILogin, users.updateProfile);

  /**
   * @swagger
   * /user/profile/avatar:
   *   post:
   *     tags:
   *       - Avatar
   *       - User
   *     description: |
   *       Post a new avatar for the currently logged in user. The posted avatar is set as the default avatar for the user.
   *
   *       The image should be a square, and at least be 128x128 px.
   *     parameters:
   *       - $ref: "#/parameters/av_mimetype"
   *       - $ref: "#/parameters/av_size"
   *       - $ref: "#/parameters/ct_raw_data"
   *     responses:
   *       200:
   *         $ref: "#/responses/ct_avatar"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       404:
   *         $ref: "#/responses/cm_404"
   *       412:
   *         $ref: "#/responses/cm_412"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.post('/user/profile/avatar', authorize.requiresAPILogin, users.postProfileAvatar);

  /**
   * @swagger
   * /user/profile/avatar:
   *   get:
   *     tags:
   *      - Avatar
   *      - User
   *     description: Get the avatar for the currently logged in user.
   *     parameters:
   *       - $ref: "#/parameters/av_format"
   *       - $ref: "#/parameters/av_if_modified_since"
   *     responses:
   *       200:
   *         $ref: "#/responses/av_stream"
   *       304:
   *         $ref: "#/responses/cm_304"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       404:
   *         $ref: "#/responses/cm_404"
   */
  router.get('/user/profile/avatar', authorize.requiresAPILogin, users.getProfileAvatar);

  /**
   * @swagger
   * /user/oauth/clients:
   *   get:
   *     tags:
   *      - OAuth
   *      - User
   *     description: |
   *       List all of the OAuth clients created by the current user.
   *       Check the OAuth API for more details on OAuth support.
   *     responses:
   *       200:
   *         $ref: "#/responses/us_oauth_clients"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.get('/user/oauth/clients', authorize.requiresAPILogin, oauthclients.created);

  /**
   * @swagger
   * /user/notifications:
   *   get:
   *     tags:
   *      - Notification
   *      - User
   *     description: List all the 'user notifications' for the current user.
   *     parameters:
   *       - $ref: "#/parameters/cl_limit"
   *       - $ref: "#/parameters/cl_offset"
   *       - $ref: "#/parameters/nt_read"
   *     responses:
   *       200:
   *         $ref: "#/responses/nt_notifications_index"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.get('/user/notifications', authorize.requiresAPILogin, usernotifications.list);

  /**
   * @swagger
   * /user/notifications/unread:
   *   get:
   *     tags:
   *      - Notification
   *      - User
   *     description: Return the number of unread user notifications for the current user.
   *     responses:
   *       200:
   *         $ref: "#/responses/us_unread"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.get('/user/notifications/unread', authorize.requiresAPILogin, usernotifications.getUnreadCount);

  /**
   * @swagger
   * /user/notifications/read:
   *   put:
   *     tags:
   *      - Notification
   *      - User
   *     description: Mark the user notification of id inside ids as read or unread.
   *     parameters:
   *       - $ref: "#/parameters/nt_ids"
   *       - $ref: "#/parameters/nt_value"
   *     responses:
   *       205:
   *         $ref: "#/responses/cm_205"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       403:
   *         $ref: "#/responses/cm_403"
   *       404:
   *         $ref: "#/responses/cm_404"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.put('/user/notifications/read', authorize.requiresAPILogin, usernotifications.loadAll, usernotificationsAsMiddleware.userCanReadAllNotifications, usernotifications.setAllRead);

  /**
   * @swagger
   * /user/notifications/{id}/read:
   *   put:
   *     tags:
   *      - Notification
   *      - User
   *     description: Mark the user notification of id :uuid as read or unread.
   *     parameters:
   *       - $ref: "#/parameters/nt_id"
   *       - $ref: "#/parameters/nt_value"
   *     responses:
   *       205:
   *         $ref: "#/responses/cm_205"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       403:
   *         $ref: "#/responses/cm_403"
   *       404:
   *         $ref: "#/responses/cm_404"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.put('/user/notifications/:id/read', authorize.requiresAPILogin, usernotifications.load, usernotificationsAsMiddleware.userCanWriteNotification, usernotifications.setRead);

  /**
   * @swagger
   * /user/notifications/{id}/acknowledged:
   *   put:
   *     tags:
   *      - Notification
   *      - User
   *     description: Mark the user notification of id :uuid as acknowledged or not acknowledged.
   *     parameters:
   *       - $ref: "#/parameters/nt_id"
   *       - $ref: "#/parameters/nt_value"
   *     responses:
   *       205:
   *         $ref: "#/responses/cm_205"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       403:
   *         $ref: "#/responses/cm_403"
   *       404:
   *         $ref: "#/responses/cm_404"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.put('/user/notifications/:id/acknowledged', authorize.requiresAPILogin, usernotifications.load, usernotificationsAsMiddleware.userCanWriteNotification, usernotifications.setAcknowledged);
};
