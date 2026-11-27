import { isSupabaseAuthEnabled, supabase } from '../lib/supabase.ts';
import type {
  AnonymousPost,
  Classmate,
  FeedPost,
  GalleryPhoto,
  NoticeItem,
} from '../types/community.ts';
import type { UserProfile } from '../context/AuthContext.tsx';

const AVATAR_TINTS = ['lavender', 'sky', 'mint', 'peach', 'rose'] as const;
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

function sanitizeImageUrl(url: string | undefined | null): string {
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

async function apiRequest(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  headers: Record<string, string>,
  body?: unknown
) {
  const res = await fetch(url, {
    method,
    headers:
      body !== undefined
        ? { 'Content-Type': 'application/json', ...headers }
        : headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      '서버 연결을 찾을 수 없습니다. Vercel 배포 시 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY 환경 변수를 설정하고 재배포(Redeploy)해 주세요.'
    );
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '요청을 처리하지 못했습니다.');
  }
  return res.json();
}

function throwIfSupabaseError(
  error: { message: string } | null,
  fallbackMessage: string
) {
  if (!error) return;
  console.error('Supabase error:', error);
  if (error.message.includes('relation') || error.message.includes('does not exist')) {
    throw new Error(
      'Supabase 테이블이 아직 생성되지 않았습니다. SQL Editor에서 schema.sql 쿼리를 먼저 실행해 주세요.'
    );
  }
  throw new Error(`${fallbackMessage} (${error.message})`);
}

// ---------- Profile ----------

export async function syncCurrentUserProfile(params: {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  headers: Record<string, string>;
}): Promise<UserProfile> {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest('/api/me', 'GET', params.headers);
  }

  const { data: existing, error: selectErr } = await supabase
    .from('users')
    .select('*')
    .eq('uid', params.uid)
    .maybeSingle();

  throwIfSupabaseError(selectErr, '프로필을 불러오지 못했습니다.');

  if (existing) {
    return {
      id: existing.id,
      uid: existing.uid,
      email: existing.email,
      displayName: existing.display_name,
      studentNumber: existing.student_number,
      role: existing.role === 'teacher' ? 'teacher' : 'student',
      bio: existing.bio,
      avatarUrl: existing.avatar_url,
      avatarTint: existing.avatar_tint,
    };
  }

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

  const { data: inserted, error: insertErr } = await supabase
    .from('users')
    .insert({
      uid: params.uid,
      email: params.email || '',
      display_name: fallbackName,
      student_number: '2-3 반',
      role: 'student',
      bio: '반가워요! 우리 반 커뮤니티에 함께해요.',
      avatar_url: safeAvatar,
      avatar_tint: tint,
    })
    .select('*')
    .single();

  throwIfSupabaseError(insertErr, '프로필 생성에 실패했습니다.');
  if (!inserted) {
    throw new Error('프로필 생성 결과를 확인할 수 없습니다.');
  }

  return {
    id: inserted.id,
    uid: inserted.uid,
    email: inserted.email,
    displayName: inserted.display_name,
    studentNumber: inserted.student_number,
    role: inserted.role === 'teacher' ? 'teacher' : 'student',
    bio: inserted.bio,
    avatarUrl: inserted.avatar_url,
    avatarTint: inserted.avatar_tint,
  };
}

export async function updateMyProfile(params: {
  uid: string;
  displayName: string;
  studentNumber: string;
  bio: string;
  role: 'student' | 'teacher';
  avatarTint: string;
  avatarUrl: string;
  headers: Record<string, string>;
}): Promise<void> {
  if (!isSupabaseAuthEnabled || !supabase) {
    await apiRequest('/api/me', 'PATCH', params.headers, {
      displayName: params.displayName,
      studentNumber: params.studentNumber,
      bio: params.bio,
      role: params.role,
      avatarTint: params.avatarTint,
      avatarUrl: params.avatarUrl,
    });
    return;
  }

  const safeAvatar = sanitizeImageUrl(params.avatarUrl);
  const { error } = await supabase
    .from('users')
    .update({
      display_name: params.displayName.trim().slice(0, 30),
      student_number: params.studentNumber.trim().slice(0, 24),
      bio: params.bio.trim().slice(0, 160),
      role: params.role === 'teacher' ? 'teacher' : 'student',
      avatar_tint: (AVATAR_TINTS as readonly string[]).includes(
        params.avatarTint
      )
        ? params.avatarTint
        : 'lavender',
      avatar_url: safeAvatar,
    })
    .eq('uid', params.uid);

  throwIfSupabaseError(error, '프로필 저장에 실패했습니다.');
}

