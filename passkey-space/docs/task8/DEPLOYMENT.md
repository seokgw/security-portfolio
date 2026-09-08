# 배포 구성과 재현 방법

공개 입구: https://seokgw.github.io/security-portfolio/

패스키 서비스 주소: https://passkey.35.254.91.12.sslip.io/

## 실제 배포 결과 — 2026-09-08

- HTTPS 배포 성공. 인증서 검증을 켠 Chromium 가상 인증기로 **15개 운영 요청 검사 통과**.
- 정상 패스키 등록/로그인 200, 비로그인 401, A↔B 접근 403, 잘못된 서명 401, challenge 재사용 400, 삭제된 패스키의 새 challenge 로그인 401, 마지막 키 삭제 후 로그인 401.
- [운영 요청/응답 기록](evidence/live-http-results.json), [운영 화면](evidence/04-live-https.png).
- 로컬 테스트는 로그인·로그아웃 UI까지 **35개 검사 통과**. 운영 의존성 `pnpm audit --prod`: 알려진 취약점 없음.
- 기존 다이어리와 패스키 서비스 모두 active. 내부 포트는 각각 127.0.0.1:3000 / 127.0.0.1:3008.
- 새 인증서 만료일 2026-12-07. 기존 Certbot timer와 Nginx reload hook 확인.
- 설치 중 메모리 부족을 완화하기 위해 `/var/swap-portfolio`에 1GB 임시 스왑을 활성화했다. fstab에는 추가하지 않아 재부팅 후 자동 활성화되지는 않는다.
- 사용자의 Railway 대체 요청은 기존 서버가 동작하지 않을 경우라는 조건이었다. 현재 HTTPS 검증이 성공해 기존 VM 배포를 유지한다.

호스트는 기존 다이어리 GCP VM `plan-do-see` / `us-central1-a`이다. 기존 다이어리는 IP 주소의 3000번 백엔드를 유지하고, 새 도메인은 내부 3008번 백엔드로 연결한다.

| 항목 | 위치/설정 |
|---|---|
| 앱 | /opt/portfolio-passkey |
| 런타임 | /opt/portfolio-node24/bin/node (24.20.0) |
| 서비스 | portfolio-passkey.service |
| DB | /var/lib/portfolio-passkey/passkeys.sqlite |
| nginx | /etc/nginx/sites-available/portfolio-passkey |
| ORIGIN | https://passkey.35.254.91.12.sslip.io |
| RP_ID | passkey.35.254.91.12.sslip.io |
| 세션 | Secure / HttpOnly / SameSite=Strict / __Host-session |
| 저장소 제외 | DB, node_modules, .env, 설치 압축파일 |

## 배포 명령

Node 24 런타임은 공식 nodejs.org 배포 파일과 SHA256 목록을 받아 검증한다. 기존 `/usr/bin/node`를 교체하지 않는다. `pnpm-lock.yaml`의 잠금 버전으로 운영 의존성만 설치한다.

```sh
# 저장소 루트에서 실행. Windows에서도 gcloud.cmd로 같은 작업 가능.
tar -czf passkey-space/deploy/upload.tar.gz --exclude=node_modules --exclude=data --exclude=docs --exclude=tests --exclude=.env --exclude=upload.tar.gz passkey-space
gcloud compute scp passkey-space/deploy/upload.tar.gz plan-do-see:/tmp/portfolio-passkey-upload.tar.gz --zone=us-central1-a
gcloud compute ssh plan-do-see --zone=us-central1-a --command='tar -xzf /tmp/portfolio-passkey-upload.tar.gz -C /tmp; sudo bash /tmp/passkey-space/deploy/install.sh'
```

운영 DB는 앱 폴더 밖에 있으므로 코드 재배포가 계정 데이터를 덮어쓰지 않는다. 서비스 이름과 도메인을 바꾸려면 배포 스크립트 설정을 함께 변경해야 한다. RP ID를 변경하면 기존 패스키를 다시 등록해야 한다.

## 실제 HTTPS 테스트

```powershell
cd passkey-space
$env:LIVE_ORIGIN='https://passkey.35.254.91.12.sslip.io'
node tests/live.mjs
```

이 명령은 운영 서버에 이름이 고유한 가상 테스트 계정 2개를 만들고 마지막에 그 계정들의 패스키를 삭제한다. 기존 사용자 계정을 사용하거나 삭제하지 않는다. 테스트 계정의 가상 메모와 감사 기록은 남는다. 검증 함수는 실제 운영 서버의 WebAuthn 검증이며 인증서 검증을 끄지 않는다.

결과가 생성되면 `evidence/live-http-results.json`과 `evidence/04-live-https.png`에서 확인할 수 있다. 테스트 성공 여부는 결과 파일을 기준으로 판단한다. 로컬 증거를 운영 증거로 표시하지 않는다.

## 운영 주의점

- VM은 작업 시작 시 중지 상태였고 요청에 따라 시작했다. 실행 비용이 발생한다.
- 중지 중 만료된 기존 다이어리 IP 인증서는 Certbot으로 갱신했다.
- 1GB RAM VM에서는 패키지 설치 때 메모리 여유가 작다. 앱을 확장할 때 메모리와 스왑, 디스크를 점검한다.
- 공개 도메인은 sslip.io DNS에 의존한다. 장기 운영에는 본인 도메인과 별도 백업 체계를 권장한다.
- 비로그인 직접 요청: `curl.exe -i https://passkey.35.254.91.12.sslip.io/api/private` → 401이어야 한다.
