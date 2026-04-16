---
tags: [web, network, dns, tcp, http, rendering, browser]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Browser URL Flow", "브라우저 URL 입력 프로세스", "What happens when you type google.com"]
---

# 브라우저 주소창에 URL을 입력하면

백엔드 면접의 가장 고전적인 질문. **"주소창에 google.com을 치고 엔터를 누르면 어떤 일이 일어나는가."** 답변의 깊이는 개인이 네트워크·브라우저·인프라를 어디까지 이해하는지를 가늠하는 척도가 된다. 아래는 한 번의 페이지 로드가 완료되기까지의 전 과정을 계층 순으로 정리한 것.

## 전 과정 요약

1. **URL 파싱** — 스킴·호스트·경로·쿼리 분리
2. **DNS 조회** — 도메인 → IP 주소
3. **ARP** — IP → MAC 주소(로컬 네트워크 구간)
4. **TCP 3-way handshake** (+TLS 핸드셰이크 for HTTPS)
5. **HTTP 요청** — GET /
6. **서버 처리** → 응답
7. **렌더링** — HTML 파싱, CSSOM, JS 실행, Paint

## 1. URL 파싱 · 전처리

브라우저가 주소창 문자열을 해석.

- 스킴(`https://`)·호스트(`google.com`)·포트(`443`)·경로·쿼리·프래그먼트 분리
- **휴먼 입력 정규화** — 퍼니코드(IDN) 변환, 공백 trim, 검색어로 간주할지 URL로 간주할지 판단
- **HSTS 캐시** 확인 — 도메인이 HSTS로 등록돼 있으면 `http://`도 `https://`로 강제 승격
- **Service Worker** 캐시·쿠키·CORS 사전 정책 확인

## 2. DNS 조회 (도메인 → IP)

### 조회 순서

1. **브라우저 DNS 캐시** — 방문 기록 기반 TTL 내 재사용
2. **OS DNS 캐시** — `/etc/hosts` 먼저, 그다음 OS 리졸버 캐시
3. **라우터/ISP 리졸버** — 재귀 리졸버(ISP 또는 8.8.8.8)
4. 재귀 리졸버가 **Root → TLD → Authoritative** 순으로 질의
   - Root(`.`): "com 어디 물어봐" → TLD 서버 주소
   - TLD(`com`): "google.com 어디 물어봐" → Authoritative 주소
   - Authoritative: 최종 IP 반환(`142.250.xxx.xxx`)

### 주요 레코드

- **A** — IPv4
- **AAAA** — IPv6
- **CNAME** — 별칭
- **NS** — 네임 서버
- **MX** — 메일 서버
- **TXT** — SPF·도메인 인증

TTL이 짧을수록 전파 빠르지만 리졸버 부하↑. 로드밸런서 앞단에서는 20초~수분으로 두는 게 일반적.

## 3. ARP (IP → MAC)

**로컬 네트워크에서만 일어나는 단계**. TCP 패킷은 IP 주소로 목적지를 정하지만 이더넷 프레임은 **MAC 주소**가 필요.

- 라우터(게이트웨이)의 IP를 MAC으로 변환하기 위해 ARP 요청 브로드캐스트
- 외부 서버로 나가는 패킷은 **게이트웨이의 MAC**까지만 결정되면 됨. 이후는 각 홉에서 라우터가 갱신

## 4. TCP 3-way Handshake (+TLS)

### TCP

1. 클라 → 서버: **SYN** (시퀀스 번호 제안)
2. 서버 → 클라: **SYN-ACK**
3. 클라 → 서버: **ACK** → 연결 수립

**왕복 1.5회**(RTT). 지구 반대편 서버라면 이 단계만 해도 수백 ms.

### TLS (HTTPS일 때)

- **TLS 1.2**: 추가 2 RTT(ClientHello → ServerHello+Cert → Key Exchange → Finished)
- **TLS 1.3**: 1 RTT로 단축, 재방문은 **0-RTT** 가능
- 인증서 체인 검증 + 세션 키 합의 → 이후는 대칭키 암호화
- 자세한 설명: [[HTTPS-TLS|HTTPS · TLS Handshake]]

### 최적화

- **HTTP/2** — 단일 TCP 연결로 멀티플렉싱
- **HTTP/3 (QUIC)** — UDP 기반, 0-RTT 재개, HoL blocking 완화

