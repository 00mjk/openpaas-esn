'use strict';

/* global chai: false */
/* global sinon: false */

var expect = chai.expect;

describe('The esn.form.helper Angular module', function() {

  beforeEach(function() {
    module('jadeTemplates');
    module('esn.form.helper');
  });

  describe('passwordMatch directive', function() {
    var html = '<form name="form"><input type="password" name="password1" password-match="settings.password2" ng-model="settings.password1">' +
        '<input type="password" name="password2" ng-model="settings.password2"></form>';
    beforeEach(inject(['$compile', '$rootScope', function($c, $r) {
      this.$compile = $c;
      this.$rootScope = $r;
    }]));

    it('should set unique to true when the password does not match', function() {
      var element = this.$compile(html)(this.$rootScope);
      var scope = element.scope();
      scope.settings = {
        password1: 'test',
        password2: 'test2'
      };
      this.$rootScope.$digest();
      expect(scope.form.$invalid).to.be.true;
      expect(scope.form.password1.$error.unique).to.be.true;
    });

    it('should set unique to false when the password does not match', function() {
      var element = this.$compile(html)(this.$rootScope);
      var scope = element.scope();
      scope.settings = {
        password1: 'test',
        password2: 'test'
      };
      this.$rootScope.$digest();
      expect(scope.form.$invalid).to.be.false;
      expect(scope.form.password1.$error.unique).to.be.undefined;
    });
  });

  describe('esnTrackFirstBlur directive', function() {
    var html = '<form name="form"><input type="text" name="test" ng-model="test" esn-track-first-blur></form>';
    beforeEach(inject(['$compile', '$rootScope', function($c, $r) {
      this.$compile = $c;
      this.$rootScope = $r;
    }]));

    it('should not set _blur in the model controller when started', function() {
      var element = this.$compile(html)(this.$rootScope);
      var scope = element.scope();
      this.$rootScope.$digest();
      expect(scope.form.test._blur).to.be.undefined;
    });

    it('should not set _blur in the model controller when element is focused', function() {
      var element = this.$compile(html)(this.$rootScope);
      var scope = element.scope();
      var input = element.find('input');
      this.$rootScope.$digest();
      input.focus();
      this.$rootScope.$digest();
      expect(scope.form.test._blur).to.be.undefined;
    });

    it('should set _blur in the model controller when element is blured', function() {
      var element = this.$compile(html)(this.$rootScope);
      var scope = element.scope();
      var input = element.find('input');
      this.$rootScope.$digest();
      input.focus();
      this.$rootScope.$digest();
      input.blur();
      this.$rootScope.$digest();
      expect(scope.form.test._blur).to.be.tr;
    });

  });

  describe('toggleSwitch directive', function() {

    beforeEach(inject(function($compile, $rootScope) {
      this.$compile = $compile;
      this.$rootScope = $rootScope;
      this.$scope = this.$rootScope.$new();

      this.initDirective = function(html) {
        html = html || '<toggle-switch></toggle-switch>';
        this.element = this.$compile(html)(this.$scope);
        this.$scope.$digest();
        this.isolateScope = this.element.isolateScope();
      };
    }));

    it('should set ngModel to false if the attribute "ng-model" is undefined', function() {
      this.initDirective();
      expect(this.isolateScope.ngModel).to.equal(false);
    });

    it('should change ngModel to true when toggle is called', function() {
      this.initDirective();
      this.isolateScope.toggle();
      expect(this.isolateScope.ngModel).to.equal(true);
    });

    it('should have a default color', function() {
      this.initDirective();
      expect(this.isolateScope.color).to.be.defined;
    });

    it('should set the color to the given one', function() {
      var color = 'red';
      this.initDirective('<toggle-switch color="' + color + '"/>');
      expect(this.isolateScope.color).to.equal(color);
    });

    it('should change form.$dirty to true when toggle is called', function() {
      var self = this;

      self.$scope.form = {
        $dirty: false,
        $setDirty: function() {
          self.$scope.form.$dirty = true;
        }
      };

      this.initDirective('<toggle-switch form="form"/>');
      this.isolateScope.toggle();
      expect(this.isolateScope.form.$dirty).to.equal(true);
    });

  });

  describe('The esnSubmit directive', function() {
    var $compile, $rootScope;
    var $scope;

    beforeEach(inject(function(_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
    }));

    function initDirective(html) {
      var element = $compile(html)($scope);
      $scope.$digest();

      return element;
    }

    it('should trigger esnSubmit function on click', function() {
      $scope.myFunction = sinon.stub().returns($q.when());
      var element = initDirective('<button esn-submit="myFunction()"></button>');

      element.click();

      expect($scope.myFunction).to.have.been.calledOnce;
    });

    it('should disable button on click then enable again on promise resolves', function() {
      $scope.myFunction = function() {
        return $q.when();
      };
      var element = initDirective('<button esn-submit="myFunction()"></button>');

      element.click();
      expect(element.prop('disabled')).to.be.true;

      $scope.$digest();
      expect(element.prop('disabled')).to.be.false;
    });

    it('should disable button on click then enable again on promise rejects', function() {
      $scope.myFunction = function() {
        return $q.reject();
      };
      var element = initDirective('<button esn-submit="myFunction()"></button>');

      element.click();
      expect(element.prop('disabled')).to.be.true;

      $scope.$digest();
      expect(element.prop('disabled')).to.be.false;
    });

    it('should trigger esnSubmit function on form submit', function() {
      $scope.myFunction = sinon.stub().returns($q.when());
      var element = initDirective('<form esn-submit="myFunction()"><button type="submit"></button></form>');

      element.find('button').click();

      expect($scope.myFunction).to.have.been.calledOnce;
    });

    it('should disable submit button of the form on submit then enable again on promise resolves', function() {
      $scope.myFunction = function() {
        return $q.when();
      };
      var element = initDirective('<form esn-submit="myFunction()"><button type="submit"></button></form>');
      var button = element.find('button');

      button.click();
      expect(button.prop('disabled')).to.be.true;

      $scope.$digest();
      expect(button.prop('disabled')).to.be.false;
    });

    it('should disable submit button of the form on submit then enable again on promise rejects', function() {
      $scope.myFunction = function() {
        return $q.reject();
      };
      var element = initDirective('<form esn-submit="myFunction()"><button type="submit"></button></form>');
      var button = element.find('button');

      button.click();
      expect(button.prop('disabled')).to.be.true;

      $scope.$digest();
      expect(button.prop('disabled')).to.be.false;
    });

  });

});
