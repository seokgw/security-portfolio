# 과제 8 — 내 소개 페이지에 패스키 달기

## ① 무엇으로 붙였나

WebAuthn 표준과 검증 라이브러리를 사용했다. 서버는 Node.js 24, Express 5, `@simplewebauthn/server` 14.0.1, 브라우저는 `@simplewebauthn/browser` 14.0.0이다. 비밀번호 입력·저장·로그인은 새 패스키 서비스에 없다. 기존 과제 7 다이어리의 인증 기능은 별도 서비스로 유지한다.

기기의 인증기가 키 쌍을 만들고 등록 응답의 공개키를 서버가 검증·보관한다. 로그인 때는 새 challenge에 대한 서명을 저장된 공개키로 검증한다. 서버는 개인키를 받거나 저장하지 않는다. 동기화 패스키의 개인키 보관·동기화는 기기/플랫폼 제공자가 관리한다.

## ② 왜 그걸 골랐나

브라우저 표준을 쓰고 직접 서명 검증 알고리즘을 구현하지 않기 위해 선택했다. 서버가 challenge·origin·RP ID·공개키·서명·사용자 확인(UV)·counter를 확인하며, 일회용 challenge로 재전송을 차단한다. [SimpleWebAuthn 공식 문서](https://simplewebauthn.dev/docs/packages/server)를 기준으로 구현했다.

GitHub Pages에는 서버를 실행할 수 없으므로 공개 소개 페이지에는 입구만 추가했다. 다이어리 VM에서 별도 프로세스·SQLite DB·도메인으로 인증 서버를 운영한다. 도메인 기반 RP ID가 필요해 IP 주소를 직접 사용하지 않았다. [WebAuthn RP ID 규칙](https://www.w3.org/TR/webauthn/#relying-party-identifier), [sslip.io 서비스 설명](https://nip.io/).

## ③ 어디를 어떻게 고쳤나

아래 경로는 저장소 루트 기준이다.

| 흐름 | 코드 위치 | 처리 |
|---|---|---|
| 공개 입구 | `index.html`, `passkey-space/index.html` | 기존 소개 유지, Private Space 링크 |
| 등록 | `passkey-space/server.js`: `/api/passkey/register/options`, `/verify`; `public/app.js`: `register` | 서버 challenge → 기기 키 생성 → 라이브러리 검증 → 계정/credential 원자적 저장 |
| 로그인 | `server.js`: `/api/passkey/login/options`, `/verify` | 계정 소속 credential 조회, 실제 서명 검증 후 세션 발급 |
| 로그아웃 | `server.js`: `/api/logout`; `public/app.js`: logout handler | DB 세션 삭제, 진행 중 challenge 무효화, 쿠키 삭제, 화면 데이터 제거 |
| 비공개 조회 | `server.js`: `requireAuth`, `guardOwner`, `privateData` | 세션의 계정 ID로만 notes 조회 |
| 패스키 관리 | `server.js`: `/api/passkeys`, `DELETE /api/passkeys/:credentialId` | 이름·등록일 표시, 소유자 제한, 삭제 후 모든 세션 무효화 |
| 저장소 | `passkey-space/store.js`: `openStore` | accounts, credentials, challenges, sessions, notes, evidence 테이블 |
| 화면 | `passkey-space/public/index.html`, `app.js`, `style.css` | 로그인·등록·메모·관리·마스킹 Evidence |
| 검증 | `passkey-space/tests/auth.test.js` | Chromium 가상 인증기의 실제 WebAuthn + 실제 HTTP 요청 |
| 배포 | `passkey-space/deploy/install.sh` | 전용 Node 런타임·systemd·Nginx·HTTPS |

### challenge / 공개키 / 세션 저장 위치

로컬 DB 기본값: `passkey-space/data/passkeys.sqlite`. 운영 DB: `/var/lib/portfolio-passkey/passkeys.sqlite`.

- 등록과 로그인 challenge: `challenges`. 난수 value, purpose, account, created, used, 브라우저 흐름 해시, 등록 시작 시 세션 해시를 저장한다. 유효기간은 5분이다. 검증 시작 시 동기적으로 used=1 처리해 성공·실패 모두 재사용할 수 없다. 취소 API도 무효화한다.
- 공개키: `credentials.public_key` BLOB. credential ID, 계정 ID, counter, 이름, 등록 시각, transports도 저장한다. UNIQUE credential ID와 트랜잭션으로 중복·불완전 저장을 막는다.
- 세션: `sessions`에 256비트 난수 세션의 SHA-256 해시와 계정, 1시간 만료 시각을 보관한다. 원본은 HTTPS `__Host-session` 쿠키로만 전달한다. HttpOnly, Secure, SameSite=Strict, Path=/이다. localStorage/JWT를 사용하지 않는다.
- 최초 등록은 새 계정을 만든다. 이미 존재하는 계정은 로그인해야 패스키를 추가할 수 있다. 패스키 0개 계정도 익명으로 다시 등록할 수 없다.
- 삭제는 credential 행을 지우고 해당 계정의 모든 세션과 challenge를 무효화한다. 서버의 credential 삭제는 기기에 남은 항목을 자동 삭제하지 않지만, 그 항목으로 인증할 수는 없다.
- private query/path/body의 userId/accountId는 인증된 계정과 다르면 403이다. SQL에는 세션 계정 ID만 넣는다.
- 서버의 `public/` 디렉터리만 정적으로 제공한다. DB·서버 소스·환경 파일을 HTTP 정적 파일로 제공하지 않는다. 샘플은 새 계정 생성 시 서버에서 3개 생성한다. GitHub 소스의 샘플 문장은 공개 가상 데이터이며 실제 개인정보가 아니다.

## ④ 안 열리는 것을 확인한 기록

실행 결과는 [로컬 35개 검사](evidence/http-results.json), [공개 HTTPS 15개 검사](evidence/live-http-results.json), [로그인 전 화면](evidence/01-locked.png), [패스키 두 개 화면](evidence/02-two-passkeys.png), [운영 HTTPS 화면](evidence/04-live-https.png)에 있다. Chromium 가상 인증기로 수행했으며 실제 생체 인식/휴대폰 동작을 대신 인증했다고 주장하지 않는다. 서명 검증 함수를 mock하거나 성공으로 강제하지 않았다.

| 검증 | 정상 요청 | 거절 요청 |
|---|---|---|
| 비공개 접근 | 등록/로그인 후 GET /api/private → 200, 자기 메모 3개 | 쿠키 없이 같은 GET → 401 |
| 남의 계정 접근 | A→A, B→B 조회 → 200 | A→B / B→A query·path·body → 403. 자료 개수 전후 A=3/B=3 |
| challenge 재사용 | 새 assertion POST /api/passkey/login/verify → 200 | 같은 body 다시 POST → 400. 잘못된 서명은 401, 그 실패 요청 재사용도 400 |
| 패스키 삭제 | 두 개 중 하나 삭제 후 남은 패스키로 로그인 → 200 | 삭제된 키로 **새 challenge**에 서명 후 로그인 → 401 |

아래는 실제 테스트의 요청 형태와 서버 응답이다. 세션·credential·challenge·서명 원문은 제출 자료에 남기지 않는다.

```http
GET /api/private
(Cookie 없음)
HTTP/1.1 401
{"error":"authentication_required"}

GET /api/private?userId=<B 계정 ID>
Cookie: __Host-session=**** (A의 세션)
HTTP/1.1 403
{"error":"account_access_denied"}

POST /api/passkey/login/verify
Origin: <인증 서버 origin>
Content-Type: application/json
{"challengeId":"<이미 사용한 요청 ID>","credential":"<같은 assertion; 원문 생략>"}
HTTP/1.1 400
{"error":"challenge_already_used"}

POST /api/passkey/login/verify
Origin: <인증 서버 origin>
Content-Type: application/json
{"challengeId":"<새 요청 ID>","credential":"<삭제한 키로 서명한 assertion; 원문 생략>"}
HTTP/1.1 401
{"error":"credential_not_found"}
```

추가로 취소 후 계정/credential 0개, 서로 다른 등록·로그인 challenge, 공개키 BLOB 존재, 개인키 없는 등록 응답, excludeCredentials, 기존 쿠키 로그아웃 후 401, 마지막 키 삭제 후 401, 5분 만료 거절을 확인했다.

## ⑤ AI와 나

- AI에게 맡긴 일: 기존 코드 분석, WebAuthn 서버·UI 구현, 가상 인증기 테스트, 배포 구성, 검증 결과 정리.
- 내가 직접 판단한 일: 사용자가 제시한 프롬프트에 따라 공개 소개 유지, 비공개 영역만 패스키 보호, 비밀번호 미사용을 요구했다. 사용자는 문서를 새 폴더에 저장하고 기존 다이어리 서버를 사용하도록 직접 지정했다.
- AI 제안을 따르지 않은 일: 사용자가 거절한 별도의 기술 제안은 대화에서 확인되지 않았다. 모든 세부 구현을 사용자가 검토·승인했다고 꾸며 쓰지 않는다. 실제 제출 시 본인이 선택 이유와 추가 판단을 보완해야 한다.

## ⑥ 아직 못 막은 것

- 마지막 패스키를 삭제하거나 모든 기기를 잃으면 계정 복구 수단이 없다. 마지막 키 삭제 전 경고를 표시하며 0개 상태를 실제 시험할 수 있다.
- 패스키 삭제 시 별도 최신 재인증은 요구하지 않는다. 유효 세션을 탈취한 공격자는 해당 계정의 키를 삭제할 수 있다. 삭제 시 모든 세션을 무효화하지만 이미 탈취된 세션의 행위를 소급해 막지 못한다.
- SQLite와 단일 VM 구성이다. 디스크 손실·VM 중지 시 서비스가 중단된다. 운영 DB의 별도 백업/재해 복구는 추가해야 한다.
- 계정 이름과 등록 여부가 추측 가능하고 공개 가입이 가능하다. IP 요청 제한은 있으나 분산 봇과 대량 가입을 완전히 막지 못한다.
- sslip.io DNS와 고정된 VM IP에 의존한다. 도메인/RP ID 변경 시 기존 패스키를 그대로 다른 도메인으로 옮길 수 없다.
- 테스트는 Chromium 가상 보안키를 사용했다. 실제 Windows Hello·iPhone·Android·Safari 호환성은 사용자 기기에서 추가 확인해야 한다.

## 짧은 확인 방법 4줄

① 어디로 가나요: 공개 소개 페이지의 Private Space 입구 → 전용 패스키 서버.

② 세 단계 안에 무엇을 하나요: 가상 계정 이름으로 패스키 등록 → 비공개 메모/키 목록 확인 → 로그아웃 후 패스키 로그인.

③ 무엇이 보이면 통과인가요: 인증 전 메모 없음, 인증 후 자기 메모 3개, 비로그인 API 401, 교차 계정 403, 재사용 400.

④ 안 될 때는 무엇이 보이나요: 취소/만료/검증 실패 안내, 삭제된 키 및 0개 계정 로그인 거절.

## 로컬 실행·테스트

```sh
cd passkey-space
pnpm install --frozen-lockfile
pnpm start
# http://localhost:3008 에 접속 (127.0.0.1과 혼용하지 않기)
pnpm test
```

Node 24 이상, pnpm 11.19.0, Chrome이 필요하다. Edge만 있으면 TEST_BROWSER=msedge 환경변수를 설정한다. 테스트는 별도 임시 SQLite를 만들고 끝나면 제거한다. 실서비스 DB를 사용하지 않는다. Windows에서는 `curl.exe -i http://localhost:3008/api/private`로 비로그인 401을 확인할 수 있다.

HTTPS 환경의 변경 요청은 해당 Origin 헤더와 application/json이 필요하다. curl은 브라우저처럼 Origin을 자동 설정하지 않으므로 직접 넣는다. GET에는 필요 없다. 인증은 WebAuthn 지원 브라우저에서 먼저 진행해야 한다. 쿠키를 복사한 요청은 공유 파일이나 저장소에 남기지 않는다.

## 배포·운영

`deploy/install.sh`를 다이어리 VM에서 실행한다. 기존 다이어리의 Node 20, MariaDB, 서비스, Nginx IP 사이트를 교체하지 않는다. 패스키 앱은 `/opt/portfolio-passkey`, 전용 런타임 `/opt/portfolio-node24`, systemd `portfolio-passkey`, 내부 포트 3008이다. Nginx만 443으로 외부 요청을 받는다. 방화벽에 3008을 열지 않는다.

`sudo systemctl status portfolio-passkey`, `sudo journalctl -u portfolio-passkey`로 상태를 확인한다. 환경 설정에 비밀값이 필요하지 않으며 DB 폴더는 서비스 사용자만 읽고 쓸 수 있다. Certbot 갱신과 Nginx reload hook을 유지한다. 배포 후 `/api/health` 200, `/api/private` 401, 실제 패스키 등록·로그인을 확인한다.

세부 기준 대응은 [CHECKLIST.md](CHECKLIST.md), AI 판단 3줄은 [AI_DECISIONS.md](AI_DECISIONS.md)에서 확인한다.
