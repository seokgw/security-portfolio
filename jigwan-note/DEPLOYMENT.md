# 직관노트 배포

## 2026-10-15 응원팀 설정

- 상단 응원팀 버튼에서 KBO 10개 팀 또는 미지정을 선택합니다.
- 로그인 계정의 `user_metadata.jigwan_favorite_team`에 저장하며 인증·권한 판단에는 사용하지 않습니다. 기존 앱 메타데이터는 변경하지 않습니다.
- 새 경기 기록에만 기본 입력하고, 기존 경기 기록의 팀은 보존합니다. 경기별 팀은 작성 화면에서 자유롭게 수정할 수 있습니다.
- 샘플에서는 체험 중에만 적용하며 서버에 저장하지 않습니다.

기존 포트폴리오와 별도로 Vercel 프로젝트를 연결합니다.

1. GitHub 저장소: `seokgw/security-portfolio`, 브랜치: `main`.
2. Vercel Root Directory: `jigwan-note`, Framework Preset: Other.
3. Build Command: `npm run build`, Output Directory: `dist`.
4. 기존 Supabase `aleph-plan-do-see` 프로젝트를 재사용합니다. 직관노트는 `jigwan.jigwan_watch_records`와 비공개 `jigwan-watch-photos`만 사용합니다. 로그인 계정(Auth)은 프로젝트 내 다른 앱과 공유합니다.
5. Vercel 환경변수 `SUPABASE_URL`, `SUPABASE_ANON_KEY`를 설정합니다. publishable 또는 anon 키만 사용합니다. service_role/secret 키는 사용하지 않습니다.
6. Supabase Redirect URLs에 `https://jigwan-note.vercel.app/`을 추가했습니다. 기존 Site URL과 다른 앱의 Redirect URL은 유지합니다. 회원가입은 직관노트 주소를 명시적으로 전달합니다.
7. 이메일 가입/인증/로그인, 기록 등록/수정/삭제, 사진 업로드/조회/삭제, 재로그인 후 유지, 두 계정 간 격리를 검증합니다.

빌드는 공개 웹 파일 여섯 개만 `dist`에 복사합니다. SQL, 문서, 환경변수 원본은 배포하지 않습니다. 환경변수가 없으면 빌드를 실패시켜 미연결 앱의 배포를 방지합니다.

## 2026-10-12 확인 상태

- 원본 파일 9개를 읽고 별도 폴더에 보존했습니다.
- JavaScript 구문 검사를 통과했습니다.
- 기존 프로젝트에 직관노트 테이블과 사진 저장소, 사용자별 RLS 정책 8개를 적용했습니다. 기존 plan-do-see 테이블과 정책을 유지했습니다.
- 새 Supabase 프로젝트 또는 유료 리소스를 생성하지 않았습니다.
- Vercel `jigwan-note` 프로젝트를 GitHub 저장소에 연결하고 공개 Supabase URL/키를 설정했습니다.
- 공개 주소: https://jigwan-note.vercel.app/ (Vercel production).
- 공개 로그인 화면과 Supabase 설정 로드를 확인했습니다.
- DB 트랜잭션 테스트로 계정 간 조회/수정/삭제와 타인 명의 등록 차단을 검증했고 테스트 데이터는 롤백했습니다.
- 브라우저에서 실제 회원가입·이메일 인증·CRUD·사진 업로드는 아직 검증하지 않았습니다.
- 기존 앱의 테이블 10개에는 RLS가 비활성화되어 있어 별도 보안 조치가 필요합니다. 기존 앱에 영향을 주므로 이번 작업에서는 변경하지 않았습니다.

## 로그인·가입 안내 및 Data API 수정

## 소개 화면과 샘플 체험

- 비로그인 첫 화면에 서비스 소개와 가상 기록 예시를 표시합니다.
- 샘플 체험은 브라우저 메모리의 가상 기록 3개만 사용하고 DB에 저장하지 않습니다. 기록을 저장하거나 삭제하려 하면 로그인을 안내합니다.
- 로그인 후에는 본인의 DB 기록을 불러와 샘플 기록을 대체합니다.
- 기록 작성/수정에서 주요 구장 선택과 기타 직접 입력을 지원합니다. 목록에 없는 기존 구장 이름은 직접 입력란에 보존합니다.
- 구장 목록 참고: https://www.koreabaseball.com/Schedule/Schedule.aspx

- 기존 Data API 역할 설정은 `vault_api`만 노출하고 있어 `public` 조회에 PGRST106 오류가 발생했습니다.
- 직관노트 테이블을 전용 `jigwan` 스키마로 옮기고 기존 `vault_api`를 유지한 채 `jigwan`만 추가했습니다. `public`은 API에 노출하지 않습니다.
- 로그인 실패, 미인증, 요청 제한, 이메일 발송 제한을 한국어로 안내합니다.
- 회원가입 응답에서 메일 발송을 단정하지 않으며 기존 계정은 로그인하도록 안내합니다.
- 로그인에는 기존 계정의 비밀번호를 사용할 수 있고, 새 비밀번호의 8자 제한은 회원가입에만 적용합니다.

설정 근거: [Vercel 구성](https://vercel.com/docs/project-configuration/vercel-json), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage 접근 제어](https://supabase.com/docs/guides/storage/security/access-control).
