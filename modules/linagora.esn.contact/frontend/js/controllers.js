'use strict';

angular.module('linagora.esn.contact')

  .controller('newContactController', function($rootScope, $scope, $route, $location, contactsService, notificationFactory, sendContactToBackend, displayContactError, closeContactForm, gracePeriodService, openContactForm, sharedContactDataService, $q, headerService) {
    $scope.bookId = $route.current.params.bookId;
    $scope.contact = sharedContactDataService.contact;

    headerService.subHeader.addInjection('contact-create-subheader', $scope);
    $scope.$on('$routeChangeStart', function() {
      headerService.subHeader.resetInjections();
    });

    $scope.close = closeContactForm;
    $scope.accept = function() {
      return sendContactToBackend($scope, function() {
        return contactsService.create($scope.bookId, $scope.contact).then(null, function(err) {
          notificationFactory.weakError('Contact creation', err && err.message || 'The contact cannot be created, please retry later');

          return $q.reject(err);
        });
      }).then(function() {
        $location.url('/contact/show/' + $scope.bookId + '/' + $scope.contact.id);
      }, function(err) {
        displayContactError(err);

        return $q.reject(err);
      }).then(function() {
        return gracePeriodService.clientGrace('You have just created a new contact (' + $scope.contact.displayName + ').', 'Cancel and back to edition')
            .then(function(data) {
              if (data.cancelled) {
                contactsService.remove($scope.bookId, $scope.contact).then(function() {
                    data.success();
                    openContactForm($scope.bookId, $scope.contact);
                  }, function(err) {
                    data.error('Cannot cancel contact creation, the contact is created');
                    return $q.reject(err);
                  });
              }
            });
      });
    };

    sharedContactDataService.contact = {};
  })
  .controller('showContactController', function($log, $scope, sharedContactDataService, DisplayShellProvider, $rootScope, ContactsHelper, CONTACT_DEFAULT_AVATAR, $timeout, $route, contactsService, notificationFactory, sendContactToBackend, displayContactError, closeContactForm, $q, CONTACT_EVENTS, gracePeriodService, $window, contactUpdateDataService, headerService) {
    $scope.defaultAvatar = CONTACT_DEFAULT_AVATAR;
    $scope.bookId = $route.current.params.bookId;
    $scope.cardId = $route.current.params.cardId;
    $scope.contact = {};
    $scope.loaded = false;

    headerService.subHeader.addInjection('contact-show-subheader', $scope);
    $scope.$on('$routeChangeStart', function() {
      headerService.subHeader.resetInjections();
    });

    function isAddressFilled(type) {
      if (!$scope.contact.addresses || !$scope.contact.addresses.length) {
        return false;
      }
      return $scope.contact.addresses.filter(function(address) {
        return address.type.toLowerCase() === type.toLowerCase();
      }).length;
    }

    $scope.fillContactData = function(contact) {
      ContactsHelper.fillScopeContactData($scope, contact);
      $scope.displayShell  = DisplayShellProvider.convertToDisplayShell(contact);
    };

    $scope.getAddress = function(type) {
      return $scope.contact.addresses.filter(function(address) {
        return address.type.toLowerCase() === type.toLowerCase();
      })[0];
    };

    $scope.close = closeContactForm;

    $scope.deleteContact = function() {
      closeContactForm();
      $timeout(function() {
        contactsService.deleteContact($scope.bookId, $scope.contact);
      }, 200);
    };

    $scope.shouldDisplayWork = function() {
      return !!($scope.contact.orgName || $scope.contact.orgRole || isAddressFilled('work'));
    };

    $scope.shouldDisplayHome = function() {
      return !!(isAddressFilled('home') || $scope.formattedBirthday || $scope.contact.nickname);
    };

    $scope.shouldDisplayOthers = function() {
      return !!(isAddressFilled('other') || ($scope.contact.tags && $scope.contact.tags.length) || $scope.contact.notes || ($scope.contact.urls && $scope.contact.urls.length));
    };

    if (contactUpdateDataService.contact) {

      $scope.fillContactData(contactUpdateDataService.contact);

      $scope.$on('$routeChangeStart', function(evt, next, current) {
        gracePeriodService.flush(contactUpdateDataService.taskId);
        // check if the user edit the contact again
        if (next && next.originalPath && next.params &&
            next.originalPath === '/contact/edit/:bookId/:cardId' &&
            next.params.bookId === $scope.bookId &&
            next.params.cardId === $scope.cardId) {
          // cache the contact to show in editContactController
          contactUpdateDataService.contact = $scope.contact;
        } else {
          contactUpdateDataService.contact = null;
        }
      });

      $scope.$on(CONTACT_EVENTS.CANCEL_UPDATE, function(evt, data) {
        if (data.id === $scope.cardId) {
          $scope.contact = data;
        }
      });

      $window.addEventListener('beforeunload', function() {
        gracePeriodService.flush(contactUpdateDataService.taskId);
      });

      $scope.loaded = true;
    } else {
      contactsService.getCard($scope.bookId, $scope.cardId).then($scope.fillContactData,
        function(err) {
        $log.debug('Error while loading contact', err);
        $scope.error = true;
        displayContactError('Cannot get contact details');
      }).finally(function() {
        $scope.loaded = true;
      });
    }

    sharedContactDataService.contact = {};
  })
  .controller('editContactController', function($scope, $q, displayContactError, closeContactForm, $rootScope, $timeout, $location, notificationFactory, sendContactToBackend, $route, gracePeriodService, contactsService, ContactShell, CONTACT_DEFAULT_AVATAR, GRACE_DELAY, gracePeriodLiveNotification, CONTACT_EVENTS, contactUpdateDataService, headerService) {
    $scope.loaded = false;
    $scope.bookId = $route.current.params.bookId;
    $scope.cardId = $route.current.params.cardId;
    $scope.defaultAvatar = CONTACT_DEFAULT_AVATAR;

    headerService.subHeader.addInjection('contact-edit-subheader', $scope);
    $scope.$on('$routeChangeStart', function() {
      headerService.subHeader.resetInjections();
    });

    var oldContact = '';
    if (contactUpdateDataService.contact) {
      $scope.contact = contactUpdateDataService.contact;
      $scope.contact.vcard = contactsService.shellToVCARD($scope.contact);
      contactUpdateDataService.contact = null;
      oldContact = JSON.stringify($scope.contact);
      $scope.loaded = true;
    } else {
      contactsService.getCard($scope.bookId, $scope.cardId).then(function(card) {
        $scope.contact = card;
        oldContact = JSON.stringify(card);
      }, function() {
        $scope.error = true;
        displayContactError('Cannot get contact details');
      }).finally(function() {
        $scope.loaded = true;
      });
    }

    function isContactModified() {
      return oldContact !== JSON.stringify($scope.contact);
    }

    $scope.close = function() {
      $location.path('/contact/show/' + $scope.bookId + '/' + $scope.cardId);
    };

    $scope.save = function() {
      if (!isContactModified()) {
        return $scope.close();
      }
      return sendContactToBackend($scope, function() {
        return contactsService.modify($scope.bookId, $scope.contact).then(function(taskId) {
          contactUpdateDataService.contact = $scope.contact;
          contactUpdateDataService.taskId = taskId;

          gracePeriodLiveNotification.registerListeners(
            taskId, function() {
              notificationFactory.strongError('', 'Failed to update contact, please try again later');
              $rootScope.$broadcast(CONTACT_EVENTS.CANCEL_UPDATE, new ContactShell($scope.contact.vcard, $scope.contact.etag));
            }
          );

          $scope.close();

          return gracePeriodService.grace(taskId, 'You have just updated a contact.', 'Cancel')
            .then(function(data) {
              if (data.cancelled) {
                return gracePeriodService.cancel(taskId).then(function() {
                  data.success();
                  $rootScope.$broadcast(CONTACT_EVENTS.CANCEL_UPDATE, new ContactShell($scope.contact.vcard, $scope.contact.etag));
                }, function(err) {
                  data.error('Cannot cancel contact update');
                });
              } else {
                gracePeriodService.remove(taskId);
              }
            });
        });
      }).then(null, function(err) {
        displayContactError('The contact cannot be edited, please retry later');
        return $q.reject(err);
      });
    };

    $scope.deleteContact = function() {
      closeContactForm();
      $timeout(function() {
        contactsService.deleteContact($scope.bookId, $scope.contact);
      }, 200);
    };

  })
  .controller('contactsListController', function($log, $scope, $q, $timeout, usSpinnerService, $location, contactsService, AlphaCategoryService, ALPHA_ITEMS, user, displayContactError, openContactForm, ContactsHelper, gracePeriodService, $window, searchResultSizeFormatter, headerService, CONTACT_EVENTS, CONTACT_LIST_DISPLAY, sharedContactDataService) {
    var requiredKey = 'displayName';
    var SPINNER = 'contactListSpinner';
    $scope.user = user;
    $scope.bookId = $scope.user._id;
    $scope.keys = ALPHA_ITEMS;
    $scope.sortBy = requiredKey;
    $scope.prefix = 'contact-index';
    $scope.searchResult = {};
    $scope.categories = new AlphaCategoryService({keys: $scope.keys, sortBy: $scope.sortBy, keepAll: true, keepAllKey: '#'});
    $scope.lastPage = false;
    $scope.searchFailure = false;
    $scope.totalHits = 0;
    $scope.displayAs = CONTACT_LIST_DISPLAY.list;
    $scope.currentPage = 0;
    $scope.searchMode = false;

    headerService.subHeader.addInjection('contact-list-subheader', $scope);
    $scope.$on('$routeChangeStart', function(evt, next) {
      headerService.subHeader.resetInjections();

      // store the search query so the search list can be restored when the user
      // switches back to contacts list
      if (next.originalPath === '/contact/show/:bookId/:cardId' ||
          next.originalPath === '/contact/edit/:bookId/:cardId') {
        sharedContactDataService.searchQuery = $scope.searchInput;
      } else {
        sharedContactDataService.searchQuery = null;
      }
    });

    function fillRequiredContactInformation(contact) {
      if (!contact[requiredKey]) {
        var fn = ContactsHelper.getFormattedName(contact);
        if (!fn) {
          fn = contact.id;
        }
        contact[requiredKey] = fn;
      }
      return contact;
    }

    function addItemsToCategories(data) {
      return $scope.$applyAsync(function() {
        data = data.map(fillRequiredContactInformation);
        $scope.categories.addItems(data);
        $scope.sorted_contacts = $scope.categories.get();
      });
    }

    function cleanCategories() {
      $scope.categories.init();
      delete $scope.sorted_contacts;
    }

    function setSearchResults(data) {
      $scope.searchResult.data = ($scope.searchResult.data) ? $scope.searchResult.data.concat(data.hits_list) : data.hits_list;
      $scope.searchResult.count = data.total_hits || 0;
      $scope.searchResult.formattedResultsCount = searchResultSizeFormatter($scope.searchResult.count);
    }

    function cleanSearchResults() {
      $scope.searchResult = {};
      $scope.totalHits = 0;
    }

    $scope.openContactCreation = function() {
      openContactForm($scope.bookId);
    };

    $scope.$on(CONTACT_EVENTS.CREATED, function(e, data) {
      if ($scope.searchInput) { return; }
      addItemsToCategories([data]);
    });

    $scope.$on(CONTACT_EVENTS.UPDATED, function(e, data) {
      if ($scope.searchInput) { return; }
      $scope.categories.replaceItem(fillRequiredContactInformation(data));
    });

    $scope.$on(CONTACT_EVENTS.DELETED, function(e, contact) {
      if ($scope.searchInput) {
        contact.deleted = true;
      } else {
        $scope.categories.removeItemWithId(contact.id);
      }

    });

    $scope.$on(CONTACT_EVENTS.CANCEL_DELETE, function(e, data) {
      if ($scope.searchInput) {
        data.deleted = false;
      } else {
        addItemsToCategories([data]);
      }

    });

    $scope.$on('$destroy', function() {
      gracePeriodService.flushAllTasks();
    });

    $scope.$on('$routeUpdate', function() {
      if (!$location.search().q) {
        if (!$scope.searchInput) {return;}
        $scope.searchInput = null;
        return $scope.search();
      }
      if ($location.search().q.replace(/\+/g, ' ') !== $scope.searchInput) {
        $scope.searchInput = $location.search().q.replace(/\+/g, ' ');
        return $scope.search();
      }
    });

    $window.addEventListener('beforeunload', gracePeriodService.flushAllTasks);

    $scope.appendQueryToURL = function() {
      if ($scope.searchInput) {
        $location.search('q', $scope.searchInput.replace(/ /g, '+'));
        return;
      }
      $location.search('q', null);
    };

    function searchFailure(err) {
      $log.error('Can not search contacts', err);
      displayContactError('Can not search contacts');
      $scope.searchFailure = true;
    }

    function loadPageComplete() {
      $scope.loadingNextContacts = false;
      usSpinnerService.stop(SPINNER);
    }

    function switchToList() {
      $scope.searchMode = false;
      $scope.currentPage = 0;
      $scope.nextPage = 0;
      cleanSearchResults();
      $scope.loadContacts();
    }

    $scope.search = function() {
      if ($scope.searching) {
        return;
      }

      $scope.appendQueryToURL();
      cleanSearchResults();
      cleanCategories();
      if (!$scope.searchInput) {
        return switchToList();
      }
      $scope.searching = true;
      $scope.searchMode = true;
      $scope.nextPage = null;
      $scope.currentPage = 1;
      $scope.searchFailure = false;
      $scope.loadingNextContacts = true;
      $scope.lastPage = false;
      getSearchResults().finally(function() {
        $scope.searching = false;
      });
    };

    function getSearchResults() {
      $log.debug('Searching contacts, page', $scope.currentPage);
      usSpinnerService.spin(SPINNER);
      return contactsService.search($scope.bookId, $scope.user._id, $scope.searchInput, $scope.currentPage).then(function(data) {
          setSearchResults(data);
          $scope.currentPage = data.current_page;
          $scope.totalHits = $scope.totalHits + data.hits_list.length;
          if ($scope.totalHits === data.total_hits) {
            $scope.lastPage = true;
          }
        }, searchFailure
      ).finally(loadPageComplete);
    }

    function getNextContacts() {
      $log.debug('Load next contacts, page', $scope.currentPage);
      usSpinnerService.spin(SPINNER);

      contactsService.list($scope.bookId, $scope.user._id, {
        page: $scope.nextPage || $scope.currentPage,
        paginate: true
      }).then(function(data) {
        addItemsToCategories(data.contacts);
        $scope.lastPage = data.last_page;
        $scope.nextPage = data.next_page;
      }, function(err) {
        $log.error('Can not get contacts', err);
        displayContactError('Can not get contacts');
      }).finally(loadPageComplete);
    }

    function updateScrollState() {
      if ($scope.loadingNextContacts) {
        return $q.reject();
      }
      $scope.loadFailure = false;
      $scope.loadingNextContacts = true;
      $scope.currentPage = parseInt($scope.nextPage) || parseInt($scope.currentPage) + 1;
      return $q.when();
    }

    function ongoingScroll() {
      $log.debug('Scroll search is already ongoing');
    }

    function scrollSearchHandler() {
      updateScrollState().then(getSearchResults, ongoingScroll);
    }

    $scope.loadContacts = function() {
      updateScrollState().then(getNextContacts, ongoingScroll);
    };

    $scope.scrollHandler = function() {
      $log.debug('Infinite Scroll down handler');
      if ($scope.searchInput) {
        return scrollSearchHandler();
      }
      $scope.loadContacts();
    };

    if ($location.search().q) {
      $scope.searchInput = $location.search().q.replace(/\+/g, ' ');
      $scope.search();
    } else if (sharedContactDataService.searchQuery) {
      $location.search('q', sharedContactDataService.searchQuery.replace(/ /g, '+'));
    } else {
      $scope.searchInput = null;
      $scope.loadContacts();
    }

    $scope.clearSearchInput = function() {
      $scope.searchInput = null;
      $scope.appendQueryToURL();
      switchToList();
    };

  })
  .controller('contactAvatarModalController', function($scope, selectionService) {
    $scope.imageSelected = function() {
      return !!selectionService.getImage();
    };

    $scope.saveContactAvatar = function() {
      if (selectionService.getImage()) {
        $scope.loading = true;
        selectionService.getBlob('image/png', function(blob) {
          var reader = new FileReader();
          reader.onloadend = function() {
            $scope.contact.photo = reader.result;
            selectionService.clear();
            $scope.loading = false;
            $scope.modal.hide();
            $scope.$apply();
            $scope.modify();
          };
          reader.readAsDataURL(blob);
        });
      }
    };
  })

  .controller('contactHeaderController', function($scope, CONTACT_SCROLL_EVENTS) {
    $scope.headerDisplay = {
      categoryLetter: ''
    };
    $scope.$on(CONTACT_SCROLL_EVENTS, function(event, data) {
      $scope.headerDisplay.letterExists = data !== '';
      $scope.$applyAsync(function() {
        $scope.headerDisplay.categoryLetter = data;
      });
    });
  })

  .controller('contactItemController', function($scope, $rootScope, $location, $window, contactsService, ContactsHelper) {

    ContactsHelper.fillScopeContactData($scope, $scope.contact);

    $scope.displayContact = function() {
      // use url instead of path to remove search and hash from URL
      $location.url('/contact/show/' + $scope.bookId + '/' + $scope.contact.id);
    };

    $scope.actionClick = function(event, action) {
      if (action.indexOf('http') === 0) {
        $window.open(action);
      }
      event.stopPropagation();
    };

    $scope.deleteContact = function() {
      contactsService.deleteContact($scope.bookId, $scope.contact);
    };
  });
