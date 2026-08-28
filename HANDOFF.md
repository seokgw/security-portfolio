# 1. 목표

> 현재 작업 경로 보정(2026-08-28): 과제 4 원본은 변경하지 않고, 아래에 기록된 과제 5 개선본은 `assignment5-real-information-board/`에서 계속한다. 아래의 `t04-real-information-board/` 경로는 AI A 작업 당시의 역사적 기록이다.
>
> AI B 완료 보정(2026-08-28): 5절의 남은 문제를 모두 처리했다. Node 로직 테스트 23/23, 브라우저 고정 검사 10/10이 PASS했고, `evidence/ai-b-tests.md`, `evidence/comparison.md`, 과제 5 페이지의 공개 보고서를 완성했다. 과제 4 폴더는 기준 commit `ae5eaf3`과 차이가 없다.

과제 4(`t04-real-information-board`)의 정보판에 작은 개선 기능 1개를 추가한다.

**개선 기능: 데이터 상태(`fresh` / `stale` / `error`)와 마지막 정상값을 사용자가 명확히 구분할 수 있는 상태 표시 영역 개선.**

- 사용자가 지금 보는 값이 (1) 방금 정상 조회된 새 값인지, (2) 예전 정상값(오류가 나서 그대로 유지 중)인지, (3) 아직 정상값이 한 번도 없는 오류 상태인지를 화면에서 바로 구분할 수 있어야 한다.
- 기존 실패 재생(fixture) 기능과 마지막 정상값 보존 구조(`applySuccess`, `daily_readings`, `current_reading`)를 그대로 재사용한다.

# 2. 현재 상태

- 구현 완료 commit: `f447b270f660ab2179a736db184163b77ab8f3dc`
- 이 `HANDOFF.md` 자체는 그 바로 다음 commit(커밋 메시지 `assignment5: AI A handoff`)에 포함되어 있다. 저장소를 받으면 `git log --oneline -5`로 정확한 최신 commit hash를 다시 확인한다.
- `t04-real-information-board/core.js`의 `applyError()`를 수정해서, 실패가 발생했을 때 **직전에 정상값(`current_reading`)이 있었는지 여부**로 `status.freshness`를 `'stale'`(정상값 있음) 또는 `'error'`(정상값 없음)로 나누도록 했다. 기존에는 무조건 `'stale'`이었다.
- `t04-real-information-board/app.js`의 `renderLive()`와 `renderReplay()`에 `freshness === 'error'`일 때의 설명 문구를 추가했다.
  - live 패널의 `#live-note`: "이번 조회가 실패했고 아직 보존된 정상값이 없습니다. 값을 표시하지 않습니다."
  - replay 패널의 오류 패널(`#error-panel`)이 `stale`뿐 아니라 `error`에서도 열리도록 하고, `error`일 때 설명 문구를 "정상값이 아직 없어 이번 실패로는 화면에 표시할 값이 없습니다."로 바꿨다.
- `t04-real-information-board/styles.css`에 `.badge.error` 스타일(주황 계열, `--amber`)을 추가해서 `fresh`(초록)/`stale`(빨강)/`error`(주황)가 배지 색으로도 구분되게 했다.
- `t04-real-information-board/tests/t5-status.test.js`를 새로 추가해서 `core.js` 로직 수준에서 fresh/stale/error 세 상태 전환을 자동 테스트로 검증했다. 기존 `tests/core.test.js`는 손대지 않았다.
- `npm test` 결과: 기존 10개 + 신규 13개 = 총 23개 전부 PASS. (`evidence/ai-a-tests.md` 참고)
- **실제 브라우저에서는 아직 한 번도 열어서 확인하지 못했다.** 이번 세션에는 브라우저 렌더링을 확인할 도구가 없었다.

# 3. 실행 명령

```bash
cd t04-real-information-board
npm install
npm test
```

- Node 버전: `v22.22.2`에서 동작 확인 (Node 18 이상이면 대체로 동작할 것으로 예상되나, 20+ 권장).
- 별도 실행(`npm run dev`) 스크립트는 없다. 정적 파일이므로 `t04-real-information-board/index.html`을 직접 열거나, 저장소 루트에서 다음처럼 로컬 서버를 띄워서 확인한다.

```bash
python -m http.server 8000
# 브라우저에서 http://localhost:8000/t04-real-information-board/ 접속
```

