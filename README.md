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

## How to check knits integrity

1. total count of records in knits table must be equal to total count of records in knits_unite_all view
	1. otherwise there are some errors in tables structure
1. total count of records in knits_check_integrity view must be 0
	1. if there are some records, it means there are errors in tables structure
	1. id_knits != null && id_unite == null && source == null - unused record in knits table. 
		1. solution: delete record or use it for creating entity
	1. id_knits == null && id_unite != null && source != null - unregistered record with id_unite from source table
		1. solution: add id_unite to knits table

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
			* Get user balance (c01ns)
			* Get user transaction history
		* View content frontend
			* api calls
				* text
				* html/css
				* svg
				* jpg
			* browser-side auth
				* login
				* favicon
					* debug why 404 doesn't work, why favicon rout doesn't work if it placed in the bottom of the declaration
					* fix app.get('/:knit', ...) api call rout
					* check correct work for all other calls
				* remove split('=') code from all api calls
				* balance
				* exchange rates
				* history
			* show content in browser by direct links
		* Implement integrity check
 			* remove useless debug auth.user0
			* restore heroku autobuild on github push
				* use github actions as described here: https://github.com/marketplace/actions/deploy-to-heroku
			* add table for api call entities
				* hardcode table
				* move table to db
			* check api calls in server code vs api calls table from db
				* if api call described in code but not described in db, then 500 error will be generated in run-time
				* if api call described in db but not described in code, then 404 error will be generated in run-time
			* all tables' pks must be stored in knits, every knits entry must have a corresponding record in some other table
				* implement
				* find and fix all integrity issues
				* write documentation how to check integrity
		* Move all api call prices from code to api call entities table
			* base api call price to api_calls
			* byte price to hosting_providers
			* read defaultHostingProvider from db and remove it from env
		* No limit for text content
			* now text content is limited by 8191 bytes cause of indexing mechanism
			* as a possible solution: index md5 of the content instead of full content
				* but only if content is too large for indexer
			* real solution:
				* learn all modern hashing algorithms
				* choose best one and sum technics avoiding collisions
					* hash function is sha-3 512
					* content hashsum = hash(content.text) + '+' + hash(hash(content.text)+content.text)
					* I think this approach will give minimal possible chance of collision, when diferent content will have the same hashsum
				* choose and connect sha-3 npm module
				* implement hashsum api call
					* simple get+param
					* universal post+body
				* add hashsum field to db and use it for automated control of content uniqueness
				* check matching text and hashsum on /:knit/read/:type
					* implement
					* check all content records
	* Make handy tools for content exchange
		* Add new content frontend
			* implement api call to add new content with text and hashsum
				* implement best case
				* handle errors
					* knit already occupied
					* hashsum already occupied
					* in case "knits insert success, content insert failed" don't create useless records in knits
					* other problem
			* `design and implement page to add content`
		* User dashboard frontend
		* View content frontend types extension
			* markdown
			* png
			* gif
		* Review content delivery usability in real content oriented communication
	* Balance economics
		* understand complete currency cycle
		* understand situation when user and provider is a same person
		* reset all users/providers balances/transactions and start well-balanced accounting from zero
			* instead of random numbers on balances
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
	* Think about tools for deleting content from the system
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
