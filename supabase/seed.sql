-- 선택 사항: 초기 샘플 데이터를 넣고 싶을 때 Supabase SQL Editor에서 실행하세요.

INSERT INTO users (uid, email, display_name, student_number, role, bio, avatar_url, avatar_tint)
VALUES
  ('seed-teacher-01', 'teacher@class.local', '이서연 선생님', '2학년 3반 담임', 'teacher', '2학년 3반 담임교사입니다. 오늘도 따뜻한 하루 보내요!', '', 'lavender'),
  ('seed-student-01', 'haneul@class.local', '김하늘', '2-3 07번', 'student', '학급 홍보부장 · 사진 찍기 좋아해요', '', 'sky'),
  ('seed-student-02', 'minjun@class.local', '박민준', '2-3 14번', 'student', '과학실험 동아리 · 농구부', '', 'mint'),
  ('seed-student-03', 'jiwoo@class.local', '최지우', '2-3 21번', 'student', '필기 공유 & 스터디 메이트 구해요', '', 'peach')
ON CONFLICT (uid) DO NOTHING;

INSERT INTO notices (author_uid, type, subject, title, content, due_date, is_pinned)
VALUES
  ('seed-teacher-01', 'notice', '학급일반', '이번 주 금요일 학급 단체사진 및 롤링페이퍼 안내', '금요일 4교시 종료 후 운동장 벚꽃나무 앞에서 반 단체사진을 촬영합니다. 단정한 교복 차림으로 모여주세요.', '2026-11-27', true),
  ('seed-teacher-01', 'homework', '수학', '수학 II 도함수 활용 워크북 32~38쪽 풀기', '풀이 과정을 노트에 반드시 적어서 목요일 아침 조례 전까지 수학 부장에게 제출하세요.', '2026-11-28', true);
