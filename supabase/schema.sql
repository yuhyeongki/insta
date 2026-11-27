-- 우리반그램 (Classroom Instagram Community) Supabase SQL Setup
-- Supabase 대시보드 > SQL Editor에 전체 내용을 붙여넣고 Run을 눌러주세요.

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "uid" text NOT NULL UNIQUE,
  "email" text NOT NULL DEFAULT '',
  "display_name" text NOT NULL,
  "student_number" text DEFAULT '' NOT NULL,
  "role" text DEFAULT 'student' NOT NULL,
  "bio" text DEFAULT '' NOT NULL,
  "avatar_url" text DEFAULT '' NOT NULL,
  "avatar_tint" text DEFAULT 'lavender' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "author_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
  "category" text DEFAULT '일상' NOT NULL,
  "caption" text NOT NULL,
  "image_url" text DEFAULT '' NOT NULL,
  "location_label" text DEFAULT '2학년 3반 교실' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "post_likes" (
  "id" serial PRIMARY KEY NOT NULL,
  "post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "user_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "post_likes_post_user_idx" ON "post_likes" ("post_id", "user_uid");

CREATE TABLE IF NOT EXISTS "post_bookmarks" (
  "id" serial PRIMARY KEY NOT NULL,
  "post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "user_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "post_bookmarks_post_user_idx" ON "post_bookmarks" ("post_id", "user_uid");

CREATE TABLE IF NOT EXISTS "post_comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "author_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notices" (
  "id" serial PRIMARY KEY NOT NULL,
  "author_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
  "type" text DEFAULT 'notice' NOT NULL,
  "subject" text DEFAULT '학급일반' NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "due_date" text DEFAULT '' NOT NULL,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "homework_completions" (
  "id" serial PRIMARY KEY NOT NULL,
  "notice_id" integer NOT NULL REFERENCES "notices"("id") ON DELETE CASCADE,
  "user_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
  "completed_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "hw_completion_notice_user_idx" ON "homework_completions" ("notice_id", "user_uid");

CREATE TABLE IF NOT EXISTS "anonymous_posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "author_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
  "topic" text DEFAULT '자유' NOT NULL,
  "anonymous_alias" text DEFAULT '익명의 구름' NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "anonymous_likes" (
  "id" serial PRIMARY KEY NOT NULL,
  "post_id" integer NOT NULL REFERENCES "anonymous_posts"("id") ON DELETE CASCADE,
  "user_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "anon_likes_post_user_idx" ON "anonymous_likes" ("post_id", "user_uid");

CREATE TABLE IF NOT EXISTS "anonymous_comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "post_id" integer NOT NULL REFERENCES "anonymous_posts"("id") ON DELETE CASCADE,
  "author_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
  "anonymous_alias" text DEFAULT '익명의 별' NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "gallery_photos" (
  "id" serial PRIMARY KEY NOT NULL,
  "author_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "event_tag" text DEFAULT '우리반일상' NOT NULL,
  "image_url" text NOT NULL,
  "taken_date" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "gallery_likes" (
  "id" serial PRIMARY KEY NOT NULL,
  "photo_id" integer NOT NULL REFERENCES "gallery_photos"("id") ON DELETE CASCADE,
  "user_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "gallery_likes_photo_user_idx" ON "gallery_likes" ("photo_id", "user_uid");

-- 2. 익명 게시판 개인정보 보호용 뷰 (작성자 uid를 절대 노출하지 않음)
CREATE OR REPLACE VIEW "public_anonymous_posts" AS
SELECT
  id,
  topic,
  anonymous_alias,
  title,
  content,
  created_at,
  (auth.uid()::text = author_uid) AS is_mine
FROM anonymous_posts;

CREATE OR REPLACE VIEW "public_anonymous_comments" AS
SELECT
  id,
  post_id,
  anonymous_alias,
  content,
  created_at,
  (auth.uid()::text = author_uid) AS is_mine
FROM anonymous_comments;

CREATE OR REPLACE VIEW "public_anonymous_likes" AS
SELECT
  id,
  post_id,
  (auth.uid()::text = user_uid) AS is_mine
FROM anonymous_likes;

GRANT SELECT ON "public_anonymous_posts" TO anon, authenticated;
GRANT SELECT ON "public_anonymous_comments" TO anon, authenticated;
GRANT SELECT ON "public_anonymous_likes" TO anon, authenticated;

-- 3. Row Level Security (RLS) 보안 정책
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_bookmarks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "homework_completions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anonymous_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anonymous_likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anonymous_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gallery_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gallery_likes" ENABLE ROW LEVEL SECURITY;

-- users
DROP POLICY IF EXISTS "users_select_all" ON "users";
CREATE POLICY "users_select_all" ON "users" FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_insert_own" ON "users";
CREATE POLICY "users_insert_own" ON "users" FOR INSERT WITH CHECK (auth.uid()::text = uid);
DROP POLICY IF EXISTS "users_update_own" ON "users";
CREATE POLICY "users_update_own" ON "users" FOR UPDATE USING (auth.uid()::text = uid) WITH CHECK (auth.uid()::text = uid);

-- posts
DROP POLICY IF EXISTS "posts_select_all" ON "posts";
CREATE POLICY "posts_select_all" ON "posts" FOR SELECT USING (true);
DROP POLICY IF EXISTS "posts_insert_own" ON "posts";
CREATE POLICY "posts_insert_own" ON "posts" FOR INSERT WITH CHECK (auth.uid()::text = author_uid);
DROP POLICY IF EXISTS "posts_delete_own" ON "posts";
CREATE POLICY "posts_delete_own" ON "posts" FOR DELETE USING (auth.uid()::text = author_uid);

-- post_likes
DROP POLICY IF EXISTS "post_likes_select_all" ON "post_likes";
CREATE POLICY "post_likes_select_all" ON "post_likes" FOR SELECT USING (true);
DROP POLICY IF EXISTS "post_likes_insert_own" ON "post_likes";
CREATE POLICY "post_likes_insert_own" ON "post_likes" FOR INSERT WITH CHECK (auth.uid()::text = user_uid);
DROP POLICY IF EXISTS "post_likes_delete_own" ON "post_likes";
CREATE POLICY "post_likes_delete_own" ON "post_likes" FOR DELETE USING (auth.uid()::text = user_uid);

-- post_bookmarks (본인만 조회/수정)
DROP POLICY IF EXISTS "post_bookmarks_select_own" ON "post_bookmarks";
CREATE POLICY "post_bookmarks_select_own" ON "post_bookmarks" FOR SELECT USING (auth.uid()::text = user_uid);
DROP POLICY IF EXISTS "post_bookmarks_insert_own" ON "post_bookmarks";
CREATE POLICY "post_bookmarks_insert_own" ON "post_bookmarks" FOR INSERT WITH CHECK (auth.uid()::text = user_uid);
DROP POLICY IF EXISTS "post_bookmarks_delete_own" ON "post_bookmarks";
CREATE POLICY "post_bookmarks_delete_own" ON "post_bookmarks" FOR DELETE USING (auth.uid()::text = user_uid);

-- post_comments
DROP POLICY IF EXISTS "post_comments_select_all" ON "post_comments";
CREATE POLICY "post_comments_select_all" ON "post_comments" FOR SELECT USING (true);
DROP POLICY IF EXISTS "post_comments_insert_own" ON "post_comments";
CREATE POLICY "post_comments_insert_own" ON "post_comments" FOR INSERT WITH CHECK (auth.uid()::text = author_uid);
DROP POLICY IF EXISTS "post_comments_delete_own" ON "post_comments";
CREATE POLICY "post_comments_delete_own" ON "post_comments" FOR DELETE USING (auth.uid()::text = author_uid);

-- notices
DROP POLICY IF EXISTS "notices_select_all" ON "notices";
CREATE POLICY "notices_select_all" ON "notices" FOR SELECT USING (true);
DROP POLICY IF EXISTS "notices_insert_own" ON "notices";
CREATE POLICY "notices_insert_own" ON "notices" FOR INSERT WITH CHECK (auth.uid()::text = author_uid);
DROP POLICY IF EXISTS "notices_delete_own" ON "notices";
CREATE POLICY "notices_delete_own" ON "notices" FOR DELETE USING (auth.uid()::text = author_uid);

-- homework_completions
DROP POLICY IF EXISTS "hw_select_all" ON "homework_completions";
CREATE POLICY "hw_select_all" ON "homework_completions" FOR SELECT USING (true);
DROP POLICY IF EXISTS "hw_insert_own" ON "homework_completions";
CREATE POLICY "hw_insert_own" ON "homework_completions" FOR INSERT WITH CHECK (auth.uid()::text = user_uid);
DROP POLICY IF EXISTS "hw_delete_own" ON "homework_completions";
CREATE POLICY "hw_delete_own" ON "homework_completions" FOR DELETE USING (auth.uid()::text = user_uid);

-- anonymous_posts (원본 테이블은 본인 글만 직접 조회 가능, 전체 조회는 뷰 사용)
DROP POLICY IF EXISTS "anon_posts_select_own" ON "anonymous_posts";
CREATE POLICY "anon_posts_select_own" ON "anonymous_posts" FOR SELECT USING (auth.uid()::text = author_uid);
DROP POLICY IF EXISTS "anon_posts_insert_own" ON "anonymous_posts";
CREATE POLICY "anon_posts_insert_own" ON "anonymous_posts" FOR INSERT WITH CHECK (auth.uid()::text = author_uid);
DROP POLICY IF EXISTS "anon_posts_delete_own" ON "anonymous_posts";
CREATE POLICY "anon_posts_delete_own" ON "anonymous_posts" FOR DELETE USING (auth.uid()::text = author_uid);

-- anonymous_likes
DROP POLICY IF EXISTS "anon_likes_select_own" ON "anonymous_likes";
CREATE POLICY "anon_likes_select_own" ON "anonymous_likes" FOR SELECT USING (auth.uid()::text = user_uid);
DROP POLICY IF EXISTS "anon_likes_insert_own" ON "anonymous_likes";
CREATE POLICY "anon_likes_insert_own" ON "anonymous_likes" FOR INSERT WITH CHECK (auth.uid()::text = user_uid);
DROP POLICY IF EXISTS "anon_likes_delete_own" ON "anonymous_likes";
CREATE POLICY "anon_likes_delete_own" ON "anonymous_likes" FOR DELETE USING (auth.uid()::text = user_uid);

-- anonymous_comments
DROP POLICY IF EXISTS "anon_comments_select_own" ON "anonymous_comments";
CREATE POLICY "anon_comments_select_own" ON "anonymous_comments" FOR SELECT USING (auth.uid()::text = author_uid);
DROP POLICY IF EXISTS "anon_comments_insert_own" ON "anonymous_comments";
CREATE POLICY "anon_comments_insert_own" ON "anonymous_comments" FOR INSERT WITH CHECK (auth.uid()::text = author_uid);
DROP POLICY IF EXISTS "anon_comments_delete_own" ON "anonymous_comments";
CREATE POLICY "anon_comments_delete_own" ON "anonymous_comments" FOR DELETE USING (auth.uid()::text = author_uid);

-- gallery_photos
DROP POLICY IF EXISTS "gallery_select_all" ON "gallery_photos";
CREATE POLICY "gallery_select_all" ON "gallery_photos" FOR SELECT USING (true);
DROP POLICY IF EXISTS "gallery_insert_own" ON "gallery_photos";
CREATE POLICY "gallery_insert_own" ON "gallery_photos" FOR INSERT WITH CHECK (auth.uid()::text = author_uid);
DROP POLICY IF EXISTS "gallery_delete_own" ON "gallery_photos";
CREATE POLICY "gallery_delete_own" ON "gallery_photos" FOR DELETE USING (auth.uid()::text = author_uid);

-- gallery_likes
DROP POLICY IF EXISTS "gallery_likes_select_all" ON "gallery_likes";
CREATE POLICY "gallery_likes_select_all" ON "gallery_likes" FOR SELECT USING (true);
DROP POLICY IF EXISTS "gallery_likes_insert_own" ON "gallery_likes";
CREATE POLICY "gallery_likes_insert_own" ON "gallery_likes" FOR INSERT WITH CHECK (auth.uid()::text = user_uid);
DROP POLICY IF EXISTS "gallery_likes_delete_own" ON "gallery_likes";
CREATE POLICY "gallery_likes_delete_own" ON "gallery_likes" FOR DELETE USING (auth.uid()::text = user_uid);
