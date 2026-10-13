---
tags: [infrastructure, aws, ecs, container, fargate]
status: index
category: "Infrastructure - AWS"
verified_at: 2026-10-09
aliases: ["ECS", "Amazon ECS", "Elastic Container Service", "Fargate"]
---

# Amazon ECS (Elastic Container Service)

AWS 관리형 컨테이너 오케스트레이션 서비스. **Task Definition, Service, Cluster** 3계층 모델로 컨테이너 워크로드를 운영. EKS(Kubernetes 매니지드)와 달리 ECS는 AWS 자체 오케스트레이터 — 단순하고 AWS 통합이 깊다.

ecs 폴더 문서 구성:

- [[ECS-GPU-Inference|ECS GPU 추론 — GPU 배치, fractional GPU 조건과 준비 완료 검증]]
- [[ECS-Rolling-Deployment|ECS 롤링 배포 메커니즘 — 용량 산술, deployment circuit breaker, 드레이닝과 stopTimeout]]
- [[ECS-Secrets-Injection|ECS 런타임 시크릿 주입 — secrets valueFrom, 역할 분리, 회전과 재기동]]
- [[ECS-Service-AutoScaling|ECS Service Auto Scaling — Scalable Target, 정책 3종, backlog-per-task 패턴]]
- [[ECS-SQS-Worker-Terraform|SQS 워커 ECS 오토스케일링 Terraform 구성 — ecs-sqs-worker-terraform 폴더 인덱스, 공통 리소스와 Fargate/EC2 옵션]]
  - [[ECS-SQS-Worker-Terraform-Common|공통 리소스 — 큐와 DLQ, 최소 권한 IAM, Container Insights, backlog-per-task 정책]]
  - [[ECS-SQS-Worker-Terraform-Launch-Types|옵션 A Fargate, 옵션 B EC2 — 캐파시티 프로바이더, task def, ASG + Managed Scaling]]

## 핵심 모델 — Task / Service / Cluster

| 계층 | 역할 |
|------|------|
| **Task Definition** | 컨테이너 청사진 — 이미지, CPU, 메모리, 포트, 환경변수, IAM 역할, 로깅 |
| **Task** | Task Definition의 실행 인스턴스 (Pod 비유) |
| **Service** | Task의 desired count 유지, 로드밸런서 연동, 롤링 배포 |
| **Cluster** | Task가 실행되는 논리적 그룹 (EC2 또는 Fargate 용량) |

Task = 1개 이상 컨테이너 묶음 (sidecar 가능). Service = ReplicaSet+Deployment 비유. Cluster = 노드 그룹 비유.

### 일회성 작업과 서비스 스케줄링

부분 검증(2026-10-13): 작업 실행 방식과 서비스 scheduling strategy를 공식 문서와 대조했다.

- **Standalone task**: 처리 후 종료하는 배치 작업에 사용한다. 일회성 실행은 `RunTask`, 정기 실행은 EventBridge Scheduler로 구성할 수 있다. 서비스의 desired count 유지와 구분한다.
- **`REPLICA` 서비스**: 지정한 태스크 수를 유지한다. 태스크가 종료되거나 실패하면 서비스 스케줄러가 대체 태스크를 실행한다.
- **`DAEMON` 서비스**: 배치 제약을 만족하는 각 활성 컨테이너 인스턴스에 태스크 하나를 배치한다. desired count와 Service Auto Scaling으로 개수를 조절하지 않으며, Fargate와 `CODE_DEPLOY`, `EXTERNAL` 배포 컨트롤러에서는 지원하지 않는다.

예를 들어 완료 후 끝나는 데이터 변환 작업은 standalone task, 계속 요청을 받는 API는 `REPLICA`, EC2 인스턴스별 수집 에이전트는 `DAEMON`을 검토한다. 이는 실행 수명과 배치 단위에 따른 선택 예시다.

