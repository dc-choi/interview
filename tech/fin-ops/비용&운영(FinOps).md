---
tags: [finops]
status: index
category: "비용&운영(FinOps)"
aliases: ["비용&운영(FinOps)", "Cost & Operations", "FinOps"]
---

# 비용&운영(FinOps)

## 현장사례
- [[TS-Backend-Meetup-1#로그 적재 비용 개선기|로그 적재 비용 개선기]] — CloudWatch->FluentBit+Firehose+S3로 300$->2$ 절감
- [[Large-Scale-Traffic-Experience#사례 (참고)|Redshift → ElasticSearch 전환]] — 월 3천만 원 Redshift 로그 검색을 ES로 이전, 연 3억 절감 + 검색 시간 90%+ 단축

## Checklist
- [x] [[AWS-Cost-Optimization|AWS 비용 최적화 종합 (Frugal Architect, Spot, RI/SP, VPC Endpoint, 조직 문화)]]
- [x] [[ECR-Cost-Reduction|ECR 비용 절감 (Lifecycle Policy, 태그 전략, Terraform)]]
- [x] [[AWS-Pricing|AWS 요금 구조 (종량+약정, 서비스별 과금 차원, Calculator)]]
- [x] [[Reserved-Instance|RI / Savings Plans (RI vs SP, coverage/utilization, 약정 전략)]]
- [x] [[Storage-Tiering|스토리지 티어링 (S3 클래스, lifecycle, gp3, Glacier)]]
- [x] [[Egress-Cost|데이터 전송 비용 (egress/cross-AZ/NAT, VPC Endpoint, CDN)]]
- [x] [[Autoscaling-Cost|오토스케일링 비용 (scale-in 균형, Spot 혼합, Warm Pool)]]
- [x] [[Cost-Anomaly|비용 이상 탐지 (ML 베이스라인, Monitor, 예산과 보완)]]
- [x] [[Budget-Alert|예산 알람 (Actual/Forecasted, Budget Actions, 층 구성)]]
- [x] [[Resource-Right-Sizing|리소스 적정화 (Compute Optimizer, P95, 약정 선행)]]
