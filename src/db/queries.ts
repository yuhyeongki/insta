import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  anonymousComments,
  anonymousLikes,
  anonymousPosts,
  galleryLikes,
  galleryPhotos,
  homeworkCompletions,
  notices,
  postBookmarks,
  postComments,
  postLikes,
  posts,
  users,
} from './schema.ts';

const AVATAR_TINTS = ['lavender', 'sky', 'mint', 'peach', 'rose'] as const;

export function sanitizeImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/src/assets/images/') && !trimmed.includes('..')) {
    return trimmed;
  }
  if (/^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    if (trimmed.length > 3_500_000) {
      throw new Error('이미지 파일 크기가 너무 큽니다. 2.5MB 이하의 이미지를 선택해 주세요.');
    }
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // fallthrough
  }
  throw new Error('올바른 이미지 주소 또는 이미지 파일 형식이 아닙니다.');
}

export async function getOrCreateUser(params: {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
}) {
  try {
    const fallbackName =
      params.name?.trim() ||
      (params.email ? params.email.split('@')[0] : '우리반 친구');
    const tint = AVATAR_TINTS[params.uid.length % AVATAR_TINTS.length];
    let safeAvatar = '';
    if (params.picture) {
      try {
        safeAvatar = sanitizeImageUrl(params.picture);
      } catch {
        safeAvatar = '';
      }
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, params.uid))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].email !== params.email && params.email) {
        const updated = await db
          .update(users)
          .set({ email: params.email })
          .where(eq(users.uid, params.uid))
          .returning();
        return updated[0];
      }
      return existing[0];
    }

    const inserted = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email || '',
        displayName: fallbackName,
        studentNumber: '2-3 반',
        role: 'student',
        bio: '반가워요! 우리 반 커뮤니티에 함께해요.',
        avatarUrl: safeAvatar,
        avatarTint: tint,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: params.email || '',
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('getOrCreateUser failed:', error);
    throw new Error('사용자 정보를 불러오지 못했습니다.', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  data: {
    displayName: string;
    studentNumber: string;
    bio: string;
    role: string;
    avatarTint: string;
    avatarUrl?: string;
  }
) {
  try {
    const allowedRole = data.role === 'teacher' ? 'teacher' : 'student';
    const allowedTint = (AVATAR_TINTS as readonly string[]).includes(data.avatarTint)
      ? data.avatarTint
      : 'lavender';
    const safeAvatarUrl =
      data.avatarUrl !== undefined ? sanitizeImageUrl(data.avatarUrl) : undefined;

    const updatePayload: Partial<typeof users.$inferInsert> = {
      displayName: data.displayName.trim().slice(0, 30),
      studentNumber: data.studentNumber.trim().slice(0, 24),
      bio: data.bio.trim().slice(0, 160),
      role: allowedRole,
      avatarTint: allowedTint,
    };
    if (safeAvatarUrl !== undefined) {
      updatePayload.avatarUrl = safeAvatarUrl;
    }

    const updated = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.uid, uid))
      .returning();
    return updated[0];
  } catch (error) {
    if (error instanceof Error && error.message.includes('이미지')) {
      throw error;
    }
    console.error('updateUserProfile failed:', error);
    throw new Error('프로필 저장에 실패했습니다.', { cause: error });
  }
}

export async function getClassmates() {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        uid: users.uid,
        displayName: users.displayName,
        studentNumber: users.studentNumber,
        role: users.role,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        avatarTint: users.avatarTint,
      })
      .from(users)
      .orderBy(users.id);

    const postCounts = await db
      .select({
        authorUid: posts.authorUid,
        count: sql<number>`count(*)::int`,
      })
      .from(posts)
      .groupBy(posts.authorUid);

    const countMap = new Map(postCounts.map((r) => [r.authorUid, r.count]));
    return allUsers.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      studentNumber: u.studentNumber,
      role: u.role,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      avatarTint: u.avatarTint,
      postCount: countMap.get(u.uid) ?? 0,
    }));
  } catch (error) {
    console.error('getClassmates failed:', error);
    throw new Error('학급 친구 목록을 불러오지 못했습니다.', { cause: error });
  }
}

