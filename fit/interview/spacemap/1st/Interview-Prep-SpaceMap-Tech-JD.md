---
tags: [fit, interview, spacemap]
status: done
category: "Interview - Fit"
aliases: ["SpaceMap JD 기술 질문", "스페이스맵 JD 기반 기술 질문"]
---
# 스페이스맵 1차 — JD 기반 기술 질문

> 상위 TOC: [[Interview-Prep-SpaceMap|스페이스맵 1차 면접 준비]]

이 문서는 미경험 기술을 다루는 답변이 핵심이다. 모르는 범위는 인정하고, 인접 경험과 학습 경로를 제시하며, 실제 적용 전 검증 조건을 분명히 한다.

---

## 1. Python / FastAPI — "경험 없는데 괜찮나?"

> 관련: [[NestJS|NestJS]], [[NestJS-Lifecycle|NestJS 생명주기]], [[Async-IO|비동기 I/O]], [[TypeScript-Node|TypeScript, Node]]

**솔직한 출발점**: Python, FastAPI는 실무에서 써본 적 없습니다. 다만 갭을 메울 토대는 분명합니다.

**다리를 놓는 답변**
- FastAPI와 NestJS는 **라우트 선언, 의존성 주입과 선언적 검증**이라는 익숙한 표면을 공유한다. 다만 FastAPI의 `Depends`, Pydantic과 ASGI의 실행 모델은 별도로 익혀야 한다. NestJS를 프로덕션에서 깊게 다뤘기에 기본 멘탈 모델은 빠르게 잡을 수 있다.
- 새 언어, 프레임워크와 데이터 모델을 학습해 적용할 때도 공식 문서, 작은 구현과 검증을 순서대로 진행했다. 새 스택 적응은 약점이 아니라 반복 가능한 학습 패턴이다.
- 학습 경로: FastAPI 공식 문서 → 타입 힌트, Pydantic → async/await(Python) → 작은 API 서버 구현. 입사 전부터 시작 가능

**꼬리 질문 대비**
- "Python GIL은 아나?" → 일반적인 GIL 빌드의 CPython에서는 CPU 바운드 Python 스레드 병렬성이 제한된다. free-threaded 빌드와 C 확장은 예외가 될 수 있으므로 런타임을 확인한다. I/O 바운드는 async를, CPU 바운드는 멀티프로세싱이나 외부 워커를 검토한다.
- "왜 우주 쪽은 Python을 많이 쓸까?" → NumPy, SciPy, astropy 등 과학 연산 생태계. 데이터 엔진의 수치 연산은 Python, API, 웹은 TS 식으로 역할 분담 가능성 — 실제 비중은 역질문으로 확인
- "TS만 고집하는 거 아닌가?" → 도구는 문제에 맞춰 고르는 것. 연산 생태계가 필요하면 Python이 맞고, 적응할 의지가 있음

---

## 2. Apache Airflow / 데이터 파이프라인 — "Airflow 안 써봤는데?"

> 관련: [[Spring-Batch-Essentials|Spring Batch]], [[Event-Driven-Patterns|이벤트 드리븐]], [[Idempotency|멱등성]], [[Delivery-Semantics|전달 보장]], [[Messaging-Patterns|메시징 패턴]]

**솔직한 출발점**: Airflow 자체는 운영해본 적 없습니다. 하지만 Airflow가 푸는 문제 — **스케줄 기반 배치, 작업 간 의존성, 재시도, 실패 복구, 멱등성** — 는 다른 도구로 반복해서 다뤘습니다.

**다리를 놓는 답변 (인접 경험)**
- 외부 연동에서는 호출 제한, 재시도와 실패 복구를 함께 설계한다.
- 스케줄 기반 작업에서는 실행 시점, 재시도 정책과 멱등성을 분리해 검증한다.
- 큐 기반 처리에서는 상태 전이, DLQ와 멱등성 키로 실패 복구 경계를 둔다.
- → Airflow의 핵심 개념(**DAG = 작업 의존 그래프, Operator, retry, backfill, idempotent task**)은 인접한 설계 원칙으로 연결할 수 있다. 도구 문법과 운영 모델은 별도로 학습한다.

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
- **인덱스**: PG는 GIN/GiST/BRIN 등 다양한 접근 방법을 제공한다. **GiST는 공간과 범위 데이터**, BRIN은 물리 저장 순서와 강하게 상관된 매우 큰 테이블에 유용하다. 좌표, 궤도와 시간 범위는 실제 질의와 좌표 모델이 맞을 때만 이러한 인덱스를 검토한다.
- **기본 격리 수준**: 둘 다 차이가 있음 — MySQL InnoDB는 REPEATABLE READ, PG는 READ COMMITTED가 기본
- **타입, 확장**: PG는 JSONB, 배열, 확장(PostGIS 등) 강력 — PostGIS는 지리/공간 연산, 우주 도메인과 연관 가능성

