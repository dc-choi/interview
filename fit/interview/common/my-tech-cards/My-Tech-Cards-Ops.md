---
tags: [fit, interview, common, my-answers, tech]
status: done
category: "Interview - 내 답변 마스터"
aliases: ["내 기술 답변 마스터 — 관측, 인프라, 아키텍처", "My Tech Cards Ops"]
---

# 내 이력서 기반 기술 답변 카드 — 관측, 인프라, 아키텍처 (카드 5, 6, 7, 8)

> [[My-Tech-Cards|TOC]], [[My-Tech-Cards-Data|데이터/메시징 (카드 1, 2, 3, 4)]], [[My-Tech-Cards-Extended|심화 비교, 꼬리]]

## 카드 5: Grafana/Prometheus/Loki 관측 인프라

**결론**: 로그, 메트릭 수집 + Grafana Alerting으로 **서비스와 인프라 정적 임계 경보를 운영**(Error rate 1% `for:5m`, Event Loop Lag 100ms 3분 등) → 병목 조기 탐지 + 장애 대응 속도 향상. SLO 경보로 개선한다면 사용자 영향 SLI와 목표 기간을 정한 뒤 multi-window, multi-burn-rate를 별도로 적용.

**실제 운영 범위**: `x-request-id`를 JSON 로그에 남기고 prom-client 메트릭은 method, 정규화한 route, status만 제한된 label로 사용하며 latency는 request-duration histogram으로 관측. OpenTelemetry trace pipeline과 exemplar를 실제로 구축했다는 근거는 현재 정본에 남아 있지 않다.

**3축 확장 설계**: Metrics(Prometheus) + Logs(Loki) + Traces(OpenTelemetry)를 잇는다면 trace context를 HTTP와 큐 경계까지 전파하고, **메트릭은 traceId label 대신 exemplar**, 로그는 본문 또는 structured metadata의 traceId, 트레이스는 자체 traceId로 연결한다.

**도메인 매핑 placeholder**:
- {회사} → "{회사 SLO, 핵심 지표} 기준으로 알림 임계 설계 가능"

**왜 GPL 스택 자체 호스팅 (vs Datadog/ELK/CloudWatch)**:
- **Datadog**: SaaS라 운영 부담은 낮지만 호스트, 커스텀 메트릭, 로그 사용량에 따라 비용이 늘어난다. 데이터량과 보존 기간, 자체 운영 인건비를 같은 조건으로 산정해 ROI를 판단
- **ELK**: Elastic 라이선스 변경 + 운영 부담 (인덱스 회전, shard 관리) 큼
- **CloudWatch**: AWS 락인 + 대시보드 표현력, alerting 유연성 부족
- **GPL(Prometheus+Loki+Grafana)**: 오픈소스, 운영 인력 적정, 자체 호스팅 비용 예측 가능. **회사 매출 단계와 운영 인력 규모를 같이 본 결정** (시솔지주 학습의 적용)

**꼬리 대비**:
- **"RED vs USE?"** → RED(Rate/Errors/Duration, API 서비스) / USE(Utilization/Saturation/Errors, DB, 큐 리소스)
- **"임계값을 어떻게 정하나?"** → 에러율과 레이턴시는 사용자 영향 SLI, 목표 기간과 SLO에서 burn rate를 역산. Event Loop Lag, CPU, Replica Lag 같은 원인 지표는 정상 구간의 baseline과 포화 지점을 바탕으로 별도 임계 설정
- **"카디널리티 폭발은?"** → 실제 운영에서는 userId, requestId 같은 고카디널리티 값을 Prometheus label에 넣지 않고 requestId를 로그 본문으로 추적했습니다. 트레이싱까지 확장하면 메트릭은 exemplar, 로그는 본문 또는 structured metadata로 traceId를 연결합니다.
- **새벽에 장애가 나면 어떤 순서로 대응하나?**: 가장 먼저 상황을 팀에 전파합니다. 혼자 조용히 고치려다 영향 범위나 다른 작업과의 충돌을 놓치는 게 더 큰 리스크라, 무엇이 어디서 터졌는지 먼저 공유하고 대응을 시작합니다. 그다음 지표로 에러가 어디서 나는지 좁혀 우선 비즈니스를 정상으로 되돌리는 임시 조치나 버그 수정을 하고, 원인과 조치 내역은 급한 불을 끈 뒤 포스트모템으로 정리해 공유합니다. 전파를 먼저 두는 이유는 알림이 사람을 부르는 순간 가장 비싼 게 시간이라, 한 명이 더 빨리 붙거나 영향받는 쪽이 미리 대비하게 만드는 게 복구를 앞당기기 때문입니다.
- **"포스트모템?"** → 타임라인(발생→감지→대응→복구) + 근본 원인 + 영향 범위 + 재발 방지 액션. blameless 원칙
- **"통계 알림이 단발 크리티컬 에러를 가리지 않나?"** (키노 1차 실전) → 맞음. 비율 기반 경보는 모수가 크면 **단 한 건(결제나 발주 실패)을 평균에 묻음**. 당시에는 ① 에러율과 레이턴시의 지속 임계 경보 ② **크리티컬 건별** Slack 웹훅을 분리했고, SLO burn-rate는 지금 다시 설계할 때의 개선안으로 구분

