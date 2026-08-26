---
tags: [fit, interview, common, my-answers, tech]
status: done
category: "Interview - 내 답변 마스터"
aliases: ["내 기술 답변 마스터 — 데이터/메시징", "My Tech Cards Data"]
---

# 내 이력서 기반 기술 답변 카드 — 데이터/메시징 (카드 1, 2, 3, 4)

> [[My-Tech-Cards|TOC]], [[My-Tech-Cards-Ops|관측, 인프라, 아키텍처 (카드 5, 6, 7, 8)]], [[My-Tech-Cards-Extended|심화 비교, 꼬리]]

## 카드 1: 850대 IoT 환경의 동시 정합성 — DB Lock 전략

**결론**: 같은 SKU, 창고에 동시 입출고 이벤트가 들어올 때 재고 카운트가 깨지는 문제를 **`SELECT … FOR UPDATE NOWAIT` (Exclusive Row Lock) + 트랜잭션 짧게 + 인덱스 키로 락 범위 좁히기 + 100ms 시작 지수 백오프 최대 3회 재시도**로 해결.

**왜 Pessimistic Lock**: IoT 자동 트래픽 = **충돌 빈도 높음** → Optimistic은 충돌을 늦게 발견해 수행한 작업을 버리고 전체 트랜잭션을 다시 실행할 수 있음. Pessimistic은 변경 전에 충돌을 조정하고, NOWAIT 실패만 제한 재시도. 재고 갱신 트랜잭션을 ms 단위로 짧게 유지하되 lock hold time과 실패율은 별도 관측.

**왜 Redis 분산락 아닌가**: 별도 인프라 의존성 + 네트워크 레이턴시 + 클럭 동기화 문제. **여러 앱 인스턴스가 같은 DB를 써도 DB lock이 경합을 조정하므로 충분** (인프라 단순성 우선). 보호할 자원이 여러 DB, shard나 외부 시스템 경계에 걸쳐 단일 DB 트랜잭션으로 묶이지 않을 때 분산락을 검토.

**트랜잭션 범위 최소화**: 디바이스 정보 조회, 검증은 트랜잭션 **밖**, 트랜잭션 안엔 `SELECT FOR UPDATE` → 재고 갱신 → 데이터 입력만. **Lock 순서 통일**(품목 ID 오름차순) → 데드락 확률 완화.

> 비용 모델 범위: 위 고정비 비교는 MSK Provisioned에 한정한다. MSK Serverless는 사용량 과금이므로 같은 모델로 일반화하지 않는다.

**도메인 매핑 placeholder**:
- DPP/CARE ID → "같은 제품 ID에 생산, 유통, 폐기 이벤트가 비동기로 들어올 때 동일 패턴. tenant_id × productId × eventType 단위 락"
- 라이브커머스 → "동시 결제, 재고 차감에 동일 패턴"
- {회사} → "{회사 도메인 매핑}"

**꼬리 (핵심)**:
- **"데드락은?"** → 이론상 락 순서 통일로 예방 가능하지만 실무에선 완전 예방 불가 (Gap/Next-Key Lock이 의도치 않은 순서로 암묵적 획득). **감지+복구가 정석** — InnoDB가 Wait-for Graph로 탐지해 한쪽 rollback → 앱에서 `ER_LOCK_DEADLOCK` catch 후 새 트랜잭션으로 제한 재시도. 락 순서 통일은 이미 적용했고, 그래도 반복되면 락이 필요했던 이유(카운터성 UPDATE 등)를 없애는 게 다음 단계
- **"Optimistic이 나은 상황?"** → 읽기 중심 + 충돌 빈도 낮은 경우 (게시글 수정, 설정 변경)
- **"락에 재시도면 thundering herd로 폭발 안 하나?"** (키노 1차 실전) → **NOWAIT를 건 잠금 읽기에는 대기 큐가 생기지 않아** row lock 대기가 쌓이는 convoy가 없음. 재시도는 **지수 백오프와 지터**로 동시 재돌입을 분산하고 **상한 3회**로 무한 재시도 차단. 게다가 트래픽이 1~2시간 주기 배치라 동시 충돌 수 자체가 bounded. **진짜 스파이크 도메인이면** SQS FIFO의 MessageGroupId 같은 업무 키 단위 큐와 제한된 워커 동시성으로 흡수. 분산락은 임계 구역을 직렬화할 뿐 유입량을 흡수하지 못함
- **조건 표기**: victim 선택은 변경 행 수가 적은 쪽을 고르려는 시도일 뿐 보장 없음. NOWAIT는 그 잠금 읽기의 row lock 대기만 없앰 — 같은 트랜잭션 뒤쪽 INSERT의 잠금 대기와 MDL 대기는 남음

