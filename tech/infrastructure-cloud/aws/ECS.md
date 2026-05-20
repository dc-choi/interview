---
tags: [infrastructure, aws, ecs, container, fargate]
status: done
category: "Infrastructure - AWS"
aliases: ["ECS", "Amazon ECS", "Elastic Container Service", "Fargate"]
---

# Amazon ECS (Elastic Container Service)

AWS 관리형 컨테이너 오케스트레이션 서비스. **Task Definition · Service · Cluster** 3계층 모델로 컨테이너 워크로드를 운영. EKS(Kubernetes 매니지드)와 달리 ECS는 AWS 자체 오케스트레이터 — 단순하고 AWS 통합이 깊다.

## 핵심 모델 — Task / Service / Cluster

| 계층 | 역할 |
|------|------|
| **Task Definition** | 컨테이너 청사진 — 이미지·CPU·메모리·포트·환경변수·IAM 역할·로깅 |
| **Task** | Task Definition의 실행 인스턴스 (Pod 비유) |
| **Service** | Task의 desired count 유지·로드밸런서 연동·롤링 배포 |
| **Cluster** | Task가 실행되는 논리적 그룹 (EC2 또는 Fargate 용량) |

Task = 1개 이상 컨테이너 묶음 (sidecar 가능). Service = ReplicaSet+Deployment 비유. Cluster = 노드 그룹 비유.

## 시작 유형 — Fargate vs EC2

| 측면 | Fargate | EC2 launch type |
|------|---------|----------------|
| 인프라 관리 | AWS가 호스트 관리 | 본인이 EC2 노드 관리 |
| 콜드 스타트 | 있음 (~30-60초) | 노드는 항상 켜져 있음 |
| 비용 | vCPU·메모리 시간당 (~30% premium) | EC2 시간당 |
| 커스터마이징 | 제한 (커널·daemonset 불가) | 자유 |
| 적합 | 가변 부하·운영 부담 최소화·소규모 | 안정 부하·비용 민감·커스텀 |
| Spot | Fargate Spot (~70% 할인) | EC2 Spot |

규모 작거나 가변적이면 Fargate, 트래픽 일정하고 비용 민감하면 EC2 + ASG.

## 네트워킹 모드

| 모드 | 동작 | 적합 |
|------|------|------|
| `bridge` | Docker 기본 — 호스트 NAT | EC2 launch type 단순 케이스 |
| `host` | 호스트 네트워크 직접 사용 | 고성능, 포트 충돌 위험 |
| `awsvpc` (Fargate 필수) | **Task마다 ENI 부여** | SG·IAM·VPC 흐름이 Pod 단위 |
| `none` | 네트워크 격리 | 배치 작업 |

`awsvpc`가 표준 — Task마다 IP·SG가 분리되어 보안 정책이 단순. Fargate는 awsvpc 강제.

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
| `executionRoleArn` | ECS Agent용 — ECR pull·CloudWatch Logs·Secrets 가져오기 |
| `taskRoleArn` | **앱 자체가 쓰는** AWS 권한 (S3 PUT 등) |
| `cpu`/`memory` | Fargate는 정해진 조합만 (256/512MB·1024/2048MB ...) |
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
| **EC2 Instance Role** | EC2 인스턴스 | ECS Agent의 클러스터 등록·ECR pull·CloudWatch Logs |
| **Task Execution Role** | ECS Agent (Task 시작 시) | ECR pull·Secrets·로그 — Fargate·EC2 공통 |
| **Task Role** | Task 내부 앱 | 앱이 호출하는 AWS API 권한 (S3·DynamoDB 등) |

## Service — desired count + 배포

- **desired count** 유지 — Task가 죽으면 자동 재시작
- **로드밸런서 연동** — ALB Target Group에 Task IP 자동 등록·해제
- **헬스 체크** — ALB unhealthy 시 Task 교체
- **Deployment** — Rolling Update / Blue-Green (CodeDeploy) / External

### Deployment 옵션

