(function() {
  'use strict';

  angular.module('linagora.esn.contact')
    .factory('searchContactProviderService', searchContactProviderService);

  function searchContactProviderService($q, newProvider, ContactAPIClient, session, CONTACT_GLOBAL_SEARCH) {

    return newProvider({
      name: CONTACT_GLOBAL_SEARCH.NAME,
      fetch: function(query) {
        var searchOptions = {
          data: query,
          userId: session.user._id
        };

        return function() {
          return ContactAPIClient
            .addressbookHome(session.user._id)
            .search(searchOptions)
            .then(function(response) {
              return response.data.map(function(contact) {
                contact.type = CONTACT_GLOBAL_SEARCH.TYPE;

                return contact;
              });
            });
        };
      },
      buildFetchContext: function(options) {
        return $q.when(options.query);
      },
      templateUrl: '/contact/views/providers/contact-search.html'
    });
  }
})();