- 이 프로젝트는 외부 비밀값(.env)이 필요 없다. Open-Meteo 공개 API를 키 없이 호출한다.
- 비밀값 없음. `.env.example`도 필요 없다.

# 4. 통과 검사

`evidence/fixed-tests.md`의 고정 검사 10개 중 AI A가 **실제로 실행해서 확인한** 것만 적는다.

- T5-TEST-01 (정상 상태 표시) — PASS (로직 자동 테스트)
- T5-TEST-05 (실패 후 stale 표시) — PASS (로직 자동 테스트)
- T5-TEST-07 (정상값 없는 오류) — PASS (로직 자동 테스트)
- T5-TEST-08 (복구 후 fresh) — PASS (로직 자동 테스트)

나머지 6개(T5-TEST-02, 03, 04, 06, 09, 10)는 코드는 넣었지만 **실제 브라우저로 확인하지 않았으므로 PASS로 적지 않는다.** 아래 "5. 남은 문제"에 적는다.

# 5. 남은 문제

가장 먼저 처리해야 할 순서대로 적는다.

1. **T5-TEST-10 (1366×768 경계 화면)** — 아직 전혀 확인하지 못했다. 브라우저 창을 1366×768로 맞추고 live 카드의 배지·값·설명(`#live-badge`, `#live-note`)과 replay 카드의 오류 패널(`#error-panel`)이 잘리거나 겹치지 않는지 확인한다. 특히 `#live-note`와 `#error-explain`에 새로 추가한 문장이 길어서 카드 밖으로 넘치는지 확인 필요.
2. **T5-TEST-02/03/04/06/09** — 실제 브라우저에서 값·출처·시각·설명 문구·새로고침 후 상태가 화면에 정확히 보이는지 눈으로 확인하고 `evidence/ai-b-tests.md`에 결과를 남긴다.
3. 위 확인 과정에서 `#live-note`, `#error-explain`의 새 문구가 기존 카드 스타일과 어색하게 겹치면 `styles.css`의 `.note`, `.error-panel` 관련 규칙만 최소로 조정한다(레이아웃 구조 자체는 바꾸지 않는다).
4. 모든 검사가 PASS면 `evidence/comparison.md`, `evidence/handoff-reproduction.md`(AI B 쪽 재현), 공개 비교 보고서 페이지(`t04-real-information-board/assignment5/`)를 완성한다. 이 페이지는 **아직 만들지 않았다.**

# 6. 다음 행동

**T5-TEST-10부터 시작한다.** 저장소 루트에서 `python -m http.server 8000`을 실행하고, 브라우저 창을 1366×768로 맞춘 뒤 `http://localhost:8000/t04-real-information-board/`를 열어 `#live-note`와 `#error-panel` 영역이 잘리는지 확인한다. 문제가 없으면 T5-TEST-02/03/04/06/09를 같은 방식으로 이어서 확인하고, `evidence/ai-b-tests.md`에 PASS/FAIL을 기록한다. 그 다음 `t04-real-information-board/`에 공개 비교 보고서 페이지(`assignment5/index.html`)를 새로 만들고, 과제 5 프롬프트의 15번 항목(과제 정보/고정 검사/작업 흐름/인수인계 7항목/이름 가린 비교표/최종 검사 결과/버전 정보/인수인계 누락/도구 선택 기준)을 채운다.

# 7. 건드리지 말 것

- 기존 일별 데이터 저장 형식(`daily_readings`, `record_id = signal_id:record_date`)
- KST 날짜 계산(`core.js`의 `kstDate`)
- 기존 공개 API 호출 방식(Open-Meteo, `app.js`의 `API_URL`)
- 비밀값 처리 방식(비밀값 자체가 없음 — 새로 추가하지 않는다)
- 기존 과제 4 실패 재생 fixture 9종(`assets/fixtures/*.json`)과 `runFixture`의 코드 분기(timeout/auth/rate_limit/offline/schema_error 판정 로직)
- `tests/core.test.js`에 있는 기존 10개 테스트(수정·삭제 금지, 필요하면 `tests/t5-status.test.js`처럼 새 파일에 추가)
- `evidence/fixed-tests.md`의 고정 검사 10개(ID, 입력, 기대값 변경 금지)
