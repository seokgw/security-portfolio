# 직관노트 배포

기존 포트폴리오와 별도로 Vercel 프로젝트를 연결합니다.

1. GitHub 저장소: `seokgw/security-portfolio`, 브랜치: `main`.
2. Vercel Root Directory: `jigwan-note`, Framework Preset: Other.
3. Build Command: `npm run build`, Output Directory: `dist`.
4. Supabase 프로젝트에서 `supabase-schema.sql`을 실행합니다.
5. Vercel 환경변수 `SUPABASE_URL`, `SUPABASE_ANON_KEY`를 설정합니다. publishable 또는 anon 키만 사용합니다. service_role/secret 키는 사용하지 않습니다.
6. 배포 후 Supabase Authentication URL Configuration의 Site URL과 Redirect URLs에 실제 HTTPS 배포 주소를 등록합니다.
7. 이메일 가입/인증/로그인, 기록 등록/수정/삭제, 사진 업로드/조회/삭제, 재로그인 후 유지, 두 계정 간 격리를 검증합니다.

빌드는 공개 웹 파일 여섯 개만 `dist`에 복사합니다. SQL, 문서, 환경변수 원본은 배포하지 않습니다. 환경변수가 없으면 빌드를 실패시켜 미연결 앱의 배포를 방지합니다.

## 2026-10-08 확인 상태

- 원본 파일 9개를 읽고 별도 폴더에 보존했습니다.
- JavaScript 구문 검사를 통과했습니다.
- 실제 Supabase 프로젝트 생성/SQL 적용과 Vercel 배포는 계정 연결 후 진행해야 합니다.
- 실제 브라우저 CRUD, 사진, 계정 격리 검증은 아직 수행하지 않았습니다.

설정 근거: [Vercel 구성](https://vercel.com/docs/project-configuration/vercel-json), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage 접근 제어](https://supabase.com/docs/guides/storage/security/access-control).
