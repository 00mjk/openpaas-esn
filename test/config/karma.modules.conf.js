'use strict';

module.exports = function(config) {
  config.set({
    basePath: '../../',

    files: [
      'frontend/components/jquery/dist/jquery.js',
      'frontend/components/jquery-mockjax/dist/jquery.mockjax.js',
      'frontend/components/angular/angular.js',
      'frontend/components/angular-mocks/angular-mocks.js',
      'test/frontend/karma-include/*.js',
      'frontend/components/angular-ui-router/release/angular-ui-router.js',
      'frontend/components/ui-router-extras/release/ct-ui-router-extras.min.js',
      'frontend/components/angular-route/angular-route.js',
      'frontend/components/angular-animate/angular-animate.js',
      'frontend/components/angular-strap/dist/angular-strap.js',
      'frontend/components/angular-strap/dist/angular-strap.tpl.js',
      'frontend/components/lodash/dist/lodash.min.js',
      'frontend/components/lng-clockpicker/dist/bootstrap-clockpicker.js',
      'frontend/components/angular-clockpicker/dist/angular-clockpicker.min.js',
      'frontend/components/restangular/dist/restangular.js',
      'frontend/components/openpaas-logo/openpaas-logo.js',
      'frontend/components/angular-recaptcha/release/angular-recaptcha.js',
      'frontend/components/chai/chai.js',
      'frontend/components/chai-datetime/chai-datetime.js',
      'frontend/components/sinon-chai/lib/sinon-chai.js',
      'frontend/components/sinon-1.15.4/index.js',
      'node_modules/chai-shallow-deep-equal/chai-shallow-deep-equal.js',
      'frontend/components/ngInfiniteScroll/build/ng-infinite-scroll.js',
      'frontend/components/ng-tags-input/ng-tags-input.js',
      'frontend/components/angular-xeditable/dist/js/xeditable.js',
      'frontend/components/jquery.nicescroll/jquery.nicescroll.js',
      'frontend/components/angular-nicescroll/angular-nicescroll.js',
      'frontend/components/moment/moment.js',
      'frontend/components/moment-timezone/builds/moment-timezone-with-data-2010-2020.min.js',
      'frontend/components/angular-moment/angular-moment.js',
      'frontend/components/jstzdetect/jstz.min.js',
      'frontend/components/angular-jstz/angular-jstz.js',
      'frontend/components/angular-file-upload/dist/angular-file-upload-shim.min.js',
      'frontend/components/angular-file-upload/dist/angular-file-upload.min.js',
      'frontend/components/angular-truncate/src/truncate.js',
      'frontend/components/angular-sanitize/angular-sanitize.min.js',
      'frontend/components/angular-touch/angular-touch.min.js',
      'frontend/components/angular-leaflet-directive/dist/angular-leaflet-directive.js',
      'frontend/components/ngGeolocation/ngGeolocation.min.js',
      'frontend/components/angular-ui-calendar/src/calendar.js',
      'frontend/components/angular-recursion/angular-recursion.min.js',
      'frontend/components/fullcalendar/dist/fullcalendar.min.js',
      'frontend/components/ical.js/build/ical.js',
      'frontend/components/angular-uuid4/angular-uuid4.min.js',
      'frontend/components/localforage/dist/localforage.min.js',
      'frontend/components/angular-localforage/dist/angular-localForage.js',
      'node_modules/async/lib/async.js',
      'node_modules/chai-jquery/chai-jquery.js',
      'frontend/components/angular-bootstrap-switch/dist/angular-bootstrap-switch.js',
      'frontend/components/showdown/compressed/showdown.js',
      'frontend/components/showdown/compressed/extensions/table.js',
      'frontend/components/angular-markdown-directive/markdown.js',
      'frontend/components/angular-scroll/angular-scroll.js',
      'frontend/components/blueimp-canvas-to-blob/js/canvas-to-blob.js',
      'frontend/components/re-tree/re-tree.js',
      'frontend/components/ng-device-detector/ng-device-detector.js',
      'frontend/components/remarkable-bootstrap-notify/bootstrap-notify.min.js',
      'frontend/components/char-api/lib/charAPI.js',
      'frontend/components/jmap-client/dist/jmap-client.js',
      'frontend/components/dynamic-directive/dist/dynamic-directive.min.js',
      'frontend/components/angularjs-naturalsort/dist/naturalSortVersion.min.js',
      'frontend/components/bootstrap/dist/js/bootstrap.min.js',
      'frontend/components/summernote/dist/summernote.js',
      'frontend/components/angular-summernote/dist/angular-summernote.min.js',
      'frontend/components/autosize/dist/autosize.min.js',
      'frontend/components/offline/offline.min.js',
      'frontend/components/angular-media-queries/match-media.js',
      'frontend/components/jquery.focus/dist/jquery.focus.js',
      'frontend/components/angular-feature-flags/dist/featureFlags.js',
      'frontend/js/**/*.js',
      'modules/**/frontend/js/**/*.js',
      'modules/**/test/unit-frontend/**/*.js',
      'modules/**/frontend/views/**/*.jade',
      'frontend/views/modules/**/*.jade',

      // fixtures
      {pattern: 'frontend/images/**/*.png', watched: false, included: false, served: true},
      'modules/**/unit-frontend/fixtures/**'
    ],
    proxies: {
      '/images/': 'frontend/images/',
      '/contact/images/': 'modules/linagora.esn.contact/frontend/images/'
    },

    logLevel: config.LOG_ERROR,
    frameworks: ['mocha'],
    colors: true,
    singleRun: true,
    autoWatch: true,
    browsers: ['PhantomJS', 'Chrome', 'Firefox'],
    reporters: ['coverage', 'spec'],
    preprocessors: {
      'modules/**/frontend/js/**/*.js': ['coverage'],
      '**/*.jade': ['ng-jade2module'],
      'modules/**/unit-frontend/fixtures/**': ['raw2js']
    },

    plugins: [
      'karma-phantomjs-launcher',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-mocha',
      'karma-coverage',
      'karma-spec-reporter',
      'karma-ng-jade2module-preprocessor',
      'karma-rawfixtures-preprocessor'
    ],

    junitReporter: {
      outputFile: 'test_out/unit.xml',
      suite: 'unit-frontend'
    },

    coverageReporter: {type: 'text', dir: '/tmp'},

    ngJade2ModulePreprocessor: {
      cacheIdFromPath: function(filepath) {
        var cacheId = '';
        if (filepath.match(/^frontend*/)) {
          cacheId = filepath.substr(8).replace('.jade', '.html');
        } else if (filepath.match(/^modules*/)) {
          cacheId = filepath.replace('modules/linagora.esn.', '/')
                            .replace('frontend/', '')
                            .replace('.jade', '.html');
        }
        return cacheId;
      },
      // setting this option will create only a single module that contains templates
      // from all the files, so you can load them all with module('templates')
      jadeRenderConfig: {
        __: function(str) {
          return str;
        }
      },
      moduleName: 'jadeTemplates'
    }

  });
};