## 시작 유형 — Fargate vs EC2

| 측면 | Fargate | EC2 launch type |
|------|---------|----------------|
| 인프라 관리 | AWS가 호스트 관리 | 본인이 EC2 노드 관리 |
| Task 기동 | 매번 ENI 프로비저닝, 이미지 pull이 필요 (AWS가 공식 소요 시간을 제시하지는 않음) | 노드는 항상 켜져 있음 |
| 비용 | vCPU-초, GB-초, 임시 스토리지 GB-초 과금 (20GB까지 포함) | EC2 인스턴스 요금 |
| 커스터마이징 | 제한 (커스텀 AMI, 특권 기능 불가) | 자유 |
| 적합 | 가변 부하, 운영 부담 최소화, 소규모 | 안정 부하, GPU와 특수 하드웨어, 커스텀 |
| Spot | Fargate Spot (Fargate 요금 대비 최대 70% 할인) | EC2 Spot |

규모 작거나 가변적이면 Fargate, 트래픽 일정하고 비용 민감하면 EC2 + ASG.

공식 문서는 클러스터 인프라를 **ECS Managed Instances, Fargate, EC2** 3종으로 소개한다. Managed Instances는 EC2를 내 계정에서 돌리되 프로비저닝, 패치, 스케일링을 AWS가 맡는 중간 형태로, `launchType` 대신 capacity provider strategy로 지정한다.

## 네트워킹 모드

### ECS Anywhere는 외부 인스턴스의 제약을 따로 확인한다

부분 검증(2026-10-13): ECS Anywhere의 외부 인스턴스 실행과 네트워크 제약을 공식 문서와 대조했다. 기존 ECS 기능 전체의 재검증은 아니다.

- 온프레미스 서버나 VM을 ECS 클러스터에 등록하고 `EXTERNAL` launch type으로 태스크나 서비스를 실행한다. 이 값은 사용자 정의 배포를 뜻하는 `EXTERNAL` deployment controller와 다른 설정이다.
- 외부 인스턴스에서는 capacity provider를 지원하지 않는다. EC2 Auto Scaling과 연결한 기존 capacity provider 구성을 그대로 적용하지 않는다.
- 네트워크 모드는 `bridge`, `host`, `none`을 사용하며 `awsvpc`, 서비스 로드밸런싱과 서비스 디스커버리를 지원하지 않는다. 아웃바운드 통신이나 데이터 처리와 달리 인바운드 웹 서비스는 별도 진입 경로를 검토해야 한다.
- AWS 관리 API 통신을 위한 인스턴스 IAM 역할과 엔드포인트 연결이 필요하다. CloudWatch Logs 전송에는 태스크 정의의 Task Execution Role도 확인한다.
- 지원 OS는 배포 전에 현재 목록을 확인한다. 공식 문서는 2026-08-07부터 Windows Server를 포함한 일부 OS 지원이 종료됐다고 명시한다. 과거의 Linux와 Windows 지원 설명을 현재 조건으로 그대로 사용하지 않는다.

### EC2와 Fargate 네트워크 모드

| 모드 | 동작 | 적합 |
|------|------|------|
| `bridge` | Docker 내장 가상 네트워크 — Linux EC2의 기본값 | EC2 launch type 단순 케이스 |
| `host` | 호스트 ENI에 컨테이너 포트 직접 매핑. 동적 포트 매핑을 못 써서 같은 Task Definition을 한 인스턴스에 여러 개 못 띄움 | 고성능, 포트 충돌 감수 |
| `awsvpc` (Fargate 필수) | **Task마다 ENI와 프라이빗 IP 부여** | SG, IAM, VPC 흐름이 Task 단위 |
| `none` | 외부 네트워크 연결 없음 | 배치 작업 |