## 카드 6: Docker 멀티스테이지 + ECS Fargate 전환 (3단계 점진)

**결론**: 단일 NGINX 서버 → **CloudFront + ALB(L7 웹) + NLB(L4 IoT 고정 IP) + ECS Fargate** 아키텍처로 전환. Docker 멀티스테이지로 이미지 **909MB → 513MB (43% 감소)**, 배포 시간 **3분 10초 → 2분 20초 (26% 단축)**. Read Replica로 조회와 쓰기 부하를 분리했지만 조회 40%, DB CPU 30% 수치는 baseline, 기간과 측정 방법이 현재 기록에 없어 정확한 성과 수치로 사용하지 않음.

**3단계 점진 전환**: ① **컨테이너+LB**(ALB/NLB 이중 + CloudFront + Rolling 무중단) → ② **이벤트 분리**(EventBridge+SQS) → ③ **DB 읽기/쓰기 분리**(실제: Prisma 조회를 RDS Read Replica로 라우팅, 정확한 client 분기 구현은 현재 기록에 없음). transaction과 쓰기 직후 읽기는 Primary에 고정. 지금 구현한다면 primary/replica 별도 client를 쓰거나, Prisma 7+에서 Driver Adapter 또는 Accelerate와 `@prisma/extension-read-replicas`를 사용.

**왜 ALB + NLB 이중**: IoT 디바이스가 펌웨어에 IP 하드코딩 → **NLB의 고정 IP(Elastic IP) 필요**. 웹 트래픽은 ALB로 경로 기반 라우팅. 당시에는 요구와 운영 경계를 분리했지만 두 트래픽을 한 구조로 조합하는 것이 불가능한 것은 아니며, 필요하면 NLB의 ALB target 구성을 검토.

**왜 Rolling (vs Blue/Green)**: Rolling은 점진 교체 (리소스 절약), Blue/Green은 환경 2배 필요. **비용 고려해 Rolling 선택**. 즉시 롤백 필요한 운영 단계 도달하면 Blue/Green 재고.

**왜 ECS Fargate (vs EKS)**: 운영 인력 부족 + 트래픽 규모에서 K8s 오버헤드가 가치 대비 컸음. ECS Fargate는 마이그레이션 비용, 운영 부담 모두 낮음.

**도메인 매핑 placeholder**:
- {회사} → "{회사 트래픽, 운영 규모}에서도 K8s 도입 시점은 운영 인력, 트래픽 임계 함께 봐야"

**꼬리 (핵심)**:
- **"오토스케일링 기준?"** → **실제 운영**은 API 서버 CPU 임계를 처음 60%에서 여유를 둔 50%로 내리고, 큐 워커는 `ApproximateNumberOfMessagesVisible`의 raw queue depth를 기준으로 삼았습니다. **지금 다시 설계한다면** raw depth는 task 수를 정규화하지 못하므로 `visible messages ÷ running tasks`인 backlog per task를 target tracking에 쓰고, 목표값은 `허용 지연 ÷ 평균 처리 시간`으로 역산합니다. `ApproximateAgeOfOldestMessage`는 처리 지연 경보로 별도 확인합니다.
- **"리전 장애 DR은?"** → 당시에는 비용과 운영 여건 때문에 교차 리전 DR을 구축하지 못했습니다. 지금 설계한다면 먼저 RTO와 RPO를 정하고, 백업 복원, pilot light, warm standby와 active-active 중 비용에 맞는 수준을 고릅니다. Multi-AZ만으로는 리전 장애를 덮지 못하므로 데이터 복제와 정합성 확인, DNS 또는 클라이언트 재연결, 실제 전환과 복귀 훈련까지 성공 조건에 포함합니다. [[DR-Strategy|DR 전략 정본]]
- **"Replication Lag?"** → 쓰기 직후 강한 일관성 필요한 조회는 **Primary 분기**, 대시보드/리포트 같은 약간 지연 허용은 Replica
- **"Graceful Shutdown?"** → ECS SIGTERM → 진행 중 요청 완료 → 새 요청 거부 → 타임아웃 후 SIGKILL. NestJS `enableShutdownHooks()`. SQS 워커는 현재 메시지 완료 후 종료 — 미완료는 visibility timeout 만료 후 재전달
- **"환경변수와 시크릿은 어떻게 관리?"** (키노 1차 실전, 현 답변 약했음) → 현재는 GitHub Actions Secrets에 두고 배포 시 주입. 다만 회전과 감사, 세분 권한이 약해 정공법은 **런타임 비밀은 AWS Secrets Manager(자동 회전)나 SSM Parameter Store(SecureString, KMS 암호화)**, 빌드타임 자격증명은 **OIDC로 장기 액세스 키 제거**. 비용이 우선이면 Parameter Store, 자동 회전이 필요하면 Secrets Manager. 코드와 이미지에 평문 금지, KMS 키 정책으로 접근 최소화

