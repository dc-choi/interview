---
tags: [fit, interview, common, my-answers, tech]
status: done
category: "Interview - 내 답변 마스터"
aliases: ["내 기술 답변 마스터 — 관측·인프라·아키텍처", "My Tech Cards Ops"]
---

# 내 이력서 기반 기술 답변 카드 — 관측·인프라·아키텍처 (카드 5·6·7·8)

> [[My-Tech-Cards|TOC]] · [[My-Tech-Cards-Data|데이터/메시징 (카드 1·2·3·4)]] · [[My-Tech-Cards-Extended|심화 비교·꼬리]]

## 카드 5: Grafana/Prometheus/Loki 관측 인프라

**결론**: 로그·메트릭 수집 + Grafana Alerting으로 **SLO 기반 경보 정책 정립**(Error rate 1% `for:5m`, Event Loop Lag 100ms 3분 등) → 병목 조기 탐지 + 장애 대응 속도 향상.

**3축 연결**: Metrics(Prometheus, 집계) + Logs(Loki, JSON 구조화) + Traces(OpenTelemetry, 요청 흐름). **TraceId로 3축 연결**이 핵심.

**도메인 매핑 placeholder**:
- {회사} → "{회사 SLO·핵심 지표} 기준으로 알림 임계 설계 가능"

**왜 GPL 스택 자체 호스팅 (vs Datadog/ELK/CloudWatch)**:
- **Datadog**: SaaS 편리하지만 호스트·메트릭·로그 단위 비용이 트래픽 따라 폭주. 작은 팀·중규모 트래픽에서 ROI 약함
- **ELK**: Elastic 라이선스 변경 + 운영 부담 (인덱스 회전·shard 관리) 큼
- **CloudWatch**: AWS 락인 + 대시보드 표현력·alerting 유연성 부족
- **GPL(Prometheus+Loki+Grafana)**: 오픈소스·운영 인력 적정·자체 호스팅 비용 예측 가능. **회사 매출 단계와 운영 인력 규모를 같이 본 결정** (시솔지주 학습의 적용)

**꼬리 대비**:
- **"RED vs USE?"** → RED(Rate/Errors/Duration, API 서비스) / USE(Utilization/Saturation/Errors, DB·큐 리소스)
- **"임계값을 어떻게 정하나?"** → SLO 역산. 사용자 영향 기준 → 에러 예산(예: 99.9% = 월 43분) → 임계 설정
- **"카디널리티 폭발은?"** → Prometheus label 카디널리티 모니터링 + 고카디널리티 label은 별도 추출(traceId 등)
- **"포스트모템?"** → 타임라인(발생→감지→대응→복구) + 근본 원인 + 영향 범위 + 재발 방지 액션. blameless 원칙
- **"통계 알림이 단발 크리티컬 에러를 가리지 않나?"** (키노 1차 실전) → 맞음. SLO 퍼센트 기반은 모수가 크면 **단 한 건(결제나 발주 실패)을 평균에 묻음**. 그래서 알림을 **이원화** — ① 통계형(에러율과 레이턴시 SLO를 Grafana Alerting으로) ② **크리티컬 건별**(결제나 발주는 1건이라도 즉시 Slack 웹훅으로 사람 호출). 기계가 사람을 부르는 알림은 통계 도구가 아니라 **이벤트 트리거**로 따로 둠

## 카드 6: Docker 멀티스테이지 + ECS Fargate 전환 (3단계 점진)

**결론**: 단일 NGINX 서버 → **CloudFront + ALB(L7 웹) + NLB(L4 IoT 고정 IP) + ECS Fargate** 아키텍처로 전환. Docker 멀티스테이지로 이미지 **909MB → 513MB (43% 감소)**, 배포 시간 **3분 10초 → 2분 20초 (26% 단축)**. Read Replica로 조회 API 40% 개선·DB CPU 30% 감소.

