'use strict';

var Ical = require('ical.js');

function getId(contact) {
  return contact.contactId;
}
module.exports.getId = getId;

function denormalize(contact) {

  var result = {};

  var id = getId(contact);
  if (id) {
    result.id = id;
  }

  if (contact.bookId) {
    result.bookId = contact.bookId;
  }

  if (contact.bookName) {
    result.bookName = contact.bookName;
  }

  if (contact.contactId) {
    result.contactId = contact.contactId;
  }

  if (contact.user && contact.user._id) {
    result.userId = contact.user._id + '';
  }

  if (!contact.vcard || !contact.vcard[1] || !contact.vcard[1].length) {
    return result;
  }

  var vcard = new Ical.Component(contact.vcard);

  function getMultiValue(propName) {
    var props = vcard.getAllProperties(propName);
    return props.map(function(prop) {
      var data = {
        value: prop.getFirstValue()
      };
      var type = prop.getParameter('type');
      if (type) {
        data.type = type;
      }
      return data;
    });
  }

  function getMultiAddress(propName) {
    var props = vcard.getAllProperties(propName);
    return props.map(function(prop) {
      var propVal = prop.getFirstValue();
      return {
        full: propVal.join(' ').trim(),
        type: prop.getParameter('type'),
        street: propVal[2],
        city: propVal[3],
        zip: propVal[5],
        country: propVal[6]
      };
    });
  }

  result.uid = vcard.getFirstPropertyValue('uid');
  result.fn = vcard.getFirstPropertyValue('fn');

  var name = vcard.getFirstPropertyValue('n');
  result.name = name;
  result.firstName = name ? name[1] : '';
  result.lastName = name ? name[0] : '';

  result.emails = getMultiValue('email').map(function(mail) {
    mail.value = mail.value.replace(/^mailto:/i, '');
    return mail;
  });

  result.tel = getMultiValue('tel').map(function(num) {
    num.value = num.value.replace(/^tel:/i, '');
    return num;
  });

  result.job = vcard.getFirstPropertyValue('role');

  result.org = vcard.getFirstPropertyValue('org');
  result.urls = getMultiValue('url');

  var catprop = vcard.getFirstProperty('categories');
  var cats = catprop && catprop.getValues().concat([]);
  result.tags = cats ? cats.map(function(cat) { return { text: cat }; }) : [];

  var bday = vcard.getFirstProperty('bday');

  if (bday) {
    var type = bday.type;
    var value = bday.getFirstValue();

    result.birthday = type !== 'text' ? value.toJSDate() : value;
  }

  result.socialprofiles = getMultiValue('socialprofile');
  result.nickname = vcard.getFirstPropertyValue('nickname');
  result.addresses = getMultiAddress('adr');
  result.comments = vcard.getFirstPropertyValue('note');

  return result;
}
module.exports.denormalize = denormalize;
