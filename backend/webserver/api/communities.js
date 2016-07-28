'use strict';

var authorize = require('../middleware/authorization');
var requestMW = require('../middleware/request');
var communities = require('../controllers/communities');
var communityMiddleware = require('../middleware/community');
var domainMiddleware = require('../middleware/domain');

module.exports = function(router) {

  /**
   * @swagger
   * /communities:
   *   get:
   *     tags:
   *      - Community
   *     description: Get the communities list for a given domain. The list is ordered by community title.
   *     parameters:
   *       - $ref: "#/parameters/ct_domain_id"
   *       - $ref: "#/parameters/ct_creator"
   *       - $ref: "#/parameters/ct_title_search"
   *       - $ref: "#/parameters/ct_type"
   *     responses:
   *       200:
   *         $ref: "#/responses/ct_communities"
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
  router.get('/communities', authorize.requiresAPILogin, domainMiddleware.loadFromDomainIdParameter, authorize.requiresDomainMember, communities.list);

  /**
   * @swagger
   * /communities:
   *   post:
   *     tags:
   *      - Community
   *     description: |
   *       Create an ESN community in a domain.
   *
   *       The creator of the community is the user which issue the request.
   *     parameters:
   *       - $ref: "#/parameters/ct_title"
   *       - $ref: "#/parameters/ct_description"
   *       - $ref: "#/parameters/ct_domain_ids"
   *       - $ref: "#/parameters/ct_noTitleCheck
   *     responses:
   *       201:
   *         $ref: "#/responses/cm_201"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       403:
   *         $ref: "#/responses/cm_403"
   *       409:
   *         $ref: "#/responses/ct_error_conflict"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.post('/communities', authorize.requiresAPILogin, communities.loadDomainForCreate, authorize.requiresDomainMember, communities.create);

  /**
   * @swagger
   * /communities/{community_id}:
   *   get:
   *     tags:
   *      - Community
   *     description: Get a community.
   *     parameters:
   *       - $ref: "#/parameters/ct_community_id"
   *     responses:
   *       200:
   *         $ref: "#/responses/ct_community"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       403:
   *         $ref: "#/responses/cm_403"
   *       404:
   *         $ref: "#/responses/cm_404"
   */
  router.get('/communities/:id', authorize.requiresAPILogin, communities.load, communities.get);

  /**
   * @swagger
   * /communities/{community_id}:
   *   delete:
   *     tags:
   *       - Community
   *     description: Delete a community.
   *     parameters:
   *       - $ref: "#/parameters/ct_community_id"
   *     responses:
   *       204:
   *         $ref: "#/responses/cm_204"
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
  router.delete('/communities/:id', authorize.requiresAPILogin, communities.load, authorize.requiresCommunityCreator, communities.delete);

  /**
   * @swagger
   * /communities/{community_id}/avatar:
   *   get:
   *     tags:
   *       - Avatar
   *       - Community
   *     description: Get the community avatar.
   *     parameters:
   *       - $ref: "#/parameters/av_if_modified_since"
   *       - $ref: "#/parameters/ct_community_id"
   *       - $ref: "#/parameters/av_format"
   *     responses:
   *       200:
   *         $ref: "#/responses/av_stream"
   *       304:
   *         $ref: "#/responses/cm_304"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       404:
   *         $ref: "#/responses/cm_404"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.get('/communities/:id/avatar', authorize.requiresAPILogin, communities.load, communities.getAvatar);

  /**
   * @swagger
   * /communities/{community_id}/avatar:
   *   post:
   *     tags:
   *       - Avatar
   *       - Community
   *     description: Post a new avatar for the given community.
   *     parameters:
   *       - $ref: "#/parameters/ct_community_id"
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
   *       403:
   *         $ref: "#/responses/cm_403"
   *       404:
   *         $ref: "#/responses/cm_404"
   *       412:
   *         $ref: "#/responses/cm_412"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.post('/communities/:id/avatar', authorize.requiresAPILogin, communities.load, authorize.requiresCommunityCreator, communities.uploadAvatar);

  /**
   * @swagger
   * /communities/{community_id}:
   *   put:
   *     tags:
   *       - Community
   *     description: Update the community.
   *     parameters:
   *       - $ref: "#/parameters/ct_community_id"
   *       - $ref: "#/parameters/cm_com_update"
   *     responses:
   *       200:
   *         $ref: "#/responses/ct_avatar"
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
  router.put('/communities/:id', authorize.requiresAPILogin, communities.load, authorize.requiresCommunityCreator, communities.update);

  /**
   * @swagger
   * /communities/{community_id}/members/{user_id}:
   *   get:
   *     tags:
   *       - Community
   *     description: Check if a user is a member of the community.
   *     parameters:
   *       - $ref: "#/parameters/ct_community_id"
   *       - $ref: "#/parameters/cl_user_id"
   *     responses:
   *       200:
   *         $ref: "#/responses/ct_member"
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
  router.get('/communities/:id/members/:user_id',
    authorize.requiresAPILogin,
    communities.load,
    communityMiddleware.canRead,
    requestMW.castParamToObjectId('user_id'),
    communities.getMember
  );

  /**
   * @swagger
   * /user/communities:
   *   get:
   *     tags:
   *      - User
   *      - Community
   *     description: |
   *       List all of the communities across all of the domains to which the authenticated user belongs.
   *       Check the Community API for more details on communities.
   *     responses:
   *       200:
   *         $ref: "#/responses/ct_communities"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.get('/user/communities', authorize.requiresAPILogin, communities.getMine);
};
