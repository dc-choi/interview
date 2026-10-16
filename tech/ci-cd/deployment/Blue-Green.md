---
tags: [cicd, deployment, blue-green, zero-downtime, rollback]
status: done
verified_at: 2026-08-04
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Blue-Green Deployment", "Blue-Green 배포", "블루 그린 배포"]
---

# Blue-Green 배포

운영 환경을 **동일한 두 그룹(Blue, Green)** 으로 복제해 두고, 배포 시 한쪽에만 새 버전을 올린 뒤 **로드밸런서 트래픽을 순간 전환**하는 방식. 무중단 배포와 **빠른 롤백**이 가장 큰 장점. 반대편 개념으로 같은 서버를 그대로 업데이트하는 **In-Place Deployment**가 있다.

## 핵심 명제

- **두 벌의 동일 환경**을 유지해 한쪽을 안전한 상태로 두고 다른 쪽을 배포
- **트래픽 스위치 = 배포 순간** — 빌드, 워밍업, 검증은 이미 완료된 상태에서 포인터만 옮김
- **롤백 = 스위치 원상복구** — 이전 버전이 살아 있으므로 초단위 복구
- **비용**: 잠시나마 서버 2배 필요 → 클라우드, 컨테이너 환경이 아니면 부담
- **DB 스키마, 공유 상태**는 전환의 난이도를 올리는 복병

## 동작 흐름

1. **Blue가 현재 프로덕션**, 전체 트래픽 수신
2. **Green을 생성**(또는 대기 중) 상태에서 새 버전 배포, 자동 테스트, 워밍업
3. **로드밸런서를 Green으로 전환** — 트래픽이 순간에 이동
4. **관측** — 오류율, 지연, 비즈니스 지표 모니터링
5. 이상 없으면 Blue를 **유휴 상태로 유지**(다음 배포의 Green이 됨)
6. 이상 있으면 **LB를 Blue로 되돌림** → 즉시 롤백

## In-Place vs Blue-Green

| 축 | In-Place | Blue-Green |
|---|---|---|
| 추가 자원 | 없음(기존 서버 재사용) | 두 벌 필요 |
| 배포 중 부하 | 업데이트 중 용량↓ | 100% 유지 |
| 롤백 속도 | 같은 과정 반복(분~시간) | LB 전환(초) |
| DB 스키마 변경 | 비교적 단순(한 버전) | 두 버전 동시 공존 호환 필요 |
| 적합 환경 | 온프레미스, 고정 서버 | 클라우드, 컨테이너, 오토스케일 |
| 트래픽 단절 | 짧게 존재하거나 용량 저하 | 신규 요청 기준 없음 (단, long-lived 연결은 예외 — 아래 주의) |

**선택 기준**: 자원이 유연하고 빠른 롤백이 중요하면 Blue-Green. 물리 서버, 비용 제약이 크고 스키마 변경이 빈번하면 In-Place가 현실적.

## 관련 무중단 배포 전략

| 전략 | 핵심 아이디어 | 특징 |
|---|---|---|
| **Blue-Green** | 두 그룹 전환 | 순간 전환, 빠른 롤백 |
| **Canary** | 새 버전에 **일부 트래픽부터** 점진 이동 | 장애 범위 제한, A/B 테스트 가능 |
| **Rolling Update** | 인스턴스를 **하나씩 교체** | 추가 자원 최소, K8s 기본 |
| **Shadow/Dark Launch** | 새 버전에 **읽기 트래픽만 미러** | 프로덕션 데이터로 검증, 응답은 버림 |

Blue-Green은 트래픽을 0%에서 100%로 한 번에 넘기는 전환인 반면 Canary는 비율을 단계적으로 올린다. 둘은 결합 가능(Green을 Canary처럼 비중 조절).

## 구현 패턴

### DNS 스위치

- 도메인의 A 레코드를 Blue → Green 엔드포인트로 교체
- **단점**: DNS TTL, 클라이언트 캐시로 전환이 즉시 완료되지 않음
- 낮은 TTL로도 분 단위 지연 가능 → 권장되지 않음

