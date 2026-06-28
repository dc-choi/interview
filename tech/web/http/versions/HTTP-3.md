---
tags: [web, http, http3, quic, udp, protocol, performance]
status: done
category: "Web - HTTP"
aliases: ["HTTP/3", "HTTP3", "QUIC", "Connection Migration"]
---

# HTTP/3 (QUIC)

HTTP/3는 HTTP의 세 번째 메이저 버전으로, TCP가 아니라 **UDP 기반 전송 프로토콜 QUIC** 위에서 동작한다. HTTP의 의미(메소드, 상태 코드, 헤더)는 그대로 두되 전송 계층을 TCP에서 QUIC으로 갈아끼워, TCP의 구조적 한계(핸드셰이크 레이턴시, HOL 블로킹, 연결 단절)를 넘는다. QUIC(Quick UDP Internet Connection)은 구글이 설계했고, 초기 명칭 HTTP-over-QUIC이 HTTP/3로 정해졌다.

## 왜 TCP를 버렸나

TCP는 신뢰성을 위해 구조적으로 레이턴시를 동반하고, 커널 레벨에 박혀 있어 고치기 어렵다.

- **연결 수립 왕복**: 3-way 핸드셰이크에 1 RTT, TLS까지 더하면 왕복이 더 늘어난다(상세는 [[TCP-Handshake|TCP 핸드셰이크]], [[HTTPS-TLS|HTTPS, TLS]]). HTTP/1에서 HTTP/2로 갈 때도 핸드셰이크 자체는 못 건드리고 횟수만 줄였다.
- **TCP 레벨 HOL 블로킹**: TCP는 순서 보장이 필수라 패킷 하나가 손실되면 뒤 패킷이 다 막힌다. HTTP/2의 멀티플렉싱도 단일 TCP 연결 위라 이 한계가 남는다 ([[HTTP-2|HTTP/2]]).
- **수정 난이도**: TCP는 오래됐고 커널과 중간 장비(라우터 등)에 깊이 박혀 있어 프로토콜을 바꾸는 것이 대작업이다.

그래서 QUIC은 **UDP 위에 신뢰성, 혼잡 제어, 멀티플렉싱을 새로 구현**하는 길을 택했다.

## UDP는 백지 프로토콜

UDP는 데이터 전송 외에 아무 기능이 없다 — 헤더에 출발지, 도착지, 길이, 선택적 체크섬뿐이다. 순서 보장도 흐름 제어도 없다. 흔히 UDP는 신뢰성이 없는 대신 빠르다고 하지만, 정확히는 **백지 상태라 그 위에 무엇이든 새로 구현할 수 있다**는 뜻이다. TCP는 헤더가 이미 포화 상태(옵션 필드 최대 320비트가 MSS, Window Scale, SACK 등으로 차 있음)라 새 기능을 넣을 자리가 없는 반면, UDP 위에서는 QUIC이 자유롭게 설계할 수 있다. TCP와 UDP의 기본 비교는 [[Transport-Layer|전송 계층]].

## QUIC이 개선한 것

### 연결 수립 레이턴시 감소 (1-RTT, 0-RTT)
QUIC은 첫 핸드셰이크에 **연결 설정 정보와 데이터를 함께** 보낸다. TCP와 TLS가 신뢰성 연결과 암호화 키 교환을 끝낸 뒤에야 데이터를 보내는 것과 달리, QUIC은 키 교환 전에 데이터를 실어 보내 첫 연결을 **1 RTT**에 끝낸다(첫 요청은 서버 Connection ID로 만든 초기화 키로 암호화). 한 번 연결한 서버는 설정을 캐싱해 다음엔 **0-RTT**로 시작한다. TCP도 TCP Fast Open과 TLS 1.3으로 비슷해질 수 있으나, TCP SYN의 페이로드 제한 때문에 초기 데이터가 크면 QUIC이 여전히 유리하다.

### 스트림별 멀티플렉싱 (HOL 블로킹 제거)
QUIC도 단일 연결 안에서 여러 스트림을 병렬 전송한다. 핵심은 **한 스트림의 패킷 손실이 그 스트림에만 영향**을 주고 다른 스트림은 계속 흐른다는 것이다. HTTP/2가 풀지 못한 TCP 레벨 HOL 블로킹을 전송 계층에서 해소한다.

### 빠른 패킷 손실 감지 (패킷 번호)
QUIC은 순서 재조립용 시퀀스 번호와 별개로 **단조 증가하는 패킷 번호**를 둔다. TCP는 재전송 때 같은 시퀀스 번호를 쓰므로, 받은 ACK가 원본의 응답인지 재전송의 응답인지 모호해진다(재전송 모호성 → RTT, RTO 계산이 흐려짐). QUIC은 매 전송마다 패킷 번호가 달라 어느 전송의 ACK인지 명확해 손실 감지가 빠르다.

### 연결 이전 (Connection Migration)
TCP는 연결을 출발지 IP, 포트, 목적지 IP, 포트의 조합으로 식별해 클라이언트 IP가 바뀌면 연결이 끊기고 재핸드셰이크가 필요하다. QUIC은 IP와 무관한 **Connection ID**로 연결을 식별해, Wi-Fi에서 셀룰러로 바뀌어도 연결이 유지된다 — IP 변경이 잦은 모바일 환경에서 특히 유효하다.

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
- RFC 9000 (QUIC), RFC 9114 (HTTP/3)

## 관련 문서
- [[HTTP-2|HTTP/2]] — 멀티플렉싱과 TCP HOL 블로킹 (직전 버전)
- [[TCP-Handshake|TCP 핸드셰이크]] — 3-way/4-way, QUIC이 없애려는 왕복
- [[HTTPS-TLS|HTTPS, TLS]] — TLS 핸드셰이크 RTT, QUIC의 통합 암호화
- [[Transport-Layer|전송 계층]] — TCP vs UDP 기본
- [[HTTP-Seminar|HTTP 버전별 진화]]
- [[Latency-Optimization|지연 최적화]]