// ---------- Fetch All Community Data ----------

export async function fetchAllCommunityData(params: {
  viewerUid?: string;
  headers: Record<string, string>;
}): Promise<{
  posts: FeedPost[];
  notices: NoticeItem[];
  anonPosts: AnonymousPost[];
  gallery: GalleryPhoto[];
  classmates: Classmate[];
}> {
  if (!isSupabaseAuthEnabled || !supabase) {
    const [posts, notices, anonPosts, gallery, classmates] = await Promise.all([
      apiRequest('/api/posts', 'GET', params.headers),
      apiRequest('/api/notices', 'GET', params.headers),
      apiRequest('/api/anonymous', 'GET', params.headers),
      apiRequest('/api/gallery', 'GET', params.headers),
      apiRequest('/api/classmates', 'GET', params.headers),
    ]);
    return { posts, notices, anonPosts, gallery, classmates };
  }

  const [
    usersRes,
    postsRes,
    postLikesRes,
    postBookmarksRes,
    postCommentsRes,
    noticesRes,
    hwCompRes,
    anonPostsRes,
    anonLikesRes,
    anonCommentsRes,
    galleryRes,
    galleryLikesRes,
  ] = await Promise.all([
    supabase
      .from('users')
      .select(
        'id, uid, display_name, student_number, role, bio, avatar_url, avatar_tint'
      )
      .order('id', { ascending: true }),
    supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    supabase.from('post_likes').select('post_id, user_uid'),
    params.viewerUid
      ? supabase
          .from('post_bookmarks')
          .select('post_id, user_uid')
          .eq('user_uid', params.viewerUid)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('post_comments')
      .select('*')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    supabase.from('homework_completions').select('notice_id, user_uid'),
    supabase
      .from('public_anonymous_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    supabase.from('public_anonymous_likes').select('post_id, is_mine'),
    supabase
      .from('public_anonymous_comments')
      .select('*')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('gallery_photos')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    supabase.from('gallery_likes').select('photo_id, user_uid'),
  ]);

  throwIfSupabaseError(usersRes.error, '사용자 목록을 불러오지 못했습니다.');
  throwIfSupabaseError(postsRes.error, '피드 게시글을 불러오지 못했습니다.');
  throwIfSupabaseError(noticesRes.error, '공지·숙제를 불러오지 못했습니다.');
  throwIfSupabaseError(anonPostsRes.error, '익명 게시판을 불러오지 못했습니다.');
  throwIfSupabaseError(galleryRes.error, '학급 갤러리를 불러오지 못했습니다.');

  const userList = usersRes.data || [];
  const userMap = new Map(userList.map((u) => [u.uid as string, u]));

  const postRows = postsRes.data || [];
  const postCountByUid = new Map<string, number>();
  for (const p of postRows) {
    postCountByUid.set(p.author_uid, (postCountByUid.get(p.author_uid) ?? 0) + 1);
  }

  const classmates: Classmate[] = userList.map((u) => ({
    id: u.id,
    displayName: u.display_name,
    studentNumber: u.student_number,
    role: u.role,
    bio: u.bio,
    avatarUrl: u.avatar_url,
    avatarTint: u.avatar_tint,
    postCount: postCountByUid.get(u.uid) ?? 0,
  }));

  const likeCountMap = new Map<number, number>();
  const likedPostSet = new Set<number>();
  for (const l of postLikesRes.data || []) {
    likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) ?? 0) + 1);
    if (params.viewerUid && l.user_uid === params.viewerUid) {
      likedPostSet.add(l.post_id);
    }
  }

  const bookmarkedPostSet = new Set<number>(
    (postBookmarksRes.data || []).map((b) => b.post_id as number)
  );

  const postCommentsMap = new Map<number, FeedPost['comments']>();
  for (const c of postCommentsRes.data || []) {
    const author = userMap.get(c.author_uid);
    const list = postCommentsMap.get(c.post_id) ?? [];
    list.push({
      id: c.id,
      authorName: author?.display_name || '우리반 친구',
      authorStudentNumber: author?.student_number || '',
      authorAvatarUrl: author?.avatar_url || '',
      authorAvatarTint: author?.avatar_tint || 'lavender',
      content: c.content,
      createdAt: c.created_at,
      isMine: Boolean(params.viewerUid && c.author_uid === params.viewerUid),
    });
    postCommentsMap.set(c.post_id, list);
  }

  const posts: FeedPost[] = postRows.map((p) => {
    const author = userMap.get(p.author_uid);
    return {
      id: p.id,
      category: p.category,
      caption: p.caption,
      imageUrl: p.image_url,
      locationLabel: p.location_label,
      createdAt: p.created_at,
      authorName: author?.display_name || '우리반 친구',
      authorStudentNumber: author?.student_number || '',
      authorRole: author?.role || 'student',
      authorAvatarUrl: author?.avatar_url || '',
      authorAvatarTint: author?.avatar_tint || 'lavender',
      likesCount: likeCountMap.get(p.id) ?? 0,
      isLiked: likedPostSet.has(p.id),
      isBookmarked: bookmarkedPostSet.has(p.id),
      isMine: Boolean(params.viewerUid && p.author_uid === params.viewerUid),
      comments: postCommentsMap.get(p.id) ?? [],
    };
  });

  const hwCountMap = new Map<number, number>();
  const hwCompletedSet = new Set<number>();
  for (const h of hwCompRes.data || []) {
    hwCountMap.set(h.notice_id, (hwCountMap.get(h.notice_id) ?? 0) + 1);
    if (params.viewerUid && h.user_uid === params.viewerUid) {
      hwCompletedSet.add(h.notice_id);
    }
  }

  const notices: NoticeItem[] = (noticesRes.data || []).map((n) => {
    const author = userMap.get(n.author_uid);
    return {
      id: n.id,
      type: n.type === 'homework' ? 'homework' : 'notice',
      subject: n.subject,
      title: n.title,
      content: n.content,
      dueDate: n.due_date,
      isPinned: Boolean(n.is_pinned),
      createdAt: n.created_at,
      authorName: author?.display_name || '우리반 친구',
      authorRole: author?.role || 'student',
      authorStudentNumber: author?.student_number || '',
      completedCount: hwCountMap.get(n.id) ?? 0,
      isCompleted: hwCompletedSet.has(n.id),
      isMine: Boolean(params.viewerUid && n.author_uid === params.viewerUid),
    };
  });

  const anonLikeCountMap = new Map<number, number>();
  const anonLikedSet = new Set<number>();
  for (const l of anonLikesRes.data || []) {
    anonLikeCountMap.set(l.post_id, (anonLikeCountMap.get(l.post_id) ?? 0) + 1);
    if (l.is_mine) {
      anonLikedSet.add(l.post_id);
    }
  }

  const anonCommentsMap = new Map<number, AnonymousPost['comments']>();
  for (const c of anonCommentsRes.data || []) {
    const list = anonCommentsMap.get(c.post_id) ?? [];
    list.push({
      id: c.id,
      anonymousAlias: c.anonymous_alias,
      content: c.content,
      createdAt: c.created_at,
      isMine: Boolean(c.is_mine),
    });
    anonCommentsMap.set(c.post_id, list);
  }

  const anonPosts: AnonymousPost[] = (anonPostsRes.data || []).map((a) => ({
    id: a.id,
    topic: a.topic,
    anonymousAlias: a.anonymous_alias,
    title: a.title,
    content: a.content,
    createdAt: a.created_at,
    likesCount: anonLikeCountMap.get(a.id) ?? 0,
    isLiked: anonLikedSet.has(a.id),
    isMine: Boolean(a.is_mine),
    comments: anonCommentsMap.get(a.id) ?? [],
  }));

  const galleryLikeCountMap = new Map<number, number>();
  const galleryLikedSet = new Set<number>();
  for (const l of galleryLikesRes.data || []) {
    galleryLikeCountMap.set(
      l.photo_id,
      (galleryLikeCountMap.get(l.photo_id) ?? 0) + 1
    );
    if (params.viewerUid && l.user_uid === params.viewerUid) {
      galleryLikedSet.add(l.photo_id);
    }
  }

  const gallery: GalleryPhoto[] = (galleryRes.data || []).map((g) => {
    const author = userMap.get(g.author_uid);
    return {
      id: g.id,
      title: g.title,
      description: g.description,
      eventTag: g.event_tag,
      imageUrl: g.image_url,
      takenDate: g.taken_date,
      createdAt: g.created_at,
      authorName: author?.display_name || '우리반 친구',
      authorStudentNumber: author?.student_number || '',
      likesCount: galleryLikeCountMap.get(g.id) ?? 0,
      isLiked: galleryLikedSet.has(g.id),
      isMine: Boolean(params.viewerUid && g.author_uid === params.viewerUid),
    };
  });

  return { posts, notices, anonPosts, gallery, classmates };
}

