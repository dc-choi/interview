---
tags: [web, network, tcp, congestion-control, aimd, slow-start, cwnd]
status: done
category: "Web - 네트워크"
aliases: ["TCP Congestion Control", "혼잡 제어", "AIMD", "Slow Start", "CWND", "TCP Tahoe", "TCP Reno", "ssthresh"]
---

# TCP 혼잡 제어 (Congestion Control)

네트워크의 혼잡 상태를 감지해 송신량을 강제로 줄여 망 전체가 무너지는 것을 막는 제어. 흐름 제어가 **수신 측이 감당할 양**에 맞추는 것이라면, 혼잡 제어는 **망 전체 상태**에 맞춘다. 흐름/오류 제어와 한 묶음인 전송 제어의 세 번째 축으로, 앞 두 축은 [[TCP-Flow-Error-Control]].

## 왜 필요한가 — 혼잡 붕괴

흐름 제어와 오류 제어만 쓰면 유실이 생길 때마다 재전송이 반복된다. 망은 다수가 공유하는 공간이라, 한 번 막히기 시작하면 여기저기서 동시에 재전송이 일어나 부하가 더 커지고, 그게 다시 유실을 부르는 악순환에 빠진다. 이를 **혼잡 붕괴(congestion collapse)**라 한다.

종단은 망 내부를 직접 볼 수 없지만, **응답(ACK)이 늦거나 오지 않는다**는 정황만으로 망이 느려지고 있다는 혼잡 상태를 추정할 수 있다. 혼잡이 감지되면 송신 측이 윈도우 크기를 줄여 전송량을 낮추는 것이 혼잡 제어다.

## 혼잡 윈도우 (CWND)

송신 측의 최종 송신 윈도우는 두 값 중 **더 작은 쪽**으로 정해진다.

- **RWND(Receiver Window, 수신자 윈도우)**: 수신 측이 알려준, 받을 수 있는 양 → 흐름 제어
- **CWND(Congestion Window, 혼잡 윈도우)**: 송신 측이 망 상태를 보고 정한 양 → 혼잡 제어

즉 **송신 윈도우 = min(RWND, CWND)**. 혼잡 제어 기법이 늘렸다 줄였다 하는 대상은 송신 윈도우 자체가 아니라 **CWND**다. 슬라이딩 윈도우의 윈도우(ACK 없이 연속 전송 가능한 구간)와 RWND/CWND(각각 수신/혼잡 윈도우 크기를 나타내는 숫자값)는 다른 층위의 개념이다.

### CWND 초기화 — MSS

신규 연결의 초기 `cwnd`는 하나의 고정값이 아니라 구현과 적용 RFC에 따라 정한다. RFC 5681은 MSS에 따라 2~4 SMSS의 상한을 제시했고, RFC 6928은 최대 `min(10*SMSS, max(2*SMSS, 14600))`까지 허용했다. **1 SMSS**는 재전송 timeout 뒤의 loss window에 해당하며, 일반적인 신규 연결 초기값과 같은 뜻이 아니다.

**MSS(Maximum Segment Size)** option은 수신 측이 재조립할 수 있는 TCP payload 상한을 알린다. RFC 6691에 따라 광고할 MSS는 경로 MTU에서 고정 IP 헤더와 고정 TCP 헤더만 빼 계산하며, IP/TCP option 크기를 MSS 값에서 미리 빼지 않는다.

> advertised MSS = effective MTU − fixed IP header − fixed TCP header

여기서 **MTU(Maximum Transmission Unit)**는 한 번에 보낼 수 있는 최대 전송 단위다. IPv4 option과 TCP option이 없는 이더넷 MTU 1500 예시는 `1500 - 20 - 20 = 1460바이트`다. 실제 세그먼트에 IP/TCP option이 붙으면 그 option 크기만큼 해당 세그먼트의 payload는 광고된 MSS보다 작아진다.

## 고전 Reno 계열의 두 기본 동작

고전적인 Reno 계열은 AIMD 기반 혼잡 회피와 Slow Start를 상황에 맞게 사용한다. CUBIC, BBR 같은 현대 알고리즘은 증가와 감소 기준이 다르므로 이 조합만으로 일반화하지 않는다.

### AIMD (Additive Increase / Multiplicative Decrease)

합 증가, 곱 감소. Reno의 congestion avoidance에서는 문제가 없으면 CWND가 **RTT당 약 1 SMSS씩** 선형 증가하고, 혼잡이 감지되면 전통적으로 절반 수준으로 줄어든다. 완만히 오르다 급락하는 **톱니 모양** 그래프가 나온다.