AWS는 특별한 이유가 없으면 `awsvpc`를 권장한다 — Task마다 IP, SG가 분리되어 보안 정책이 단순. 위 표의 EC2 구성에서 `bridge`, `host`, `none`은 Linux 컨테이너용이고 EC2의 Windows 컨테이너는 `default`(nat 드라이버)를 쓴다. 외부 인스턴스는 앞 절의 별도 제약을 따른다.

## Task Definition 핵심 필드

```json
{
  "family": "my-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::...",
  "taskRoleArn": "arn:aws:iam::...",
  "containerDefinitions": [...]
}
```

| 필드 | 의미 |
|------|------|
| `executionRoleArn` | ECS Agent용 — ECR pull, CloudWatch Logs, Secrets 가져오기 |
| `taskRoleArn` | **앱 자체가 쓰는** AWS 권한 (S3 PUT 등) |
| `cpu`/`memory` | Fargate는 표에 있는 조합만 — 256(0.25 vCPU)/512MiB부터 32768(32 vCPU)/244GB까지 |
| `logConfiguration` | `awslogs` 드라이버로 CloudWatch 직송 |

executionRole과 taskRole 분리는 **최소 권한 원칙** — Agent 권한과 앱 권한이 다름.

### EC2 launch type 전용 — EC2 인스턴스 IAM Role

Fargate 외에 **EC2 launch type**에서만 등장하는 3번째 Role.

- **ECS Agent**가 EC2를 ECS Cluster에 **등록**하기 위해 사용
- ECR에서 도커 이미지 pull, CloudWatch Logs로 컨테이너 로그 전송도 이 Role
- Fargate는 호스트가 추상화되어 있어 불필요. EC2 launch type 한정

3종 Role 비교 (시험 단골):

| Role | 부여 대상 | 용도 |
|------|-----------|------|
| **EC2 Instance Role** | EC2 인스턴스 | ECS Agent의 클러스터 등록, ECR pull, CloudWatch Logs |
| **Task Execution Role** | ECS Agent (Task 시작 시) | Fargate의 ECR pull, Secrets, 로그 등. EC2의 일반 ECR pull은 Instance Role을 확인 |
| **Task Role** | Task 내부 앱 | 앱이 호출하는 AWS API 권한 (S3, DynamoDB 등) |

## Service — desired count + 배포

- **desired count** 유지 — Task가 죽으면 자동 재시작
- **로드밸런서 연동** — ALB Target Group에 Task IP 자동 등록, 해제
- **헬스 체크** — ALB unhealthy 시 Task 교체
- **Deployment** — 배포 컨트롤러 `ECS`(strategy: `ROLLING`, `BLUE_GREEN`, `LINEAR`, `CANARY`) / `CODE_DEPLOY` / `EXTERNAL`

### Deployment 옵션

배포 컨트롤러는 `ECS`(기본), `CODE_DEPLOY`, `EXTERNAL` 3종이고, `ECS` 컨트롤러의 `strategy` 필드가 `ROLLING | BLUE_GREEN | LINEAR | CANARY`를 갖는다.

| 방식 | 동작 |
|------|------|
| `ROLLING` | `minimumHealthyPercent`(replica 기본 100%), `maximumPercent`(기본 200%)로 점진 교체. deployment circuit breaker는 이 방식에서만 |
| `BLUE_GREEN` | 새 리비전을 띄워 트래픽 전환, bake time 동안 blue 유지 후 정리. lifecycle hook(Lambda, pause)으로 검증, 롤백 |
| `LINEAR`, `CANARY` | 같은 비율씩 단계적 이동 / 일부 비율 먼저 보내고 지정 시간 뒤 나머지 한 번에 이동 |
| `EXTERNAL` 컨트롤러 | 사용자 정의 (Spinnaker, Argo) — Task Set을 직접 관리 |