// ---------- Mutations ----------

export async function createPost(params: {
  uid: string;
  headers: Record<string, string>;
  payload: {
    category: string;
    caption: string;
    imageUrl: string;
    locationLabel: string;
  };
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest('/api/posts', 'POST', params.headers, params.payload);
  }
  const safeImageUrl = sanitizeImageUrl(params.payload.imageUrl);
  const { error } = await supabase.from('posts').insert({
    author_uid: params.uid,
    category: params.payload.category.trim().slice(0, 20) || '일상',
    caption: params.payload.caption.trim().slice(0, 1500),
    image_url: safeImageUrl,
    location_label:
      (params.payload.locationLabel || '2학년 3반 교실').trim().slice(0, 40),
  });
  throwIfSupabaseError(error, '게시글 등록에 실패했습니다.');
}

export async function deletePost(params: {
  postId: number;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(`/api/posts/${params.postId}`, 'DELETE', params.headers);
  }
  const { error } = await supabase.from('posts').delete().eq('id', params.postId);
  throwIfSupabaseError(error, '게시글 삭제에 실패했습니다.');
}

export async function togglePostLike(params: {
  postId: number;
  uid: string;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/posts/${params.postId}/like`,
      'POST',
      params.headers
    );
  }
  const { data: existing, error: selErr } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', params.postId)
    .eq('user_uid', params.uid)
    .maybeSingle();
  throwIfSupabaseError(selErr, '좋아요 조회에 실패했습니다.');

  if (existing) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('id', existing.id);
    throwIfSupabaseError(error, '좋아요 취소에 실패했습니다.');
  } else {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: params.postId, user_uid: params.uid });
    throwIfSupabaseError(error, '좋아요 등록에 실패했습니다.');
  }
}

export async function togglePostBookmark(params: {
  postId: number;
  uid: string;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/posts/${params.postId}/bookmark`,
      'POST',
      params.headers
    );
  }
  const { data: existing, error: selErr } = await supabase
    .from('post_bookmarks')
    .select('id')
    .eq('post_id', params.postId)
    .eq('user_uid', params.uid)
    .maybeSingle();
  throwIfSupabaseError(selErr, '북마크 조회에 실패했습니다.');

  if (existing) {
    const { error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('id', existing.id);
    throwIfSupabaseError(error, '북마크 해제에 실패했습니다.');
  } else {
    const { error } = await supabase
      .from('post_bookmarks')
      .insert({ post_id: params.postId, user_uid: params.uid });
    throwIfSupabaseError(error, '북마크 저장에 실패했습니다.');
  }
}

