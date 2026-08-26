# 짤·카드 스튜디오

PNG/JPEG 이미지와 한글·영문·이모지 문구를 조합해 SNS 카드나 밈을 만드는 브라우저 전용 도구입니다. 1:1, 4:5, 9:16 비율을 제공하며 미리보기와 PNG/JPEG 저장에 동일한 Canvas 렌더러를 사용합니다.

## 실행

별도 설치 없이 저장소 루트에서 정적 서버를 실행합니다.

```powershell
python -m http.server 8000
```

`http://localhost:8000/meme-card-studio/`을 엽니다. 자동 테스트와 정적 빌드는 Node.js 20 이상에서 실행합니다.

```bash
npm test
npm run build
```

## 주요 기능

- PNG/JPEG 업로드 및 `cover` 방식 합성
- X/Y, 크기, 색상, 정렬, 자동·직접 줄바꿈 편집
- 1:1 / 4:5 / 9:16 즉시 미리보기
- PNG/JPEG 다운로드
- 안정적인 UUID 기반 템플릿 CRUD 및 `localStorage` 영속화
- 전체 스키마를 검증한 뒤에만 반영하는 JSON 가져오기와 내보내기

## 데이터와 개인정보

이미지와 템플릿은 서버로 전송되지 않습니다. 템플릿은 현재 브라우저의 `localStorage`에만 저장됩니다. 다운로드 이미지는 원본 파일을 재배포하지 않고 Canvas에서 새 PNG/JPEG로 인코딩하므로 원본 EXIF/GPS 메타데이터가 복사되지 않습니다.

## 테스트

- 자동 테스트: `npm test`
- 12건 극단 입력 검사: [`docs/test-cases.md`](docs/test-cases.md)
- 전체 기준 점검: [`docs/checklist.md`](docs/checklist.md)
- 샘플 이미지와 권한/메타데이터: [`docs/image-sources.md`](docs/image-sources.md)

