---
tags: [cicd, deployment, canary, progressive-delivery, rollback]
status: done
verified_at: 2026-08-31
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Canary Deployment", "Canary 배포", "카나리 배포"]
---

# Canary 배포

Canary는 새 버전을 전체가 아니라 트래픽의 일부에만 먼저 노출하고, 지표로 안전을 확인한 뒤 비율을 올려 가는 배포 전략이다. 요청 경로와 부수효과가 격리돼 있을 때 사용자 노출을 비율로 제한할 수 있다. 공유 DB, 캐시, 큐, 외부 시스템에 영향을 주는 결함은 그 비율을 넘어 퍼질 수 있다. [[Blue-Green|Blue-Green 배포]]가 0에서 1로 넘어가는 이산 전환이라면 Canary는 연속적인 램프이고, 그 대가로 무엇을 보고 올릴지 정하는 판정 기준과 그것을 잴 관측이 없으면 성립하지 않는다.

## 핵심 명제

- **노출 비율은 직접 응답 실패의 상한 후보** — 5% 노출에서 새 경로 요청의 20%가 독립적으로 실패하면 전체 요청 열화는 약 1%다. 공유 상태 오염과 자원 고갈, 외부 부수효과는 이 계산 밖이므로 별도 차단과 지표가 필요하다.
- **배포 성공을 프로세스 기동이 아니라 지표로 판정** — Pod가 Running이 된 것은 성공의 근거가 아니다. 게이트 임계는 [[SLI-SLO|SLI, SLO]]에서 가져온다.
- **관찰 램프가 길면 신구 공존 구간도 길어진다** — Canary 램프를 수십 분에서 수 시간 유지하면 그만큼 스키마, 캐시 포맷, 메시지 포맷의 전후방 호환 요구가 커진다. Blue-Green도 Blue 보존과 rollback window를 길게 잡으면 더 오래 공존할 수 있다 (Expand-Contract 패턴은 [[Blue-Green|Blue-Green 배포]]가 소유).
- **표본이 안 나오면 Canary는 형식만 남는다** — 판정에 필요한 요청 수가 모이지 않으면 비율만 올리는 의식이 된다.
- **롤백은 가중치 0 복귀** — 되돌아가는 것은 트래픽이고, 이미 발생한 쓰기와 외부 부작용은 되돌아가지 않는다.

## 트래픽 분할 메커니즘

| 축 | 요청 단위 가중치 | 사용자 단위 고정 분할 |
|---|---|---|
| 분할 기준 | 요청마다 가중치대로 라우팅 | 사용자 ID 해시, 헤더, 쿠키 |
| 구현 | ALB weighted target group, mesh VirtualService 가중치 | target group stickiness, 헤더 매칭, 앱 레벨 플래그 |
| 사용자 경험 | 같은 사용자가 두 버전을 오감 | 코호트가 한 버전에 고정 |
| 주된 위험 | 정적 자산과 캐시 불일치, 다단계 플로우 중간 전환 | 코호트 편향으로 표본 대표성 저하 |
| 적합 | 무상태 API, 짧은 요청 | SPA 번들, 결제 같은 다단계 플로우 |

ALB는 하나의 forward 규칙에 여러 target group을 두고 가중치 비율대로 트래픽을 배분한다. 가중치를 8과 2로 주면 80%와 20%로 나간다. target group stickiness를 켜면 쿠키로 같은 클라이언트를 지정한 시간 동안 같은 target group에 묶으므로 요청 단위 분할을 사용자 단위에 가깝게 바꿀 수 있다. 이는 target group 안의 개별 타깃에 고정하는 sticky session과는 다른 기능이다.

코호트 램프는 대개 내부 직원과 사내 IP, 저위험 리전이나 소규모 테넌트, 전체 순으로 넓힌다.

## 판정 게이트

- **비교 대상은 동시에 돌고 있는 baseline이다** — 어제 값이나 배포 직전 값과 비교하면 시간대와 요일의 트래픽 패턴 차이가 노이즈로 섞인다. Google SRE Workbook은 같은 시점의 control 집단과 비교할 것을 전제로 삼는다.
- 재는 지표는 오류율(5xx와 도메인 실패), 지연 백분위 P95와 P99, 포화(CPU, 메모리, 커넥션 풀, 큐 적체), 그리고 결제 성공률 같은 비즈니스 지표다.
- 지표 수는 상위 5개에서 12개 정도로 줄인다. 늘릴수록 false positive가 늘어 게이트 신뢰가 먼저 무너진다.
- **버전 라벨 분리가 전제** — 전체 집계 오류율만 있으면 5% 노출의 이상은 평균에 묻힌다. version과 커밋 SHA를 지표에 태깅하는 계측은 [[Deploy-Observability|배포 가시성]]이 소유한다.
- **bake time과 최소 표본** — 관측 윈도우는 요청 처리 시간보다 길어야 하고, 지표 집계 주기보다 짧으면 안 된다. 5분짜리 canary를 1시간 집계 지표로 판정하면 신호가 흐려진다.