export async function addPostComment(params: {
  postId: number;
  uid: string;
  content: string;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/posts/${params.postId}/comments`,
      'POST',
      params.headers,
      { content: params.content }
    );
  }
  const { error } = await supabase.from('post_comments').insert({
    post_id: params.postId,
    author_uid: params.uid,
    content: params.content.trim().slice(0, 500),
  });
  throwIfSupabaseError(error, '댓글 등록에 실패했습니다.');
}

export async function deletePostComment(params: {
  commentId: number;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/comments/${params.commentId}`,
      'DELETE',
      params.headers
    );
  }
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', params.commentId);
  throwIfSupabaseError(error, '댓글 삭제에 실패했습니다.');
}

export async function createNotice(params: {
  uid: string;
  headers: Record<string, string>;
  payload: {
    type: 'notice' | 'homework';
    subject: string;
    title: string;
    content: string;
    dueDate: string;
    isPinned: boolean;
  };
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest('/api/notices', 'POST', params.headers, params.payload);
  }
  const { error } = await supabase.from('notices').insert({
    author_uid: params.uid,
    type: params.payload.type === 'homework' ? 'homework' : 'notice',
    subject: params.payload.subject.trim().slice(0, 24) || '학급일반',
    title: params.payload.title.trim().slice(0, 120),
    content: params.payload.content.trim().slice(0, 2000),
    due_date: (params.payload.dueDate || '').trim().slice(0, 24),
    is_pinned: Boolean(params.payload.isPinned),
  });
  throwIfSupabaseError(error, '공지·숙제 등록에 실패했습니다.');
}

