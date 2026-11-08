---
tags: [database, storage-engine, btree, lsm-tree, performance]
status: done
verified_at: 2026-11-08
category: "데이터&저장소(Data&Storage)"
aliases: ["Storage Engine Amplification", "Read Amplification", "Write Amplification", "Space Amplification", "RUM Conjecture", "읽기 증폭", "쓰기 증폭", "공간 증폭"]
---

# 저장 엔진의 읽기, 쓰기와 공간 증폭

애플리케이션이 요청한 논리 작업과 저장 엔진이 실제로 하는 물리 작업은 다르다. 작은 레코드 하나를 읽어도 여러 블록을 읽을 수 있고, 값 하나를 바꿔도 여러 번의 쓰기가 생기며, 데이터보다 큰 디스크 공간을 쓴다. 이 차이를 읽기 증폭, 쓰기 증폭과 공간 증폭으로 나눠 재면 저장 엔진과 설정의 교환 관계를 같은 기준으로 비교할 수 있다.

## 세 증폭의 정의

| 증폭 | RocksDB 튜닝 가이드의 정의 | 늘리는 대표 요인 |
|---|---|---|
| 읽기 증폭 | 질의 하나에 필요한 디스크 읽기 수. 5개 페이지를 읽어야 답하면 5 | 여러 위치를 확인해야 하는 구조, 범위 질의, 캐시 미스 |
| 쓰기 증폭 | 저장 장치에 쓴 바이트 / 데이터베이스에 쓴 바이트 | 페이지 단위 재쓰기, WAL과 이중 쓰기, compaction의 재쓰기 |
| 공간 증폭 | 디스크의 데이터베이스 파일 크기 / 데이터 크기 | B-tree의 단편화, LSM에 남은 이전 버전, 색인과 필터 |

RUM 논문은 비슷한 개념을 데이터 양의 비율로 정의한다. 읽기 부담(RO)은 보조 데이터와 기본 데이터를 합쳐 읽은 양을 가져온 데이터 양으로 나눈 값이다. 쓰기 부담(UO, 원문 명칭 update overhead)은 논리적 갱신 하나를 위해 기본 데이터와 보조 데이터에 실제로 수행한 물리적 갱신의 크기를 그 논리적 갱신의 크기로 나눈 값이다. 메모리(공간) 부담(MO)은 보조 데이터와 기본 데이터가 쓰는 공간을 기본 데이터의 공간으로 나눈 값이다. 기본 데이터를 항상 직접 읽고 갱신하며 추가 공간을 쓰지 않을 때의 이론적 최소가 셋 다 1.0이다. 읽은 데이터 양의 비율이므로 RocksDB의 디스크 읽기 수와 바로 비교하지 않는다.

숫자를 비교하려면 어떤 정의로 세는지와 캐시를 어떻게 셀지부터 정한다. RocksDB 가이드는 block cache나 OS 파일 시스템 캐시가 처리한 읽기(가이드의 logical read)와 저장 장치가 처리한 읽기(physical read)를 구분하고, 캐시가 처리한 읽기는 훨씬 싸지만 CPU 비용은 든다고 적는다. Mark Callaghan은 읽기 증폭을 읽기 요청 하나에 드는 작업량(키 비교, 전송 바이트, seek와 압축 해제)으로 넓게 정의하고, 캐시가 없는 최악의 경우와 일부 캐시가 있는 평균의 경우, 점 질의와 범위 질의를 따로 센다. RocksDB, RUM 논문과 Callaghan의 정의를 섞지 않고, 측정값에는 캐시 조건과 질의 종류를 함께 적는다.

## RUM 추측: 둘을 묶으면 나머지 하나에 하한이 생긴다

RUM 추측(RUM Conjecture)은 세 부담 중 둘에 상한을 두도록 접근 방법(access method, 데이터를 조직하고 접근하는 알고리즘과 자료구조)을 설계하면 나머지 하나에 더 줄일 수 없는 하한이 생긴다는 주장이다. 논문은 세 가지 예를 든다. 갱신 비용을 줄이려고 변경을 따로 모아 두는 차분 구조는 공간 부담을 늘리고, 질의가 처리 중에 관련된 대기 갱신을 합쳐야 하므로 읽기 비용도 나빠진다. 읽기를 줄이려고 워크로드마다 다른 물리 배치를 두면 사본이 여러 벌 생겨 갱신과 공간 비용이 늘어난다. 메타데이터를 최소화해 공간을 줄이면 읽고 갱신할 때의 검색 시간이 늘어난다.

