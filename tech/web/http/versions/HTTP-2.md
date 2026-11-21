---
tags: [web, http, http2, protocol, performance, multiplexing]
status: done
verified_at: 2026-08-28
category: "Web - HTTP"
aliases: ["HTTP/2", "HTTP2", "멀티플렉싱", "HPACK", "h2"]
---

# HTTP/2

HTTP/2는 HTTP/1.1의 의미(메소드, 상태 코드, URI, 헤더)는 그대로 두고 클라이언트와 서버 사이의 **데이터 전송 방식(프레이밍과 연결 사용)**을 바꿔 통신 효율을 높인 프로토콜이다. 애플리케이션 코드를 고치지 않고도 적용된다.

## HTTP/1.1의 한계

HTTP/1.1은 문서 전송용으로 설계돼, 무거운 페이로드와 빈번한 요청이 많은 현대 웹 앱에는 비효율적이다.

- **응답 순서 고정**: HTTP/1.1 pipelining은 응답을 기다리지 않고 여러 요청을 보낼 수 있지만, 서버는 같은 연결의 응답을 요청 순서대로 보내야 한다. 독립 stream multiplexing이 없어 앞 응답이 느리면 뒤 응답도 막힌다.
- **프로토콜 차원의 다중화 없음**: 병렬 처리를 브라우저가 책임지므로 출처(origin)당 동시 연결 수가 6개 안팎으로 제한된다(브라우저마다 다름).
- **헤더 반복 전송**: 매 요청마다 비대한 헤더를 평문으로 반복한다.

이 제약 때문에 프론트엔드는 요청 수를 줄이는 우회 기법을 썼다 — JS, CSS를 하나로 번들링하고 Minify하거나, 여러 이미지를 한 장으로 합치는 스프라이트.

## 핵심 메커니즘

### 바이너리 프레이밍
텍스트 대신 **바이너리 프레임**으로 메시지를 쪼개 전송한다. 모든 상위 기능의 토대다.

프레임 전체가 고정 길이인 것은 아니다. 고정된 9바이트 헤더 뒤에 가변 길이 payload가 붙으며, 헤더의 Length 필드가 payload 길이를 나타낸다.

### 바이너리 프레이밍과 요청 스머글링

명시적인 프레임 경계가 있어도 요청 스머글링이 사라지는 것은 아니다. HTTP/2를 받은 프록시가 HTTP/1.1로 전달할 때 필드 이름과 값을 검증하지 않으면 CR, LF 같은 문자가 메시지 구분자로 해석될 수 있다.

RFC 9113은 필드 값의 NUL, CR, LF 등을 금지하고, 잘못된 요청이나 응답을 중개자가 전달하지 않도록 요구한다. 따라서 확인 대상은 프로토콜 버전뿐 아니라 프록시의 필드 검증과 오리진으로의 변환 경계다. HTTP/2 사용 여부만으로 보안 검증을 끝내지 않는다.

### 멀티플렉싱 (다중화)
**하나의 TCP 연결로 여러 요청과 응답을 동시에** 주고받는다. 각 요청-응답이 독립된 stream으로 interleave되어 HTTP/1.1의 response-order HOL과 여러 연결에 의존하던 병목을 줄인다. 동시 stream 수는 peer의 `SETTINGS_MAX_CONCURRENT_STREAMS`와 구현 정책의 제한을 받는다.

### 흐름 제어
한 연결의 여러 stream이 수신 측 버퍼를 나눠 쓰므로, 수신자는 stream별 창과 연결 전체 창으로 받을 수 있는 바이트 수를 알린다. 송신자는 두 창의 여유를 넘지 않게 보내고, 보낸 만큼 두 창이 줄며 수신자의 `WINDOW_UPDATE`로 다시 늘어난다. 흐름 제어 대상은 DATA 프레임뿐이고 연결 단위(한 hop)로 동작한다. 초기 창은 stream과 연결 모두 65,535바이트이고, `SETTINGS_INITIAL_WINDOW_SIZE` 변경은 열린 stream의 창까지 그 차이만큼 바꿔 음수로 만들 수도 있다(RFC 9113 5.2, 6.9).