**꼬리 질문 대비**
- "왜 우주 데이터에 PostgreSQL을 검토할 수 있나?" → 공간 인덱스(GiST), PostGIS, BRIN과 수치 타입은 후보가 될 수 있다. 다만 궤도 계산은 좌표계, 수치 라이브러리와 실제 질의가 더 중요하므로 제품 요구로 검증한다.
- "MySQL 깊이가 PG로 전이되나?" → 인덱스 원리, 실행계획 읽기, 격리 수준, 복제는 RDB 공통. 도구별 차이(MVCC 구현, VACUUM, 인덱스 종류)만 추가 학습하면 됨
- "MySQL Gap Lock 아나?" → REPEATABLE READ에서 팬텀 방지를 위해 인덱스 범위에 거는 락. PG는 MVCC 스냅샷으로 접근이 다름

---

## 4. NoSQL (MongoDB / Redis) — 언제, 왜

> 관련: [[MongoDB-Schema-Design|MongoDB 스키마 설계]], [[Redis|Redis]], [[Redis-Data-Structures|Redis 자료구조]], [[Cache-Strategies|캐시 전략]], [[Redis-Streams-PubSub|Redis Streams, PubSub]]

**출발점**: 문서형 모델과 관계형 모델은 접근 패턴과 정합성 요구가 달라, 구조화된 관계와 트랜잭션 요구가 커질 때는 관계형 모델을 검토한다. Redis는 캐시와 동시성 제어의 맥락에서 이해한다.

**답변 골격**
- **MongoDB**: 스키마가 유동적이거나 문서 단위 접근이 지배적일 때 적합하다. 정형 데이터와 관계가 중요해지면 RDB를 비교한다.
- **Redis**: 캐시(조회 빈도 높은 데이터), 분산락, 레이트 리미팅, 세션, Streams로 경량 큐를 검토할 수 있다. 우주 데이터 파이프라인에서는 **수집 버퍼, 핫 데이터 캐시, 중복 수집 차단(SET NX)** 같은 보조 역할이 후보가 된다.
- 핵심은 "NoSQL이 좋다/나쁘다"가 아니라 **데이터 접근 패턴에 맞춰 고르는 것**

**꼬리 질문 대비**
- "MongoDB에서 MySQL로 왜 갔나?" → 정부 표준 DB의 정형 데이터를 활용해야 했고 관계, 정합성 요구가 커짐. 스키마리스의 자유가 오히려 데이터 일관성 부채가 됨
- "Redis 영속성은?" → RDB 스냅샷과 AOF를 조합할 수 있다. 캐시 용도면 손실 허용 범위를 정하고, 큐나 상태 저장에 쓴다면 복구 목표, fsync 정책과 별도 정본 저장소를 먼저 검토한다.
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

**답변 연결**: 동시 상태 갱신의 정합성, 이벤트 기반 후속 처리, 실행계획 기반 저장 구조와 조회 경로의 분리라는 판단 기준으로 설명한다.

**꼬리 질문 대비**
- "수집 폭주(트래픽 spike)는?" → 큐로 버퍼링하고 워커를 큐 깊이와 처리율로 조절하며, 백프레셔를 둔다. 적체가 계속되면 수용량 제한, 우선순위와 의도적인 부하 절감 정책을 정한다. DLQ는 처리 불가능한 메시지의 격리 경로이지 적체 해소 수단은 아니다.
- "데이터가 늦게 도착하면(late arrival)?" → 시계열에서 흔함. 이벤트 시각 기준 처리 + 워터마크, 늦은 데이터는 별도 backfill 경로
- "정확히 한 번 처리(exactly-once)는?" → 많은 큐의 전달은 at-least-once를 전제로 한다. 명시한 멱등성 경계 안에서 멱등성 키와 upsert로 중복 효과를 막고, 저장소와 외부 부작용의 원자성은 별도로 설계한다.
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
- **모듈 설계**: 도메인별 모듈 분리, 동적 모듈로 설정 주입 — 실제 기능을 모듈 경계로 분리하고 설정을 주입한 경험
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
