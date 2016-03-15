'use strict';

angular.module('esn.session', ['esn.user', 'esn.domain'])
.factory('session', function($q) {

  var bootstrapDefer = $q.defer();
  var session = {
    user: {},
    domain: {},
    ready: bootstrapDefer.promise,
    getTwitterAccounts: function() {
      return (session.user.accounts || [])
        .filter(function(account) {
          return account.data && account.data.provider === 'twitter';
        }).map(function(account) {
          return account.data;
        });
    }
  };

  var sessionIsBootstraped = false;
  function checkBootstrap() {
    if (sessionIsBootstraped) {
      return;
    }
    if (session.user._id &&
        session.domain._id) {
      sessionIsBootstraped = true;
      bootstrapDefer.resolve(session);
    }
  }

  function setUser(user) {
    angular.copy(user, session.user);

    var emailMap = session.user.emailMap = Object.create(null);
    session.user.emails.forEach(function(em) {
      emailMap[em] = true;
    });
    checkBootstrap();
  }

  function setDomain(domain) {
    angular.copy(domain, session.domain);
    checkBootstrap();
  }

  session.setUser = setUser;
  session.setDomain = setDomain;

  return session;
})

.controller('currentDomainController', function(session, $scope) {
  $scope.domain = session.domain;
})

.controller('sessionInitESNController', function($scope, sessionFactory) {

  $scope.session = {
    template: '/views/commons/loading.html'
  };

  sessionFactory.fetchUser(function(error) {
    if (error) {
      $scope.session.error = error.data;
      $scope.session.template = '/views/commons/loading-error.html';
    } else {
      $scope.session.template = '/views/esn/partials/application.html';
    }
  });
})

.factory('sessionFactory', function($log, $q, userAPI, domainAPI, session) {

  function onError(error, callback) {
        if (error && error.data) {
          return callback(error.data);
        }
      }

  function fetchUser(callback) {
        userAPI.currentUser().then(function(response) {
          var user = response.data;
          session.setUser(user);
          var domainIds = angular.isArray(user.domains) ?
            user.domains.map(function(domain) {return domain.domain_id;}) :
            [];
          if (!domainIds.length) {
            var error = {
              error: 400,
              message: 'Invalid user',
              details: 'User does not belong to a domain',
              displayLogout: true
            };
            return callback(error);
          }
          fetchDomain(domainIds[0], function(error) {
            if (error) {
              return callback(error);
            }
            callback(null);
          });
        }, function(error) {
          onError(error, callback);
        });
      }

  function fetchDomain(domainId, callback) {
        domainAPI.get(domainId).then(function(response) {
          session.setDomain(response.data);
          return callback(null);
        }, function(error) {
          onError(error, callback);
        });
      }

  return {
        fetchUser: fetchUser
      };
});
