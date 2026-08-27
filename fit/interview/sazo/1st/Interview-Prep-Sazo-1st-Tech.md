---
tags: [fit, interview, sazo, tech]
status: done
category: "Interview - Fit"
aliases: ["Sazo Interview Tech Cards", "사줘 기술 갭 카드"]
---

# 사줘 기술 갭 카드 — Kafka, ES, MSA, 스크래핑, Redis

> 1차는 핏 인터뷰라 깊은 검증은 안 오지만, "가장 임팩트" 꼬리와 "Kafka, ES 안 써봤는데?" 질문은 1차에서도 가능. 다음 기술 단계의 베이스 문서이기도 하다. vault 콘텐츠 흡수본 (원본: 브로커, OpenSearch, MSA, 외부 연동 vault 문서군).
> 공통 원칙: **갭은 ① 깔끔히 인정 → ② 같은 판단 기준의 전이 근거 → ③ 학습 방향 구체화.** 우기면 다음 단계에서 들통.

## 1. Kafka — 갭 답변

**돌파 멘트 골격**:
> EventBridge와 SQS 기반 비동기 흐름을 직접 설계하고 운영하며 후속 작업 분리, at-least-once 중복, 채널별 재시도, DLQ와 수동 복구 경로를 다뤘습니다. Kafka는 운영하지 않았으므로 같은 경험처럼 말하지 않습니다. Kafka가 필요한지는 전달 보장, 키 단위 순서, replay와 retention, 독립 consumer group, 측정된 처리량과 운영 부담으로 비교합니다.

**Kafka 검토 기준** (같은 판단 기준의 양면): 이벤트 replay와 retention, 키 단위 순서, 독립 consumer group, 측정된 지속, 피크 처리량과 현재 broker 병목, 운영 비용을 함께 본다. 거래액 성장 배수, 백프레셔나 다단계 소비만으로 Kafka를 확정할 수 없으며 사줘의 실제 이벤트 처리량과 요구사항은 면접에서 확인한다.

**개념 매핑 표 (SQS → Kafka)**

| 큐 기반 처리 | Kafka 대응 | 차이 |
|---|---|---|
| 큐 + 경쟁 소비자 | 컨슈머 그룹 + 파티션 할당 | SQS는 메시지 단위 경쟁, Kafka는 파티션 단위 — 소비자 수 > 파티션 수면 나머지 idle |
| Visibility Timeout 만료 재노출 | 오프셋 커밋 전 사망 시 재전달 | 둘 다 at-least-once 중복의 원천 → 멱등 컨슈머 동일 |
| FIFO MessageGroupId | 파티션 키 | 공통점은 키 단위 순서와 키 간 병렬성이다. SQS는 그룹 내 FIFO 전달과 소비 동시성 경계, Kafka는 키의 파티션 배치와 파티션 소비 모델이라 구현은 다름 |
| DLQ + maxReceiveCount | DLT (retry topic 직접 구현) | Kafka는 내장 아님 — 오류 분류와 백오프 설계는 동일 |
| 소비 완료 후 삭제, 미소비 메시지는 설정한 기간만 보존 (최대 14일) | 로그 보존 + offset 되감기 리플레이 | 장기 리플레이 요구가 있으면 Kafka가 유리 |
| ApproximateAgeOfOldestMessage | Consumer lag 모니터링 | 같은 백로그 기반 지연 감지 철학 |
| Outbox → 폴링 Relay | Outbox → Debezium CDC → Kafka | 처리량뿐 아니라 허용 지연, DB 부하, 순서 요구와 운영 복잡성으로 선택 |

