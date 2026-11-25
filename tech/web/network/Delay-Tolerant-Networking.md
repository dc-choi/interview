---
tags: [web, network, dtn, bundle-protocol, space, latency]
status: done
verified_at: 2026-11-25
category: "Web - 네트워크"
aliases: ["Delay-Tolerant Networking", "DTN", "지연과 단절을 견디는 네트워킹", "Bundle Protocol", "번들 프로토콜", "행성 간 인터넷"]
---

# 지연과 단절을 견디는 네트워킹 (DTN)

DTN(delay-tolerant and disruption-tolerant networking)은 출발지에서 목적지까지의 경로가 통신하는 동안 계속 이어져 있다는 가정을 버린 네트워크 구조다. 데이터를 번들(bundle)이라는 메시지 단위로 묶어 각 노드가 저장해 두었다가 다음 링크가 열릴 때 넘긴다. 왕복이 수십 분이고 링크가 몇 주씩 끊기는 행성 간 통신을 위해 설계된 구조에서 출발했다.

## 인터넷의 가정이 깨지는 곳

RFC 4838(2007, IRTF DTN 연구 그룹의 Informational 문서)은 인터넷 구조에 깔린 가정으로 통신 세션 동안 출발지와 목적지 사이에 종단 간 경로가 존재한다는 점, 신뢰 통신에서는 수신자의 시의적절하고 안정적인 피드백에 기댄 재전송으로 오류를 고칠 수 있다는 점, 종단 간 손실이 비교적 작다는 점 등을 들고, DTN 구조가 이런 가정 대부분을 완화하려 한다고 설명한다. 화성 통신은 두 방향에서 이 가정을 깬다.