**데이터 모델링 꼬리**:
- **"트랜잭션은 언제 쓰나?"** → 여러 읽기와 쓰기가 하나의 업무 불변식을 함께 지켜야 할 때 묶고, 외부 API 호출과 오래 걸리는 계산은 밖으로 빼 잠금 시간을 줄입니다. 단순히 쓰기 작업이라는 이유만으로 전부 긴 트랜잭션에 넣지 않습니다. [[Transactions|트랜잭션 정본]]
- **"FK는 언제 거나?"** → 같은 데이터베이스 안에서 참조 무결성이 업무 규칙이고 삭제, 갱신 정책을 명확히 정할 수 있을 때 사용합니다. 외부 시스템 식별자나 경계를 느슨하게 유지해야 하는 데이터는 애플리케이션 검증과 대사 경로를 함께 설계합니다. [[Foreign-Key-Integrity|외래 키 무결성]]
- **"마이그레이션 전략은?"** → 호환 컬럼 추가, 배치 백필과 검증, 읽기 경로 전환, 구 컬럼 제거의 expand-and-contract 순서로 진행합니다. 큰 테이블은 잠금과 복제 지연을 관측하고 중단, 재개 및 롤백 경계를 둡니다. [[Schema-Migration-Large-Table|대용량 스키마 마이그레이션]]

