---
tags: [infrastructure, aws, quicksight, bi, visualization, analytics]
status: done
verified_at: 2026-08-25
category: "Infrastructure - AWS"
aliases: ["QuickSight", "Amazon QuickSight", "Amazon Quick Sight", "BI"]
---

# Amazon Quick Sight

Amazon Quick의 BI 기능. 서버리스 **머신러닝 기반 BI**로 대화형 대시보드를 만들고 데이터 소스에 직접 연결한다.

## 핵심

- 서버리스 BI — 오토 스케일링
- **SPICE 엔진** (Super-fast, Parallel, In-memory Calculation Engine): 인메모리 연산 엔진. xlsx, csv, json, tsv 등 데이터 소스를 가져와 빠르게 분석
- **ML Insights** (Enterprise Edition) — ML 이상 탐지(Random Cut Forest), 예측(forecasting), autonarratives. 도입부의 머신러닝 기반이라는 수식이 가리키는 기능

## 데이터 소스 통합

- **AWS**: RDS, Aurora, Athena, Redshift, S3
- **타사**: Salesforce, Jira, Teradata 등 외부 데이터베이스

## 사용 사례

- 비즈니스 분석, 시각화
- 임시 분석 수행
- 비즈니스 인사이트 대시보드

## 시험 빈출 포인트 (AWS SAA-C03 강의 기준)

- "**대시보드/시각화**" → QuickSight
- "Redshift나 S3 데이터 시각화" → QuickSight
- "Athena와 함께 BI" → QuickSight (Athena가 쿼리, QS가 시각화)

## 관련 문서

- [[Athena]], [[Redshift]], [[S3]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [Amazon Quick, Visualize, analyze, and share data with Amazon Quick Sight](https://docs.aws.amazon.com/quick/latest/userguide/quick-bi.html)
- [Amazon Quick, Supported data sources](https://docs.aws.amazon.com/quick/latest/userguide/supported-data-sources.html)
- [Amazon Quick, Gaining insights with machine learning](https://docs.aws.amazon.com/quick/latest/userguide/making-data-driven-decisions-with-ml-in-quicksight.html)