**꼬리 핵심**:
- **순서 보장은?** → 파티션 내에서만 보장된다. 같은 엔티티, 예를 들어 주문 ID를 같은 키로 발행한다. Kafka는 기존 토픽의 파티션 수 감소를 지원하지 않는다. 파티션을 늘리면 기본 키 파티셔닝의 `hash(key) % partition_count` 매핑이 바뀌어 같은 키의 이후 메시지가 다른 파티션으로 갈 수 있고, 기존 레코드는 새 파티션으로 자동 재분배되지 않는다.
- **컨슈머 랙 모니터링?** → lag = 최신 오프셋 - 커밋 오프셋이다. 사용자 영향과 정상 구간을 기준으로 경보를 정하고, 원인은 보통 컨슈머의 레코드당 처리 시간에서 찾는다. 대응은 배치 소비, 처리 시간 단축, 파티션 증설 순으로 검토한다.
- **리밸런싱 스톰?** → Eager는 전체 해제 후 재할당이라 그룹 일시 중단. Cooperative(incremental)로 변경분만 재할당 + 파티션 과다 자체를 산정 단계에서 통제. 중단 중 재전달 중복은 멱등 컨슈머가 전제
- **exactly-once 된다던데?** → 네트워크 전달과 처리 결과를 구분한다. Kafka 트랜잭션 안에서 입력 오프셋과 출력 레코드를 함께 커밋하는 read-process-write는 exactly-once semantics를 제공할 수 있지만, 외부 DB와 API 부수효과까지 같은 원자 경계로 만들지는 않는다. 그 경계에는 at-least-once 전달, 원자적 dedup과 상태 머신 가드가 필요하다.
- **DB 변경과 발행 정합성?** → Dual Write 문제에는 비즈니스 변경과 outbox 기록을 같은 트랜잭션에 두는 Transactional Outbox를 검토한다. Kafka 기반의 낮은 지연 CDC와 변경 스트림이 실제 요구라면 Debezium을 후보로 두고, 그렇지 않으면 단순한 polling relay와 DB 부하 및 운영 복잡성을 비교한다.
- **그럼 지금도 SQS 고를 건가?** → 입력이 바뀌면 답도 바뀜. 단순 작업 큐와 짧은 보존이 핵심이면 SQS, replay와 장기 retention, 키 순서와 독립 consumer group이 필요하고 측정된 처리량에서 현재 큐가 병목이면 Kafka를 검토. 사줘의 현재 요구는 확인 전이라 단정하지 않음

## 2. Elasticsearch — 갭 안전 답변

**3단 구조**:
> ① ES를 운영 환경에서 직접 다뤄본 경험은 없습니다. ② 다만 검색이 왜 RDB에서 한계에 부딪히는지는 실무에서 체감하고 깊게 팠습니다 — LIKE 선행 와일드카드는 일반 B-Tree의 선행 접두사 탐색을 쓸 수 없습니다. 다른 조건이나 covering index에 따라 실행계획은 달라질 수 있으므로 풀 테이블 스캔으로 단정하지 않습니다. 역색인은 색인 시점에 문서를 토큰으로 쪼개 단어 → 문서 매핑을 미리 만들고, 검색 때 전체 문서 스캔 대신 해당 postings를 조회합니다. 비용은 term의 문서 빈도, postings 길이, shard와 segment 구성, 결과 수에 따라 달라집니다. B-Tree 내부 구조를 아는 상태라, 자료구조가 다를 뿐 인덱스를 쿼리 패턴에 맞춰 설계한다는 사고는 동일합니다. ③ 입사하면 기존 인덱스의 mapping과 analyzer 설정, MySQL과의 동기화 경로(CDC인지 배치인지)부터 파악하고, 검색 로그 기반으로 동의어 사전과 랭킹을 개선하는 사이클을 만들고 싶습니다.

**설명할 수 있는 것**: 역색인 구조, 샤드 설계에서의 복구 비용과 확장 제약, keyword와 text의 역할, 형태소 분석, 읽기 모델 분리와 동기화 방식의 장단점.
**톤 낮출 것 (개념만)**: 동의어 사전 운영, fuzzy와 suggest, function_score 부스팅, 다국어 analyzer(kuromoji + nori — 사줘 직격 포인트라 개념 언급은 가치 있음).

**꼬리 핵심**:
- **ES와 MySQL 데이터가 어긋나면?** → 이중 쓰기 회피가 먼저 — CDC(binlog 기반)로 커밋된 사실만 이벤트화. 어긋나면 주기적 리인덱스 또는 정합성 비교 배치. 검색은 결과적 일관성 허용, 재고와 가격과 결제는 MySQL이 진실
- **샤드 수는?** → 데이터 분포, 장애 복구 비용, 조회 패턴을 함께 평가하고 변경 비용을 사전에 검토한다.
- **검색에 품절 상품이 남아 있으면?** → near-realtime(refresh 기본 1초) + CDC 지연의 합. 구간별 측정 먼저, 즉시성 필수 필드(재고 유무)는 검색은 ES, 노출 직전 확인은 RDB 이원화

## 3. MSA — 모놀리스에서의 전환 논리

**핵심 주장**: MSA의 어려움은 쪼개는 게 아니라 **경계를 긋고 경계 간 정합성을 지키는 것**이며, 그 역량은 모놀리스 안에서도 기를 수 있다.

