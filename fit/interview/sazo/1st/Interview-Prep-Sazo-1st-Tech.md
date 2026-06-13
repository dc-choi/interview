---
tags: [fit, interview, sazo, tech]
status: active
category: "Interview - Fit"
aliases: ["Sazo Interview Tech Cards", "사줘 기술 갭 카드"]
---

# 사줘 기술 갭 카드 — Kafka, ES, MSA, 스크래핑, Redis

> 1차는 핏 인터뷰라 깊은 검증은 안 오지만, "가장 임팩트" 꼬리와 "Kafka, ES 안 써봤는데?" 질문은 1차에서도 가능. 다음 기술 단계의 베이스 문서이기도 하다. vault 콘텐츠 흡수본 (원본: 브로커, OpenSearch, MSA, 외부 연동 vault 문서군).
> 공통 원칙: **갭은 ① 깔끔히 인정 → ② 같은 판단 기준의 전이 근거 → ③ 학습 방향 구체화.** 우기면 다음 단계에서 들통.

## 1. Kafka — SQS 경험자의 정면 돌파

**돌파 멘트 골격**:
> Kafka 클러스터 운영 경험은 없습니다. 다만 발주 자동화 때 MSK 약 574달러/월 vs EventBridge+SQS 0~18달러/월을 비교하며, Kafka가 주는 것 — 리플레이, 파티션 순서 보장, 다중 컨슈머 그룹 독립 소비 — 과 비용을 정확히 알았기에 그 규모에선 안 쓴 것입니다. at-least-once 중복, 멱등 컨슈머, DLQ 오류 분류, 키 단위 순서 설계는 SQS 위에서 이미 운영했고, visibility timeout이 오프셋 커밋으로, MessageGroupId가 파티션 키로 바뀌는 차이라 학습 곡선은 개념이 아니라 운영 도구 숙련이라고 봅니다.

**Kafka가 맞는 시점 4조건** (같은 판단 기준의 양면): ① 이벤트 리플레이 ② 파티션 내 순서 보장 필수 ③ 초당 수만 건 이상 ④ 다중 그룹 독립 소비. "당시 제 도메인은 넷 다 해당 없었고, 사줘 규모(거래액 189배 성장, 스크래핑 백프레셔, 주문 파이프라인 다단계 소비)는 해당하니 Kafka가 맞는 선택입니다."

**개념 매핑 표 (SQS → Kafka)**

| 내가 쓰던 것 | Kafka 대응 | 차이 |
|---|---|---|
| 큐 + 경쟁 소비자 | 컨슈머 그룹 + 파티션 할당 | SQS는 메시지 단위 경쟁, Kafka는 파티션 단위 — 소비자 수 > 파티션 수면 나머지 idle |
| Visibility Timeout 만료 재노출 | 오프셋 커밋 전 사망 시 재전달 | 둘 다 at-least-once 중복의 원천 → 멱등 컨슈머 동일 |
| FIFO MessageGroupId | 파티션 키 | 구조 동일 — 그룹(키) 내 순서, 그룹 간 병렬 |
| DLQ + maxReceiveCount | DLT (retry topic 직접 구현) | Kafka는 내장 아님 — 오류 분류와 백오프 설계는 동일 |
| 메시지 삭제 (보존 14일) | 로그 보존 + offset 되감기 리플레이 | Kafka의 본질적 우위 |
| ApproximateAgeOfOldestMessage | Consumer lag 모니터링 | 같은 백로그 기반 지연 감지 철학 |
| Outbox → 폴링 Relay | Outbox → Debezium CDC → Kafka | 폴링은 월 수십만 건 이하, 대규모는 CDC |

