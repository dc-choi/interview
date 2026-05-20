---
tags: [fit, interview, spacemap]
status: done
category: "Interview - Fit"
aliases: ["SpaceMap 이력서 기술 질문", "스페이스맵 이력서 기반 기술 질문"]
---
# 스페이스맵 1차 — 이력서 기반 기술 질문

> 상위 TOC: [[Interview-Prep-SpaceMap|스페이스맵 1차 면접 준비]]

모든 답변을 **"데이터 수집·처리 파이프라인"** 축으로 모을 것. 스페이스맵의 우주 데이터는 대용량·시계열로 가정하고, IoT 디바이스 데이터 경험을 그 맥락으로 번역해 어필한다.

---

## 1. DB Lock으로 수천 대 IoT 동시 요청의 정합성 확보 — 데이터 수집 단계의 정합성

> 관련: [[Lock|DB Lock]], [[Transaction-Lock-Contention|트랜잭션·락 경합]], [[Race-Condition-Patterns|레이스 컨디션 패턴]], [[Distributed-Lock|분산락]]

**경험 요약**
- 수천 대 IoT 디바이스가 같은 품목 재고를 동시 갱신 → Lost Update 발생
- `SELECT FOR UPDATE NO WAIT`로 품목 단위 Row Lock + 100ms 간격 3회 재시도 (디바이스 타임아웃 1초 내 수락/거절 결정)
- Lock 순서를 품목 ID 오름차순으로 통일 → 데드락 회피
- 트랜잭션 범위 최소화 (조회·검증은 트랜잭션 밖, Lock 구간은 갱신만)

**스페이스맵 데이터 수집 맥락 연결**
- 여러 데이터 소스(관측소·위성·외부 API)가 같은 대상(특정 위성·궤도 객체)의 상태를 동시에 보고하는 시나리오 = 동일한 동시 갱신 패턴
- 멱등성 키(객체 ID + 관측 시각)로 **중복 수집 차단**, Row Lock으로 최신 상태 갱신의 원자성 확보

**꼬리 질문 대비**
- "Optimistic vs Pessimistic?" → 수집 빈도 높고 충돌 잦으면 Pessimistic. 충돌 드물면 version 컬럼 Optimistic. IoT는 동일 품목 동시성이 잦아 Pessimistic 선택
- "분산락(Redis Redlock)은 왜 안 썼나?" → 단일 RDS면 DB Lock으로 충분. 별도 인프라 의존성·네트워크 레이턴시 리스크 회피. 샤딩이 들어가면 그때 분산락 검토
- "`NO WAIT` vs `SKIP LOCKED`?" → 특정 레코드를 반드시 처리해야 하면 NO WAIT, 작업 큐처럼 아무거나 집어 분배하면 SKIP LOCKED

---

## 2. 복합 인덱스로 슬로우 쿼리 99.3% 개선 — 대용량 시계열 데이터의 핵심

> 관련: [[Index|인덱스]], [[Covering-Index|커버링 인덱스]], [[Execution-Plan|실행계획]], [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]], [[MySQL-Slow-Query-Diagnosis|슬로우 쿼리 진단]]

**경험 요약 (포트폴리오 STAR)**
- IoT 데이터 테이블 100만 건, 디바이스 850대, "특정 디바이스 최신 상태 조회" 서브쿼리가 2000ms+
- `EXPLAIN ANALYZE`로 `ORDER BY created_at DESC` 후 9000행 filesort 확인
- 카디널리티 분석 → 복합 인덱스 `(device_number, created_at DESC, id DESC)` — 필터+정렬을 인덱스 스캔 1탐색으로
- 결과: 쿼리 1건 15.4ms → 0.1ms (154배), 850대 기준 5분 15초 → 2초. **3000대로 확장 시에도 144분 → 7.2초** — 데이터량과 무관한 구조

