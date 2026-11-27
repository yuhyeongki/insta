import type { Request, Response, NextFunction } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface VerifiedUser {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface AuthRequest extends Request {
  user?: VerifiedUser;
}

let cachedSupabaseServerClient: SupabaseClient | null = null;

function getSupabaseServerClient(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url.trim() || !key.trim()) return null;
  if (!cachedSupabaseServerClient) {
    cachedSupabaseServerClient = createClient(url.trim(), key.trim(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return cachedSupabaseServerClient;
}

async function verifyBearerToken(token: string): Promise<VerifiedUser> {
  const supabaseServer = getSupabaseServerClient();
  if (supabaseServer) {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data.user) {
      throw new Error('Invalid Supabase session token');
    }
    const meta = data.user.user_metadata || {};
    return {
      uid: data.user.id,
      email: data.user.email || '',
      name:
        typeof meta.full_name === 'string'
          ? meta.full_name
          : typeof meta.name === 'string'
            ? meta.name
            : undefined,
      picture:
        typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
    };
  }

  const decodedToken = await adminAuth.verifyIdToken(token);
  return {
    uid: decodedToken.uid,
    email: decodedToken.email || '',
    name: typeof decodedToken.name === 'string' ? decodedToken.name : undefined,
    picture:
      typeof decodedToken.picture === 'string'
        ? decodedToken.picture
        : undefined,
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '로그인이 필요한 기능입니다.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    req.user = await verifyBearerToken(token);
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res
      .status(401)
      .json({ error: '인증 세션이 만료되었습니다. 다시 로그인해 주세요.' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      req.user = await verifyBearerToken(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
};