### 로드밸런서 스위치(권장)

- ALB/NLB, Nginx, HAProxy가 두 타겟 그룹 가중치를 0/100으로 조정
- AWS ALB의 Weighted Target Groups, Kubernetes Service의 selector 교체, Istio VirtualService 가중치

### Kubernetes 방식

- **Service selector 교체** — `app=myapp-v2` 라벨로 selector 변경
- **Ingress 백엔드 교체** — v1 Service에서 v2 Service로 라우트 전환
- **Argo Rollouts / Flagger** — CRD로 Blue-Green, Canary 자동화

### Amazon ECS 방식

2026-10-14 ECS와 CodeDeploy 공식 문서 대조 기준이다. ECS 서비스의 blue/green은 ECS 기본 기능과 CodeDeploy의 두 경로가 있다. 두 경로 모두 green을 원하는 태스크 수만큼 띄우고, 테스트 트래픽(설정한 경우)으로 검증한 뒤 운영 트래픽을 옮기고, blue를 일정 시간 남겨 두었다가 정리한다.

| 축 | ECS 기본 blue/green | CodeDeploy blue/green |
|---|---|---|
| 설정 | 배포 컨트롤러 `ECS`, `strategy: BLUE_GREEN` | 배포 컨트롤러 `CODE_DEPLOY`, CodeDeploy 애플리케이션과 배포 그룹, AppSpec |
| 테스트 트래픽 | 선택 사항. ALB는 리스너 규칙 단위(헤더, 경로 같은 요청 속성 조건)라 운영과 같은 리스너도 가능. NLB는 다른 포트의 별도 테스트 리스너 | 선택 사항인 별도 테스트 리스너 |
| 운영 트래픽 이동 | `BLUE_GREEN`은 한 번에 전환. 단계적 이동은 `LINEAR`, `CANARY` 전략 | 배포 구성(`CodeDeployDefault.ECSAllAtOnce`, `CodeDeployDefault.ECSCanary10Percent5Minutes`, `CodeDeployDefault.ECSLinear10PercentEvery1Minutes` 등). NLB는 `CodeDeployDefault.ECSAllAtOnce`만 |
| 검증 hook | 단계별 Lambda hook과 pause hook | AppSpec의 Lambda hook |
| blue 유지 | `bakeTimeInMinutes`(0~1440분) | termination wait time(최대 2880분) |
| 연결 대상 | ELB, Service Connect, VPC Lattice, 여러 대상 그룹. 헤드리스 서비스는 트래픽 전환 없이 태스크만 교체 | ALB 또는 NLB만 |

