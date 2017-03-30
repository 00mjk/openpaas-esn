'use strict';

angular.module('esn.user', ['esn.http', 'esn.object-type', 'esn.lodash-wrapper'])
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
      model.__id = function(user) {
        return user._id || user;
      };

      return model;
    });
  })
  .factory('userAPI', function(esnRestangular) {

    function currentUser() {
      return esnRestangular.one('user').get({_: Date.now()});
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
  })
  .constant('USER_AUTO_COMPLETE_TEMPLATE_URL', '/views/modules/auto-complete/user-auto-complete')
  .directive('usersAutocompleteInput', function($q, _, session, $log, domainAPI, userUtils, naturalService, AUTOCOMPLETE_MAX_RESULTS, USER_AUTO_COMPLETE_TEMPLATE_URL) {
    function link(scope) {
      function getAddedUserIds() {
        var addedUsers = scope.mutableUsers.concat(scope.originalUsers || []);
        var addedUserIds = _.map(addedUsers, '_id');

        return addedUserIds;
      }

      function isDuplicateUsers(att, addedUserIds) {
        return (att.preferredEmail in session.user.emailMap) || addedUserIds.indexOf(att._id) > -1;
      }

      function fillNonDuplicateUsers(users) {
        var addedUserIds = getAddedUserIds();

        return users.filter(function(att) {
          return !isDuplicateUsers(att, addedUserIds);
        });
      }

      scope.getUsers = function(query) {
        var memberQuery = {search: query, limit: AUTOCOMPLETE_MAX_RESULTS * 2};

        return domainAPI.getMembers(session.domain._id, memberQuery).then(function(response) {
          response.data.forEach(function(user) {
            user.displayName = userUtils.displayNameOf(user);
          });

          return response.data;
        }, function(error) {
          $log.error('Error while searching users:', error);

          return $q.when([]);
        }).then(function(users) {
          users = users.map(function(user) {
            return angular.extend(user, { templateUrl: USER_AUTO_COMPLETE_TEMPLATE_URL });
          });

          users = fillNonDuplicateUsers(users);

          users.sort(function(a, b) {
            return naturalService.naturalSort(a.displayName, b.displayName);
          });

          return users.slice(0, AUTOCOMPLETE_MAX_RESULTS);
        });
      };
    }

    return {
      restrict: 'E',
      templateUrl: '/views/modules/user/users-autocomplete-input.html',
      link: link,
      scope: {
        originalUsers: '=?',
        mutableUsers: '=',
        onAddingUser: '=?',
        onUserAdded: '=?',
        onUserRemoved: '=?',
        addFromAutocompleteOnly: '=?',
        addOnEnter: '=?'
      }
    };
  });
