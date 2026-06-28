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

통신 시작 전에는 망 정보가 전혀 없어 CWND를 정하기 애매하다. 그래서 **1 MSS**로 시작한 뒤 통신하며 증감시킨다.

**MSS(Maximum Segment Size)**는 한 세그먼트에 실을 수 있는 실제 데이터 최대량이다.

> MSS = MTU − (IP 헤더 + IP 옵션) − (TCP 헤더 + TCP 옵션)

여기서 **MTU(Maximum Transmission Unit)**는 한 번에 보낼 수 있는 최대 전송 단위다. 이더넷 표준 MTU 1500바이트에서 IP와 TCP 헤더를 각 20바이트로 보면 MSS는 1500 − 40 = **1460바이트**가 된다. 즉 MSS는 전송 한도에서 헤더를 발라낸 순수 데이터 공간이다.

## 혼잡 회피의 두 기본 방식

혼잡 제어 정책은 결국 AIMD와 Slow Start를 상황에 맞게 조합한 것이다.

### AIMD (Additive Increase / Multiplicative Decrease)

합 증가, 곱 감소. 문제가 없으면 CWND를 **1씩 선형 증가(+1)**시키고, 혼잡이 감지되면 **절반으로 곱 감소(×0.5)**시킨다. 완만히 오르다 급락하는 **톱니 모양** 그래프가 나온다.

단순하지만 **공평하다**. 늦게 진입한 연결은 CWND가 작아 처음엔 불리하지만, 혼잡 시 CWND가 큰 연결이 더 많이 유실되어 더 크게 줄인다. 그렇게 비는 대역을 작은 연결이 채우므로, 시간이 지나면 진입 순서와 무관하게 모든 연결의 CWND가 **평형 상태로 수렴**한다(fairness). 단점은 대역이 남아도 너무 조금씩 늘려 최대 속도 도달이 느린 것.

### Slow Start

시작은 느리지만 **ACK를 받을 때마다 CWND를 지수적으로 증가**(매 RTT마다 약 2배)시키고, 혼잡이 감지되면 CWND를 **1로 리셋**한다. 초반엔 느려도 갈수록 빠르게 차오른다. 대역폭이 넓은 현대 망에서는 AIMD의 느린 상승 단점이 부각되므로, 여유가 있다고 판단되는 구간을 Slow Start로 빠르게 채운다.

### ssthresh (Slow Start Threshold)

여기까지만 Slow Start를 쓰겠다는 경계가 되는 임계점. CWND가 ssthresh보다 **작으면 Slow Start(지수 증가)**, **넘으면 AIMD 합 증가(선형)**로 전환한다.

이유: 지수 증가를 방치하면 윈도우가 폭주해 제어가 어렵고, 혼잡이 예상되는 구간에서는 돌다리 두들기듯 선형으로 조금씩 늘리는 편이 안전하다. 혼잡이 발생하면 ssthresh를 **그 순간 CWND의 절반**으로 갱신한다. 한 번 막혔던 지점을 기억해 그 근처에선 몸을 사리는 원리다.

## 대표 정책 — Tahoe vs Reno

둘 다 Slow Start로 시작해 ssthresh를 넘으면 AIMD 합 증가로 전환한다. 차이는 **혼잡을 감지했을 때의 대응**이다.

### 혼잡 감지 신호 두 가지

- **Timeout**: 보낸 데이터나 응답 ACK가 유실되어 일정 시간 응답이 없는 경우. 심각한 혼잡 신호.
- **3 ACK Duplicated(중복 ACK 3회)**: TCP는 정상 수신한 마지막 데이터까지의 승인 번호를 보내는 **누적 승인(Cumulative ACK)** 방식이라, 같은 승인 번호를 반복해서 받으면 그 번호 이후가 유실됐다는 뜻이다. 패킷 순서가 뒤바뀔 수 있어 한두 번으로는 판정하지 않고 **3회**부터 혼잡으로 본다.

