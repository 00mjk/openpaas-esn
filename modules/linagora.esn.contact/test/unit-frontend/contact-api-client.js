'use strict';

/* global chai: false */
/* global sinon: false */

var expect = chai.expect;

describe('The contact Angular module contactapis', function() {
  beforeEach(angular.mock.module('linagora.esn.contact'));

  describe('The ContactAPIClient service', function() {
    var ICAL, CONTACT_EVENTS, contact, contactWithChangedETag, contactAsJCard;
    var ADDRESSBOOK_PATH = 'addressbooks';

    beforeEach(function() {
      var self = this;
      this.uuid4 = {
        // This is a valid uuid4. Change this if you need other uuids generated.
        _uuid: '00000000-0000-4000-a000-000000000000',
        generate: function() {
          return this._uuid;
        }
      };
      this.notificationFactory = {};
      this.gracePeriodService = {};
      this.gracePeriodLiveNotification = {};
      this.contactUpdateDataService = {
        contactUpdatedIds: []
      };

      contact = { id: '00000000-0000-4000-a000-000000000000', lastName: 'Last'};
      contactWithChangedETag = { id: '00000000-0000-4000-a000-000000000000', lastName: 'Last', etag: 'changed-etag' };
      contactAsJCard = ['vcard', [
        ['uid', {}, 'text', '00000000-0000-4000-a000-000000000000'],
        ['n', {}, 'text', ['Last', '', '', '', '']]
      ], []];

      angular.mock.module(function($provide) {
        $provide.value('notificationFactory', self.notificationFactory);
        $provide.value('uuid4', self.uuid4);
        $provide.value('gracePeriodService', self.gracePeriodService);
        $provide.value('gracePeriodLiveNotification', self.gracePeriodLiveNotification);
        $provide.value('contactUpdateDataService', self.contactUpdateDataService);
      });
    });

    beforeEach(angular.mock.inject(function($rootScope, $httpBackend, ContactAPIClient, ContactShell, ContactsHelper, AddressBookShell, DAV_PATH, GRACE_DELAY, _ICAL_, _CONTACT_EVENTS_) {
      this.$rootScope = $rootScope;
      this.$httpBackend = $httpBackend;
      this.ContactAPIClient = ContactAPIClient;
      this.ContactShell = ContactShell;
      this.AddressBookShell = AddressBookShell;
      this.DAV_PATH = DAV_PATH;
      this.GRACE_DELAY = GRACE_DELAY;
      this.ContactsHelper = ContactsHelper;

      ICAL = _ICAL_;
      CONTACT_EVENTS = _CONTACT_EVENTS_;

      this.getBookHomeUrl = function(bookId) {
        return [this.DAV_PATH, ADDRESSBOOK_PATH, bookId + '.json'].join('/');
      };

      this.getBookUrl = function(bookId, bookName) {
        return [this.DAV_PATH, ADDRESSBOOK_PATH, bookId, bookName + '.json'].join('/');
      };

      this.getVCardUrl = function(bookId, bookName, cardId) {
        return [this.DAV_PATH, ADDRESSBOOK_PATH, bookId, bookName, cardId + '.vcf'].join('/');
      };
    }));

    describe('The addressbookHome fn', function() {

      describe('The addressbook fn', function() {

        describe('The list fn', function() {

          it('should return list of addressbooks', function(done) {
            var bookId = '123';
            this.$httpBackend.expectGET(this.getBookHomeUrl(bookId)).respond({
              _links: {
                self: {
                  href: '/esn-sabre/esn.php/addressbooks/5666b4cff5d672f316d4439f.json'
                }
              },
              _embedded: {
                'dav:addressbook': [{
                  _links: {
                    self: {
                      href: '/esn-sabre/esn.php/addressbooks/5666b4cff5d672f316d4439f/contacts.json'
                    }
                  },
                  'dav:name': 'Default Addressbook',
                  'carddav:description': 'Default Addressbook',
                  'dav:acl': ['dav:read', 'dav:write']
                }, {
                  _links: {
                    self: {
                      href: '/esn-sabre/esn.php/addressbooks/5666b4cff5d672f316d4439f/1614422648.json'
                    }
                  },
                  'dav:name': 'Twitter addressbook',
                  'carddav:description': 'AddressBook for Twitter contacts',
                  'dav:acl': ['dav:read']
                }]
              }
            });

            this.ContactAPIClient
              .addressbookHome(bookId)
              .addressbook()
              .list()
              .then(function(addressbooks) {
                expect(addressbooks.length).to.equal(2);
                expect(addressbooks[0].name).to.equal('Default Addressbook');
                expect(addressbooks[1].name).to.equal('Twitter addressbook');
                done();
              }, done);

            this.$rootScope.$apply();
            this.$httpBackend.flush();
          });

        });

        describe('The get addressbook fn', function() {

          it('should return an AddressBookShell instance if success', function(done) {
            var bookId = '123';
            this.$httpBackend.expectGET(this.getBookHomeUrl(bookId)).respond({
              _links: {
                self: {
                  href: '/esn-sabre/esn.php/addressbooks/5666b4cff5d672f316d4439f.json'
                }
              },
              _embedded: {
                'dav:addressbook': [{
                  _links: {
                    self: {
                      href: '/esn-sabre/esn.php/addressbooks/5666b4cff5d672f316d4439f/contacts.json'
                    }
                  },
                  'dav:name': 'Default Addressbook',
                  'carddav:description': 'Default Addressbook',
                  'dav:acl': ['dav:read', 'dav:write']
                }, {
                  _links: {
                    self: {
                      href: '/esn-sabre/esn.php/addressbooks/5666b4cff5d672f316d4439f/1614422648.json'
                    }
                  },
                  'dav:name': 'Twitter addressbook',
                  'carddav:description': 'AddressBook for Twitter contacts',
                  'dav:acl': ['dav:read']
                }]
              }
            });

            var bookName = '1614422648';
            var AddressBookShell = this.AddressBookShell;
            this.ContactAPIClient
              .addressbookHome(bookId)
              .addressbook(bookName)
              .get()
              .then(function(addressbook) {
                expect(addressbook).to.be.instanceof(AddressBookShell);
                expect(addressbook.id).to.equal(bookName);
                done();
              }, done);

            this.$rootScope.$apply();
            this.$httpBackend.flush();
          });

        });

        describe('The vcard fn', function() {

          describe('The get fn', function() {

            it('should return a contact', function(done) {
              var bookId = '123';
              var bookName = 'bookName';
              var cardId = '456';
              var expectPath = this.getVCardUrl(bookId, bookName, cardId);
              this.$httpBackend.expectGET(expectPath).respond(
                ['vcard', [
                  ['version', {}, 'text', '4.0'],
                  ['uid', {}, 'text', 'myuid'],
                  ['fn', {}, 'text', 'first last'],
                  ['n', {}, 'text', ['last', 'first']],
                  ['email', { type: 'Work' }, 'text', 'mailto:foo@example.com'],
                  ['tel', { type: 'Work' }, 'uri', 'tel:123123'],
                  ['adr', { type: 'Home' }, 'text', ['', '', 's', 'c', '', 'z', 'co']],
                  ['org', {}, 'text', 'org'],
                  ['url', {}, 'uri', 'http://linagora.com'],
                  ['role', {}, 'text', 'role'],
                  ['socialprofile', { type: 'Twitter' }, 'text', '@AwesomePaaS'],
                  ['categories', {}, 'text', 'starred', 'asdf'],
                  ['bday', {}, 'date', '2015-01-01'],
                  ['nickname', {}, 'text', 'nick'],
                  ['note', {}, 'text', 'notes'],
                  ['photo', {}, 'text', 'data:image/png;base64,iVBOR=']
                ], []],
                // headers:
                { ETag: 'testing-tag' }
              );

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(cardId)
                .get()
                .then(function(contact) {
                  expect(contact).to.be.an('object');
                  expect(contact.id).to.equal('myuid');

                  expect(contact.vcard).to.be.an('object');
                  expect(contact.etag).to.equal('testing-tag');

                  expect(contact.firstName).to.equal('first');
                  expect(contact.lastName).to.equal('last');
                  expect(contact.displayName).to.equal('first last');
                  expect(contact.emails).to.deep.equal([{type: 'Work', value: 'foo@example.com'}]);
                  expect(contact.addresses).to.deep.equal([{
                    type: 'Home', street: 's', city: 'c', zip: 'z', country: 'co'
                  }]);
                  expect(contact.org).to.equal('org');
                  expect(contact.urls).to.eql([{ value: 'http://linagora.com' }]);
                  expect(contact.orgRole).to.equal('role');
                  expect(contact.social).to.deep.equal([{ type: 'Twitter', value: '@AwesomePaaS' }]);
                  expect(contact.tags).to.deep.equal([{ text: 'asdf' }]);
                  expect(contact.starred).to.be.true;
                  expect(contact.birthday).to.equalDate(new Date(2015, 0, 1));
                  expect(contact.nickname).to.equal('nick');
                  expect(contact.notes).to.equal('notes');
                  expect(contact.photo).to.equal('data:image/png;base64,iVBOR=');
                }.bind(this)).finally(done);

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should return a contact with no photo if not defined in vCard', function(done) {
              var bookId = '123';
              var bookName = 'bookName';
              var cardId = '456';
              var expectPath = this.getVCardUrl(bookId, bookName, cardId);
              this.$httpBackend.expectGET(expectPath).respond(
                ['vcard', [
                  ['version', {}, 'text', '4.0'],
                  ['uid', {}, 'text', 'myuid']
                ], []]
              );

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(cardId)
                .get()
                .then(function(contact) {
                  expect(contact.photo).to.not.exist;
                }.bind(this)).finally(done);

              this.$httpBackend.flush();
            });

            it('should have contact with default avatar forced reload', function(done) {
              var bookId = '123';
              var bookName = 'bookName';
              var cardId = '456';
              var expectPath = this.getVCardUrl(bookId, bookName, cardId);
              this.$httpBackend.expectGET(expectPath).respond(
                ['vcard', [
                    ['version', {}, 'text', '4.0'],
                    ['uid', {}, 'text', 'myuid'],
                    ['photo', {}, 'uri', 'http://abc.com/contact/api/contacts/123/456/avatar']
                  ]
                ]
              );

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(cardId)
                .get()
                .then(function(contact) {
                  expect(contact.photo).to.match(/123\/456\/avatar\?t=[0-10]+/);
                  done();
                });

              this.$httpBackend.flush();
            });

            it('should return a contact with a string birthday if birthday is not a date', function(done) {
              var bookId = '123';
              var bookName = 'bookName';
              var cardId = '456';
              var expectPath = this.getVCardUrl(bookId, bookName, cardId);
              this.$httpBackend.expectGET(expectPath).respond(
                ['vcard', [
                  ['bday', {}, 'text', 'a text birthday']
                ], []],
                { ETag: 'testing-tag' }
              );

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(cardId)
                .get()
                .then(function(contact) {
                  expect(contact.birthday).to.equal('a text birthday');
                }.bind(this)).finally(done);

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

          });

          describe('The list fn', function() {
            var bookId = '5375de4bd684db7f6fbd4f97';
            var bookName = 'bookName';
            var userId = '123456789';
            var uid = 'myuid';
            var contactsURL;
            var result, options;

            function checkResult(done) {
              return function(data) {
                expect(data.data).to.be.an.array;
                expect(data.data.length).to.equal(1);
                expect(data.data[0].id).to.equal(uid);
                expect(data.current_page).to.eql(options.page);
                done();
              };
            }

            beforeEach(function() {
              options = {};
              contactsURL = this.getBookUrl(bookId, bookName);
              result = {
                _links: {
                  self: {
                    href: ''
                  }
                },
                'dav:syncToken': 6,
                _embedded: {
                  'dav:item': [
                    {
                      _links: {
                        self: '/addressbooks/5375de4bd684db7f6fbd4f97/bookName/myuid.vcf'
                      },
                      etag: '\'6464fc058586fff85e3522de255c3e9f\'',
                      data: [
                        'vcard',
                        [
                          ['version', {}, 'text', '4.0'],
                          ['uid', {}, 'text', uid],
                          ['n', {}, 'text', ['Burce', 'Willis', '', '', '']]
                        ]
                      ]
                    }
                  ]
                }
              };
            });

            it('should list cards', function(done) {
              this.$httpBackend.expectGET(contactsURL + '?sort=fn').respond(result);

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard()
                .list()
                .then(function(data) {
                  var cards = data.data;
                  expect(cards).to.be.an.array;
                  expect(cards.length).to.equal(1);

                  expect(cards[0]).to.be.instanceof(this.ContactShell);
                  expect(cards[0]).to.shallowDeepEqual({
                    id: uid,
                    firstName: 'Willis',
                    lastName: 'Burce',
                    etag: undefined,
                    vcard: []
                  });
                }.bind(this)).finally(done);

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should force reload default avatar if card is updated', function(done) {
              this.$httpBackend.expectGET(contactsURL + '?sort=fn').respond(result);
              this.contactUpdateDataService.contactUpdatedIds = ['myuid'];
              this.ContactsHelper.forceReloadDefaultAvatar = sinon.spy();
              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard()
                .list()
                .then(function(data) {
                  expect(this.ContactsHelper.forceReloadDefaultAvatar.calledWithExactly(data.data[0])).to.be.true;
                }.bind(this)).finally(done);

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should call the backend with right parameters', function(done) {
              options.paginate = true;
              options.page = 1;
              options.limit = 10;
              options.userId = userId;
              var url = contactsURL + '?limit=10&offset=0&sort=fn&userId=' + userId;
              this.$httpBackend.expectGET(url).respond(result);
              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard()
                .list(options)
                .then(checkResult(done));

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should return next_page when not reached last_page', function(done) {
              result._links.next = true;
              options.paginate = true;
              options.limit = 10;
              options.userId = userId;
              var url = contactsURL + '?limit=10&offset=0&sort=fn&userId=' + userId;
              this.$httpBackend.expectGET(url).respond(result);

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard()
                .list(options)
                .then(function(data) {
                  expect(data.next_page).to.equal(2);
                  done();
                });
              this.$httpBackend.flush();
              this.$rootScope.$apply();
            });

            it('should not return next_page when reached last_page', function(done) {
              result._links.next = false;
              options.paginate = true;
              options.limit = 10;
              options.userId = userId;
              var url = contactsURL + '?limit=10&offset=0&sort=fn&userId=' + userId;
              this.$httpBackend.expectGET(url).respond(result);

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard()
                .list(options)
                .then(function(data) {
                  expect(data.next_page).to.not.be.defined;
                  done();
                });
              this.$httpBackend.flush();
              this.$rootScope.$apply();
            });

          });

          describe('The search fn', function() {

            var bookId = '123';
            var bookName = 'bookName';

            it('should call sent HTTP request to backend with the right parameters', function() {
              var expectPath = this.getBookUrl(bookId, bookName) + '?page=5&search=linagora&userId=userId';
              this.$httpBackend.expectGET(expectPath).respond(200, '');

              var searchOptions = {
                data: 'linagora',
                userId: 'userId',
                page: 5
              };
              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard()
                .search(searchOptions);

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should return search result', function(done) {
              var expectPath = this.getBookUrl(bookId, bookName) + '?page=5&search=linagora&userId=userId';
              var response = {
                _current_page: 1,
                _total_hits: 200,
                _embedded: {
                  'dav:item': [
                    {
                      _links: {
                        self: '/addressbooks/5375de4bd684db7f6fbd4f97/bookName/myuid.vcf'
                      },
                      etag: '\'6464fc058586fff85e3522de255c3e9f\'',
                      data: [
                        'vcard',
                        [
                          ['version', {}, 'text', '4.0'],
                          ['uid', {}, 'text', 'myuid'],
                          ['n', {}, 'text', ['Bruce', 'Willis', '', '', '']]
                        ]
                      ]
                    }
                  ]
                }
              };
              this.$httpBackend.expectGET(expectPath).respond(response);

              var searchOptions = {
                data: 'linagora',
                userId: 'userId',
                page: 5
              };
              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard()
                .search(searchOptions)
                .then(function(result) {
                  expect(result.current_page).to.equal(response._current_page);
                  expect(result.total_hits).to.equal(response._total_hits);
                  expect(result.hits_list.length).to.equal(1);
                  expect(result.hits_list[0].id).to.equal('myuid');
                  expect(result.hits_list[0].firstName).to.equal('Willis');
                  expect(result.hits_list[0].lastName).to.equal('Bruce');
                  done();
                });

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

          });

          describe('The create fn', function() {

            var bookId = '123';
            var bookName = 'bookName';

            it('should generate ID by uuid4 if contact.id is not exist', function(done) {
              var cardId = '123';
              this.uuid4.generate = function() {
                return cardId;
              };
              var contact = { firstName: 'Alice' };
              this.$httpBackend.expectPUT(this.getVCardUrl(bookId, bookName, cardId)).respond(201);
              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard()
                .create(contact)
                .then(function() {
                  expect(contact.id).to.equal(cardId);
                  done();
                }, done);
              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should fail on 500 response status', function(done) {
              this.$httpBackend.expectPUT(this.getVCardUrl(bookId, bookName, contact.id)).respond(500, '');

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard()
                .create(contact)
                .then(null, function(response) {
                  expect(response.status).to.equal(500);
                  done();
                });

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should fail on a 2xx status that is not 201', function(done) {
              this.$httpBackend.expectPUT(this.getVCardUrl(bookId, bookName, contact.id)).respond(200, '');

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard()
                .create(contact).then(null, function(response) {
                  expect(response.status).to.equal(200);
                  done();
                });

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should succeed when everything is correct', function(done) {
              this.$httpBackend.expectPUT(this.getVCardUrl(bookId, bookName, contact.id)).respond(201);
              this.$httpBackend.expectGET(this.getVCardUrl(bookId, bookName, contact.id)).respond(201,
                ['vcard', [
                  ['version', {}, 'text', '4.0'],
                  ['uid', {}, 'text', 'myuid']
                ], []]
              );

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard()
                .create(contact)
                .then(function(response) {
                  expect(response.status).to.equal(201);
                  done();
                });

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

          });

          describe('The update fn', function() {

            var bookId = '123';
            var bookName = 'bookName';
            var vcardUrl;

            beforeEach(function() {
              vcardUrl = this.getVCardUrl(bookId, bookName, contact.id);
            });

            beforeEach(function() {
              var vcard = new ICAL.Component('vcard');
              vcard.addPropertyWithValue('version', '4.0');
              vcard.addPropertyWithValue('uid', '00000000-0000-4000-a000-000000000000');
              vcard.addPropertyWithValue('fn', 'test card');
              this.vcard = vcard;
            });

            it('should fail if status is 201', function(done) {
              this.$httpBackend.expectPUT(vcardUrl + '?graceperiod=8000').respond(201);

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(contact.id)
                .update(contact)
                .then(null, function(response) {
                  expect(response.status).to.equal(201);
                  done();
                });

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should succeed on 202', function(done) {
              this.$httpBackend.expectPUT(vcardUrl + '?graceperiod=8000').respond(202, '', { 'X-ESN-TASK-ID': 'taskId' });

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(contact.id)
                .update(contact)
                .then(function(taskId) {
                  expect(taskId).to.equal('taskId');
                  done();
                });

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should succeed on 204', function(done) {
              this.$httpBackend.expectPUT(vcardUrl + '?graceperiod=8000').respond(204, '', { 'X-ESN-TASK-ID': 'taskId' });

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(contact.id)
                .update(contact)
                .then(function(taskId) {
                  expect(taskId).to.equal('taskId');
                  done();
                });

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should send etag as If-Match header', function(done) {
              var requestHeaders = {
                'Content-Type': 'application/vcard+json',
                Prefer: 'return=representation',
                'If-Match': 'etag',
                Accept: 'application/json, text/plain, */*'
              };

              this.$httpBackend.expectPUT(vcardUrl + '?graceperiod=8000', function() { return true; }, requestHeaders).respond(202);

              contact.etag = 'etag';
              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(contact.id)
                .update(contact)
                .then(function() { done(); });

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

          });

          describe('The remove fn', function() {

            var bookId = '123';
            var bookName = 'bookName';
            var vcardUrl;

            beforeEach(function() {
              vcardUrl = this.getVCardUrl(bookId, bookName, contact.id);
            });

            it('should pass the graceperiod as a query parameter if defined', function(done) {
              this.$httpBackend.expectDELETE(vcardUrl + '?graceperiod=1234').respond(204);

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(contact.id)
                .remove({ graceperiod: 1234 })
                .then(function() { done(); });

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should fail on a status that is not 204 and not 202', function(done) {

              this.$httpBackend.expectDELETE(vcardUrl).respond(201);

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(contact.id)
                .remove()
                .then(null, function(response) {
                  expect(response.status).to.equal(201);
                  done();
                });
              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should succeed when response.status is 204', function(done) {

              this.$httpBackend.expectDELETE(vcardUrl).respond(204);

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(contact.id)
                .remove()
                .then(function() { done(); });
              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should succeed when response.status is 202', function(done) {

              this.$httpBackend.expectDELETE(vcardUrl).respond(202);

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(contact.id)
                .remove()
                .then(function() { done(); });
              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should send etag as If-Match header', function(done) {
              var requestHeaders = {
                'If-Match': 'etag',
                Accept: 'application/json, text/plain, */*'
              };

              this.$httpBackend.expectDELETE(vcardUrl, requestHeaders).respond(204);

              contact.etag = 'etag';
              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(contact.id)
                .remove({ etag: 'etag' })
                .then(function() { done(); });

              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should resolve to the pending task identifier', function(done) {
              this.$httpBackend.expectDELETE(vcardUrl).respond(202, null, { 'X-ESN-Task-Id': '1234' });

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(contact.id)
                .remove()
                .then(function(id) {
                  expect(id).to.equal('1234');
                  done();
                });
              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

            it('should resolve to nothing on direct deletion', function(done) {
              this.$httpBackend.expectDELETE(vcardUrl).respond(204);

              this.ContactAPIClient
                .addressbookHome(bookId)
                .addressbook(bookName)
                .vcard(contact.id)
                .remove()
                .then(function(response) {
                  expect(response).to.not.exist;
                  done();
                });
              this.$rootScope.$apply();
              this.$httpBackend.flush();
            });

          });

        });

      });

    });

  });
});