export async function getFeedPosts(options: {
  viewerUid?: string;
  category?: string;
  bookmarkedOnly?: boolean;
}) {
  try {
    const rows = await db
      .select({
        id: posts.id,
        authorUid: posts.authorUid,
        category: posts.category,
        caption: posts.caption,
        imageUrl: posts.imageUrl,
        locationLabel: posts.locationLabel,
        createdAt: posts.createdAt,
        authorName: users.displayName,
        authorStudentNumber: users.studentNumber,
        authorRole: users.role,
        authorAvatarUrl: users.avatarUrl,
        authorAvatarTint: users.avatarTint,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorUid, users.uid))
      .orderBy(desc(posts.createdAt), desc(posts.id));

    const [allLikes, allBookmarks, allComments] = await Promise.all([
      db.select().from(postLikes),
      db.select().from(postBookmarks),
      db
        .select({
          id: postComments.id,
          postId: postComments.postId,
          authorUid: postComments.authorUid,
          content: postComments.content,
          createdAt: postComments.createdAt,
          authorName: users.displayName,
          authorStudentNumber: users.studentNumber,
          authorAvatarUrl: users.avatarUrl,
          authorAvatarTint: users.avatarTint,
        })
        .from(postComments)
        .innerJoin(users, eq(postComments.authorUid, users.uid))
        .orderBy(postComments.createdAt, postComments.id),
    ]);

    const likeCountMap = new Map<number, number>();
    const likedSet = new Set<number>();
    for (const l of allLikes) {
      likeCountMap.set(l.postId, (likeCountMap.get(l.postId) ?? 0) + 1);
      if (options.viewerUid && l.userUid === options.viewerUid) {
        likedSet.add(l.postId);
      }
    }

    const bookmarkedSet = new Set<number>();
    for (const b of allBookmarks) {
      if (options.viewerUid && b.userUid === options.viewerUid) {
        bookmarkedSet.add(b.postId);
      }
    }

    const commentMap = new Map<
      number,
      Array<{
        id: number;
        authorName: string;
        authorStudentNumber: string;
        authorAvatarUrl: string;
        authorAvatarTint: string;
        content: string;
        createdAt: string;
        isMine: boolean;
      }>
    >();
    for (const c of allComments) {
      const list = commentMap.get(c.postId) ?? [];
      list.push({
        id: c.id,
        authorName: c.authorName,
        authorStudentNumber: c.authorStudentNumber,
        authorAvatarUrl: c.authorAvatarUrl,
        authorAvatarTint: c.authorAvatarTint,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        isMine: Boolean(options.viewerUid && c.authorUid === options.viewerUid),
      });
      commentMap.set(c.postId, list);
    }

    let result = rows.map((row) => ({
      id: row.id,
      category: row.category,
      caption: row.caption,
      imageUrl: row.imageUrl,
      locationLabel: row.locationLabel,
      createdAt: row.createdAt.toISOString(),
      authorName: row.authorName,
      authorStudentNumber: row.authorStudentNumber,
      authorRole: row.authorRole,
      authorAvatarUrl: row.authorAvatarUrl,
      authorAvatarTint: row.authorAvatarTint,
      likesCount: likeCountMap.get(row.id) ?? 0,
      isLiked: likedSet.has(row.id),
      isBookmarked: bookmarkedSet.has(row.id),
      isMine: Boolean(options.viewerUid && row.authorUid === options.viewerUid),
      comments: commentMap.get(row.id) ?? [],
    }));

    if (options.category && options.category !== '전체') {
      result = result.filter((p) => p.category === options.category);
    }
    if (options.bookmarkedOnly) {
      result = result.filter((p) => p.isBookmarked);
    }

    return result;
  } catch (error) {
    console.error('getFeedPosts failed:', error);
    throw new Error('피드 게시글을 불러오지 못했습니다.', { cause: error });
  }
}

export async function createFeedPost(params: {
  authorUid: string;
  category: string;
  caption: string;
  imageUrl?: string;
  locationLabel?: string;
}) {
  try {
    const safeImageUrl = sanitizeImageUrl(params.imageUrl);
    const [inserted] = await db
      .insert(posts)
      .values({
        authorUid: params.authorUid,
        category: params.category.trim().slice(0, 20) || '일상',
        caption: params.caption.trim().slice(0, 1500),
        imageUrl: safeImageUrl,
        locationLabel: (params.locationLabel || '2학년 3반 교실').trim().slice(0, 40),
      })
      .returning();
    return inserted;
  } catch (error) {
    if (error instanceof Error && error.message.includes('이미지')) {
      throw error;
    }
    console.error('createFeedPost failed:', error);
    throw new Error('게시글 등록에 실패했습니다.', { cause: error });
  }
}

