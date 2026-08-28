# 과제 5 작업 계획

## 개선 기능

과제 4(`t04-real-information-board`)를 복사한 과제 5 전용 폴더(`assignment5-real-information-board`)의 정보판에 **데이터 상태(`fresh` / `stale` / `error`)와 마지막 정상값을 사용자가 명확하게 구분할 수 있는 상태 표시 영역 개선** 1개만 구현한다.

- 기존 실패 재생 fixture 구조(`assets/fixtures/*.json`, `core.js`의 `runFixture`/`applyError`)와 마지막 정상값 보존 구조(`applySuccess`, `daily_readings`, `current_reading`)를 그대로 활용한다.
- 새 기능을 새로 만들지 않고 기존 상태 모델(`status.freshness`)을 `fresh` / `stale` / `error` 세 값으로 확장하는 방식으로 작게 개선한다.
- 기존 과제 4 기능(일별 원자적 upsert, KST 날짜 계산, delta 계산, 실제 값 조회, 합성 실패 재생)은 삭제·재구성하지 않는다.

## 고정 검사 10개

`evidence/fixed-tests.md` 참고 (T5-TEST-01 ~ T5-TEST-10, 정확히 10개, 구현 시작 전 고정).

## 공통 사용 상한

- 시간 상한: 각 AI 실제 작업시간 **최대 60분**
- 요청/호출 수 상한: 각 AI 세션 **최대 15회**

측정 방식 안내: 이번 작업자 A(AI A)는 대화형이 아니라 하나의 사용자 요청 안에서 여러 도구 호출(파일 읽기/쓰기, bash 명령 실행)을 스스로 이어서 수행하는 에이전트 방식이다. 따라서 "요청/호출 수"는 **AI가 실행한 개별 도구 호출(tool call) 수**로 측정하며, 사용자가 보낸 대화 턴 수(=1)와는 별도로 `evidence/ai-a-tests.md`에 정직하게 기록한다. 두 작업자의 측정 단위가 다르면 이름을 가린 비교표(`evidence/comparison.md`)에 그 사실을 그대로 명시한다.

## 시작 소스 URL

- 공개 소스 저장소: https://github.com/seokgw/security-portfolio
- 참조 프로젝트 경로: `t04-real-information-board/` (변경 금지)
- 과제 5 작업 경로: `assignment5-real-information-board/`

## 시작 commit hash

- `ae5eaf3569eb5d833dc119774dc9727e7692ea06` (`docs: seal two-day temperature evidence`)

## AI A 시작 시각

- `2026-08-28T12:16:22+09:00`
