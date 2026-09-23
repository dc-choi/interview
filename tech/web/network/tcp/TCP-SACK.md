---
tags: [web, network, tcp, sack, error-control, loss-recovery, d-sack, rack, linux]
status: done
verified_at: 2026-09-23
category: "Web - 네트워크"
aliases: ["TCP SACK", "Selective Acknowledgment", "선택적 확인 응답", "SACK-Permitted", "D-SACK", "Duplicate SACK", "SACK reneging", "RACK-TLP"]
---

# TCP SACK: 받은 구간을 알려 여러 손실을 한 번에 복구하기

SACK(Selective Acknowledgment)는 수신 측이 누적 ACK 너머에서 이미 받은 비연속 구간을 TCP 옵션으로 알려, 송신 측이 실제로 빠진 세그먼트만 재전송하게 돕는 확장이다. 누적 ACK, 중복 ACK와 Selective Repeat의 기본 개념은 [[TCP-Flow-Error-Control#SACK은 받은 구간을 알린다|흐름 제어와 오류 제어]]를 전제로 한다.

한 줄 요약: **누적 ACK는 첫 번째 구멍만 가리킬 수 있어서, 한 윈도우 안에 손실이 여럿이면 송신 측은 구멍마다 RTT를 기다리거나 이미 도착한 데이터까지 다시 보낸다. SACK는 받은 구간 목록으로 모든 구멍을 한 번에 드러낸다. 다만 SACK는 권고일 뿐이라 송신 측 메모리를 줄여 주지는 않는다.**

## 누적 ACK만 있을 때 무엇이 문제인가

단순화를 위해 세그먼트 번호로 설명한다. 1번부터 6번까지 보냈고 3번 하나만 유실됐다면, SACK가 없어도 3번부터 6번까지를 통째로 다시 보내지는 않는다.

- 수신 측은 순서를 벗어난 세그먼트를 버리지 않고 나중 처리를 위해 보관해야 한다(SHOULD, RFC 9293).
- 순서를 벗어난 세그먼트가 올 때마다 기대하는 번호(3번)를 담은 중복 ACK를 즉시 보낸다(SHOULD, RFC 5681).
- 송신 측은 중복 ACK 세 개로 빠른 재전송을 시작해 3번만 다시 보내고, 3번이 도착하면 수신 측의 누적 ACK는 보관해 둔 4~6번을 넘어 7번으로 뛴다.

문제는 **한 윈도우 안에서 여러 세그먼트를 잃을 때**다. 1번부터 10번까지 보내고 3번과 5번을 잃었다면, 4번과 6~10번이 도착하는 동안 누적 ACK는 계속 3번만 가리킨다.

| 상황 | SACK 없음 | SACK 있음 |
|---|---|---|
| 단일 손실(3번) | 중복 ACK로 3번 재전송, 이후 ACK가 7번으로 전진 | 같음. SACK 블록이 4~6번 수신을 추가로 알려 줌 |
| 다중 손실(10개 중 3번, 5번) | 3번 재전송 뒤 ACK가 5번에서 멈추는 부분 ACK를 보고서야 5번 손실을 안다. 구멍 하나에 RTT 하나 | 중복 ACK에 실린 SACK 블록으로 3번과 5번이 모두 빠졌음을 알고, 혼잡 윈도우가 허용하는 범위에서 같은 복구 라운드에 둘 다 재전송 |
| 타임아웃 뒤 | 무엇이 도착했는지 몰라 `SND.UNA`부터 다시 보내면 이미 받은 4번, 6번까지 재전송할 수 있음 | SACK 정보로 받은 구간을 건너뛸 수 있음(단, 아래 reneging 규칙 적용) |

RFC 2018은 이 상황을 누적 ACK 방식이 송신 측에게 손실마다 한 RTT를 기다리거나 정상 수신된 세그먼트를 불필요하게 재전송하게 만든다고 설명하고, 다중 손실이 ACK 기반 clock을 잃게 해 처리량을 떨어뜨린다고 적는다. SACK 없이 부분 ACK에 대응하는 알고리즘이 NewReno(RFC 6582)이고, 구멍을 RTT마다 하나씩 메우는 구조적 한계는 그대로다.

## 협상과 옵션 형식

- **SACK-Permitted (Kind 4, 2바이트)**: SYN에만 실을 수 있고 SYN이 아닌 세그먼트에는 보내면 안 된다. 양쪽이 모두 제시해야 SACK가 켜진다. 협상 규칙과 중간 장비가 옵션을 지웠을 때의 증상은 [[TCP-Handshake#핸드셰이크가 실제로 합의하는 것|핸드셰이크가 합의하는 것]].
- **SACK (Kind 5, 가변 길이)**: 블록마다 Left Edge와 Right Edge를 32비트 시퀀스 번호로 담는다. 블록은 연속으로 받은 바이트 구간이고, Right Edge는 그 구간의 마지막 바이트 다음 번호다. 블록 바로 앞뒤 바이트는 아직 받지 못했다는 뜻이다.
- **블록 개수**: 블록 n개의 옵션 길이는 `8n+2`바이트라 40바이트 옵션 공간에 최대 4개가 들어간다. Timestamps 옵션(10바이트와 패딩 2바이트)과 함께 쓰면 최대 3개다.
- **블록 순서**: 첫 블록은 가장 최근에 받은 세그먼트를 포함해야 한다. 나머지 자리에는 최근에 보고한 블록을 반복해, ACK 하나가 유실돼도 정보가 사라지지 않게 한다.

바이트 단위 예시로 보면, 1000바이트 세그먼트 여섯 개(시퀀스 1~6000) 중 2001~3000과 4001~5000을 잃은 경우다.

1. 3001~4000 도착: `ACK=2001`, `SACK=[3001,4001)`
2. 5001~6000 도착: `ACK=2001`, `SACK=[5001,6001) [3001,4001)` (최신 구간이 첫 블록)
3. 송신 측은 자기 전송 이력과 대조해 2001~3000, 4001~5000 두 구멍을 파악한다. 구멍을 아는 것과 손실로 판정해 재전송하는 시점은 다르다. 판정은 손실 감지 규칙이 정하는데, RFC 6675는 구멍 위로 SACK된 불연속 구간이 DupThresh(RFC 5681 기준 3)개 이상이거나 SACK된 바이트가 `(DupThresh - 1) * SMSS`를 넘을 때 손실로 보고, RACK은 전송 시각을 본다. 이 예시처럼 뒤따르는 세그먼트가 적으면 개수 기준으로는 판정이 늦어지고, RACK-TLP가 그 공백을 메운다.

송신 측은 재전송 큐의 세그먼트마다 SACK 수신 여부를 표시하는 scoreboard를 두고, 표시된 세그먼트는 재전송에서 건너뛴다. 가장 높은 SACK 구간보다 아래에 있으면서 표시되지 않은 세그먼트가 재전송 후보다. 이 정보로 혼잡 제어 규칙 안에서 보수적으로 복구하는 표준 알고리즘이 RFC 6675다. 복구 중 혼잡 윈도우의 변화는 [[TCP-Congestion-Control|혼잡 제어]].

## SACK는 권고다: reneging과 송신 측 메모리

모든 TCP 송신 측은 SACK 여부와 관계없이 누적 ACK를 받기 전까지 보낸 데이터를 재전송 큐에 보관한다. SACK가 이 보관 의무를 새로 만드는 것도, 줄여 주는 것도 아니다.

- 수신 측은 버퍼가 부족하면 SACK로 이미 알린 데이터도 버릴 수 있다(reneging). RFC 2018은 이를 권장하지 않지만 허용한다.
- 그래서 송신 측은 SACK를 받았더라도 누적 ACK가 그 데이터를 덮기 전에는 버리면 안 된다(MUST NOT). 재전송 타임아웃이 나면 SACK 표시를 지우고(SHOULD) 윈도우 왼쪽 끝 세그먼트는 표시 여부와 관계없이 재전송해야 한다(MUST).
- SACK가 추가하는 비용은 연결마다 유지하는 scoreboard 상태와 SACK 블록 처리 연산이다. 수신 측의 순서 밖 세그먼트 보관은 SACK가 없어도 권장되는 동작이다.

QUIC(RFC 9002)은 이 지점을 다르게 설계했다. ACK 프레임이 SACK와 비슷한 정보를 담지만 한 번 확인한 패킷을 철회하는 reneging을 허용하지 않아 양쪽 구현이 단순해지고 송신 측의 메모리 부담이 줄어든다. TCP의 SACK 구간 세 개와 달리 많은 ACK 구간을 담을 수 있어 손실이 많은 환경에서 복구가 빠르다. QUIC의 전송 구조는 [[HTTP-3|HTTP/3와 QUIC]].

## 확장: D-SACK와 RACK-TLP

- **D-SACK (RFC 2883)**: 중복 세그먼트를 받았을 때 첫 SACK 블록에 그 중복 구간을 보고한다. 송신 측은 자신이 불필요하게 재전송했다는 사실을 알 수 있어, 패킷 재정렬, ACK 손실, 이른 재전송 타임아웃이 있는 환경에서 더 견고하게 동작하는 근거로 쓴다.
- **RACK-TLP (RFC 8985)**: 세그먼트별 전송 시각과 SACK 정보로 손실을 시간 기준으로 추론한다(RACK). 꼬리 손실은 probe 세그먼트로 ACK를 유도해 재전송 타임아웃을 피한다(TLP). 중복 ACK 개수 기준보다 애플리케이션이 조금씩 보내는 흐름, 재전송의 재손실, 재정렬 상황에서 손실을 더 효율적으로 찾는 대안이다. RFC 8985는 연결이 SACK를 사용하고(MUST) 송신 측이 연결별 scoreboard를 유지하도록 요구하며, D-SACK 기반 재정렬 창 조정을 권장한다. SACK를 끄면 이 복구 방식도 함께 잃는다.

## 서버 운영에서 볼 것

Linux 커널 문서 기준 기본값이다. 배포판과 커널 버전에 따라 다를 수 있으므로 대상 서버에서 `sysctl`로 확인한다.

| sysctl | 기본값 | 의미 |
|---|---|---|
| `net.ipv4.tcp_sack` | 1 | SACK 사용 |
| `net.ipv4.tcp_dsack` | 1 | D-SACK 전송 허용 |
| `net.ipv4.tcp_recovery` | 0x1 | RACK 손실 감지 사용 |
| `net.ipv4.tcp_reordering` | 3 | 초기 재정렬 허용 수준, 연결별로 `tcp_max_reordering`(기본 300)까지 동적 조정 |

- **SACK 전용 윈도우나 타임아웃 설정은 없다.** 연결당 메모리를 정하는 것은 SACK와 무관한 소켓 버퍼 한도인 `tcp_rmem`, `tcp_wmem`(최소, 기본, 최대)이다. 동시 연결 수와 대역폭 지연 곱을 기준으로 이 값을 정하고, SACK는 기본으로 켠 채 둔다. SACK를 끄면 위의 다중 손실 복구 이점이 사라진다.
- **SACK를 끈 전례는 취약점 대응이었다.** 2019년 Linux의 SACK 처리 결함(CVE-2019-11477 SACK Panic, CVE-2019-11478 SACK Slowness와 과도한 자원 사용)과 낮은 MSS를 이용한 자원 소모(CVE-2019-11479)가 공개됐을 때, 패치 전 임시 완화책으로 `tcp_sack=0` 또는 낮은 MSS 연결 차단이 제시됐다. 근본 해결은 커널 패치였고, SACK 비활성화는 복구 성능을 내주는 일시적 조치였다. 이후 커널에는 광고 MSS의 하한을 정하는 `tcp_min_snd_mss`(기본 48)가 있다.
- **중간 장비**: 방화벽이나 로드밸런서가 SYN의 SACK-Permitted를 지우면 연결은 정상이지만 SACK 없이 동작한다. 손실이 있는 구간의 처리량이 이유 없이 낮으면 양 끝 캡처에서 협상 결과부터 본다.

관측 방법은 다음과 같다.

- `ss -ti`: 협상됐으면 옵션 목록에 `sack`이 보이고, 값이 있을 때 `sacked:`, `dsack_dups:`, `reord_seen:` 카운터가 출력된다.
- Wireshark 디스플레이 필터: `tcp.options.sack_perm`(협상), `tcp.options.sack_le`와 `tcp.options.sack_re`(블록 경계), `tcp.options.sack.count`, `tcp.options.sack.dsack`, `tcp.analysis.duplicate_ack`, `tcp.analysis.spurious_retransmission`. 캡처 위치와 누락의 한계는 [[Packet-Capture-and-Wireshark|패킷 캡처]].

## 면접 체크포인트

- 단일 손실에서는 SACK 없이도 빠른 재전송으로 빠진 세그먼트만 보낼 수 있다는 점, SACK의 진짜 이점이 한 윈도우 안의 다중 손실 복구라는 점
- 누적 ACK만으로는 구멍 하나에 RTT 하나가 드는 이유와 NewReno의 부분 ACK
- SACK-Permitted는 SYN에서만, SACK 블록은 최대 4개(Timestamps와 함께면 3개), 첫 블록은 최신 구간
- SACK는 권고라 수신 측이 reneging할 수 있고, 그래서 송신 측이 누적 ACK 전까지 데이터를 버리지 못한다는 점
- D-SACK로 불필요한 재전송을 감지하는 방법, RACK-TLP가 중복 ACK 개수 대신 시간으로 손실을 판단하는 이유
- QUIC ACK 프레임과의 차이(reneging 금지, 더 많은 ACK 구간)
- 서버 튜닝 대상은 SACK가 아니라 소켓 버퍼이며, SACK 비활성화는 취약점 임시 완화책이었다는 점

## 출처

제공된 메모를 바탕으로 정리했으며 영상 본문과 자막은 직접 확인하지 못했다. 보완한 기술 설명은 아래 공식 자료와 대조했다.

- [SACK에 대한 간략한 소개 — 널널한 개발자 TV](https://www.youtube.com/watch?v=vjH5cR5gFBo&list=PLXvgR_grOs1BkUIxKsLEUdefyMWMA0_U-&index=12)
- [IETF, RFC 2018: TCP Selective Acknowledgment Options](https://www.rfc-editor.org/rfc/rfc2018.html)
- [IETF, RFC 2883: An Extension to the Selective Acknowledgement (SACK) Option for TCP](https://www.rfc-editor.org/rfc/rfc2883.html)
- [IETF, RFC 6675: A Conservative Loss Recovery Algorithm Based on Selective Acknowledgment (SACK) for TCP](https://www.rfc-editor.org/rfc/rfc6675.html)
- [IETF, RFC 8985: The RACK-TLP Loss Detection Algorithm for TCP](https://www.rfc-editor.org/rfc/rfc8985.html)
- [IETF, RFC 6582: The NewReno Modification to TCP's Fast Recovery Algorithm](https://www.rfc-editor.org/rfc/rfc6582.html)
- [IETF, RFC 5681: TCP Congestion Control, 3.2 Fast Retransmit/Fast Recovery](https://www.rfc-editor.org/rfc/rfc5681.html#section-3.2)
- [IETF, RFC 9293: Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293.html)
- [IETF, RFC 9002: QUIC Loss Detection and Congestion Control, 4.4 No Reneging](https://www.rfc-editor.org/rfc/rfc9002.html#section-4.4)
- [Linux Kernel Documentation, IP Sysctl](https://docs.kernel.org/networking/ip-sysctl.html)
- [iproute2, misc/ss.c](https://github.com/iproute2/iproute2/blob/main/misc/ss.c)
- [Wireshark, Display Filter Reference: Transmission Control Protocol](https://www.wireshark.org/docs/dfref/t/tcp.html)
- [NFLX-2019-001: Linux and FreeBSD Kernel, Multiple TCP-based remote denial of service vulnerabilities — Netflix Security Bulletins](https://github.com/Netflix/security-bulletins/blob/master/advisories/third-party/2019-001.md)

## 관련 문서

- [[TCP-Flow-Error-Control|TCP 흐름 제어와 오류 제어 (누적 ACK, 중복 ACK, Selective Repeat)]]
- [[TCP-Handshake|TCP Handshake (SACK-Permitted 협상)]]
- [[TCP-Header|TCP 헤더 구조 (Options)]]
- [[TCP-Congestion-Control|TCP 혼잡 제어 (Fast Retransmit, Fast Recovery)]]
- [[HTTP-3|HTTP/3와 QUIC (패킷 번호와 손실 감지)]]
- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]]
- [[TCP|TCP 인덱스]]
