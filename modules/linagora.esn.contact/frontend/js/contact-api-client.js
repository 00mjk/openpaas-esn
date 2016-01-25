'use strict';

angular.module('linagora.esn.contact')
  .constant('CONTACT_ACCEPT_HEADER', 'application/vcard+json')
  .constant('CONTACT_CONTENT_TYPE_HEADER', 'application/vcard+json')
  .constant('CONTACT_PREFER_HEADER', 'return=representation')
  .factory('ContactAPIClient', function($q,
                            uuid4,
                            ContactShell,
                            AddressBookShell,
                            ContactsHelper,
                            ContactShellHelper,
                            ICAL,
                            CONTACT_ACCEPT_HEADER,
                            CONTACT_CONTENT_TYPE_HEADER,
                            CONTACT_PREFER_HEADER,
                            DEFAULT_ADDRESSBOOK_NAME,
                            GRACE_DELAY,
                            CONTACT_LIST_PAGE_SIZE,
                            CONTACT_LIST_DEFAULT_SORT,
                            shellToVCARD,
                            davClient,
                            contactUpdateDataService) {
    var ADDRESSBOOK_PATH = '/addressbooks';

    function buildContactShell(vcarddata) {
      var contact = new ContactShell(new ICAL.Component(vcarddata.data), null, vcarddata._links.self.href);
      if (contactUpdateDataService.contactUpdatedIds.indexOf(contact.id) > -1) {
        ContactsHelper.forceReloadDefaultAvatar(contact);
      }
      return contact;
    }

    function populate(shell) {
      var metadata = ContactShellHelper.getMetadata(shell);
      if (!metadata || !metadata.bookId || !metadata.bookName) {
        return $q.when(shell);
      }

      return addressbookHome(metadata.bookId).addressbook(metadata.bookName).get().then(function(ab) {
        shell.addressbook = ab;
        return shell;
      }, function(err) {
        return shell;
      });
    }

    /**
     * Convert HTTP response to an array of ContactShell
     * @param  {Response} response Response from $http
     * @return {Promise}          resolves with an Array of ContactShell
     */
    function responseAsContactShell(response) {
      if (response.data && response.data._embedded && response.data._embedded['dav:item']) {
        return $q.all(response.data._embedded['dav:item'].map(function(vcarddata) {
          return populate(buildContactShell(vcarddata));
        }));
      }

      return $q.when([]);
    }

    /**
     * Return the AddressbookHome URL, each user has one AddressbookHome
     * @param  {String} bookId The AddressbookHome ID
     * @return {String}
     */
    function getBookHomeUrl(bookId) {
      return [ADDRESSBOOK_PATH, bookId + '.json'].join('/');
    }

    /**
     * Return the AddressBook url, each user can have many AddressBooks
     * @param  {String} bookId   The AddressbookHome ID
     * @param  {String} bookName The addressbook name, AKA uri field of the addessbook
     * @return {String}
     */
    function getBookUrl(bookId, bookName) {
      return [ADDRESSBOOK_PATH, bookId, bookName + '.json'].join('/');
    }

    /**
     * Return the VCard url
     * @param  {String} bookId   The AddressbookHome ID
     * @param  {String} bookName The addressbook name
     * @param  {String} cardId   The card ID
     * @return {String}
     */
    function getVCardUrl(bookId, bookName, cardId) {
      return [ADDRESSBOOK_PATH, bookId, bookName, cardId + '.vcf'].join('/');
    }

    /**
     * List all addressbooks of a user
     * @param  {String} bookId The AddressbookHome ID
     * @return {Promise}        Resolve an array of AddressBookShell if success
     */
    function listAddressbook(bookId) {
      var headers = { Accept: CONTACT_ACCEPT_HEADER };

      return davClient('GET', getBookHomeUrl(bookId), headers)
        .then(function(response) {
          if (response.data._embedded && response.data._embedded['dav:addressbook']) {
            return response.data._embedded['dav:addressbook'].map(function(item) {
              return new AddressBookShell(item);
            });
          }
        });
    }

    /**
     * Get a specified addressbook
     * @param  {String} bookId   the addressbook home ID
     * @param  {String} bookName the addressbook name
     * @return {Promise}          Resolve AddressBookShell if success
     */
    function getAddressbook(bookId, bookName) {
      var headers = { Accept: CONTACT_ACCEPT_HEADER };

      return davClient('PROPFIND', getBookUrl(bookId, bookName), headers)
        .then(function(response) {
          return new AddressBookShell(response.data);
        });
    }

    /**
     * Get specified card
     * @param  {String} bookId   the addressbook home ID
     * @param  {String} bookName the addressbook name
     * @param  {String} cardId   the card ID to get
     * @return {Promise}          Resolve ContactShell if success
     */
    function getCard(bookId, bookName, cardId) {
      var headers = { Accept: CONTACT_ACCEPT_HEADER };

      var href = getVCardUrl(bookId, bookName, cardId);

      return davClient('GET', href, headers)
        .then(function(response) {
          var contact = new ContactShell(
            new ICAL.Component(response.data), response.headers('ETag'), href);
          ContactsHelper.forceReloadDefaultAvatar(contact);
          return populate(contact);
        });
    }

    /**
     * List cards from an addressbook
     * @param  {String} bookId   the addressbook home ID
     * @param  {String} bookName the addressbook name
     * @param  {Object} options  Optional, includes:
     *                           	+ page(Number): current page
     *                           	+ limit(Number):
     *                           	+ paginate(Boolean):
     *                           	+ sort(String):
     *                           	+ userId(String):
     * @return {Promise}          If success, resolve an object with:
     *                            + data: an array of ContactShell
     *                            + current_page:
     *                            + last_page: true or false
     */
    function listCard(bookId, bookName, options) {
      options = options || {};
      var currentPage = options.page || 1;
      var limit = options.limit || CONTACT_LIST_PAGE_SIZE;
      var offset = (currentPage - 1) * limit;

      var query = {
        sort: options.sort || CONTACT_LIST_DEFAULT_SORT,
        userId: options.userId
      };

      if (options.paginate) {
        query.limit = limit;
        query.offset = offset;
      }

      return davClient('GET', getBookUrl(bookId, bookName), null, null, query)
        .then(function(response) {
          return responseAsContactShell(response).then(function(shells) {
            var result = {
              data: shells,
              current_page: currentPage,
              last_page: !response.data._links.next
            };
            if (!response.last_page) {
              result.next_page = currentPage + 1;
            }
            return result;
          });
        });
    }

    /**
     * Search card
     * @param  {Object} options  Search options, includes:
     *                            + bookId: The AB home ID
     *                            + bookName: The AB name
     *                           	+ data: query to search
     *                            + userId
     *                            + page
     * @return {Promise}          If success, return an object with:
     *                            + current_page
     *                            + total_hits
     *                            + data: an array of ContactShell
     */
    function searchCard(options) {
      if (!options) {
        return $q.reject('Missing options');
      }
      var params = {
        search: options.data,
        userId: options.userId,
        page: options.page
      };

      return davClient(
          'GET',
          options.bookName ? getBookUrl(options.bookId, options.bookName) : getBookHomeUrl(options.bookId),
          null,
          null,
          params
        ).then(function(response) {
          return responseAsContactShell(response).then(function(shells) {
            return {
              current_page: response.data._current_page,
              total_hits: response.data._total_hits,
              data: shells
            };
          });
        });
    }

    /**
     * Create a vcard
     * @param  {String} bookId   the addressbook home ID
     * @param  {String} bookName the addressbook name
     * @param  {ContactShell} contact  Contact to be created, if no contact.id
     *                                 is specified, the ID will be generated by
     *                                 uuid4
     * @return {Promise}          Result if success with statusCode 201
     */
    function createCard(bookId, bookName, contact) {
      var headers = { 'Content-Type': CONTACT_CONTENT_TYPE_HEADER };

      if (!contact.id) {
        contact.id = uuid4.generate();
      }

      return davClient(
          'PUT',
          getVCardUrl(bookId, bookName, contact.id),
          headers,
          shellToVCARD(contact).toJSON()
        ).then(function(response) {
          if (response.status !== 201) {
            return $q.reject(response);
          }
          return response;
        });
    }

    /**
     * Update a card
     * @param  {String} bookId   the addressbook home ID
     * @param  {String} bookName the addressbook name
     * @param  {String} cardId   the card ID to update
     * @param  {ContactShell} contact  the contact to be updated
     * @return {Promise}          Resolve grace period taskId if success
     */
    function updateCard(bookId, bookName, cardId, contact) {
      if (!cardId) {
        return $q.reject(new Error('Missing cardId'));
      }

      var headers = {
        'Content-Type': CONTACT_CONTENT_TYPE_HEADER,
        Prefer: CONTACT_PREFER_HEADER
      };

      if (contact.etag) {
        headers['If-Match'] = contact.etag;
      }

      var params = { graceperiod: GRACE_DELAY };

      return davClient('PUT',
          getVCardUrl(bookId, bookName, cardId),
          headers,
          shellToVCARD(contact).toJSON(),
          params
        ).then(function(response) {
          if (response.status === 202 || response.status === 204) {
            return response.headers('X-ESN-TASK-ID');
          } else {
            return $q.reject(response);
          }
        });
    }

    /**
     * Remove a card
     * @param  {String} bookId   the addressbook home ID
     * @param  {String} bookName the addressbook name
     * @param  {String} cardId   the card ID to update
     * @param  {Object} options  Includes:
     *                           		+ etag
     *                           		+ graceperiod
     * @return {Promise}          If success and it's a grace task: resolve
     *                               grace period taskId
     *                            If success and it's not a grace task: resolve
     *                            	nothing
     */
    function removeCard(bookId, bookName, cardId, options) {
      if (!cardId) {
        return $q.reject(new Error('Missing cardId'));
      }

      options = options || {};
      var headers = {};
      if (options.etag) {
        headers['If-Match'] = options.etag;
      }

      var params = {};
      if (options.graceperiod) {
        params.graceperiod = options.graceperiod;
      }

      return davClient('DELETE',
          getVCardUrl(bookId, bookName, cardId),
          headers,
          null,
          params
        ).then(function(response) {
          if (response.status !== 204 && response.status !== 202) {
            return $q.reject(response);
          }

          return response.headers('X-ESN-TASK-ID');
        });
    }

    /**
     * The addressbook API
     * Examples:
     * - List addressbooks: addressbookHome(bookId).addresbook().list()
     * - Get a addressbook: addressbookHome(bookId).addresbook(bookName).get()
     * - List contacts: addressbookHome(bookId).addresbook(bookName).vcard().list(options)
     * - Search contacts: addressbookHome(bookId).addresbook(bookName).vcard().search(options)
     * - Get a contact: addressbookHome(bookId).addresbook(bookName).vcard(cardId).get()
     * - Create a contact: addressbookHome(bookId).addresbook(bookName).vcard().create(contact)
     * - Update a contact: addressbookHome(bookId).addresbook(bookName).vcard(cardId).update(contact)
     * - Remove a contact: addressbookHome(bookId).addresbook(bookName).vcard(cardId).remove(options)
     * @param  {String} bookId the addressbook home ID
     * @return {addressbook: function, search: function}
     */
    function addressbookHome(bookId) {
      function addressbook(bookName) {
        bookName = bookName || DEFAULT_ADDRESSBOOK_NAME;

        function list() {
          return listAddressbook(bookId);
        }

        function get() {
          return getAddressbook(bookId, bookName);
        }

        function vcard(cardId) {
          function get() {
            return getCard(bookId, bookName, cardId);
          }

          function list(options) {
            return listCard(bookId, bookName, options);
          }

          function search(options) {
            options.bookId = bookId;
            options.bookName = bookName;
            return searchCard(options);
          }

          function create(contact) {
            return createCard(bookId, bookName, contact);
          }

          function update(contact) {
            return updateCard(bookId, bookName, cardId, contact);
          }

          function remove(options) {
            return removeCard(bookId, bookName, cardId, options);
          }

          return {
            get: get,
            list: list,
            search: search,
            create: create,
            update: update,
            remove: remove
          };
        }
        return {
          list: list,
          get: get,
          vcard: vcard
        };
      }

      function search(options) {
        options.bookId = bookId;
        return searchCard(options);
      }

      return {
        addressbook: addressbook,
        search: search
      };
    }

    return {
      addressbookHome: addressbookHome
    };
  });