**꼬리 핵심**:
- **순서 보장은?** → 파티션 내에서만. 같은 엔티티(주문 ID)를 같은 키로 발행. 전역 순서는 파티션 1개 = 병렬성 0. 파티션을 줄이면 키 재분배로 순서가 깨져서 초기 산정이 중요
- **컨슈머 랙 모니터링?** → lag = 최신 오프셋 - 커밋 오프셋. lag 1분 초과 5분 지속 시 알림, DLT > 0 즉시. 랙의 진짜 원인은 보통 컨슈머의 레코드당 처리 시간 — 대응은 배치 소비, 처리 시간 단축, 파티션 증설 순
- **리밸런싱 스톰?** → Eager는 전체 해제 후 재할당이라 그룹 일시 중단. Cooperative(incremental)로 변경분만 재할당 + 파티션 과다 자체를 산정 단계에서 통제. 중단 중 재전달 중복은 멱등 컨슈머가 전제
- **exactly-once 된다던데?** → 전달의 exactly-once는 분산에서 불가능(Two Generals). 실무는 effectively-once = at-least-once + 멱등 처리. Kafka EOS는 내부 read-process-write 한정, 외부 DB와 API는 컨슈머가 원자적 dedup(INSERT ON CONFLICT, Redis SET NX)과 상태 머신 가드로. 본인은 발주 컨슈머에서 orderId 유니크 제약 + 외부 API Idempotency-Key 이중 방어로 구현
- **DB 변경과 발행 정합성?** → Dual Write 문제 → Transactional Outbox (비즈니스 INSERT + outbox INSERT 한 트랜잭션). Kafka 조직이면 Debezium CDC가 정석
- **그럼 지금도 SQS 고를 건가?** → 기준이 같으니 입력이 바뀌면 답이 바뀜. 사줘 규모면 Kafka가 정답이고, 그 환경에서 운영해보고 싶어 지원했다

## 2. Elasticsearch — 갭 안전 답변

**3단 구조**:
> ① ES를 운영 환경에서 직접 다뤄본 경험은 없습니다. ② 다만 검색이 왜 RDB에서 한계에 부딪히는지는 실무에서 체감하고 깊게 팠습니다 — LIKE 선행 와일드카드는 B-Tree가 정렬 기반이라 인덱스를 못 타고 풀스캔으로 빠지고, 그게 역색인이 필요한 이유입니다. 역색인은 색인 시점에 문서를 토큰으로 쪼개 단어 → 문서 매핑을 미리 만들어 검색 비용이 문서 수와 무관합니다. B-Tree 내부 구조를 아는 상태라, 자료구조가 다를 뿐 인덱스를 쿼리 패턴에 맞춰 설계한다는 사고는 동일합니다. ③ 입사하면 기존 인덱스의 mapping과 analyzer 설정, MySQL과의 동기화 경로(CDC인지 배치인지)부터 파악하고, 검색 로그 기반으로 동의어 사전과 랭킹을 개선하는 사이클을 만들고 싶습니다.

**자신 있게 말해도 되는 것 (vault 근거 있음)**: 역색인 구조, 샤드당 10~50GB 경험칙과 사후 증설 어려움, keyword vs text, Nori 형태소 분석, CQRS(쓰기 MySQL = Source of Truth, 읽기 ES = 비정규화 Read Model), CDC 동기화(이중 쓰기 문제), 컬리 사례(LIKE 17초 → OpenSearch 200ms).
**톤 낮출 것 (개념만)**: 동의어 사전 운영, fuzzy와 suggest, function_score 부스팅, 다국어 analyzer(kuromoji + nori — 사줘 직격 포인트라 개념 언급은 가치 있음).

**꼬리 핵심**:
- **ES와 MySQL 데이터가 어긋나면?** → 이중 쓰기 회피가 먼저 — CDC(binlog 기반)로 커밋된 사실만 이벤트화. 어긋나면 주기적 리인덱스 또는 정합성 비교 배치. 검색은 결과적 일관성 허용, 재고와 가격과 결제는 MySQL이 진실
- **샤드 수는?** → 10~50GB/샤드. 작으면 scatter-gather 오버헤드, 크면 복구 비용. 생성 후 증설 어려워 데이터 증가 추정 선행
- **검색에 품절 상품이 남아 있으면?** → near-realtime(refresh 기본 1초) + CDC 지연의 합. 구간별 측정 먼저, 즉시성 필수 필드(재고 유무)는 검색은 ES, 노출 직전 확인은 RDB 이원화

## 3. MSA — 모놀리스 경험자의 전환 논리

**핵심 주장**: MSA의 어려움은 쪼개는 게 아니라 **경계를 긋고 경계 간 정합성을 지키는 것**이고, 그 근육은 모놀리스 안에서 단련했다.