Blue/Green은 ECS 자체 기능이라 CodeDeploy 없이 쓸 수 있다. CodeDeploy 기반 blue/green(`CODE_DEPLOY` 컨트롤러)도 별도로 남아 있다. 롤링의 용량 계산, circuit breaker 임계값, 타깃 그룹 드레이닝과 `stopTimeout`이 맞물리는 순서는 → [[ECS-Rolling-Deployment|ECS 롤링 배포 메커니즘]]

### 서비스 삭제와 자원 정리

2026-10-09 공식 DeleteService API와 콘솔 문서 대조 기준이다. 삭제는 서비스 운영을 끝내는 작업이므로 요청 처리와 데이터 보존 조건을 먼저 확인한다.

- `REPLICA` 서비스는 태스크를 0으로 줄인 뒤 삭제하거나 `force`로 0까지 줄이지 않은 상태의 삭제를 요청할 수 있다. `force`를 모든 scheduling strategy의 필수 옵션으로 보지 않는다.
- 정리할 태스크가 남아 있으면 서비스는 `DRAINING`으로 바뀌고 콘솔과 `ListServices`에서 사라질 수 있다. 목록에서 사라진 것만으로 종료 완료를 판단하지 않고 `DescribeServices`와 태스크 상태를 확인한다.
- 모든 태스크가 `STOPPING` 또는 `STOPPED`가 되면 서비스는 `INACTIVE`로 전환한다. 따라서 `INACTIVE`도 모든 태스크가 이미 `STOPPED`라는 뜻은 아니다. `ACTIVE`나 `DRAINING`인 서비스와 같은 이름으로 새 서비스를 만들면 오류가 난다.
- 연결된 로드밸런서와 service discovery 자원은 서비스 삭제로 제거되지 않는다. 공유 여부와 사용처를 확인한 뒤 불필요한 자원만 별도로 정리한다. 서비스 삭제 성공을 전체 비용 정리 완료로 취급하지 않는다.

### Copilot의 배포 추상화와 지원 종료

부분 검증(2026-10-13): AWS Copilot CLI 공식 문서와 지원 종료 공지를 대조했다. Copilot은 애플리케이션 안에 환경과 서비스를 묶고, manifest를 CloudFormation 템플릿으로 변환해 배포하는 도구다. 환경의 네트워크와 공유 자원을 만드는 단계와 서비스 배포는 구분된다. 환경만 배포했다고 애플리케이션이 실행된 것은 아니다.

Copilot의 Load Balanced Web Service는 ECS Fargate에서 실행되며 기본 구성은 ALB를 사용한다. `nlb`를 지정하면 NLB를 사용할 수 있고, `http: false`로 ALB를 끄면 NLB만 사용하는 구성도 가능하다. 이 서비스 유형은 ALB와 NLB 중 적어도 하나가 필요하다. Request-Driven Web Service는 App Runner를 사용하므로 모든 서비스 유형을 ECS 배포로 해석하지 않는다.

AWS Copilot CLI는 **2026-06-12 지원이 종료**됐으며 AWS의 신규 기능, 보안 업데이트와 기술 지원을 받지 않는다. 생성된 CloudFormation 템플릿과 스택을 인수해 관리하거나 ECS Express Mode, CDK 등으로 전환하는 경로를 검토한다. 기존 CLI를 지원 없이 계속 사용하는 선택도 남아 있으므로 도구의 지원 종료를 배포 자원의 자동 종료로 해석하지 않는다.

이전 점검 제안: 환경별 네트워크, ALB/NLB와 리스너의 포트 및 프로토콜, 태스크 정의와 IAM 역할, 시크릿 참조, 오토스케일링 설정을 먼저 비교한다. 새 배포 경로에서 요청 처리와 실패 복구를 확인한 뒤 자원 정리를 진행한다. 간단한 웹/API와 세밀한 인프라 제어가 필요한 구성을 나누어 대안을 선택하며, 이 문서에서는 실제 이전을 실행하지 않았다. 기존 ECS 기능 전체의 검증일은 유지한다.

## Service Connect, Service Discovery