export async function deleteFeedPost(postId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (existing.length === 0) return { status: 'not_found' as const };
    if (existing[0].authorUid !== userUid) return { status: 'forbidden' as const };
    await db.delete(posts).where(eq(posts.id, postId));
    return { status: 'deleted' as const };
  } catch (error) {
    console.error('deleteFeedPost failed:', error);
    throw new Error('게시글 삭제에 실패했습니다.', { cause: error });
  }
}

export async function togglePostLike(postId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userUid, userUid)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(postLikes).where(eq(postLikes.id, existing[0].id));
      return { liked: false };
    }
    await db.insert(postLikes).values({ postId, userUid });
    return { liked: true };
  } catch (error) {
    console.error('togglePostLike failed:', error);
    throw new Error('좋아요 처리에 실패했습니다.', { cause: error });
  }
}

export async function togglePostBookmark(postId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(postBookmarks)
      .where(
        and(eq(postBookmarks.postId, postId), eq(postBookmarks.userUid, userUid))
      )
      .limit(1);

    if (existing.length > 0) {
      await db.delete(postBookmarks).where(eq(postBookmarks.id, existing[0].id));
      return { bookmarked: false };
    }
    await db.insert(postBookmarks).values({ postId, userUid });
    return { bookmarked: true };
  } catch (error) {
    console.error('togglePostBookmark failed:', error);
    throw new Error('북마크 처리에 실패했습니다.', { cause: error });
  }
}

export async function addPostComment(params: {
  postId: number;
  authorUid: string;
  content: string;
}) {
  try {
    const [inserted] = await db
      .insert(postComments)
      .values({
        postId: params.postId,
        authorUid: params.authorUid,
        content: params.content.trim().slice(0, 500),
      })
      .returning();
    return inserted;
  } catch (error) {
    console.error('addPostComment failed:', error);
    throw new Error('댓글 작성에 실패했습니다.', { cause: error });
  }
}

export async function deletePostComment(commentId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(postComments)
      .where(eq(postComments.id, commentId))
      .limit(1);
    if (existing.length === 0) return { status: 'not_found' as const };
    if (existing[0].authorUid !== userUid) return { status: 'forbidden' as const };
    await db.delete(postComments).where(eq(postComments.id, commentId));
    return { status: 'deleted' as const };
  } catch (error) {
    console.error('deletePostComment failed:', error);
    throw new Error('댓글 삭제에 실패했습니다.', { cause: error });
  }
}

export async function getNoticesList(options: {
  viewerUid?: string;
  type?: string;
}) {
  try {
    const rows = await db
      .select({
        id: notices.id,
        authorUid: notices.authorUid,
        type: notices.type,
        subject: notices.subject,
        title: notices.title,
        content: notices.content,
        dueDate: notices.dueDate,
        isPinned: notices.isPinned,
        createdAt: notices.createdAt,
        authorName: users.displayName,
        authorRole: users.role,
        authorStudentNumber: users.studentNumber,
      })
      .from(notices)
      .innerJoin(users, eq(notices.authorUid, users.uid))
      .orderBy(desc(notices.isPinned), desc(notices.createdAt), desc(notices.id));

    const completions = await db.select().from(homeworkCompletions);
    const completionCountMap = new Map<number, number>();
    const completedSet = new Set<number>();

    for (const c of completions) {
      completionCountMap.set(c.noticeId, (completionCountMap.get(c.noticeId) ?? 0) + 1);
      if (options.viewerUid && c.userUid === options.viewerUid) {
        completedSet.add(c.noticeId);
      }
    }

    let result = rows.map((row) => ({
      id: row.id,
      type: row.type,
      subject: row.subject,
      title: row.title,
      content: row.content,
      dueDate: row.dueDate,
      isPinned: row.isPinned,
      createdAt: row.createdAt.toISOString(),
      authorName: row.authorName,
      authorRole: row.authorRole,
      authorStudentNumber: row.authorStudentNumber,
      completedCount: completionCountMap.get(row.id) ?? 0,
      isCompleted: completedSet.has(row.id),
      isMine: Boolean(options.viewerUid && row.authorUid === options.viewerUid),
    }));

    if (options.type && options.type !== 'all') {
      result = result.filter((n) => n.type === options.type);
    }

    return result;
  } catch (error) {
    console.error('getNoticesList failed:', error);
    throw new Error('공지 및 숙제 목록을 불러오지 못했습니다.', { cause: error });
  }
}