> 물리적으로 분리된 MSA 운영 경험은 없습니다. 다만 모놀리스 안에서도 공유 테이블 금지, 이벤트나 포트로만 통신, 내부 엔티티 노출 금지라는 규칙으로 모듈 경계를 지킬 수 있습니다. 이 규칙이 무너지면 MSA를 해도 분산 모놀리스가 되므로, 경계와 정합성의 원칙을 먼저 적용하는 것이 중요합니다.

**꼬리 핵심**:
- **서비스는 어떤 기준으로 쪼개나?** → Bounded Context(같은 단어가 다른 의미인 구간 — 상품이 카탈로그에선 판매 단위, 창고에선 재고 위치, 배송에선 운송 대상) + Aggregate 경계(함께 변하는 것만 묶고 나머지는 ID 참조) + 팀 구조. 잘못 쪼개면 동기 호출 체인 = 분산 모놀리스
- **분산 트랜잭션은?** → XA 기반 2PC를 쓰려면 참여 resource manager와 driver가 XA를 지원하고, 외부 coordinator가 준비된 트랜잭션의 복구와 최종 결정을 책임져야 한다. XA는 2PC 구현 표준 중 하나이지 2PC 자체의 정의는 아니다. prepared 상태는 락을 계속 잡고 PostgreSQL의 VACUUM도 방해하므로 짧게 유지한다. 이질 저장소가 섞이거나 사용자 흐름이 길면 Saga를 검토한다. 단순 직렬은 choreography, 복잡한 분기와 rollback은 orchestration으로 비교하고, 보상은 역연산이 아니라 별도 거래로 설계한다.
- **부분 실패는?** → 동기: 서킷브레이커, 타임아웃, 벌크헤드. 비동기: 오류 분류 먼저 — 일시(백오프 재시도) vs 영구와 poison(즉시 DLQ). 분류 없이 일괄 재시도가 최악
- **이벤트 중복 소비는?** → 자연 멱등 설계 최선(절대값 SET, UPSERT) → 멱등 키 원자 dedup → 상태 머신 가드. check-then-act 분리가 가장 흔한 버그

## 4. 스크래핑과 Puppeteer

**답변 구조 (경험 → 운영 본질 → 성장 서사 → 사줘 연결)**:
> 직접 API와 HTTP 스크래핑을 혼합해 여러 외부 배송 추적 소스를 하나의 흐름으로 통합했습니다. 소스별 어댑터로 차이를 격리하고 오류 모니터링으로 파싱 실패를 확인했지만, 당시에는 정상 응답 안의 silent failure를 소스별 성공률로 탐지하는 수준까지 닫지 못했습니다. 지금 다시 설계한다면 파싱 직후 스키마 검증, 소스별 성공률과 지속 경보를 추가하고, 실패를 일시, 차단, 구조 변경으로 나눠 재시도 정책을 달리하며 파서 버전으로 재처리 범위를 식별하겠습니다.

**정직 포인트**: HTTP 기반 외부 소스 처리의 실패 분류와 검증 원칙을 설명하되, Puppeteer 사용 경험으로 과장하지 않는다. 헤드리스 브라우저에서는 브라우저 자원 관리가 추가된다는 점을 구분해 설명한다.

**실패 분류 표 (재시도 정책 분기 — 핵심 차별화)**

| 분류 | 신호 | 대응 |
|---|---|---|
| 일시 | 타임아웃, 5xx, 네트워크 리셋, 429 | 지수 백오프 + 지터 재시도 |
| 차단 | 403, CAPTCHA, 봇 감지 페이지 | 재시도 무의미 — 속도 낮추고 알림 |
| 구조 변경 | 200인데 스키마 검증 실패, 셀렉터 0건 | **재시도 금지** (상대 부하만) → DLQ + 파서 수정 후 재처리 |

**꼬리 핵심**:
- **Puppeteer 메모리 운영?** → page는 finally에서 close하고, 브라우저 재시작과 동시 page 상한으로 자원을 제한한다. 이미지와 폰트 요청을 차단하고, 컨테이너 환경에서는 공유 메모리와 좀비 프로세스도 함께 관리한다. 대규모 운영 경험은 과장하지 않고, 자원 격리와 복구 원칙으로 답한다.
- **한 소스가 느려지면 전체가 느려지지 않나?** → 소스별 타임아웃 차등(상위 > 하위 원칙) + 소스별 큐와 워커 격리(벌크헤드) + 지속 실패 소스는 서킷 Open + 사용자에겐 마지막 성공 데이터로 Graceful Degradation. 조회형 연동은 일관성보다 내결함성
- **변경 감지는?** → 3중 — 스키마 검증(silent failure 승격), 소스별 성공률 지속 임계 알림(`for` 조건으로 단발 노이즈 필터), 골든 URL 카나리(기대값 아는 케이스 주기 검증)
- **재처리 안전성은?** → 운송장 번호와 이벤트 버전의 유니크 제약을 같은 DB 트랜잭션에서 UPSERT하고 오래된 이벤트의 역전을 막는다. 알림 같은 외부 부수효과는 별도 멱등 키와 상태 머신이 필요해 UPSERT만으로 전체 재시도가 안전해지지는 않음

