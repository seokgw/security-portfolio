# Linux CLI VM 배포

대상은 Ubuntu/Debian 계열 Linux VM, 외부 주소 `35.254.91.12`입니다. Node 앱은 VM 내부 `127.0.0.1:3000`에서 실행되고 Nginx가 외부 HTTP `80`을 받아 전달합니다. MariaDB는 같은 VM의 `127.0.0.1:3306`에서만 사용합니다. GCP 방화벽에는 이 VM을 대상으로 `tcp:80`만 허용하고 `3000`, `3306`, MCP용 `8000/8001`은 열지 않습니다.

## 1. 파일 업로드

내 PC에서 다음과 같이 전송합니다. SSH 사용자와 키 경로는 실제 값으로 바꿉니다.

```bash
gcloud compute scp pds-diary-linux.tar.gz VM_NAME:~/ --zone=VM_ZONE
```

일반 `scp`를 쓴다면:

```bash
scp pds-diary-linux.tar.gz USER@35.254.91.12:~/
```

## 2. VM에서 설치

```bash
ssh USER@35.254.91.12
tar -xzf pds-diary-linux.tar.gz
cd pds-diary
chmod +x deploy/linux/*.sh
./deploy/linux/install-ubuntu.sh
./deploy/linux/setup-db.sh
npm run verify
./deploy/linux/install-service.sh
```

`setup-db.sh`가 DB 비밀번호를 터미널에서 입력받아 권한이 제한된 `.env`를 만듭니다. 비밀번호는 압축 파일이나 Git에 포함되지 않습니다.

## 3. 확인

```bash
curl http://127.0.0.1:3000/api/health
curl http://35.254.91.12/api/health
sudo systemctl status pds-diary
sudo journalctl -u pds-diary -f
```

브라우저에서는 `https://35.254.91.12`로 접속합니다. 외부 요청이 안 되면 GCP에 `tcp:80`, `tcp:443` 인그레스 규칙이 있고 그 규칙의 대상 태그가 이 VM에 적용되어 있는지 확인하세요. IP 인증서는 6일짜리이므로 Certbot timer와 `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`를 유지하고 `sudo certbot renew --dry-run`으로 갱신을 점검합니다.

## 보안

- GCP 인그레스에는 HTTP `80`만 열고 Node `3000`, MariaDB `3306`, MCP용 `8000/8001`은 열지 않습니다.
- `.env`는 서버 안에만 두고 업로드하거나 Git에 커밋하지 않습니다.
- 실제 공개 운영은 도메인 연결 후 Nginx의 HTTPS(443)를 권장합니다.
- SSH 22의 소스 범위는 가능한 한 본인 IP 또는 IAP로 제한합니다.
