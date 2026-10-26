---
tags: [aws, eks, kubernetes, container, orchestration, fargate]
status: done
category: "Infrastructure - AWS"
aliases: ["EKS", "Amazon EKS", "Elastic Kubernetes Service"]
verified_at: 2026-08-05
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

### Linux IPv4 Prefix Delegation의 용량 경계

2026-10-07 공식 문서 확인 기준. VPC CNI의 prefix mode는 개별 secondary IP 대신 `/28` 블록의 16개 주소를 ENI 슬롯 하나에 연결한다. 인스턴스의 최대 ENI 수 자체가 늘어나는 것은 아니다.

- 서브넷에 남은 IP가 있어도 연속된 `/28` 블록이 없으면 `InsufficientCidrBlocks`로 할당이 실패할 수 있다. 새 서브넷이나 subnet CIDR reservation으로 연속 공간을 확보한다.
- `WARM_IP_TARGET`과 `MINIMUM_IP_TARGET`을 설정하면 `WARM_PREFIX_TARGET`보다 우선한다. 예비 IP를 줄이면 주소 낭비를 줄일 수 있지만 Pod 시작 시 추가 할당이 필요할 수 있다.
- 전환 시 새 노드 그룹을 사용하고 `max-pods`, 실제 CPU와 메모리 용량도 확인한다. Prefix mode 활성화만으로 Pod 수용량이나 EC2 API 제한 문제가 모두 해결됐다고 판단하지 않는다.

### Service & Ingress

| 종류 | AWS 매핑 |
|------|----------|
| `LoadBalancer` (Service) | **NLB** (`aws-load-balancer-controller`) |
| `Ingress` | **ALB** (Ingress Controller) |
| 내부 통신 | `ClusterIP` + CoreDNS |

**AWS Load Balancer Controller**가 K8s 리소스를 ALB/NLB로 자동 프로비저닝. Target Type = `ip`로 두면 ENI 없이 Pod IP 직접 등록.

### Service Mesh

Istio 또는 Linkerd를 직접 설치한다. mTLS, 트래픽 분할, 재시도, 서킷 브레이커. Istio 배포 방식(sidecar vs ambient)은 [[Istio-Ambient-Mode]] 참조.

AWS App Mesh는 2024-09-24부터 신규 고객 온보딩이 중단됐고 2026-09-30에 지원이 종료돼 콘솔과 리소스 접근이 막히므로 **신규 도입 대상이 아니다**(2026-08-05 공식 문서 확인). AWS 관리형 옵션이 필요하면 VPC Lattice를 검토한다.

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
| **EBS** | `ebs-csi-driver` — 단일 AZ, 단일 노드 마운트(RWO). 같은 노드의 여러 Pod는 접근 가능하며 한 Pod만 허용하려면 RWOP 사용 |
| **EFS** | `efs-csi-driver` — Multi-AZ, 다중 Pod 동시 마운트 (RWX) |
| **FSx** | Lustre는 `aws-fsx-csi-driver`, NetApp ONTAP은 NetApp Trident, OpenZFS는 `aws-fsx-openzfs-csi-driver` |

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
| 노드 그룹 | 미리 구성한 ASG의 용량 조절 | NodePool 제약과 Pod 요구에 맞춰 EC2 노드 프로비저닝 |
| 인스턴스 선택 | ASG의 인스턴스 구성에 따름 | 허용 타입, 가용 용량과 비용을 고려해 선택 |
| 검토할 조건 | 기존 노드 그룹의 관리 방식과 요구를 충족하는지 | 급격한 수요 변화와 다양한 컴퓨팅 요구에 대응할지 |

두 도구의 실제 준비 시간과 절감률은 환경별로 측정한다. Karpenter가 모든 클러스터에서 더 빠르거나 저렴하다고 단정하지 않는다. 아래는 2026-10-07 AWS와 Karpenter 공식 문서를 대조한 운영 기준이며, 문서의 다른 기능과 가격을 전부 재검증한 기록은 아니다.

