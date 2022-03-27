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

## Work Plan

* Organize content storage with authorship and tariffication.
	* Simple unique content table
	* Authentication
	* Migration from standard UUID v4 to COMB (combined time-GUID)
		* https://www.npmjs.com/package/ordered-uuid-v4
			* Generate COMB UUID by https://c0ntent.herokuapp.com/knit/new
			* Replace all standard UUIDs by COMB UUIDs in c0ntent db
	* Prevent users.id to be added to content.id and vise versa
		* Add knits table as aggregation of all ids from all other tables
		* `Add new content and users only via special api`
			* This api first trys to add id to knits, and only then to specified table
	* Authorization	
* Establish role of hosting provider.
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