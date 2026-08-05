---
tags: [architecture, distributed-systems, cap, consistency]
status: done
category: "Architecture - 원칙"
aliases: ["CAP Theorem", "CAP 정리"]
verified_at: 2026-08-05
---

# CAP 정리 (CAP Theorem)

분산 시스템은 **Consistency(일관성)**, **Availability(가용성)**, **Partition Tolerance(분할 내성)** 중 **최대 2개만 동시에 만족** 가능하다는 이론. Eric Brewer가 2000년 제안, 2002년 Gilbert, Lynch가 수학적 증명.

실무 해석은 "셋 중 둘 선택"이 아니라 **"네트워크 분할은 피할 수 없으니 C와 A 사이에서 선택"**.

## 세 속성 정의

### Consistency (일관성)
모든 클라이언트가 어느 노드에 접속해도 **같은 데이터**를 본다. 쓰기가 완료되는 순간 모든 노드가 최신 값을 반영.

주의: CAP의 C는 **Linearizability(선형성)**에 가까움. ACID의 C(제약 조건)와 다른 개념.

### Availability (가용성)
**살아 있는 모든 노드는 요청에 응답해야 한다**. "데이터가 최신인지"는 보장하지 않고, 응답이 오는 것만 보장.

### Partition Tolerance (분할 내성)
노드 간 네트워크가 끊어져도 시스템이 **계속 동작**. 네트워크 분할 = 메시지 유실, 지연, 노드 간 통신 불가.

## 왜 "둘만" 선택 가능한가

시나리오: 두 노드 A, B가 서로 네트워크가 끊김(P 발생).

클라이언트가 A에게 쓰기 요청 → A가 B와 동기화 불가 상황에서:

- **C 우선**: A가 응답 거부 (B와 동기화 확실하지 않으니까). **가용성 포기**
- **A 우선**: A가 일단 응답 (B와 불일치 가능). **일관성 포기**

동시 만족 불가 → 하나를 포기해야 함.

## CP vs AP vs CA

### CP 시스템 (Consistency + Partition Tolerance)
일관성 보장. 분할 시 가용성 희생.
- **예시**: HBase, ZooKeeper, etcd, MongoDB(과반 writeConcern 기준, 아래 설정 의존성 참고)
- **용도**: 금융 거래, 재고 관리, 분산 락

**Redis Cluster는 CP 예시로 쓰지 않는다.** 공식 cluster spec은 노드 간 비동기 복제와 last failover wins 병합을 쓴다고 명시하고, 분할 중 쓰기를 잃을 수 있는 구간이 항상 존재하며 클라이언트가 확인(acknowledge)받은 쓰기도 작은 윈도우에서 유실될 수 있다고 밝힌다. 반대로 소수 파티션은 `NODE_TIMEOUT`이 지나면 쓰기를 거부하므로 가용성도 내려놓는다. spec 스스로 설계 목표를 약하지만 합리적인 수준의 데이터 안전성과 가용성이라고 표현하는 만큼, 분할 시 강한 일관성을 보장하는 CP로 분류하면 틀린다. 복제 확인이 필요하면 `WAIT`로 명시해야 한다.

**MongoDB의 위치는 설정에 따라 움직인다.** 공식 문서 기준 현행 기본 writeConcern은 `{ w: "majority" }`이지만, arbiter가 있고 데이터 보유 투표 멤버 수가 투표 노드 과반 이하인 배포(P-S-A 등)에서는 기본값이 `{ w: 1 }`로 내려간다. 소수 파티션에 갇힌 프라이머리는 과반 투표 노드를 볼 수 없음을 감지하면 스스로 세컨더리로 강등돼 쓰기를 받지 않는데, 기본값이 과반인 구성에서는 이 조합이 분할 시 일관성을 택하는 CP 쪽이다. 반면 `w: 1`은 프라이머리가 강등되면 롤백될 수 있는 쓰기를 허용하고, readConcern 수준과 무관하게 노드의 최신 데이터가 시스템 전체의 최신 버전이 아닐 수 있다고 문서가 밝힌다. 단일 문서에 대한 선형성이 필요하면 `readConcern: linearizable`과 `writeConcern: majority`를 함께 써야 하고 이는 프라이머리 읽기에만 적용된다. 즉 CAP나 PACELC 분류는 제품 이름이 아니라 설정 조합에 붙는다.

### AP 시스템 (Availability + Partition Tolerance)
가용성 보장. 최종적 일관성(Eventual Consistency)으로 수렴.
- **예시**: Cassandra, DynamoDB, CouchDB
- **용도**: 소셜 피드, 상품 카탈로그, 로그 수집

### CA 시스템
**현실에선 불가능**. 네트워크 분할은 피할 수 없어서 P를 포기하는 건 "단일 노드 시스템이 된다"는 뜻.
- 단일 DB (RDBMS)는 CA지만 분산 아님
- 분산 시스템에선 P가 필수 → CP 또는 AP 중 선택

## PACELC 정리 (확장)

