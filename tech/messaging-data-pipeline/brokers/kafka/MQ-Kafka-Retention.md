---
tags: [messaging, kafka, retention, replay]
status: done
verified_at: 2026-10-07
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka Retention", "Kafka 보존 정책", "Kafka 재생 가능 기간"]
---

# Kafka 보존 정책과 재생 가능 기간

Kafka의 보존 정책은 소비 완료 여부가 아니라 로그의 시간과 크기로 삭제 대상을 정한다. consumer가 다시 읽을 데이터는 보존 범위 안에 남아 있어야 한다. 이 문서는 Apache Kafka 4.3의 일반 로그를 기준으로 하며 tiered storage의 로컬 보존 설정은 별도로 확인한다.

## 보존 한도와 세그먼트 크기

| 토픽 설정 | 4.3 기본값 | 의미 |
|---|---|---|
| `cleanup.policy` | `delete` | 보존 조건에 따라 오래된 세그먼트 삭제 |
| `retention.ms` | `604800000` (7일) | 시간 기반 보존 한도. `-1`은 시간 한도 해제 |
| `retention.bytes` | `-1` | 파티션별 크기 기반 보존 한도. 기본은 크기 제한 없음 |
| `segment.bytes` | `1073741824` (1 GiB) | 로그 세그먼트 파일 크기. 토픽의 총 보존 용량이 아님 |

기본값은 운영 환경의 실효값이 아니다. 토픽별 override가 없으면 서버 설정을 상속하므로 두 수준을 함께 확인한다. `segment.bytes`의 1 GiB를 `retention.bytes`의 기본값으로 해석하면 안 된다.

## 삭제 단위가 만드는 경계

- 삭제는 레코드 하나가 아니라 세그먼트 단위다. 시간 기준은 세그먼트 안의 가장 큰 레코드 timestamp를 사용한다.
- 시간과 크기 한도를 모두 켜면 어느 한쪽 기준에 해당하는 오래된 세그먼트가 삭제 대상이 된다. 시간 한도만으로 재생 기간을 보장할 수 없다.
- 세그먼트가 크면 파일 수는 줄지만 보존 제어의 단위가 거칠어진다. 레코드가 정확히 지정 시간에 개별 삭제되는 TTL로 해석하지 않는다.
- 보존 범위 밖의 offset은 다시 읽을 수 없다. offset reset은 시작 위치를 바꾸는 동작이며 삭제된 데이터를 복구하지 않는다.

예를 들어 `retention.ms=7일`, `retention.bytes=10 GiB`인 파티션에 데이터가 빠르게 쌓이면 7일 전에도 크기 조건으로 삭제될 수 있다. 4개 파티션의 명목 크기 한도 합은 40 GiB지만, replica와 인덱스, 세그먼트 단위 삭제를 고려하지 않은 값이므로 클러스터 디스크의 엄밀한 상한으로 쓰지 않는다.

## Compaction과 운영 점검

`compact`는 키별 최신 값을 남기는 정책이다. `delete,compact`를 함께 쓰면 보존된 세그먼트는 압축 정리되고 오래된 세그먼트는 시간과 크기 조건으로 삭제된다. 전체 이벤트 이력의 재생과 키별 상태 복원을 구분한다.

운영에서는 다음을 확인한다.

1. consumer의 최대 중단 시간과 따라잡는 시간을 합친 기간을 보존할 수 있는가.
2. 가장 바쁜 파티션이 크기 한도에 먼저 걸리지는 않는가.
3. 보존 범위를 넘었을 때 재수집, 백업 복원 또는 재처리 포기 중 어떤 경로를 쓸 것인가.

## 출처

- [Apache Kafka 4.3, Topic Configs](https://kafka.apache.org/43/configuration/topic-configs/)
- [Apache Kafka 4.3, Log (Reads, Deletes)](https://kafka.apache.org/43/implementation/log/)

## 관련 문서

- [[MQ-Kafka-Internals|Kafka 기본 구조와 내부]]
- [[Kafka-Partition-Sizing|파티션 개수와 장애 복구 처리량]]
- [[MQ-Kafka-Streams|Kafka Streams와 상태 저장소]]
