# Content Publishing Ecosystem

Content publishing ecosystem to organize content exchange between authors and consumers on p2p payment basis.

## Possible domains for web3 entry point and identification

* c0ntent.dao
* c0ntent.nft

## Possible domains for web2 entry point

* c0ntent.io
* c0ntent.me
* c0ntent.us
* c0ntent.pub
* c0ntent.eco
* c0ntent.net
* c0ntent.org
* c0ntent.xyz
* c0ntent.tech
* c0ntent.online

## Technical entry point

[https://c0ntent.herokuapp.com/](https://c0ntent.herokuapp.com/)

## Technology stack

* GitHub
* Heroku
* PostgreSQL
* Node.js

## Roles

* Hosting provider
	* Provide resources of the ecosystem via api calls
	* Each api call is charged - users pay to hosting providers
* User
	* Use resources of hosting provider
* Author
	* Add original content to the ecosystem
* Consumer
	* Watch content

## How to add new entity

1. Ensure that you are hosting provider and have an access to c0ntent db
1. Generate new id by https://c0ntent.herokuapp.com/knit/generate
1. Add it to knits table with default creation field
1. Use this id as pk for new record in users or content table

## How users communicate with hosting provider

1. Request registration
	1. Give your name
	1. Get your user id
1. Request content creation
	1. Give user id and textual content
	1. Get content id or justified refusal

## Work Plan

* Organize content storage with authorship.
	* Simple unique content table
	* Authentication
	* Migration from standard UUID v4 to COMB (combined time-GUID)
		* https://www.npmjs.com/package/ordered-uuid-v4
			* Generate COMB UUID by https://c0ntent.herokuapp.com/knit/new
			* Replace all standard UUIDs by COMB UUIDs in c0ntent db
	* Prevent users.id to be added to content.id and vise versa
		* Add knits table as aggregation of all ids from all other tables
		* Rename /knit/new to /knit/generate
		* Describe manual process of adding new entities (users, content)
		* Add new content
		* Add new user
	* Authorization
		* Implemented by direct communication with hosting provider
		* Formalise communication rules
* Establish role of hosting provider in the system.
	* Describe roles
	* Implement hosting provider table with balance storage
	* Implement user balance storage
	* Implement user authentication for api calls
		* Serverside decoding of basic auth
		* Connect server to pg db
		* Check auth for every api call 
	* `Remove useless cors`
	* Implement automated api call charges
* Establish process for db backups
* Establish process for insomnia calls backups
* Implement simplest content delivery with automated payment transactions.
	* View content by direct link
	* User dashboard to check balance and track transactions
* Build semantic graph upon content storage.
	* Visualisation
	* Editor
	* Implementation
	* Recursive content space with references
	* Search Engine
* Transfere all useful data from [https://knyte-space.herokuapp.com/](https://knyte-space.herokuapp.com/) to [https://c0ntent.herokuapp.com/](https://c0ntent.herokuapp.com/). Then dispose knyte-space DB instance in Heroku to save money.
* Transfere all useful content from [https://r0sa.net/](https://r0sa.net/), [https://knyte.io/](https://knyte.io/), [https://organiq.dev/](https://organiq.dev/), [https://metalanguage.tech/](https://metalanguage.tech/) to [https://c0ntent.herokuapp.com/](https://c0ntent.herokuapp.com/). Then dispose separated websites' public content, make links to c0ntent instead.