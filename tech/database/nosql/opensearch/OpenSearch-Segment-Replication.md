---
tags: [database, search, opensearch, replication, segment, remote-store, aws]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Segment Replication", "OpenSearch 세그먼트 복제", "Remote-Backed Storage와 OR1"]
---

# OpenSearch Segment Replication과 Remote-Backed Storage

Replica가 무엇을 복제받는지가 색인 CPU 비용, 검색 가시성, failover의 의미를 바꾼다. [[OpenSearch-Architecture|아키텍처]]의 쓰기 흐름과 [[OpenSearch-Indexing-Internals|색인 내부 동작]]은 기본값인 DOCUMENT replication을 전제한다. 이 문서는 그 전제가 SEGMENT replication과 remote-backed storage, AWS OR1에서 어떻게 달라지는지를 다룬다.

## DOCUMENT vs SEGMENT

DOCUMENT replication은 primary가 operation을 replica에 전달하고 replica가 같은 문서를 다시 색인한다. SEGMENT replication(2.3 experimental, 2.7+ GA)은 primary만 색인하고, refresh로 만들어진 segment 파일을 checkpoint 기반으로 replica가 복사받는다.

| 관점 | DOCUMENT | SEGMENT (node-to-node) |
|---|---|---|
| Replica가 받는 것 | operation, 재색인 실행 | segment 파일 복사 |
| 색인 CPU | primary와 replica 모두 소비 | primary만 소비 |
| Replica translog | operation 기록 후 자체 색인 | operation 기록만, Lucene 색인은 안 함 |
| 검색 가시성 | 각 copy가 자체 refresh | primary refresh 후 copy 완료까지 replica 지연 |
| Failover | promoted replica가 이미 색인 완료 상태 | promoted replica가 translog replay로 따라잡음 |
| 네트워크 | operation 크기 | segment 파일 크기, primary 대역폭 증가 |

Node-to-node 모드에서 primary가 모든 replica로 파일을 push하므로 primary 쏠림이 비용이 된다. 공식 권장은 `cluster.routing.allocation.balance.prefer_primary: true`와 backpressure 활성화다.

### 공식 벤치마크가 말하는 것

- 초기 벤치마크에서 동일 클러스터 구성 대비 색인 처리량 40% 향상 보고.
- nyc_taxi: primary shard 40GB에서 median 처리량 +18.54%, 240GB에서 +59.95%. shard가 클수록 replica 재색인 면제 효과가 커진다.
- Primary shard를 40개에서 100개로 늘리면 median 이득이 +18.54%에서 +10.52%로 줄어든다. 노드당 복사할 primary가 많아지기 때문이다.
- stackoverflow, replica 9개: p50 CPU가 69.857%에서 8.833%로 87.36% 감소. 대신 median 처리량은 12.74% 낮고 error rate 2.30%가 나타났다. replica가 많을수록 replication lag이 커지고 backpressure 거부가 발생한 결과다.

즉 SEGMENT는 공짜가 아니다. CPU를 네트워크와 lag으로 치환하는 구조다.

### Replication lag과 backpressure

Backpressure는 기본 비활성(`segrep.pressure.enabled: false`)이며 켜면 shard 단위로 색인 요청을 거부한다.

- 기본값: replica가 checkpoint 4개(`segrep.pressure.checkpoint.limit`) 이상, lag 5분(`segrep.pressure.time.limit`) 이상 뒤처지면 stale로 판정, replication group의 50%(`segrep.pressure.replica.stale.limit`)가 stale이면 색인 거부.
- `time.limit`의 2배 이상 멈춘 replica는 제거 후 새 replica로 교체된다.
- `GET _cat/segment_replication`으로 `checkpoints_behind`, `current_lag`, `rejected_requests`를 확인한다.

### 언제 SEGMENT를 켜는가

적합: 쓰기 많고 refresh interval을 늘려도 되는 log, observability, 대량 backfill 인덱스. replica 수가 적을수록 유리하다.

주의가 필요한 경우:

- `refresh=wait_for`와 `refresh=true`의 read-after-write 보장을 지원하지 않는다. primary refresh 후 응답하지만 replica는 translog 기록만으로 응답한다.
- GET, MGET, TermVector는 강한 읽기를 위해 primary로 라우팅된다. read-heavy 클러스터는 primary 부하가 커지므로 `realtime=false`를 권장(공식).
- 기존 인덱스에 켜려면 reindex가 필요하다. 인덱스 생성 시 `index.replication.type: SEGMENT`.
- Cross-cluster replication은 segment replication을 사용하지 않는다.

한국어 콘텐츠 검색처럼 수정 직후 검색 반영을 사용자가 체감하는 서비스 인덱스는 DOCUMENT 유지가 무난하고, 같은 클러스터의 로그와 통계 인덱스만 인덱스 단위로 SEGMENT를 거는 식의 혼용이 실무적 선택지다.

## Remote-backed storage (2.10+)

Segment와 translog를 S3 같은 remote repository에 두는 구조로, segment replication이 전제 조건이다. 쓰기가 primary에 도착하면 primary만 Lucene에 색인하고 translog를 remote store에 업로드하며, replica에는 요청을 보내지 않는다. 대신 primary term validation으로 고립된 stale primary가 스스로 실패하게 한다. refresh, flush, merge로 생긴 segment는 remote segment store에 업로드되고 replica는 같은 store에서 받아간다.

판단이 달라지는 지점:

- 내구성: `index.translog.durability=request`면 replica 수와 무관하게 마지막 acknowledged write까지 복구할 수 있다. replica가 내구성 수단에서 가용성과 읽기 분산 수단으로 의미가 좁아지므로 replica 수를 내구성 근거로 늘리던 판단이 바뀐다.
- 복구: red index를 `POST _remotestore/_restore`로 remote store에서 복원한다. 주기 snapshot 사이 데이터를 잃는 snapshot RPO 문제가 마지막 acknowledged write 기준으로 좁혀진다.
- 활성화는 cluster bootstrap 시점에만 가능하고 이후 켜고 끌 수 없다. 노드 간 remote store 설정이 다르면 bootstrap이 실패한다.
- 공식 벤치마크에서 bulk client 24개일 때 색인 처리량 최대 60에서 65% 이득. 단 http_logs 8 client에서는 44.86% 감소도 관측됐다. 색인 latency가 remote 업로드 시간보다 클 만큼 동시성이 높아야 이득이다.

## AWS OR1 인스턴스

Amazon OpenSearch Service의 OpenSearch optimized 인스턴스로, remote-backed storage 구조를 관리형으로 제공한다. 로컬은 EBS gp3 또는 io1, 원격은 S3이며 데이터 도착 시 S3로 동기 복사된다.

- AWS 주장: 기존 인스턴스 대비 최대 30% price-performance 개선(내부 벤치마크), S3 기반 11 nines 내구성.
- 요건: 신규 도메인 OpenSearch 2.11+, 기존 도메인은 2.15+. encryption at rest 필수, dedicated master는 Graviton 인스턴스 필수.
- refresh interval 하한 10초(기본 10초). 준실시간 검색 가시성이 필요한 서비스 인덱스에는 이 하한 자체가 결격이다.
- OR1 전환은 비가역이다. 표준 인스턴스로 되돌릴 수 없다.
- Primary만 색인하므로 색인 rate 지표가 실제의 절반으로 보일 수 있고, remote 업로드 전 버퍼링으로 ingestion latency가 높아진다. replica lag은 `ReplicationLagMaxTime` CloudWatch 지표로 본다.
- Red index는 S3에서 자동 복원된다. UltraWarm과 달리 로컬과 원격 양쪽에 데이터를 두고 읽기와 쓰기를 모두 받는다.

적합 workload는 log analytics, observability, security analytics 같은 색인 중심 대량 쓰기다. 검색 지연과 가시성에 민감한 콘텐츠 검색 도메인은 일반 인스턴스 + DOCUMENT가 여전히 기본 선택이고, 같은 계정의 로그 도메인을 OR1로 분리하는 구도가 자연스럽다.

## SEGMENT 모드에서 달라지는 기존 문서의 서술

- [[OpenSearch-Architecture|아키텍처]]의 쓰기 흐름 중 replica에 operation을 전달해 재실행하는 단계가 segment 파일 복사(또는 remote store 경유)로 바뀐다.
- [[OpenSearch-Indexing-Internals|색인 내부 동작]]의 refresh가 만드는 검색 가시성은 primary 기준이 되고, replica 가시성은 copy 완료까지 추가로 늦는다. `refresh=wait_for` 권장도 SEGMENT에서는 성립하지 않는다.
- 기본 GET이 아무 copy에서나 real-time으로 읽는다는 서술은 SEGMENT에서 primary 라우팅으로 바뀐다.
- Replica 수 증가가 색인 CPU를 배수로 늘린다는 비용 모델은 네트워크와 lag 비용 모델로 바뀐다.
- Remote store에서는 replica translog 복제 자체가 사라지고 durability 논거가 remote store로 이동한다.

## 자주 틀리는 모델

1. SEGMENT가 무조건 빠른 것이 아니다. replica가 많거나 primary shard가 많으면 이득이 줄고 lag과 거부가 늘 수 있다.
2. SEGMENT에서 색인 응답 성공은 replica에서 검색 가능하다는 뜻이 아니다. 검색 가시성은 copy 완료에 종속된다.
3. Replica의 translog가 사라지는 것은 remote store 모드이고, node-to-node SEGMENT에서는 replica도 translog는 기록한다.
4. Remote-backed storage는 snapshot 대체가 아니라 복구 RPO를 좁히는 계층이다. 논리적 삭제, 오염 복구용 snapshot 정책은 여전히 필요하다.
5. OR1은 인스턴스 스펙 업그레이드가 아니라 replication과 storage 구조가 다른 제품이다. 10초 refresh 하한과 비가역 전환이 따라온다.
6. Backpressure는 켜야 동작한다. 기본값은 비활성이다.

## 관련 문서

- [[OpenSearch-Architecture|아키텍처와 분산 실행 모델]]
- [[OpenSearch-Indexing-Internals|색인 내부 동작]]
- [[OpenSearch-Cluster-Reliability|클러스터 운영과 복구]]

## 출처

- [Segment replication - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/segment-replication/index/)
- [Segment replication backpressure - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/segment-replication/backpressure/)
- [Segment replication, generally available in OpenSearch 2.7 - OpenSearch Blog](https://opensearch.org/blog/segment-replication/)
- [Remote-backed storage - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/remote-store/index/)
- [CAT segment replication - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/cat/cat-segment-replication/)
- [OpenSearch Optimized Instances for Amazon OpenSearch Service domains - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/or1.html)
- [Supported instance types in Amazon OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html)
- [Introducing highly durable Amazon OpenSearch Service clusters with 30% price/performance improvement - AWS News Blog](https://aws.amazon.com/blogs/aws/introducing-highly-durable-amazon-opensearch-service-clusters-with-30-price-performance-improvement/)
