---
tags: [infrastructure, nginx, reverse-proxy, load-balancer, web-server]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Reverse Proxy", "리버스 프록시", "Nginx Reverse Proxy"]
---

# Reverse Proxy · Nginx

클라이언트와 백엔드 서버 **사이에 서서 요청을 대리**하는 서버. 클라이언트는 프록시가 최종 서버인 줄 알고 통신하지만, 프록시는 내부적으로 실제 서버로 요청을 전달(forward)하고 응답을 돌려준다. Nginx·Envoy·HAProxy·Caddy·Traefik 등이 대표 구현.

## Forward Proxy vs Reverse Proxy

| 축 | Forward Proxy | Reverse Proxy |
|---|---|---|
| 위치 | 클라이언트 쪽 | 서버 쪽 |
| 목적 | 클라이언트 보호·익명화·필터링 | 서버 보호·부하 분산·통합 진입점 |
| 사용자 | 내부망 직원, 정책상 감시 | 외부 사용자 |
| 예시 | 회사 방화벽, 학교망 | Nginx 앞단, CDN |

## 리버스 프록시가 제공하는 것

- **부하 분산(Load Balancing)** — 여러 백엔드에 요청 분산 → 상세는 [[Load-Balancer|Load Balancer]]
- **단일 진입점(SSL/TLS 종료)** — 인증서를 프록시에서만 관리, 내부는 평문 HTTP
- **캐싱** — 응답을 프록시에 보관해 백엔드 부담 경감(CDN과 동일 원리)
- **보안 필터링** — IP 화이트리스트, Rate Limit, WAF 규칙 적용
- **압축·리라이트** — gzip/brotli, URL 재작성, 헤더 조작
- **무중단 배포** — 프록시 설정 변경만으로 트래픽 전환(Blue-Green)
- **프로토콜 변환** — HTTP/2·HTTP/3 종료 후 내부는 HTTP/1.1, WebSocket·gRPC 업스트림 지원

## Nginx 핵심 디렉티브

### 위치 선언

Nginx는 `http` → `server` → `location` 블록 구조를 따른다. 리버스 프록시 설정은 보통 `location` 블록 안에 둔다.

```nginx
location / {
    proxy_pass http://backend.example.com/;
}
```

### proxy_pass

요청을 업스트림으로 전달하는 기본 디렉티브. URI 포함 여부가 동작을 다르게 만든다.

- `proxy_pass http://backend;` — 원래 URI 그대로 전달
- `proxy_pass http://backend/;` — location 부분을 제거하고 뒤에 붙임 (`/api/users` → `/users`)
- `proxy_pass http://backend/prefix/;` — location을 `/prefix/`로 치환

### proxy_set_header

업스트림으로 보낼 요청 헤더 수정. **Nginx는 기본으로 `Host`와 `Connection`만 보낸다** → 실제 클라이언트 IP·원본 Host를 내부에 전달하려면 명시 필요.

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

- `X-Real-IP` — 원본 클라이언트 IP 한 개
- `X-Forwarded-For` — 프록시 체인 전체 기록(쉼표 구분)
- `X-Forwarded-Proto` — `http`/`https` 중 원본 스킴 (내부가 평문일 때 앱이 `https`를 알 수 있게)

### upstream 블록

여러 백엔드를 묶어 부하 분산. 기본 알고리즘은 라운드 로빈.

```nginx
upstream backend {
    least_conn;                # 알고리즘 지정(기본은 round robin)
    server 10.0.0.1:8080 weight=3;
    server 10.0.0.2:8080;
    server 10.0.0.3:8080 backup;
}

server {
    location / { proxy_pass http://backend; }
}
```

- 알고리즘: `round_robin`(기본), `least_conn`, `ip_hash`, `hash`(커스텀 키), `random two least_conn`(Power of Two)
- `max_fails`/`fail_timeout` — 백엔드 실패 감지
- `backup` — 기본 서버 모두 장애 시에만 사용

### proxy_buffering · proxy_buffer_size · proxy_buffers

업스트림 응답을 클라이언트로 바로 흘릴지, Nginx 디스크·메모리에 버퍼링할지 결정.

- `proxy_buffering on` (기본) — 업스트림 응답을 Nginx가 모아서 클라이언트에게 전달 → 느린 클라이언트로부터 백엔드 보호
- `proxy_buffering off` — 스트리밍(SSE·대용량 파일·실시간 응답)에서 지연 감소
- `proxy_buffer_size` — 응답 헤더 버퍼 크기
- `proxy_buffers` — 본문 버퍼 수와 크기

### WebSocket 업스트림

WebSocket은 HTTP Upgrade이므로 명시적 설정 필요.

```nginx
location /ws {
    proxy_pass http://ws_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;   # 장기 연결 유지
}
```

### proxy_bind

다중 NIC 환경에서 특정 소스 IP로 업스트림 연결. 보안 정책상 내부 네트워크에만 연결 허용할 때 유용.

## 전형적 프로덕션 구성

```nginx
upstream app {
    least_conn;
    server app-1:3000 max_fails=3 fail_timeout=10s;
    server app-2:3000 max_fails=3 fail_timeout=10s;
    keepalive 32;          # 업스트림 keep-alive 커넥션 풀
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 2s;
        proxy_read_timeout 60s;
    }

    location /static/ {
        alias /var/www/static/;
        expires 30d;
    }
}
```

## 흔한 실수

- **`proxy_set_header Host` 누락** — 업스트림 앱이 가상 호스트 라우팅을 못 함
- **`X-Forwarded-For` 신뢰** — 클라이언트가 헤더를 위조할 수 있음. **신뢰된 프록시 IP에서 온 요청에서만** 사용
- **SSL 종료 후 앱이 `http`로 인식** — `X-Forwarded-Proto` 필수
- **WebSocket에 `proxy_http_version 1.1`과 Upgrade 헤더 미설정** → 핸드셰이크 실패
- **업스트림 keep-alive 미설정** — 매 요청마다 새 TCP 연결 → 지연·CPU 증가
- **`proxy_buffering on`으로 스트리밍 시도** — SSE·대용량 다운로드가 끊겨 보이거나 버퍼로 지연

## 면접 체크포인트

- Forward Proxy와 Reverse Proxy의 위치·목적 차이
- 리버스 프록시가 제공하는 6가지 이상의 가치
- `proxy_pass` URI 유무가 바꾸는 동작
- `X-Real-IP`·`X-Forwarded-For`·`X-Forwarded-Proto`의 역할 구분과 위조 위험
- WebSocket 업스트림 연결 시 필요한 헤더 세트
- `upstream` 블록에서 선택 가능한 부하 분산 알고리즘

## 출처
- [Nginx Docs — NGINX Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

## 관련 문서
- [[Load-Balancer|Load Balancer]]
- [[HTTPS-TLS|HTTPS · TLS Handshake]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[Rate-Limiting|Rate Limit 정책 설계]]
