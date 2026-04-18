import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial forum platform migration.
 *
 * Creates:
 *   - Shared extensions (citext, pgcrypto for gen_random_uuid, uuid-ossp backup).
 *   - `public.schema_registry` — maps community_code → tenant schema.
 *   - PL/pgSQL helper `forum_create_schema(schema_name text)` that builds all
 *     `forum_*` tables + indexes + triggers inside the target schema. Callers
 *     (onboarding webhook; this migration for the dev community) invoke it to
 *     provision a community.
 *   - Seeds the dev community `COM96179941` and calls the helper to create its
 *     schema `forum_com96179941`.
 *
 * Re-running is safe: every statement is `IF NOT EXISTS` or protected by
 * `CREATE OR REPLACE`.
 */
export class InitForumPlatform1729200001000 implements MigrationInterface {
  name = 'InitForumPlatform1729200001000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "citext"`);
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS public.schema_registry (
        community_code  text PRIMARY KEY,
        org_id          text NOT NULL,
        schema_name     text NOT NULL UNIQUE,
        display_name    text NOT NULL,
        status          text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','suspended','archived')),
        metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      )
    `);

    await q.query(`
      CREATE OR REPLACE FUNCTION public.forum_create_schema(p_schema text)
      RETURNS void
      LANGUAGE plpgsql
      AS $fn$
      BEGIN
        IF p_schema !~ '^[a-z0-9_]{1,63}$' THEN
          RAISE EXCEPTION 'invalid schema name: %', p_schema;
        END IF;

        EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema);

        -- forum_tags
        EXECUTE format($ddl$
          CREATE TABLE IF NOT EXISTS %I.forum_tags (
            id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            slug        citext NOT NULL UNIQUE,
            label       text NOT NULL,
            color       text NOT NULL,
            is_system   boolean NOT NULL DEFAULT false,
            created_at  timestamptz NOT NULL DEFAULT now()
          )
        $ddl$, p_schema);

        -- forum_posts
        EXECUTE format($ddl$
          CREATE TABLE IF NOT EXISTS %I.forum_posts (
            id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            author_user_id     text NOT NULL,
            title              varchar(200) NOT NULL,
            body               text NOT NULL,
            excerpt            text GENERATED ALWAYS AS (left(body, 280)) STORED,
            upvote_count       integer NOT NULL DEFAULT 0,
            reply_count        integer NOT NULL DEFAULT 0,
            is_pinned          boolean NOT NULL DEFAULT false,
            is_locked          boolean NOT NULL DEFAULT false,
            hidden_at          timestamptz NULL,
            hidden_by_user_id  text NULL,
            hide_reason        text NULL,
            created_at         timestamptz NOT NULL DEFAULT now(),
            updated_at         timestamptz NOT NULL DEFAULT now(),
            deleted_at         timestamptz NULL,
            search_tsv         tsvector GENERATED ALWAYS AS (
                                 setweight(to_tsvector('english', coalesce(title,'')),'A') ||
                                 setweight(to_tsvector('english', coalesce(body,'')),'B')
                               ) STORED
          )
        $ddl$, p_schema);
        EXECUTE format('CREATE INDEX IF NOT EXISTS forum_posts_tsv_idx ON %I.forum_posts USING gin(search_tsv)', p_schema);
        EXECUTE format('CREATE INDEX IF NOT EXISTS forum_posts_created_idx ON %I.forum_posts (created_at DESC) WHERE deleted_at IS NULL', p_schema);
        EXECUTE format('CREATE INDEX IF NOT EXISTS forum_posts_top_idx ON %I.forum_posts (upvote_count DESC, created_at DESC) WHERE deleted_at IS NULL', p_schema);
        EXECUTE format('CREATE INDEX IF NOT EXISTS forum_posts_pinned_idx ON %I.forum_posts (is_pinned DESC, created_at DESC) WHERE deleted_at IS NULL', p_schema);

        -- forum_post_tags (join)
        EXECUTE format($ddl$
          CREATE TABLE IF NOT EXISTS %I.forum_post_tags (
            post_id  uuid NOT NULL REFERENCES %I.forum_posts(id) ON DELETE CASCADE,
            tag_id   uuid NOT NULL REFERENCES %I.forum_tags(id)  ON DELETE RESTRICT,
            PRIMARY KEY (post_id, tag_id)
          )
        $ddl$, p_schema, p_schema, p_schema);
        EXECUTE format('CREATE INDEX IF NOT EXISTS forum_post_tags_tag_idx ON %I.forum_post_tags (tag_id)', p_schema);

        -- Enforce max 3 tags per post via trigger
        EXECUTE format($ddl$
          CREATE OR REPLACE FUNCTION %I.forum_post_tags_enforce_max() RETURNS trigger
          LANGUAGE plpgsql AS $t$
          BEGIN
            IF (SELECT count(*) FROM %I.forum_post_tags WHERE post_id = NEW.post_id) >= 3 THEN
              RAISE EXCEPTION 'TAGS_OVER_LIMIT' USING ERRCODE = 'check_violation';
            END IF;
            RETURN NEW;
          END
          $t$
        $ddl$, p_schema, p_schema);
        EXECUTE format('DROP TRIGGER IF EXISTS forum_post_tags_enforce_max ON %I.forum_post_tags', p_schema);
        EXECUTE format('CREATE TRIGGER forum_post_tags_enforce_max BEFORE INSERT ON %I.forum_post_tags FOR EACH ROW EXECUTE FUNCTION %I.forum_post_tags_enforce_max()', p_schema, p_schema);

        -- forum_replies
        EXECUTE format($ddl$
          CREATE TABLE IF NOT EXISTS %I.forum_replies (
            id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id            uuid NOT NULL REFERENCES %I.forum_posts(id) ON DELETE CASCADE,
            parent_reply_id    uuid NULL REFERENCES %I.forum_replies(id) ON DELETE SET NULL,
            depth              smallint NOT NULL CHECK (depth IN (1,2)),
            author_user_id     text NOT NULL,
            body               text NOT NULL,
            upvote_count       integer NOT NULL DEFAULT 0,
            hidden_at          timestamptz NULL,
            hidden_by_user_id  text NULL,
            hide_reason        text NULL,
            created_at         timestamptz NOT NULL DEFAULT now(),
            deleted_at         timestamptz NULL
          )
        $ddl$, p_schema, p_schema, p_schema);
        EXECUTE format('CREATE INDEX IF NOT EXISTS forum_replies_post_idx ON %I.forum_replies (post_id, created_at ASC) WHERE deleted_at IS NULL', p_schema);
        EXECUTE format('CREATE INDEX IF NOT EXISTS forum_replies_parent_idx ON %I.forum_replies (parent_reply_id)', p_schema);

        -- forum_votes (upvote-only; toggle off by row delete)
        EXECUTE format($ddl$
          CREATE TABLE IF NOT EXISTS %I.forum_votes (
            id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id      text NOT NULL,
            target_type  text NOT NULL CHECK (target_type IN ('post','reply')),
            target_id    uuid NOT NULL,
            created_at   timestamptz NOT NULL DEFAULT now(),
            UNIQUE (user_id, target_type, target_id)
          )
        $ddl$, p_schema);
        EXECUTE format('CREATE INDEX IF NOT EXISTS forum_votes_target_idx ON %I.forum_votes (target_type, target_id)', p_schema);

        -- forum_mentions
        EXECUTE format($ddl$
          CREATE TABLE IF NOT EXISTS %I.forum_mentions (
            id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            source_type                 text NOT NULL CHECK (source_type IN ('post','reply')),
            source_id                   uuid NOT NULL,
            mentioned_platform_user_id  text NOT NULL,
            created_at                  timestamptz NOT NULL DEFAULT now()
          )
        $ddl$, p_schema);
        EXECUTE format('CREATE INDEX IF NOT EXISTS forum_mentions_user_idx ON %I.forum_mentions (mentioned_platform_user_id, created_at DESC)', p_schema);

        -- forum_moderation_actions
        EXECUTE format($ddl$
          CREATE TABLE IF NOT EXISTS %I.forum_moderation_actions (
            id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            actor_user_id  text NOT NULL,
            action         text NOT NULL CHECK (action IN ('pin','unpin','lock','unlock','hide','restore','tag_override')),
            target_type    text NOT NULL CHECK (target_type IN ('post','reply')),
            target_id      uuid NOT NULL,
            reason         text NULL,
            metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
            created_at     timestamptz NOT NULL DEFAULT now()
          )
        $ddl$, p_schema);
        EXECUTE format('CREATE INDEX IF NOT EXISTS forum_mod_actions_target_idx ON %I.forum_moderation_actions (target_type, target_id, created_at DESC)', p_schema);
      END
      $fn$
    `);

    // Seed dev community
    await q.query(`
      INSERT INTO public.schema_registry (community_code, org_id, schema_name, display_name)
      VALUES ('COM96179941', 'be2064fc-9d31-47a9-9e08-646d1fd57f1d', 'forum_com96179941', 'RZ Team')
      ON CONFLICT (community_code) DO NOTHING
    `);
    await q.query(`SELECT public.forum_create_schema('forum_com96179941')`);

    // Seed default tags inside the dev community schema
    await q.query(`
      INSERT INTO forum_com96179941.forum_tags (slug, label, color, is_system) VALUES
        ('launches',      'Launches',      '#3b6ef5', true),
        ('feedback',      'Feedback',      '#14b8a6', true),
        ('tools',         'Tools',         '#8b5cf6', true),
        ('questions',     'Questions',     '#f59e0b', true),
        ('hiring',        'Hiring',        '#ef4444', true),
        ('announcements', 'Announcements', '#ec4899', true)
      ON CONFLICT (slug) DO NOTHING
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP SCHEMA IF EXISTS forum_com96179941 CASCADE`);
    await q.query(`DROP FUNCTION IF EXISTS public.forum_create_schema(text)`);
    await q.query(`DROP TABLE IF EXISTS public.schema_registry`);
  }
}