export async function toggleHomeworkComplete(params: {
  noticeId: number;
  uid: string;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/notices/${params.noticeId}/toggle-complete`,
      'POST',
      params.headers
    );
  }
  const { data: existing, error: selErr } = await supabase
    .from('homework_completions')
    .select('id')
    .eq('notice_id', params.noticeId)
    .eq('user_uid', params.uid)
    .maybeSingle();
  throwIfSupabaseError(selErr, '숙제 상태 조회에 실패했습니다.');

  if (existing) {
    const { error } = await supabase
      .from('homework_completions')
      .delete()
      .eq('id', existing.id);
    throwIfSupabaseError(error, '숙제 체크 해제에 실패했습니다.');
  } else {
    const { error } = await supabase
      .from('homework_completions')
      .insert({ notice_id: params.noticeId, user_uid: params.uid });
    throwIfSupabaseError(error, '숙제 완료 체크에 실패했습니다.');
  }
}

export async function deleteNotice(params: {
  noticeId: number;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/notices/${params.noticeId}`,
      'DELETE',
      params.headers
    );
  }
  const { error } = await supabase
    .from('notices')
    .delete()
    .eq('id', params.noticeId);
  throwIfSupabaseError(error, '삭제에 실패했습니다.');
}

export async function createAnonymousPost(params: {
  uid: string;
  headers: Record<string, string>;
  payload: {
    topic: string;
    title: string;
    content: string;
    alias: string;
  };
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest('/api/anonymous', 'POST', params.headers, params.payload);
  }
  const alias =
    params.payload.alias.trim().slice(0, 24) ||
    ANON_ALIASES[Math.floor(Math.random() * ANON_ALIASES.length)];
  const { error } = await supabase.from('anonymous_posts').insert({
    author_uid: params.uid,
    topic: params.payload.topic.trim().slice(0, 20) || '자유',
    anonymous_alias: alias,
    title: params.payload.title.trim().slice(0, 120),
    content: params.payload.content.trim().slice(0, 2000),
  });
  throwIfSupabaseError(error, '익명 글 등록에 실패했습니다.');
}

