---
tags: [web, network, dns, tcp, http, rendering, browser]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Browser URL Flow", "브라우저 URL 입력 프로세스", "What happens when you type google.com"]
verified_at: 2026-08-31
---

# 브라우저 주소창에 URL을 입력하면

백엔드 면접의 가장 고전적인 질문. **"주소창에 google.com을 치고 엔터를 누르면 어떤 일이 일어나는가."** 답변의 깊이는 개인이 네트워크, 브라우저, 인프라를 어디까지 이해하는지를 가늠하는 척도가 된다. 아래는 한 번의 페이지 로드가 완료되기까지의 전 과정을 계층 순으로 정리한 것.

## 전 과정 요약

1. **URL 파싱** — 스킴, 호스트, 경로, 쿼리 분리
2. **DNS 조회** — 도메인 → IP 주소
3. **이웃 주소 해석** — 네트워크 전송에 필요할 때 IPv4 ARP 또는 IPv6 Neighbor Discovery로 다음 홉의 링크 계층 주소 확인
4. **TCP 3-way handshake** (+TLS 핸드셰이크 for HTTPS)
5. **HTTP 요청** — GET /
6. **서버 처리** → 응답
7. **렌더링** — HTML 파싱, CSSOM, JS 실행, Paint

## 1. URL 파싱, 전처리

브라우저가 주소창 문자열을 해석.

- 스킴(`https://`), 호스트(`google.com`), 포트(`443`), 경로, 쿼리, 프래그먼트 분리
- **휴먼 입력 정규화** — 퍼니코드(IDN) 변환, 공백 trim, 검색어로 간주할지 URL로 간주할지 판단
- **HSTS 캐시** 확인 — 도메인이 HSTS로 등록돼 있으면 `http://`도 `https://`로 강제 승격
- **Service Worker** 제어 범위와 캐시, 쿠키 정책 확인. CORS preflight는 주소창 navigation의 고정 단계가 아니라, Fetch/XHR 등의 요청 메서드와 헤더에 따라 별도로 발생할 수 있다.

## 2. DNS 조회 (도메인 → IP)

### 조회 경로

브라우저와 OS의 캐시 사용, `/etc/hosts` 적용, DoH 사용 여부는 구현과 설정에 따라 다르다. 캐시에 답이나 위임 정보가 없으면, 설정된 재귀 리졸버가 Root → TLD → Authoritative 서버의 위임을 따라 답을 찾는다.

- Root(`.`): `com`의 네임 서버를 가리키는 위임을 제공
- TLD(`com`): `google.com`의 권한 서버를 가리키는 위임을 제공
- Authoritative: 해당 이름의 최종 레코드를 제공

### 주요 레코드

- **A** — IPv4
- **AAAA** — IPv6
- **CNAME** — 별칭
- **NS** — 네임 서버
- **MX** — 메일 서버
- **TXT** — SPF, 도메인 인증

TTL은 레코드 변경과 페일오버를 감지할 수 있는 지연, 리졸버 질의량, 비용의 트레이드오프다. 짧게 해도 이미 캐시된 응답을 즉시 바꾸지는 못하므로, 장애 전환 시간은 TTL뿐 아니라 헬스 체크와 클라이언트, 리졸버 캐시 동작에도 좌우된다.

## 3. 이웃 주소 해석 (IPv4 ARP / IPv6 Neighbor Discovery)

라우팅 결과로 다음 홉과 출력 인터페이스를 정한 뒤, 링크 계층 주소가 필요할 때만 수행한다. 이더넷의 IPv4는 ARP를, IPv6는 Neighbor Discovery를 사용한다.

- IPv4 이더넷에서 이웃 캐시에 매핑이 없으면 다음 홉 IP를 대상으로 ARP 요청을 브로드캐스트할 수 있다.
- 외부 서버로 가는 패킷은 보통 기본 게이트웨이의 링크 계층 주소까지만 알면 된다. 이후 각 홉은 자기 다음 홉을 다시 해석한다.
- 캐시에 이미 있거나 링크 종류가 다르면 별도 요청이 없거나 동작이 달라질 수 있다.

## 4. TCP 3-way Handshake (+TLS)

### TCP

