import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  optionalAuth,
  requireAuth,
  type AuthRequest,
} from './src/middleware/auth.ts';
import {
  addAnonymousComment,
  addPostComment,
  createAnonymousPost,
  createFeedPost,
  createGalleryPhoto,
  createNotice,
  deleteAnonymousComment,
  deleteAnonymousPost,
  deleteFeedPost,
  deleteGalleryPhoto,
  deleteNotice,
  deletePostComment,
  getAnonymousPosts,
  getClassmates,
  getFeedPosts,
  getGalleryPhotos,
  getNoticesList,
  getOrCreateUser,
  toggleAnonymousLike,
  toggleGalleryLike,
  toggleHomeworkComplete,
  togglePostBookmark,
  togglePostLike,
  updateUserProfile,
} from './src/db/queries.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '4mb' }));

  const ensureSyncedUser = async (req: AuthRequest) => {
    if (!req.user) {
      throw new Error('인증 정보가 없습니다.');
    }
    return getOrCreateUser({
      uid: req.user.uid,
      email: req.user.email || '',
      name: typeof req.user.name === 'string' ? req.user.name : undefined,
      picture: typeof req.user.picture === 'string' ? req.user.picture : undefined,
    });
  };

  // Current user profile
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await ensureSyncedUser(req);
      res.json({
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        studentNumber: user.studentNumber,
        role: user.role,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        avatarTint: user.avatarTint,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '프로필 조회 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.patch('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSyncedUser(req);
      const { displayName, studentNumber, bio, role, avatarTint, avatarUrl } =
        req.body ?? {};
      if (typeof displayName !== 'string' || !displayName.trim()) {
        return res.status(400).json({ error: '이름을 입력해 주세요.' });
      }
      const updated = await updateUserProfile(req.user!.uid, {
        displayName,
        studentNumber: typeof studentNumber === 'string' ? studentNumber : '',
        bio: typeof bio === 'string' ? bio : '',
        role: typeof role === 'string' ? role : 'student',
        avatarTint: typeof avatarTint === 'string' ? avatarTint : 'lavender',
        avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined,
      });
      res.json(updated);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '프로필 수정 실패';
      const status = msg.includes('이미지') ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  });

  // Classmates directory
  app.get('/api/classmates', optionalAuth, async (_req, res) => {
    try {
      const data = await getClassmates();
      res.json(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '목록 조회 실패';
      res.status(500).json({ error: msg });
    }
  });

  // Classroom Instagram feed
  app.get('/api/posts', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const category =
        typeof req.query.category === 'string' ? req.query.category : undefined;
      const bookmarkedOnly = req.query.bookmarked === 'true';
      const data = await getFeedPosts({
        viewerUid: req.user?.uid,
        category,
        bookmarkedOnly,
      });
      res.json(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '피드 조회 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/posts', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSyncedUser(req);
      const { category, caption, imageUrl, locationLabel } = req.body ?? {};
      if (typeof caption !== 'string' || !caption.trim()) {
        return res.status(400).json({ error: '게시글 내용을 입력해 주세요.' });
      }
      const created = await createFeedPost({
        authorUid: req.user!.uid,
        category: typeof category === 'string' ? category : '일상',
        caption,
        imageUrl: typeof imageUrl === 'string' ? imageUrl : '',
        locationLabel:
          typeof locationLabel === 'string' ? locationLabel : '2학년 3반 교실',
      });
      res.status(201).json(created);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '게시글 작성 실패';
      const status = msg.includes('이미지') ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  });

  app.delete('/api/posts/:id', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: '잘못된 게시글 번호입니다.' });
    }
    try {
      const result = await deleteFeedPost(id, req.user!.uid);
      if (result.status === 'not_found') {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }
      if (result.status === 'forbidden') {
        return res.status(403).json({ error: '본인이 작성한 글만 삭제할 수 있습니다.' });
      }
      res.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '삭제 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/posts/:id/like', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: '잘못된 게시글 번호입니다.' });
    }
    try {
      await ensureSyncedUser(req);
      const result = await togglePostLike(id, req.user!.uid);
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '좋아요 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/posts/:id/bookmark', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: '잘못된 게시글 번호입니다.' });
    }
    try {
      await ensureSyncedUser(req);
      const result = await togglePostBookmark(id, req.user!.uid);
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '북마크 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/posts/:id/comments', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: '잘못된 게시글 번호입니다.' });
    }
    const { content } = req.body ?? {};
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: '댓글 내용을 입력해 주세요.' });
    }
    try {
      await ensureSyncedUser(req);
      const created = await addPostComment({
        postId: id,
        authorUid: req.user!.uid,
        content,
      });
      res.status(201).json(created);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '댓글 작성 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/comments/:id', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: '잘못된 댓글 번호입니다.' });
    }
    try {
      const result = await deletePostComment(id, req.user!.uid);
      if (result.status === 'not_found') {
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }
      if (result.status === 'forbidden') {
        return res.status(403).json({ error: '본인 댓글만 삭제할 수 있습니다.' });
      }
      res.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '댓글 삭제 실패';
      res.status(500).json({ error: msg });
    }
  });

  // Notices & Homework
  app.get('/api/notices', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      const data = await getNoticesList({
        viewerUid: req.user?.uid,
        type,
      });
      res.json(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '공지 조회 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/notices', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSyncedUser(req);
      const { type, subject, title, content, dueDate, isPinned } = req.body ?? {};
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: '제목을 입력해 주세요.' });
      }
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: '내용을 입력해 주세요.' });
      }
      const created = await createNotice({
        authorUid: req.user!.uid,
        type: type === 'homework' ? 'homework' : 'notice',
        subject: typeof subject === 'string' ? subject : '학급일반',
        title,
        content,
        dueDate: typeof dueDate === 'string' ? dueDate : '',
        isPinned: Boolean(isPinned),
      });
      res.status(201).json(created);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '등록 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.post(
    '/api/notices/:id/toggle-complete',
    requireAuth,
    async (req: AuthRequest, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: '잘못된 번호입니다.' });
      }
      try {
        await ensureSyncedUser(req);
        const result = await toggleHomeworkComplete(id, req.user!.uid);
        res.json(result);
      } catch (error) {
        const msg = error instanceof Error ? error.message : '완료 체크 실패';
        res.status(500).json({ error: msg });
      }
    }
  );

  app.delete('/api/notices/:id', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: '잘못된 번호입니다.' });
    }
    try {
      const result = await deleteNotice(id, req.user!.uid);
      if (result.status === 'not_found') {
        return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
      }
      if (result.status === 'forbidden') {
        return res.status(403).json({ error: '본인이 등록한 항목만 삭제할 수 있습니다.' });
      }
      res.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '삭제 실패';
      res.status(500).json({ error: msg });
    }
  });

  // Anonymous Board
  app.get('/api/anonymous', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const topic =
        typeof req.query.topic === 'string' ? req.query.topic : undefined;
      const data = await getAnonymousPosts({
        viewerUid: req.user?.uid,
        topic,
      });
      res.json(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '익명 게시판 조회 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/anonymous', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSyncedUser(req);
      const { topic, title, content, alias } = req.body ?? {};
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: '제목을 입력해 주세요.' });
      }
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: '내용을 입력해 주세요.' });
      }
      const created = await createAnonymousPost({
        authorUid: req.user!.uid,
        topic: typeof topic === 'string' ? topic : '자유',
        title,
        content,
        alias: typeof alias === 'string' ? alias : undefined,
      });
      res.status(201).json(created);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '익명 글 등록 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/anonymous/:id', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: '잘못된 번호입니다.' });
    }
    try {
      const result = await deleteAnonymousPost(id, req.user!.uid);
      if (result.status === 'not_found') {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }
      if (result.status === 'forbidden') {
        return res.status(403).json({ error: '본인이 작성한 익명 글만 삭제할 수 있습니다.' });
      }
      res.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '삭제 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.post(
    '/api/anonymous/:id/like',
    requireAuth,
    async (req: AuthRequest, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: '잘못된 번호입니다.' });
      }
      try {
        await ensureSyncedUser(req);
        const result = await toggleAnonymousLike(id, req.user!.uid);
        res.json(result);
      } catch (error) {
        const msg = error instanceof Error ? error.message : '공감 실패';
        res.status(500).json({ error: msg });
      }
    }
  );

  app.post(
    '/api/anonymous/:id/comments',
    requireAuth,
    async (req: AuthRequest, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: '잘못된 번호입니다.' });
      }
      const { content } = req.body ?? {};
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: '댓글 내용을 입력해 주세요.' });
      }
      try {
        await ensureSyncedUser(req);
        const created = await addAnonymousComment({
          postId: id,
          authorUid: req.user!.uid,
          content,
        });
        res.status(201).json(created);
      } catch (error) {
        const msg = error instanceof Error ? error.message : '익명 댓글 등록 실패';
        res.status(500).json({ error: msg });
      }
    }
  );

  app.delete(
    '/api/anonymous/comments/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: '잘못된 번호입니다.' });
      }
      try {
        const result = await deleteAnonymousComment(id, req.user!.uid);
        if (result.status === 'not_found') {
          return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
        }
        if (result.status === 'forbidden') {
          return res.status(403).json({ error: '본인 댓글만 삭제할 수 있습니다.' });
        }
        res.json({ ok: true });
      } catch (error) {
        const msg = error instanceof Error ? error.message : '삭제 실패';
        res.status(500).json({ error: msg });
      }
    }
  );

  // Classroom Activity Gallery
  app.get('/api/gallery', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const eventTag =
        typeof req.query.eventTag === 'string' ? req.query.eventTag : undefined;
      const data = await getGalleryPhotos({
        viewerUid: req.user?.uid,
        eventTag,
      });
      res.json(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '갤러리 조회 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/gallery', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSyncedUser(req);
      const { title, description, eventTag, imageUrl, takenDate } =
        req.body ?? {};
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: '사진 제목을 입력해 주세요.' });
      }
      if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
        return res.status(400).json({ error: '업로드할 사진을 선택해 주세요.' });
      }
      const created = await createGalleryPhoto({
        authorUid: req.user!.uid,
        title,
        description: typeof description === 'string' ? description : '',
        eventTag: typeof eventTag === 'string' ? eventTag : '우리반일상',
        imageUrl,
        takenDate: typeof takenDate === 'string' ? takenDate : '',
      });
      res.status(201).json(created);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '사진 업로드 실패';
      const status = msg.includes('이미지') ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/gallery/:id/like', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: '잘못된 번호입니다.' });
    }
    try {
      await ensureSyncedUser(req);
      const result = await toggleGalleryLike(id, req.user!.uid);
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '좋아요 실패';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/gallery/:id', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: '잘못된 번호입니다.' });
    }
    try {
      const result = await deleteGalleryPhoto(id, req.user!.uid);
      if (result.status === 'not_found') {
        return res.status(404).json({ error: '사진을 찾을 수 없습니다.' });
      }
      if (result.status === 'forbidden') {
        return res.status(403).json({ error: '본인이 올린 사진만 삭제할 수 있습니다.' });
      }
      res.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '사진 삭제 실패';
      res.status(500).json({ error: msg });
    }
  });

  // Vite middleware or production static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
