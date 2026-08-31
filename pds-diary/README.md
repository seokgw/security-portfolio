# 플랜두씨 다이어리 1 — MariaDB

MCP 서버 구축 과정을 **Plan → Do → See**로 연결해 기록하는 공개 웹 다이어리입니다. 로그인은 없으며 원본 데이터는 브라우저 저장소가 아니라 MariaDB에 저장됩니다.

## 설치와 실행

Node.js 20 이상과 MariaDB 10.6 이상을 준비합니다.

```bash
cd pds-diary
npm install
```

MariaDB 관리 계정으로 앱 전용 DB와 사용자를 만듭니다. 아래의 비밀번호 자리는 직접 정한 값을 사용하고 저장소에 기록하지 마세요.

```sql
CREATE DATABASE pds_diary CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pds_app'@'localhost' IDENTIFIED BY '직접_정한_비밀번호';
GRANT ALL PRIVILEGES ON pds_diary.* TO 'pds_app'@'localhost';
FLUSH PRIVILEGES;
```

`.env.example`을 `.env`로 복사하여 접속 정보를 채운 뒤 스키마와 실제 초기 데이터를 적용합니다.

```bash
mariadb -u pds_app -p < sql/schema.sql
mariadb -u pds_app -p < sql/seed.sql
npm start
```

`http://localhost:3000`에서 확인합니다. 데이터 입력과 수정은 Plan, Tasks, Do, See 메뉴에서 수행합니다. `npm test`는 비밀값/XSS/필수 구조 정적 검사를, `npm run verify`는 MariaDB 연결과 최소 실제 데이터 조건을 검사합니다.

## 구조 및 평가 위치

- Plan 수정 이력: `PUT /api/plans/:id`, Plan 화면의 **수정 이력 보기**
- Task CRUD·검색·필터·고정 정렬: Tasks 화면 및 `/api/plans/:id/tasks`
- 중복 완료 방지: transaction + `SELECT ... FOR UPDATE` + `uq_completion_key`
- Do 기록: Do 화면, `execution_logs` (Plan/Task 예상값은 변경하지 않음)
- See 집계 및 근거: See 화면의 클릭 가능한 카드, `/review`, `/review/evidence`
- 다음 Plan 개선점: `reflections`, `/api/reflections/:id/carry`
- 전체 내보내기: 상단 **내 자료 내보내기**, `/api/export`
- XSS: seed에 검사 문자열이 있으며 UI는 `textContent`/DOM API만 사용
- DB 계약: `contracts/pds-schema-v2.json`
- 실제 데이터: `sql/seed.sql`의 Plan 1개, Task 6개, 실행 기록 3개

운영 배포 시 Node 프로세스와 MariaDB를 같은 비공개 네트워크에 두고, HTTPS reverse proxy에서 `PORT`로 전달합니다. `.env`, DB 포트, 비밀번호는 공개하거나 Git에 커밋하지 않습니다.

## 제출용 짧은 확인 방법

① 어디로 가나요  
배포된 플랜두씨 다이어리 메인 화면으로 접속합니다.

② 세 단계 안에 무엇을 하나요  
MCP 서버 구축 Plan을 열고 Task → Do → See 화면을 확인합니다.

③ 무엇이 보이면 통과인가요  
Plan 수정 이력, 실제 Task 5개 이상, 실행 기록 3개 이상, 클릭 가능한 See 집계와 MariaDB에 저장된 데이터가 새로고침 후에도 그대로 보이면 통과입니다.

④ 안 될 때는 무엇이 보이나요  
새로고침 후 데이터가 없어지거나, Plan 수정 전 내용이 사라지거나, 완료가 중복되거나, See 숫자와 근거 기록이 일치하지 않으면 실패입니다.

## AI와 내 판단 3줄

① AI에게 맡긴 일 — MariaDB 테이블 구조, Node.js API, 화면, 중복 완료 방지와 테스트 코드 작성을 맡겼습니다.  
② 내가 직접 판단한 일 — 실제 MCP 서버 구축 Plan, Task, 예상 시간, 실행 기록과 개선점을 판단했습니다.  
③ AI 제안을 따르지 않은 일 — 일반 예시 대신 실제 진행하는 MCP 서버 구축 과정을 기록했습니다.
