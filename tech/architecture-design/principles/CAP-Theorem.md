---
tags: [architecture, distributed-systems, cap, consistency]
status: done
category: "Architecture - 원칙"
aliases: ["CAP Theorem", "CAP 정리"]
verified_at: 2026-09-04
---

# CAP 정리 (CAP Theorem)

CAP 정리는 네트워크 분할로 메시지가 유실될 수 있는 실행에서 **Linearizability(선형화 가능성)**와 **Availability(가용성)**를 동시에 보장할 수 없다는 결과다. Eric Brewer가 2000년 제안했고, 2002년 Gilbert와 Lynch가 비동기 네트워크 모델에서 증명했다. 흔히 쓰는 셋 중 둘이라는 표현은 기억을 돕는 요약이지, 세 속성을 평상시에 임의로 고르는 설계 규칙은 아니다.

실무 해석은 "셋 중 둘 선택"이 아니라 **"네트워크 분할이 발생한 동안 C와 A를 동시에 보장할 수 없다"**에 가깝다.

## 세 속성 정의

### Consistency (일관성)
각 연산이 호출과 응답 사이의 한 시점에 원자적으로 일어난 것처럼 보이고, 그 단일 순서가 실제 시간 순서를 보존한다. 완료된 쓰기 뒤에 시작한 읽기는 그보다 오래된 값을 반환하면 안 된다. 모든 복제본이 물리적으로 같은 순간 갱신돼야 한다는 뜻은 아니다.

주의: CAP의 C는 **Linearizability(선형화 가능성)**다. ACID의 C(제약 조건 준수)와 다른 개념이다.

### Availability (가용성)
장애가 나지 않은 노드가 받은 요청은 **유한한 시간 안에 완료 응답을 반환**해야 한다. CAP의 가용성만으로 응답 데이터의 최신성은 보장하지 않는다.

### Partition Tolerance (분할 내성)
노드 사이 메시지가 임의로 유실되거나 지연되는 실행도 모델에 포함한다. P는 독립적으로 켜고 끄는 기능이라기보다, 분할이 생겨도 선택한 일관성 또는 가용성 계약을 어디까지 지킬지 묻는 환경 조건이다.

## 왜 "둘만" 선택 가능한가

시나리오: 두 노드 A, B가 서로 네트워크가 끊김(P 발생).

클라이언트가 A에게 쓰기 요청 → A가 B와 동기화 불가 상황에서:

- **C 우선**: 리더나 과반을 확인한 파티션만 쓰기를 받고 다른 쪽은 거부한다. 적어도 일부 요청의 **가용성을 포기**한다
- **A 우선**: 양쪽 파티션이 요청을 계속 받으면 서로 다른 쓰기를 수락할 수 있어 **선형화 가능성을 포기**한다

동시 만족 불가 → 하나를 포기해야 함.

## CP vs AP vs CA

### CP 시스템 (Consistency + Partition Tolerance)
일관성 보장. 분할 시 가용성 희생.
- **예시**: HBase, ZooKeeper, etcd, MongoDB(과반 writeConcern 기준, 아래 설정 의존성 참고)
- **용도**: 금융 거래, 재고 관리, 분산 락

**Redis Cluster는 CP 예시로 쓰지 않는다.** 공식 cluster spec은 노드 간 비동기 복제와 last failover wins 병합을 쓴다고 명시하고, 분할 중 쓰기를 잃을 수 있는 구간이 항상 존재하며 클라이언트가 확인(acknowledge)받은 쓰기도 작은 윈도우에서 유실될 수 있다고 밝힌다. 반대로 소수 파티션은 `NODE_TIMEOUT`이 지나면 쓰기를 거부하므로 가용성도 내려놓는다. spec 스스로 설계 목표를 약하지만 합리적인 수준의 데이터 안전성과 가용성이라고 표현하는 만큼, 분할 시 강한 일관성을 보장하는 CP로 분류하면 틀린다. 복제 확인이 필요하면 `WAIT`로 명시해야 한다.

**MongoDB의 위치는 설정에 따라 움직인다.** 공식 문서 기준 현행 기본 writeConcern은 `{ w: "majority" }`이지만, arbiter가 있고 데이터 보유 투표 멤버 수가 투표 노드 과반 이하인 배포(P-S-A 등)에서는 기본값이 `{ w: 1 }`로 내려간다. 소수 파티션에 갇힌 프라이머리는 과반 투표 노드를 볼 수 없음을 감지하면 스스로 세컨더리로 강등돼 쓰기를 받지 않는데, 기본값이 과반인 구성에서는 이 조합이 분할 시 일관성을 택하는 CP 쪽이다. 반면 `w: 1`은 프라이머리가 강등되면 롤백될 수 있는 쓰기를 허용하고, readConcern 수준과 무관하게 노드의 최신 데이터가 시스템 전체의 최신 버전이 아닐 수 있다고 문서가 밝힌다. 단일 문서에 대한 선형성이 필요하면 `readConcern: linearizable`과 `writeConcern: majority`를 함께 써야 하고 이는 프라이머리 읽기에만 적용된다. 즉 CAP나 PACELC 분류는 제품 이름이 아니라 설정 조합에 붙는다.

### AP 시스템 (Availability + Partition Tolerance)
분할 중에도 요청을 완료하는 가용성을 택하고 선형화 가능성을 포기한다. CAP 자체는 분할 해소 뒤의 수렴을 보장하지 않으며, 최종 일관성에는 별도의 복제와 충돌 해결 계약이 필요하다.
- **가용성 우선 구성 예**: Cassandra, DynamoDB, CouchDB. 실제 분류는 읽기, 쓰기 설정과 연산에 따라 달라짐
- **용도**: 소셜 피드, 상품 카탈로그, 로그 수집

### CA 시스템
분할이 발생하지 않은 실행에서는 일관성과 가용성을 함께 제공할 수 있다. 단일 노드는 노드 간 분할이 없으므로 이 범주를 설명하는 예로 쓸 수 있지만, 분산 시스템이 영구히 분할되지 않는다고 보장할 수 있다는 뜻은 아니다.
- 단일 DB는 노드 간 네트워크 분할 문제가 없는 단순한 예다
- 분산 시스템은 분할이 발생한 동안 어떤 요청에서 일관성 또는 가용성을 제한할지 정해야 한다

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
정확하지 않다. 평상시 제품 전체를 CP나 AP 한 칸에 고정하는 문제가 아니라, **분할이 발생한 실행과 요청에서 C와 A 중 무엇을 제한할지**의 문제다. 같은 제품도 설정과 연산별로 선택이 달라질 수 있다.

### "Eventually Consistent = Consistency 없음"
아님. 최종적으로는 수렴. 단지 **그 순간**은 노드 간 다를 수 있을 뿐.

최종 일관성은 잠시 달라도 된다는 선언만으로 완성되지 않는다. 복제와 재시도를 통해 변경을 전파하고, 동시 변경이 충돌했을 때 어떤 값을 채택할지 정하며, 허용 가능한 불일치 시간과 수렴 실패를 관측해야 한다. 즉 일시적 불일치와 함께 **수렴 전략**을 계약해야 한다.

### "ACID vs BASE는 CAP와 같은 축"
다른 축이다. ACID는 트랜잭션의 성질이고 CAP는 네트워크 분할 중 선형화 가능성과 가용성의 관계다. RDBMS나 NoSQL이라는 제품 분류만으로 CP/AP를 정할 수 없다.

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
- 분할이 없는 실행에서는 C와 A가 양립하지만, 분할 중에는 둘을 동시에 보장할 수 없는 이유
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
