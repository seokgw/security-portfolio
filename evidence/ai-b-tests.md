# AI B 검사 실행 결과

- 검사 대상: `assignment5-real-information-board/`
- 과제 4 보존 확인: `git diff ae5eaf3 -- t04-real-information-board` 출력 없음
- 실행 환경: Node v24.19.0, Google Chrome headless, Playwright, 1366×768 viewport
- 종료 시각: 2026-08-28T12:48:01+09:00

## 회차

1. 로직 테스트: 23/23 PASS.
2. 브라우저 1차: 검증 스크립트가 합성 fixture 단위를 `°C`로 잘못 가정해 FAIL. 제품 결함은 아니며, 기존 fixture 계약의 `pt`로 기대값을 바로잡음.
3. 브라우저 2차: 고정 검사 10/10 PASS. 1366×768에서 문서 가로 크기 1366px, 핵심 요소 넘침·잘림 없음.

## 고정 검사 결과

| ID | 결과 | 확인 내용 |
|---|---|---|
| T5-TEST-01 | PASS | 정상 조회 후 `fresh` 배지 |
| T5-TEST-02 | PASS | `27.4 °C` 화면 표시 |
| T5-TEST-03 | PASS | Open-Meteo 출처 URL 표시 |
| T5-TEST-04 | PASS | 출처 시각·조회 시각 표시 |
| T5-TEST-05 | PASS | 정상값 105 pt 후 timeout에서 `stale`, 값 보존 |
| T5-TEST-06 | PASS | 마지막 정상값 105 유지 설명 |
| T5-TEST-07 | PASS | 초기 timeout에서 `error`, 값 `—`, 정상값 없음 설명 |
| T5-TEST-08 | PASS | 로직 테스트에서 stale/error 후 `fresh` 복구 |
| T5-TEST-09 | PASS | 새로고침 후 `stale`·105 pt·오래된 값 유지 |
| T5-TEST-10 | PASS | 1366×768에서 `#live-badge`, `#live-note`, `#error-panel`, `#error-explain` 넘침·잘림 없음 |

## 증거

- 자동 브라우저 검사: `assignment5-real-information-board/tests/browser-status.cjs`
- 1366×768 렌더: `assignment5-real-information-board/evidence/t5-1366x768-error.png`