- **지연:** NASA의 2023 Moon to Mars 구조 검토 백서는 유인 화성 임무의 편도 통신 지연이 궤적에 따라 21~23분에 이를 수 있다고 본다. 신호 이동 시간은 거리를 빛의 속도로 나눈 값이므로 중계 자산을 두어도 지연은 사라지지 않는다고 적는다([[Throughput-vs-Latency#전파 지연은 처리량으로 없앨 수 없다|전파 지연]]).
- **단절:** 지구와 화성은 약 26개월마다 태양을 사이에 두고 일직선에 놓이고(합, conjunction), 신호는 태양을 통과하지 못한다. 같은 백서는 유인 왕복 임무에서 지구와의 직접 통신 단절이 피할 수 없고 몇 주 동안 이어질 수 있다고 적는다.

TCP는 데이터를 보내기 전에 3-way handshake로 왕복을 한 번 쓰고, 확인 응답이 오지 않은 데이터를 송신자가 재전송한다([[TCP-Handshake|TCP 핸드셰이크]], [[TCP-Flow-Error-Control|흐름과 오류 제어]]). 왕복이 수십 분이면 연결 수립에만 그만큼이 들고, 경로가 끊긴 동안에는 종단 간 확인과 재전송이 성립하지 않는다. 지연만 있고 단절이 없는 구간이라도 재전송 한 번이 왕복 시간만큼 늦어지므로 정정 부호를 미리 싣는 쪽이 유리해진다([[Error-Correcting-Codes#재전송할 것인가, 미리 고칠 것인가|재전송과 정정 부호]]).

## 번들 계층: 저장하고, 운반하고, 넘긴다

- **오버레이:** RFC 4838은 번들 계층을 전송 계층들 위에 놓인 종단 간 메시지 지향 오버레이로 설명하고, 대부분의 DTN 노드가 다음 연결까지 데이터를 보관하는 영속 저장소를 쓸 것으로 예상한다.
- **Bundle Protocol 7:** RFC 9171(2022-01, Standards Track)은 BP가 여러 구성 네트워크의 응용 계층에 놓여 store-carry-forward 오버레이를 이룬다고 정의한다. 하부 프로토콜과의 접점은 convergence-layer adapter(CLA)라 부르며, TCP CLA(TCPCL)가 그 예다. 실험 단계의 RFC 5050 구현과는 상호운용되지 않는다.
- **전달 보장:** RFC 9171은 BP 자체가 목적지 전달을 보장하지 않는다고 명시한다. 구간별 신뢰성을 어디서 확보할지는 CLA 선택 같은 별도 설계의 몫이다(이 문서의 해석).
- **수명:** 번들의 Lifetime 필드는 페이로드가 쓸모없어지는 시점을 나타내고, 수명을 넘긴 번들은 노드가 보관하거나 전달할 필요가 없으며 삭제하는 것이 권고(SHOULD)된다. 기다리면 결국 도착한다는 가정 대신 언제까지 의미가 있는지를 데이터에 적는 셈이다(이 문서의 해석).
- **연결(contact) 유형:** RFC 4838은 연결을 항상 열린(persistent), 요청 시 여는(on-demand), 시각과 기간을 약속한(scheduled), 예고 없이 생기는(opportunistic), 일정 없이 이력으로 예측하는(predicted) 다섯 가지로 나눈다. RFC 9171은 예정된, 예측된, 기회적 연결을 양방향이든 단방향이든 활용하는 것을 BP의 특징으로 든다.
- **custody transfer:** RFC 4838은 번들과 그 전달 책임을 다음 노드로 넘기는 것을 custody transfer라 부르며, 출발지가 재전송 책임을 중간의 custodian에게 위임할 수 있게 한다고 설명한다. 이는 RFC 5050(BPv6)의 프로토콜 내 기능이었고, RFC 9171(BPv7)은 RFC 5050과의 차이로 custody transfer를 bundle-in-bundle encapsulation 명세(BIBE, RFC 9171이 인용한 시점에는 Internet-Draft)로 옮겼다고 적는다. BPv7 기본 명세에는 custody 절차가 없다. 다만 RFC 9171 서론은 오류 제어의 책임을 노드 사이에서 옮기는 능력을 여전히 BP의 핵심 능력으로 든다.

다음 표는 위 두 RFC의 설명을 이 문서가 대비해 정리한 것이다.

| 항목 | TCP/IP 인터넷의 기본 가정 | DTN 번들 계층 |
|---|---|---|
| 경로 | 세션 동안 종단 간 경로가 있다 | 없을 수 있다. 링크가 열릴 때 구간별로 넘긴다 |
| 중간 노드 | 짧은 큐를 거쳐 다음 홉으로 바로 보낸다 | 영속 저장소에 보관했다가 넘긴다 |
| 오류 복구 | 수신자의 제때 오는 피드백에 기댄 종단 간 재전송 | BP는 전달을 보장하지 않는다. 구간별 손실은 이웃 사이의 신뢰 전송 CLA로 줄이고, 종단 간 전달 보장은 BP 확장이나 응용 계층에서 따로 설계한다 |
| 시간 | 피드백이 제때 돌아온다고 본다 | 번들 수명과 예정된 연결 시각으로 다룬다 |

## 사례: TCP/IP 설계자가 본 행성 간 통신

Vint Cerf는 2026-11 공개된 인터뷰에서 지구와 화성 사이에 빛의 속도로 신호가 가는 데 20분이 걸리는 환경에서는 핸드셰이크가 너무 느려 TCP/IP 프로토콜이 동작하지 않으며, 그래서 DTN과 그 특정 사례인 bundle protocol suite를 쓴다고 설명한다. 진행자 소개에 따르면 그는 행성 간 인터넷용 소프트웨어를 만드는 회사 Tolero의 창업을 돕고 있다. Cerf는 하드웨어를 정하지 않는 소프트웨어 회사이며 1년 남짓 안에 우주용 DTN 라우터를 내놓기를 바란다고 말했다. 회사의 공식 자료는 찾지 못했으므로 회사 정보와 일정은 당사자 발언으로만 둔다. 20분은 그가 든 대표값이며 실제 지연은 두 행성의 위치에 따라 달라진다(위 NASA 백서).

## 지상 시스템에 주는 시사점

다음은 위 구조에서 도출한 이 문서의 해석이다.

- 중간 서버가 메시지를 큐에 보관했다가 넘기고 재시도하는 메일 전송도 저장 후 전달 계열이다. 수락과 최종 배달을 구분하듯([[Application-Layer-Protocols#SMTP 수락과 최종 배달은 다르다|SMTP 수락과 배달]]) DTN에서도 다음 노드가 받은 것과 목적지에 닿은 것은 다르다.
- 오지의 센서 수집이나 오프라인 우선 앱처럼 연결이 간헐적인 지상 환경도 요청에 응답이 곧 돌아온다는 가정 대신 메시지 수명, 보관 위치와 재전송 책임을 설계 항목으로 둔다.
- 중계 위성이나 지상국을 늘리면 단절 구간은 줄일 수 있어도 전파 지연은 줄이지 못한다. 두 문제를 나눠 대책을 고른다.

## 점검 질문

- TCP가 긴 지연과 단절에서 어려운 이유를 핸드셰이크 왕복, 종단 간 재전송과 경로 가정으로 나눠 설명할 수 있는가
- 번들, CLA, 연결 유형과 번들 수명의 역할을 구분하고, custody transfer가 BPv6의 기능이며 BPv7 기본 명세에서 빠졌음을 말할 수 있는가
- 중계 자산이 단절과 지연에 각각 어떤 효과를 내는지 말할 수 있는가

## 출처

- [IETF, RFC 4838 Delay-Tolerant Networking Architecture](https://www.rfc-editor.org/rfc/rfc4838.html) — 가정의 완화, 번들 계층, 영속 저장, 연결 유형, custody transfer
- [IETF, RFC 9171 Bundle Protocol Version 7](https://www.rfc-editor.org/rfc/rfc9171.html) — store-carry-forward 오버레이, CLA, 전달 비보장, Lifetime, RFC 5050과의 비호환
- [Mars Communications Disruption and Delay — NASA](https://www.nasa.gov/wp-content/uploads/2024/01/mars-communications-disruption-and-delay.pdf) — 2023 Moon to Mars Architecture Concept Review 백서. 편도 지연, 합에 의한 단절과 중계의 한계
- [Vint Cerf interview transcript — Future Stories, João Tomé](https://ourfuturestories.eu/vint-cerf) — 2026-11 공개 인터뷰 전사. Cerf의 발언 부분만 인용했다
- [Vint Cerf on why TCP/IP was never patented — seremot, João Tomé](https://seremot.com/p/vint-cerf-on-why-tcpip-was-never) — 2026-11-19 게시. Tolero는 진행자의 소개
- 사용자 제공 GeekNews 알림(2026-11-22): Vint Cerf가 말하는 TCP/IP를 특허로 등록하지 않은 이유. 학습 계기이며 게시물 번호는 확인하지 못했다

## 관련 문서

- [[Internet-vs-Web#개방 표준이 만든 확장성|인터넷과 웹의 개방 표준]] — TCP/IP를 공개한 이유
- [[Throughput-vs-Latency|처리량과 지연시간]]
- [[Error-Correcting-Codes|오류 정정 부호]]
- [[Satellite-Direct-to-Device|위성 직접 연결]]
- [[Mobile-Network-Continuity|이동 환경의 통신 연속성]]
- [[Physical-AI-and-Liquid-Control|피지컬 AI와 리퀴드 제어]] — 지구의 판단을 기다릴 수 없는 현장 자율
