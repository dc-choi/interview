---
tags: [fit, interview, common, my-answers, tech]
status: done
category: "Interview - 내 답변 마스터"
aliases: ["내 기술 답변 마스터 — 데이터/메시징", "My Tech Cards Data"]
---

# 내 이력서 기반 기술 답변 카드 — 데이터/메시징 (카드 1, 2, 3, 4)

> [[My-Tech-Cards|TOC]], [[My-Tech-Cards-Ops|관측, 인프라, 아키텍처 (카드 5, 6, 7, 8)]], [[My-Tech-Cards-Extended|심화 비교, 꼬리]]

## 카드 1: IoT 수천 대 동시 정합성 — DB Lock 전략

**결론**: 같은 SKU, 창고에 동시 입출고 이벤트가 들어올 때 재고 카운트가 깨지는 문제를 **`SELECT … FOR UPDATE NO WAIT` (Exclusive Row Lock) + 트랜잭션 짧게 + 인덱스 키로 락 범위 좁히기 + 100ms 간격 최대 3회 재시도(최악 1초 이내)**로 해결.

**왜 Pessimistic Lock**: IoT 자동 트래픽 = **충돌 빈도 높음** → Optimistic은 전체 트랜잭션 재실행 비용 과도. Pessimistic은 충돌 시 한 번만 수행. 재고 갱신은 ms 단위 짧은 트랜잭션이라 Lock 대기 시간 무시 수준.

**왜 Redis 분산락 아닌가**: 별도 인프라 의존성 + 네트워크 레이턴시 + 클럭 동기화 문제. **단일 DB 환경에서 DB 자체 lock이면 충분** (인프라 단순성 우선). 분산 DB/멀티 인스턴스 환경 되면 그때 검토.

**트랜잭션 범위 최소화**: 디바이스 정보 조회, 검증은 트랜잭션 **밖**, 트랜잭션 안엔 `SELECT FOR UPDATE` → 재고 갱신 → 데이터 입력만. **Lock 순서 통일**(품목 ID 오름차순) → 데드락 확률 완화.

**도메인 매핑 placeholder**:
- DPP/CARE ID → "같은 제품 ID에 생산, 유통, 폐기 이벤트가 비동기로 들어올 때 동일 패턴. tenant_id × productId × eventType 단위 락"
- 라이브커머스 → "동시 결제, 재고 차감에 동일 패턴"
- {회사} → "{회사 도메인 매핑}"

**꼬리 (핵심)**:
- **"데드락은?"** → 완전 예방 불가 (Gap Lock/Next-Key Lock이 의도하지 않은 순서로 암묵적). **감지+복구가 정석** — InnoDB Wait-for Graph 자동 탐지 → 비용 적은 TX rollback → 앱에서 `ER_LOCK_DEADLOCK` catch 후 재시도. 우리는 NO WAIT로 상호 대기 자체 회피
- **"Optimistic이 나은 상황?"** → 읽기 중심 + 충돌 빈도 낮은 경우 (게시글 수정, 설정 변경)
- **"락에 재시도면 thundering herd로 폭발 안 하나?"** (키노 1차 실전) → **NO WAIT는 대기 큐를 만들지 않고 즉시 실패 후 재시도**라 락 대기가 쌓이는 convoy가 없음. 재시도는 **지수 백오프와 지터**로 동시 재돌입을 분산하고 **상한 3회**로 무한 재시도 차단. 게다가 트래픽이 1~2시간 주기 배치라 동시 충돌 수 자체가 bounded. **진짜 스파이크 도메인이면** 큐 직렬화(SQS FIFO)나 분산락으로 전환