## 5. Redis — 카드 8 보강 (커머스 매핑)

| 유스케이스 | 패턴 | 포인트 |
|---|---|---|
| 상품 상세, 환율 캐싱 | Cache-Aside + TTL Jitter | 인기 상품은 Hot Key가 될 수 있으므로 jitter, mutex와 백그라운드 갱신으로 스탬피드를 방어 |
| 재고(1점물) | 캐싱 위험 | 재고는 stale 즉시 사고. 차감은 GET 후 SET이나 DECR 뒤 보상으로 나누지 않는다. 재고가 0보다 클 때만 차감하는 조건부 Lua를 원자 실행하거나 DB 조건부 UPDATE와 트랜잭션을 정합성 경계로 둔다. |
| 쓰기 후 일관성 | 커밋 후 무효화와 stale window 관리 | 갱신과 삭제 모두 race가 있다. 삭제 직전 오래된 조회가 캐시를 다시 채우는 stale-fill까지 고려해 version key, double-delete, 직렬화나 더 강한 일관성 경계를 요구 수준에 맞춰 선택한다. |
| 세션, rate limit | Session Store, INCR + TTL | 멀티 인스턴스 세션 공유, 외부 몰 요청 속도 제어(Token Bucket) |

**꼬리**: Redis 죽으면? → Cache-Aside라 DB fallback으로 서비스 유지(아발란체 대비 커넥션 풀 제한). HA는 Sentinel(3대 홀수, 과반 동의), 샤딩 필요하면 Cluster(CRC16 mod 16384 슬롯). 복제는 비동기라 레플리카 read는 stale 가능.

## 6. PostgreSQL, TypeORM, Go — 우대 갭 (JD 전문 보강)

**PG + TypeORM 돌파 멘트**:
> ORM과 데이터베이스가 달라도 방법론은 DB 중립입니다 — EXPLAIN으로 실행계획을 확인하고, 카디널리티 기반 복합 인덱스와 커버링 인덱스로 랜덤 I/O를 줄입니다. PostgreSQL에서는 EXPLAIN (ANALYZE, BUFFERS), pg_stat_statements, BRIN과 GIN 인덱스, VACUUM과 bloat 관리를 추가로 확인합니다.
> TypeORM은 Active Record와 Data Mapper를 지원하고 QueryBuilder로 SQL 제어력이 높습니다. 당시 `relationJoins`가 비활성인 Prisma 설정에서 여러 관계 쿼리를 애플리케이션이 결합하던 문제를 `relationLoadStrategy`로 풀었습니다. TypeORM에서는 로딩 전략과 QueryBuilder로 다루되, 어떤 ORM이든 생성 SQL을 실행계획으로 검증하는 습관은 동일합니다.

**Go, gRPC**: 미경험 — 솔직하게. gRPC 개념(HTTP/2 멀티플렉싱, Protobuf 직렬화로 페이로드 절감, 내부 서비스 간 통신 적합)을 설명하고, 브라우저에서는 네이티브 gRPC 대신 gRPC-Web과 프록시 같은 호환 계층이 필요하다고 답한다. 포지션 메인은 NestJS이므로 Go 비중은 역질문으로 확인 ([[Interview-Prep-Sazo-1st|메인 §4-4]]).

## 관련 문서

- [[Interview-Prep-Sazo-1st|메인]], [[Interview-Prep-Sazo-Domain|도메인 브리프]]
- [[My-Tech-Cards]], [[My-Tech-Cards-Extended]] (카드 1, 2, 3, 8 원본과 심화 꼬리)

## 출처

- [Apache Kafka, Basic Kafka Operations](https://kafka.apache.org/26/operations/basic-kafka-operations/)
- [PostgreSQL, Two-Phase Transactions](https://www.postgresql.org/docs/current/two-phase.html)
- [PostgreSQL, PREPARE TRANSACTION](https://www.postgresql.org/docs/current/sql-prepare-transaction.html)
