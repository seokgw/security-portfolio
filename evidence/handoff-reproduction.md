# HANDOFF.md 재현 검증

AI A 종료 직후, 기존 작업 폴더가 아닌 새 작업 폴더에서 저장소를 다시 준비하고 `HANDOFF.md`의 "3. 실행 명령"만 보고 그대로 따라했다.

- 방법: `git clone`으로 로컬 저장소를 새 폴더(`/home/claude/repro/repo`)에 복제(네트워크 원격 저장소가 아니라 로컬 경로 clone — 이 실행 환경에 외부 네트워크 접근이 없어 `github.com` 원격은 직접 clone하지 못했다. 저장소 내용/commit hash는 동일하다).
- 실행한 명령 (HANDOFF.md 그대로):

```bash
cd t04-real-information-board
npm install
npm test
```

## 확인 결과

| 확인 항목 | 결과 |
|---|---|
| 필요한 런타임 버전이 적혀 있는가 | PASS — Node `v22.22.2` 기준으로 명시, 동작 확인 |
| 설치 명령이 맞는가 | PASS — `npm install` 정상 종료(0 packages, 0 vulnerabilities) |
| 실행 명령이 맞는가 | PASS — `npm test`로 23개 테스트(과제4 10개 + 과제5 13개) 전부 통과 |
| 환경값 예시가 있는가 | PASS — 이 프로젝트는 비밀값/환경값이 없다고 HANDOFF에 명시했고, 실제로 `.env` 관련 파일이 필요하지 않았다 |
| 작업 디렉터리가 명확한가 | PASS — `t04-real-information-board`로 명확히 지정됨 |
| HANDOFF.md의 commit hash와 실제 저장소 commit hash가 같은가 | PASS — HANDOFF.md는 "구현 완료 commit"으로 `f447b270f660ab2179a736db184163b77ab8f3dc`를 명시하고 HANDOFF 자신은 바로 다음 commit에 포함된다고 적었다. `git log`로 새 폴더에서 확인한 최신 commit은 `fb83dff8936bb6adf2ccfefd69c3caaed95435a2`(assignment5: AI A handoff)이며, 그 부모가 정확히 `f447b270f660ab2179a736db184163b77ab8f3dc`였다. 일치. |

## 종합 판정

**PASS** — HANDOFF.md만 보고 새 폴더에서 설치·테스트까지 재현되었다.

## 알려진 제약

이 실행 환경은 외부 네트워크(`github.com` 등)에 접근할 수 없어 `git clone https://github.com/seokgw/security-portfolio.git` 자체는 실제로 수행하지 못했다. 대신 로컬 경로를 원격으로 clone해 동일한 git 이력·commit hash로 재현했다. 실제 GitHub 원격 clone은 사용자가 별도로 확인해야 한다(미확인).
