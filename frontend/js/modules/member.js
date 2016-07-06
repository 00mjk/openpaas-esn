'use strict';

angular.module('esn.member', ['esn.router', 'esn.domain', 'esn.search', 'esn.infinite-list', 'openpaas-logo', 'esn.provider'])
  .run(function(searchProviders, memberSearchProvider) {
    searchProviders.add(memberSearchProvider);
  })
  .config(function(dynamicDirectiveServiceProvider) {
    var memberAppMenu = new dynamicDirectiveServiceProvider.DynamicDirective(true, 'application-menu-member', {priority: 15});
    dynamicDirectiveServiceProvider.addInjection('esn-application-menu', memberAppMenu);

    var memberControlCenterMenu = new dynamicDirectiveServiceProvider.DynamicDirective(true, 'controlcenter-menu-member', {priority: -6});
    dynamicDirectiveServiceProvider.addInjection('controlcenter-sidebar-menu', memberControlCenterMenu);
  })
  .constant('memberSearchConfiguration', {
    searchLimit: 20
  })
  .directive('memberDisplay', function() {
    return {
      restrict: 'E',
      scope: {
        member: '=member'
      },
      templateUrl: '/views/modules/member/member.html'
    };
  }).controller('memberscontroller', function($scope, domainAPI, $stateParams, memberSearchConfiguration, usSpinnerService) {

    var domain_id = $stateParams.domain_id;
    $scope.spinnerKey = 'memberSpinner';
    var opts = {
      offset: 0,
      limit: memberSearchConfiguration.searchLimit,
      search: ''
    };

    $scope.search = {
      running: false
    };
    $scope.members = [];
    $scope.restActive = false;
    $scope.error = false;

    var formatResultsCount = function(count) {
      $scope.search.count = count;

      if (count < 1000) {
        $scope.search.formattedCount = count;
      } else {
        var len = Math.ceil(Math.log(count + 1) / Math.LN10);
        var num = Math.round(count * Math.pow(10, -(len - 3))) * Math.pow(10, len - 3);

        $scope.search.formattedCount = num.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
      }
    };

    var updateMembersList = function() {
      $scope.error = false;
      if ($scope.restActive) {
        return;
      } else {
        $scope.restActive = true;
        $scope.search.running = true;
        formatResultsCount(0);
        usSpinnerService.spin('memberSpinner');

        domainAPI.getMembers(domain_id, opts).then(function(data) {
          formatResultsCount(parseInt(data.headers('X-ESN-Items-Count'), 10));
          $scope.members = $scope.members.concat(data.data);
        }, function() {
          $scope.error = true;
        }).finally(function() {
          $scope.search.running = false;
          $scope.restActive = false;
          usSpinnerService.stop('memberSpinner');
        });
      }
    };

    $scope.init = function() {
      //initializes the view with a list of users of the domain
      updateMembersList();
    };

    $scope.doSearch = function() {
      $scope.members = [];
      opts.offset = 0;
      opts.search = $scope.searchInput;
      updateMembersList();
    };

    $scope.loadMoreElements = function() {
      if ($scope.members.length === 0 || $scope.members.length < $scope.search.count) {
        opts.offset = $scope.members.length;
        updateMembersList();
      }
    };
  })
  .directive('applicationMenuMember', function(session, applicationMenuTemplateBuilder) {
    return {
      retrict: 'E',
      replace: true,
      template: applicationMenuTemplateBuilder('/#/controlcenter/domains/{{::domain._id}}/members', 'mdi-account-multiple-outline', 'Members', 'core.applications-menu.members'),
      link: function(scope) {
        scope.domain = session.domain;
      }
    };
  })
  .directive('controlcenterMenuMember', function(session, controlCenterMenuTemplateBuilder) {
    return {
      restrict: 'E',
      template: controlCenterMenuTemplateBuilder('controlcenter.domainMembers({ domain_id: domain._id })', 'mdi-account-multiple-outline', 'Members'),
      link: function(scope) {
        scope.domain = session.domain;
      }
    };
  })
  .factory('memberSearchProvider', function($q, newProvider, domainAPI, session, ELEMENTS_PER_REQUEST) {

    var name = 'Members';

    return newProvider({
      name: name,
      fetch: function(query) {
        var offset = 0;

        return function() {
          return domainAPI.getMembers(session.domain._id, {
            search: query,
            offset: offset,
            limit: ELEMENTS_PER_REQUEST
          }).then(function(members) {
            offset += members.data.length;
            return members.data.map(function(member) {
              member.type = name;
              return member;
            });
          });
        };
      },
      buildFetchContext: function(options) {
        return $q.when(options.query);
      },
      templateUrl: '/views/modules/member/member-search-item.html'
    });
  });

