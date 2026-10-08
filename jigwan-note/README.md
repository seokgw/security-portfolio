# 직관노트 — 나의 야구 기록

GitHub/Vercel 배포 설정은 [DEPLOYMENT.md](DEPLOYMENT.md)를 확인하세요. Vercel Root Directory는 `jigwan-note`이며, 환경변수에서 공개 Supabase 설정을 생성합니다.

야구 직관 기록용 반응형 웹앱입니다. UI는 정적 호스팅, 계정·DB·사진은 Supabase에서 관리합니다. Supabase 연결 전에는 데이터 기능이 활성화되지 않습니다.

## Supabase 연결/실행

1. Supabase 프로젝트를 생성합니다.
2. 대시보드의 SQL Editor에서 `supabase-schema.sql` 전체를 실행합니다. 계정별 RLS가 적용된 `watch_records`와 비공개 `watch-photos` bucket 및 정책이 만들어집니다.
3. Project Settings → API의 Project URL과 anon/public key를 `supabase-config.js`의 `url`, `anonKey`에 설정합니다. **service_role 키는 브라우저 파일에 절대 넣지 마세요.** `supabase-config.js`의 빈 값은 프로젝트에서 직접 채워야 합니다.
4. Supabase Authentication 이메일 로그인을 사용 설정하고 Site URL/Redirect URLs에 배포 주소를 등록합니다. 이메일 확인이 켜져 있으면 인증 후 로그인해야 합니다.
5. `index.html`, `styles.css`, `account.css`, `app.js`, `cloud-entry.js`, `supabase-config.js`를 HTTPS 정적 호스팅에 배포합니다. `file://`보다 로컬 웹 서버/호스팅을 권장합니다.
6. 회원가입·로그인 후 여러 기록의 등록/조회/수정/삭제, 사진, 로그아웃/재로그인, 다른 브라우저에서의 계정별 데이터 격리를 확인합니다.

브라우저에 공개되는 anon key 자체는 비밀이 아닙니다. 보안은 DB 및 Storage RLS가 담당하므로 운영 전 Supabase의 정책을 확인하세요.

## 구현

- 이메일/비밀번호 회원가입, 로그인, 로그아웃, 세션 유지
- 로그인한 사용자의 기록 CRUD 및 DB 기반 통계/목록/검색/필터
- 기록별 사진 최대 3장, 원본 5MB 이하, 긴 변 1,200px로 축소해 private Storage에 저장
- 사진은 DB에 Storage 경로만 보관하고 서명 URL로 표시
- 승률은 승 ÷ (승+패), 무승부 제외. 팀 미지정 시 결과 직접 선택
- 날짜·구장·상대 팀·결과 필수. 점수는 양쪽 모두 입력하거나 모두 생략, 응원 팀이 있을 때만 입력 가능

## 이전 localStorage 데이터

기존 브라우저 localStorage 기록은 DB에 자동 이관되지 않습니다. 기존 데이터를 보존해야 한다면 이전 버전에서 따로 내보내고 새 계정에 다시 등록하세요. 새 앱은 직관 기록을 localStorage에 저장하지 않고, 앱 메모리와 Supabase DB를 사용합니다. Supabase SDK의 로그인 세션은 인증 유지용으로 브라우저 저장소를 쓸 수 있습니다.

## 서비스 시작 전 확인

계정 가입/이메일 인증 설정, 비밀번호 복구, 계정 삭제 정책, 개인정보 안내, 백업·보존, 배포 도메인, Storage 및 DB의 RLS를 프로젝트 운영자가 설정해야 합니다. 실제 프로젝트 생성, 설정값 입력, SQL 실행, 브라우저/모바일 CRUD 테스트 및 배포는 여기서 수행하지 않았습니다. 설정을 마치기 전 앱은 연결된 실서비스가 아닙니다.
