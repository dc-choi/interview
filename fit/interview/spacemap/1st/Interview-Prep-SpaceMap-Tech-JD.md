---
tags: [fit, interview, spacemap]
status: done
category: "Interview - Fit"
aliases: ["SpaceMap JD 기술 질문", "스페이스맵 JD 기반 기술 질문"]
---
# 스페이스맵 1차 — JD 기반 기술 질문

> 상위 TOC: [[Interview-Prep-SpaceMap|스페이스맵 1차 면접 준비]]

이 문서는 **갭 영역(Python/FastAPI, Airflow, PostgreSQL)을 어떻게 방어하느냐**가 핵심. 원칙: ① 모르는 건 솔직히 인정 ② 인접 경험으로 다리를 놓는다 ③ 학습 경로를 구체적으로 제시한다. 모른다고 얼버무리거나 아는 척하면 5년차 포지션에서 바로 드러난다.

---

## 1. Python / FastAPI — "경험 없는데 괜찮나?"

> 관련: [[NestJS|NestJS]], [[NestJS-Lifecycle|NestJS 생명주기]], [[Async-IO|비동기 I/O]], [[TypeScript-Node|TypeScript, Node]]

**솔직한 출발점**: Python, FastAPI는 실무에서 써본 적 없습니다. 다만 갭을 메울 토대는 분명합니다.

**다리를 놓는 답변**
- FastAPI와 NestJS는 설계 철학이 닮았음 — **데코레이터 기반 라우팅, 의존성 주입(DI), Pydantic↔class-validator 같은 선언적 검증, ASGI↔Node 이벤트 루프 비동기 모델**. NestJS를 2년 넘게 깊게 다뤘기에 FastAPI의 멘탈 모델은 빠르게 잡힘
- 언어 자체도 새 언어를 반복 흡수해온 이력 — Java(이썸테크) → JS/TS(시솔지주, 트라이포드랩), JSP/Spring 마이그레이션, MongoDB→MySQL. 새 스택 적응은 약점이 아니라 검증된 패턴
- 학습 경로: FastAPI 공식 문서 → 타입 힌트, Pydantic → async/await(Python) → 작은 API 서버 구현. 입사 전부터 시작 가능

**꼬리 질문 대비**
- "Python GIL은 아나?" → Global Interpreter Lock — CPU 바운드 멀티스레딩이 제약됨. I/O 바운드는 async로, CPU 바운드(궤도 연산 등)는 멀티프로세싱, 외부 워커로 분리. Node.js 단일 스레드 + Worker Threads 경험과 사고 구조가 비슷
- "왜 우주 쪽은 Python을 많이 쓸까?" → NumPy, SciPy, astropy 등 과학 연산 생태계. 데이터 엔진의 수치 연산은 Python, API, 웹은 TS 식으로 역할 분담 가능성 — 실제 비중은 역질문으로 확인
- "TS만 고집하는 거 아닌가?" → 도구는 문제에 맞춰 고르는 것. 연산 생태계가 필요하면 Python이 맞고, 적응할 의지가 있음

---

## 2. Apache Airflow / 데이터 파이프라인 — "Airflow 안 써봤는데?"

> 관련: [[Spring-Batch-Essentials|Spring Batch]], [[Event-Driven-Patterns|이벤트 드리븐]], [[Idempotency|멱등성]], [[Delivery-Semantics|전달 보장]], [[Messaging-Patterns|메시징 패턴]]

**솔직한 출발점**: Airflow 자체는 운영해본 적 없습니다. 하지만 Airflow가 푸는 문제 — **스케줄 기반 배치, 작업 간 의존성, 재시도, 실패 복구, 멱등성** — 는 다른 도구로 반복해서 다뤘습니다.

