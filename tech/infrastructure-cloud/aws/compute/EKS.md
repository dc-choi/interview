---
tags: [aws, eks, kubernetes, container, orchestration, fargate]
status: done
category: "Infrastructure - AWS"
aliases: ["EKS", "Amazon EKS", "Elastic Kubernetes Service"]
---

# Amazon EKS (Elastic Kubernetes Service)

AWS 매니지드 Kubernetes 서비스. **Control Plane(컨트롤 플레인)**을 AWS가 운영하고, 사용자는 **Worker Node**와 **Pod**에 집중한다. ECS와 달리 **Kubernetes API 표준**을 그대로 따르므로 멀티 클라우드, 온프레미스 이식성이 높다.

## 구성 요소 — Kubernetes 모델 그대로

| 컴포넌트 | 역할 |
|----------|------|
| **Cluster** | EKS의 최상위 단위. Control Plane + Worker Node 묶음 |
| **Control Plane** | AWS 관리. `kube-apiserver`, `etcd`, `kube-scheduler`, `kube-controller-manager`. 멀티 AZ HA |
| **Node (Worker)** | 컨테이너가 실제 실행되는 머신. EC2 또는 Fargate |
| **Pod** | 컨테이너 1개+ 묶음. 동일 Pod 내 컨테이너는 **IP, 스토리지, 포트 공유** |
| **Namespace** | 클러스터 내 논리적 격리 단위 |
| **Service** | Pod 묶음의 안정적인 진입점 (ClusterIP, NodePort, LoadBalancer) |
| **Ingress** | L7 라우팅 (AWS Load Balancer Controller가 ALB로 매핑) |
| **Deployment / StatefulSet / DaemonSet** | Pod 관리 워크로드 컨트롤러 |

Control Plane은 AWS가 패치, 업그레이드, HA를 책임. 사용자는 **Worker Node**부터 관리.

## Node 유형 — 3가지 선택지

| 유형 | 설명 | 적합 |
|------|------|------|
| **Managed Node Group** | EKS가 EC2 ASG를 관리. AMI 업그레이드, 드레인 자동 | 표준 운영 — 가장 권장 |
| **Self-managed Node** | 직접 EC2 + AMI 운영. 커스텀 커널, GPU, 특수 AMI | 고급 커스터마이징 필요 |
| **Fargate Profile** | **Serverless** — Pod 단위 실행, 노드 관리 불필요 | 가변 워크로드, 소규모, 관리 부담 최소화 |

Fargate Profile은 **selector**(namespace + label)에 매치되는 Pod를 자동으로 Fargate에서 실행.

## 네트워킹

### VPC CNI (기본)

- **Pod에 VPC IP 직접 할당** — Pod IP가 ENI의 secondary IP로 부여됨
- VPC 보안 그룹, Route Table, VPC Flow Log가 그대로 적용
- **단점**: 인스턴스 타입별 ENI/IP 한도로 **노드당 Pod 수** 제한 (예: m5.large = 29 Pod)
- 완화: **Prefix Delegation** 기능으로 /28 prefix 단위 할당해 Pod 수 증가

### Service & Ingress

| 종류 | AWS 매핑 |
|------|----------|
| `LoadBalancer` (Service) | **NLB** (`aws-load-balancer-controller`) |
| `Ingress` | **ALB** (Ingress Controller) |
| 내부 통신 | `ClusterIP` + CoreDNS |

**AWS Load Balancer Controller**가 K8s 리소스를 ALB/NLB로 자동 프로비저닝. Target Type = `ip`로 두면 ENI 없이 Pod IP 직접 등록.

### Service Mesh

App Mesh(AWS) 또는 Istio, Linkerd 직접 설치. mTLS, 트래픽 분할, 재시도, 서킷 브레이커. Istio 배포 방식(sidecar vs ambient)은 [[Istio-Ambient-Mode]] 참조.

## 권한 — IAM Roles for Service Accounts (IRSA)

