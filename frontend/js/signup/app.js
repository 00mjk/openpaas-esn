'use strict';

var angularInjections = angularInjections || [];

angular.module('signupApp', [
  'esn.invitation',
  'esn.http',
  'ngRoute'
  ].concat(angularInjections))
  .config(function($routeProvider) {

    $routeProvider.when('/', {
      templateUrl: '/views/signup/partials/create',
      controller: 'signup'
    });

    $routeProvider.when('/:id', {
      templateUrl: '/views/modules/invitation/finalize',
      controller: 'finalize',
      resolve: {
        invitation: function(invitationAPI, $route) {
          return invitationAPI.get($route.current.params.id).then(
            function(data) {
              return {
                status: 'success',
                data: data
              };
            },
            function(err) {
              return {
                status: 'error',
                error: err
              };
            }
          );
        }
      }
    });
  });