> 물리적으로 분리된 MSA 운영 경험은 없습니다. 다만 모놀리스 안에서 컨텍스트 간 통신 규칙 — 공유 테이블 금지, 이벤트나 포트로만 통신, 내부 엔티티 노출 금지 — 을 지키며 클린 아키텍처 5계층과 모듈 경계를 설계했고, 발주 도메인은 EventBridge와 SQS로 이벤트 분리까지 했습니다. 이 규칙이 무너지면 MSA를 해도 분산 모놀리스가 되는 거라, 반대로 모놀리스에서 이 규칙을 지켜본 사람은 물리 분리로 가는 마지막 한 걸음만 남았다고 생각합니다.

**꼬리 핵심**:
- **서비스는 어떤 기준으로 쪼개나?** → Bounded Context(같은 단어가 다른 의미인 구간 — 상품이 카탈로그에선 판매 단위, 창고에선 재고 위치, 배송에선 운송 대상) + Aggregate 경계(함께 변하는 것만 묶고 나머지는 ID 참조) + 팀 구조. 잘못 쪼개면 동기 호출 체인 = 분산 모놀리스
- **분산 트랜잭션은?** → 2PC는 가용성과 자율성 깨서 안 씀. Saga — 단순 직렬은 코레오그래피, 복잡 분기와 롤백은 오케스트레이션. 보상 단계 분류(Compensatable, Pivot, Retriable), 보상은 역연산이 아니라 추가 거래(환불은 결제 취소가 아니라 환불 거래)
- **부분 실패는?** → 동기: 서킷브레이커, 타임아웃, 벌크헤드. 비동기: 오류 분류 먼저 — 일시(백오프 재시도) vs 영구와 poison(즉시 DLQ). 분류 없이 일괄 재시도가 최악
- **이벤트 중복 소비는?** → 자연 멱등 설계 최선(절대값 SET, UPSERT) → 멱등 키 원자 dedup → 상태 머신 가드. check-then-act 분리가 가장 흔한 버그

## 4. 스크래핑, Puppeteer — 시솔 경험 심화

**답변 구조 (경험 → 운영 본질 → 성장 서사 → 사줘 연결)**:
> 시솔지주에서 15개 택배사 배송 추적을 통합하며 API 없는 해외 택배사는 스크래핑으로 풀었습니다. 어댑터 패턴으로 수집 인터페이스를 표준화해 택배사별 구현만 추가하는 구조였고요. 스크래핑의 본질적 리스크는 계약 없는 연동이라는 점입니다 — API는 깨지면 5xx라도 주지만 스크래핑은 200을 주면서 조용히 틀립니다. 그래서 모니터링이 설계의 절반이었고 Sentry로 파싱 실패를 잡아 구조 변경을 감지했습니다. 지금 다시 설계한다면 파싱 직후 스키마 검증으로 silent failure를 에러로 승격하고, 소스별 성공률 SLO 알림으로 건별 노이즈를 제거하고, 실패를 일시 vs 차단 vs 구조 변경으로 분류해 재시도 정책을 분기하고, 파서 버전을 결과에 남겨 재파싱 범위를 식별하는 것까지 넣겠습니다. 사줘의 파서 파이프라인도 같은 문제 공간이라 이 구조를 그대로 심화 적용하고 싶습니다.

⚠️ **정직 포인트**: 시솔 스크래핑이 Puppeteer였다는 근거 없음 — "당시는 HTTP 레벨 스크래핑이었고, Puppeteer 헤드리스는 거기에 브라우저 리소스 관리 축이 추가되는 것으로 이해한다"로 깔고 아래 운영 지식 연결.

**실패 분류 표 (재시도 정책 분기 — 핵심 차별화)**

| 분류 | 신호 | 대응 |
|---|---|---|
| 일시 | 타임아웃, 5xx, 네트워크 리셋, 429 | 지수 백오프 + 지터 재시도 |
| 차단 | 403, CAPTCHA, 봇 감지 페이지 | 재시도 무의미 — 속도 낮추고 알림 |
| 구조 변경 | 200인데 스키마 검증 실패, 셀렉터 0건 | **재시도 금지** (상대 부하만) → DLQ + 파서 수정 후 재처리 |