**스페이스맵 우주 데이터 맥락 연결**
- 우주 데이터는 시계열로 끝없이 쌓임 (관측 로그·궤도 이력). "특정 객체의 최신/기간별 상태 조회"는 가장 흔한 패턴
- 핵심은 **데이터가 아무리 쌓여도 인덱스 1탐색으로 끝나는 구조** — 이게 데이터 엔진의 성능 안정성
- 시계열 특성상 파티셔닝([[MySQL-Partitioning]])·커버링 인덱스도 함께 검토 가능

**꼬리 질문 대비**
- "복합 인덱스 컬럼 순서 기준?" → 동등 조건(=) 앞, 범위(>, BETWEEN) 뒤, 카디널리티 높은 컬럼 앞. 정렬 컬럼은 ORDER BY 방향까지 인덱스에 반영
- "인덱스 많이 만들면?" → SELECT는 빨라지나 INSERT/UPDATE마다 인덱스 갱신 비용. 수집이 쓰기 중심이면 인덱스 개수 신중히
- "커버링 인덱스?" → 쿼리가 필요로 하는 모든 컬럼이 인덱스에 포함 → 테이블 랜덤 I/O 회피

---

## 3. Prisma N+1 → MySQL SubQuery 단일 쿼리로 API 90% 개선 — ORM 한계 인식

> 관련: [[ORM-Impedance-Mismatch|ORM 임피던스 불일치]], [[ORM|ORM]], [[SQL-Joins|SQL 조인]], [[Execution-Plan|실행계획]]

**경험 요약**
- 테이블 JOIN이 필요한 기능에서 API 응답 100ms → 1000ms
- Prisma가 JOIN 미지원 → 4개 개별 쿼리 순차 실행이 원인. HTTP Client로 지연 측정, 로그로 4쿼리 확인
- 공식 문서에서 `relationLoadStrategy` 발견 → 적용 시 SubQuery + JSON 함수 방식으로 동작, 실행계획 비교 후 SubQuery가 우수함을 검증
- 결과: 4개 개별 쿼리 → 1개 복합 SubQuery, 82~90% 개선

**스페이스맵 맥락 연결**
- 데이터 엔진은 ORM 추상화 뒤에서 실제로 어떤 쿼리가 나가는지가 성능을 좌우. ORM을 쓰되 **실행계획까지 검증**하는 습관
- "AI나 ORM에 의존하지 않고 공식 문서·실행계획으로 검증" — 딥테크 환경에서 중요한 태도

**꼬리 질문 대비**
- "왜 Raw Query를 안 썼나?" → Raw Query는 마지막 수단. ORM 기능으로 해결되면 타입 안정성·유지보수성 유지가 낫다고 판단. 실행계획상 우수함을 확인하고 결정
- "Prisma 말고 다른 ORM은?" → TypeORM·Kysely·Drizzle 등. 쿼리 빌더 성격이 강한 Kysely는 복잡 쿼리에 유리. 팀 표준·타입 안정성 기준으로 선택

---

## 4. EventBridge + SQS 이벤트 아키텍처 — 데이터 파이프라인 단계 분리

> 관련: [[EventBridge|EventBridge]], [[SQS|SQS]], [[Messaging-Patterns|메시징 패턴]], [[Delivery-Semantics|전달 보장]], [[Event-Driven-Patterns|이벤트 드리븐 패턴]], [[MQ-Kafka|MQ·Kafka]]

**경험 요약**
- 발주(핵심 도메인) → SQS → 후속 처리(카톡·이메일·발주서) 병렬 분리
- 채널별 DLQ, 멱등성 키(발주 ID) + status 머신(`PENDING/PROCESSING/COMPLETED/FAILED`) + `processing_started_at`으로 워커 crash 복구
- 비용 비교: MSK $574/월 vs EventBridge+SQS $0~18/월 — 도메인 특성(실시간 불요, 최종 일관성 OK)으로 SQS 선택, Kafka 대비 99.99% 비용 절감

