---
tags: [reliability, distributed-systems, consensus, raft, paxos, quepaxa, failure-detection, timeout]
status: done
verified_at: 2026-11-21
category: "안정성엔지니어링(Reliability)"
aliases: ["Consensus Liveness", "합의의 진행 보장", "리더 장애와 합의 정지", "QuePaxa", "Hedging Delay", "헤징 지연"]
---

# 합의의 진행 보장: 리더 장애, 타임아웃과 헤징

합의 알고리즘은 두 성질로 평가한다. 안전성(safety)은 복제본들이 서로 다른 값을 확정하지 않는다는 성질이고, 진행(liveness)은 제안이 결국 확정된다는 성질이다. Raft와 Multi-Paxos는 네트워크가 나빠도 안전성을 지키지만, 진행은 리더가 살아 있고 메시지가 제때 도착한다는 가정에 기댄다. 확정된 쓰기를 새 리더가 잃지 않게 하는 규칙(안전성)은 [[Replication-Write-Acknowledgment|복제 쓰기 확인과 리더 장애]]에서 다루고, 이 문서는 리더가 멈추거나 느려질 때 시스템 전체가 얼마나 오래 멈추는지(진행)를 다룬다.

## 왜 리더를 두는가

Paxos에서는 어느 제안자(proposer)든 ballot 번호를 들고 수락자(acceptor) 과반에게 준비(prepare)를 요청한 뒤, 같은 번호로 수락(accept)을 요청한다. 두 제안자가 동시에 움직이면 한쪽이 상대의 두 단계 사이에 더 높은 번호를 끼워 넣어 상대를 막고, 막힌 쪽이 다시 더 높은 번호로 시도하는 일이 되풀이될 수 있다. 서로의 진행을 막는 이 현상을 파괴적 간섭(destructive interference)이라 부른다.

그래서 Raft, Multi-Paxos와 Viewstamped Replication은 제안 권한을 리더 한 곳에 모은다. 리더가 정상이고 네트워크가 안정적이면 경쟁이 없고, 준비를 미리 마친 리더는 왕복 한 번으로 확정한다. 대가는 리더가 멈추거나 느려지거나 끊기면 시스템 전체가 멈추고, 나머지 복제본이 그 사실을 알아채 새 리더를 뽑을 때까지 기다려야 한다는 점이다.

## 리더 기반 합의가 멈추는 세 지점

1. **장애 탐지는 추측이다.** 원격 프로세스가 죽었는지는 직접 관찰할 수 없고, 기대한 heartbeat가 제때 오지 않았다는 사실만 보인다. 메시지 지연에 상한이 없는 네트워크에서는 서버가 죽었는지 느린지 구별할 수 없으므로, 타임아웃이 짧으면 살아 있는 리더를 내쫓는 오탐이 늘고 길면 실제 장애에서 오래 멈춘다.
2. **선거도 경쟁이다.** 리더 장애를 감지한 여러 복제본이 동시에 후보가 되면 표가 갈려(split vote) 아무도 과반을 얻지 못할 수 있다. Raft는 선거 타임아웃을 일정 구간(논문 예시 150~300ms)에서 무작위로 골라 동시 출마를 드물게 만든다. 드물게 만들 뿐 없애지는 않으며, 선거가 끝날 때까지 쓰기는 확정되지 않는다.
3. **타임아웃은 보수적으로 잡힌다.** Raft 논문은 `broadcastTime ≪ electionTimeout ≪ MTBF`를 요구하고, 리더가 죽으면 대략 선거 타임아웃 동안 시스템을 쓸 수 없다고 설명한다. etcd는 heartbeat 간격을 구성원 사이 왕복 시간(RTT) 근처(기본 100ms)로, 선거 타임아웃을 RTT의 10배 이상(기본 1000ms)으로 권하고, 전 세계에 흩어진 클러스터에는 최대 50초까지 둘 수 있다고 안내한다(etcd v3.6 문서 기준). 오탐 선거가 쓰기를 멈추므로 타임아웃을 낮추기 어렵고, 그만큼 실제 장애의 복구가 느려진다.

세 지점은 서로를 키운다. 짧은 네트워크 장애가 리더를 죽은 것처럼 보이게 하고, 그 선거가 표 분산으로 길어지면 원인이 사라진 뒤에도 멈춤이 이어진다. 처음 원인이 없어져도 스스로 유지되는 이런 장애를 metastable failure라고 부른다(재시도가 과부하를 유지하는 같은 구조는 [[Failure-Evolution-Under-Load|부하에 따른 장애 진화]]). 반대로 느리지만 타임아웃에 걸릴 만큼 느리지는 않은 리더가 자리를 지키며, 더 빠른 복제본이 있어도 전체를 느리게 만드는 경우도 있다.

