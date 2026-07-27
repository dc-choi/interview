---
tags: [infrastructure, aws, opensearch, search, analytics, managed-service, index]
status: index
verified_at: 2026-07-27
category: "Infrastructure - AWS"
aliases: ["Amazon OpenSearch Service", "OpenSearch Service", "Amazon OpenSearch"]
---

# Amazon OpenSearch Service

Amazon OpenSearch Service는 OpenSearch를 AWS에서 운영하는 관리형 서비스다. 프로비저닝형 클러스터인 domain과 자동 용량 관리형인 Serverless collection을 제공한다. 역색인, shard, Query DSL 같은 엔진 내부는 [[OpenSearch|OpenSearch 학습 지도]]에서 다룬다.

- [[OpenSearch-Service-Deployment|배포 모델과 관리 책임]] — 서비스 구분, 적합한 문제, Provisioned와 Serverless 비교, 책임 경계
- [[OpenSearch-Service-Operations|가용성, 변경과 복구]] — Multi-AZ, service software와 engine upgrade, snapshot, 프로덕션 체크리스트
- [[OpenSearch-Service-Security-Observability|보안, 수집과 관측]] — 보안 경계, 데이터 수집, 관측과 알람, 비용 입력
- [[OpenSearch-Service-Engine-Upgrade|Engine upgrade 경로와 사전 검증]] — upgrade path, 사전 검증 실패 원인, rollback 설계
- [[OpenSearch-Service-Instance-Storage|인스턴스와 스토리지 선정]] — 계열 판단, Graviton, gp3, k-NN off-heap
- [[OpenSearch-Service-Cost-Optimization|비용 최적화와 배포 함정]] — RI, UltraWarm 손익, OCU floor, blue-green trigger

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Cluster-Reliability|Cluster 신뢰성과 복구]]
- [[OpenSearch-Observability|Amazon OpenSearch 통합 관측성]]
- [[Centralized-Logging-with-OpenSearch|Centralized Logging with OpenSearch]]