**스페이스맵 데이터 파이프라인 맥락 연결**
- 데이터 수집·처리 파이프라인 = 수집 → 검증 → 가공 → 저장 → API 노출의 단계 분리. 각 단계를 이벤트로 느슨하게 연결하면 단계별 독립 확장·재처리 가능
- 수집은 빠르게 받아 큐에 적재, 무거운 연산(궤도 계산 등)은 워커에서 비동기 — backpressure 흡수

**꼬리 질문 대비**
- "언제 Kafka가 필요?" → 이벤트 리플레이, 순서 보장, 초당 수만 건 이상, 스트림 처리. 우주 데이터가 고빈도 스트림이면 Kafka·Kinesis 검토 — 도메인 트래픽 특성에 따라 결정
- "메시지 유실은?" → SQS at-least-once → 멱등성 키 필수. 워커는 처리 전 status 확인
- "순서가 중요하면?" → SQS FIFO(300 TPS 제한) 또는 표준 SQS + 시퀀스 ID. Kafka는 파티션 키 단위 순서 보장

---

## 5. 단일 서버 → CloudFront + ELB + ECS 아키텍처 전환 — 확장성

> 관련: [[ECS|ECS]], [[CDN|CDN]], [[Load-Balancer|로드 밸런서]], [[Scale-Up-vs-Out|스케일 업 vs 아웃]], [[Traffic-Scaling-Playbook|트래픽 스케일링]]

**경험 요약**
- 단일 EC2(Nginx+App 컨테이너)에서 트래픽 급증 → CPU/메모리 포화, 배포 시 전체 중단 위험, 정적/API 혼재로 응답 지연
- CloudFront(정적·엣지) + ALB(웹 트래픽 분산) + ECS Fargate(API) + **NLB(IoT 디바이스 고정 IP 통신용 별도 구성)** + RDS Read Replica
- ECS Rolling Update 무중단 배포 + 오토스케일링

**스페이스맵 맥락 연결**
- 데이터 엔진은 수집 부하와 조회 부하 성격이 다름 → 컴포넌트 분리·독립 스케일링이 핵심
- IoT 디바이스용 NLB를 따로 둔 경험 = "특수한 통신 요구를 가진 데이터 소스"를 별도 처리한 사례 → 우주 관측 장비·외부 시스템 연동에 응용 가능

**꼬리 질문 대비**
- "왜 ECS, K8s 아님?" → 기존 Docker 환경 그대로 확장 가능 + 운영 인력 적은 스타트업에 Fargate 관리 부담이 낮음. 규모·팀 커지면 EKS 검토
- "오토스케일링 기준 지표?" → CPU·메모리·ALB 요청 수·SQS 큐 깊이. 워커는 큐 깊이 기반이 적합

---

## 6. RDS Read Replica로 읽기 부하 분산 — 수집(쓰기)·조회(읽기) 분리

> 관련: [[Read-Replica-Routing|Read Replica 라우팅]], [[Replication|복제]], [[RDS-Aurora|RDS·Aurora]]

**경험 요약**
- IoT 디바이스가 일정 주기로 데이터를 전송하는 **쓰기 중심 구조**, 하루 5만 건 쓰기 → 조회 응답 2~3초 지연
- Read Replica 도입, Prisma에서 조회 쿼리를 Replica로 라우팅 (동시성 중요 로직은 Primary 유지)
- ReplicaLag을 CloudWatch·Grafana로 모니터링, Lag 상승은 인프라 차원 대응
- 결과: 주요 조회 API 40% 개선, DB CPU 30% 감소

**스페이스맵 맥락 연결**
- 데이터 수집 파이프라인은 본질적으로 쓰기 중심, API 서버는 읽기 중심 → Primary/Replica 분리는 자연스러운 설계
- Replication Lag을 어디까지 애플리케이션이 감내하고 어디부터 인프라로 처리할지 판단한 경험

**꼬리 질문 대비**
- "Replica에서 읽으면 stale data 문제는?" → 정합성이 중요한 읽기는 Primary, 통계·대시보드성 읽기는 Replica. 라우팅 정책을 쿼리 성격별로 분리
- "Lag이 계속 커지면?" → Replica 스케일업, 쓰기 배치화, 읽기 캐시 계층 추가([[Cache-Strategies]])