마이크로서비스 간 통신:

| 방식 | 동작 |
|------|------|
| **ALB**로 노출 | 외부 API, 다중 서비스 진입점 |
| **Cloud Map** Service Discovery | DNS 기반 — `myapp.local` |
| **Service Connect** (2022-11) | ECS가 프록시 사이드카를 자동 주입(Task Definition에 없고 직접 설정 불가) — 짧은 이름 엔드포인트, 라운드로빈 분산, 재시도 2회, outlier detection, 트래픽 메트릭 |

Service Connect는 **서비스 메시 없이도 옵저버빌리티, 재시도** 제공 — App Mesh보다 가벼움. Cloud Map 네임스페이스를 그대로 쓰고 추가 요금은 없다(프록시가 Task 자원을 나눠 쓸 뿐). AWS 공지에 따르면 App Mesh는 2026-09-30 지원 종료라 신규 도입 대상이 아니고, ECS에서는 Service Connect가 사실상 기본 선택이다. 단 Windows 컨테이너, 단독 Task, CodeDeploy blue/green과 external 배포 타입에는 못 쓴다.

## Auto Scaling

### Service Auto Scaling

Application Auto Scaling으로 Service의 DesiredCount를 조절. CloudWatch 메트릭 기반:
- Target Tracking — 평균 CPU 50%, ALB RequestCountPerTarget
- Step Scaling — 임계값 단계
- Scheduled — 정해진 시간 (배포 시간대 미리 늘리기)
- Predictive — 과거 부하 데이터로 일간, 주간 패턴을 잡아 선제 스케일

SQS 워커는 CPU가 부하 신호가 아니므로 **backlog-per-task**(큐 메시지 수 / task 수)로 스케일해야 한다. scalable target 등록, Metric Math와 Lambda publish 구현, cooldown 비대칭, scale-to-zero는 → [[ECS-Service-AutoScaling|ECS Service Auto Scaling 심화]]

### Cluster Capacity Provider (EC2)

EC2 launch type에선 **Capacity Provider**가 ASG와 ECS를 묶음 — Task 부족 → 자동 EC2 노드 추가, Task 빠지면 노드 축소. Fargate는 자동.

### Fargate와 Spot의 배분은 장애 시 대체 정책이 아니다

부분 검증(2026-10-13): capacity provider 전략의 `base`, `weight`와 Fargate Spot의 용량 부족 동작을 공식 문서와 대조했다. 기존 ECS 기능 전체의 검증일은 유지한다.

- `base`는 지정한 provider에 우선 배치할 최소 태스크 수다. 한 전략에서 하나의 provider에만 지정하며, 이 수를 먼저 충족한 뒤 나머지를 `weight`의 상대 비율로 배분한다.
- `weight`를 생략하면 콘솔은 1, API와 CLI는 0을 기본값으로 사용한다. 적어도 하나의 provider에는 양수 가중치가 필요하므로 콘솔에서 만든 전략을 코드로 옮길 때 값을 명시한다.
- Fargate 계열과 EC2 Auto Scaling group 계열 provider를 같은 클러스터에 연결할 수 있지만, 하나의 전략 안에서 두 계열을 섞을 수는 없다.
- Spot 용량이 부족하면 서비스는 태스크 실행을 재시도한다. Fargate가 부족한 Spot 용량을 온디맨드로 자동 대체하지는 않는다.

설계 예로 `FARGATE`에 `base=2, weight=1`, `FARGATE_SPOT`에 `weight=3`을 두면 기본 2개를 먼저 배치하고 추가 태스크를 1:3 비율로 배분한다. 이것은 원하는 배분 규칙이며 용량 확보 보장은 아니다. 중단되면 안 되는 처리량을 Spot까지 포함해 계산하지 말고, 필요한 온디맨드 용량과 Spot 지연 시 대응을 별도로 정한다.

## 로깅, 모니터링

