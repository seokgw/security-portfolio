# 재현 방법

필요 프로그램 Python 3.12 이상. 일반 Python 환경에서 패키지 루트 기준으로 실행한다.

```sh
python -m pip install -r 04_analysis/requirements.txt
python 04_analysis/analysis.py
python 04_analysis/verify_results.py
```

원자료는 03_data/raw/mnd_evaluation.pdf이다. PDF 11쪽의 6개 지표와 두 연도 값을 읽는다. 개인자료 회귀를 재실행하는 것이 아니다. 인터넷은 라이브러리 설치에만 필요하며 분석은 동봉 PDF로 수행한다.

생성 파일: 03_data/processed/policy_indicators.json, 05_results/tables/policy_indicators.md, descriptive_statistics.json, 05_results/figures/policy_perceptions.png. 각각 논문의 표 1·표 2·그림 1과 연결된다. 표 3은 Hyun 원문 표 1 전사이며 독립 통합 분석이 아니다.

짧은 수동 확인: (1) PDF 11쪽에서 외부 소통 97.7, 97.9와 심리적 안정 96.6, 96.7을 확인한다. (2) 코드 실행 후 차이가 +0.2, +0.1%p인지 확인한다. (3) 원자료 6지표×2시점과 결과 12개가 맞는지 확인한다.

통계적 유의성·인과효과는 계산하지 않는다. 분모·표준오차·문항이 미보고이므로 N을 역산하지 않는다. 서로 다른 지표의 평균은 참고용 기술값이다. 폰트와 라이브러리 버전에 따라 그림 픽셀은 달라질 수 있으나 수치는 일치해야 한다.

2026-09-11 Windows 재개 환경에서 원자료 SHA256와 12개 수치를 재현 확인했다. 번들 Python은 별도 설치 라이브러리 경로를 기본적으로 읽지 않아 sys.path에 설치 폴더를 지정해 실행했다. 일반 Python/가상환경에서는 위 명령을 사용한다. 세부 환경은 environment_verified_20260911.json에 기록한다.