1. 클라 → 서버: **SYN** (시퀀스 번호 제안)
2. 서버 → 클라: **SYN-ACK**
3. 클라 → 서버: **ACK** → 연결 수립

클라이언트가 SYN을 보낸 뒤 연결 수립을 확인하는 데는 손실이 없을 때 보통 1 RTT가 걸린다. 서버가 최종 ACK를 받는 시점은 약 1.5 RTT다. 실제 지연은 경로, 혼잡, 재전송에 따라 달라진다.

### TLS (HTTPS일 때)

- **TLS 1.2**: 전체 핸드셰이크는 보통 추가 2 RTT
- **TLS 1.3**: 전체 핸드셰이크는 1 RTT. **0-RTT**는 PSK 기반 재개에서 일부 early data를 보내는 모드이며, 재생될 수 있어 재생에 안전한 요청에만 쓴다.
- 인증서 체인 검증 + 세션 키 합의 → 이후는 대칭키 암호화
- 자세한 설명: [[HTTPS-TLS|HTTPS, TLS Handshake]]

### 최적화

- **HTTP/2** — 단일 TCP 연결로 멀티플렉싱
- **HTTP/3 (QUIC)** — UDP 위 QUIC 기반, 0-RTT 재개를 지원하며 TCP 전송 계층의 HoL blocking을 피한다.

## 5. HTTP 요청, 응답

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
3. 응답 생성 → 미들웨어, 프록시 체인을 역순으로 통과 → 클라이언트

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

HTML 내 `<img>`, `<link>`, `<script>` 태그마다 **추가 HTTP 요청**이 발생. 현대 브라우저는 **프리로드 스캐너**가 파싱과 병행해 미리 요청을 띄움.

### 주요 성능 지표

- **TTFB(Time to First Byte)** — 첫 바이트 도착 시점
- **FCP(First Contentful Paint)** — 첫 콘텐츠 렌더
- **LCP(Largest Contentful Paint)** — 가장 큰 요소 렌더. Core Web Vital
- **CLS(Cumulative Layout Shift)** — 누적 레이아웃 이동
- **INP(Interaction to Next Paint)** — 사용자 입력 반응성

## 전체 체인에서 실패하는 지점들

- **DNS 실패** — Authoritative 서버 다운, 캐시 오염
- **TCP connect 실패** — 서버 포트 닫힘, 방화벽
- **TLS 실패** — 인증서 만료, 체인 오류, SNI 불일치
- **HTTP 4xx/5xx** — 앱, 게이트웨이 레벨
- **렌더링 블로킹** — 동기 스크립트, 거대 CSS
- **클라이언트 자원** — 메모리, CPU 부족, 느린 네트워크

## 대규모 서비스로 확장하기

단일 서버 전제의 기본 흐름 위에, 대규모 서비스는 트래픽 분산과 장애 대응 인프라가 얹힌다. 경력 면접에서는 여기까지 연결해야 차별화된다.

- **CDN** — 콘텐츠를 지역별 Edge에 분산해 사용자 가까이에서 응답, 오리진 부하 감소 ([[CDN]])
- **GSLB** — 제품과 구성에 따라 지리, 서버 상태, 부하, 네트워크 품질 같은 신호로 리전과 엔드포인트를 선택. 단순 DNS 라운드로빈보다 더 풍부한 정책을 적용할 수 있다 ([[Load-Balancer|Load Balancer, GSLB]])
- **헬스 체크와 페일오버** — 장애 리전의 응답을 줄이고 다른 리전으로 유도할 수 있다. 다만 감지 시간과 DNS 캐시 때문에 기존 사용자가 즉시 전환된다고 보장할 수는 없다.
- **세션 유지** — 장애, 분산으로 다른 서버에 붙어도 로그인이 유지되어야 함 → 공유 세션 저장소, 토큰 기반 인증, 복제 전략 중 요구에 맞는 방식 선택 ([[Auth-Method-Selection|인증 방식 선택]])
- **보안** — DNS 스푸핑과 DDoS는 다른 층의 위협이다. DNSSEC 검증은 DNS 데이터의 출처와 무결성을 확인하고, HTTPS 인증서 검증은 접속 상대를 인증한다. CDN, WAF, LB는 DDoS와 애플리케이션 계층 공격 완화에 활용할 수 있지만 DNS 응답을 검증하지는 않는다.
- **무중단 배포** — 블루-그린, 롤링, 카나리로 배포 안정성과 장애 대응을 함께 설계 ([[Zero-Downtime-Deployment|무중단 배포]], [[Blue-Green|전략 비교]])