CAP의 약점: "분할이 없을 때"의 트레이드오프를 설명 못 함. PACELC로 보강:

**If Partition, then A or C; Else (no partition), L (Latency) or C (Consistency)**

- **PA/EL**: 분할 시 가용성, 평시에도 지연 최소화 (Cassandra, DynamoDB)
- **PC/EC**: 분할 시 일관성, 평시에도 일관성 (BigTable, HBase)
- **PA/EC**: 분할 시 가용성, 평시엔 일관성
- **PC/EL**: 이론적으로 가능하지만 드묾

writeConcern, readConcern처럼 요청 단위로 일관성 강도를 바꾸는 제품은 한 칸에 고정되지 않는다. MongoDB가 그 경우다 (위 CP 시스템 절 참고).

실무에선 PACELC가 더 유용. "우리 시스템은 평소엔 뭘 우선하나"까지 명시 가능.

## 흔한 오해

### "CAP는 셋 중 아무거나 둘 선택"
아님. P는 현실에서 피할 수 없으므로 **CP vs AP 선택**이 맞는 표현.

### "Eventually Consistent = Consistency 없음"
아님. 최종적으로는 수렴. 단지 **그 순간**은 노드 간 다를 수 있을 뿐.

최종 일관성은 잠시 달라도 된다는 선언만으로 완성되지 않는다. 복제와 재시도를 통해 변경을 전파하고, 동시 변경이 충돌했을 때 어떤 값을 채택할지 정하며, 허용 가능한 불일치 시간과 수렴 실패를 관측해야 한다. 즉 일시적 불일치와 함께 **수렴 전략**을 계약해야 한다.

### "ACID vs BASE는 CAP와 같은 축"
겹치지만 다름. ACID(전통 RDB)는 CP 성향, BASE(NoSQL)는 AP 성향이라는 경향이 있을 뿐.

### "CAP는 분산 DB에만 해당"
마이크로서비스 간 통신에도 같은 논리. "다른 서비스에 요청했는데 응답이 안 오면 일관성 vs 가용성 중 뭘 고를까"가 본질적으로 같은 질문.

## 실무 선택 가이드

**CP 선택**:
- 결제, 재고, 예약 (불일치하면 금전 손실)
- 분산 락, 리더 선출 (여러 리더가 생기면 안 됨)
- 사용자가 "처리 실패" 응답을 받아도 괜찮은 경우

**AP 선택**:
- 소셜 피드, 좋아요 수 (약간의 지연은 용인)
- 상품 카탈로그 (stale 조회 허용)
- 모니터링 데이터, 로그 수집 (안 쌓이는 게 쌓이는 것보다 나쁨)

**경계 넘나드는 패턴**:
- **Strong Read + Eventual Write**: 읽기는 일관성, 쓰기는 가용성
- **Read Your Own Writes**: 본인 쓰기는 바로 보여주되, 남 것은 최종 일관성
- **Session Consistency**: 한 세션 내 일관성만 보장

## 면접 체크포인트

- CAP의 세 속성 각각의 엄밀한 정의
- "분산 시스템에 CA는 없다"는 주장의 의미 (P는 피할 수 없으니)
- MongoDB의 CAP 위치가 writeConcern, readConcern에 따라 달라지는 이유와 Cassandra가 AP인 이유
- PACELC가 CAP를 어떻게 보강하는가
- 마이크로서비스 간 통신에도 CAP가 적용되는 이유
- Eventually Consistent의 정확한 의미

## 출처
- [Gilbert, Lynch — Brewer's conjecture and the feasibility of consistent, available, partition-tolerant web services, ACM SIGACT News 33(2), 2002, pp.51-59](https://dl.acm.org/doi/10.1145/564585.564601)
- [Eric Brewer — CAP Twelve Years Later: How the Rules Have Changed, IEEE Computer, 2012 (InfoQ 전재)](https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/)
- [Daniel Abadi — Consistency Tradeoffs in Modern Distributed Database System Design, IEEE Computer 45(2), 2012 (PACELC)](http://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf)
- [Daniel Abadi — Problems with CAP, and Yahoo's little known NoSQL system (PACELC 원안)](http://dbmsmusings.blogspot.com/2010/04/problems-with-cap-and-yahoos-little.html)
- [Redis cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
- [MongoDB Manual — Write Concern](https://www.mongodb.com/docs/manual/reference/write-concern/)
- [MongoDB Manual — Read Concern linearizable](https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/)
- [MongoDB Manual — Read Concern majority](https://www.mongodb.com/docs/manual/reference/read-concern-majority/)
- [MongoDB Manual — Replica Set Elections](https://www.mongodb.com/docs/manual/core/replica-set-elections/)

## 관련 문서
- [[Monolith-vs-Microservice|Monolith vs Microservice]]
- [[Isolation-Level-Beyond-ANSI|ANSI 격리 수준의 한계, Strict Serializable]]
- [[Replication|Replication]]
- [[Sharding|Sharding]]
