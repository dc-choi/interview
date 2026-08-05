---
tags: [infrastructure, aws]
status: index
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["인프라&클라우드(Infrastructure&Cloud)", "Infrastructure & Cloud"]
---

# 인프라&클라우드(Infrastructure&Cloud)

## 목차

- [[tech/infrastructure-cloud/foundation/클라우드기초(Foundation)|클라우드 기초 (Foundation)]] — IaaS/PaaS/FaaS, IaC
- [[tech/infrastructure-cloud/container/컨테이너(Container)|컨테이너 (Container)]] — Docker, Compose, Multi-stage, 이미지 최적화
- [[tech/infrastructure-cloud/aws/AWS서비스(AWSServices)|AWS 서비스 (AWS)]] — EC2/ASG/ALB, Lambda
- [[tech/infrastructure-cloud/network/인프라네트워크(InfraNetwork)|인프라 네트워크 (Network)]] — DNS, Load Balancer, Reverse Proxy
- [[tech/infrastructure-cloud/k8s/k8s|Kubernetes]] — workload와 Service, 설정과 storage, traffic 진입과 배포, 리소스 적정화
- [[tech/infrastructure-cloud/istio-ambient/istio-ambient|Istio Ambient (Service Mesh)]] — ztunnel, waypoint, HBONE, 업그레이드와 장애 대응

## AWS 체크리스트
- [x] [[IAM|AWS IAM (엔티티, 정책 평가, AssumeRole과 Federation, 모범 사례)]]
- [x] [[SQS|SQS]] / [[SNS|SNS]] / [[EventBridge|EventBridge]] — Queue, Pub/Sub, Event Bus의 선택 기준과 운영
- [x] [[CloudWatch|CloudWatch (Metrics, Logs, Alarms, Insights, 운영과 비용)]]
- [x] [[EBS#EBS vs Instance Store (요약)|EBS vs Instance Store (영속성, 성능, 스냅샷, 적용 워크로드)]]

## Network 체크리스트
- [x] [[VPC-Subnet-CIDR#서브넷 유형 — 라우팅이 성격을 결정|Public, Private, Isolated Subnet]] / [[VPC-NAT-Security#NAT Gateway vs NAT Instance|NAT Gateway와 NAT Instance]]

## Kubernetes
- [x] [[Container-Memory-Metrics|컨테이너 메모리 지표 해석 (cgroup 계정 범위, RSS와 page cache, working set, 고원 vs 우상향, 실측)]]

### 기초와 운영 체크리스트
- [x] [[K8s-Core-Workloads-and-Service|Pod / Deployment / Service]] / [[K8s-Traffic-Entry-Helm-and-GitOps|Ingress와 Gateway API]]
- [ ] HPA / VPA (작성 예정: `K8s-HPA-VPA`) — 기존 보강: [[EKS#오토스케일링 — 3축|HPA와 VPA 개요]]
- [x] [[K8s-Configuration-Storage-and-Probes|ConfigMap / Secret]] — 보안 심화: [[Secret-Management#두 가지 누출 지점|K8s Secret 위협 모델]]
- [x] [[K8s-Resource-Right-Sizing|Resource request / limit (스케줄링, CPU 경합, throttling, OOM, 실측 기반 설정)]]
- [x] [[K8s-Configuration-Storage-and-Probes|Startup / Liveness / Readiness probe]] — mesh 심화: [[Istio-Ambient-Partially-Enrolled-Pod|Kubernetes Ready와 mesh 준비의 차이]]
- [ ] PodDisruptionBudget (작성 예정: `K8s-PDB`)
- [x] [[EKS#Cluster Autoscaler vs Karpenter|Node autoscaling (Cluster Autoscaler와 Karpenter)]]

## 현장사례
- [[Kakao-Ent-Seminar#백엔드인프라전체그림|카카오엔터 백엔드 인프라 전체 그림]] — 네트워크~모니터링 계층별 구성
- [[SSG-Ecommerce-Seminar#인프라&배포|SSG 인프라&배포]] — Docker+K8s 온프레미스, Bamboo CI/CD
- [[Fintech-Seminar#망분리|금융 망분리]] — 법적 망분리 의무, eCams CI/CD
- [[TS-Backend-Meetup-1#로그 적재 비용 개선기|로그 적재 아키텍처]] — FluentBit 사이드카, Firehose, S3 적재
- [[TS-Backend-Meetup-3#MSA (아임웹 사례)|아임웹 MSA 인프라]] — 모노레포, 테라폼 모듈, ArgoCD, Kong Gateway
- [[TS-Backend-Meetup-2#세션 1: AWSome IaC|AWSome IaC]] — IaC 필요성, 명령형 vs 명세형, 테라폼 핵심 개념
