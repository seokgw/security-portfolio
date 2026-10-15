# AEGIS 로고 카드 1~5 검증 자료

검사일: 2026-08-26  
공개 앱: https://seokgw.github.io/security-portfolio/meme-card-studio/?v=8

## 카드 1 — 편집과 미리보기

- 입력 파일: `AEGIS 팀 로고.png`
- 브라우저 인식 결과: PNG, 1254×1254, 1273.8KB
- 업로드 상태: `이미지를 불러왔습니다.`
- 한글·영문·줄바꿈·이모지 문구 입력 정상
- X/Y·글자 크기·색상 변경 즉시 반영
- 콘솔 오류: 0건
- 남길 화면: `card1-editor-square.png`

## 카드 2 — 화면과 파일의 일치

| 비율 | 논리 Canvas | 문구 | 화면 증거 | 완성 이미지 |
|---|---:|---|---|---|
| 1:1 | 1080×1080 | AEGIS TEAM / 안전한 연결의 시작 | `card2-square-preview.png` | `aegis-square-1x1.png` |
| 4:5 | 1080×1350 | 기술로 지키고 / 신뢰로 연결합니다 | `card2-feed-preview.png` | `aegis-feed-4x5.png` |
| 9:16 | 1080×1920 | SECURE TODAY / READY FOR TOMORROW | `card2-story-preview.png` | `aegis-story-9x16.png` |

세 비율 모두 미리보기와 저장이 공통 `renderCanvas`와 공통 `coverRect`를 사용한다.

## 카드 3 — 극단 입력

- 기존 12건 기록: `../../../meme-card-studio/docs/test-cases.md`
- AEGIS 추가 확인: 1254×1254 PNG, 한글+영문 혼합, 직접 줄바꿈, 이모지, Y=100%, 1:1/4:5/9:16
- 화면비 박스 contain 회귀, 2줄·5줄 하단 고정 회귀를 포함한 자동 테스트 13건 PASS
- 실제 결함 기록: 상대 경로 빌드 실패 및 미리보기 박스가 Canvas 하단을 자르던 결함과 수정 내역이 테스트 문서에 기록됨

## 카드 4 — 템플릿 관리

- 실제 생성: `AEGIS QA 정사각형`, `AEGIS QA 피드`, `AEGIS QA 스토리`
- 불러오기 결과: 각각 1:1, 4:5, 9:16 및 해당 문구 복원
- 새로고침 뒤 템플릿 3개 이상 유지 확인
- 수정 결과: `기술로 지키고 / 신뢰로 연결하는 AEGIS` 문구가 새로고침 뒤 복원됨
- 남길 화면: `card4-template-list.png`

## 카드 5 — JSON 옮겨 쓰기

- 정상 파일: `templates-valid.json` — 완전한 schema의 템플릿 3개
- 문법 손상 파일: `templates-broken.json`
- 필수 필드 누락 파일: `templates-missing-fields.json`
- 자동 검증: 정상 schema 허용, 필수 필드 누락·중복 ID 거부 PASS
- 앱은 parse와 전체 schema 검증이 완료된 경우에만 `localStorage`를 변경하므로 오류 파일에서 기존 목록을 유지한다.

## 이미지 권한과 안전

- 출처: 사용자가 테스트 목적으로 직접 제공한 `AEGIS 팀 로고.png`
- 저작권자/라이선스: 사용자 확인 필요(본인 제작 여부를 임의로 단정하지 않음)
- 완성 PNG는 새 픽셀로 재인코딩하며 EXIF/GPS를 복사하지 않는다.