**다리를 놓는 답변 (인접 경험)**
- 시솔지주: 하나은행 환율 API를 9~17시 30분 간격으로 호출하는 batch를 `node-schedule`로 구현, **API 실패 시 최대 4회 재시도** 안정성 로직 — Airflow의 retry, schedule_interval과 같은 문제
- 이썸테크: Spring Quartz로 1시간 주기 스케줄링, 해외 지사 API 30회 호출 제한을 고려한 호출 전략 — Airflow의 DAG, pool 개념과 매핑
- 트라이포드랩: EventBridge 스케줄 룰 + SQS 워커 — 이벤트 기반 파이프라인. status 머신, DLQ, 멱등성 키로 실패 복구 설계
- → Airflow의 핵심 개념(**DAG = 작업 의존 그래프, Operator, retry, backfill, idempotent task**)은 이미 다른 형태로 체화. 도구 문법만 익히면 됨

**꼬리 질문 대비**
- "DAG가 뭔지 아나?" → Directed Acyclic Graph. 작업 간 의존 관계를 비순환 그래프로 표현 → 선행 작업 완료 후 후행 실행, 병렬 가능 구간은 병렬화
- "배치 task는 왜 멱등해야 하나?" → 재시도, backfill 시 같은 task가 중복 실행될 수 있음. 멱등하지 않으면 데이터 중복, 오염. upsert, 멱등성 키, 범위 삭제 후 재삽입으로 보장
- "Airflow vs 이벤트 기반 큐, 언제 무엇?" → 정해진 스케줄, 복잡한 의존 그래프, backfill 필요 = Airflow. 실시간 이벤트, 낮은 지연 = 큐. 우주 데이터 수집이 "정기 관측 배치 + 실시간 스트림" 혼합이면 둘 다 쓰일 수 있음 — 현재 구조를 역질문

---

## 3. PostgreSQL vs MySQL — RDB 공통 + 차이점

> 관련: [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]], [[Isolation-Level|격리 수준]], [[MySQL-Architecture|MySQL 아키텍처]], [[Index|인덱스]], [[Transactions|트랜잭션]]

**출발점**: MySQL(InnoDB)은 깊게 다뤘고 — 복합 인덱스, 격리 수준, Read Replica, 실행계획 — PostgreSQL은 직접 운영 경험은 없으나 RDB 공통 개념 위에서 차이를 학습 중입니다.

**핵심 차이 (말할 수 있어야 함)**
- **MVCC 구현**: MySQL은 undo log로 이전 버전 관리, PostgreSQL은 튜플 자체를 여러 버전으로 두고 VACUUM으로 정리 → PG는 VACUUM 운영 이슈(테이블 bloat)가 있음
- **인덱스**: PG는 GIN/GiST/BRIN 등 다양 — 특히 **GiST는 공간, 범위 데이터**, BRIN은 시계열 대용량에 강함. 우주 데이터(좌표, 궤도, 시간 범위)에 PG가 유리할 수 있는 지점
- **기본 격리 수준**: 둘 다 차이가 있음 — MySQL InnoDB는 REPEATABLE READ, PG는 READ COMMITTED가 기본
- **타입, 확장**: PG는 JSONB, 배열, 확장(PostGIS 등) 강력 — PostGIS는 지리/공간 연산, 우주 도메인과 연관 가능성

**꼬리 질문 대비**
- "왜 우주 데이터에 PostgreSQL을 쓸까?" → 공간 인덱스(GiST), PostGIS, 시계열 친화 인덱스(BRIN), 풍부한 수치 타입. 좌표, 궤도, 범위 질의에 적합
- "MySQL 깊이가 PG로 전이되나?" → 인덱스 원리, 실행계획 읽기, 격리 수준, 복제는 RDB 공통. 도구별 차이(MVCC 구현, VACUUM, 인덱스 종류)만 추가 학습하면 됨
- "MySQL Gap Lock 아나?" → REPEATABLE READ에서 팬텀 방지를 위해 인덱스 범위에 거는 락. PG는 MVCC 스냅샷으로 접근이 다름

