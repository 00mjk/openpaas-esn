'use strict';

angular.module('esn.multi-input', [])
.controller('MultiInputGroupController', function($scope) {
    function _updateTypes() {
      if ($scope.types) {
        $scope.newItem.type = $scope.types[$scope.content.length % $scope.types.length];
      }

    }

    this.acceptNew = function() {
      $scope.content.push($scope.newItem);
      $scope.newItem = {};
      _updateTypes();
    };

    this.initFlags = function() {
      if ($scope.content.length === 0) {
        $scope.showAddButton = false;
        $scope.showNextField = true;
      } else {
        $scope.showAddButton = true;
        $scope.showNextField = false;
      }
    };

    function _acceptRemove($index) {
      $scope.content.splice($index, 1);
      _updateTypes();
    }

    this.acceptRemove = function($index) {
      $scope.content.splice($index, 1);
      _updateTypes();
    };

    var self = this;

    this.createVerifyRemoveFunction = function(valueToCheck) {
      return function($index) {
        var item = $scope.content[$index];
        if (!item[valueToCheck]) {
          _acceptRemove($index);
          self.initFlags();
        }
      };
    };

    this.createVerifyRemoveAddressFunction = function(/* valuesToCheck... */) {
      var args = arguments;
      return function($index) {
        $scope.content.forEach(function(item) {
          if (Array.prototype.every.call(args, function(arg) { return !item[arg]; })) {
            _acceptRemove($index);
            self.initFlags();
          }
        });
      };
    };

    $scope.$watch('content', _updateTypes);

    $scope.content = $scope.content || [];
    $scope.newItem = {};
  })
  .directive('resetableInput', function($timeout) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs, controller) {
        var button = element[0].getElementsByClassName('button-remove');
        element[0].addEventListener('focusin', function(event) {
          $timeout(function() {
            button[0].classList.remove('invisible');
          }, 200);
        });
        element[0].addEventListener('focusout', function(event) {
          $timeout(function() {
            button[0].classList.add('invisible');
          }, 200);
        });
      }
    };
  })
  .directive('multiInputGroup', function($timeout) {
    return {
      restrict: 'E',
      scope: {
        content: '=multiInputModel',
        types: '=multiInputTypes',
        inputType: '@multiInputTexttype',
        placeholder: '@multiInputPlaceholder',
        autocapitalize: '@multiInputAutocapitalize'
      },
      templateUrl: '/views/modules/multi-input/multi-input-group.html',
      controller: 'MultiInputGroupController',
      link: function(scope, element, attrs, controller) {
        scope.autocapitalize = scope.autocapitalize || 'on';

        scope.verifyNew = function() {
          if (scope.newItem.value) {
            scope.showAddButton = true;
            controller.acceptNew();
            controller.initFlags();
            $timeout(function() {
              element.find('.multi-input-content input').last().focus();
            }, 0, false);
          } else {
            scope.showAddButton = false;
          }
        };
        scope.addField = function() {
          scope.showAddButton = false;
          scope.showNextField = true;
          $timeout(function() {
            var newInput = element[0].getElementsByClassName('input-next')[0];
            newInput.focus();
          }, 0);
        };

        scope.$watch('content', function() {
          controller.initFlags();
        });

        scope.verifyRemove = controller.createVerifyRemoveFunction('value');

        scope.deleteField = function(index) {
          controller.acceptRemove(index);
          controller.initFlags();
        };

        scope.hideNextField = function() {
          scope.newItem.value = '';
          scope.showNextField = false;
          scope.showAddButton = true;
        };

        scope.isMultiTypeField = function() {
          return !!(scope.types && scope.types.length > 0);
        };
      }
    };
  })
  .directive('multiInputGroupAddress', function($timeout) {
    return {
      restrict: 'E',
      scope: {
        content: '=multiInputModel',
        types: '=multiInputTypes',
        inputType: '@multiInputTexttype',
        placeholder: '@multiInputPlaceholder'
      },
      templateUrl: '/views/modules/multi-input/multi-input-group-address.html',
      controller: 'MultiInputGroupController',
      link: function(scope, element, attrs, controller) {
        function isAddressFilled() {
          if (scope.newItem.zip || scope.newItem.street || scope.newItem.city || scope.newItem.country) {
            return true;
          }
          return false;
        }
        scope.verifyNew = function() {
          if (isAddressFilled()) {
            scope.showAddButton = true;
          } else {
            scope.showAddButton = false;
          }
        };
        scope.acceptNew = function(field) {
          if (isAddressFilled()) {
            controller.acceptNew();
            controller.initFlags();
            if (field) {
              var fieldToFocus = 'input-last-' + field;
              $timeout(function() {
                var lastInput = element[0].getElementsByClassName(fieldToFocus)[0];
                lastInput.focus();
              }, 200);
            }
          }
        };
        scope.addField = function() {
          scope.showAddButton = false;
          scope.showNextField = true;
          $timeout(function() {
            var newInput = element[0].getElementsByClassName('input-next')[0];
            newInput.focus();
          }, 0);
        };

        scope.$watch('content', function() {
          controller.initFlags();
        });
        scope.verifyRemove = controller.createVerifyRemoveAddressFunction('street', 'zip', 'country', 'city');
        scope.deleteAddress = function(index) {
          controller.acceptRemove(index);
          controller.initFlags();
        };
      }
    };
  });
