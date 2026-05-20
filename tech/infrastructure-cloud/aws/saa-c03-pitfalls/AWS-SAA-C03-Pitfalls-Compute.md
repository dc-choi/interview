---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["컴퓨팅 함정", "SAA-C03 Pitfalls Compute"]
---

# AWS SAA-C03 빈출 함정 — 컴퓨팅

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

### EC2 구매 옵션·배치 그룹

- **Reserved Instance**는 1년/3년 약정 — 인스턴스 패밀리·리전 고정. **Savings Plans**는 패밀리 약정으로 유연(인스턴스 크기 변경 OK)
- **Dedicated Host** vs **Dedicated Instance**: Host는 물리 서버 단위(BYOL·소켓/코어 가시성), Instance는 단순 물리 격리 — BYOL 라이선스 시나리오 → Host
- **Spot Instance**: 2분 사전 통보 후 중단. **Spot Block(1~6시간 보장)은 deprecated** — 시험에 나오면 함정
- **배치 그룹**
  - **Cluster** — 같은 AZ·낮은 지연. AZ 장애 = 전멸 (HPC 시나리오)
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
- **Cooldown(기본 300초)** vs **Warm-up**: 새 인스턴스가 지표에 반영되기까지 무시할 시간
- **Lifecycle Hook**: Pending:Wait / Terminating:Wait 상태로 사용자 작업 삽입(로그 수집·드레인)
- ASG는 ELB **상태확인 결과**로도 종료 결정 가능 — 기본은 EC2 상태만. 시험에서 ELB unhealthy인데도 종료 안 됨 → ELB health check 활성화 필요

### Lambda 함정

- **타임아웃 900초(15분)** — 그 이상 워크로드는 Fargate·Step Functions·ECS
- **/tmp 기본 512MB**, 최대 10GB (10GB로 늘릴 수 있음)
- **압축 50MB / 비압축 250MB / 컨테이너 이미지 10GB**
- **동시성 1000개(계정 기본)** — Reserved Concurrency로 함수당 할당, Provisioned Concurrency로 콜드 스타트 제거
- **Lambda@Edge** vs **CloudFront Functions**
  | 항목 | Lambda@Edge | CloudFront Functions |
  |---|---|---|
  | 런타임 | Node.js, Python | JS만 |
  | 위치 | Regional Edge Cache | Edge Location |
  | 지속 | ~5초/30초 | 1ms 미만 |
  | 용도 | A/B, 인증, 오리진 분기 | URL 재작성·헤더 조작 |
  | 가격 | 비쌈 | 매우 저렴 |
- **Lambda VPC**: Private Subnet에서 실행. **인터넷 액세스 필요시 NAT GW** — IGW만 붙이면 안 됨
- Lambda는 동기 호출 실패 시 retry 안 함(클라이언트 책임), 비동기 호출은 자동 2회 재시도 + DLQ 가능

### ECS · EKS · Fargate

- **ECS Task IAM Role** = 컨테이너 안에서 AWS API 호출 자격. **EC2 Instance Profile**은 ECS 에이전트용 — 둘이 다름
- **ALB → ECS** 동적 포트 매핑: NLB는 호스트 포트 고정해야 함. ALB만 동적 포트 지원
- **EKS Karpenter** vs **Cluster Autoscaler**: Karpenter는 노드 그룹 없이 직접 EC2 프로비저닝(빠름·유연), CA는 ASG 기반
- **EKS IAM Roles for Service Accounts(IRSA)**: 파드 단위 IAM — Node Role을 모든 파드가 공유하면 안 될 때
- **Fargate** = 서버 관리 없음, 분당 과금. 인스턴스 스토어·SSH·privileged 컨테이너 불가
- EKS RBAC = K8s 내부 권한. IAM과 별도라 `aws-auth` ConfigMap으로 매핑

## 관련 문서

[[AWS(EC2)]] · [[Auto-Scaling]] · [[AWS-Lambda]] · [[ECS]] · [[EKS]] · [[ECR]] · [[App-Runner]]

## 출처

- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
