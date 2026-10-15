# Security Portfolio

개발 경험을 웹 서비스 보안 문제 분석 역량과 연결해 보여주는 정보보안 직무 취업용 1페이지 포트폴리오입니다.

## 대상

정보보안 직무 채용 담당자에게 인증, 안전한 통신, 로그 기반 문제 추적 경험을 검증 가능한 범위에서 전달합니다.

## 주요 기능

- 1366×768 첫 화면에서 소개, 핵심 활동, GitHub 근거 확인
- 인증 경험의 상황–행동–결과 접기/펼치기
- 실제 경험 기술과 보안 연결 역량 구분
- 공개 정보와 보호할 정보의 범위 명시
- 반응형 레이아웃과 키보드 포커스 지원

## 사용 기술

HTML5, CSS3, Vanilla JavaScript만 사용하며 Node.js나 빌드 도구가 필요하지 않습니다.

## 로컬 실행

PowerShell에서 저장소 루트로 이동한 뒤 다음을 실행합니다.

```powershell
python -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다. Python이 없다면 `index.html`을 직접 열어도 됩니다.

## 공개 주소

[정보보안 포트폴리오 열기](https://seokgw.github.io/security-portfolio/)

- [과제 4 실제 정보판](https://seokgw.github.io/security-portfolio/t04-real-information-board/)
- [과제 5 상태 표시 개선·비교 보고서](https://seokgw.github.io/security-portfolio/5/assignment5-real-information-board/)
- [과제 6 플랜두씨 다이어리](https://seokgw.github.io/security-portfolio/pds-diary/)

## 과제 9 · 나를 말하는 에이전트

리추얼 기록에서 선택한 강점과 실제 경험을 정리한 서사 문서와, 기존 포트폴리오에 추가한 별도 뼈대입니다.

- [서사 문서](제출자료/과제9-석근욱-나를-말하는-에이전트.md): 기록 후보·사용자 선택, 강점 지도, 3인칭·1인칭 이야기, 수정 이력, 동료 검토, 자기소개서와 AI·사용자 판단
- [제출 화면 입력안](제출자료/과제9-제출화면-입력안.txt): 확인 방법 4가지와 판단 3줄
- [공개 포트폴리오 뼈대](https://seokgw.github.io/security-portfolio/#portfolio-outline)
- 구현: [index.html](index.html)의 `portfolio-outline` 영역, [전용 스타일](src/portfolio-outline.css)
- [Notion 작업 정리](https://www.notion.so/3d76b4cbb4b2819894cefbf016287c45): 접근 권한에 따라 로그인이 필요할 수 있는 관리 문서

포트폴리오 뼈대는 사용자 요청에 따라 서사 문서에서 제외하고 공개 페이지에 구성했습니다. 경청은 군 복무 경험으로 설명하며 과제 수행 사례와 구분합니다. 과제 제출 화면에는 서사 파일과 선택 결과물 URL을 사용하고, 소스 URL은 입력하지 않습니다.

## 검증 안내서

[포트폴리오 검증 안내서 보기](verification-guide.md)

## 개인정보 및 비밀정보

전화번호, 주소, 개인 이메일, 회사 내부 정보, 고객 데이터, 자격 증명과 비밀값을 포함하지 않았습니다.
