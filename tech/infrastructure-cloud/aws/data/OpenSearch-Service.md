---
tags: [infrastructure, aws, opensearch, elasticsearch, search, analytics]
status: done
category: "Infrastructure - AWS"
aliases: ["Amazon OpenSearch Service", "OpenSearch Service", "Amazon OpenSearch"]
---

# Amazon OpenSearch Service (ElasticSearch의 후속)

Elasticsearch fork의 AWS 매니지드 서비스. **부분 일치하는 필드 포함 모든 필드 검색** 기능 제공. DynamoDB와 RDS가 키, 인덱스로만 데이터를 처리하는 것과 대비. 검색 엔진 자체(역색인, 샤딩) 딥다이브는 [[OpenSearch]].

## 핵심

- 검색, 분석 엔진 (전문 검색, full-text search)
- **서버리스 아님** — 인스턴스 클러스터를 프로비저닝해야 함 (Serverless 옵션 별도)
- SQL 지원 아님 — 자체 쿼리 DSL (또는 SQL plugin)
- 보통 DB 옆에 두고 **검색 보완용**으로 사용 — 단일 데이터 스토어로 쓰지 말 것

## 데이터 주입 경로

- **Amazon Data Firehose** → OpenSearch
- **AWS IoT** → OpenSearch
- **CloudWatch Logs** → (Lambda/Firehose) → OpenSearch
- 사용자 지정 애플리케이션 (Logstash, Fluentd 등)

## 사용 사례

- 애플리케이션 로그 검색과 시각화 (OpenSearch Dashboards)
- 풀텍스트 검색 (e커머스 상품, 위키 등)
- 모니터링, SIEM

## 시험 빈출 포인트

- "DynamoDB의 키가 아닌 **임의 속성 검색**" → DynamoDB + OpenSearch 조합
- "**전문 검색**(full-text)" → OpenSearch
- "CloudWatch Logs 검색을 더 빠르게" → Logs → Firehose → OpenSearch
- "ELK 스택의 AWS 매니지드" → OpenSearch + Dashboards

## 관련 문서

- [[DynamoDB]], [[Kinesis]], [[CloudWatch]]
- [[OpenSearch|OpenSearch 검색 엔진 딥다이브 (역색인)]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