답변 전략: **기본 흐름(DNS 조회 → TCP 연결 → HTTP 요청/응답)을 짧고 정확하게 먼저** 말하고, "대규모 서비스라면 여기에 CDN과 GSLB, 장애 대응, 세션 유지 설계까지 함께 고려해야 한다"로 확장한다.

## 면접에서 답변 깊이 레벨

| Level | 답변 범위 |
|---|---|
| 초급 | "DNS로 IP 찾고, HTTP 요청, 응답 후 렌더링" |
| 중급 | 위 + TCP 3-way, HTTPS, DOM/CSSOM/Render Tree |
| 심화 | 위 + ARP/Neighbor Discovery, HSTS, TLS 1.3 0-RTT, HTTP/2 멀티플렉싱, 프리로드 스캐너, Core Web Vitals |
| 고급 | 위 + 캐시 계층(브라우저/CDN/프록시), Service Worker, QUIC, Critical Rendering Path 최적화, GSLB와 헬스 체크, 세션 유지, 무중단 배포 |

## 면접 체크포인트

- 7단계를 **끊기지 않고** 말할 수 있는가
- DNS 조회 재귀 경로(Root → TLD → Authoritative)
- TCP 3-way + TLS 1.3/1.2 RTT 차이
- 렌더링 파이프라인에서 **JS가 파서를 블로킹**하는 이유와 해결책(`async`/`defer`)
- Core Web Vitals 지표 3개(LCP, CLS, INP)
- HTTP/2, HTTP/3이 기존 성능 병목을 어떻게 개선하는가
- 기본 흐름 다음에 **대규모 확장(CDN, GSLB, 헬스 체크, 세션 유지)** 으로 연결할 수 있는가

## 출처
- [IETF, RFC 1034: Domain Names - Concepts and Facilities](https://www.rfc-editor.org/rfc/rfc1034.html)
- [IETF, RFC 826: An Ethernet Address Resolution Protocol](https://www.rfc-editor.org/rfc/rfc826.html), [IETF, RFC 4861: Neighbor Discovery for IPv6](https://www.rfc-editor.org/rfc/rfc4861.html)
- [IETF, RFC 9293: Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293.html), [IETF, RFC 5246: TLS 1.2](https://www.rfc-editor.org/rfc/rfc5246.html), [IETF, RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446.html)
- [IETF, RFC 4033: DNS Security Introduction and Requirements](https://www.rfc-editor.org/rfc/rfc4033.html)
- [IETF, RFC 9000: QUIC](https://www.rfc-editor.org/rfc/rfc9000.html), [IETF, RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html), [IETF, RFC 9114: HTTP/3](https://www.rfc-editor.org/rfc/rfc9114.html)
- [AWS Route 53, Choosing TTL values for DNS records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/best-practices-dns.html#best-practices-dns-choosing-ttl-values)
- [IETF, RFC 6797: HTTP Strict Transport Security](https://www.rfc-editor.org/rfc/rfc6797.html), [WHATWG, Fetch Standard](https://fetch.spec.whatwg.org/), [WHATWG, HTML Standard](https://html.spec.whatwg.org/), [W3C, Service Workers](https://www.w3.org/TR/service-workers/)
- [Web Vitals — web.dev](https://web.dev/articles/vitals)

## 관련 문서
- [[OSI-7-Layer|OSI 7계층]]
- [[HTTPS-TLS|HTTPS, TLS Handshake]]
- [[HTTP-Seminar|HTTP 버전별 진화]]
- [[DNS|DNS 구조]]
- [[URI-URL-URN|URI vs URL vs URN]]
- [[Reverse-Proxy|Reverse Proxy]]
- [[Load-Balancer|Load Balancer, GSLB]]
- [[CDN|CDN]]
- [[Latency-Optimization|레이턴시 최적화]]
