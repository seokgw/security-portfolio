# T08-C01~T08-C53 구현 대응표

중요: 첨부 프롬프트에는 공식 53개 기준의 개별 원문이 없고 C13~C46의 관련 범위만 있다. 아래는 **프롬프트의 순서를 따른 잠정 대응표**이며, 공식 채점표를 확인해 번호별 문구를 대조해야 한다. 특히 C01~C12, C47~C53은 원문 미제공이라 공식 충족을 확정하지 않는다. 구현·테스트 결과와 기준 번호 매핑의 확실성을 구분한다.

경로는 passkey-space 기준이다. 로컬 자동 검사 결과는 evidence/http-results.json에 기록한다. 운영 HTTPS 결과는 DEPLOYMENT.md를 확인한다. 실제 개인 기기 승인은 별도 확인 대상이다.

| 기준 | 대응 내용 (잠정) | 코드/화면/증거 | 원문 매핑 |
|---|---|---|---|
| T08-C01 | 공개 소개 보존 | ../index.html 의 기존 내용과 Private Space 입구 | 개별 원문 미제공 |
| T08-C02 | 공개 첫 화면 접근 | 로그인 없는 공개 index.html | 개별 원문 미제공 |
| T08-C03 | 공개/비공개 서버 분리 | GitHub Pages와 별도 VM 서비스 | 개별 원문 미제공 |
| T08-C04 | HTTPS 배포 | deploy/install.sh; 운영 검증 기록 확인 | 개별 원문 미제공 |
| T08-C05 | WebAuthn 구현 | server.js, public/app.js | 개별 원문 미제공 |
| T08-C06 | 검증 라이브러리 | package.json / pnpm-lock.yaml | 개별 원문 미제공 |
| T08-C07 | 키 생성·서버 공개키 저장 | register/verify, credentials.public_key | 개별 원문 미제공 |
| T08-C08 | 개인키 미저장 | store.js 스키마; 등록 body 검사 | 개별 원문 미제공 |
| T08-C09 | 제출 설명 6항목 | TASK8_AUTH_IMPLEMENTATION.md ①~⑥ | 개별 원문 미제공 |
| T08-C10 | 확인 방법 4줄 | TASK8_AUTH_IMPLEMENTATION.md | 개별 원문 미제공 |
| T08-C11 | AI 판단 3줄 | AI_DECISIONS.md | 개별 원문 미제공 |
| T08-C12 | 증거·실행 방법 | evidence/; 테스트·배포 안내 | 개별 원문 미제공 |
| T08-C13 | 공개 영역 유지 | 루트 index.html | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C14 | 비공개 영역 구분 | public/index.html, 01-locked.png | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C15 | 샘플 3개 | 서버의 계정별 notes 생성 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C16 | 비로그인 화면 차단 | clearPrivate; requireAuth | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C17 | 초기 HTML/JS 비공개 데이터 없음 | public/ 정적 파일; HTML 검사 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C18 | 비공개 API 401 | requireAuth; HTTP 증거 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C19 | 등록 options | register/options | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C20 | 서로 다른 등록 challenge | generateRegistrationOptions; HTTP 증거 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C21 | 서버 challenge 저장 | challenges 테이블 / saveChallenge | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C22 | 등록 응답 검증 | verifyRegistrationResponse | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C23 | credential 공개키 저장 | credentials BLOB; DB 검사 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C24 | 이름·날짜 | /api/passkeys; 02-two-passkeys.png | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C25 | 등록 취소 | /api/passkey/cancel; DB 0개 검사 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C26 | 중복 패스키 제외 | excludeCredentials; 검사 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C27 | 로그인 options | login/options | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C28 | 로그인 새 challenge | generateAuthenticationOptions; 증거 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C29 | 정상 서명 성공 | verifyAuthenticationResponse; 200 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C30 | 잘못된 서명 거절 | 401; 서명 비트 변조 검사 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C31 | 재사용·다른 credential 거절 | consume; credential+account 조회 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C32 | 인증 유지 | HttpOnly 서버 세션 / sessions | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C33 | 로그아웃 무효화 | logout에서 DB 세션 삭제 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C34 | 이전 인증 값 거절 | 로그아웃 전 쿠키 재사용 401 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C35 | 비밀번호 입력 없음 | 새 서비스 public/index.html | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C36 | 두 계정 | Account-A/B 테스트 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C37 | 계정별 다른 내용 | notes.account + 계정별 제목 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C38 | 세션 계정 기준 조회 | privateData | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C39 | A→B 거절 | query/path/body 403 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C40 | B→A 거절 | query/path/body 403 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C41 | 상대 자료 개수 보존 | 전후 3/3; HTTP 증거 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C42 | 키 두 개 등록 | 02-two-passkeys.png | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C43 | 이름·날짜·삭제 관리 | public/app.js keys 목록 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C44 | 남은 키 로그인 | 삭제 후 정상 200 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C45 | 삭제 키 로그인 거절 | 새 challenge + 삭제 credential →401 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C46 | 0개 상태 | 401 안내와 마지막 삭제 확인창 | 관련 범위 제공·개별 문구 대조 필요 |
| T08-C47 | 일회용·만료 | consume / 5분 / used | 개별 원문 미제공 |
| T08-C48 | 요청 origin·RP ID 검증 | expectedOrigin/expectedRPID | 개별 원문 미제공 |
| T08-C49 | 로그 마스킹 | evidence에는 앞 8자리; 세션 미출력 | 개별 원문 미제공 |
| T08-C50 | 요청/응답 증거 | evidence/http-results.json | 개별 원문 미제공 |
| T08-C51 | 계정 소유권 경계 | guardOwner + 세션 기반 SQL | 개별 원문 미제공 |
| T08-C52 | 비밀값 제외 | gitignore; DB 외부 경로; 정적 파일 제한 | 개별 원문 미제공 |
| T08-C53 | 최종 제출 정리 | 설명서·AI 판단·체크리스트·증거 | 개별 원문 미제공 |