- **CodeDeploy hook 순서**: `BeforeInstall` → Install(replacement task set 생성) → `AfterInstall` → AllowTestTraffic → `AfterAllowTestTraffic` → `BeforeAllowTraffic` → AllowTraffic → `AfterAllowTraffic`. `BeforeInstall`에서는 롤백할 수 없고 그 뒤 hook의 결과는 롤백을 일으킬 수 있다. 테스트 리스너가 없으면 `AfterAllowTestTraffic`을 건너뛴다. hook Lambda는 `PutLifecycleEventHookExecutionStatus`로 `Succeeded`나 `Failed`를 보고하며, 1시간 안에 보고하지 않으면 배포가 실패한다.
- **ECS 기본 hook**: Lambda hook은 응답의 `hookStatus`로 `SUCCEEDED`, `FAILED`, `IN_PROGRESS`를 돌려준다. 호출마다 15분 안에 끝내거나 `IN_PROGRESS`를 반환해야 하고, 단계 하나가 24시간에 이르면 시간 초과로 배포가 실패하고 롤백된다. 예외로 pause hook은 시간 한도를 최대 14일까지 설정할 수 있고, 배포 전체의 한도는 30일이다. pause hook은 `ContinueServiceDeployment`를 호출할 때까지 멈추며 수동 승인이나 외부 테스트를 끼울 때 쓴다. `TEST_TRAFFIC_SHIFT`와 `PRODUCTION_TRAFFIC_SHIFT`에는 Lambda hook만 둘 수 있다.
- **롤백 창**: CodeDeploy는 원래 task set으로 트래픽을 다시 돌려 롤백하고, 대기 시간 동안 배포 그룹의 CloudWatch 알람을 계속 감시해 자동 롤백할 수 있다. 원래 task set 종료가 시작되면 수동이든 자동이든 롤백할 수 없다. CDK construct의 기본 대기 시간은 0이라 운영 트래픽 전환 직후 blue를 종료한다. ECS 기본 blue/green도 bake time이 끝날 때까지 blue를 유지하며, 그동안 두 리비전이 함께 떠 있어 자원 사용량이 최대 2배가 될 수 있다.
- **NLB 대기**: ECS 기본 blue/green에서 NLB를 쓰면 `TEST_TRAFFIC_SHIFT`와 `PRODUCTION_TRAFFIC_SHIFT` 단계에 트래픽 전환이 안전한지 확인하는 10분이 더 걸린다.
- **선택**: AWS DevOps Blog(2026-02)는 대부분의 팀과 새 프로젝트에 ECS 기본 blue/green을 권하고, 기존 사용자나 CodePipeline 의존성이 있는 경우 CodeDeploy도 유효한 선택이라고 설명한다. 전환할 때는 hook의 결과 보고 방식과 시간 한도, 테스트 트래픽 경로가 다르므로 검증 함수와 리스너 구성을 함께 옮긴다(운영 제안).

롤링 배포의 용량 산술과 deployment circuit breaker는 [[ECS-Rolling-Deployment|ECS 롤링 배포]], 파이프라인 단계와 bake time 설계는 [[Safe-Deployment-Pipeline|안전한 자동 배포 파이프라인]]에 있다.

## DB 스키마, 공유 상태의 난제

두 버전이 동시에 같은 DB를 바라보므로 **스키마는 전, 후방 호환**이어야 한다.

- **Expand-Contract**(=Parallel Change) 패턴:
  1. **Expand** — 새 컬럼, 테이블을 추가(둘 다 읽기 가능)
  2. **Migrate** — 새 버전을 배포하면서 새 필드에 쓰기
  3. **Contract** — 옛 버전이 사라진 후 옛 컬럼 제거
- `NOT NULL` 추가, 컬럼 삭제, 타입 변경 같은 **breaking change는 여러 배포에 걸쳐** 수행
- 메시지 큐, 캐시 키, 파일 포맷도 동일 원칙

## 트래픽 전환 시 주의

- **연결 끊김은 신규 요청 한정** — LB 전환으로 무중단이 되는 것은 새로 맺는 짧은 HTTP 요청 얘기다. WebSocket, SSE, gRPC 스트림 같은 **long-lived 연결은 전환 시점에 끊기고 클라이언트가 재연결**해야 한다. 재연결 로직과 상태 복구를 클라이언트가 감당할 수 있어야 진짜 무중단에 가까워진다.
- **WebSocket, SSE 장기 연결** — 전환 즉시 끊기면 UX 저하. graceful drain(기존 연결이 끝날 때까지 Blue를 유지)으로 연결 종료를 늦추되, 결국 재연결은 필요하다
- **세션 sticky** — Blue에 로그인한 사용자가 Green으로 넘어가면 세션 소실. Redis 등 외부 저장소로 세션을 빼는 게 근본책이다. sticky session을 쓰는 구성이라면 스위치를 한 번에 넘기지 말고 **기존 세션이 자연 만료될 때까지 Blue로 계속 붙여주는 별도 드레이닝 전략**(connection draining, deregistration delay)이 필요하다
- **연결 풀 워밍업** — Green이 막 뜬 순간엔 커넥션 풀이 비어 있어 P99가 튐. 트래픽 분 단위로 warm-up
- **캐시 재생성 비용** — Green의 로컬 캐시, JIT 프로파일이 비어 있어 cold start
- **외부 서비스 rate limit** — 두 버전이 동시 호출할 수 있으므로 한도 산정 주의

