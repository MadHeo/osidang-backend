-- public.clothes definition

-- Drop table

-- DROP TABLE public.clothes;

-- 옷정보 관리
CREATE TABLE public.clothes (
	id serial4 NOT NULL,
	user_id int4 NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	brand varchar(255) NULL,
	color varchar(50) NULL,
	image_url varchar(255) NULL,
	metadata jsonb NULL,
	created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT clothes_pkey PRIMARY KEY (id),
	CONSTRAINT clothes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

--옷계절 관리
-- public.clothes_seasons definition

-- Drop table

-- DROP TABLE public.clothes_seasons;

CREATE TABLE public.clothes_seasons (
	clothes_id int4 NOT NULL,
	season_id int2 NOT NULL,
	CONSTRAINT clothes_seasons_pkey PRIMARY KEY (clothes_id, season_id)
);


-- public.clothes_seasons foreign keys

ALTER TABLE public.clothes_seasons ADD CONSTRAINT clothes_seasons_clothes_id_fkey FOREIGN KEY (clothes_id) REFERENCES public.clothes(id) ON DELETE CASCADE;
ALTER TABLE public.clothes_seasons ADD CONSTRAINT clothes_seasons_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;

-- public.plan_items definition

-- Drop table

-- DROP TABLE public.plan_items;

CREATE TABLE public.plan_items (
	plan_id int4 NOT NULL,
	clothe_id int4 NOT NULL,
	CONSTRAINT plan_items_pkey PRIMARY KEY (plan_id, clothe_id)
);


-- public.plan_items foreign keys

ALTER TABLE public.plan_items ADD CONSTRAINT plan_items_clothe_id_fkey FOREIGN KEY (clothe_id) REFERENCES public.clothes(id) ON DELETE CASCADE;
ALTER TABLE public.plan_items ADD CONSTRAINT plan_items_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public."plans"(id) ON DELETE CASCADE;

-- public."plans" definition

-- Drop table

-- DROP TABLE public."plans";

CREATE TABLE public."plans" (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	title varchar(255) NOT NULL,
	description text NULL,
	"date" date NOT NULL,
	created_at timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT plans_pkey PRIMARY KEY (id)
);


-- public."plans" foreign keys

ALTER TABLE public."plans" ADD CONSTRAINT plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- public.privacy_policy_consents definition

-- Drop table

-- DROP TABLE public.privacy_policy_consents;

CREATE TABLE public.privacy_policy_consents (
	id serial4 NOT NULL,
	user_id int4 NULL,
	policy_version_id int4 NULL,
	consent_type varchar(50) NOT NULL,
	is_agreed bool NOT NULL,
	ip_address varchar(45) NULL,
	consent_date timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT privacy_policy_consents_pkey PRIMARY KEY (id)
);


-- public.privacy_policy_consents foreign keys

ALTER TABLE public.privacy_policy_consents ADD CONSTRAINT privacy_policy_consents_policy_version_id_fkey FOREIGN KEY (policy_version_id) REFERENCES public.privacy_policy_versions(id);
ALTER TABLE public.privacy_policy_consents ADD CONSTRAINT privacy_policy_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);



-- public.privacy_policy_versions definition

-- Drop table

-- DROP TABLE public.privacy_policy_versions;

CREATE TABLE public.privacy_policy_versions (
	id serial4 NOT NULL,
	"version" varchar(10) NOT NULL,
	"content" text NOT NULL,
	effective_date timestamp NOT NULL,
	created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT privacy_policy_versions_pkey PRIMARY KEY (id)
);

-- public.privacy_policy_versions definition

-- Drop table

-- DROP TABLE public.privacy_policy_versions;

CREATE TABLE public.privacy_policy_versions (
	id serial4 NOT NULL,
	"version" varchar(10) NOT NULL,
	"content" text NOT NULL,
	effective_date timestamp NOT NULL,
	created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT privacy_policy_versions_pkey PRIMARY KEY (id)
);

-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id serial4 NOT NULL,
	email varchar(255) NOT NULL,
	password_hash varchar(255) NOT NULL,
	created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	nickname varchar(50) NULL,
	is_email_verified bool NULL DEFAULT false,
	password_changed_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	refresh_token text NULL,
	refresh_token_expires_at timestamp NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);


-- public.verification_tokens definition

-- Drop table

-- DROP TABLE public.verification_tokens;

CREATE TABLE public.verification_tokens (
	id serial4 NOT NULL,
	user_id int4 NULL,
	"token" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	expires_at timestamp NOT NULL,
	created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	email varchar(255) NULL,
	verification_code varchar(6) NULL,
	CONSTRAINT verification_tokens_pkey PRIMARY KEY (id),
	CONSTRAINT verification_tokens_user_id_type_key UNIQUE (user_id, type)
);
CREATE INDEX idx_verification_tokens_email_code ON public.verification_tokens USING btree (email, verification_code);
CREATE INDEX idx_verification_tokens_email_type ON public.verification_tokens USING btree (email, type);


-- public.verification_tokens foreign keys

ALTER TABLE public.verification_tokens ADD CONSTRAINT verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- public.seasons definition

-- Drop table

-- DROP TABLE public.seasons;


-- 1	봄
-- 2	여름
-- 3	가을
-- 4	겨울
CREATE TABLE public.seasons (
	id serial4 NOT NULL,
	"name" varchar(50) NOT NULL,
	CONSTRAINT seasons_name_key UNIQUE (name),
	CONSTRAINT seasons_pkey PRIMARY KEY (id)
);