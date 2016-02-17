'use strict';

angular.module('esn.user', ['esn.http', 'esn.object-type'])
  .run(function(objectTypeResolver, userAPI, esnRestangular) {
    objectTypeResolver.register('user', userAPI.user);
    esnRestangular.extendModel('users', function(model) {
      model.url = function(user) {
        return '/#/profile/' + user._id || user;
      };
      model.avatarUrl = function(user) {
        return '/api/avatars?objectType=user&email=' + user.emails[0] || user;
      };
      model.displayName = function(user) {
        if (user.firstname && user.lastname) {
          return user.firstname + ' ' + user.lastname;
        }
        return user;
      };
      return model;
    });
  })
  .factory('userAPI', function(esnRestangular) {

    function currentUser() {
      return esnRestangular.one('user').get();
    }

    function user(uuid) {
      return esnRestangular.one('users', uuid).get();
    }

    function getCommunities() {
      return esnRestangular.one('user').all('communities').getList();
    }

    function getActivityStreams(options) {
      options = options || {};
      return esnRestangular.one('user').all('activitystreams').getList(options);
    }

    return {
      currentUser: currentUser,
      user: user,
      getCommunities: getCommunities,
      getActivityStreams: getActivityStreams
    };
  })
  .factory('userUtils', function() {
    function displayNameOf(user) {
      return (user.firstname && user.lastname) ? user.firstname + ' ' + user.lastname : user.preferredEmail;
    }

    return {
      displayNameOf: displayNameOf
    };
  });