**꼬리 핵심**:
- **Puppeteer 메모리 운영?** → page는 finally에서 close, 브라우저는 N개 작업 후 재시작(worker recycling), 동시 page 상한 = 벌크헤드, 이미지와 폰트 request interception 차단, 컨테이너면 --disable-dev-shm-usage와 좀비 Chromium reap. 직접 대규모 운영 경험은 없고 HTTP 스크래핑 운영에서 유추한 설계라고 정직하게
- **한 소스가 느려지면 전체가 느려지지 않나?** → 소스별 타임아웃 차등(상위 > 하위 원칙) + 소스별 큐와 워커 격리(벌크헤드) + 지속 실패 소스는 서킷 Open + 사용자에겐 마지막 성공 데이터로 Graceful Degradation. 조회형 연동은 일관성보다 내결함성
- **변경 감지는?** → 3중 — 스키마 검증(silent failure 승격), 소스별 성공률 SLO(for 5m 지속 조건으로 노이즈 필터), 골든 URL 카나리(기대값 아는 케이스 주기 검증)
- **재처리 안전성은?** → 추적 결과 저장을 자연 멱등(운송장 번호 UPSERT)으로 설계하면 재시도가 항상 안전

## 5. Redis — 카드 8 보강 (커머스 매핑)

| 유스케이스 | 패턴 | 포인트 |
|---|---|---|
| 상품 상세, 환율 캐싱 | Cache-Aside + TTL Jitter | 시솔 번역 메타 캐싱(3초 → 0.9초)과 동일 패턴. 인기 상품 = Hot Key → 스탬피드 방어(jitter + mutex + 백그라운드 갱신) |
| 재고(1점물) | 캐싱 위험 | 재고는 stale 즉시 사고. 차감은 GET 후 SET 금지 — DECR 원자 연산 또는 Lua. 분산락은 최후 수단 |
| 쓰기 후 일관성 | 갱신 말고 **삭제(DEL)** | 갱신은 race로 구버전 잔존. 삭제는 다음 읽기에서 lazy 재적재. 무효화는 커밋 이후(Post-Commit) |
| 세션, rate limit | Session Store, INCR + TTL | 멀티 인스턴스 세션 공유, 외부 몰 요청 속도 제어(Token Bucket) |

**꼬리**: Redis 죽으면? → Cache-Aside라 DB fallback으로 서비스 유지(아발란체 대비 커넥션 풀 제한). HA는 Sentinel(3대 홀수, 과반 동의), 샤딩 필요하면 Cluster(CRC16 mod 16384 슬롯). 복제는 비동기라 레플리카 read는 stale 가능.

## 6. PostgreSQL, TypeORM, Go — 우대 갭 (JD 전문 보강)

**PG + TypeORM 돌파 멘트**:
> 실무 최적화는 MySQL과 Prisma 위에서 했지만 방법론은 DB 중립입니다 — EXPLAIN으로 실행계획 확인, 카디널리티 기반 복합 인덱스 설계, 커버링 인덱스로 랜덤 I/O 제거. PG 차이는 정리해 뒀습니다: EXPLAIN (ANALYZE, BUFFERS)로 캐시 히트까지 보고, pg_stat_statements로 슬로우 쿼리 누적 통계를 잡고, 인덱스 타입이 B-Tree 외에 BRIN(시계열), GIN(JSONB, 풀텍스트)까지 있어 선택지가 넓습니다. MVCC가 undo log가 아니라 dead tuple + VACUUM 방식이라 대량 UPDATE 후 bloat 관리가 운영 포인트라는 것도 압니다.
> TypeORM은 Prisma와 달리 Active Record와 Data Mapper를 둘 다 지원하고 QueryBuilder로 SQL 제어력이 높습니다. Prisma에서 relationLoadStrategy로 풀었던 app-level join 문제를 TypeORM에선 로딩 전략과 QueryBuilder로 다루는데, ORM이 만드는 쿼리를 EXPLAIN으로 검증하는 습관은 동일합니다.

**Go, gRPC**: 미경험 — 솔직하게. gRPC 개념(HTTP/2 멀티플렉싱, Protobuf 직렬화로 페이로드 절감, 내부 서비스 간 통신 적합, 브라우저 직접 호출 불가)은 설명 가능. 포지션 메인은 NestJS이므로 Go 비중은 역질문으로 확인 ([[Interview-Prep-Sazo-1st|메인 §4-4]]).

## 관련 문서

- [[Interview-Prep-Sazo-1st|1차 메인]], [[Interview-Prep-Sazo-Domain|도메인 브리프]]
- [[My-Tech-Cards]], [[My-Tech-Cards-Extended]] (카드 1, 2, 3, 8 원본과 심화 꼬리)
