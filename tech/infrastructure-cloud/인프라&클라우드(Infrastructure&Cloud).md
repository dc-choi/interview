---
tags: [infrastructure, aws]
status: index
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["인프라&클라우드(Infrastructure&Cloud)", "Infrastructure & Cloud"]
---

# 인프라&클라우드(Infrastructure&Cloud)

## 목차

- [[tech/infrastructure-cloud/foundation/클라우드기초(Foundation)|클라우드 기초 (Foundation)]] — IaaS/PaaS/FaaS·IaC
- [[tech/infrastructure-cloud/container/컨테이너(Container)|컨테이너 (Container)]] — Docker·Compose·Multi-stage·이미지 최적화
- [[tech/infrastructure-cloud/aws/AWS서비스(AWSServices)|AWS 서비스 (AWS)]] — EC2/ASG/ALB·Lambda
- [[tech/infrastructure-cloud/network/인프라네트워크(InfraNetwork)|인프라 네트워크 (Network)]] — DNS·Load Balancer·Reverse Proxy

## 미작성 — AWS
- [ ] [[VPC|VPC / Subnet / NAT / SG]]
- [ ] [[RDS-Aurora|RDS / Aurora]]
- [ ] [[ElastiCache]]
- [ ] [[S3]]
- [ ] [[IAM]]
- [ ] [[SQS-SNS-EventBridge|SQS / SNS / EventBridge]]
- [ ] [[CloudWatch]]
- [ ] [[EBS-Instance-Store|EBS vs Instance store]]

## 미작성 — Network
- [ ] [[CDN|CDN (Cache Key, TTL, Invalidation)]]
- [ ] [[NAT-Subnet|NAT / Public vs Private subnet]]

## 미작성 — Kubernetes
- [ ] [[K8s-Pod-Deployment|Pod / Deployment / Service / Ingress]]
- [ ] [[K8s-HPA-VPA|HPA / VPA]]
- [ ] [[K8s-ConfigMap-Secret|ConfigMap / Secret]]
- [ ] [[K8s-Resource-Limit|Resource request / limit]]
- [ ] [[K8s-Probes|Liveness / Readiness probe]]
- [ ] [[K8s-PDB|PodDisruptionBudget]]
- [ ] [[K8s-Node-Autoscaling|Node autoscaling]]

## 현장사례
- [[Kakao-Ent-Seminar#백엔드인프라전체그림|카카오엔터 백엔드 인프라 전체 그림]] — 네트워크~모니터링 계층별 구성
- [[SSG-Ecommerce-Seminar#인프라&배포|SSG 인프라&배포]] — Docker+K8s 온프레미스, Bamboo CI/CD
- [[Fintech-Seminar#망분리|금융 망분리]] — 법적 망분리 의무, eCams CI/CD
- [[TS-Backend-Meetup-1#로그 적재 비용 개선기|로그 적재 아키텍처]] — FluentBit 사이드카, Firehose, S3 적재
- [[TS-Backend-Meetup-3#MSA (아임웹 사례)|아임웹 MSA 인프라]] — 모노레포, 테라폼 모듈, ArgoCD, Kong Gateway
- [[TS-Backend-Meetup-2#세션 1: AWSome IaC|AWSome IaC]] — IaC 필요성, 명령형 vs 명세형, 테라폼 핵심 개념