> ⚠️ **더 깊은 꼬리 질문 풀** (NO WAIT vs SKIP LOCKED, FOR UPDATE vs FOR SHARE, InnoDB Lock 5종, Gap Lock 성능 영향, 멀티 인스턴스): [[My-Tech-Cards-Extended#카드 1 DB Lock 심화|Extended]]

## 카드 2: EventBridge + SQS 이벤트 아키텍처 (발주 자동화)

> ⚠️ **본 미팅 한 자리에서 중복 주의** — 이직 사유, 의사결정 방식, 이벤트 기술 질문 3군데에서 같은 사례 반복 가능. **이직 사유엔 "MSK 대비 정량 비교"만 짧게**, 다른 자리엔 다른 사례(카드 3, 4, 5, 6 활용).

**결론**: 도메인 이벤트(재고 임계치) → EventBridge 규칙 → 채널별 SQS(카톡/이메일/내부 알림) → 워커(ECS Fargate) → 외부 API. **수기 발주 1시간 → 자동화, 수기 재고관리 4시간 → 10분 (95.8% 절감)**.

**채널별 DLQ + 재시도 차등**: 카톡(잘못된 번호 점진 재시도 후 포기), 이메일(무조건 재시도), 최종 실패 → 긴급 알림 + 수동 처리 큐.

**MSK(Kafka) 대비 선택 근거**: **MSK $574/월 vs EventBridge+SQS $0~18/월** (월 10만 발주 × 5액션 = 50만 SQS, Free Tier 범위). 운영 인력 부족 + 트래픽 규모에서 EventBridge+SQS의 관리 부담, 비용이 압도적 유리. **사업 단계와 기술 결정을 함께 본 사례**.

**도메인 매핑 placeholder**:
- DPP → "제품 상태 변화(생산, 검수, 출고, 폐기, 재활용) = 도메인 이벤트, 브랜드사, 재활용업체, 소비자 알림으로 fan-out 동형"
- {회사} → "{회사 이벤트 흐름 매핑}"

**꼬리 (핵심)**:
- **"Kafka가 더 맞는 순간?"** → 이벤트 리플레이, 순서 보장(파티션 내), 초당 수만 건 이상
- **"DB 저장은 됐는데 이벤트 발행 실패? (Dual Write)"** → **Transactional Outbox 패턴**. INSERT + outbox INSERT를 같은 DB 트랜잭션 → 별도 Relay 프로세스가 outbox 폴링 후 발행. NestJS `@Cron('*/5 * * * * *')` 5초 폴링. 월 10만 발주 규모는 CDC(Debezium) 대비 폴링이 단순, 충분
- **"Lambda 안 쓴 이유?"** → Lambda는 cold start로 Prisma 커넥션 풀 관리 어려움(RDS Proxy로 해결 가능하나 추가 비용). ECS 워커는 **NestJS 도메인 로직(Prisma 모델, 발주 비즈니스) 그대로 재사용** + 단일 코드베이스, 단일 배포
- **"아웃박스도 큐, SQS도 큐 아닌가? 폴링과 인터럽트가 섞였는데 왜 SQS 없이 워커 직접 안 붙이나?"** (키노 1차 실전, 가장 크게 흔들린 질문) → ⓐ **단일 서버면** 인메모리 EventEmitter로 충분하지만, **ECS Fargate로 스케일 아웃하면 이벤트가 발생한 인스턴스 안에만 머물러 다른 인스턴스로 전파가 안 됨** → 인스턴스 경계를 넘으려면 외부 브로커가 필연. ⓑ 아웃박스와 SQS는 **역할이 다름** — 아웃박스는 DB 트랜잭션과 원자적인 **발행 보장**(듀얼라이트 유실 방지), SQS는 **소비 분산과 재시도, DLQ**(여러 워커가 경쟁 소비, 실패 격리). 큐가 두 벌이 아니라 발행 신뢰 계층과 소비 분산 계층이 나뉜 것. ⓒ 폴링(아웃박스 릴레이가 DB를 읽는 단계)과 푸시(SQS가 워커로)는 **각 경계에 맞춘 선택**이지 혼재가 아님

> ⚠️ **상태 머신 8단계 흐름, visibility timeout, 알림 채널 중복 방지, SQS FIFO vs Pub/Sub, CDC vs Outbox**: [[My-Tech-Cards-Extended#카드 2 EventBridge+SQS 심화|Extended]]

## 카드 3: 슬로우 쿼리 99.3% 개선 — 복합 인덱스 + 쿼리 재작성

**결론**: 디바이스 최신 상태 조회 서브쿼리 **2000ms+** → 테이블 **100만 건, 850대 디바이스, 디바이스당 평균 1,240건**. EXPLAIN ANALYZE로 `ORDER BY created_at DESC, id DESC` 후 **전체 행 filesort** 확인 → **카디널리티 분석(디바이스 번호 선택도 0.08%)** → 복합 인덱스 `(device_number, created_at DESC, id DESC)` 설계 → 인덱스 스캔만으로 최상단 레코드 즉시 접근. **쿼리당 15.4ms → 0.1ms**. 3,000대 확장 시에도 인덱스 탐색 1건이라 데이터 양 무관.

**복합 인덱스 컬럼 순서 룰**: **동등 조건(=) 컬럼 앞, 범위 조건(>, BETWEEN) 뒤**. 카디널리티가 높은 컬럼이 앞에 올수록 스캔 범위가 빨리 좁혀짐.

**검증**: Before/After P99, QPS 비교, 인덱스로 인한 쓰기 비용 모니터링.

**도메인 매핑 placeholder**:
- DPP → "제품 ID 단위 시계열 이벤트 조회가 핵심 — (tenant_id, product_id, event_time DESC) 복합 인덱스 1순위"
- {회사} → "{회사 핵심 조회 패턴 매핑}"

**꼬리 (핵심)**:
- **"인덱스 쓰기 페널티?"** → SELECT 빨라지지만 INSERT/UPDATE/DELETE 시 인덱스 갱신 → 쓰기 성능 저하. 실제 쿼리 패턴 기반 설계
- **"커버링 인덱스?"** → 쿼리 필요한 모든 컬럼이 인덱스에 포함 → 테이블 접근(랜덤 I/O) 없이 인덱스만으로 결과 반환

> ⚠️ **더 깊은 꼬리** (EXPLAIN 읽기, PostgreSQL EXPLAIN ANALYZE, pg_stat_statements, BRIN/GIN): [[My-Tech-Cards-Extended#카드 3 슬로우 쿼리 심화|Extended]]

## 카드 4: Prisma → MySQL SubQuery API 응답 90% 개선

**결론**: **Prisma는 lazy loading 없어서 전통적 N+1 아님**. 실제 문제는 **app-level join 방식** — include 시 SQL JOIN이 아니라 관계마다 별도 쿼리 발생 → 조인 엔티티 늘수록 쿼리 N개씩 증가. **평균 100ms → 1000ms 저하**. 로그 분석으로 4개 개별 쿼리 확인 → 공식 문서에서 **`relationLoadStrategy: 'join'`** 발견 → DB-level JOIN 전환만으로 **82~90% 성능 개선**.

**왜 ORM 안 버리고**: 타입 안정성, 마이그레이션 관리, 생산성. **성능 크리티컬한 부분만 Raw Query로 전환**. 대부분 CRUD는 ORM이 충분.

**Raw Query 전환 기준**: EXPLAIN으로 실행 계획 확인 후 ORM 생성 쿼리가 비효율적일 때. 복잡한 서브쿼리, 윈도우 함수, 벌크 연산.

**도메인 매핑 placeholder**:
- {회사} → "{회사 핵심 ORM, 쿼리 패턴}에서도 같은 식 ORM 추상화 비용 점검 필요"

**꼬리 (핵심)**:
- **"Prisma vs TypeORM vs Drizzle?"** → TypeORM은 Active Record+Data Mapper 둘 다 지원하지만 복잡한 쿼리에서 불안정. Drizzle은 SQL에 가까운 타입 세이프 쿼리 빌더. **Prisma는 스키마 중심 설계+마이그레이션이 강점**이지만 복잡한 쿼리에서 한계
- **"전체 쿼리 모니터링?"** → Prisma middleware로 실행 시간 측정 + Grafana로 P99 추적

## 관련 문서

- [[My-Tech-Cards|TOC + vault 카테고리 인덱스]]
- [[My-Tech-Cards-Ops|관측, 인프라, 아키텍처 (카드 5, 6, 7, 8)]]
- [[My-Tech-Cards-Extended|심화 비교 표, 꼬리 풀]]