---

## 4. NoSQL (MongoDB / Redis) — 언제, 왜

> 관련: [[MongoDB-Schema-Design|MongoDB 스키마 설계]], [[Redis|Redis]], [[Redis-Data-Structures|Redis 자료구조]], [[Cache-Strategies|캐시 전략]], [[Redis-Streams-PubSub|Redis Streams, PubSub]]

**경험**: 사료판매 플랫폼에서 MongoDB(스키마리스) 기반으로 시작 → 정부 표준 DB 정형 데이터 활용 필요로 **MongoDB→MySQL 마이그레이션(100만 건)** 주도. Redis는 캐시, 분산락 맥락에서 숙지.

**답변 골격**
- **MongoDB**: 스키마가 유동적이거나 문서 단위 접근이 지배적일 때. 단 정형, 관계가 중요해지면 RDB가 나음 — 마이그레이션을 직접 하며 그 경계를 체득
- **Redis**: 캐시(조회 빈도 높은 데이터), 분산락, 레이트 리미팅, 세션, Streams로 경량 큐. 우주 데이터 파이프라인에서는 **수집 버퍼, 핫 데이터 캐시, 중복 수집 차단(SET NX)** 용도로 쓸 만함
- 핵심은 "NoSQL이 좋다/나쁘다"가 아니라 **데이터 접근 패턴에 맞춰 고르는 것**

**꼬리 질문 대비**
- "MongoDB에서 MySQL로 왜 갔나?" → 정부 표준 DB의 정형 데이터를 활용해야 했고 관계, 정합성 요구가 커짐. 스키마리스의 자유가 오히려 데이터 일관성 부채가 됨
- "Redis 영속성은?" → RDB 스냅샷 + AOF. 캐시 용도면 영속성 불필요, 큐, 상태 저장이면 AOF 고려. 단 Redis는 1차 저장소가 아니라는 전제
- "Redis 캐시 무효화 전략?" → TTL 기반, write-through, cache-aside. 무효화 타이밍이 stampede를 부를 수 있어 [[Cache-Stampede]] 대비 필요

---

## 5. 대용량 데이터 수집 파이프라인 설계 — JD의 정중앙 질문

> 관련: [[Backpressure|백프레셔]], [[Idempotency-Key|멱등성 키]], [[CDC&Outbox|CDC, Outbox]], [[OLTP-vs-OLAP|OLTP vs OLAP]], [[ClickHouse|ClickHouse]]

**"우주 데이터를 실시간 수집, 처리하는 파이프라인을 설계한다면?" — 가장 깊게 들어올 질문**

**설계 골격 (단계별)**
1. **수집(Ingest)**: 데이터 소스(관측소, 위성, 외부 API)별 어댑터. 빠르게 받아 큐/버퍼에 적재 — 수집과 처리를 분리해 소스가 느려져도 백프레셔 흡수
2. **검증, 정합성**: 멱등성 키(객체 ID + 관측 시각)로 중복 차단, 스키마 검증, 이상치 필터
3. **가공, 연산**: 무거운 연산(궤도 계산 등)은 워커에서 비동기. CPU 바운드면 별도 워커 풀/프로세스
4. **저장**: 원천 데이터는 append-only(시계열), 가공 결과는 조회 최적화 테이블. OLTP/OLAP 분리 검토
5. **노출**: API 서버는 읽기 최적화된 저장소를 바라봄. Read Replica, 캐시 계층

**내 경험 연결**: 트라이포드랩 IoT 파이프라인이 정확히 이 구조 — 수집(DB Lock 정합성) → 이벤트 분리(EventBridge/SQS) → 저장(복합 인덱스) → API(Read Replica)

