# /api/domains

## GET /api/domains

Get the list of ESN domains

**Request Parameters**

- limit (int): The number of domains to return. This will only keep the N first domains (where N=limit). Default value is 50.
- offset (int): Start the list of domains after skipping N domains (where N=offset). For example, if the size of the domains list is 100 and the offset is 50, the result list will contain only domains from 50 to 99 (list index starts at index 0).

**Request Headers:**

- Accept: application/json

**Response Headers:**

- X-ESN-Items-Count: The number of domains in the result list
- Content-Length: Document size
- Content-Type: application/json

**Status Codes:**

- 200 OK. With the list of domains
- 401 Unauthorized. The user is not authenticated on the platform.
- 403 Forbidden. The user is not a platform admin.

**Request:**

    GET /api/domains
    Accept: application/json
    Host: localhost:8080

**Response:**

    HTTP/1.1 200 OK
    X-ESN-Items-Count: 2
    [
        {
            "name": "foo",
            "company_name": "Foo",
            "timestamps": {
              "creation": ISODate("2016-06-23T16:24:07.383Z")
            }
        },
        {
            "name": "bar",
            "company_name": "Bar",
            "timestamps": {
              "creation": ISODate("2016-06-23T16:24:07.383Z")
            }
        }
    ]

## POST /api/domains

Create an ESN domain.

**Request Headers:**

- Accept: application/json

**Request JSON Object:**

- name: The domain name
- company_name: The company name

**Response Headers:**

- Content-Length: Document size

**Status Codes:**

- 201 Created. The domain has been created.
- 400 Bad Request. Invalid request body or parameters.
- 401 Unauthorized. The user is not authenticated on the platform.
- 403 Forbidden. The user is not a platform admin.

**Request:**

    POST /api/domains
    Accept: application/json
    Host: localhost:8080
    {
      "name": "foo",
      "company_name": "bar"
    }

**Response:**

    HTTP/1.1 201 Created
    {
      "name": "foo",
      "company_name": "bar",
      "timestamps" : {
        "creation" : ISODate("2017-05-05T03:32:26.822Z")
       },
       "administrators" : [
         {
           "user_id" : ObjectId("590bf24a20e78227e01e5ec9"),
           "timestamps" : {
             "creation" : ISODate("2017-05-05T03:32:26.822Z")
           }
         }
       ]
    }

## GET /api/domains/{domain_id}

Get the domain information.

**Parameters**

- domain_id: The domain ID

**Request Headers:**

- Accept: application/json

**Response Headers**

- Content-Length: Document size

**Response JSON Object:**

- The domain object

**Status Codes:**

- 200 OK
- 401 Unauthorized. The user is not authenticated on the platform.
- 403 Forbidden. The user is not a member of the domain.

**Request:**

    GET /api/domains/538e3bd6654d7c3307f990fa
    Accept: application/json
    Host: localhost:8080

**Response:**

    HTTP/1.1 200 OK
    {
      "name": "foo",
      "company_name": "bar"
    }

## GET /api/domains/{domain_id}/members

Get the list of members for a domain.

**Parameters**

- domain_id: The domain ID

**Request Parameters**

- limit (int): The number of members to return. This will only keep the N first members (where N=limit). Default value is 50.
- offset (int): Start the list of members after skipping N members (where N=offset). For example, if the size of the members list is 100 and the offset is 50, the result list will contain only members from 50 to 99 (list index starts at index 0).
- search (string): Search the members "firstname", "lastname" and "email" fields in case insensitive and accent agnostic way. Note that when there are more than one word in the search string (separated by one or more spaces), the search will become an AND. For example: 'search=foo bar' will search members where firstname, lastname and email contain foo AND bar.

**Request Headers:**

- Accept: application/json

**Response Headers:**

- X-ESN-Items-Count: The number of members in the result list
- Content-Length: Document size
- Content-Type: application/json

**Status Codes:**

- 200 OK. With the list of members
- 400 Bad Request. Invalid request body or parameters
- 404 Not Found. The domain has not been found

**Request:**

    GET /api/domains/538e3bd6654d7c3307f990fa/members
    Accept: application/json
    Host: localhost:8080

**Response:**

    HTTP/1.1 200 OK
    X-ESN-Items-Count: 2
    [
        {
            _id: 537e3db7654d7d592ef679e5,
            firstname: "John",
            lastname: "Doe",
            emails: ["johndoe@linagora.com"]
        },
        {
            _id: 537e3db7654d7d592ef679e6,
            firstname: "Foo",
            lastname: "Bar",
            emails: ["foobar@linagora.com"]
        },
    ]

## POST /api/domains/{domain_id}/invitations

Invite people to join a domain.
Only the domain manager is able to invite people to join a domain.

**Parameters**

- domain_id: The domain ID

**Request JSON Object:**

- Array of email addresses

**Response Headers**

- Content-Length: Document size

**Status Codes:**

- 202 Accepted. The request has been received and an invitation will be sent to each email of the list.
- 400 Bad Request. Invalid request body or parameters.
- 403 Forbidden. The user who created the request is not the domain manager and is not authorized to invite people.

**Request:**

    POST /api/domains/538e3bd6654d7c3307f990fa/invitations
    Accept: application/json
    Host: localhost:8080
    ['foo@bar.com', 'bar@baz.com', 'baz']

**Response:**

    HTTP/1.1 202 Accepted

## GET /api/domains/{domain_id}/manager

Check if the authenticated user is the domain manager

**Parameters**

- domain_id: The domain ID

**Request Headers:**

- Accept: application/json

**Response Headers**

- Content-Length: Document size

**Response JSON Object:**

- The domain object

**Status Codes:**

- 200 OK. The authenticated user is the domain manager
- 403 Forbidden. The authenticated user is not the domain manager

**Request:**

    GET /api/domains/538e3bd6654d7c3307f990fa/manager
    Accept: application/json
    Host: localhost:8080

**Response:**

    HTTP/1.1 200 OK
    {
      "name": "foo",
      "company_name": "bar"
    }