- **준비 시간의 경계:** 적용 시에는 스케줄 불가 Pod 발생부터 용량 요청, 인스턴스 부팅, 노드 등록, 이미지 다운로드와 애플리케이션 준비까지 나눠 잰다. EC2 생성 시간만으로 실제 트래픽 수용 시간을 설명하지 않는다.
- **Consolidation:** 비어 있거나 다른 노드로 워크로드를 옮길 수 있는 노드를 제거하고, 더 저렴한 노드로 교체할 수 있다. 자발적 consolidation은 PDB와 NodePool disruption budget 등의 제약을 받으므로 남은 노드의 이벤트를 보고 회수되지 않은 이유를 확인한다.
- **Spot 중단:** 중단 처리를 위한 SQS queue 설정을 확인한다. 중단 예고에 맞춘 drain과 대체 노드 생성이 애플리케이션의 무중단을 보장하지는 않으므로 재시도와 종료 처리를 시험한다.
- **컨트롤러 배치:** 자신이 관리하는 노드에만 의존하지 않도록 Karpenter controller를 별도 노드 그룹이나 Fargate에 둔다. 운영 AMI는 검증한 버전으로 고정하고 새 AMI는 별도로 시험한다.

## 배포, 운영 도구

- **eksctl**: EKS 클러스터 생성, 관리 CLI (CloudFormation 기반)
- **kubectl + aws-auth ConfigMap**: 초기 IAM → K8s RBAC 매핑 (최신: Access Entries API로 대체 가능)
- **Helm**: 패키지 관리
- **GitOps**: Argo CD, Flux로 선언적 배포
- **Bottlerocket**: AWS 컨테이너 전용 OS — 최소화, 자동 업데이트
- **Container Insights / Managed Prometheus / Grafana**: 관측

## 클러스터 교체와 ALB의 수명주기를 분리한다

클러스터마다 Ingress로 ALB를 새로 만들면 교체 시 DNS와 CloudFront origin 등 외부 연결도 바뀔 수 있다. ALB와 대상 그룹을 Kubernetes 밖에서 관리하고, 각 클러스터의 `TargetGroupBinding`으로 Service와 기존 대상 그룹을 연결하면 로드밸런서의 수명주기를 클러스터와 분리할 수 있다. Pod IP를 직접 등록하는 구성은 `ip` 대상 유형과 실제 네트워크 도달성을 확인한다.

두 클러스터에 각각 대상 그룹을 두고 ALB의 가중 `forward` 규칙으로 트래픽을 나누면 한쪽을 유지하면서 다른 쪽을 검증하는 운영이 가능하다. 다만 **가중치 분배는 자동 장애 전환이 아니다**. 대상 그룹 하나가 비었거나 그 안의 대상이 모두 비정상이더라도 ALB는 정상 대상 그룹으로 자동 전환하지 않는다. 이는 같은 대상 그룹 안에서 정상 대상을 선택하는 동작과 구분한다.

다음은 이 구성을 적용할 때의 검증 제안이다.

- 한 클러스터가 전체 트래픽을 받을 용량이 있는지 확인하고, 가중치 변경 뒤 오류율과 업무 성공률을 측정한다. 그룹 고정 세션과 진행 중인 연결도 시험한다.
- 상태 저장소, 세션과 데이터 형식의 호환성을 별도로 검증한다. 트래픽을 되돌려도 새로 기록한 데이터까지 과거 상태로 돌아가지는 않는다.
- ALB, 리스너 규칙과 대상 그룹을 관리할 주체를 정한다. `TargetGroupBinding` 생성과 수정 권한은 Kubernetes RBAC와 컨트롤러 IAM 권한으로 제한한다.

클러스터 전환과 EKS 자체의 버전 복구도 다르다. 2026-10-27 공식 가이드에는 in-place 업그레이드 완료 후 7일 안에 직전 minor 버전으로 복구하는 기능이 있다. 지원 버전, `ACTIVE` 상태와 기능 호환성 등의 조건이 있으며, 현재 버전으로 처음 생성한 클러스터와 연장 지원 종료에 따른 자동 업그레이드는 대상이 아니다. 애드온은 별도 관리하고 노드 유형별 복구 절차도 확인한다. 이 기능은 워크로드와 데이터의 과거 시점 복원이 아니다.