**꼬리 질문 대비**
- "수집 폭주(트래픽 spike)는?" → 큐로 버퍼링 + 워커 오토스케일(큐 깊이 기반) + 백프레셔. 큐가 무한정 쌓이면 DLQ, 샘플링, 우선순위
- "데이터가 늦게 도착하면(late arrival)?" → 시계열에서 흔함. 이벤트 시각 기준 처리 + 워터마크, 늦은 데이터는 별도 backfill 경로
- "정확히 한 번 처리(exactly-once)는?" → 큐는 보통 at-least-once. 멱등성 키 + upsert로 effectively-once를 만든다
- "OLTP/OLAP 분리?" → 수집, 갱신은 OLTP, 대규모 집계, 분석은 OLAP(ClickHouse 등). 우주 데이터 분석 쿼리가 무거우면 분리 검토

---

## 6. REST API 설계 — 데이터 엔진을 외부에 노출하기

> 관련: [[REST|REST]], [[API-Conventions|API 컨벤션]], [[API-Documentation|API 문서화]], [[Pagination-Optimization|페이지네이션 최적화]], [[API-Comparison|API 비교]]

**답변 골격**
- 리소스 중심 URI, HTTP 메서드 의미 준수, 상태코드 정확히, 버저닝
- 대용량 시계열 조회는 **커서 기반 페이지네이션**(offset은 깊은 페이지에서 느려짐), 시간 범위 필터, 필드 선택
- 일관된 에러 포맷, API 문서화(OpenAPI)

**꼬리 질문 대비**
- "REST vs GraphQL vs gRPC?" → 외부 공개, 캐시 친화는 REST, 클라이언트 주도 조회는 GraphQL, 내부 서비스 간 고성능은 gRPC. 데이터 엔진이 내부 연산 서비스라면 gRPC도 후보
- "대용량 응답은?" → 페이지네이션, 스트리밍(chunked), 압축. 한 번에 다 주지 않는다
- "API 멱등성?" → GET/PUT/DELETE는 멱등, POST는 멱등성 키로 보완

---

## 7. NestJS 심화 — 핵심 스택 깊이 검증

> 관련: [[NestJS|NestJS]], [[NestJS-Lifecycle|생명주기]], [[NestJS-AOP-Interceptor|인터셉터]], [[NestJS-Guards|가드]], [[Injection-Scopes|주입 스코프]], [[NestJS-Module-Dynamic|동적 모듈]], [[Clean-Architecture-NestJS|클린 아키텍처]]

**답변 골격**
- **DI 컨테이너**: provider를 토큰으로 등록, 기본 싱글톤 스코프. 요청 스코프는 비용이 크니 신중히
- **요청 생명주기**: 미들웨어 → 가드 → 인터셉터(전) → 파이프 → 핸들러 → 인터셉터(후) → 예외 필터
- **모듈 설계**: 도메인별 모듈 분리, 동적 모듈로 설정 주입 — 트라이포드랩에서 PoC용 모듈 중심 아키텍처 설계 경험
- **클린 아키텍처**: UseCase / DomainService / Repository Interface 계층 분리 — 포트폴리오의 JSON Response, 엑셀 다운로드 중복 제거 사례

**꼬리 질문 대비**
- "인터셉터 vs 미들웨어 차이?" → 미들웨어는 Express 레벨(라우팅 전), 인터셉터는 Nest 컨텍스트(핸들러 전후, 응답 변형, RxJS 가능)
- "순환 의존성 해결?" → `forwardRef`, 또는 설계를 다시 봐서 의존 방향 정리 (후자가 우선)
- "전역 예외 처리?" → Exception Filter를 전역 등록, 일관된 에러 응답 포맷

---

## 관련 문서
- [[Interview-Prep-SpaceMap|1차 면접 TOC]]
- [[Interview-Prep-SpaceMap-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-SpaceMap-Tech-Resume|이력서 기반 기술 질문]]
- [[Interview-Prep-SpaceMap-Service|서비스 맥락 + 컬처핏 + 역질문]]
- [[Interview-Prep-SpaceMap-Checklist|면접 준비 체크리스트]]