- **CloudWatch Logs** — `awslogs` 드라이버 표준
- **FireLens** — Fluent Bit 사이드카로 로그 변환, 다중 백엔드 (Datadog, Splunk)
- **Container Insights** — Task 단위 CPU, 메모리, 네트워크 메트릭
- **ECS Exec** — `aws ecs execute-command`로 컨테이너 안 쉘 접근 (디버깅)

### ECS Exec 연결 실패 점검

부분 검증(2026-10-09): ECS Exec 공식 문서의 활성화, 권한과 연결 조건을 대조했다.

1. `DescribeTasks`에서 `enableExecuteCommand=true`와 대상 컨테이너의 `ExecuteCommandAgent.lastStatus=RUNNING`을 확인한다. 실행 중인 기존 태스크에는 Exec을 뒤늦게 켤 수 없으므로 설정을 활성화한 새 태스크로 교체해야 한다.
2. Fargate에서는 **Task Role**에 SSM Session Manager 권한이 있어야 한다. 이미지 pull 등에 쓰는 Task Execution Role과 혼동하지 않는다. 접속 사용자의 `ecs:ExecuteCommand` 권한도 별도로 확인한다.
3. VPC 인터페이스 엔드포인트를 사용하는 구성에서는 `ssmmessages` 엔드포인트를 확인한다. 세션 암호화에 자체 KMS 키를 쓰는 경우 KMS 엔드포인트도 필요하다. 일반적인 SSM 구성의 엔드포인트 목록을 그대로 필수 목록으로 복사하지 않는다.
4. SSM agent는 파일을 써야 하므로 `readonlyRootFilesystem`을 사용하는 컨테이너에는 ECS Exec이 지원되지 않는다. HTTP proxy를 쓴다면 `NO_PROXY=169.254.169.254,169.254.170.2`로 메타데이터와 역할 자격 증명 트래픽을 제외한다.

운영 접근은 root 권한으로 실행된다. 연결 성공과 감사 기록을 따로 확인한다. 세션 로깅이 `DEFAULT`여도 `awslogs`가 없으면 로그가 저장되지 않으며, 명령 로그 업로드에는 이미지 안의 `script`와 `cat`이 필요하다. 애플리케이션 로그와 Exec 세션 로그는 별도 설정이다.

### ECS 관리 API 오류 분류

부분 검증(2026-10-13): `UpdateService`의 오류 정의를 대조했다. API의 HTTP 상태 코드만 보고 원인을 결정하지 않고 예외 이름과 메시지를 함께 읽는다. 예를 들어 `AccessDeniedException`도 이 API에서는 HTTP 400이다.

| 오류 | 먼저 확인할 대상 |
|---|---|
| `AccessDeniedException` | API를 호출한 주체의 해당 작업 권한 |
| `ClientException` | 권한과 리소스 식별자. 존재하지 않는 리소스만의 오류로 한정하지 않음 |
| `ClusterNotFoundException` | 클러스터 이름과 호출 리전. 클러스터는 리전별 리소스 |
| `InvalidParameterException` | 해당 API의 파라미터와 값 |
| `PlatformTaskDefinitionIncompatibilityException` | 태스크 정의의 요구 기능과 Fargate 플랫폼 버전의 호환성 |
| `PlatformUnknownException` | 지정한 플랫폼 버전의 존재 여부 |
| `ServiceNotActiveException` / `ServiceNotFoundException` | 서비스가 비활성인지, 지정 클러스터에 없는지 구분 |
| `ServerException` | AWS 측 서버 문제. 이 API의 HTTP 500 오류 |

진단 제안: 호출 API, 리전, 클러스터와 서비스, 예외 이름을 한 묶음으로 확인한다. 컨테이너 애플리케이션이 반환한 HTTP 500을 ECS 관리 API의 `ServerException`으로 분류하지 않는다. 전자는 애플리케이션 로그와 요청 경로를, 후자는 실패한 AWS API 호출을 조사한다.

