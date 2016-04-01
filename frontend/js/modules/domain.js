'use strict';

angular.module('esn.domain', ['esn.http', 'ngTagsInput', 'op.dynamicDirective', 'esn.attendee', 'esn.session', 'esn.user'])
  .config(function(dynamicDirectiveServiceProvider) {
    var invitationAppMenu = new dynamicDirectiveServiceProvider.DynamicDirective(true, 'application-menu-invitation', {priority: 10});
    dynamicDirectiveServiceProvider.addInjection('esn-application-menu', invitationAppMenu);

    var invitationControlCenterMenu = new dynamicDirectiveServiceProvider.DynamicDirective(true, 'controlcenter-menu-invitation', {priority: -8});
    dynamicDirectiveServiceProvider.addInjection('controlcenter-sidebar-menu', invitationControlCenterMenu);
  })
  .factory('domainAPI', function(esnRestangular) {

    /**
     * Get the list of members of a domain.
     *
     * @param {String} id
     * @param {Hash} options - Hash with limit (int), offset (int) and search (string)
     */
    function getMembers(id, options) {
      return esnRestangular.one('domains', id).getList('members', options);
    }

    /**
     * Invite users to join a domain
     *
     * @param {String} id
     * @param {Array} emails - Array of emails (string)
     */
    function inviteUsers(id, emails) {
      return esnRestangular.one('domains', id).customPOST(emails, 'invitations');
    }

    /**
    * Check if the current user is the manager of the domain.
    * returns HTTP 200 if OK, HTTP 403 if not manager.
    *
    * @param {String} id - The domain id
    */
    function isManager(id) {
      return esnRestangular.one('domains', id).one('manager').get();
    }

    /**
    * retrieve a domain basic informations
    * returns HTTP 200 if OK, HTTP 403 if not manager.
    *
    * @param {String} id - The domain id
    */
    function get(id) {
      return esnRestangular.one('domains', id).get();
    }

    return {
      getMembers: getMembers,
      inviteUsers: inviteUsers,
      isManager: isManager,
      get: get
    };
  })

  .directive('applicationMenuInvitation', function(session, applicationMenuTemplateBuilder) {
    return {
      retrict: 'E',
      replace: true,
      template: applicationMenuTemplateBuilder('/#/domains/{{::domain._id}}/members/invite', 'mdi-account-plus', 'Invitation', 'core.applications-menu.invitation'),
      link: function(scope) {
        scope.domain = session.domain;
      }
    };
  })

  .directive('controlcenterMenuInvitation', function(session, controlCenterMenuTemplateBuilder) {
    return {
      retrict: 'E',
      template: controlCenterMenuTemplateBuilder('/#/domains/{{::domain._id}}/members/invite', 'mdi-account-plus', 'Invitation'),
      link: function(scope) {
        scope.domain = session.domain;
      }
    };
  })

  .directive('inviteMembersInput', function(domainAPI) {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        domain: '=',
        validateEmail: '='
      },
      templateUrl: '/views/modules/domain/inviteMembersInput.html',
      link: function($scope) {
        $scope.error = undefined;
        $scope.placeholder = 'Add an email';
        $scope.displayProperty = 'email';
        // Regular expression to check that the input text is a valid email
        // regexp as string, single \ are \\ escaped, doubles \ are \\\ escaped
        // original regexp is
        // var regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        $scope.pattern = '^(([^<>()[\\\]\\\\\.,;:\\\s@\\\"]+(\\\.[^<>()[\\\]\\\\\.,;:\\\s@\\\"]+)*)|(\\\".+\\\"))@((\\\[[0-9]{1,3}\\\.[0-9]{1,3}\\\.[0-9]{1,3}\\\.[0-9]{1,3}\\\])|(([a-zA-Z\-0-9]+\\\.)+[a-zA-Z]{2,}))$'; // jshint ignore:line
        $scope.step = 0;
        $scope.running = 0;
        $scope.emails = [];

        $scope.validateTags = function() {
          $scope.error = undefined;
          if (!$scope.validateEmail) {
            return;
          }
          $scope.emails.forEach(function(tag) {
            var validationError = $scope.validateEmail(tag.email);
            if (validationError) {
              $scope.error = $scope.error ? $scope.error + validationError : validationError;
            }
          });
        };

        $scope.invite = function() {
          if ($scope.emails.length === 0) {
            return;
          }

          var emails = $scope.emails.map(function(element) {
            return element.email;
          });

          $scope.running = 1;
          domainAPI.inviteUsers($scope.domain._id, emails).then(
              function(data) {
                $scope.error = undefined;
                $scope.running = 0;
                $scope.step = 1;
              },
              function(err) {
                $scope.running = 0;
                $scope.error = err;
              }
          );
        };
      }
    };
  })
  .controller('inviteMembers', function($scope, domain) {
    $scope.domain = domain;
  })
  .run(function($q, $log, attendeeService, domainAPI, session, userUtils) {
    var attendeeProvider = {
      searchAttendee: function(query, limit) {
        var memberQuery = {search: query, limit: limit};
        return domainAPI.getMembers(session.domain._id, memberQuery).then(function(response) {
          response.data.forEach(function(user) {
            user.id = user._id;
            user.email = user.preferredEmail;
            user.displayName = userUtils.displayNameOf(user);
          });
          return response.data;
        }, function(error) {
          $log.error('Error while searching users:', error);
          return $q.when([]);
        });
      }
    };
    attendeeService.addProvider(attendeeProvider);
  });
