CREATE VIEW "public"."knits_unite_all" AS
 SELECT api_calls.id,
    'api_calls'::text AS source
   FROM api_calls
UNION ALL
 SELECT content.id,
    'content'::text AS source
   FROM content
UNION ALL
 SELECT exchange_rates.id,
    'exchange_rates'::text AS source
   FROM exchange_rates
UNION ALL
 SELECT hosting_providers.id,
    'hosting_providers'::text AS source
   FROM hosting_providers
UNION ALL
 SELECT users.id,
    'users'::text AS source
   FROM users;

CREATE VIEW "public"."knits_check_integrity" AS
 SELECT knits.id AS id_knits,
    knits_unite_all.id AS id_unite,
    knits_unite_all.source
   FROM knits
     FULL JOIN knits_unite_all ON knits.id = knits_unite_all.id
  WHERE knits.id IS NULL OR knits_unite_all.id IS NULL;