> ⚠️ **이미지 경량화 디테일, alpine vs distroless, K8s 전환 시점**: [[My-Tech-Cards-Extended#카드 6 아키텍처 전환 심화|Extended]]

## 카드 7: 클린 아키텍처 + NestJS 모듈 설계

**결론**: **Clean Architecture 스타일로** Controller(Interface Adapters) → UseCase(Application) → DomainService(핵심 비즈니스) → Repository port → Prisma Client(External Infrastructure)를 분리. **UseCase별로 사용자 의도 분리** (JSON response용 vs 엑셀 다운로드용) → 핵심 비즈니스 변경의 영향을 작게 유지.

**왜 이렇게 분리**: 트라이포드랩 대형 고객사(제약바이오 280억, F&B 2000억) PoC에서 **고객사별 커스텀 요구를 UseCase 레벨에서만 분기** → 핵심 도메인은 공유. 도메인 로직 변경 시 영향 범위를 예측 가능하게 만들었습니다.

**DI 원리**: NestJS IoC 컨테이너가 Provider의 생성, 주입과 생명주기를 관리합니다. class provider는 `@Module({ providers: [...] })`에서 등록하고, `@Injectable()`은 컨테이너가 관리할 클래스임을 표시하고 생성자 주입에 필요한 메타데이터를 남깁니다. Repository interface는 런타임에 사라지므로 `@Inject(ORDER_REPOSITORY)` 같은 Symbol token 또는 abstract class로 명시 바인딩합니다.

**순환 참조**: `forwardRef()`로 임시 해결 가능하지만 **근본은 모듈 의존 방향을 단방향으로 설계**. 순환이 자주 생기면 모듈 경계 재설계 신호.

**NestJS 모듈 폴더 구조 예시**:
```
src/orders/
├── orders.module.ts
├── interface/         # Controller, DTO (외부 input/output)
│   ├── orders.controller.ts
│   └── dto/
├── application/       # UseCase (도메인 + infra 조합)
│   ├── create-order.usecase.ts
│   └── ports/         # Repository Interface
├── domain/            # 순수 도메인 (외부 의존 0)
│   ├── order.entity.ts
│   └── order.service.ts
└── infrastructure/    # Prisma, 외부 API 구현체
    └── prisma-order.repository.ts
```
의존 방향: interface → application → domain ← infrastructure. 의존성 역전으로 domain은 외부 구현을 모름.

**꼬리**:
- **"Guard vs Middleware vs Interceptor?"** → Middleware(Express 호환 요청 전처리) / Guard(인가, 인증 true/false) / Interceptor(요청, 응답 양쪽 변환, RxJS 스트림 캐싱, 로깅)
- **"요청 라이프사이클 순서?"** (키노 1차 실전, 순서 헷갈림) → **Middleware → Guard → Interceptor(전) → Pipe → Controller/Handler → Interceptor(후) → Exception Filter**. 가드가 인터셉터보다 **먼저** — 인가 실패면 인터셉터와 파이프 비용을 안 치르고 끊음. 예외는 어느 단계에서 터지든 Exception Filter로 모임
- **"Provider scope?"** → DEFAULT(싱글톤, 대부분) / REQUEST(요청마다, 테넌트 컨텍스트) / TRANSIENT(주입마다)
- **"클린 아키텍처 도입 효과 정량?"** → 고객사별 커스텀 분기 시 핵심 도메인 변경 0건 유지

## 카드 8: 캐시 전략 — Cache-Aside + 스탬피드 방어

**결론**: **Cache-Aside를 기본으로 검토**합니다. 시솔지주에서 Google 번역 API 메타데이터를 매 요청마다 호출하던 것을 **서버 시작 시 1회 로드 + DB 캐시 전환** → API latency **3초 → 0.9초 (70% 개선)**. 이 경험의 서버 시작 적재는 Cache Warming이고, Cache-Aside는 요청 미스 시 원본을 읽어 적재하는 별도 패턴입니다.

**무효화**: Cache-Aside는 TTL을 안전망으로 두고 DB 커밋 뒤 캐시를 evict합니다. Write-Through는 캐시와 DB를 함께 갱신하는 별도 선택지이지만, 두 저장소의 원자성을 자동 보장하지 않아 부분 실패와 순서 역전 복구가 필요합니다. 도메인별 무효화 전략은 명문화 필수.

**캐시 스탬피드**: 인기 키 만료 직후 동시 미스 → DB 폭주. 해법: **TTL jitter(동시 만료 방지) + 만료 전 백그라운드 갱신 + mutex lock(한 요청만 DB 조회 후 캐시 갱신)**.

**Cache Warming vs Cache-Aside vs Write-Through**: Cache Warming은 요청 전 미리 적재, Cache-Aside는 읽기 미스 시 원본 조회 후 적재하고 쓰기 뒤 evict, Write-Through는 쓰기 시 캐시와 DB를 함께 갱신합니다. **대부분 Cache-Aside + TTL이 시작점**입니다.

**Redis 죽으면**: 캐시는 보조 계층이라 DB fallback. 단 **캐시 아발란체** 위험 → DB 커넥션 풀 제한 + rate limiting으로 보호.

**자료구조별 실전 활용**:
- **Sorted Set** — 랭킹(`ZADD leaderboard 1500 account:42`), 시간 기반 큐와 sliding-window log rate limit. 멤버별 자동 TTL은 없으므로 밀리초 epoch를 score로 저장하고 `ZREMRANGEBYSCORE`로 지난 항목을 명시적으로 정리
- **Stream** — append-only log, consumer group, ACK와 replay가 필요한 작은 이벤트 흐름에 사용. Kafka와 달리 persistence, replication과 장애 복구 보장 경계는 별도 검토
- **HyperLogLog** — 대규모 고유 방문자 수를 최대 약 12KB 상태로 근사. 원소 자체와 정확한 목록은 복원할 수 없음
- **Bitmap** — 출석/플래그 (1년 365비트 = 46바이트 payload, Redis key와 객체 오버헤드는 별도)
- **Hash** — 객체 (`HSET account:42 tier 4`) — String 다중 키보다 메모리 효율

**꼬리**:
- **"Cluster와 Sentinel은?"** → Cluster는 16384 hash slot으로 샤딩하고 자체 failover를 제공하며, Sentinel은 샤딩 없이 primary-replica HA만 제공합니다. 멀티테넌트 key prefix는 이름 충돌을 피하는 논리 namespace일 뿐 접근 격리는 아니므로, 권한 분리는 ACL 또는 별도 Redis 인스턴스로 설계합니다.
- **외부에서 주기적으로 가져오는 데이터(스크래핑 등)의 캐시 신선도와 정확성은?**: 외부에서 주기적으로 가져오는 데이터는 캐시의 신선도와 정확성을 따로 설계합니다. 소스가 콘텐츠를 올리고 내리는 빈도에 맞춰 TTL을 잡되, 변경이 잦은 항목은 짧은 TTL과 백그라운드 갱신으로 stale을 줄이고, 가져오는 단계에서 스키마 검증과 부분 실패 격리를 두어 한 항목의 스크래핑 오류가 전체 동기화를 막지 않게 합니다. 소스 서버나 수집 서버가 죽었을 때는 마지막으로 성공한 스냅샷을 계속 보여주도록 폴백을 두고, 실패가 누적되면 알림으로 사람을 부릅니다. 캐시를 단순 속도 계층이 아니라 외부 의존성이 흔들릴 때 서비스를 버티게 하는 완충 계층으로 봅니다. (키노 OTT 가용성 데이터 최신성 직결.)

## 관련 문서

- [[My-Tech-Cards|TOC + vault 카테고리 인덱스]]
- [[My-Tech-Cards-Data|데이터/메시징 (카드 1, 2, 3, 4)]]
- [[My-Tech-Cards-Extended|심화 비교 표, 꼬리 풀]]