export async function createNotice(params: {
  authorUid: string;
  type: 'notice' | 'homework';
  subject: string;
  title: string;
  content: string;
  dueDate?: string;
  isPinned?: boolean;
}) {
  try {
    const [inserted] = await db
      .insert(notices)
      .values({
        authorUid: params.authorUid,
        type: params.type === 'homework' ? 'homework' : 'notice',
        subject: params.subject.trim().slice(0, 24) || '학급일반',
        title: params.title.trim().slice(0, 120),
        content: params.content.trim().slice(0, 2000),
        dueDate: (params.dueDate || '').trim().slice(0, 24),
        isPinned: Boolean(params.isPinned),
      })
      .returning();
    return inserted;
  } catch (error) {
    console.error('createNotice failed:', error);
    throw new Error('공지/숙제 등록에 실패했습니다.', { cause: error });
  }
}

export async function toggleHomeworkComplete(noticeId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(homeworkCompletions)
      .where(
        and(
          eq(homeworkCompletions.noticeId, noticeId),
          eq(homeworkCompletions.userUid, userUid)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(homeworkCompletions)
        .where(eq(homeworkCompletions.id, existing[0].id));
      return { completed: false };
    }
    await db.insert(homeworkCompletions).values({ noticeId, userUid });
    return { completed: true };
  } catch (error) {
    console.error('toggleHomeworkComplete failed:', error);
    throw new Error('숙제 완료 체크에 실패했습니다.', { cause: error });
  }
}

export async function deleteNotice(noticeId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(notices)
      .where(eq(notices.id, noticeId))
      .limit(1);
    if (existing.length === 0) return { status: 'not_found' as const };
    if (existing[0].authorUid !== userUid) return { status: 'forbidden' as const };
    await db.delete(notices).where(eq(notices.id, noticeId));
    return { status: 'deleted' as const };
  } catch (error) {
    console.error('deleteNotice failed:', error);
    throw new Error('항목 삭제에 실패했습니다.', { cause: error });
  }
}

const ANON_ALIASES = [
  '익명의 벚꽃',
  '익명의 구름',
  '익명의 수달',
  '익명의 별빛',
  '익명의 딸기우유',
  '익명의 고양이',
  '익명의 노을',
  '익명의 민들레',
];

export async function getAnonymousPosts(options: {
  viewerUid?: string;
  topic?: string;
}) {
  try {
    const rows = await db
      .select()
      .from(anonymousPosts)
      .orderBy(desc(anonymousPosts.createdAt), desc(anonymousPosts.id));

    const [allLikes, allComments] = await Promise.all([
      db.select().from(anonymousLikes),
      db
        .select()
        .from(anonymousComments)
        .orderBy(anonymousComments.createdAt, anonymousComments.id),
    ]);

    const likeCountMap = new Map<number, number>();
    const likedSet = new Set<number>();
    for (const l of allLikes) {
      likeCountMap.set(l.postId, (likeCountMap.get(l.postId) ?? 0) + 1);
      if (options.viewerUid && l.userUid === options.viewerUid) {
        likedSet.add(l.postId);
      }
    }

    const commentMap = new Map<
      number,
      Array<{
        id: number;
        anonymousAlias: string;
        content: string;
        createdAt: string;
        isMine: boolean;
      }>
    >();
    for (const c of allComments) {
      const list = commentMap.get(c.postId) ?? [];
      list.push({
        id: c.id,
        anonymousAlias: c.anonymousAlias,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        isMine: Boolean(options.viewerUid && c.authorUid === options.viewerUid),
      });
      commentMap.set(c.postId, list);
    }

    let result = rows.map((row) => ({
      id: row.id,
      topic: row.topic,
      anonymousAlias: row.anonymousAlias,
      title: row.title,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      likesCount: likeCountMap.get(row.id) ?? 0,
      isLiked: likedSet.has(row.id),
      isMine: Boolean(options.viewerUid && row.authorUid === options.viewerUid),
      comments: commentMap.get(row.id) ?? [],
    }));

    if (options.topic && options.topic !== '전체') {
      result = result.filter((a) => a.topic === options.topic);
    }

    return result;
  } catch (error) {
    console.error('getAnonymousPosts failed:', error);
    throw new Error('익명 게시판을 불러오지 못했습니다.', { cause: error });
  }
}