---

## 7. Grafana / Prometheus / Loki 관측 인프라 직접 구축 — 데이터 엔진 안정성

> 관련: [[Observability|관측 가능성]], [[Log-Pipeline|로그 파이프라인]], [[Structured-Logging|구조적 로깅]], [[Logs-vs-Metrics|로그 vs 메트릭]], [[Application-Performance-Monitoring|APM]]

**경험 요약**
- Prometheus + Thanos(메트릭, S3 장기보관) + Loki(로그) + Grafana — GPL 스택 자체 호스팅 (Datadog 대비 비용·종속성 회피)
- SLO 기반 Alerting: Error/Warn Rate(5분 1%↑), Slow SQL(≥500ms 3회↑), RDS CPU(75%↑), ReplicaLag(5초↑), Event Loop Lag(100ms↑) — `for: 5m`으로 단발 spike 필터링
- 요청별 메트릭(method/route/status/duration) + TraceId 미들웨어로 요청 단위 추적

**스페이스맵 맥락 연결**
- 데이터 엔진은 "조용히 틀리는" 게 가장 위험 — 수집 누락·연산 지연·Lag을 메트릭으로 조기 탐지하는 체계가 필수
- 미 우주군·우주청 과제 = 신뢰성이 곧 계약 조건. SLO 기반 운영 문화 경험이 직결

**꼬리 질문 대비**
- "왜 직접 구축? Datadog 안 쓴 이유?" → 초기 트래픽에서 Datadog는 과다 비용 + AWS 종속. GPL 스택은 비용·확장성·자율 운영 균형이 우수
- "트레이싱은?" → OpenTelemetry 분산 트레이싱. 수집→가공→저장 흐름 추적 시 필수 검토
- "카디널리티 폭발은?" → userId·traceId 같은 고유 식별자는 라벨에서 제외, route 정규화, Drop stage로 불필요 필드 제거

---

## 8. (차별화 카드) AI 협업 파이프라인 재설계 — 1인 운영의 구조적 해법

> 관련: [[Harness-Engineering|하니스 엔지니어링]], [[AI엔지니어링(AIEngineering)|AI 엔지니어링]]

**경험 요약**
- Claude Code를 코드 생성 도구가 아닌 **개발 파이프라인 자체**로 재설계: 계층형 CLAUDE.md(컨텍스트 폭주 차단), Subagent·Custom Skill, Stop Hook 자가 리뷰, PostToolUse lint/typecheck, 통합테스트 mock 전면 제거 후 실DB 검증
- 결과: 운영 배포 주기 월평균 7건 → 31.5건(4.5배), **출석부 99개 모임 멀티테넌트 SaaS** 무중단 운영 (학생 2,800·출석 13K)

**스페이스맵 맥락 연결**
- "강한 몰입·업무 강도" 환경에서 *개인 생산성을 구조로 끌어올린* 사례 — 단순 야근이 아니라 파이프라인 설계로 처리량을 늘림
- 딥테크 스타트업에서 적은 인원으로 많은 걸 해내야 하는 상황과 직접 연결

**꼬리 질문 대비**
- "AI가 만든 코드 품질은?" → Stop Hook 자가 리뷰 + 통합테스트 실DB 검증 + 실행계획 확인. AI를 "1차 작성자"로 두고 사람이 설계·검증을 책임
- "면접 답변도 AI로 준비했나?" → 도구는 정리에 쓰되 판단·근거는 내 것. (담백하게)

---

## 관련 문서
- [[Interview-Prep-SpaceMap|1차 면접 TOC]]
- [[Interview-Prep-SpaceMap-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-SpaceMap-Tech-JD|JD 기반 기술 질문]]
- [[Interview-Prep-SpaceMap-Service|서비스 맥락 + 컬처핏 + 역질문]]
- [[Interview-Prep-SpaceMap-Checklist|면접 준비 체크리스트]]
