---
tags: [architecture, distributed-systems, cap, consistency]
status: done
category: "Architecture - 원칙"
aliases: ["CAP Theorem", "CAP 정리"]
---

# CAP 정리 (CAP Theorem)

분산 시스템은 **Consistency(일관성)**, **Availability(가용성)**, **Partition Tolerance(분할 내성)** 중 **최대 2개만 동시에 만족** 가능하다는 이론. Eric Brewer가 2000년 제안, 2002년 Gilbert·Lynch가 수학적 증명.

실무 해석은 "셋 중 둘 선택"이 아니라 **"네트워크 분할은 피할 수 없으니 C와 A 사이에서 선택"**.

## 세 속성 정의

### Consistency (일관성)
모든 클라이언트가 어느 노드에 접속해도 **같은 데이터**를 본다. 쓰기가 완료되는 순간 모든 노드가 최신 값을 반영.

주의: CAP의 C는 **Linearizability(선형성)**에 가까움. ACID의 C(제약 조건)와 다른 개념.

### Availability (가용성)
**살아 있는 모든 노드는 요청에 응답해야 한다**. "데이터가 최신인지"는 보장하지 않고, 응답이 오는 것만 보장.

### Partition Tolerance (분할 내성)
노드 간 네트워크가 끊어져도 시스템이 **계속 동작**. 네트워크 분할 = 메시지 유실·지연·노드 간 통신 불가.

## 왜 "둘만" 선택 가능한가

시나리오: 두 노드 A, B가 서로 네트워크가 끊김(P 발생).

클라이언트가 A에게 쓰기 요청 → A가 B와 동기화 불가 상황에서:

- **C 우선**: A가 응답 거부 (B와 동기화 확실하지 않으니까). **가용성 포기**
- **A 우선**: A가 일단 응답 (B와 불일치 가능). **일관성 포기**

동시 만족 불가 → 하나를 포기해야 함.

## CP vs AP vs CA

### CP 시스템 (Consistency + Partition Tolerance)
일관성 보장. 분할 시 가용성 희생.
- **예시**: MongoDB(기본 설정), HBase, Redis(Cluster), ZooKeeper, etcd
- **용도**: 금융 거래, 재고 관리, 분산 락

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
- **PA/EC**: 분할 시 가용성, 평시엔 일관성 (MongoDB with strong read)
- **PC/EL**: 이론적으로 가능하지만 드묾

실무에선 PACELC가 더 유용. "우리 시스템은 평소엔 뭘 우선하나"까지 명시 가능.

## 흔한 오해

### "CAP는 셋 중 아무거나 둘 선택"
아님. P는 현실에서 피할 수 없으므로 **CP vs AP 선택**이 맞는 표현.

### "Eventually Consistent = Consistency 없음"
아님. 최종적으로는 수렴. 단지 **그 순간**은 노드 간 다를 수 있을 뿐.

### "ACID vs BASE는 CAP와 같은 축"
겹치지만 다름. ACID(전통 RDB)는 CP 성향, BASE(NoSQL)는 AP 성향이라는 경향이 있을 뿐.

### "CAP는 분산 DB에만 해당"
마이크로서비스 간 통신에도 같은 논리. "다른 서비스에 요청했는데 응답이 안 오면 일관성 vs 가용성 중 뭘 고를까"가 본질적으로 같은 질문.

## 실무 선택 가이드

**CP 선택**:
- 결제·재고·예약 (불일치하면 금전 손실)
- 분산 락·리더 선출 (여러 리더가 생기면 안 됨)
- 사용자가 "처리 실패" 응답을 받아도 괜찮은 경우

**AP 선택**:
- 소셜 피드·좋아요 수 (약간의 지연은 용인)
- 상품 카탈로그 (stale 조회 허용)
- 모니터링 데이터·로그 수집 (안 쌓이는 게 쌓이는 것보다 나쁨)

**경계 넘나드는 패턴**:
- **Strong Read + Eventual Write**: 읽기는 일관성, 쓰기는 가용성
- **Read Your Own Writes**: 본인 쓰기는 바로 보여주되, 남 것은 최종 일관성
- **Session Consistency**: 한 세션 내 일관성만 보장

## 면접 체크포인트

- CAP의 세 속성 각각의 엄밀한 정의
- "분산 시스템에 CA는 없다"는 주장의 의미 (P는 피할 수 없으니)
- MongoDB가 CP, Cassandra가 AP인 이유
- PACELC가 CAP를 어떻게 보강하는가
- 마이크로서비스 간 통신에도 CAP가 적용되는 이유
- Eventually Consistent의 정확한 의미

## 출처
- [매일메일 — CAP 정리](https://www.maeil-mail.kr/question/138)

## 관련 문서
- [[Monolith-vs-Microservice|Monolith vs Microservice]]
- [[Isolation-Level-Beyond-ANSI|ANSI 격리 수준의 한계 · Strict Serializable]]
- [[Replication|Replication]]
- [[Sharding|Sharding]]