증명된 정리가 아니라 추측이다. 같은 논문은 현대 데이터 시스템에서는 세 부담 모두를 어느 정도까지 최적화할 수 있다고 적는다. 그 예로 든 블록 단위 클러스터 색인은 색인 속성 기준으로 군집된 데이터의 성질과 위치 계산을 이용하고, 비트맵 색인의 압축은 압축과 해제 계산을 들여 읽기와 메모리 부담을 함께 줄인다. 다만 압축 같은 공간 절약 기법은 대개 쓰기 비용을 늘리며, 계산과 데이터 크기의 교환이 RUM 추측의 근본 성격을 바꾸지는 않는다고 본다. 핵심은 만능 설계가 없다는 데 있다. 논문은 모든 경우에 가장 좋은 접근 방법도, 사용 사례마다 가장 좋은 접근 방법을 따로 만드는 것도 실현 가능하지 않다고 보고, 바뀌는 요구사항과 하드웨어에 맞춰 형태를 바꾸는 접근 방법을 방향으로 제시한다.

Callaghan은 2015년 글 Read, write & space amplification - pick 2에서 알고리즘은 세 증폭 중 최대 둘까지만 최적화할 수 있으므로 한 알고리즘이 셋 모두에서 다른 알고리즘보다 나을 가능성은 낮다고 정리했다. RocksDB 튜닝 가이드는 compaction을 세 증폭 사이의 교환을 바꾸는 핵심으로 설명한다.

## B-tree와 LSM-tree는 비용을 치르는 시점이 다르다

아래 B-tree 열은 페이지를 제자리에서 갱신하는 구현을 기준으로 한다.

| | B-tree | LSM-tree |
|---|---|---|
| 쓰기 | 페이지를 읽은 뒤 제자리에서 바꾼다. 작은 행을 바꿔도 페이지 단위로 쓴다 | 먼저 메모리와 로그에 쓰고 정렬된 파일로 내린 뒤 compaction이 다시 쓴다 |
| 읽기 | 트리를 따라 내려가 한 위치를 찾는다 | 여러 레벨의 파일을 확인할 수 있어 필터와 캐시에 기댄다 |
| 공간 | 무작위 갱신으로 리프 페이지가 덜 찬다 | 아직 compaction되지 않은 이전 버전이 남는다 |

Callaghan은 pick 2 글에서 B-tree가 LSM보다 읽기 증폭이 작고 LSM은 B-tree보다 쓰기 증폭이 작다는 것을 예로 든다. B-tree는 페이지를 바꾸려면 먼저 읽어야 하지만, LSM은 그 읽기 비용을 백그라운드 compaction으로 미룬다(redo log 쓰기와 메모리 구조 갱신은 미루지 않는다). 다음 날의 글 Read, write & space amplification - B-Tree vs LSM에서는 B-tree는 비리프 레벨 전부가, LSM은 가장 큰 레벨의 데이터 블록을 뺀 나머지가 캐시에 있다고 가정하면 점 질의의 최악 디스크 읽기 증폭이 둘 다 1이라고 덧붙인다. 남는 키 비교 같은 메모리 안의 작업 차이는 IO가 병목인 질의에서는 크지 않다고 본다.