3회 중복 ACK가 오면 타임아웃을 기다리지 않고 즉시 해당 패킷을 재전송하는데, 이를 **빠른 재전송(Fast Retransmit)**이라 한다. 타임아웃을 기다리면 그만큼 재전송이 지연되므로 이를 앞당기는 기법이다.

### TCP Tahoe

Fast Retransmit을 처음 도입한 초기 정책. 혼잡 감지 시 **두 신호를 구분하지 않고** 동일하게 대응한다.

- ssthresh ← 현재 CWND / 2
- CWND ← 1 로 떨구고 Slow Start 재시작

단점: 3 중복 ACK처럼 비교적 가벼운 혼잡에도 CWND를 1까지 떨궈 원래 크기 회복이 느리다.

### TCP Reno

Tahoe 이후 정책으로, **3 ACK Duplicated와 Timeout을 구분**한다.

- **3 중복 ACK(가벼운 혼잡)**: CWND를 **절반으로만** 줄이고 ssthresh를 그 줄인 값으로 설정한 뒤 합 증가를 이어간다. CWND를 1로 떨구지 않아 원래 크기에 빠르게 복귀하므로 **빠른 회복(Fast Recovery)**이라 부른다.
- **Timeout(심각한 혼잡)**: Tahoe처럼 CWND ← 1, Slow Start 재시작(이 경우 ssthresh는 그대로 둠).

혼잡의 경중을 따져 가벼우면 덜 줄이고, 심각하면 처음부터 다시 시작한다.

| | TCP Tahoe | TCP Reno |
|---|---|---|
| 3 중복 ACK 시 | CWND → 1, Slow Start | CWND → 절반, Fast Recovery |
| Timeout 시 | CWND → 1, Slow Start | CWND → 1, Slow Start |
| 두 신호 구분 | 안 함 | 함 |
| 회복 속도 | 느림 | 가벼운 혼잡에서 빠름 |

## 그 이후 — 현대 정책

Tahoe와 Reno는 대역폭이 좁던 시절 설계라 손실 기반에 보수적이어서, 대역폭이 수백~수천 배 넓어진 현대 망에서는 비효율적이다. 손실 확률이 낮아진 만큼 최근 정책은 **얼마나 빠르게 CWND를 키우고, 얼마나 똑똑하게 혼잡을 감지할지**에 초점이 맞춰져 있다. **CUBIC**(3차 함수로 혼잡 회피 시엔 거의 안 늘리다 혼잡이 풀리면 폭발적으로 증가, 리눅스 기본값), New Reno, BBR 등이 대표적이다. 큰 틀(Slow Start로 시작, 혼잡 시 윈도우 축소)은 Tahoe/Reno의 메커니즘을 계승한다.

## 면접 체크포인트

- 혼잡 붕괴가 무엇이고 혼잡 제어가 푸는 문제, 흐름 제어와의 구분(수신 능력 vs 망 상태)
- 송신 윈도우 = min(RWND, CWND), CWND 초기값 1 MSS, MSS = MTU − 헤더
- AIMD의 합 증가/곱 감소와 공평성(평형 수렴), 톱니 그래프
- Slow Start의 지수 증가와 ssthresh를 경계로 한 AIMD 전환
- 혼잡 감지 두 신호(Timeout vs 3 중복 ACK)와 Fast Retransmit, 누적 승인
- Tahoe vs Reno: Reno가 두 신호를 구분해 가벼운 혼잡엔 Fast Recovery 하는 점
- 현대 CUBIC이 손실 기반 보수성을 넘어선 방향

## 출처
- TCP의 혼잡 제어 — 개인 블로그
- RFC 5681 (TCP Congestion Control)
- RFC 9293 (Transmission Control Protocol)

## 관련 문서
- [[TCP-Flow-Error-Control|TCP 흐름 제어와 오류 제어 (RWND, 슬라이딩 윈도우, ARQ)]]
- [[TCP-Header|TCP 헤더 구조 (Window Size, MSS 옵션)]]
- [[TCP-Handshake|TCP Handshake]]
- [[HTTP-3|HTTP/3, QUIC — TCP를 버린 이유]]
- [[Transport-Layer|전송 계층 (L4)]]
