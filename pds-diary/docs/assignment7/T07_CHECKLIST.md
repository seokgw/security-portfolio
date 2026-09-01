# T07 체크리스트

| 기준 묶음 | 상태 | 근거 파일/API |
|---|---|---|
| T07-C91~C134 인증/JWT/세션/접근 제어 구현 | PASS (구현), HTTP 증거 NOT YET | `src/server.js`, `sql/schema.sql`, `AUTH_EVIDENCE.md` |
| T07-C01, C03~C15 Plan/Task/Do/See 연속성 | PASS | 기존 T06 UI/API, owner 조건 추가 |
| T07-C23~C27 데이터 무결성/집계 | PASS (구현), DB 재검증 NOT YET | review/evidence routes |
| T07-C39, C40 내보내기/소유자 격리 | PASS (구현) | `GET /api/export` |
| T07-C46 최초 화면/안내 | PASS | `public/index.html` |
| T07-C77, C78 실제 5일/규칙 변경 | NOT YET | `daily_records`, `rule_changes` 구현만 완료 |

## T06 연속성

- T06 최종 commit: `9e9979e`
- T07 작업 시작 commit: `9e9979e`
- T07 구현 commit: `8eb377e`
- 검사: `git merge-base --is-ancestor 9e9979e HEAD`

## 다음 실제 날짜 행동

Day 1과 Day 2에 같은 지표·단위·계산 규칙으로 각각 한 건을 입력한다. Day 2 완료 후 Day 3 입력 전에 계획 규칙만 정확히 한 번 변경한다. Day 3~5에도 동일 지표/단위/계산 규칙으로 입력한 뒤 화면 합계·평균을 독립 계산과 대조한다. 누락은 평균에서 제외, 같은 날짜 중복은 DB UNIQUE로 거절, outlier는 그대로 포함, 소수 첫째 자리 반올림, 주 시작은 월요일로 유지한다.