## 램프와 중단 루프

단계별 비율, 각 단계의 hold window, 자동 promotion과 자동 abort 조건을 배포 전에 고정한다. 사람이 그래프를 보고 그때그때 정하면 배포마다 기준이 흔들리고, 기준은 야간 배포에서 가장 느슨해진다.

- 전형적인 스케줄은 1% → 5% → 25% → 50% → 100%이고, 각 단계마다 분석 통과를 조건으로 hold한다.
- Flagger는 promotion 소요를 `interval x (maxWeight / stepWeight)`, rollback 소요를 `interval x threshold`로 계산한다. 램프 시간이 파라미터의 산술로 결정된다는 뜻이다.
- abort가 되돌리는 것은 트래픽 가중치뿐이다. canary가 이미 쓴 레코드, 발송한 알림, 호출한 외부 API는 별도 복구가 필요하다 ([[Rollback|롤백 전략]], [[DB-Migration|DB 마이그레이션]]).
- 종료 측 드레이닝은 [[Graceful-Shutdown|Graceful Shutdown]], 무중단 성립 조건 전반은 [[Zero-Downtime-Deployment|무중단 배포]]가 소유한다. Canary도 그 다섯 계층 위에서만 성립한다.

## Canary와 A/B 테스트의 경계

| 축 | Canary | A/B 테스트 |
|---|---|---|
| 묻는 질문 | 새 버전이 시스템적으로 안전한가 | 새 안이 제품 지표를 올리는가 |
| 보는 지표 | 오류율, 지연, 포화 | 전환율, 리텐션 같은 성과 지표 |
| 기간 | 분에서 시간 단위 | 일에서 주 단위 |
| 통계 | 급성 이상 탐지 | 검정력, MDE, 다중 비교 설계 |
| 실패 시 | 즉시 abort와 가중치 복귀 | 실험 중단 후 분석 |

Canary 통과는 터지지 않았다는 뜻이지 좋아졌다는 뜻이 아니다. 효과 검정의 설계는 [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]가 소유한다. 다만 Flagger처럼 헤더와 쿠키 기반 라우팅으로 A/B 모드를 함께 제공하는 도구가 있어 라우팅 메커니즘 자체는 겹친다.

## 구현 선택지

### Kubernetes 컨트롤러

- **Argo Rollouts** — Rollout CRD의 canary 전략에 `setWeight`와 `pause`를 단계로 나열한다. `trafficRouting`이 없으면 replica 수로 비율을 근사하고, `analysis`는 배경으로 돌다가 실패하면 롤아웃을 abort한다. AnalysisTemplate에는 `successCondition`, `failureCondition`, `failureLimit`, `interval`, `count`를 둔다. baseline과 canary를 나란히 띄워 비교하는 Kayenta식 분석은 Experiment로 분리돼 있다.
- **Flagger** — Canary CRD의 `analysis`에 `interval`, `threshold`, `maxWeight`, `stepWeight`와 metrics, webhooks를 둔다. 실패한 체크 수가 threshold에 도달하면 트래픽을 전부 primary로 되돌린다.

### 라우팅 계층

- service mesh나 gateway의 가중치 라우팅, ALB weighted target group, API Gateway 스테이지의 canary 설정 ([[API-Gateway|API Gateway]]).
- ECS는 롤링 배포의 용량 산술로 점진 교체를 하지만 지표 판정은 별개 장치다 ([[ECS-Rolling-Deployment|ECS Rolling 배포]]).

GitOps sync 자체는 Canary 판정을 만들지 않는다. ArgoCD가 매니페스트를 원하는 상태로 맞추는 것과 램프를 관리하는 컨트롤러는 다른 레이어이고, metric provider 연결은 또 별도다 ([[K8s-Traffic-Entry-Helm-and-GitOps|Kubernetes 트래픽 진입, Helm, GitOps]]).

### 애플리케이션 레벨