2024년 운영 발표의 16:41~20:43 구간을 계기로 위 구조와 제약을 2026-10-27 AWS 및 컨트롤러 공식 문서와 대조했다. 발표의 무중단 성과를 일반 보장으로 옮기지 않으며, 제어 평면 업데이트 자체가 서비스 중단을 필연적으로 일으킨다고 보지도 않는다. 기존 기능, 가격과 지원 정책 전체는 재검증하지 않았으므로 frontmatter의 검증일은 유지한다.

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
- **Control Plane 버전 업그레이드 미적용** — 마이너 버전은 EKS 출시 후 14개월 표준 지원, 이어서 12개월 extended support(기본 활성화, 클러스터 시간당 요금이 표준 $0.10에서 $0.60으로 오름). 총 26개월이 지나면 컨트롤 플레인이 지원 중인 가장 낮은 버전으로 자동 업그레이드됨 (노드와 애드온은 수동 갱신)
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

- [AWS Load Balancer Controller, TargetGroupBinding](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/targetgroupbinding/targetgroupbinding/) — 2026-10-27 외부 관리 대상 그룹 연결, 대상 유형과 권한 경계 대조
- [Elastic Load Balancing, Action types for listener rules](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html) — 2026-10-27 가중 분배, 그룹 간 자동 장애 전환 부재와 고정 세션 대조
- [Amazon EKS, Update existing cluster to new Kubernetes version](https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html) — 2026-10-27 제어 평면 업데이트 과정과 실행 중 애플리케이션의 구분 대조
- [Amazon EKS, Roll back a cluster to a previous Kubernetes version](https://docs.aws.amazon.com/eks/latest/userguide/rollback-cluster.html) — 2026-10-27 7일 조건, 직전 minor 버전, 제외 조건과 데이터 보존 범위 대조
- [GS리테일 Amazon EKS의 모든 것: 무중단 운영부터 배포 자동화까지 — Amazon Web Services Korea](https://www.youtube.com/watch?v=nwmb5TTqALw) — 2024-09-10 공개 발표, 16:41~20:43의 ALB 수명주기 분리와 트래픽 전환을 학습 계기로 사용
- [Amazon EKS, Prefix Mode for Linux](https://docs.aws.amazon.com/eks/latest/best-practices/prefix-mode-linux.html) — Linux IPv4 prefix 절의 부분 검증
- [Amazon EKS, Karpenter](https://docs.aws.amazon.com/eks/latest/best-practices/karpenter.html)
- [Amazon EKS, Kubernetes Data Plane](https://docs.aws.amazon.com/eks/latest/best-practices/scale-data-plane.html)
- [Karpenter, Disruption](https://karpenter.sh/docs/concepts/disruption/)
- AWS Docs — EKS User Guide
- Kubernetes Docs — Concepts
- AWS SAA C03 학습 자료 (로컬)
- [Understand the Kubernetes version lifecycle on EKS](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html)
- [Amazon EKS pricing](https://aws.amazon.com/eks/pricing/)
- [Kubernetes Documentation, Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Amazon EKS User Guide, FSx for NetApp ONTAP CSI driver](https://docs.aws.amazon.com/eks/latest/userguide/fsx-ontap.html)
- [What Is AWS App Mesh? — 2026-09-30 지원 종료 공지](https://docs.aws.amazon.com/app-mesh/latest/userguide/what-is-app-mesh.html)
- [aws/aws-app-mesh-roadmap README — 2024-09-24 신규 고객 온보딩 중단](https://github.com/aws/aws-app-mesh-roadmap)
- [Migrating from AWS App Mesh to Amazon VPC Lattice — EKS 이관 가이드](https://aws.amazon.com/blogs/containers/migrating-from-aws-app-mesh-to-amazon-vpc-lattice/)

## 관련 문서

- [[ECS]]
- [[EC2|EC2]]
- [[VPC]]
- [[Auto-Scaling]]
- [[K8s-Resource-Right-Sizing]]
