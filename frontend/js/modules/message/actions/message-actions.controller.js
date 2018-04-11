(function() {
  'use strict';

  angular.module('esn.message').controller('messageActionsController', messageActionsController);

  function messageActionsController(
    $log,
    $scope,
    messageAPI,
    messageHelpers,
    notificationFactory,
    session
  ) {
    var self = this;

    self.remove = remove;
    self.$onInit = $onInit;

    function $onInit() {
      self.canRemove = messageHelpers.isMessageCreator(session.user, self.message);
      self.canUpdate = true;
      self.canShare = true;
    }

    function remove() {
      messageAPI.remove(self.message._id, {objectType: 'activity_stream', id: self.activitystream.activity_stream.uuid})
        .then(function() {
          notificationFactory.weakInfo('Success', 'The mesage has been removed');
          $scope.$emit('message:removed', { message: self.message, activitystream: self.activitystream });
        })
        .catch(function(err) {
          $log.error(err);
          notificationFactory.weakError('Error', 'Error while deleting message');
        });
    }
  }

})(angular);
