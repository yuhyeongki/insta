# 우리반그램 — 학급 커뮤니티

밝은 파스텔 톤의 학급 전용 인스타그램 커뮤니티 웹앱입니다.
**`VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`(Publishable key) 딱 2개만** 넣으면 별도 백엔드 서버나 `DATABASE_URL` 없이 Vercel 등에서 바로 배포할 수 있습니다.

## 1. Supabase 설정 (딱 2단계)

1. Supabase 대시보드의 **SQL Editor**에서 `supabase/schema.sql` 전체 내용을 복사해 실행(Run)합니다.
   - 초기 샘플 데이터도 넣고 싶다면 `supabase/seed.sql`을 이어서 실행하세요.
2. (선택) 학생들이 이메일 인증 메일 없이 바로 가입·로그인하게 하려면 **Authentication → Providers → Email**에서 **Confirm email**을 꺼두세요.

## 2. 배포 방법 (Vercel 추천)

1. 이 코드를 GitHub에 올립니다.
2. [Vercel](https://vercel.com)에서 해당 GitHub 저장소를 가져옵니다(Import).
3. **Environment Variables**에 딱 2개만 입력합니다:
   - `VITE_SUPABASE_URL`: Supabase **Project URL** (`https://...supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Supabase **Publishable key** (`sb_publishable_...` 또는 `anon` 키)
4. **Deploy**를 누르면 완료됩니다!

## 3. 로컬 실행

```bash
cp .env.example .env
# .env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 입력
npm install
npm run dev
```
