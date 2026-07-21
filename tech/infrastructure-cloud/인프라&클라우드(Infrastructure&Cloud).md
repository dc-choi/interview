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

## 미작성 — AWS
- [ ] [[IAM]]
- [ ] SQS / SNS / EventBridge (작성 예정: `SQS-SNS-EventBridge`)
- [ ] [[CloudWatch]]
- [ ] EBS vs Instance store (작성 예정: `EBS-Instance-Store`)

## 미작성 — Network
- [ ] NAT / Public vs Private subnet (작성 예정: `NAT-Subnet`)

## Kubernetes
- [x] [[K8s-Resource-Right-Sizing|Resource Right-Sizing (P95, 버퍼, 역산식, 컴포넌트 차등, 롤백 기준)]]
- [x] [[Container-Memory-Metrics|컨테이너 메모리 지표 해석 (cgroup 계정 범위, RSS와 page cache, working set, 고원 vs 우상향, 실측)]]
- [x] [[Istio-Ambient-Mode|Istio Ambient Mode (service mesh, ztunnel/waypoint L4-L7 분리, sidecar 대비 트레이드오프)]]
- [x] [[Istio-Ambient-Traffic-Internals|Istio Ambient 트래픽 내부 구현 (Envoy internal listener, HBONE = HTTP/2 CONNECT + mTLS, packet mark 루프 방지)]]
- [x] [[Istio-Ambient-Stale-Connection|Stale Connection과 503 (half-open, Envoy pool 키 IP:Port 결함, IP 재사용, retry 완화와 멱등성)]]
- [x] [[Istio-Ambient-Partially-Enrolled-Pod|Partially Enrolled Pod (K8s Ready ≠ mesh 준비, DaemonSet 스케줄 race, startup taint + untaint controller)]]
- [x] [[Istio-Ambient-Upgrade|Istio Ambient 업그레이드 (istiod, cni는 in-place, ztunnel은 blue-green node pool, trustedZtunnelName 함정)]]
- [x] [[Envoy-Retry-Buffer-507|Envoy Retry Buffer와 507 (retry가 만든 payload 한도, 507 vs 413, 클라이언트 retry와 멱등성)]]
- [x] [[Envoy-XDS-Disconnected-Detection|Envoy xDS 단절 탐지 (readiness ≠ control plane 연결, connected_state, proxyStatsMatcher 함정)]]

## 미작성 — Kubernetes
- [ ] Pod / Deployment / Service / Ingress (작성 예정: `K8s-Pod-Deployment`)
- [ ] HPA / VPA (작성 예정: `K8s-HPA-VPA`)
- [ ] ConfigMap / Secret (작성 예정: `K8s-ConfigMap-Secret`)
- [ ] Resource request / limit (작성 예정: `K8s-Resource-Limit`)
- [ ] Liveness / Readiness probe (작성 예정: `K8s-Probes`)
- [ ] PodDisruptionBudget (작성 예정: `K8s-PDB`)
- [ ] Node autoscaling (작성 예정: `K8s-Node-Autoscaling`)

## 현장사례
- [[Kakao-Ent-Seminar#백엔드인프라전체그림|카카오엔터 백엔드 인프라 전체 그림]] — 네트워크~모니터링 계층별 구성
- [[SSG-Ecommerce-Seminar#인프라&배포|SSG 인프라&배포]] — Docker+K8s 온프레미스, Bamboo CI/CD
- [[Fintech-Seminar#망분리|금융 망분리]] — 법적 망분리 의무, eCams CI/CD
- [[TS-Backend-Meetup-1#로그 적재 비용 개선기|로그 적재 아키텍처]] — FluentBit 사이드카, Firehose, S3 적재
- [[TS-Backend-Meetup-3#MSA (아임웹 사례)|아임웹 MSA 인프라]] — 모노레포, 테라폼 모듈, ArgoCD, Kong Gateway
- [[TS-Backend-Meetup-2#세션 1: AWSome IaC|AWSome IaC]] — IaC 필요성, 명령형 vs 명세형, 테라폼 핵심 개념
