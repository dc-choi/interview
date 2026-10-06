---
tags: [web, network, tcp, nagle, latency]
status: done
verified_at: 2026-10-06
category: "Web - 네트워크"
aliases: ["Nagle Algorithm", "Nagle 알고리즘", "Delayed ACK", "TCP_NODELAY"]
---

# TCP Nagle 알고리즘과 Delayed ACK

Nagle 알고리즘은 짧은 TCP 세그먼트가 잦게 나가는 것을 줄이기 위한 송신 측 정책이다. Delayed ACK는 수신 측이 ACK를 잠시 늦춰 보내는 정책이다. 서로 다른 방향의 정책이지만 작은 요청을 나누어 쓰는 애플리케이션에서는 함께 지연을 만들 수 있다.

## 작은 쓰기를 언제 모으는가

RFC 9293의 기본 규칙은 **아직 ACK되지 않은 데이터가 있으면**, 새 데이터를 버퍼에 모으고 기존 데이터가 확인되거나 유효 송신 MSS 크기의 세그먼트를 보낼 수 있을 때 전송하는 것이다. 미확인 데이터가 없는데 첫 작은 쓰기부터 고정 시간만큼 기다리는 알고리즘은 아니다.

MSS만큼 모였다는 것은 Nagle의 대기 조건을 벗어난다는 뜻이다. 수신 윈도우와 혼잡 제어 제한까지 사라지는 것은 아니다. PSH 비트도 Nagle을 우회하는 지시가 아니다.

## Delayed ACK와 만날 때

다음은 가능한 지연 경로다. 모든 연결에서 같은 순서로 나타나는 것은 아니다.

1. 송신 애플리케이션이 요청의 앞부분을 작은 쓰기로 보낸다.
2. 수신 TCP는 ACK를 지연하고, 수신 애플리케이션은 요청의 나머지를 기다린다.
3. 송신 측의 작은 후속 쓰기는 앞부분의 ACK를 기다리며 Nagle 버퍼에 남을 수 있다.
4. 수신 측의 ACK 타이머 등이 ACK를 내보내면 후속 데이터 전송이 진행된다.

이는 영구 교착 상태가 아니라 타이머 등으로 풀리는 대기다. RFC 9293은 ACK 지연을 0.5초 미만으로 제한한다. 실제 타이머와 즉시 ACK 조건은 구현에 따라 다르므로 40ms나 200ms를 모든 Linux 연결의 고정 지연으로 쓰지 않는다.

## Linux의 제어 수단

| 수단 | 바꾸는 것 | 주의점 |
|---|---|---|
| `TCP_NODELAY` | 해당 소켓의 Nagle 비활성화 | 상대의 Delayed ACK, 흐름 제어와 혼잡 제어를 끄지 않는다 |
| `TCP_CORK` | 불완전한 세그먼트를 모아 보내도록 제어 | Linux 전용. 해제할 때 대기 데이터를 내보내며 문서상 cork 대기 상한은 200ms다 |
| `MSG_MORE` | 해당 송신 호출 뒤에 데이터가 더 이어짐을 알림 | TCP에서 `TCP_CORK`와 비슷한 효과를 호출 단위로 적용한다. Linux 2.4.4부터 제공된다 |
| `TCP_QUICKACK` | ACK를 즉시 보내는 모드로 전환 | 영구 설정이 아니며 이후 프로토콜 처리에 따라 다시 바뀐다 |

Linux에서는 `TCP_CORK`가 `TCP_NODELAY`보다 우선하지만, `TCP_NODELAY`를 설정하는 동작 자체는 대기 중인 출력을 명시적으로 flush한다. 두 옵션이 서로 독립적이라고 가정하지 않는다. `TCP_CORK`는 Linux 2.2부터이며, `TCP_NODELAY`와의 조합은 2.5.71부터다.

## 적용과 확인

- 작은 메시지의 응답 지연이 중요하면 Nagle 사용 여부를 확인하고 `TCP_NODELAY` 전후를 비교한다. `TCP_NODELAY`를 켜서 Nagle을 끄면 작은 패킷 수가 늘 수 있다.
- 함께 준비된 요청 조각은 애플리케이션에서 묶어 쓸 수 있다. 하지만 TCP의 쓰기 경계가 수신 메시지 경계로 보존되지는 않으므로 프레이밍은 별도로 필요하다.
- 진단 시 쓰기 호출 시각, 세그먼트 전송과 ACK 도착 시각을 대조한다. 짧은 멈춤만으로 Nagle 문제라고 단정하지 않고 런타임 버퍼링과 상대의 처리 대기도 확인한다.

## 출처

- [IETF, RFC 9293: Nagle Algorithm](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.7.4)
- [IETF, RFC 9293: Managing the Window](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.8.6)
- [Linux man-pages, tcp(7)](https://man7.org/linux/man-pages/man7/tcp.7.html)
- [Linux man-pages, send(2)](https://man7.org/linux/man-pages/man2/send.2.html)

## 관련 문서

- [[TCP-Flow-Error-Control|흐름 제어와 오류 제어]]
- [[TCP-Congestion-Control|혼잡 제어]]
- [[Transport-Layer-Sockets|소켓 스트림과 메시지 프레이밍]]
- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]]
