# 인증 검증 증거

민감값은 출력하지 않는다. 아래 자동 정적 검증은 `pnpm test`로 실행하며 전체 JWT, 비밀번호, secret을 기록하지 않는다.

| 검증 | 결과 | 근거 |
|---|---|---|
| 첫 화면 로그인, 보호 앱 초기 숨김 | PASS | `public/index.html`, static test |
| JWT HttpOnly/SameSite 쿠키, URL 저장 없음 | PASS | `src/server.js`, static test |
| 서버 jti/idle/absolute/revoke | PASS | `auth_sessions`, `auth` middleware |
| bcryptjs cost 12, UNIQUE 사용자 | PASS | register route, schema |
| 비로그인 보호 API 401 | PASS (코드/정적) | `/api` auth middleware |
| 클라이언트 owner/user ID 무시 | PASS | body 값을 읽지 않는 정적 검사 |
| 모든 주요 목록 owner filter | PASS | plans/tasks/executions/reflections/daily/export routes |
| 로그아웃 후 동일 JWT 401 | NOT YET (DB HTTP 실행 필요) | logout revocation 구현 완료 |
| 비밀번호 변경 후 이전 JWT 401 | NOT YET (DB HTTP 실행 필요) | all-session revocation 구현 완료 |
| A↔B READ/UPDATE/DELETE 6회 | NOT YET (DB HTTP 실행 필요) | owner 조건 구현 완료 |
| 동일 비밀번호 hash가 서로 다름 | NOT YET (실제 DB 확인 필요) | bcrypt random salt 구현 완료 |
| 기존 T06 데이터 최초 계정 인계 | NOT YET (운영 DB migration 필요) | register transaction 구현 완료 |
| 실제 5일 + 규칙 변경 정확히 1회 | NOT YET | 실제 날짜가 지나야 함 |

실제 HTTP 증거를 만들 때 JWT는 `eyJhbGciOi...생략`, 비밀번호는 `[REDACTED]`로 적는다. A/B 공격 전후 각 계정의 건수와 값을 함께 기록한다.
