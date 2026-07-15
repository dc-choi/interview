---
tags: [database, search, opensearch, segment, merge, codec, compression]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Segment Merge", "OpenSearch 세그먼트 머지", "OpenSearch Index Codec"]
---

# OpenSearch Merge Policy와 Codec 압축

[[OpenSearch-Indexing-Internals|색인 내부]]가 immutable segment와 merge의 개념(재작성, 삭제 회수, force merge 주의)을 다룬다. 이 문서는 그 아래 층인 tiered merge policy 파라미터, merge scheduler, index.codec 선택을 채운다. 디스크 사용량이 문서량 대비 부푸는 문제와 색인 latency spike의 상당수가 이 층에서 설명된다.

## Tiered merge policy

기본 merge policy는 tiered다. Segment를 크기 구간(tier)별로 보고, 각 tier에 `segments_per_tier`개까지 허용하며 초과하면 비슷한 크기끼리 골라 merge한다. Merge 후보 점수는 크기 편차(skew), 총 merge 크기, 회수되는 deleted 비율의 조합이다.

| 설정 | 기본값 | 의미 |
|---|---|---|
| `index.merge.policy` | tiered | log 계열 시계열은 log_byte_size 권장 |
| `segments_per_tier` | 10.0 | tier당 허용 segment 수, 낮출수록 merge 증가 |
| `max_merge_at_once` | 30 | 한 번에 merge할 최대 segment 수 |
| floor segment | 2MB (Lucene 기본) | 이보다 작은 segment는 같은 tier로 취급해 적극 merge |
| `max_merged_segment` | 5GB | 자동 merge가 만드는 segment 크기 상한 |

Floor segment는 잦은 refresh가 만든 초소형 segment가 tier 계산을 오염시키지 않게 바닥 크기로 묶는 장치다. 반대쪽 상한인 5GB가 shard 크기 권장과 연결된다. 자동 merge는 5GB보다 큰 segment를 만들지 않으므로, shard가 수백 GB면 5GB급 segment가 수십 개 쌓여 검색당 순회할 segment 수와 복구, 재배치 단위가 함께 커진다. AWS가 검색 latency 중심 workload에 shard당 10~30GiB, 로그 분석에 30~50GiB를 권장하는 것은 이 상한과 heap당 shard 수 제약을 함께 반영한 값이다.

## Deleted docs 회수와 update-heavy 디스크 부풂

Update와 delete는 삭제 표시만 남기고, 공간 회수는 merge가 해당 segment를 재작성할 때만 일어난다.

- `deletes_pct_allowed` 기본 20% (Lucene 기본, 허용 범위 5~50). Index 전체 deleted 비율이 이 안이면 회수만을 위한 merge를 강제하지 않는다.
- `reclaim_deletes_weight` 기본 2.0. Deleted가 많은 segment를 merge 후보에서 우대하는 가중치다.

Update-heavy workload에서 디스크가 부푸는 메커니즘: 매 update가 새 문서 색인 + 이전 버전 tombstone이고, 이미 `max_merged_segment`(5GB) 근처까지 자란 segment는 자동 merge 후보에 잘 들어가지 않아 deleted가 그 안에 계속 쌓인다. 결과적으로 live 데이터 대비 20% 이상 큰 디스크 사용이 정상 상태(steady state)다. 용량 산정에서 이 여유를 빼먹으면 disk watermark를 예상보다 일찍 친다. 상시 update 인덱스에서 deleted 비율이 계속 높으면 force merge보다 `_cat/segments`의 deleted 비율 확인과 문서 모델(부분 update 빈도, 문서 경계) 재설계가 먼저다.

## Merge scheduler와 throttling

Merge는 shard별 별도 thread에서 실행된다.

- `index.merge.scheduler.max_thread_count` 기본 `max(1, min(4, 코어수/2))`. SSD 기준값이며 HDD는 1로 낮춘다.
- `index.merge.scheduler.auto_throttle` 기본 true. 색인 유입량에 따라 merge I/O rate를 자동 조절한다.
- `index.merge_on_flush.enabled` 기본 true. Refresh 시점에 소형 segment를 최대 10초(`max_full_flush_merge_wait_time`) 기다려 합쳐 segment 폭증을 줄인다.

색인 latency와의 관계: merge가 색인 속도를 못 따라가 미처리 merge가 쌓이면 Lucene이 색인 쓰기를 지연시키는 write stall이 걸린다. Bulk 적재 중 주기적인 latency spike가 있으면 CPU보다 disk I/O와 merge 적체를 먼저 본다. 강제 refresh 남발이 소형 segment를 양산해 merge 대역폭을 소모하는 상류 원인인 경우가 많다.

## Force merge가 정당한 조건과 위험

정당한 조건은 하나다. 쓰기가 끝난 index를 read-only로 두고 실행하는 것. 시계열 rollover 후 이전 index를 `max_num_segments=1`로 합치면 단일 segment shard는 더 단순한 구조로 검색돼 효율이 좋다. [[OpenSearch-Index-Lifecycle|인덱스 수명주기]]의 ISM `force_merge` 액션이 이 패턴을 자동화한 것이다.

위험과 대가:

- `max_num_segments=1`은 모든 segment를 새 segment로 재작성하므로 진행 중 shard 디스크가 일시적으로 2배가 된다.
- 쓰기가 계속 오는 index에 실행하면 5GB를 훌쩍 넘는 거대 segment가 생기고, merge policy는 이 segment가 대부분 deleted가 될 때까지 다시 merge하지 않는다. 이후 update, delete의 공간 회수가 사실상 멈춰 디스크가 계속 부푼다.
- 호출은 완료까지 blocking이며 연결이 끊겨도 백그라운드에서 계속된다. 같은 index로의 새 force merge 요청은 대기한다. 장시간 작업은 `wait_for_completion=false`로 task화한다.
- `only_expunge_deletes=true`는 deleted 비율이 `expunge_deletes_allowed`(기본 10%)를 넘는 segment만 재작성한다. 2.12+부터는 이때도 `max_merged_segment`를 준수한다.
- `primary_only=true`(2.13+)는 primary만 merge한다. Snapshot은 primary segment만 복사하므로 snapshot 직전 용도로 비용을 절반으로 줄인다.

## index.codec 선택

`index.codec`은 stored fields(즉 `_source` 포함)의 압축 방식을 정하는 static 설정이다.

| codec | 알고리즘 | 버전 | 특성 |
|---|---|---|---|
| default | LZ4 + preset dictionary | 전체 | 속도 우선, index 크기 큼 |
| best_compression | zlib(DEFLATE) | 전체 | 압축률 우선, 색인과 검색 latency 증가 |
| zstd | Zstandard + dictionary | 2.9+ | best_compression급 압축률에 default보다 나은 속도 균형 |
| zstd_no_dict | Zstandard | 2.9+ | zstd보다 빠르고 index는 약간 큼 |
| qat_lz4, qat_deflate | 하드웨어 가속 | 2.15+ | Intel QAT 지원 Xeon 한정, 미지원 환경은 소프트웨어 fallback |

- zstd 계열은 `index.codec.compression_level`(1~6, 기본 3)로 압축률과 속도를 조절한다.
- 2.10+부터 zstd 계열은 k-NN과 Security Analytics index에 쓸 수 없다.
- Codec 변경은 close 후 설정 변경 후 reopen이거나 reindex다. 변경 후 새로 쓰이는 segment만 새 codec을 쓰므로 한 index 안에 압축 특성이 섞인다. snapshot을 구버전 cluster로 restore할 때 대상이 해당 codec을 지원해야 한다.

Fetch, highlight 비용과의 연결: stored fields는 문서 단위가 아니라 block 단위로 압축된다. 문서 하나를 fetch해도 그 문서가 속한 block을 통째로 해제하므로, 압축률이 높은 codec일수록 `_source`를 읽는 모든 경로(fetch phase, `_source` 기반 highlight, reindex, update의 원본 읽기)의 CPU가 늘어난다. 한국어 콘텐츠 검색처럼 본문 snippet과 highlight를 매 검색 응답에 싣는 서비스는 default(LZ4) 유지가 안전한 기본값이고, 조회가 드문 로그성 index는 zstd나 best_compression으로 디스크를 줄이는 편이 이득이다. 어느 쪽이든 대표 workload로 색인 처리량, 검색 p99, 디스크를 함께 벤치마크한 뒤 결정한다.

## 자주 틀리는 모델

- delete하면 디스크가 바로 준다 → 아니다. 삭제 표시만 남고, merge가 그 segment를 재작성해야 회수된다. Update-heavy index는 live 대비 20% 이상 부푼 디스크가 정상 상태다.
- force merge는 디스크 정리 도구라 수시로 돌려도 된다 → 쓰기 중인 index에 돌리면 반대로 회수 불가능한 거대 segment를 만들어 디스크를 더 부풀린다. 쓰기가 끝난 index 한정이다.
- best_compression은 디스크만 아끼고 검색엔 영향 없다 → stored fields 압축은 fetch와 highlight 경로의 CPU 비용이다. Query phase(역색인 탐색)가 아니라 fetch phase가 느려진다.
- segment가 적을수록 항상 좋으니 merge를 최대한 공격적으로 → merge 자체가 CPU, I/O를 먹고 색인 write stall을 유발한다. Hot index에서는 균형이고, 단일 segment의 이득은 read-only index에서만 안전하게 취한다.
- codec을 바꾸면 기존 데이터도 다시 압축된다 → 새 segment부터 적용된다. 전체 적용은 reindex나 (read-only 전제) force merge로 segment를 재작성해야 한다.

## 관련 문서

- [[OpenSearch-Indexing-Internals|색인 내부 동작]]
- [[OpenSearch-Index-Lifecycle|인덱스 수명주기]]
- [[OpenSearch-Performance-Troubleshooting|성능 트러블슈팅]]

## 출처

- [Index settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/)
- [Force merge - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/index-apis/force-merge/)
- [Index codecs - OpenSearch Documentation](https://docs.opensearch.org/latest/im-plugin/index-codecs/)
- [TieredMergePolicy - Apache Lucene Javadoc](https://lucene.apache.org/core/10_1_0/core/org/apache/lucene/index/TieredMergePolicy.html)
- [Choosing the number of shards - Amazon OpenSearch Service](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp-sharding.html)