export async function createAnonymousPost(params: {
  authorUid: string;
  topic: string;
  title: string;
  content: string;
  alias?: string;
}) {
  try {
    const pickedAlias =
      params.alias?.trim().slice(0, 24) ||
      ANON_ALIASES[Math.floor(Math.random() * ANON_ALIASES.length)];

    const [inserted] = await db
      .insert(anonymousPosts)
      .values({
        authorUid: params.authorUid,
        topic: params.topic.trim().slice(0, 20) || '자유',
        anonymousAlias: pickedAlias,
        title: params.title.trim().slice(0, 120),
        content: params.content.trim().slice(0, 2000),
      })
      .returning();

    return {
      id: inserted.id,
      topic: inserted.topic,
      anonymousAlias: inserted.anonymousAlias,
      title: inserted.title,
      content: inserted.content,
      createdAt: inserted.createdAt.toISOString(),
    };
  } catch (error) {
    console.error('createAnonymousPost failed:', error);
    throw new Error('익명 글 등록에 실패했습니다.', { cause: error });
  }
}

export async function deleteAnonymousPost(postId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(anonymousPosts)
      .where(eq(anonymousPosts.id, postId))
      .limit(1);
    if (existing.length === 0) return { status: 'not_found' as const };
    if (existing[0].authorUid !== userUid) return { status: 'forbidden' as const };
    await db.delete(anonymousPosts).where(eq(anonymousPosts.id, postId));
    return { status: 'deleted' as const };
  } catch (error) {
    console.error('deleteAnonymousPost failed:', error);
    throw new Error('익명 글 삭제에 실패했습니다.', { cause: error });
  }
}

export async function toggleAnonymousLike(postId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(anonymousLikes)
      .where(
        and(
          eq(anonymousLikes.postId, postId),
          eq(anonymousLikes.userUid, userUid)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db.delete(anonymousLikes).where(eq(anonymousLikes.id, existing[0].id));
      return { liked: false };
    }
    await db.insert(anonymousLikes).values({ postId, userUid });
    return { liked: true };
  } catch (error) {
    console.error('toggleAnonymousLike failed:', error);
    throw new Error('공감 처리에 실패했습니다.', { cause: error });
  }
}

export async function addAnonymousComment(params: {
  postId: number;
  authorUid: string;
  content: string;
}) {
  try {
    const pickedAlias =
      ANON_ALIASES[Math.floor(Math.random() * ANON_ALIASES.length)];
    const [inserted] = await db
      .insert(anonymousComments)
      .values({
        postId: params.postId,
        authorUid: params.authorUid,
        anonymousAlias: pickedAlias,
        content: params.content.trim().slice(0, 500),
      })
      .returning();
    return {
      id: inserted.id,
      anonymousAlias: inserted.anonymousAlias,
      content: inserted.content,
      createdAt: inserted.createdAt.toISOString(),
    };
  } catch (error) {
    console.error('addAnonymousComment failed:', error);
    throw new Error('익명 댓글 작성에 실패했습니다.', { cause: error });
  }
}

export async function deleteAnonymousComment(commentId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(anonymousComments)
      .where(eq(anonymousComments.id, commentId))
      .limit(1);
    if (existing.length === 0) return { status: 'not_found' as const };
    if (existing[0].authorUid !== userUid) return { status: 'forbidden' as const };
    await db.delete(anonymousComments).where(eq(anonymousComments.id, commentId));
    return { status: 'deleted' as const };
  } catch (error) {
    console.error('deleteAnonymousComment failed:', error);
    throw new Error('익명 댓글 삭제에 실패했습니다.', { cause: error });
  }
}

