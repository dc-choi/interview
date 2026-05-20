---
tags: [infrastructure, aws, emr, hadoop, spark, bigdata]
status: done
category: "Infrastructure - AWS"
aliases: ["EMR", "Amazon EMR", "Elastic MapReduce"]
---

# Amazon EMR (Elastic MapReduce)

AWS 빅데이터 작업용 **Hadoop 클러스터 생성** 서비스. EC2 인스턴스 클러스터로 구성되고 자동 프로비저닝.

## 핵심

- 빅데이터 분석/처리용 매니지드 클러스터
- 지원 프레임워크: **Hadoop, Spark, HBase, Presto, Flink, Hive**
- EC2 클러스터 위에서 작동 — Spot 인스턴스로 비용 절감 가능

## 노드 유형

| 노드 | 역할 |
|------|------|
| **Master 노드** | 클러스터 관리, 다른 노드 상태 조정 (장기 실행) |
| **Core 노드** | 태스크 실행 + 데이터 저장 (HDFS, 장기 실행) |
| **Task 노드** | 태스크만 실행 — Spot 인스턴스 활용 (선택, 단기 OK) |

## 사용 사례

- 머신러닝 (Spark ML)
- 웹 인덱싱
- 빅데이터 ETL — Hadoop/Spark 기반
- 로그 분석

## EMR vs 다른 분석 서비스

| 서비스 | 성격 |
|--------|------|
| **EMR** | Hadoop/Spark 등 빅데이터 프레임워크 매니지드 — 코드 직접 작성 |
| **Glue** | 서버리스 ETL — Spark 기반이지만 인프라 관리 없음 |
| **Athena** | S3 쿼리 — SQL만, 코드/인프라 모두 없음 |
| **Redshift** | OLAP 데이터 웨어하우스 — 정형 분석 중심 |

## 시험 빈출 포인트

- "**Hadoop/Spark/HBase**" → EMR
- "Spot 인스턴스로 비용 절감 빅데이터" → EMR Task 노드
- "코드 직접 작성, 빅데이터 프레임워크 필요" → EMR
- "ETL인데 인프라 관리 싫음" → Glue (EMR 아님)

## 관련 문서

- [[Athena]] · [[Redshift]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
