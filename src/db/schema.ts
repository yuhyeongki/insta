import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  studentNumber: text('student_number').notNull().default(''),
  role: text('role').notNull().default('student'),
  bio: text('bio').notNull().default(''),
  avatarUrl: text('avatar_url').notNull().default(''),
  avatarTint: text('avatar_tint').notNull().default('lavender'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  authorUid: text('author_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  category: text('category').notNull().default('일상'),
  caption: text('caption').notNull(),
  imageUrl: text('image_url').notNull().default(''),
  locationLabel: text('location_label').notNull().default('2학년 3반 교실'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const postLikes = pgTable(
  'post_likes',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .references(() => posts.id, { onDelete: 'cascade' })
      .notNull(),
    userUid: text('user_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('post_likes_post_user_idx').on(table.postId, table.userUid),
  ]
);

export const postBookmarks = pgTable(
  'post_bookmarks',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .references(() => posts.id, { onDelete: 'cascade' })
      .notNull(),
    userUid: text('user_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('post_bookmarks_post_user_idx').on(table.postId, table.userUid),
  ]
);

export const postComments = pgTable('post_comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  authorUid: text('author_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notices = pgTable('notices', {
  id: serial('id').primaryKey(),
  authorUid: text('author_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull().default('notice'), // 'notice' | 'homework'
  subject: text('subject').notNull().default('학급일반'),
  title: text('title').notNull(),
  content: text('content').notNull(),
  dueDate: text('due_date').notNull().default(''),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const homeworkCompletions = pgTable(
  'homework_completions',
  {
    id: serial('id').primaryKey(),
    noticeId: integer('notice_id')
      .references(() => notices.id, { onDelete: 'cascade' })
      .notNull(),
    userUid: text('user_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    completedAt: timestamp('completed_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('hw_completion_notice_user_idx').on(
      table.noticeId,
      table.userUid
    ),
  ]
);

export const anonymousPosts = pgTable('anonymous_posts', {
  id: serial('id').primaryKey(),
  authorUid: text('author_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  topic: text('topic').notNull().default('자유'),
  anonymousAlias: text('anonymous_alias').notNull().default('익명의 구름'),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const anonymousLikes = pgTable(
  'anonymous_likes',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .references(() => anonymousPosts.id, { onDelete: 'cascade' })
      .notNull(),
    userUid: text('user_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('anon_likes_post_user_idx').on(table.postId, table.userUid),
  ]
);

export const anonymousComments = pgTable('anonymous_comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .references(() => anonymousPosts.id, { onDelete: 'cascade' })
    .notNull(),
  authorUid: text('author_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  anonymousAlias: text('anonymous_alias').notNull().default('익명의 별'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const galleryPhotos = pgTable('gallery_photos', {
  id: serial('id').primaryKey(),
  authorUid: text('author_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  eventTag: text('event_tag').notNull().default('우리반일상'),
  imageUrl: text('image_url').notNull(),
  takenDate: text('taken_date').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const galleryLikes = pgTable(
  'gallery_likes',
  {
    id: serial('id').primaryKey(),
    photoId: integer('photo_id')
      .references(() => galleryPhotos.id, { onDelete: 'cascade' })
      .notNull(),
    userUid: text('user_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('gallery_likes_photo_user_idx').on(
      table.photoId,
      table.userUid
    ),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  notices: many(notices),
  galleryPhotos: many(galleryPhotos),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorUid],
    references: [users.uid],
  }),
  likes: many(postLikes),
  bookmarks: many(postBookmarks),
  comments: many(postComments),
}));