## 흔한 실수

- **DB 스키마를 breaking change로 한 번에 변경** → Blue가 깨짐. 반드시 Expand-Contract
- **Blue를 즉시 삭제** → 롤백 창 상실. 최소 수 시간~1일 유지
- **트래픽 전환 후 모니터링 공백** → 오류 감지 지연으로 롤백 타이밍 놓침. 전환 직후 집중 모니터링 + 자동 롤백 조건
- **자동 테스트 없이 스위치** → 빠른 배포의 이점이 빠른 장애로 변환
- **두 환경 드리프트** — 한쪽에만 긴급 패치하면 구성이 어긋남. IaC로 양쪽 동일 유지

## 면접 체크포인트

- Blue-Green과 Canary의 개념 차이와 결합 가능성
- DB 스키마 변경 시 Expand-Contract가 필요한 이유
- DNS 전환이 LB 전환보다 열악한 이유(TTL, 클라이언트 캐시)
- WebSocket, sticky session의 전환 이슈
- Kubernetes에서 Service selector로 Blue-Green을 구현하는 방법
- ECS에서 CodeDeploy의 termination wait time과 ECS 기본 blue/green의 bake time이 롤백 창을 어떻게 정하는지

## 출처
- [ninanung gist — 서버 무중단 배포 방식(In-Place vs Blue-Green)](https://gist.github.com/ninanung/9d63304cb0d070642e89f9b94b6fe24b)
- [AWS CodeDeploy — In-place and blue/green deployments](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments.html)
- [Amazon ECS — Amazon ECS blue/green deployments](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-blue-green.html)
- [Amazon ECS — Amazon ECS blue/green service deployments workflow](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/blue-green-deployment-how-it-works.html)
- [Amazon ECS — Lifecycle hooks for Amazon ECS service deployments](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-lifecycle-hooks.html)
- [Amazon ECS — DeploymentConfiguration API](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeploymentConfiguration.html)
- [Amazon ECS — AdvancedConfiguration API](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_AdvancedConfiguration.html)
- [Amazon ECS — Network Load Balancer resources for Amazon ECS blue/green, linear and canary deployments](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/nlb-resources-for-blue-green.html)
- [AWS CloudFormation — AWS::ECS::Service DeploymentConfiguration](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-service-deploymentconfiguration.html)
- [AWS CodeDeploy — Deployments on an Amazon ECS compute platform](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-steps-ecs.html)
- [AWS CodeDeploy — AppSpec hooks section](https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html)
- [AWS CodeDeploy — Working with deployment configurations](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html)
- [AWS CodeDeploy — BlueInstanceTerminationOption API](https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_BlueInstanceTerminationOption.html)
- [AWS CDK — EcsBlueGreenDeploymentConfig](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codedeploy.EcsBlueGreenDeploymentConfig.html)
- [AWS Containers Blog — Migrating from AWS CodeDeploy to Amazon ECS for blue/green deployments](https://aws.amazon.com/blogs/containers/migrating-from-aws-codedeploy-to-amazon-ecs-for-blue-green-deployments/)
- [AWS DevOps Blog — Choosing between Amazon ECS Blue/Green Native or AWS CodeDeploy in AWS CDK](https://aws.amazon.com/blogs/devops/choosing-between-amazon-ecs-blue-green-native-or-aws-codedeploy-in-aws-cdk/)
- [Sungmin Kim 강사 — CodeDeploy](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=66574)

## 관련 문서
- [[CICD-Basics|CI/CD 기초]]
- [[Safe-Deployment-Pipeline|안전한 자동 배포 파이프라인]]
- [[ECS-Rolling-Deployment|ECS 롤링 배포]]
- [[Canary|Canary 배포]]
- [[Zero-Downtime-Deployment|무중단 배포]]
- [[Schema-Versioning|스키마 버전 관리]]
- [[Rollback|Rollback 전략]]
- [[DB-Migration|DB migration 전략]]
- [[Load-Balancer|Load Balancer]]