export async function deleteAnonymousPost(params: {
  postId: number;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/anonymous/${params.postId}`,
      'DELETE',
      params.headers
    );
  }
  const { error } = await supabase
    .from('anonymous_posts')
    .delete()
    .eq('id', params.postId);
  throwIfSupabaseError(error, '익명 글 삭제에 실패했습니다.');
}

export async function toggleAnonymousLike(params: {
  postId: number;
  uid: string;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/anonymous/${params.postId}/like`,
      'POST',
      params.headers
    );
  }
  const { data: existing, error: selErr } = await supabase
    .from('anonymous_likes')
    .select('id')
    .eq('post_id', params.postId)
    .eq('user_uid', params.uid)
    .maybeSingle();
  throwIfSupabaseError(selErr, '공감 상태 조회에 실패했습니다.');

  if (existing) {
    const { error } = await supabase
      .from('anonymous_likes')
      .delete()
      .eq('id', existing.id);
    throwIfSupabaseError(error, '공감 취소에 실패했습니다.');
  } else {
    const { error } = await supabase
      .from('anonymous_likes')
      .insert({ post_id: params.postId, user_uid: params.uid });
    throwIfSupabaseError(error, '공감 등록에 실패했습니다.');
  }
}

export async function addAnonymousComment(params: {
  postId: number;
  uid: string;
  content: string;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/anonymous/${params.postId}/comments`,
      'POST',
      params.headers,
      { content: params.content }
    );
  }
  const alias = ANON_ALIASES[Math.floor(Math.random() * ANON_ALIASES.length)];
  const { error } = await supabase.from('anonymous_comments').insert({
    post_id: params.postId,
    author_uid: params.uid,
    anonymous_alias: alias,
    content: params.content.trim().slice(0, 500),
  });
  throwIfSupabaseError(error, '익명 댓글 등록에 실패했습니다.');
}

export async function deleteAnonymousComment(params: {
  commentId: number;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/anonymous/comments/${params.commentId}`,
      'DELETE',
      params.headers
    );
  }
  const { error } = await supabase
    .from('anonymous_comments')
    .delete()
    .eq('id', params.commentId);
  throwIfSupabaseError(error, '익명 댓글 삭제에 실패했습니다.');
}

export async function createGalleryPhoto(params: {
  uid: string;
  headers: Record<string, string>;
  payload: {
    title: string;
    description: string;
    eventTag: string;
    imageUrl: string;
    takenDate: string;
  };
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest('/api/gallery', 'POST', params.headers, params.payload);
  }
  const safeImageUrl = sanitizeImageUrl(params.payload.imageUrl);
  if (!safeImageUrl) {
    throw new Error('갤러리 사진 이미지를 선택하거나 URL을 입력해 주세요.');
  }
  const { error } = await supabase.from('gallery_photos').insert({
    author_uid: params.uid,
    title: params.payload.title.trim().slice(0, 100),
    description: (params.payload.description || '').trim().slice(0, 600),
    event_tag: params.payload.eventTag.trim().slice(0, 24) || '우리반일상',
    image_url: safeImageUrl,
    taken_date: (
      params.payload.takenDate || new Date().toISOString().slice(0, 10)
    ).slice(0, 20),
  });
  throwIfSupabaseError(error, '갤러리 사진 등록에 실패했습니다.');
}

export async function toggleGalleryLike(params: {
  photoId: number;
  uid: string;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/gallery/${params.photoId}/like`,
      'POST',
      params.headers
    );
  }
  const { data: existing, error: selErr } = await supabase
    .from('gallery_likes')
    .select('id')
    .eq('photo_id', params.photoId)
    .eq('user_uid', params.uid)
    .maybeSingle();
  throwIfSupabaseError(selErr, '좋아요 조회에 실패했습니다.');

  if (existing) {
    const { error } = await supabase
      .from('gallery_likes')
      .delete()
      .eq('id', existing.id);
    throwIfSupabaseError(error, '좋아요 취소에 실패했습니다.');
  } else {
    const { error } = await supabase
      .from('gallery_likes')
      .insert({ photo_id: params.photoId, user_uid: params.uid });
    throwIfSupabaseError(error, '좋아요 등록에 실패했습니다.');
  }
}

export async function deleteGalleryPhoto(params: {
  photoId: number;
  headers: Record<string, string>;
}) {
  if (!isSupabaseAuthEnabled || !supabase) {
    return apiRequest(
      `/api/gallery/${params.photoId}`,
      'DELETE',
      params.headers
    );
  }
  const { error } = await supabase
    .from('gallery_photos')
    .delete()
    .eq('id', params.photoId);
  throwIfSupabaseError(error, '사진 삭제에 실패했습니다.');
}
