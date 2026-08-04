---
tags: [cdc, debezium, kafka, mysql, data-pipeline, monitoring]
status: done
verified_at: 2026-08-04
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["CDC 운영", "Debezium 대규모 운영과 장애 대응"]
---

# CDC와 Debezium 운영

CDC 운영의 핵심은 connector process 생존 여부보다 source commit부터 sink 적용까지의 position, schema와 재구축 가능성을 관찰하는 것이다.

## Source와 connector 전제

- MySQL binary log를 활성화하고 connector가 요구하는 `ROW` format, row image와 권한을 대상 Debezium version 문서로 확인한다.
- Binlog retention은 connector의 최대 예상 중단과 복구 시간을 넘겨야 한다. Disk 예산과 purge alarm을 함께 둔다.
- Replication client identity와 connector name, `topic.prefix`는 환경별로 유일하게 관리한다.
- TLS와 최소 권한을 사용하고 snapshot 대상 table과 column을 allowlist로 제한한다.
- Offset storage, schema history topic과 Kafka Connect config를 production data의 복구 자산으로 취급한다.

관리형 MySQL, Aurora와 failover topology는 hostname만 바꾸면 항상 이어지는 것으로 가정하지 않는다. GTID/binlog continuity, endpoint 전환과 connector 재시작 절차를 실제 failover로 검증한다.

## Initial snapshot과 streaming 전환

큰 table의 snapshot은 source I/O, network, connector heap과 topic storage를 동시에 압박한다.

1. 대상 row 수, row 폭, 예상 전송량과 완료 시간을 계산한다.
2. Snapshot consistency와 locking mode가 workload에 미치는 영향을 staging에서 검증한다.
3. Incremental snapshot 또는 별도 bulk backfill과 CDC catch-up 조합을 비교한다.
4. Snapshot event와 streaming event가 겹쳐도 sink가 idempotent하게 upsert하도록 한다.
5. Snapshot 종료 position과 streaming lag가 따라잡힌 시점을 기록한다.

Bulk snapshot과 live stream을 따로 만들면 두 경계 사이 누락과 중복을 막을 cutoff token이 필요하다. 시간만으로 대충 이어 붙이지 않는다.

## Schema evolution

Debezium은 MySQL binlog의 DDL을 읽고 schema history를 갱신한다. 이것이 모든 consumer가 자동으로 호환된다는 뜻은 아니다.

- Additive nullable field부터 expand하고 producer/consumer를 양방향 호환으로 배포한다.
- Rename, type narrowing과 semantic change는 새 field/topic/version으로 contract한다.
- Serializer schema registry가 있으면 compatibility mode와 registration 실패를 monitoring한다.
- Capture 대상에 새 table을 추가할 때 해당 table의 schema가 history에 있는지와 snapshot 방식부터 확인한다.
- DDL, connector config와 consumer 배포 순서를 runbook에 둔다.

## End-to-end 지표

| 지표 | 의미 |
|---|---|
| source position to connector position | Binlog 소비 지연과 retention 위험 |
| source timestamp to connector emit | Capture latency |
| broker offset to consumer position | Consumer lag와 partition skew |
| source timestamp to sink applied time | 사용자가 경험하는 end-to-end freshness |
| snapshot rows/bytes and remaining | 신규 pipeline 준비 진행률 |
| duplicate, stale reject and reconciliation diff | 전달보다 중요한 데이터 정합성 |

고정된 millisecond SLA를 복사하지 않고 use case별 freshness와 recovery objective를 정한다. Table과 operation별 event rate, message size와 hot partition도 함께 본다.

## Consumer 안전성

- key를 entity identity에 맞춰 같은 entity 변경이 한 partition에 머물게 한다.
- Event ID/source position dedup과 entity version compare-and-set을 사용한다.
- Delete/tombstone, truncate와 schema event를 sink가 어떻게 처리할지 명시한다.
- 일시 오류는 bounded retry/backoff, poison event는 격리와 수동 재처리 경로를 둔다.
- Offset commit과 sink write 사이 failure를 재현하고 결과가 중복돼도 안전한지 test한다.
- 주기적으로 source count/checksum/sample을 sink와 대사하고 차이를 replay 또는 rebuild한다.

## 장애별 복구

| 상황 | 우선 확인 | 복구 방향 |
|---|---|---|
| connector 중단, binlog 유지 | last offset, source position, auth/network | 같은 offset에서 재시작하고 duplicate 허용 |
| 필요한 binlog purge | snapshot 가능 시점, sink 상태 | 새 snapshot/backfill과 명시적 cutoff로 재구축 |
| schema history 손상 | connector version, DDL history와 대상 table | 문서화된 recovery 절차 또는 새 connector로 재구축 |
| poison schema/event | compatibility, serializer와 sink parser | 격리 후 expand-contract, 무작정 offset skip 금지 |
| hot table이 전체를 지연 | task 병렬성, partition/key와 source 순서 | connector/topic 분리의 ordering과 운영 비용 비교 |

Offset을 건너뛰면 pipeline이 살아난 것처럼 보여도 data gap이 남을 수 있다. Skip은 승인된 data-loss 결정과 backfill 계획이 있을 때만 사용한다.

## 보안과 거버넌스

CDC는 table의 모든 변경을 복제할 수 있어 PII blast radius를 넓힌다. Capture allowlist, field masking, topic ACL, encryption, retention과 audit owner를 둔다. Transform으로 가렸더라도 raw event가 중간 topic이나 log에 남는지 end-to-end로 확인한다.

## 출처

- [Debezium Documentation, MySQL Connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html)
- [Debezium Documentation, Monitoring](https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-monitoring)
- [Debezium Documentation, Incremental Snapshots](https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-incremental-snapshots)
- [Toss Tech, 대규모 CDC Pipeline 운영을 위한 Debezium 개선 여정](https://toss.tech/article/cdc_pipeline)

## 관련 문서

- [[CDC-Debezium-Concept|CDC와 Debezium 개념]]
- [[CDC-Debezium-Setup|Debezium DB별 설정]]
- [[At-Least-Once|At-Least-Once]]
- [[Idempotency-Key|Idempotency Key]]
- [[Backfill-Resource-Isolation|데이터 백필과 자원 격리]]