> ⚠️ **더 깊은 꼬리 질문 풀** (NOWAIT vs SKIP LOCKED, FOR UPDATE vs FOR SHARE, InnoDB Lock 5종, Gap Lock 성능 영향, 같은 행 데드락, 멀티 인스턴스): [[My-Tech-Cards-Extended#카드 1 DB Lock 심화|Extended]]

## 카드 2: EventBridge + SQS 이벤트 아키텍처 (발주 자동화)

> ⚠️ **본 미팅 한 자리에서 중복 주의** — 이직 사유, 의사결정 방식, 이벤트 기술 질문 3군데에서 같은 사례 반복 가능. **이직 사유엔 "MSK 대비 정량 비교"만 짧게**, 다른 자리엔 다른 사례(카드 3, 4, 5, 6 활용).

**결론**: 도메인 이벤트(재고 임계치) → EventBridge 규칙 → 채널별 SQS(카톡/이메일/내부 알림) → 워커(ECS Fargate) → 외부 API. **수기 발주 1시간 → 자동화, 수기 재고관리 4시간 → 10분 (95.8% 절감)**.

**채널별 DLQ + 오류 분류**: 잘못된 번호 같은 **영구 오류는 재시도 없이 즉시 실패로 확정하고 실패 기록과 수동 처리로 격리**, 네트워크 오류나 서버 부하 같은 **일시 오류만 점진적으로 제한 재시도**. 메일도 오류를 분류하고, 재시도 예산 소진 → DLQ + 긴급 알림 + 수동 처리 큐.

**MSK(Kafka) 대비 선택 근거**: **MSK Provisioned의 브로커와 스토리지 고정비를 EventBridge+SQS 사용량 과금과 비교**. 당시 MSK 산정액은 브로커 유형과 수, 스토리지, 데이터 전송 가정이 남아 있지 않아 정확한 금액으로 인용하지 않는다. 월 10만 발주 × 5액션 = 약 50만 메시지이고, 비배치 성공 처리라면 Send, Receive, Delete로 약 150만 SQS API 요청이 발생한다. 2026-08-21 서울 리전 표준 큐 단가와 월 100만 요청 Free Tier를 적용하면 SQS 초과분은 약 $0.20이고 EventBridge 과금은 별도다. 실제 비용은 배치, 빈 폴링, 재시도, payload 크기, 리전과 시점에 따라 달라진다. 운영 인력과 트래픽 규모에서 고정비 없는 관리형 구성이 유리했고, **사업 단계와 기술 결정을 함께 본 사례**.

**도메인 매핑 placeholder**:
- DPP → "제품 상태 변화(생산, 검수, 출고, 폐기, 재활용) = 도메인 이벤트, 브랜드사, 재활용업체, 소비자 알림으로 fan-out 동형"
- {회사} → "{회사 이벤트 흐름 매핑}"

**꼬리 (핵심)**:
- **"Kafka가 더 맞는 순간?"** → 이벤트 리플레이, 순서 보장(파티션 내), 초당 수만 건 이상
- **"DB 저장은 됐는데 이벤트 발행 실패? (Dual Write)"** → **Transactional Outbox 패턴**. INSERT + outbox INSERT를 같은 DB 트랜잭션 → 별도 Relay 프로세스가 outbox 폴링 후 발행. NestJS `@Cron('*/5 * * * * *')` 5초 폴링. 월 10만 발주 규모는 CDC(Debezium) 대비 폴링이 단순, 충분
- **"Lambda 안 쓴 이유?"** → Lambda도 SQS 소비에 적합하지만, 당시에는 **NestJS 도메인 로직과 Prisma 모델을 같은 코드베이스와 배포 경로에서 재사용**하고 DB 연결 수와 워커 동시성을 직접 제한하기 위해 ECS 워커를 선택. Lambda라면 이벤트 소스 매핑의 최대 동시성과 DB 연결 예산을 함께 제한하고 필요할 때 RDS Proxy를 검토
- **"아웃박스도 큐, SQS도 큐 아닌가? 폴링이 두 번인데 왜 SQS 없이 워커 직접 안 붙이나?"** (키노 1차 실전, 가장 크게 흔들린 질문) → ⓐ **단일 서버면** 인메모리 EventEmitter로 충분하지만, **ECS Fargate로 스케일 아웃하면 이벤트가 발생한 인스턴스 안에만 머물러 다른 인스턴스로 전파가 안 됨** → 인스턴스 경계를 넘으려면 외부 브로커가 필요. ⓑ 아웃박스와 SQS는 **역할이 다름** — 아웃박스는 DB 트랜잭션과 함께 기록해 **발행 의도 유실을 방지**하고, SQS는 **소비 분산과 재시도, DLQ**를 제공. ⓒ 아웃박스 Relay는 DB를 폴링하고 ECS 워커는 SQS `ReceiveMessage` long polling으로 가져온다. 서로 다른 경계의 두 pull이며 SQS가 워커로 push하는 구조가 아님
- **"한 발주 안에서도 단계를 다 같은 흐름에 묶나?"** → 한 발주 안에서도 단계마다 중요도가 달라서 처리 순서를 분리했습니다. 공급사 발주와 고객사 수주처럼 비즈니스가 곧바로 의존하는 앞단은 먼저 확정하고, 발주서나 일정 뒤에 나오는 거래명세서 같은 후속 산출물은 이벤트로 떼어내 백그라운드에서 처리하며 실패하면 재시도와 전송 실패 처리로 따로 관리합니다. 모든 단계를 한 동기 흐름에 묶으면 뒷단 하나가 실패할 때 앞단까지 전체가 롤백되는데, 정작 중요한 앞단은 이미 성공시킬 수 있는 일이라 그렇게 묶지 않았습니다.

> ⚠️ **상태 머신 8단계 흐름, visibility timeout, 알림 채널 중복 방지, SQS FIFO vs Pub/Sub, CDC vs Outbox**: [[My-Tech-Cards-Extended#카드 2 EventBridge+SQS 심화|Extended]]

## 카드 3: 슬로우 쿼리 99.3% 개선 — 복합 인덱스 + 쿼리 재작성

**결론**: 디바이스 최신 상태 조회 서브쿼리 **2000ms+** → 테이블 **100만 건, 850대 디바이스, 디바이스당 평균 1,240건**. EXPLAIN ANALYZE로 `ORDER BY created_at DESC, id DESC` 후 후보 행 filesort 확인 → **카디널리티 분석(디바이스 번호 선택도 약 0.12%)** → 복합 인덱스 `(device_number, created_at DESC, id DESC)` 설계 → index 순서로 최상단 레코드 접근. **쿼리당 15.4ms → 0.1ms**. 같은 equality 조건과 실행계획에서는 상위 1건에서 scan을 멈춰 후보 범위를 작게 유지한다. 단, 실제 비용은 B-Tree 깊이, cache, I/O와 데이터 분포에 따라 달라지므로 데이터가 늘면 다시 측정한다.

**복합 인덱스 컬럼 순서 룰**: 이 쿼리는 equality 조건인 `device_number`를 앞에 두고 정렬 키를 방향까지 맞춤. 일반화할 때는 **equality, range, 정렬, 그룹화와 covering 요구를 실제 쿼리로 함께 판단**하며, 높은 카디널리티만으로 순서를 정하지 않음.

**검증**: Before/After P99, QPS 비교, 인덱스로 인한 쓰기 비용 모니터링.

**도메인 매핑 placeholder**:
- DPP → "제품 ID 단위 시계열 이벤트 조회가 핵심 — (tenant_id, product_id, event_time DESC) 복합 인덱스 1순위"
- {회사} → "{회사 핵심 조회 패턴 매핑}"

**꼬리 (핵심)**:
- **"인덱스 쓰기 페널티?"** → SELECT 빨라지지만 INSERT/UPDATE/DELETE 시 인덱스 갱신 → 쓰기 성능 저하. 실제 쿼리 패턴 기반 설계
- **"커버링 인덱스?"** → 쿼리 필요한 모든 컬럼이 인덱스에 포함 → 테이블 접근(랜덤 I/O) 없이 인덱스만으로 결과 반환

> ⚠️ **더 깊은 꼬리** (EXPLAIN 읽기, PostgreSQL EXPLAIN ANALYZE, pg_stat_statements, BRIN/GIN): [[My-Tech-Cards-Extended#카드 3 슬로우 쿼리 심화|Extended]]

## 카드 4: Prisma → MySQL SubQuery API 응답 90% 개선

**결론**: **Prisma는 lazy loading 없어서 전통적 N+1 아님**. 당시 사용한 Prisma 구성은 `relationJoins`를 활성화하지 않아 **app-level join 방식**으로 include 관계마다 별도 쿼리가 발생했고, 조인 엔티티가 늘며 **평균 100ms → 1000ms 저하**. 로그 분석으로 4개 개별 쿼리 확인 → 공식 문서에서 **`relationLoadStrategy: 'join'`** 발견 → 단일 correlated subquery + JSON 함수 형태로 통합해 **82~90% 성능 개선**. 현재 `relationJoins`를 활성화한 Prisma에서는 `join`이 기본이고 별도 쿼리는 `query` 전략이므로, 당시 버전과 설정에 한정한 경험이다. **옵션 이름이 생성 SQL 형태를 보장하지 않는다** — MySQL에선 DB-level JOIN이 아니라 subquery로 내려가는 것을 실행계획으로 확인하고 적용. (조건: `relationJoins`는 Preview 기능이라 `previewFeatures` 활성이 전제)

**왜 ORM 안 버리고**: 타입 안정성, 마이그레이션 관리, 생산성. **성능 크리티컬한 부분만 Raw Query로 전환**. 대부분 CRUD는 ORM이 충분.

**Raw Query 전환 기준**: EXPLAIN으로 실행 계획 확인 후 ORM 생성 쿼리가 비효율적일 때. 복잡한 서브쿼리, 윈도우 함수, 벌크 연산.

**도메인 매핑 placeholder**:
- {회사} → "{회사 핵심 ORM, 쿼리 패턴}에서도 같은 식 ORM 추상화 비용 점검 필요"

**꼬리 (핵심)**:
- **"Prisma vs TypeORM vs Drizzle?"** → TypeORM은 Active Record+Data Mapper를 모두 지원하고 QueryBuilder, raw SQL까지 내려갈 수 있지만, alias, property path와 raw fragment의 문자열 경계는 컴파일 단계 검증이 약함. 복잡한 쿼리는 생성 SQL과 `EXPLAIN`을 확인하고 integration test로 검증. Drizzle은 SQL에 가까운 타입 세이프 쿼리 빌더. **Prisma는 스키마 중심 설계+마이그레이션이 강점**이지만 복잡한 쿼리에서 한계
- **"전체 쿼리 모니터링?"** → **Client Extensions `$extends`의 query 컴포넌트**로 실행 시간 측정 + Grafana로 P99 추적 (middleware `$use`는 v4.16.0 deprecated, v6.14.0에서 제거)

## 관련 문서

- [[My-Tech-Cards|TOC + vault 카테고리 인덱스]]
- [[My-Tech-Cards-Ops|관측, 인프라, 아키텍처 (카드 5, 6, 7, 8)]]
- [[My-Tech-Cards-Extended|심화 비교 표, 꼬리 풀]]
