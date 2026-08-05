---
tags: [infrastructure, aws, ecs, container, fargate]
status: index
category: "Infrastructure - AWS"
verified_at: 2026-08-05
aliases: ["ECS", "Amazon ECS", "Elastic Container Service", "Fargate"]
---

# Amazon ECS (Elastic Container Service)

AWS 관리형 컨테이너 오케스트레이션 서비스. **Task Definition, Service, Cluster** 3계층 모델로 컨테이너 워크로드를 운영. EKS(Kubernetes 매니지드)와 달리 ECS는 AWS 자체 오케스트레이터 — 단순하고 AWS 통합이 깊다.

ecs 폴더 문서 구성:

- [[ECS-Service-AutoScaling|ECS Service Auto Scaling — Scalable Target, 정책 3종, backlog-per-task 패턴]]
- [[ECS-SQS-Worker-Terraform|SQS 워커 ECS 오토스케일링 Terraform 구성 — Fargate vs EC2, Capacity Provider]]

## 핵심 모델 — Task / Service / Cluster

| 계층 | 역할 |
|------|------|
| **Task Definition** | 컨테이너 청사진 — 이미지, CPU, 메모리, 포트, 환경변수, IAM 역할, 로깅 |
| **Task** | Task Definition의 실행 인스턴스 (Pod 비유) |
| **Service** | Task의 desired count 유지, 로드밸런서 연동, 롤링 배포 |
| **Cluster** | Task가 실행되는 논리적 그룹 (EC2 또는 Fargate 용량) |

Task = 1개 이상 컨테이너 묶음 (sidecar 가능). Service = ReplicaSet+Deployment 비유. Cluster = 노드 그룹 비유.

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

| 모드 | 동작 | 적합 |
|------|------|------|
| `bridge` | Docker 내장 가상 네트워크 — Linux EC2의 기본값 | EC2 launch type 단순 케이스 |
| `host` | 호스트 ENI에 컨테이너 포트 직접 매핑. 동적 포트 매핑을 못 써서 같은 Task Definition을 한 인스턴스에 여러 개 못 띄움 | 고성능, 포트 충돌 감수 |
| `awsvpc` (Fargate 필수) | **Task마다 ENI와 프라이빗 IP 부여** | SG, IAM, VPC 흐름이 Task 단위 |
| `none` | 외부 네트워크 연결 없음 | 배치 작업 |

AWS는 특별한 이유가 없으면 `awsvpc`를 권장한다 — Task마다 IP, SG가 분리되어 보안 정책이 단순. `bridge`, `host`, `none`은 EC2의 Linux 컨테이너 전용이고 EC2의 Windows 컨테이너는 `default`(nat 드라이버)를 쓴다.

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
| **Task Execution Role** | ECS Agent (Task 시작 시) | ECR pull, Secrets, 로그 — Fargate, EC2 공통 |
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

Blue/Green은 ECS 자체 기능이라 CodeDeploy 없이 쓸 수 있다. CodeDeploy 기반 blue/green(`CODE_DEPLOY` 컨트롤러)도 별도로 남아 있다.

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

## 로깅, 모니터링

- **CloudWatch Logs** — `awslogs` 드라이버 표준
- **FireLens** — Fluent Bit 사이드카로 로그 변환, 다중 백엔드 (Datadog, Splunk)
- **Container Insights** — Task 단위 CPU, 메모리, 네트워크 메트릭
- **ECS Exec** — `aws ecs execute-command`로 컨테이너 안 쉘 접근 (디버깅)

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