- 배포와 노출을 분리하고 싶으면 코드는 전량 배포하고 활성화만 비율로 여는 [[Feature-Flag|Feature Flag]]가 더 정밀하다. 배포 단위가 아니라 기능 단위로 반경을 통제할 수 있다.

## Canary가 잘 듣지 않는 경우

- **저트래픽 서비스** — 분당 수십 요청 규모면 1% 노출로는 유의한 판정이 어렵다. 시작 비율을 올리거나 Blue-Green과 빠른 롤백 조합으로 간다.
- **배치와 비동기 워커** — 큐 소비자는 HTTP 가중치로 나눌 수 없다. 컨슈머 인스턴스 비율, 파티션이나 큐 분리, 메시지 속성 기반 라우팅을 분할 축으로 삼아야 한다.
- **파괴적 스키마 변경** — 동시 구동 시간이 길수록 호환 요구가 커진다 ([[Schema-Versioning|스키마 버전 관리]]).
- **공유 캐시와 공유 백엔드** — canary가 오염시킨 캐시를 control이 읽으면 두 집단이 격리되지 않아 비교 자체가 무의미해진다.
- **외부 rate limit** — 두 버전이 같은 한도를 나눠 쓰므로 canary 실패가 버전 결함이 아니라 한도 소진일 수 있다.
- 응답을 버려도 되는 검증이면 사용자 노출 없이 같은 목적을 달성하는 [[Shadow-Traffic|Shadow 트래픽]]이 낫다.

## 흔한 실수

- 게이트 없이 시간에 따라 비율만 올림. 자동화된 것은 램프뿐이고 판정은 없는 상태다.
- baseline 없이 절대 임계만 봄. 원래 P99가 높은 시간대에 배포하면 멀쩡한 버전이 abort된다.
- bake time이 P99 응답 시간이나 배치 주기보다 짧음. 느린 경로의 회귀는 창이 닫힌 뒤에 드러난다.
- canary 인스턴스만 커넥션 풀과 JIT가 차가운 상태로 지연을 비교. 워밍업 없이 재면 신버전이 불리하게 보인다.
- abort 후 트래픽만 되돌리고 데이터 부작용을 방치.
- 저트래픽인데 1%로 시작해 판정 불가 상태로 몇 시간을 태움.

## 면접 체크포인트

- Canary와 Blue-Green의 차이를 롤백 속도, 자원 비용, 판정 가능성으로 나눠 설명할 수 있는가.
- canary를 과거 값이 아니라 동시 baseline과 비교해야 하는 이유를 말할 수 있는가.
- 초당 요청이 적은 서비스에 Canary를 요구받으면 어떤 대안을 제시할 것인가.
- abort로 되돌릴 수 있는 것과 없는 것의 경계를 구분할 수 있는가.
- 비동기 워커나 배치 잡에 Canary를 적용하려면 무엇을 분할 축으로 삼을 것인가.

## 출처

- [Argo Rollouts 공식 문서, Canary Deployment Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts 공식 문서, Analysis and Progressive Delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Argo Rollouts 공식 문서, Experiment CRD](https://argo-rollouts.readthedocs.io/en/stable/features/experiment/)
- [Flagger 공식 문서, Deployment Strategies](https://docs.flagger.app/usage/deployment-strategies)
- [Canarying Releases — Google SRE Workbook](https://sre.google/workbook/canarying-releases/)
- [New Application Load Balancer Simplifies Deployment with Weighted Target Groups — AWS News Blog](https://aws.amazon.com/blogs/aws/new-application-load-balancer-simplifies-deployment-with-weighted-target-groups/)

## 관련 문서

- [[Blue-Green|Blue-Green 배포]]
- [[Zero-Downtime-Deployment|무중단 배포]]
- [[Shadow-Traffic|Shadow 트래픽]]
- [[Feature-Flag|Feature Flag]]
- [[Rollback|롤백 전략]]
- [[Deploy-Observability|배포 가시성]]
- [[SLI-SLO|SLI, SLO]]
- [[Graceful-Shutdown|Graceful Shutdown]]
- [[ECS-Rolling-Deployment|ECS Rolling 배포]]
- [[K8s-Traffic-Entry-Helm-and-GitOps|Kubernetes 트래픽 진입, Helm, GitOps]]
- [[API-Gateway|API Gateway]]
- [[Load-Balancer|Load Balancer]]
- [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]
- [[One-Way-vs-Two-Way-Door|되돌릴 수 있는 결정과 없는 결정]]
- [[CICD-Basics|CI/CD 기초]]
