---
tags: [database, search, opensearch, performance, troubleshooting, monitoring]
status: done
verified_at: 2026-10-09
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

## 같은 latency 숫자라도 측정 경계가 다르다

OpenSearch Benchmark의 `service time`은 클라이언트가 요청을 보내고 응답을 받는 구간이다. 서버 처리뿐 아니라 네트워크와 클라이언트 처리 오버헤드도 포함하므로 서버 내부의 `took`과 구분한다. 처리율을 제한하는 throughput-throttled 모드의 `latency`는 여기에 예정된 요청 시각부터 실제 전송까지의 대기도 포함한다.

- 최대 처리량 시험과 목표 요청률에서의 응답 시간 시험을 구분한다. `schedule`의 `target-throughput`은 전체 클라이언트에 걸친 목표 처리율이며, 생략하면 가능한 빠르게 작업한다.
- 목표 처리율과 실제 달성 처리율을 함께 기록한다. 목표를 감당하지 못하면 예정된 요청이 밀려 `service time`이 비슷해도 `latency`는 계속 증가할 수 있다.
- `warmup-iterations`와 `warmup-time-period`의 표본은 측정 결과에서 제외된다. 워밍업 길이와 실제 측정 구간을 따로 기록해야 실행 간 비교 조건을 알 수 있다.

## 반복 실행의 상태를 통제한다

아래는 비교 실험을 위한 운영 제안이다. 같은 설정을 다시 실행했다는 이유만으로 같은 조건의 실험으로 보지 않는다.

| 확인할 상태 | 비교할 때 남길 근거 |
|---|---|
| 쿼리와 캐시 | 쿼리 종류, 매개변수의 분포, 반복 비율과 워밍업 여부. 같은 쿼리만 반복한 결과를 다양한 사용자 검색으로 일반화하지 않음 |
| 데이터와 집계 | 문서 수뿐 아니라 집계 필드의 고유값 수와 값 분포도 기록 |
| 색인과 segment | 동시 쓰기 유무, segment 수, 삭제 표시 문서와 merge 활동 기록 |
| 클러스터 변화 | shard 이동과 배치, 노드 자원 사용을 같은 측정 구간에 기록 |

쓰기 중인 운영 상태와 쓰기를 멈춘 뒤 force merge한 상태는 별도 시나리오다. Force Merge API는 삭제 표시된 문서를 제거하고 segment 구조를 바꾸며, 공식 문서는 쓰기가 끝난 인덱스에 사용하도록 안내한다. 따라서 한쪽만 force merge한 비교로 설정 변경의 효과를 단정하지 않는다. 단일 segment의 결과를 지속적으로 쓰는 인덱스의 성능 보장으로 옮기지도 않는다.

## 출처

- [OpenSearch Documentation, OpenSearch Benchmark](https://docs.opensearch.org/latest/benchmark/)
- [OpenSearch Documentation, Running an OpenSearch Benchmark workload](https://docs.opensearch.org/latest/benchmark/user-guide/working-with-workloads/running-workloads/)
- [AWS Documentation, Operational best practices](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp.html)
- [OpenSearch Documentation, OpenSearch Benchmark concepts](https://docs.opensearch.org/latest/benchmark/user-guide/concepts/)
- [OpenSearch Documentation, Target throughput](https://docs.opensearch.org/latest/benchmark/target-throughput/)
- [OpenSearch Documentation, schedule element](https://docs.opensearch.org/latest/benchmark/reference/workloads/schedule/)
- [OpenSearch Documentation, Force Merge API](https://docs.opensearch.org/latest/api-reference/index-apis/force-merge/)

## 관련 문서

- [[OpenSearch-Performance-Troubleshooting|OpenSearch 성능 진단과 장애 대응]]
- [[OpenSearch-Performance-Troubleshooting-Throughput-Latency|색인 처리량과 검색 latency]]
- [[OpenSearch-Performance-Troubleshooting-Diagnostics|진단 API, slow log와 증상별 가설]]