EKS의 핵심 보안 패턴. **K8s ServiceAccount에 IAM Role을 연결**해 Pod가 AWS 권한을 OIDC 페더레이션으로 획득.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::xxx:role/S3ReadRole
```

- Pod 단위 최소 권한 적용 (ECS의 Task Role 대응)
- 인스턴스 IAM Role을 모든 Pod가 공유하는 안티패턴 회피
- 최신 권장: **EKS Pod Identity** (2023~) — OIDC보다 단순한 새 메커니즘

## 스토리지

| 종류 | CSI 드라이버 |
|------|--------------|
| **EBS** | `ebs-csi-driver` — 단일 AZ, 단일 Pod 마운트 (RWO) |
| **EFS** | `efs-csi-driver` — Multi-AZ, 다중 Pod 동시 마운트 (RWX) |
| **FSx** | `fsx-csi-driver` — Lustre, NetApp ONTAP, OpenZFS |

StatefulSet은 **EBS + PersistentVolumeClaim**이 표준.

## 오토스케일링 — 3축

| 대상 | 도구 | 동작 |
|------|------|------|
| **Pod 수** | Horizontal Pod Autoscaler (HPA) | CPU/메모리, 커스텀 메트릭 기반 Pod 복제 |
| **Pod 리소스** | Vertical Pod Autoscaler (VPA) | Pod의 CPU/메모리 요청량 자동 조정 |
| **노드 수** | **Cluster Autoscaler** 또는 **Karpenter** | Pending Pod 감지 → 노드 추가 / 유휴 노드 제거 |

### Cluster Autoscaler vs Karpenter

| 항목 | Cluster Autoscaler | Karpenter |
|------|---------------------|-----------|
| 노드 그룹 | ASG 미리 정의 필요 | **JIT 프로비저닝** — Pod 요구에 맞춰 즉시 생성 |
| 인스턴스 선택 | 정해진 ASG | Spot, 다양한 타입 자동 선택 |
| 속도 | 분 단위 | 수십 초 |
| 권장 | 레거시 | **신규 클러스터 표준** |

Karpenter는 AWS가 만든 오픈소스로 **유연성, 비용 효율**이 압도적.

## 배포, 운영 도구

- **eksctl**: EKS 클러스터 생성, 관리 CLI (CloudFormation 기반)
- **kubectl + aws-auth ConfigMap**: 초기 IAM → K8s RBAC 매핑 (최신: Access Entries API로 대체 가능)
- **Helm**: 패키지 관리
- **GitOps**: Argo CD, Flux로 선언적 배포
- **Bottlerocket**: AWS 컨테이너 전용 OS — 최소화, 자동 업데이트
- **Container Insights / Managed Prometheus / Grafana**: 관측

## EKS vs ECS — 선택 기준

| 측면 | ECS | EKS |
|------|-----|-----|
| 학습 곡선 | 낮음 (AWS 고유 모델) | 높음 (K8s 생태계) |
| 이식성 | AWS 종속 | 멀티 클라우드, 온프레미스 |
| 생태계 | AWS 통합 깊음 | 거대한 K8s 생태계 (Helm, Operator, Argo) |
| 운영 부담 | 낮음 | 높음 (K8s 자체 운영 지식 필요) |
| 비용 | Fargate/EC2 시간당 | + EKS Control Plane $0.10/시간/클러스터 |
| Serverless | Fargate | Fargate Profile |
| 적합 | AWS-only, 단순, 작은 팀 | 표준 준수, 복잡한 워크로드, K8s 인력 보유 |

**팀이 K8s를 알고 멀티 클라우드 옵션이 필요하면 EKS**, **AWS만 쓰고 단순함이 우선이면 ECS**.

## 흔한 실수

- **인스턴스 IAM Role에 광범위 권한 부여** — 모든 Pod가 공유. IRSA/Pod Identity로 Pod 단위 분리
- **노드당 Pod 한도 무시** — m5.large에 50 Pod 못 띄움. Prefix Delegation 또는 큰 인스턴스
- **Cluster Autoscaler 미사용** — Pending Pod가 영원히 대기
- **Control Plane 버전 업그레이드 미적용** — EKS는 14개월 후 EOL. 강제 업그레이드됨
- **`LoadBalancer` Service 남발** — Service마다 NLB 생성 → 비용. **Ingress(ALB)**로 통합
- **Pod 리소스 requests/limits 미설정** — 스케줄링 부정확, OOM, Throttling
- **EBS Pod를 다른 AZ로 스케줄** — 마운트 실패. AZ-aware 스케줄링 필요
- **시크릿을 ConfigMap에 평문 저장** — Secrets Manager + External Secrets Operator 사용

## 시험 체크포인트

- Control Plane은 **AWS 관리** — 사용자는 노드부터 책임
- Node 3종: **Managed Node Group / Self-managed / Fargate Profile**
- **Pod = 최소 배포 단위**, 1개+ 컨테이너가 IP, 스토리지 공유
- **VPC CNI**가 Pod에 VPC IP 직접 부여 — Pod에 SG 적용 가능
- **IRSA / Pod Identity** = Pod 단위 IAM 권한 (ECS Task Role 대응)
- **Cluster Autoscaler vs Karpenter** — Karpenter가 JIT, Spot, 다양한 타입 자동 선택
- **Service(LoadBalancer) → NLB**, **Ingress → ALB**
- EKS Control Plane은 **시간당 과금** ($0.10/h) — ECS에는 없는 비용
- ECS vs EKS 선택 — 이식성, 생태계 필요하면 EKS, 단순, AWS 통합이면 ECS

## 출처

- AWS Docs — EKS User Guide
- Kubernetes Docs — Concepts
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[ECS]]
- [[EC2|EC2]]
- [[VPC]]
- [[Auto-Scaling]]
- [[K8s-Resource-Right-Sizing]]
