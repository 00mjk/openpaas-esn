(function() {
  'use strict';

  angular.module('esn.collaboration')
    .directive('esnCollaborationJoinUserNotification', esnCollaborationJoinUserNotification);

    function esnCollaborationJoinUserNotification(
      $log,
      $q,
      esnUserNotificationService,
      objectTypeResolver
    ) {
      return {
        controller: controller,
        restrict: 'E',
        replace: true,
        scope: {
          notification: '='
        },
        templateUrl: '/views/modules/collaboration/user-notifications/collaboration-join.html'
      };

      function controller($scope) {
        var userResolver = objectTypeResolver.resolve($scope.notification.subject.objectType, $scope.notification.subject.id);
        var collaborationResolver = objectTypeResolver.resolve($scope.notification.complement.objectType, $scope.notification.complement.id);

        $scope.error = false;

        $q.all({user: userResolver, collaboration: collaborationResolver}).then(function(result) {
          $scope.joiner = result.user.data;
          $scope.collaborationJoined = result.collaboration.data;
          $scope.collaborationJoined.objectType = $scope.notification.complement.objectType;
          $scope.collaborationPath = $scope.notification.complement.objectType === 'community' ? 'communities' : 'projects';
          esnUserNotificationService.setAcknowledged($scope.notification._id, true).then(
            function() {
              $scope.notification.acknowledged = true;
            },
            function(error) {
              $scope.error = error;
            }
          );
        }, function(err) {
          $log.error(err);
          $scope.error = true;
        }).finally(function() {
          $scope.loading = false;
        });
      }
    }
})();
