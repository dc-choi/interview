---
tags: [web, http, http3, quic, udp, protocol, performance]
status: done
verified_at: 2026-07-21
category: "Web - HTTP"
aliases: ["HTTP/3", "HTTP3", "QUIC", "Connection Migration"]
---

# HTTP/3 (QUIC)

HTTP/3는 HTTP의 세 번째 메이저 버전으로, TCP가 아니라 **UDP 기반 전송 프로토콜 QUIC** 위에서 동작한다. HTTP의 의미(메소드, 상태 코드, 헤더)는 유지하면서 전송 계층을 QUIC으로 바꿔 연결 수립 지연과 TCP 연결 단위 HOL 블로킹을 줄이고 연결 이전 기능을 제공한다. QUIC은 Google의 초기 프로토콜에서 출발했지만 IETF 표준에서 이름을 특정 문구의 약어로 정의하지 않는다.

## 왜 TCP를 버렸나

TCP는 신뢰성을 위해 구조적으로 레이턴시를 동반하고, 커널 레벨에 박혀 있어 고치기 어렵다.

- **연결 수립 왕복**: 3-way 핸드셰이크에 1 RTT, TLS까지 더하면 왕복이 더 늘어난다(상세는 [[TCP-Handshake|TCP 핸드셰이크]], [[HTTPS-TLS|HTTPS, TLS]]). HTTP/1에서 HTTP/2로 갈 때도 핸드셰이크 자체는 못 건드리고 횟수만 줄였다.
- **TCP 레벨 HOL 블로킹**: TCP는 순서 보장이 필수라 패킷 하나가 손실되면 뒤 패킷이 다 막힌다. HTTP/2의 멀티플렉싱도 단일 TCP 연결 위라 이 한계가 남는다 ([[HTTP-2|HTTP/2]]).
- **수정 난이도**: TCP는 오래됐고 커널과 중간 장비(라우터 등)에 깊이 박혀 있어 프로토콜을 바꾸는 것이 대작업이다.

그래서 QUIC은 **UDP 위에 신뢰성, 혼잡 제어, 멀티플렉싱을 새로 구현**하는 길을 택했다.

## UDP는 백지 프로토콜

UDP 헤더는 출발지 포트, 도착지 포트, 길이, 체크섬만 담고 순서 보장과 흐름 제어를 제공하지 않는다. UDP 체크섬은 IPv4에서는 0으로 생략할 수 있지만 IPv6에서는 제한된 터널 예외를 빼면 필수다. QUIC은 이 단순한 데이터그램 계층 위에서 신뢰성, 혼잡 제어와 암호화를 구현한다. TCP 확장이 어려운 주된 이유는 제한된 옵션 공간뿐 아니라 커널 배포 주기와 중간 장비가 기존 동작을 가정하는 protocol ossification이다. TCP와 UDP의 기본 비교는 [[Transport-Layer|전송 계층]].

## QUIC이 개선한 것

### 연결 수립 레이턴시 감소 (1-RTT, 0-RTT)
새 QUIC 연결의 Initial 패킷은 Destination Connection ID에서 파생한 Initial secret으로 보호되며 TLS handshake의 CRYPTO frame을 운반한다. 이 Initial 보호는 온패스 관찰자가 키를 계산할 수 있어 애플리케이션 데이터 기밀성을 제공하지 않는다. 새 연결의 HTTP 애플리케이션 데이터는 TLS handshake로 1-RTT 키가 준비된 뒤 전송한다. **0-RTT** 애플리케이션 데이터는 이전 연결 정보를 가진 재개 연결에서만 가능하며 replay될 수 있으므로 비멱등 요청에는 신중해야 한다.

### 스트림별 멀티플렉싱 (HOL 블로킹 제거)
QUIC도 단일 연결 안에서 여러 스트림을 병렬 전송한다. 핵심은 **한 스트림의 패킷 손실이 그 스트림에만 영향**을 주고 다른 스트림은 계속 흐른다는 것이다. HTTP/2가 풀지 못한 TCP 레벨 HOL 블로킹을 전송 계층에서 해소한다.

### 빠른 패킷 손실 감지 (패킷 번호)
QUIC은 순서 재조립용 시퀀스 번호와 별개로 **단조 증가하는 패킷 번호**를 둔다. TCP는 재전송 때 같은 시퀀스 번호를 쓰므로, 받은 ACK가 원본의 응답인지 재전송의 응답인지 모호해진다(재전송 모호성 → RTT, RTO 계산이 흐려짐). QUIC은 매 전송마다 패킷 번호가 달라 어느 전송의 ACK인지 명확해 손실 감지가 빠르다.

### 연결 이전 (Connection Migration)
TCP 연결은 일반적으로 출발지와 목적지의 IP, 포트 조합에 묶인다. QUIC은 **Connection ID**와 새 경로 검증을 이용해 NAT rebinding이나 Wi-Fi에서 셀룰러로 바뀌는 상황에서 연결을 이전할 수 있다. 다만 peer가 `disable_active_migration`을 알리거나 서버 인프라가 Connection ID 라우팅을 유지하지 못하거나 새 경로 검증이 실패하면 이전이 보장되지 않는다.

## 적용 현황과 트레이드오프

주요 브라우저와 도구(cURL)가 지원하고 CDN, 대형 서비스로 확산됐다. 다만 UDP는 일부 네트워크에서 차단되거나 제한되기도 하고, 커널이 아닌 유저 스페이스 구현이라 CPU 비용이 더 들 수 있다. 통신 인프라가 좋은 환경에서는 체감 차이가 작고, 왕복이 길거나 손실, IP 변경이 잦은 환경(모바일, 인프라가 빈약한 지역)에서 이득이 크다.

## 면접 체크포인트

- HTTP/3가 TCP 대신 UDP(QUIC)를 쓰는 이유 세 가지(핸드셰이크 레이턴시, TCP HOL 블로킹, 수정 난이도)
- QUIC의 1-RTT, 0-RTT 연결 수립 원리
- HTTP/2 멀티플렉싱과 QUIC 멀티플렉싱의 차이(TCP HOL 블로킹 잔존 여부)
- Connection ID 기반 연결 이전이 모바일에서 중요한 이유
- UDP가 백지라 QUIC이 그 위에 신뢰성을 구현한다는 의미

## 출처
- HTTP/3는 왜 UDP를 선택했나 (QUIC) — 개인 블로그
- [RFC 9000, QUIC](https://www.rfc-editor.org/rfc/rfc9000)
- [RFC 9001, Using TLS to Secure QUIC](https://www.rfc-editor.org/rfc/rfc9001)
- [RFC 9114, HTTP/3](https://www.rfc-editor.org/rfc/rfc9114)
- [RFC 8200, IPv6의 UDP 체크섬 요구](https://www.rfc-editor.org/rfc/rfc8200)

## 관련 문서
- [[HTTP-2|HTTP/2]] — 멀티플렉싱과 TCP HOL 블로킹 (직전 버전)
- [[TCP-Handshake|TCP 핸드셰이크]] — 3-way/4-way, QUIC이 없애려는 왕복
- [[HTTPS-TLS|HTTPS, TLS]] — TLS 핸드셰이크 RTT, QUIC의 통합 암호화
- [[Transport-Layer|전송 계층]] — TCP vs UDP 기본
- [[HTTP-Seminar|HTTP 버전별 진화]]
- [[Latency-Optimization|지연 최적화]]