### CannotPullContainerError 진단

부분 검증(2026-10-13): 이미지 가져오기 오류와 지원 런북을 공식 문서와 대조했다. 앱 실행 전 이미지 확보 단계의 실패이므로 중지된 태스크의 구체적인 오류 메시지부터 확인한다.

1. 태스크 정의의 이미지 저장소, 태그나 digest가 실제 레지스트리에 있는지 확인한다.
2. ECR pull 권한은 EC2 launch type이면 **Container Instance Role**, Fargate이면 **Task Execution Role**을 확인한다. 앱의 Task Role에 권한을 더하는 것으로 대체하지 않는다.
3. Timeout이나 연결 오류는 이미지 레지스트리까지의 경로를 조사한다. 인터넷 경로의 라우팅과 보안 규칙, VPC endpoint 구성 등을 구분한다. ECR 이미지 계층을 가져오는 S3 접근도 확인한다.
4. `no space left on device`는 EC2 launch type이면 호스트 디스크, Fargate이면 태스크 임시 스토리지와 이미지 크기를 확인한다. Fargate Linux 플랫폼 1.4.0 이상에서는 압축된 이미지와 압축 해제한 이미지가 모두 임시 스토리지를 사용하므로 둘을 포함해 용량을 잡고, 필요하면 태스크 정의의 `ephemeralStorage`를 조정한다.
5. `toomanyrequests`는 레지스트리의 요청 제한을 확인한다. 오류 종류를 가리지 않고 IAM 권한을 확대하지 않는다.

`AWSSupport-TroubleshootECSTaskFailedToStart`는 실패한 태스크와 같은 리전에서 `ClusterName`과 가장 최근 실패한 `TaskId`를 지정한다. 네트워크, 실행 역할 권한, endpoint, 시크릿과 로그 설정을 분석한다. 네트워크 검사 과정에서 임시 Lambda와 필요한 IAM 역할을 만들 수 있으며, 자동 정리에 실패하면 수동 정리가 필요하다. 읽기 전용 조회로 간주하지 않고 실행 권한과 생성 자원을 확인한다. 여기서는 문서를 대조했으며 실제 계정에서 런북을 실행하지 않았다.

## 흔한 실수

- **executionRole에만 S3 권한** — 앱이 못 씀. **taskRole이 앱 자체 권한**
- **Fargate인데 호스트 경로 마운트, Docker 볼륨 시도** — Docker 볼륨은 EC2 전용. Fargate도 bind mount는 되지만 임시 저장이고, 영속은 EFS, EBS, S3 Files
- **awsvpc Task 다수에 ENI 한도 초과** — 기본값이면 c5.large는 ENI 3개(프라이머리 포함)라 awsvpc Task 2개가 한계. `awsvpcTrunking` 계정 설정을 켜면 c5.large 한도가 12로 늘어 Task 10개까지 (새로 띄운 인스턴스에만 적용)
- **로그 드라이버 미설정** — Task 내부에서만 stdout, 외부 조회 불가
- **Health check grace period 0(기본값)** — ELB와 컨테이너 헬스 체크를 무시하는 유예가 0이라 부팅 중 killed. JVM류는 넉넉히 잡아야 한다
- **Fargate Spot에 stateful 워크로드** — 중단 시 2분 전 경고(EventBridge 이벤트, SIGTERM) 후 종료. Fargate에선 `stopTimeout`을 120초 이하로만 잡을 수 있다
- **Task 사이즈 OOM** — 메모리 한도 초과 시 Task killed. soft/hard limit 분리 사용

## 면접, 시험 체크포인트

