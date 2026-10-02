# BR-B 전용 Supabase 연결

프로젝트: `br-b-daily-reflection` (`yebnfcjjirwynnqzoxag`), 서울 리전.

기존 플랜두씨와 분리한 전용 DB다. 기존 프로젝트의 공개 키는 BR-B 배포물에 포함하지 않는다.

## 구성

- SQL Editor에서 `schema.sql` 실행. `brb_daily_records` RLS 활성화, anon 접근 차단, authenticated 본인 ID CRUD 정책 4개 적용.
- 새 테이블 자동 노출 해제, 자동 RLS 활성화.
- `config.js`에는 프로젝트 URL과 브라우저용 publishable key만 포함.
- GitHub OAuth 앱: BR-B 소통과 사용 돌아보기. 저장소 접근 권한 없음.
- OAuth callback: `https://yebnfcjjirwynnqzoxag.supabase.co/auth/v1/callback`
- Site URL 및 허용 redirect: `https://seokgw.github.io/security-portfolio/br-b/`
- 인증 SDK: Supabase JS 2.117.2, 고정 버전 jsDelivr ESM.

## 보안과 운영

관리 토큰·Client secret은 Git 제외 `.private/`에만 보관한다. DB 비밀번호·secret API key·service_role을 브라우저 코드에 넣지 않는다. 인증 세션은 SDK가 브라우저에 보관하며 기록 본문은 DB에 저장한다.

읽기 전용 점검에서 RLS=true, anonymous SELECT=false, 정책 수=4를 확인했다. 공개 API도 비로그인 기록 조회에 HTTP 401을 반환했다. 가상 인증 사용자 생성 테스트는 실행하지 않았다. 상세 검증 범위는 `../validation.md`에 기록한다.

무료 프로젝트가 중지되거나 연결이 끊기면 DB 기능이 일시적으로 실패할 수 있다. 앱은 실패를 표시하고 저장되지 않은 입력을 유지한다. CSV로 본인 기록을 내려받을 수 있다.