**3단계 점진 전환**: ① **컨테이너+LB**(ALB/NLB 이중 + CloudFront + Rolling 무중단) → ② **이벤트 분리**(EventBridge+SQS) → ③ **DB 읽기/쓰기 분리**(Prisma `datasources` Primary/Replica).

**왜 ALB + NLB 이중**: IoT 디바이스가 펌웨어에 IP 하드코딩 → **NLB의 고정 IP(Elastic IP) 필요**. 웹 트래픽은 ALB로 경로 기반 라우팅. 두 종류 트래픽을 한 LB로 못 묶음.

**왜 Rolling (vs Blue/Green)**: Rolling은 점진 교체 (리소스 절약), Blue/Green은 환경 2배 필요. **비용 고려해 Rolling 선택**. 즉시 롤백 필요한 운영 단계 도달하면 Blue/Green 재고.

**왜 ECS Fargate (vs EKS)**: 운영 인력 부족 + 트래픽 규모에서 K8s 오버헤드가 가치 대비 컸음. ECS Fargate는 마이그레이션 비용·운영 부담 모두 낮음.

**도메인 매핑 placeholder**:
- {회사} → "{회사 트래픽·운영 규모}에서도 K8s 도입 시점은 운영 인력·트래픽 임계 함께 봐야"

**꼬리 (핵심)**:
- **"오토스케일링 기준?"** → API 서버: CPU 70% or 요청 수 / 큐 워커: SQS `ApproximateNumberOfMessagesVisible` (큐 depth) 기반
- **"Replication Lag?"** → 쓰기 직후 강한 일관성 필요한 조회는 **Primary 분기**, 대시보드/리포트 같은 약간 지연 허용은 Replica
- **"Graceful Shutdown?"** → ECS SIGTERM → 진행 중 요청 완료 → 새 요청 거부 → 타임아웃 후 SIGKILL. NestJS `enableShutdownHooks()`. SQS 워커는 현재 메시지 완료 후 종료 — 미완료는 visibility timeout 만료 후 재전달
- **"환경변수와 시크릿은 어떻게 관리?"** (키노 1차 실전, 현 답변 약했음) → 현재는 GitHub Actions Secrets에 두고 배포 시 주입. 다만 회전과 감사, 세분 권한이 약해 정공법은 **런타임 비밀은 AWS Secrets Manager(자동 회전)나 SSM Parameter Store(SecureString, KMS 암호화)**, 빌드타임 자격증명은 **OIDC로 장기 액세스 키 제거**. 비용이 우선이면 Parameter Store, 자동 회전이 필요하면 Secrets Manager. 코드와 이미지에 평문 금지, KMS 키 정책으로 접근 최소화

