---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["컴퓨팅 함정", "SAA-C03 Pitfalls Compute"]
verified_at: 2026-07-21
---

# AWS SAA-C03 빈출 함정 — 컴퓨팅

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

### EC2 구매 옵션, 배치 그룹

- **Reserved Instance**와 **Savings Plans** 모두 1년 또는 3년 약정이 있지만 유연성은 상품별로 다르다. Standard/Convertible RI, Regional/Zonal RI, Compute/EC2 Instance/SageMaker Savings Plans의 범위와 교환 가능 여부를 구분한다.
- **Dedicated Host** vs **Dedicated Instance**: Host는 물리 서버 단위(BYOL, 소켓/코어 가시성), Instance는 단순 물리 격리 — BYOL 라이선스 시나리오 → Host
- **Spot Instance**: AWS 중단 시 일반적으로 2분 전에 interruption notice를 제공하지만 통지 수신과 처리 실패에 대비해 워크로드 자체가 중단을 견뎌야 한다. 정해진 1~6시간 실행을 보장하던 Spot Block은 신규 요청을 지원하지 않는다.
- **배치 그룹**
  - **Cluster** — 같은 AZ의 가까운 네트워크 배치로 낮은 지연과 높은 처리량을 노림. AZ 장애에 대한 별도 복원력은 제공하지 않음
  - **Spread** — 서로 다른 하드웨어. AZ당 최대 **7개 인스턴스** 제한 (자주 묻는 숫자)
  - **Partition** — AZ당 최대 7파티션. Hadoop/Cassandra/Kafka 같은 분산 시나리오
- **EFA**(Elastic Fabric Adapter)는 **HPC/MPI 전용** — Linux만 지원, Windows X
- **ENA**(보통 가상 NIC)와 **EFA**(HPC OS 우회) 구분
- **인스턴스 스토어**: EC2 종료/중지 시 **휘발** — 영구 저장 필요하면 EBS. 종료 후 보존 묻는 문제는 EBS 정답
- **Hibernate**(최대 60일): RAM 상태를 EBS 루트에 저장. 인스턴스 스토어 루트는 hibernate 불가

### Auto Scaling

- **Auto Scaling 정책**
  - **Target Tracking** — 단일 지표 자동(가장 간단)
  - **Step Scaling** — 임계값 단계별
  - **Scheduled** — 시간 기반(피크 예측 가능)
  - **Predictive** — ML 기반 예측 (트래픽 사이클이 정기적)
- **Cooldown**과 **instance warm-up**을 구분한다. 300초 group default cooldown은 단순 scaling과 일부 fallback의 기본값이며, target tracking과 step scaling에는 애플리케이션 초기화 시간에 맞춘 default instance warm-up 설정을 권장한다.
- **Lifecycle Hook**: Pending:Wait / Terminating:Wait 상태로 사용자 작업 삽입(로그 수집, 드레인)
- ASG는 ELB **상태확인 결과**로도 종료 결정 가능 — 기본은 EC2 상태만. 시험에서 ELB unhealthy인데도 종료 안 됨 → ELB health check 활성화 필요

### Lambda 함정

- **타임아웃 900초(15분)** — 그 이상 워크로드는 Fargate, Step Functions, ECS
- **/tmp 기본 512MB**, 최대 10GB (10GB로 늘릴 수 있음)
- **ZIP 직접 업로드 50MB, 압축 해제 후 함수와 layer 합계 250MB, 컨테이너 이미지 10GB**. ZIP이 50MB를 넘으면 S3를 통한 업로드를 사용하며 현재 할당량 문서를 확인한다.
- 계정, 리전 동시성 기본 할당량을 확인한다. Reserved Concurrency는 함수 용량을 격리하면서 상한을 두고, Provisioned Concurrency는 지정 버전이나 Alias의 실행 환경을 미리 초기화해 준비된 용량 안에서 콜드 스타트를 줄인다. spillover나 환경 재설정에서는 초기화 지연이 생길 수 있다.
- **Lambda@Edge** vs **CloudFront Functions**
  | 항목 | Lambda@Edge | CloudFront Functions |
  |---|---|---|
  | 런타임 | Node.js, Python | JS만 |
  | 위치 | Regional Edge Cache | Edge Location |
  | 실행 제한 | event 유형 공통 timeout 30초. 생성 응답 크기 등 다른 quota는 event 유형별 차이 | submillisecond 용도, compute utilization 제한 |
  | 용도 | A/B, 인증, 오리진 분기 | URL 재작성, 헤더 조작 |
  | 과금 | 요청 수와 실행 시간 | 호출 수 |
- **Lambda VPC**: 함수가 선택한 서브넷과 보안 그룹을 통해 VPC 리소스에 접근한다. IPv4 인터넷 송신은 일반적으로 프라이빗 서브넷의 NAT 경로가 필요하고, AWS 서비스에는 VPC 엔드포인트를 사용할 수 있다.
- Lambda 서비스의 동기 호출은 함수 오류를 호출자에게 반환하며 재시도 정책은 호출 서비스와 클라이언트가 정한다. 비동기 함수 오류는 기본 두 번 재시도하지만 최대 재시도 횟수와 이벤트 수명을 구성할 수 있고 DLQ 또는 Destination을 사용할 수 있다.

### ECS, EKS, Fargate

- **ECS Task IAM Role** = 컨테이너 안에서 AWS API 호출 자격. **EC2 Instance Profile**은 ECS 에이전트용 — 둘이 다름
- **ECS 동적 호스트 포트 매핑**은 ALB와 NLB 모두 지원한다. `awsvpc` 모드에서는 대상 유형을 `ip`로 사용하고, `bridge` 모드에서는 동적으로 할당된 host port가 대상에 등록된다.
- **EKS Karpenter** vs **Cluster Autoscaler**: Karpenter는 노드 그룹 없이 직접 EC2 프로비저닝(빠름, 유연), CA는 ASG 기반
- **EKS workload IAM**: EKS Pod Identity 또는 IRSA로 Pod 단위 권한을 부여하고 node role 공유를 피한다. 지원 범위와 trust 설정이 서로 다르다.
- **Fargate** = 서버 관리 추상화. vCPU, 메모리와 추가 리소스를 초 단위로 과금하며 Linux task는 1분, Windows task는 5분 최소 과금이 적용되고 Windows license 비용도 확인한다. privileged 컨테이너와 일반 SSH는 지원하지 않지만 운영 접속에는 ECS Exec를 검토할 수 있다.
- EKS의 IAM 인증과 Kubernetes RBAC 권한 부여는 구분한다. 사용자 접근에는 EKS access entry가 권장되며 기존 `aws-auth` ConfigMap 방식은 deprecated 상태다.

## 관련 문서

[[EC2]], [[Auto-Scaling]], [[AWS-Lambda]], [[ECS]], [[EKS]], [[ECR]], [[App-Runner]]

## 출처

- [Lambda 함수 확장과 동시성](https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html)
- [AWS Fargate 요금](https://aws.amazon.com/fargate/pricing/)
- [Lambda 할당량](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [ECS에서 Network Load Balancer 사용](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/nlb.html)
- [EKS access entries](https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html)
