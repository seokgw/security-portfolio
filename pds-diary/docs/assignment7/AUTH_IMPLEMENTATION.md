# 과제 7 인증 구현 설명서

## ① 무엇으로 붙였나

Express 4 + MariaDB 구조를 유지하고 JWT(`jsonwebtoken` 9.0.2)와 서버측 `auth_sessions`를 함께 사용했다. JWT는 `HttpOnly`, `SameSite=Lax`, 운영 HTTPS에서 `Secure`인 `pds_auth` 쿠키로만 전달한다. 로그인마다 랜덤 UUID `jti`와 새 JWT를 발급한다. JWT 절대 만료는 8시간, 서버 idle timeout은 30분이며 정상 보호 API 요청마다 DB의 `idle_expires_at`만 연장한다. 비밀번호는 `bcryptjs` 3.0.2, cost 12로 저장한다.

## ② 왜 그걸 골랐나

이전에 다룬 JWT 흐름을 활용하되, 완전한 stateless JWT는 로그아웃 직후 기존 토큰을 끊기 어렵기 때문에 선택하지 않았다. DB 세션을 함께 확인하면 로그아웃과 비밀번호 변경 즉시 기존 `jti`를 폐기할 수 있다. 검증된 bcrypt 구현이 사용자별 랜덤 salt를 처리한다. Google/OIDC도 검토했으나 과제에서 요구하는 애플리케이션 DB의 password hash 및 동일 비밀번호의 서로 다른 hash 증거를 직접 만들기 어려워 선택하지 않았다.

## ③ 어디를 어떻게 고쳤나

- 가입: `public/index.html#registerForm` → `POST /api/auth/register` → 아이디/10자 비밀번호 검증 → `bcrypt.hash(...,12)` → `users` UNIQUE insert. 최초 가입 transaction은 `owner_id IS NULL`인 과제 6 자료를 그 계정에 인계한다.
- 로그인: `#loginForm` → 사용자 조회 → bcrypt 검증 → `crypto.randomUUID()` → JWT 발급 → `auth_sessions` insert → HttpOnly 쿠키 설정.
- 로그아웃: `#logoutBtn` → 인증 미들웨어 → 현재 session의 `revoked_at=NOW()` → 쿠키 삭제. 같은 JWT는 이후 DB 세션 검사에서 401이다.
- 비밀번호 변경: `#passwordForm` → 현재 hash 검증 → 새 hash 저장 → 사용자의 모든 활성 세션 revoke → 쿠키 삭제 및 재로그인.
- 접근 제어: `src/server.js`의 `auth`, `plan`, `task` 함수와 각 route가 JWT `sub`만 신뢰한다. Plan 목록/단건/수정과 Task/Execution/Reflection/Review/Export의 join 또는 WHERE에 소유자 조건이 들어간다. 타인 ID는 존재 여부를 숨기기 위해 일관되게 404를 반환한다.

## ④ 만료와 폐기 흐름

JWT 서명·`exp` 검증 → `jti`, `sub`, 미폐기, idle/absolute 시각을 DB에서 검증 → 인증된 사용자 설정 → 의미 있는 API 요청에서 idle 만료를 `min(now+30분, absolute)`로 연장한다. 로그아웃은 현재 `jti`, 비밀번호 변경은 해당 사용자의 모든 세션을 즉시 폐기한다. 정적 자산 요청은 미들웨어 앞에 있어 idle을 연장하지 않는다.

## ⑤ 데이터 이전과 보안

T06 최종/작업 시작 commit은 `9e9979e`다. 신규 설치는 `sql/schema.sql`, 기존 DB는 백업 후 `sql/migration-t07.sql`의 ALTER를 한 번 적용한다. 최초 가입 계정이 기존 Plan을 소유하면 자식 Task/Execution/Reflection은 FK 경로로 함께 보호되며 기존 ID와 값은 바뀌지 않는다. `JWT_SECRET`은 환경변수이고 `.env.example`에는 `change-me`만 있다. 응답/export에는 password hash, JWT, jti, session, secret을 포함하지 않는다.

## ⑥ 아직 못 막은 것

현재 로그인 시도 횟수 제한과 CSRF 전용 토큰은 없다. SameSite=Lax 쿠키와 JSON API가 기본 위험을 줄이지만, 운영 전 reverse proxy rate limit과 Origin/CSRF 검증을 추가해야 한다. 또한 실제 서로 다른 날짜의 5일 기록은 시간을 조작하지 않아야 하므로 오늘 완료했다고 표시하지 않는다.

## 짧은 확인 방법 4줄

① 어디로 가나요 → 배포 URL 첫 화면의 로그인/회원가입과 `docs/assignment7/AUTH_EVIDENCE.md`로 간다.  
② 세 단계 안에 무엇을 하나요 → 계정 생성, 로그인, 본인 Plan 확인의 세 단계다.  
③ 무엇이 보이면 통과인가요 → 로그인 전 API 401, 로그인 후 본인 데이터 200, 양방향 타인 접근 404가 보인다.  
④ 안 될 때는 무엇이 보이나요 → 만료·폐기 JWT는 401, 타인 자료 ID는 404, 중복 가입은 409다.

## AI와 내 판단 3줄

① AI에게 맡긴 일 — 인증/세션/소유권 코드, 스키마, 정적 검증과 제출 문서 초안을 맡겼다.  
② 내가 직접 판단한 일 — 실제 계정과 5일간 입력할 지표·값·계획 규칙은 사용자가 실제 날짜에 판단한다.  
③ AI 제안을 따르지 않은 일 — 실제 5일 기록을 seed나 날짜 조작으로 완성하지 않았다.
