'use strict';

angular.module('esn.ui', [
    'op.dynamicDirective',
    'mgcrea.ngStrap.modal',
    'esn.autolinker-wrapper'
  ])

  .constant('DEFAULT_COLOR_CLASS', 'accent')
  .constant('FAB_ICONS', {
    default: 'mdi mdi-plus',
    create: 'mdi mdi-plus',
    pen: 'mdi mdi-pencil',
    'new-user': 'mdi mdi-account-plus',
    next: 'mdi mdi-arrow-right',
    up: 'mdi mdi-arrow-up'
  })

  .directive('fab', function(FAB_ICONS, DEFAULT_COLOR_CLASS) {
    return {
      restrict: 'E',
      replace: true,
      scope: true,
      templateUrl: '/views/modules/ui/fab.html',
      link: function($scope, element, attrs) {
        $scope.options = {
          fabIcon: FAB_ICONS[attrs.icon] || FAB_ICONS.default,
          color: attrs.color || DEFAULT_COLOR_CLASS,
          type: attrs.type || 'button'
        };
      }
    };
  })

  .directive('fabScrollTop', function($window, elementScrollService) {
    return {
      restrict: 'E',
      template: '<fab class="no-animation" icon="up" scroll-listener data-on-scroll-down="hide()" data-on-scroll-top="hide()" data-on-scroll-up="show()" />',
      link: function(scope, element) {

        function _scrollIsTwiceScreenHeight() {
          return ($window.innerHeight * 2) < $window.scrollY;
        }

        scope.hide = function() {
          element.addClass('hidden');
        };

        scope.show = function() {
          if (_scrollIsTwiceScreenHeight()) {
            element.removeClass('hidden');
          }
        };

        scope.hide();

        element.click(function(event) {
          event.stopPropagation();
          event.preventDefault();

          elementScrollService.scrollToTop();
          scope.hide();
        });

      }
    };
  })

  .directive('dynamicFabDropup', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/modules/ui/dynamic-fab-dropup.html',
      scope: {
        anchor: '@'
      },
      link: function($scope, element) {

        function getModal() {
          return element.find('.fab-modal-dropup');
        }

        $scope.hide = function() {
          var modalElement = getModal();
          if (!modalElement) {
            return;
          }

          modalElement.removeClass('active');
        };

        $scope.onClick = function() {
          var modalElement = getModal();
          if (!modalElement) {
            return;
          }
          modalElement.toggleClass('active');
        };
      }
    };
  })

  .directive('autoSizeDynamic', function(autosize) {
    return {
      restrict: 'A',
      scope: {
        autoSizeDynamic: '&'
      },
      link: function(scope, element) {
        if (scope.autoSizeDynamic()) {
          autosize(element);
        }
      }
    };
  })

  .directive('esnStringToDom', function($compile) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        scope.$watch(attrs.esnStringToDom, function(value) {
          element.html(value);
          $compile(element.contents())(scope);
        });
      }
    };
  })

  .factory('createHtmlElement', function() {
    return function(tag, attributes) {
      var element = document.createElement(tag);

      angular.forEach(attributes, function(value, key) {
        element.setAttribute(key, value);
      });

      return element;
    };
  })

  .filter('autolink', function(autolinker) {
    return function(input) {
      if (!input) {
        return input;
      }

      return autolinker.link(input, {
        className: 'autolink',

        replaceFn: function(autolinker, match) {
          var href = match.getAnchorHref();
          var text = match.getAnchorText();

          if (match.getType() === 'email') {
            return '<a op-inbox-compose ng-href="' + href + '" class="autolink">' + text + '</a>';
          }
        }
      });
    };
  })

  .factory('listenToPrefixedWindowMessage', function($window) {
    function isMessagePrefixed(message, prefix) {
      return prefix === message.substr(0, prefix.length);
    }

    return function(prefix, callback) {
      function handler(event) {
        var message = String(event.data);

        if (isMessagePrefixed(message, prefix)) {
          event.stopPropagation();

          callback(message.substring(prefix.length));
        }
      }

      $window.addEventListener('message', handler, false);

      return function() {
        $window.removeEventListener('message', handler, false);
      };
    };
  })

  .directive('esnModalLauncher', function($modal) {
    function link(scope, element, attrs) {
      var templateUrl = attrs.esnModalLauncher;
      var options = ['animation', 'backdropAnimation', 'placement', 'backdrop', 'container', 'controller', 'controllerAs'];
      var modalOptions = {
        templateUrl: templateUrl,
        placement: 'center',
        scope: scope
      };

      options.forEach(function(option) {
        if (attrs.hasOwnProperty(option)) {
          modalOptions[option] = attrs[option];
        }
      });

      element.click(function(event) {
        event.stopPropagation();
        $modal(modalOptions);
      });
    }

    return {
      restrict: 'A',
      link: link
    };
  });