B-Tree vs LSM 글의 예시 계산은 다음과 같다. buffer pool이 dirty page로 가득 찬 최악의 경우, 4KB 페이지에서 128바이트 행 하나를 바꾸는 B-tree의 쓰기 증폭은 (4096 + 128) / 128 = 33이다(flash를 가정해 seek는 빼고 바이트만 센다). 레벨 0에서 4까지인 LSM의 예는 1 + 1 + 1 + 7 + 7 + 7 = 24다. 앞의 1, 1, 1은 redo log, memtable flush와 L1로의 compaction이고, 7은 L2에서 L4까지 각 레벨로의 compaction에 단순 모델의 약 10 대신 실제로 관찰되는 약 7을 둔 값이다. Callaghan은 두 예가 서로 비교하려고 만든 것은 아니라고 밝히면서도 LSM의 쓰기 증폭이 B-tree보다 작은 경향이 있다고 본다. 공간은 무작위 갱신을 받은 B-tree 리프 페이지가 50~70% 차므로 2/3가 차면 1.5, 절반이면 2이고, leveled compaction을 쓰는 LSM은 1.1이나 1.2가 나올 가능성이 높으며 size-tiered compaction은 흔히 2라고 설명한다. 2015년 글의 모델과 경험치이며 엔진 버전과 설정에 따라 달라진다. 페이지 채움률과 분할은 [[B-Tree-Index-Depth#페이지 분할과 병합|페이지 분할과 병합]]에서 다룬다.

## 페이지 단위 내구성 장치도 쓰기를 늘린다

데이터 파일의 페이지를 제자리에 덮어쓰는 PostgreSQL과 InnoDB는 기본 설정에서 페이지가 일부만 기록되는 장애에 대비하는 장치 때문에 같은 데이터를 한 번 더 쓴다.

- **PostgreSQL `full_page_writes`:** 켜져 있으면 checkpoint 뒤 각 페이지를 처음 바꿀 때 페이지 전체 내용을 WAL에 쓴다. OS 장애 중에 쓰던 페이지가 일부만 기록되어 이전 데이터와 새 데이터가 섞이는 경우를 복구하기 위해서이고, 그 대가로 WAL에 쓸 양이 늘어난다. 문서는 checkpoint 간격을 늘리는 것을 이 비용을 줄이는 한 방법으로 든다. 끄면 평상시 동작은 빨라지지만 시스템 장애 뒤 복구할 수 없는 손상이나 드러나지 않는 손상이 생길 수 있다고 경고한다. 기본값이 off인 `wal_compression`을 켜면 full page image를 압축해 WAL 양을 줄일 수 있지만, WAL을 쓸 때의 압축과 replay할 때의 압축 해제에 CPU를 더 쓴다(PostgreSQL 18 문서 기준).
- **InnoDB doublewrite buffer:** buffer pool에서 flush하는 페이지를 데이터 파일의 제자리에 쓰기 전에 doublewrite 파일에 먼저 쓴다. 페이지를 쓰는 도중 장애가 나면 복구 때 그 영역에서 온전한 사본을 찾는다. 데이터는 두 번 쓰지만 큰 순차 단위로 쓰고 `fsync()`를 한 번만 호출하므로 I/O 부담이나 I/O 횟수가 두 배가 되지는 않는다(이 `fsync()` 부분은 `innodb_flush_method`가 `O_DIRECT_NO_FSYNC`일 때 예외). 문서는 데이터 무결성보다 성능을 더 중시하는 경우(예: 벤치마크) 끄는 것을 고려하라고 적는다(MySQL 8.4 문서 기준). 복구 경로는 [[MySQL-InnoDB-Redo-and-Crash-Recovery#Doublewrite와 torn page|InnoDB doublewrite와 torn page]], 저장 장치가 부분 쓰기를 막아 주는 경우는 [[EBS#Torn Write Prevention과 DB 쓰기 정렬|EBS Torn Write Prevention]]에서 다룬다.

## RocksDB의 compaction과 필터 설정

- **Leveled compaction:** 레벨마다 목표 크기가 `max_bytes_for_level_multiplier`(기본 10)배씩 커진다. RocksDB 8.4부터 기본값인 `level_compaction_dynamic_level_bytes=true`는 마지막 레벨의 목표를 실제 크기로 두고 위로 갈수록 multiplier로 나눠, multiplier 10 기준 데이터의 90%를 마지막 레벨에, 9%를 그 앞 레벨에 두도록 보장하고 공간 증폭에 상한을 둔다. 튜닝 가이드의 예시는 L1부터 레벨마다 10배씩 키우는 구성으로 쓰기 증폭 약 33, 공간 증폭 1.14를 계산한다. 레벨당 10을 쓴 이론 계산이라 Callaghan의 B-Tree vs LSM 글에 나온 LSM 예(24)와 다르고, 같은 글의 B-tree 예(33)와 같은 조건의 비교도 아니다. 가이드의 마지막 수정이 2023-03-28이고 계산 방식이 dynamic이 꺼진 경우의 규칙과 같아 현재 기본값의 수치로 쓰지 않는다(이 문서의 해석).
- **Universal compaction:** 튜닝 가이드는 쓰기 증폭을 낮추려는 방식이지만 읽기 증폭을 늘릴 수 있고 공간 증폭은 항상 늘린다고 설명한다. 전체 compaction 중에는 입력과 출력을 함께 유지해 크기가 일시적으로 두 배가 될 수 있다. 가이드는 `max_size_amplification_percent`의 기본값 200을 100바이트 데이터베이스가 300바이트까지 저장 공간을 쓸 수 있다는 뜻으로 설명하고, Universal Compaction 문서는 이 값을 넘으면 전체 compaction을 일으키는 추정 문턱으로 설명한다.
- **Bloom filter:** 점 조회에서 키가 없는 SST 파일 대부분을 건너뛰게 한다(false positive만큼은 읽는다). 튜닝 가이드는 `bits_per_key`의 기본값 10이 약 1%의 false positive를 낸다고 적는다. 키 전체로 만든 필터는 범위 스캔에 도움이 되지 않고, prefix extractor로 만든 prefix 필터는 prefix 범위 질의의 읽기 증폭을 줄일 수 있다. `bits_per_key`를 늘리면 false positive는 줄지만 메모리와 공간 증폭이 늘어난다. 자료구조 자체는 [[Bloom-Filter|Bloom Filter]]에서 다룬다.

## 압축, 캐시와 블록 크기

아래 RocksDB 권고는 튜닝 가이드(2023-03-28 수정본) 기준이다.

- 압축은 공간 증폭을 줄인다. Callaghan은 그래서 1보다 작은 공간 증폭도 가능하다고 본다. RUM의 MO는 기본 데이터가 쓰는 공간이 분모라 이론적 최소가 1.0이고, 데이터 크기를 분모로 쓰는 Callaghan의 공간 증폭은 압축으로 1 아래가 될 수 있다(이 문서의 해석). 대신 읽을 때 압축을 푸는 비용이 들고, 고정 크기 페이지에 압축 결과를 담는 엔진은 남는 공간을 버릴 수 있다(InnoDB에서 16KB 페이지를 5KB로 압축해 8KB 페이지에 담으면 3KB가 낭비된다). RocksDB 가이드는 레벨 0과 1은 압축하지 않고 번호가 큰 레벨만 압축하는 구성이 대개 합리적이라고 적는다.
- RocksDB의 block cache는 압축을 푼 블록을, OS 캐시는 압축된 블록을 담는다. 가이드는 읽기 IOPS가 포화되면 compaction부터 확인하고 block cache 적중률을 높이는 것도 시도하라고 권한다.
- `block_size`를 키우면 메모리 사용과 공간 증폭은 줄지만 읽기 증폭은 늘어난다.

## 운영 체크포인트

- 증폭 수치를 비교할 때 어떤 정의를 썼는지, 캐시 포함 여부, 점 질의와 범위 질의를 구분했는지 확인한다. iostat으로 추정한 읽기에는 질의의 읽기와 compaction의 읽기가 함께 들어간다.
- 쓰기 대역폭이나 저장 장치의 쓰기 수명이 병목이면 쓰기 증폭을, 조회 지연이 병목이면 읽기 증폭을, 저장 비용이 병목이면 공간 증폭과 압축을 먼저 본다.
- 저장 엔진의 쓰기 증폭과 SSD 내부의 쓰기 증폭은 다른 계층이다. SSD 쪽은 [[Storage-and-FileSystem-Devices#SSD 특성|SSD 특성]]과 [[Storage-and-FileSystem-Performance|스토리지와 파일 시스템 성능]]에서 다룬다.
- 보조 인덱스는 읽기를 줄이는 대신 쓰기와 공간을 늘린다. PostgreSQL의 HOT update처럼 인덱스 갱신을 피하는 조건도 함께 본다([[Index-Write-Cost-and-Cleanup#PostgreSQL의 HOT와 Partial Index|PostgreSQL의 HOT와 Partial Index]]).

## 면접 체크포인트

- 세 증폭을 정의하고 B-tree와 LSM-tree가 각각 어디서 비용을 치르는지 설명할 수 있는가.
- 키 전체로 만든 Bloom filter가 범위 스캔을 줄이지 못하는 이유와 prefix 필터가 돕는 경우는 무엇인가.
- `full_page_writes`와 doublewrite buffer는 어떤 장애에서 복구하게 하고, 그 대가로 무엇을 더 쓰는가.

## 출처

- [Designing Access Methods: The RUM Conjecture — EDBT 2016, Manos Athanassoulis 외](https://openproceedings.org/2016/conf/edbt/paper-12.pdf)
- [Read, write & space amplification - pick 2 — Small Datum, Mark Callaghan](https://smalldatum.blogspot.com/2015/11/read-write-space-amplification-pick-2_23.html)
- [Read, write & space amplification - B-Tree vs LSM — Small Datum, Mark Callaghan](https://smalldatum.blogspot.com/2015/11/read-write-space-amplification-b-tree.html)
- [RocksDB Wiki, RocksDB Tuning Guide](https://github.com/facebook/rocksdb/wiki/RocksDB-Tuning-Guide)
- [RocksDB Wiki, Leveled Compaction](https://github.com/facebook/rocksdb/wiki/Leveled-Compaction)
- [RocksDB Wiki, Universal Compaction](https://github.com/facebook/rocksdb/wiki/Universal-Compaction)
- [RocksDB Wiki, RocksDB Bloom Filter](https://github.com/facebook/rocksdb/wiki/RocksDB-Bloom-Filter)
- [PostgreSQL 18 Documentation, Write Ahead Log](https://www.postgresql.org/docs/18/runtime-config-wal.html)
- [MySQL 8.4 Reference Manual, Doublewrite Buffer](https://dev.mysql.com/doc/refman/8.4/en/innodb-doublewrite-buffer.html)

## 관련 문서

- [[B-Tree|B-Tree]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]
- [[Bloom-Filter|Bloom Filter]]
- [[Index-Write-Cost-and-Cleanup|인덱스 쓰기 비용과 정리]]
- [[MySQL-InnoDB-Redo-and-Crash-Recovery|InnoDB redo와 장애 복구]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[PostgreSQL-Storage-Bottlenecks|PostgreSQL 스토리지 병목]]
- [[Storage-and-FileSystem-Performance|스토리지와 파일 시스템 성능]]