## 5. HTTP 요청 · 응답

### 요청 구성

```
GET /search?q=hi HTTP/1.1
Host: google.com
User-Agent: Mozilla/5.0 ...
Accept: text/html,...
Accept-Encoding: gzip, br
Cookie: session=abc
```

### 서버 측 처리

1. 로드밸런서 → 리버스 프록시([[Reverse-Proxy|Nginx]]) → 앱 서버
2. 앱 서버가 라우팅 → 컨트롤러 → 서비스 → DB/캐시
3. 응답 생성 → 미들웨어·프록시 체인을 역순으로 통과 → 클라이언트

### 응답

```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Encoding: gzip
Set-Cookie: ...
Cache-Control: max-age=3600

<html>...</html>
```

## 6. 렌더링 파이프라인

### 핵심 단계

1. **HTML 파싱** → DOM 트리 구축
2. **CSS 파싱** → CSSOM 트리 구축
3. **JS 실행** — `<script>` 만나면 파서 일시 정지(방어: `async`, `defer`, `type="module"`)
4. **Render Tree** = DOM + CSSOM (화면에 보일 노드만)
5. **Layout(Reflow)** — 각 노드 기하 계산
6. **Paint** — 픽셀 렌더링
7. **Composite** — GPU가 레이어 합성

### 추가 요청 흐름

HTML 내 `<img>`·`<link>`·`<script>` 태그마다 **추가 HTTP 요청**이 발생. 현대 브라우저는 **프리로드 스캐너**가 파싱과 병행해 미리 요청을 띄움.

### 주요 성능 지표

- **TTFB(Time to First Byte)** — 첫 바이트 도착 시점
- **FCP(First Contentful Paint)** — 첫 콘텐츠 렌더
- **LCP(Largest Contentful Paint)** — 가장 큰 요소 렌더. Core Web Vital
- **CLS(Cumulative Layout Shift)** — 누적 레이아웃 이동
- **INP(Interaction to Next Paint)** — 사용자 입력 반응성

## 전체 체인에서 실패하는 지점들

- **DNS 실패** — Authoritative 서버 다운·캐시 오염
- **TCP connect 실패** — 서버 포트 닫힘·방화벽
- **TLS 실패** — 인증서 만료·체인 오류·SNI 불일치
- **HTTP 4xx/5xx** — 앱·게이트웨이 레벨
- **렌더링 블로킹** — 동기 스크립트·거대 CSS
- **클라이언트 자원** — 메모리·CPU 부족, 느린 네트워크

## 면접에서 답변 깊이 레벨

| Level | 답변 범위 |
|---|---|
| 초급 | "DNS로 IP 찾고, HTTP 요청·응답 후 렌더링" |
| 중급 | 위 + TCP 3-way, HTTPS, DOM/CSSOM/Render Tree |
| 심화 | 위 + ARP, HSTS, TLS 1.3 0-RTT, HTTP/2 멀티플렉싱, 프리로드 스캐너, Core Web Vitals |
| 고급 | 위 + 캐시 계층(브라우저/CDN/프록시), Service Worker, QUIC, Critical Rendering Path 최적화 |

## 면접 체크포인트

- 7단계를 **끊기지 않고** 말할 수 있는가
- DNS 조회 재귀 경로(Root → TLD → Authoritative)
- TCP 3-way + TLS 1.3/1.2 RTT 차이
- 렌더링 파이프라인에서 **JS가 파서를 블로킹**하는 이유와 해결책(`async`/`defer`)
- Core Web Vitals 지표 3개(LCP·CLS·INP)
- HTTP/2·HTTP/3이 기존 성능 병목을 어떻게 개선하는가

## 출처
- [daddyprogrammer — 기술 용어 및 개념 정리](https://daddyprogrammer.org/post/2058/tech-terms-concept/)

## 관련 문서
- [[OSI-7-Layer|OSI 7계층]]
- [[HTTPS-TLS|HTTPS · TLS Handshake]]
- [[HTTP-Seminar|HTTP 버전별 진화]]
- [[DNS|DNS 구조]]
- [[Reverse-Proxy|Reverse Proxy]]
- [[Latency-Optimization|레이턴시 최적화]]