- Task Definition, Task, Service, Cluster의 역할 분리
- Fargate vs EC2 launch type 선택 기준 (운영 부담, 비용, Task 기동 지연)
- `awsvpc` 모드가 표준이 된 이유 (Task별 SG, IAM)
- **3종 IAM Role**: EC2 Instance Role / Task Execution Role / Task Role — 부여 대상, 용도 구분
- Service Connect와 Cloud Map의 역할 — 서비스 메시 없이 옵저버빌리티
- Capacity Provider — EC2 launch type에서 클러스터 자동 스케일
- ECS vs EKS 선택 기준 (단순, AWS 통합 vs Kubernetes 표준) — 자세한 비교는 [[EKS]]
- Task = **컨테이너 실행 최소 단위**(1개 이상 컨테이너 묶음), Fargate면 ENI/IP까지 Task 단위

## 출처
- [AWS, CapacityProviderStrategyItem](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_CapacityProviderStrategyItem.html)
- [Announcing the end-of-support for the AWS Copilot CLI — AWS Containers Blog](https://aws.amazon.com/blogs/containers/announcing-the-end-of-support-for-the-aws-copilot-cli/)
- [AWS Copilot CLI — AWS](https://github.com/aws/copilot-cli) — 지원 종료 후 보안 패치와 기술 지원 중단 공지
- [AWS Copilot CLI, Manifest](https://aws.github.io/copilot-cli/en/docs/manifest/overview/)
- [AWS Copilot CLI, Load Balanced Web Service](https://aws.github.io/copilot-cli/en/docs/manifest/lb-web-service/) — ALB 기본 구성과 NLB 전용 구성 조건
- [AWS Copilot CLI, Environments](https://aws.github.io/copilot-cli/docs/concepts/environments/)
- [AWS, Fargate task ephemeral storage for Amazon ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-storage.html)
- [AWS, CannotPullContainer task errors in Amazon ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_cannot_pull_image.html)
- [AWS, AWSSupport-TroubleshootECSTaskFailedToStart](https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-troubleshootecstaskfailedtostart.html)
- [AWS, Amazon ECS clusters for external instances](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere.html)
- [Amazon ECS UpdateService — API 오류 정의](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_UpdateService.html)
- [Amazon ECS standalone tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/standalone-tasks.html)
- [Amazon ECS services](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html)
- [Amazon ECS service deployment controllers and strategies](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_service-options.html)
- [AWS, DeleteService](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeleteService.html)
- [AWS, Deleting an Amazon ECS service using the console](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/delete-service-v2.html)
- [AWS 핵심 서비스 정리 — 학습 메모]
- AWS SAA C03 학습 자료 (로컬)
- [What Is AWS App Mesh? — 2026-09-30 지원 종료 공지](https://docs.aws.amazon.com/app-mesh/latest/userguide/what-is-app-mesh.html)
- [Architect your solution for Amazon ECS — 인프라 3종](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html)
- [Task networking options for EC2](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking.html), [for Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html)
- [Troubleshoot invalid CPU or memory — Fargate 조합 표](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html)
- [DeploymentConfiguration API — strategy, 기본 퍼센트](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeploymentConfiguration.html), [ECS blue/green deployments](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-blue-green.html)
- [ECS Service Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html), [components, 프록시](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect-concepts-deploy.html)
- [Automatically scale your Amazon ECS service](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
- [Storage options for Amazon ECS tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_data_volumes.html)
- [Increasing ECS Linux container instance network interfaces](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-instance-eni.html)
- [Amazon ECS clusters for Fargate — Spot 2분 경고](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html), [AWS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [Task execution IAM role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html), [Container instance IAM role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/instance_IAM_role.html)
- [CreateService API — healthCheckGracePeriodSeconds](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_CreateService.html), [ECS Exec](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html)

## 관련 문서
- [[EKS]]
- [[EC2|EC2]]
- [[AWS-Lambda|Lambda]]
- [[VPC|VPC]]
- [[IAM|IAM]]
- [[컨테이너(Container)|컨테이너 개관]]
- [[Docker|Docker]]
- [[Load-Balancer|Load Balancer (ALB)]]
