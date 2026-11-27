export interface PostComment {
  id: number;
  authorName: string;
  authorStudentNumber: string;
  authorAvatarUrl: string;
  authorAvatarTint: string;
  content: string;
  createdAt: string;
  isMine: boolean;
}

export interface FeedPost {
  id: number;
  category: string;
  caption: string;
  imageUrl: string;
  locationLabel: string;
  createdAt: string;
  authorName: string;
  authorStudentNumber: string;
  authorRole: string;
  authorAvatarUrl: string;
  authorAvatarTint: string;
  likesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isMine: boolean;
  comments: PostComment[];
}

export interface NoticeItem {
  id: number;
  type: 'notice' | 'homework';
  subject: string;
  title: string;
  content: string;
  dueDate: string;
  isPinned: boolean;
  createdAt: string;
  authorName: string;
  authorRole: string;
  authorStudentNumber: string;
  completedCount: number;
  isCompleted: boolean;
  isMine: boolean;
}

export interface AnonymousComment {
  id: number;
  anonymousAlias: string;
  content: string;
  createdAt: string;
  isMine: boolean;
}

export interface AnonymousPost {
  id: number;
  topic: string;
  anonymousAlias: string;
  title: string;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  isMine: boolean;
  comments: AnonymousComment[];
}

export interface GalleryPhoto {
  id: number;
  title: string;
  description: string;
  eventTag: string;
  imageUrl: string;
  takenDate: string;
  createdAt: string;
  authorName: string;
  authorStudentNumber: string;
  likesCount: number;
  isLiked: boolean;
  isMine: boolean;
}

export interface Classmate {
  id: number;
  displayName: string;
  studentNumber: string;
  role: string;
  bio: string;
  avatarUrl: string;
  avatarTint: string;
  postCount: number;
}

export type ActiveTab = 'feed' | 'notices' | 'anonymous' | 'gallery' | 'profile';