> ⚠️ **이미지 경량화 디테일·alpine vs distroless·K8s 전환 시점**: [[My-Tech-Cards-Extended#카드 6 아키텍처 전환 심화|Extended]]

## 카드 7: 클린 아키텍처 + NestJS 모듈 설계

**결론**: **Controller(Interface Adapters) → UseCase(Application Core) → DomainService(핵심 비즈니스) → Repository Interface → Prisma Client(External Infrastructure)** 5계층 분리. **UseCase별로 사용자 의도 분리** (JSON Response용 vs 엑셀 다운로드용) → 핵심 비즈니스 변경되어도 UseCase별 영향 최소화.

**왜 이렇게 분리**: 트라이포드랩 대형 고객사(제약바이오 280억, F&B 2000억) PoC에서 **고객사별 커스텀 요구를 UseCase 레벨에서만 분기** → 핵심 도메인은 공유. 도메인 로직 변경 시 영향 범위 예측 가능.

**DI 원리**: NestJS IoC 컨테이너가 Provider의 생성·주입·생명주기 관리. `@Injectable` 데코레이터로 등록 → constructor에서 타입 기반 자동 주입.

**순환 참조**: `forwardRef()`로 임시 해결 가능하지만 **근본은 모듈 의존 방향을 단방향으로 설계**. 순환이 자주 생기면 모듈 경계 재설계 신호.

**실제 NestJS 모듈 폴더 구조 예시**:
```
src/orders/
├── orders.module.ts
├── interface/         # Controller·DTO (외부 input/output)
│   ├── orders.controller.ts
│   └── dto/
├── application/       # UseCase (도메인 + infra 조합)
│   ├── create-order.usecase.ts
│   └── ports/         # Repository Interface
├── domain/            # 순수 도메인 (외부 의존 0)
│   ├── order.entity.ts
│   └── order.service.ts
└── infrastructure/    # Prisma·외부 API 구현체
    └── prisma-order.repository.ts
```
의존 방향: interface → application → domain ← infrastructure (Hexagonal — domain은 어디도 모름).

**꼬리**:
- **"Guard vs Middleware vs Interceptor?"** → Middleware(Express 호환 요청 전처리) / Guard(인가·인증 true/false) / Interceptor(요청·응답 양쪽 변환, RxJS 스트림 캐싱·로깅)
- **"요청 라이프사이클 순서?"** (키노 1차 실전, 순서 헷갈림) → **Middleware → Guard → Interceptor(전) → Pipe → Controller/Handler → Interceptor(후) → Exception Filter**. 가드가 인터셉터보다 **먼저** — 인가 실패면 인터셉터와 파이프 비용을 안 치르고 끊음. 예외는 어느 단계에서 터지든 Exception Filter로 모임
- **"Provider scope?"** → DEFAULT(싱글톤, 대부분) / REQUEST(요청마다, 테넌트 컨텍스트) / TRANSIENT(주입마다)
- **"클린 아키텍처 도입 효과 정량?"** → 고객사별 커스텀 분기 시 핵심 도메인 변경 0건 유지

## 카드 8: 캐시 전략 — Cache-Aside + 스탬피드 방어

**결론**: **Cache-Aside 패턴 기본**. 시솔지주에서 Google 번역 API 메타데이터를 매 요청마다 호출하던 것을 **서버 시작 시 1회 로드 + DB 캐시 전환** → API latency **3초 → 0.9초 (70% 개선)**.

**무효화**: TTL 기반 + Write-through 보강. 도메인별 무효화 전략은 명문화 필수.

**캐시 스탬피드**: 인기 키 만료 직후 동시 미스 → DB 폭주. 해법: **TTL jitter(동시 만료 방지) + 만료 전 백그라운드 갱신 + mutex lock(한 요청만 DB 조회 후 캐시 갱신)**.

**Cache-Aside vs Write-Through**: Cache-Aside는 lazy(읽기 시 미스면 DB 조회 후 적재), Write-Through는 쓰기 시 캐시+DB 동시 갱신(캐시 항상 최신이지만 쓰기 오버헤드). **대부분 Cache-Aside + TTL이 시작점**.

**Redis 죽으면**: 캐시는 보조 계층이라 DB fallback. 단 **캐시 아발란체** 위험 → DB 커넥션 풀 제한 + rate limiting으로 보호.

**자료구조별 실전 활용**:
- **Sorted Set** — 랭킹(`ZADD leaderboard 1500 user:1`)·시간 기반 큐(score=timestamp로 만료 처리)·rate limit(token bucket)
- **Stream** — Kafka-lite. 그룹 컨슈머 + ACK. 작은 규모 이벤트 버스 (Kafka 과투자일 때)
- **HyperLogLog** — 고유 방문자 카운트 (12KB로 1억 unique 추정, 0.81% 오차)
- **Bitmap** — 출석/플래그 (1년 365비트 = 46바이트로 user별 출석)
- **Hash** — 객체 (`HSET user:1 name dc-choi level 4`) — String 다중 키보다 메모리 효율

**꼬리**:
- **"Cluster 한계?"** → 슬롯 16384, Sentinel HA. 멀티테넌트면 키 prefix로 논리 격리

## 관련 문서

- [[My-Tech-Cards|TOC + vault 카테고리 인덱스]]
- [[My-Tech-Cards-Data|데이터/메시징 (카드 1·2·3·4)]]
- [[My-Tech-Cards-Extended|심화 비교 표·꼬리 풀]]