| 방식 | 동작 |
|------|------|
| Rolling | `minimumHealthyPercent`·`maximumPercent`로 점진 교체 |
| Blue/Green (CodeDeploy) | 새 Task Set 만들어 ALB 트래픽 스위치, 즉시 롤백 가능 |
| External | 사용자 정의 (Spinnaker·Argo) |

## Service Connect · Service Discovery

마이크로서비스 간 통신:

| 방식 | 동작 |
|------|------|
| **ALB**로 노출 | 외부 API·다중 서비스 진입점 |
| **Cloud Map** Service Discovery | DNS 기반 — `myapp.local` |
| **Service Connect** (2022) | Envoy 사이드카 자동 주입 — 트래픽 메트릭·재시도·DNS 모두 처리 |

Service Connect는 **서비스 메시 없이도 옵저버빌리티·재시도** 제공 — App Mesh보다 가벼움. Cloud Map과 자동 연동.

## Auto Scaling

### Service Auto Scaling

CloudWatch 메트릭 기반:
- Target Tracking — 평균 CPU 50%·ALB RequestCountPerTarget
- Step Scaling — 임계값 단계
- Scheduled — 정해진 시간 (배포 시간대 미리 늘리기)

### Cluster Capacity Provider (EC2)

EC2 launch type에선 **Capacity Provider**가 ASG와 ECS를 묶음 — Task 부족 → 자동 EC2 노드 추가, Task 빠지면 노드 축소. Fargate는 자동.

## 로깅·모니터링

- **CloudWatch Logs** — `awslogs` 드라이버 표준
- **FireLens** — Fluent Bit 사이드카로 로그 변환·다중 백엔드 (Datadog·Splunk)
- **Container Insights** — Task 단위 CPU·메모리·네트워크 메트릭
- **ECS Exec** — `aws ecs execute-command`로 컨테이너 안 쉘 접근 (디버깅)

## 흔한 실수

- **executionRole에만 S3 권한** — 앱이 못 씀. **taskRole이 앱 자체 권한**
- **Fargate인데 호스트 마운트 시도** — 불가. Bind mount는 EC2 only, 영속은 EFS·S3
- **awsvpc Task 다수에 ENI 한도 초과** — 인스턴스당 ENI 한도(타입별 6-15). c5.large + 50 Task 못 띄움
- **로그 드라이버 미설정** — Task 내부에서만 stdout, 외부 조회 불가
- **Health check grace period 0** — 부팅 중 killed. JVM류는 60-180초 필요
- **Fargate Spot에 stateful 워크로드** — 2분 통보 후 종료
- **Task 사이즈 OOM** — 메모리 한도 초과 시 Task killed. soft/hard limit 분리 사용

## 면접·시험 체크포인트

- Task Definition · Task · Service · Cluster의 역할 분리
- Fargate vs EC2 launch type 선택 기준 (운영 부담·비용·콜드 스타트)
- `awsvpc` 모드가 표준이 된 이유 (Task별 SG·IAM)
- **3종 IAM Role**: EC2 Instance Role / Task Execution Role / Task Role — 부여 대상·용도 구분
- Service Connect와 Cloud Map의 역할 — 서비스 메시 없이 옵저버빌리티
- Capacity Provider — EC2 launch type에서 클러스터 자동 스케일
- ECS vs EKS 선택 기준 (단순·AWS 통합 vs Kubernetes 표준) — 자세한 비교는 [[EKS]]
- Task = **컨테이너 실행 최소 단위**(1개 이상 컨테이너 묶음), Fargate면 ENI/IP까지 Task 단위

## 출처
- [AWS 핵심 서비스 정리 — 학습 메모]
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[EKS]]
- [[AWS|EC2]]
- [[AWS-Lambda|Lambda]]
- [[VPC|VPC]]
- [[IAM|IAM]]
- [[Container|컨테이너 개관]]
- [[Docker|Docker]]
- [[Load-Balancer|Load Balancer (ALB)]]