이론적 배경도 같다. 비동기 시스템에서는 프로세스 하나만 멈출 수 있어도 합의 프로토콜이 끝나지 않을 가능성을 없앨 수 없다(FLP 정리, 결정적 프로토콜 대상). 그래서 실무 알고리즘은 언젠가 메시지 지연이 한계 안에 든다는 부분 동기(partial synchrony)를 가정하거나, 무작위성을 넣어 확률 1로 끝나게 만든다.

## 리더를 선택 사항으로 두는 설계: QuePaxa

QuePaxa(SOSP 2023)는 무작위 비동기 합의를 핵심에 두고, 리더는 정상 상황의 빠른 경로로만 쓴다. 복제본 2f+1대가 정지 장애(crash-stop) f개를 견디며, 각 복제본은 제안을 밀어붙이는 제안자와 상태를 기록해 응답하는 기록자(recorder) 역할을 함께 맡는다.

- **우선순위로 협력한다.** 제안마다 무작위 우선순위를 붙이고, 제안자는 기록자 과반에게서 더 높은 우선순위의 제안을 보면 그것을 자기 제안으로 채택해 퍼뜨린다. 서로를 막는 대신 가장 높은 제안으로 수렴하므로 동시 제안자가 늘어도 파괴적 간섭이 생기지 않는다.
- **리더는 빠른 경로일 뿐이다.** 리더는 예약된 최고 우선순위로 제안하고, 첫 라운드에서 자기 제안이 다른 제안보다 먼저 기록자 과반에 닿았으면 왕복 한 번으로 확정한다. 두 과반은 반드시 기록자 하나를 공유하므로 다른 제안자는 그 제안을 만나 채택할 수밖에 없다. 빠른 경로가 실패하면 이후 라운드는 리더 없이 진행하고, 각 라운드는 1/2 이상의 확률로 확정된다.
- **타임아웃 대신 헤징 지연을 쓴다.** 타임아웃은 진행이 없음을 보고 장애를 사후에 판정해 선거 같은 복구를 시작하므로, 너무 이르면 정상 진행을 방해한다. 헤징 지연은 리더가 먼저 하도록 잠깐 기다린 뒤 다른 제안자도 함께 제안하게 하는 사전 조치이며, 0으로 둬도 안전하다. 짧게 잡으면 리더 장애에서 빨리 회복하는 대신 중복 제안으로 대역폭을 더 쓰고 빠른 경로의 성공률이 떨어진다. 같은 발상을 요청 단위에 쓴 기법이 [[Latency-Optimization#팬아웃이 키우는 꼬리 지연|hedged request]]다.

논문의 WAN 실험(복제본 5대, 평균 RTT 180ms, 초당 2만 5천 명령 부하)에서 Multi-Paxos와 Raft는 뷰 변경 타임아웃이 RTT의 약 1.8배 이상이어야 오탐 없이 처리량을 유지했고, 타임아웃이 200ms 미만이면 리더 정지 뒤 끝내 안정되지 못했다. QuePaxa는 헤징 지연과 관계없이 처리량을 유지했고 리더 정지 뒤 303~473ms 안에 다시 확정했다. 정상 상황 처리량은 LAN 초당 58만 4천, WAN 초당 25만 명령으로 Multi-Paxos와 비슷했다. 저자 측정이며 재현하지 않았다.

## 사례: 대륙을 건너는 제어 계층

Cloudflare는 내부 전역 제어 계층의 작은 상태(예: 복제 데이터베이스의 리더 지정)를 관리할 실험적 합의 서비스 Meerkat에 QuePaxa를 골랐다(2026-07 소개 글, 2026-11 선택 이유 글). 대륙을 건너는 링크는 지연이 크고 변동이 심해 장애가 서버보다 네트워크에서 오기 쉽다는 판단이다. 2020년 핵심 스위치의 부분 장애로 합의 기반 시스템이 느려져 대시보드가 6시간 동안 평소보다 80배 느렸고, 데이터 유실은 없었지만 그동안 쓰기를 받지 못했다는 자체 사례를 동기로 든다.

자체 평가에서는 결정의 95% 이상을 리더가 첫 단계에서 내렸고, 그러지 못한 순간에는 처리량이 잠시 평소의 약 1/3로 떨어졌다. 리더 장애 동안 결정 속도는 원래의 약 65%로 줄었다가 1분 뒤 리더를 교체하자 돌아왔고, 완전히 멈춘 적은 없었다고 보고한다. 구현은 논문과 달리 복제본 대신 클라이언트가 헤징 지연을 기다려 메시지 수를 줄이고, 원래의 crash-stop 모델을 재시작 복구(crash recovery)까지 넓히는 중이라 형식 검증과 장애 주입 시험을 함께 진행한다고 밝혔다. 모두 Cloudflare의 자체 보고다.

## 트레이드오프와 선택 기준

| 선택 | 얻는 것 | 잃는 것 |
|---|---|---|
| 리더 기반(Raft, Multi-Paxos) | 정상 상황의 왕복 한 번 확정, etcd 같은 성숙한 구현과 운영 경험 | 리더 장애와 오탐 선거 동안 쓰기 정지, 타임아웃 튜닝 부담 |
| 리더 선택형 비동기(QuePaxa) | 장애 탐지 없이 진행, 짧은 헤징 지연으로 빠른 회복, 리더 교체의 부담 감소 | 동시 제안의 대역폭, 빠른 경로 실패 시 여러 번의 왕복, 적은 운영 실적과 구현 검증 부담 |

- 한 리전 안의 안정된 네트워크에서 리더 장애 복구 시간(대략 타임아웃 + RTT)을 감당할 수 있으면 리더 기반이 단순하다. 타임아웃은 측정한 RTT 분포로 정하고, 오탐 선거 횟수와 리더 교체 시간을 지표로 남긴다.
- 지연 변동이 큰 광역망, 리더를 겨냥한 서비스 거부 공격이나 느린 리더가 문제라면 리더 없이도 진행하는 프로토콜을 검토한다. 이때 안전성 증명과 실제 구현의 일치, 재시작 복구 지원 여부를 따로 확인한다.
- Raft, Multi-Paxos와 QuePaxa는 모두 과반 quorum을 쓰므로 과반이 서로 통신할 때만 진행하고, 과반을 잃는 분할에서는 쓰기를 확정하지 못한다([[CAP-Theorem|CAP 정리]]). quorum은 단계 사이에서만 겹치면 된다는 Flexible Paxos처럼 과반이 아닌 quorum을 쓰는 변형은 진행 조건이 다르므로 따로 따진다.

## 면접 체크포인트

- 합의의 안전성과 진행을 구분하고, 리더 기반 합의가 진행을 위해 타임아웃에 기대는 이유를 말한다.
- 파괴적 간섭이 무엇이고 리더가 그것을 어떻게 피하며, 선거에서 어떻게 다시 나타나는지 설명한다.
- 비동기 네트워크에서 장애 탐지가 추측일 수밖에 없는 이유와 타임아웃 길이의 양쪽 비용을 말한다.
- Raft의 무작위 선거 타임아웃과 `broadcastTime ≪ electionTimeout ≪ MTBF`의 의미를 설명한다.
- 타임아웃(사후 판정과 복구)과 헤징 지연(사전 병행 시도)의 차이를 설명한다.
- FLP 정리, 부분 동기 가정과 무작위 합의의 관계를 말한다.

## 출처

- [QuePaxa: Escaping the Tyranny of Timeouts in Consensus — SOSP 2023, Pasindu Tennage, Cristina Băsescu 외](https://bford.info/pub/os/quepaxa/quepaxa.pdf) — 2026-11-21 본문 대조. DOI 10.1145/3600006.3613150
- [Choosing QuePaxa, an unusual consensus algorithm — Cloudflare Blog, João Pedro Leite, Bob Halley, James Larisch](https://blog.cloudflare.com/choosing-quepaxa/) — 2026-11-11 게시, 2026-11-21 대조
- [Introducing Meerkat: an experiment in global consensus — Cloudflare Blog](https://blog.cloudflare.com/meerkat-introduction/) — 2026-07-08 게시, 2026-11-21 대조
- [In Search of an Understandable Consensus Algorithm (Extended Version) — Diego Ongaro, John Ousterhout](https://raft.github.io/raft.pdf)
- [Impossibility of Distributed Consensus with One Faulty Process — Journal of the ACM 1985, Michael J. Fischer, Nancy A. Lynch, Michael S. Paterson](https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf)
- [Flexible Paxos: Quorum intersection revisited — arXiv, Heidi Howard, Dahlia Malkhi, Alexander Spiegelman](https://arxiv.org/abs/1608.06696) — 2026-11-21 초록 대조. 과반 quorum이 필수가 아니고 단계 사이 교차만 필요하다는 결과
- [etcd v3.6 Documentation, Tuning](https://etcd.io/docs/v3.6/tuning/)
- [Cloudflare가 Raft 대신 QuePaxa를 선택한 이유 — GeekNews](https://news.hada.io/topic?id=37555) — 학습 계기

## 관련 문서

- [[Replication-Write-Acknowledgment|복제 쓰기 확인과 리더 장애 (Raft의 안전성 규칙)]]
- [[CAP-Theorem|CAP 정리]]
- [[Distributed-System-Basics|분산 시스템 기초]]
- [[Failure-Evolution-Under-Load|부하에 따른 장애 진화]]
- [[Latency-Optimization|레이턴시 최적화 (hedged request)]]
- [[Cell-Based-Failure-Isolation|셀 기반 장애 격리 (제어 계층 장애 분리)]]
- [[Distributed-SQLite|분산 SQLite (rqlite의 Raft)]]
