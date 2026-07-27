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
- [x] [[AWS-Cost-Optimization|AWS 비용 최적화 종합 (Frugal Architect, FinOps 라이프사이클, Showback/Chargeback, Spot, RI/SP, Managed→Self-Hosted, 적정 기술 선택)]]
- [x] [[AWS-Pricing|AWS 요금 구조 (종량+약정, 서비스별 과금 차원, Calculator)]]
- [x] [[AWS-Cost-Levers|AWS 비용 절감 레버 문서 묶음 (적정화, 오토스케일링, RI/SP, 스토리지 티어링, 데이터 전송, ECR)]]
- [x] [[Cost-Anomaly|비용 이상 탐지 (ML 베이스라인, Monitor, 예산과 보완)]]
- [x] [[Budget-Alert|예산 알람 (Actual/Forecasted, Budget Actions, 층 구성)]]
- [x] [[LLM-Cost-Optimization|LLM 비용 최적화 (API별 토큰 가시성, 파레토 분석, AI 비용 시뮬레이션과 결정론 산술 분리, 레버 스택 — 캐싱/다운사이즈/Batch)]]
