---
tags: [finops, aws, cost-optimization, levers]
status: index
category: "비용&운영(FinOps)"
aliases: ["AWS Cost Levers", "AWS 비용 절감 레버", "비용 절감 레버"]
---

# AWS 비용 절감 레버

FinOps 라이프사이클의 Optimize 단계에 해당하는 문서 묶음이다. 자원 도메인별로 실제 청구액을 줄이는 레버를 컴퓨트, 구매 모델, 스토리지, 데이터 전송, 컨테이너 레지스트리 순으로 묶었다.

## 목차

- [[Resource-Right-Sizing|리소스 적정화]] — Compute Optimizer, P95 분포 판단, Graviton, 약정보다 선행
- [[Autoscaling-Cost|오토스케일링 비용]] — scale-in 균형, Spot 혼합, Warm Pool, 최소 용량
- [[Reserved-Instance|RI / Savings Plans]] — RI vs SP, coverage와 utilization, 결제 옵션
- [[Storage-Tiering|스토리지 티어링]] — S3 클래스, lifecycle, Glacier, gp3
- [[Egress-Cost|데이터 전송 비용]] — egress, cross-AZ, NAT Gateway, VPC Endpoint, CDN
- [[ECR-Cost-Reduction|ECR 비용 절감]] — Lifecycle Policy, 태그 전략, Terraform

## 상위 문서

- [[비용&운영(FinOps)|비용과 운영(FinOps)]]
