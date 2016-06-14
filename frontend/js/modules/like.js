'use strict';

angular.module('esn.like', [
  'esn.resource-link'
])
  .constant('LIKE_LINK_TYPE', 'like')
  .directive('likeButton', function($log, ResourceLinkAPI, session, LIKE_LINK_TYPE) {

    return {
      restrict: 'E',
      scope: {
        liked: '=',
        targetId: '=',
        targetObjectType: '=',
        onLiked: '&'
      },
      templateUrl: '/views/modules/like/like-button.html',
      link: function(scope) {

        scope.like = function() {
          if (scope.liked) {
            return;
          }

          var source = {
            objectType: 'user',
            id: session.user._id
          };
          var target = {
            objectType: scope.targetObjectType,
            id: scope.targetId
          };

          ResourceLinkAPI.create(source, target, LIKE_LINK_TYPE).then(function() {
            scope.liked = true;
            scope.onLiked();
          }, function(err) {
            $log.error('Error while liking resource', err);
          });
        };
      }
    };
  });