창은 2^31-1바이트를 넘으면 안 된다. 이를 넘게 하는 `WINDOW_UPDATE`를 받으면 stream은 `RST_STREAM`, 연결은 `GOAWAY`에 `FLOW_CONTROL_ERROR`를 담아 끊고, 어느 창이든 상한을 넘게 하는 `SETTINGS_INITIAL_WINDOW_SIZE` 변경은 연결 오류로 다룬다(RFC 9113 6.9.1, 6.9.2). 창 값은 상대가 보낸 프레임으로 바뀌는 신뢰할 수 없는 입력이므로, 구현은 프레임을 받을 때뿐 아니라 내부에서 창을 되돌리는 경로에서도 상한을 지켜야 한다(해석). nginx의 CVE-2026-123007은 취소한 응답 데이터의 몫을 상한 검사 없이 연결 창에 되돌리고, 연결을 끝내야 할 SETTINGS 변경에서 해당 stream만 재설정해 연결을 남겼다. 이어 `WINDOW_UPDATE` 검사의 부호 없는 산술이 언더플로해 창이 상한을 크게 넘었고, 그 값이 음수 길이로 쓰여 TLS 출력 경로의 메모리 복사가 버퍼 밖에 닿았다(Rapid7). 대응은 [[Vulnerability-Operations-AI-Agents#사례: nginx HTTP/2와 nginx2root|nginx 사례]]에 있다.

### 헤더 압축 (HPACK)
헤더를 **HPACK**으로 압축하고, 이전에 보낸 헤더는 인덱스로 참조해 반복 전송을 줄인다.

### 스트림 우선순위
RFC 7540의 stream dependency와 weight 기반 priority signaling은 RFC 9113에서 deprecated 됐다. 서버가 실제 전송 순서를 어떻게 정하는지는 구현에 달려 있으며, RFC 9218의 extensible prioritization 지원 여부도 client, server, CDN별로 확인한다.

### 서버 푸시
클라이언트가 요청하기 전에 서버가 필요할 리소스를 미리 보낼 수 있다. 다만 실효성 논란으로 주요 브라우저에서 제거되어 사실상 폐기 수순이다.

## HTTP/1.1과의 호환

핵심 의미(메소드, 상태 코드, URI, 헤더 필드)는 동일하고 바뀐 것은 전송 계층의 프레이밍과 연결 사용 방식뿐이라, 기존 앱을 수정하지 않고 적용할 수 있다. HTTP/2를 모르는 구형 클라이언트에는 HTTP/1.1로 폴백한다. `https` URI의 HTTP/2는 TLS ALPN에서 `h2`로 협상한다. HTTP/2 자체는 prior knowledge를 가진 cleartext TCP 연결도 정의하지만, 브라우저 배포는 보통 TLS를 사용하므로 HTTPS가 실무 기본값이다.

## 프론트엔드 최적화의 역전

멀티플렉싱으로 작은 파일을 동시에 여러 개 받을 수 있게 되면서, HTTP/1.1 시절의 요청 수 줄이기 기법이 더 이상 최선이 아니다.

- **한 덩어리 번들 → 작은 청크 다수**: 변경된 청크만 캐시가 무효화되어 캐시 효율이 오르고 병렬 다운로드가 된다.
- **스프라이트 이미지 → 개별 이미지 병렬 요청**.

다만 과도한 분할은 압축률 저하와 요청 오버헤드가 있어 균형이 필요하다.

## 어디서 켜는가 — 엣지에서 종단

HTTP/2는 보통 **CDN이나 로드밸런서가 엣지에서 종단**한다. 클라이언트와는 HTTP/2로 말하고 뒤쪽 오리진, 인스턴스와는 HTTP/1.1로 통신하는 경우가 많다(TLS 종단과 같은 모델). 그래서 백엔드 앱은 평소대로 HTTP/1.1만 처리하면 된다. AWS에서는 CloudFront([[CloudFront]])와 ALB([[ELB|AWS ELB/ALB]])가 HTTPS 리스너로 HTTP/2를 자동 지원한다.

확인은 `curl --http2 -I <url>`로 응답 라인의 `HTTP/2`를 보거나, 브라우저 개발자도구 Network 탭의 Protocol 컬럼에서 `h2` 표시로 한다.

## HTTP/3와의 관계

HTTP/2의 멀티플렉싱은 HTTP 계층에선 병렬이지만 단일 TCP 연결을 쓰므로, 패킷 하나가 손실되면 그 연결의 모든 스트림이 막히는 **TCP 레벨 HOL 블로킹**이 남는다. [[HTTP-3|HTTP/3]]는 같은 멀티플렉싱 목표를 TCP가 아니라 **UDP 기반 QUIC** 위에서 구현해 이 한계까지 해소한다.

## 면접 체크포인트

- HTTP/2가 HTTP/1.1 대비 바꾼 것(전송, 프레이밍)과 유지한 것(의미)
- 멀티플렉싱이 출처당 연결 수 제약과 HTTP/1.1 response-order HOL을 줄이지만 TCP-level HOL은 남기는 이유
- HPACK이 무엇을 압축하는가
- 흐름 제어 창이 2^31-1바이트를 넘게 되는 입력을 프로토콜은 어떻게 다루게 하며, 구현이 이 상한을 놓치면 무엇이 되는가
- HTTP/2에서 번들링과 스프라이트가 왜 안티패턴이 되는가
- HTTP/2의 HOL 블로킹이 TCP 계층에 남는 이유와 HTTP/3(QUIC)의 해법
- LB, CDN이 HTTP/2를 종단하고 백엔드와 HTTP/1.1로 통신하는 구조

## 출처

2026-10-07 부분 대조: 프레임 길이와 요청 스머글링 절은 RFC 9113의 4.1, 8.1.1, 8.2.1절을 확인했다. 브라우저 지원 현황과 AWS 설정은 이번 대조 범위에 포함하지 않아 기존 `verified_at`을 유지한다.

2026-11-21 부분 대조: 흐름 제어 절은 RFC 9113의 5.2, 6.9.1, 6.9.2절과 Rapid7 분석을 확인했다. 다른 절은 다시 대조하지 않아 기존 `verified_at`을 유지한다.

- [RFC 9112 — HTTP/1.1 (RFC Editor)](https://www.rfc-editor.org/rfc/rfc9112)
- [RFC 9113 — HTTP/2 (RFC Editor)](https://www.rfc-editor.org/rfc/rfc9113)
- [RFC 9218 — Extensible Prioritization Scheme for HTTP (RFC Editor)](https://www.rfc-editor.org/rfc/rfc9218)
- [RFC 7541 — HPACK (RFC Editor)](https://www.rfc-editor.org/rfc/rfc7541)
- AWS 환경에서 HTTP/2 적용하기 (HTTP/2 프로토콜, CloudFront, ALB) — 개인 블로그
- [CVE-2026-123007: Critical NGINX HTTP/2 Integer Underflow Leads to RCE (FIXED) — Rapid7](https://www.rapid7.com/blog/post/ve-cve-2026-123007-critical-nginx-http-2-integer-underflow-leads-to-rce-fixed/) — 2026-11-18 게시, 흐름 제어 계산 결함의 연쇄. 공격 재현 정보는 옮기지 않았다

## 관련 문서
- [[HTTP-3|HTTP/3, QUIC]] — QUIC stream으로 TCP 연결 단위 HOL을 stream별로 격리
- [[HTTP-Seminar|HTTP 버전별 진화]] — HTTP/0.9~3 타임라인
- [[gRPC|gRPC]] — HTTP/2 기반 RPC
- [[ELB|AWS ELB/ALB]] — ALB가 HTTP/2를 L7에서 종단
- [[CloudFront|CloudFront]] — CDN 엣지의 HTTP/2
- [[HTTP-Chunked-Transfer|HTTP 분할 전송]] — 스트리밍과 전송 방식
- [[TCP-Handshake|TCP 핸드셰이크]] — HTTP/2가 올라타는 TCP
- [[Latency-Optimization|지연 최적화]]
- [[WebSocket|WebSocket]] — ALB가 함께 지원하는 실시간 프로토콜
- [[Vulnerability-Operations-AI-Agents#사례: nginx HTTP/2와 nginx2root|nginx HTTP/2 취약점 대응]] — 흐름 제어 결함의 노출 조건, HTTP/2 끄기와 적용 확인
