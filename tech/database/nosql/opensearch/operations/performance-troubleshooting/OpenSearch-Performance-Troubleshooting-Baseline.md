---
tags: [database, search, opensearch, performance, troubleshooting, monitoring]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
---

# OpenSearch 성능 기준선과 운영과 닮은 benchmark

성능 튜닝은 기본값 변경이 아니라 병목 가설을 측정으로 반증하는 과정이다. 데이터 모델과 shard 구조, query fan-out을 먼저 보고 thread pool과 breaker는 마지막에 건드린다.

## 먼저 고정할 것

- 색인 처리량과 허용 lag
- 검색 p50, p95, p99와 timeout 비율
- Query 유형별 SLO와 정확성 요구
- Dataset 크기, shard 수, replica 수, node 사양
- 정상 peak와 node 하나를 잃은 peak
- 대표 corpus와 query mix

OpenSearch Benchmark로 실제 문서와 query 비율을 재현한다. 단일 bulk 또는 단일 match query 결과를 전체 workload 성능으로 일반화하지 않는다.

## 운영과 닮은 benchmark

용량 시험은 최대 RPS 찾기가 아니라 목표 처리량에서 SLO와 장애 여유를 검증하는 작업이다.

- 운영과 같은 corpus 크기와 분포, mapping, analyzer를 사용한다.
- Search 종류, update, delete, bulk 비율과 payload 크기를 실제 traffic mix에 맞춘다.
- Shard, replica, refresh interval, instance, storage, network와 AZ 구성을 기록한다.
- Warm-up과 ramp-up 뒤 merge, cache, old GC가 드러날 만큼 충분히 오래 실행한다.
- Achieved throughput, p50, p95, p99, timeout, error, 429와 node별 최대 CPU, JVM, GC, 최소 disk를 함께 기록한다.
- Load generator 자체가 병목인지 확인하고 data node 하나를 잃은 상태도 시험한다.

## 출처

- [OpenSearch Documentation, OpenSearch Benchmark](https://docs.opensearch.org/latest/benchmark/)
- [OpenSearch Documentation, Running an OpenSearch Benchmark workload](https://docs.opensearch.org/latest/benchmark/user-guide/working-with-workloads/running-workloads/)
- [AWS Documentation, Operational best practices](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp.html)

## 관련 문서

- [[OpenSearch-Performance-Troubleshooting|OpenSearch 성능 진단과 장애 대응]]
- [[OpenSearch-Performance-Troubleshooting-Throughput-Latency|색인 처리량과 검색 latency]]
- [[OpenSearch-Performance-Troubleshooting-Diagnostics|진단 API, slow log와 증상별 가설]]
