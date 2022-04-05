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

## c0ntent c01n exchange rates

* 1 RUB = ... 1,000,000 C10N
* 1 INR = ... 1,200,000 C10N
* 1 CNY = .. 14,200,000 C10N
* 1 USD = .. 90,000,000 C10N
* 1 EUR = . 100,000,000 C10N

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
	* Remove useless cors
	* Implement automated api call charges
		* Debit user
		* Credit hosting provider
		* Determine basic financial rules
			* Name of the currency stored in balance fields
			* Cost of a single /knit/generate in thе currency
			* Exchange rate for fiat money to thе currency and vice versa
* Check knit-integrity of the db
	* Add api call to extract timestamp from knit
	* Fix date 2022-03-29 07:28:24.182474 for knit record
* Sell first c01ns for fiat money
	* Implement simplest content delivery with automated payment transactions.
		* View content by api call with provider fee
		* Copyright fee
			* Placeholder
			* Author fee management for content records
		* Transactions log
			* Add table
			* Write log after every internal transaction
				* Implementation
				* Testing
			* Add api calls for external transactions with logging
				* Deposit and withdraw with placeholder currency conversion
					* Implementation
					* Testing 1
					* Count provider currenct amount for every currency
					* Testing 2
				* Migrate c0ntent.dao hosting to safe organisation
				* Correct currency conversion
					* Implementation
						* Add content records for all main currencies: rub, inr, cny, usd, eur
						* Add exchange rate table
						* Implement exchange rate api
						* Use exchange rates in convertCurrencyToC01n
					* Testing
		* Establish backup process
			* db
			* Insomnia collections
		* Migrate knyte.space hosting to safe organisation
			* Divide one payed db instance to 2 free instances
			* Dispose payed db instance to save money
		* User dashboard api calls to check balance and track transactions
			* `Get user balance (c01ns)`
			* Get user transaction history
			* Get provider balance (c01ns and all currencies)
			* Get provider transaction history
		* View content frontend
			* html/css
			* text
			* svg
			* png/jpg
		* User dashboard frontend
		* Implement integrity check
			* All tables' pks must be stored in knits, every knits entry must have a corresponding record in some other table
	* Post some exclusive content on the platform
		* c0ntent
		* r0sa
			* Transfere all useful content
				* from [https://r0sa.net/](https://r0sa.net/), [https://knyte.io/](https://knyte.io/), [https://organiq.dev/](https://organiq.dev/), [https://metalanguage.tech/](https://metalanguage.tech/) to [https://c0ntent.herokuapp.com/](https://c0ntent.herokuapp.com/)
			* Dispose separated websites' public content, make links to c0ntent instead
		* РОСА
		* Jeet
		* Balaji
	* Organize c0ntent community
		* Add at least 5 interested members
		* Make exclusive presentation of c0ntent by c0ntent itself
		* Organize first c01n sale inside of the community
* Raise funds for the project development
* Research best db for the transactions log, because postgresql is too much costly
	* Check out ClickHouse first
* Build semantic graph upon content storage.
	* Visualisation
	* Editor
	* Implementation
	* Recursive content space with references
	* Search Engine
* Transfere all useful data/functionality from [https://knyte-space.herokuapp.com/](https://knyte-space.herokuapp.com/) to [https://c0ntent.herokuapp.com/](https://c0ntent.herokuapp.com/).
	* Review and move
	* Close knyte-space branch to have a single origin of truth