export async function getGalleryPhotos(options: {
  viewerUid?: string;
  eventTag?: string;
}) {
  try {
    const rows = await db
      .select({
        id: galleryPhotos.id,
        authorUid: galleryPhotos.authorUid,
        title: galleryPhotos.title,
        description: galleryPhotos.description,
        eventTag: galleryPhotos.eventTag,
        imageUrl: galleryPhotos.imageUrl,
        takenDate: galleryPhotos.takenDate,
        createdAt: galleryPhotos.createdAt,
        authorName: users.displayName,
        authorStudentNumber: users.studentNumber,
      })
      .from(galleryPhotos)
      .innerJoin(users, eq(galleryPhotos.authorUid, users.uid))
      .orderBy(desc(galleryPhotos.createdAt), desc(galleryPhotos.id));

    const allLikes = await db.select().from(galleryLikes);
    const likeCountMap = new Map<number, number>();
    const likedSet = new Set<number>();

    for (const l of allLikes) {
      likeCountMap.set(l.photoId, (likeCountMap.get(l.photoId) ?? 0) + 1);
      if (options.viewerUid && l.userUid === options.viewerUid) {
        likedSet.add(l.photoId);
      }
    }

    let result = rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      eventTag: row.eventTag,
      imageUrl: row.imageUrl,
      takenDate: row.takenDate,
      createdAt: row.createdAt.toISOString(),
      authorName: row.authorName,
      authorStudentNumber: row.authorStudentNumber,
      likesCount: likeCountMap.get(row.id) ?? 0,
      isLiked: likedSet.has(row.id),
      isMine: Boolean(options.viewerUid && row.authorUid === options.viewerUid),
    }));

    if (options.eventTag && options.eventTag !== '전체') {
      result = result.filter((g) => g.eventTag === options.eventTag);
    }

    return result;
  } catch (error) {
    console.error('getGalleryPhotos failed:', error);
    throw new Error('학급 갤러리를 불러오지 못했습니다.', { cause: error });
  }
}

export async function createGalleryPhoto(params: {
  authorUid: string;
  title: string;
  description?: string;
  eventTag: string;
  imageUrl: string;
  takenDate?: string;
}) {
  try {
    const safeImageUrl = sanitizeImageUrl(params.imageUrl);
    if (!safeImageUrl) {
      throw new Error('갤러리 사진 이미지를 선택하거나 URL을 입력해 주세요.');
    }
    const [inserted] = await db
      .insert(galleryPhotos)
      .values({
        authorUid: params.authorUid,
        title: params.title.trim().slice(0, 100),
        description: (params.description || '').trim().slice(0, 600),
        eventTag: params.eventTag.trim().slice(0, 24) || '우리반일상',
        imageUrl: safeImageUrl,
        takenDate:
          (params.takenDate || new Date().toISOString().slice(0, 10)).slice(0, 20),
      })
      .returning();
    return inserted;
  } catch (error) {
    if (error instanceof Error && error.message.includes('이미지')) {
      throw error;
    }
    console.error('createGalleryPhoto failed:', error);
    throw new Error('갤러리 사진 업로드에 실패했습니다.', { cause: error });
  }
}

export async function toggleGalleryLike(photoId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(galleryLikes)
      .where(
        and(eq(galleryLikes.photoId, photoId), eq(galleryLikes.userUid, userUid))
      )
      .limit(1);

    if (existing.length > 0) {
      await db.delete(galleryLikes).where(eq(galleryLikes.id, existing[0].id));
      return { liked: false };
    }
    await db.insert(galleryLikes).values({ photoId, userUid });
    return { liked: true };
  } catch (error) {
    console.error('toggleGalleryLike failed:', error);
    throw new Error('좋아요 처리에 실패했습니다.', { cause: error });
  }
}

export async function deleteGalleryPhoto(photoId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(galleryPhotos)
      .where(eq(galleryPhotos.id, photoId))
      .limit(1);
    if (existing.length === 0) return { status: 'not_found' as const };
    if (existing[0].authorUid !== userUid) return { status: 'forbidden' as const };
    await db.delete(galleryPhotos).where(eq(galleryPhotos.id, photoId));
    return { status: 'deleted' as const };
  } catch (error) {
    console.error('deleteGalleryPhoto failed:', error);
    throw new Error('사진 삭제에 실패했습니다.', { cause: error });
  }
}
