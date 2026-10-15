# T03 자체 점검표

검증 환경: Node.js 24 자동 테스트, Python 정적 서버·Pillow 파일 검사. 브라우저 자동화는 실행 환경의 권한 오류로 연결되지 않아 클릭이 필요한 항목은 코드/자동 테스트 근거와 함께 `확인하지 못함`으로 남겼다.

| 기준 | 판정 | 근거 |
|---|:---:|---|
| T03-C01 | PASS | GitHub Pages 앱·JS·CSS와 공개 GitHub 소스 URL 모두 무인증 HTTP 200 |
| T03-C03 | PASS | 첫 화면 편집 패널 |
| T03-C04 | 확인하지 못함 | PNG 허용 로직 자동 테스트 통과, 실제 클릭 미확인 |
| T03-C05 | 확인하지 못함 | JPEG 허용 코드 존재, 실제 클릭 미확인 |
| T03-C06 | 확인하지 못함 | X/Y 입력 즉시 렌더 코드 존재, 실제 클릭 미확인 |
| T03-C07 | 확인하지 못함 | 크기 입력 즉시 렌더 코드 존재, 실제 클릭 미확인 |
| T03-C08 | 확인하지 못함 | 색상 입력 즉시 렌더 코드 존재, 실제 클릭 미확인 |
| T03-C09 | PASS | 검증 성공 뒤에만 `state.image` 변경 |
| T03-C10 | PASS | 한국어 거부 이유와 `role=status` |
| T03-C11~C13 | PASS | 모든 비율이 공통 `renderCanvas` 사용 |
| T03-C14 | PASS | `docs/test-cases.md` 12건 |
| T03-C15 | PASS | 긴 무공백 입력 결함 기록 |
| T03-C16 | PASS | 오류 경로에서 편집 상태 변경 없음 |
| T03-C17 | 확인하지 못함 | 제한 없는 템플릿 생성 코드 존재, 실제 3개 클릭 미확인 |
| T03-C18~C21 | 확인하지 못함 | UUID CRUD·localStorage 코드 및 helper 테스트 통과, 새로고침 클릭 미확인 |
| T03-C22 | 확인하지 못함 | 정상 schema 자동 테스트 통과, 실제 파일 선택 미확인 |
| T03-C23~C24 | PASS | parse 전에 상태 미변경, schema 거부 자동 테스트 통과 |
| T03-C25~C26 | PASS | 서로 다른 비율 PNG 3개, Pillow와 이미지 뷰어로 정상 확인 |
| T03-C27 | PASS | `docs/image-sources.md`에 모두 본인 제작 기록 |
| T03-C28 | PASS | 세 PNG 모두 EXIF 0건, info key 0건 |
| T03-C29 | PASS | 제출 파일 개인정보 패턴 검사 0건 |
| T03-C30 | PASS | secret 파일/패턴 검사 0건 |
| T03-C31 | PASS | `docs/submission.md` 4항목 |
| T03-C32 | PASS | `docs/submission.md` 3항목 |

추가 품질 검사: 자동 테스트 5/5 PASS, 저장소 루트 기준 정적 빌드 PASS, 로컬 HTTP `index.html`/`app.js` 응답 200.
