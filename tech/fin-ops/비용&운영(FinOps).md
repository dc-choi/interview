---
tags: [finops]
status: index
category: "비용&운영(FinOps)"
aliases: ["비용&운영(FinOps)", "Cost & Operations", "FinOps"]
---

# 비용&운영(FinOps)

## 현장사례
- [[TS-Backend-Meetup-1#로그 적재 비용 개선기|로그 적재 비용 개선기]] — CloudWatch->FluentBit+Firehose+S3로 300$->2$ 절감
- [[Large-Scale-Traffic-Experience#Redshift → ElasticSearch 전환 (FinOps)|Redshift → ElasticSearch 전환]] — 월 3천만 원 Redshift 로그 검색을 ES로 이전, 연 3억 절감 + 검색 시간 90%+ 단축

## Checklist
- [ ] [[AWS-Pricing|AWS pricing 구조]]
- [ ] [[Reserved-Instance|Reserved Instance / Savings Plan]]
- [ ] [[Storage-Tiering|Storage tiering]]
- [ ] [[Egress-Cost|Egress cost 관리]]
- [ ] [[Autoscaling-Cost|Autoscaling 비용 최적화]]
- [ ] [[Cost-Anomaly|Cost anomaly detection]]
- [ ] [[Budget-Alert|Budget alert]]
- [ ] [[Resource-Right-Sizing|Resource right-sizing]]