AIMD는 같은 병목을 공유하고 RTT와 알고리즘이 비슷한 연결이라는 이론 조건에서 대역을 공평하게 나누는 방향으로 수렴한다. 실제 환경에서는 RTT, 혼잡 제어 알고리즘과 경로 차이 때문에 공평성이 달라진다. 단점은 대역이 남아도 선형 증가 구간에서 최대 속도 도달이 느릴 수 있다는 점이다.

### Slow Start

`cwnd`가 초기값 또는 loss window처럼 낮은 상태에서, 새 데이터를 확인하는 ACK마다 CWND를 증가시켜 매 RTT마다 대략 두 배가 되도록 빠르게 키운다. RTO 뒤에는 loss window부터 다시 Slow Start를 시작한다. 초반엔 느려도 갈수록 빠르게 차오른다. 대역폭이 넓은 망에서는 AIMD의 느린 상승 단점이 부각되므로, 여유가 있다고 판단되는 구간을 Slow Start로 빠르게 채운다.

### ssthresh (Slow Start Threshold)

여기까지만 Slow Start를 쓰겠다는 경계가 되는 임계점. CWND가 ssthresh보다 **작으면 Slow Start(지수 증가)**, **넘으면 AIMD 합 증가(선형)**로 전환한다.

이유: 지수 증가를 방치하면 윈도우가 폭주해 제어가 어렵고, 혼잡이 예상되는 구간에서는 돌다리 두들기듯 선형으로 조금씩 늘리는 편이 안전하다. 전통적인 Reno 계열의 손실 대응에서는 `ssthresh = max(FlightSize / 2, 2*SMSS)`를 사용한다. `FlightSize`는 실제로 네트워크에 나가 ACK를 기다리는 데이터량이므로 `cwnd`와 항상 같지 않다.

## 대표 정책 — Tahoe vs Reno

둘 다 Slow Start로 시작해 ssthresh를 넘으면 AIMD 합 증가로 전환한다. 차이는 **혼잡을 감지했을 때의 대응**이다.

### 혼잡 감지 신호 두 가지

- **Timeout**: 보낸 데이터나 응답 ACK가 유실되어 일정 시간 응답이 없는 경우. 심각한 혼잡 신호.
- **3 ACK Duplicated(중복 ACK 3회)**: TCP는 정상 수신한 마지막 데이터까지의 승인 번호를 보내는 **누적 승인(Cumulative ACK)** 방식이라, 같은 승인 번호를 반복해서 받으면 그 번호 이후가 유실됐다는 뜻이다. 패킷 순서가 뒤바뀔 수 있어 한두 번으로는 판정하지 않고 **3회**부터 혼잡으로 본다.

3회 중복 ACK가 오면 타임아웃을 기다리지 않고 즉시 해당 패킷을 재전송하는데, 이를 **빠른 재전송(Fast Retransmit)**이라 한다. 타임아웃을 기다리면 그만큼 재전송이 지연되므로 이를 앞당기는 기법이다.

### TCP Tahoe

Fast Retransmit을 처음 도입한 초기 정책. 혼잡 감지 시 **두 신호를 구분하지 않고** 동일하게 대응한다.

- ssthresh ← `max(FlightSize / 2, 2*SMSS)`
- CWND ← loss window. RFC 5681에서는 최대 1 SMSS로 두고 Slow Start 재시작

단점: 3 중복 ACK처럼 비교적 가벼운 혼잡에도 CWND를 1까지 떨궈 원래 크기 회복이 느리다.

### TCP Reno

Tahoe 이후 정책으로, **3 ACK Duplicated와 Timeout을 구분**한다.

- **3 중복 ACK(가벼운 혼잡)**: `ssthresh`를 `max(FlightSize / 2, 2*SMSS)`로 낮춘 뒤 Fast Recovery에 들어간다. 전통적인 Reno는 recovery 중 `cwnd = ssthresh + 3*SMSS`로 두고, 새 데이터를 ACK하면 `cwnd`를 `ssthresh`로 되돌린다.
- **Timeout(심각한 혼잡)**: 첫 재전송 timeout에서는 같은 식으로 `ssthresh`를 갱신하고, `cwnd`를 loss window로 낮춘 뒤 Slow Start를 재시작한다. 같은 세그먼트의 후속 timeout에서는 구현이 `ssthresh`를 유지할 수 있지만, 첫 timeout부터 항상 유지되는 것은 아니다.

혼잡의 경중을 따져 가벼우면 덜 줄이고, 심각하면 처음부터 다시 시작한다.

| | TCP Tahoe | TCP Reno |
|---|---|---|
| 3 중복 ACK 시 | loss window부터 Slow Start | `ssthresh`를 FlightSize 기준으로 낮춘 Fast Recovery |
| Timeout 시 | loss window부터 Slow Start | loss window부터 Slow Start, 첫 timeout에서 `ssthresh` 갱신 |
| 두 신호 구분 | 안 함 | 함 |
| 회복 속도 | 느림 | 가벼운 혼잡에서 빠름 |

## 그 이후 — 현대 정책

Tahoe와 Reno는 손실을 주 혼잡 신호로 삼는 고전 정책이다. 이후 정책은 대역폭 지연 곱과 지연 신호를 더 잘 활용하려 한다. CUBIC은 이전 최대 윈도우 근처에서 3차 함수로 성장하고, BBR은 다른 신호를 사용한다. 어느 알고리즘이 기본인지와 정확한 파라미터는 OS, 커널, 네트워크 설정에 따라 확인해야 한다.

## 응용 관점 — 고지연 링크에서 크기는 왕복 횟수다

RTT가 큰 링크(위성망 등)에서 응답 크기가 레이턴시에 미치는 영향은 대역폭뿐 아니라 Slow Start의 왕복 횟수로 나타난다. RFC 6928은 IW10을 **허용 상한**으로 제안하지만 구현이 반드시 사용한다는 뜻은 아니다. 초기 윈도우를 넘는 payload는 ACK 왕복을 기다린 뒤 다음 데이터를 보낼 수 있어 여러 RTT를 소비할 수 있다. 압축과 전송량 축소의 효과는 실제 대상 OS와 연결 측정으로 확인한다.

CWND는 커넥션에 종속된 값이다. 새 커넥션은 해당 구현의 초기 윈도우에서 시작하며, 재사용 커넥션은 유휴 시간과 restart window 규칙의 영향을 받는다. keep-alive와 커넥션 풀의 이득은 handshake 비용, 재사용 비율, 서버와 네트워크 정책을 함께 측정해 판단한다.

## 면접 체크포인트

- 혼잡 붕괴가 무엇이고 혼잡 제어가 푸는 문제, 흐름 제어와의 구분(수신 능력 vs 망 상태)
- 송신 윈도우 = min(RWND, CWND), 초기 CWND와 loss window의 차이, 광고 MSS는 MTU에서 고정 IP/TCP 헤더를 뺀 값
- AIMD의 합 증가/곱 감소와 공평성(평형 수렴), 톱니 그래프
- Slow Start의 지수 증가와 ssthresh를 경계로 한 AIMD 전환
- 혼잡 감지 두 신호(Timeout vs 3 중복 ACK)와 Fast Retransmit, 누적 승인
- Tahoe vs Reno: Reno가 두 신호를 구분해 가벼운 혼잡엔 Fast Recovery 하는 점
- 현대 CUBIC이 손실 기반 보수성을 넘어선 방향

## 출처
- TCP의 혼잡 제어 — 개인 블로그
- [RFC 5681, TCP Congestion Control](https://www.rfc-editor.org/rfc/rfc5681)
- [RFC 9293, Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293)
- [RFC 6691, TCP Options and Maximum Segment Size](https://www.rfc-editor.org/rfc/rfc6691)
- [RFC 6928 (Increasing TCP's Initial Window)](https://www.rfc-editor.org/rfc/rfc6928)
- [latency가 길때 API 응답속도 개선하기 — velog](https://velog.io/@huhdy32/Async-Profiler-%EB%A1%9C-%EB%B3%91%EB%AA%A9-%EC%A7%84%EB%8B%A8-%EB%B0%8F-%EC%9D%91%EB%8B%B5%EC%86%8D%EB%8F%84-6%EB%B0%B0-%EA%B0%9C%EC%84%A0)

## 관련 문서
- [[TCP-Flow-Error-Control|TCP 흐름 제어와 오류 제어 (RWND, 슬라이딩 윈도우, ARQ)]]
- [[TCP-Header|TCP 헤더 구조 (Window Size, MSS 옵션)]]
- [[TCP-Handshake|TCP Handshake]]
- [[HTTP-3|HTTP/3, QUIC — TCP를 버린 이유]]
- [[Latency-Optimization|레이턴시 최적화]] — 크기가 왕복 횟수로 바뀌는 실무 진단
- [[Transport-Layer|전송 계층 (L4)]]
