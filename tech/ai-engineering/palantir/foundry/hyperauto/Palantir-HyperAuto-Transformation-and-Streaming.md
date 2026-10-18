---
tags: [palantir, hyperauto]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# HyperAuto 변환과 처리 모드

## Batch와 streaming

기본 batch는 입력을 다시 처리해 출력을 교체한다. 별도로 experimental incremental은 direct SAP 연결의 batch pipeline에서 새로 append된 입력만 처리한다. Folder 기반이나 모든 source에 일반화하지 않는다. Streaming은 지속 polling/상시 compute로 지연을 줄이는 대신 source와 Foundry 부하가 늘어난다.

Streaming에서 enrichment table은 batch lookup으로 읽어 핵심 stream과 left join한다. 두 live stream의 join으로 이해하면 갱신 의미를 잘못 판단한다. 기존 enrichment sync는 Avro-compatible schema가 필요하며 SAP의 cleanFieldNamesForAvro가 관련 설정이다.

## 생성 의미를 바꾸는 옵션

기본 옵션을 끄면 편의와 성능뿐 아니라 출력 schema와 관계가 달라진다. Language 선택은 다국어 table을 join 전에 필터링한다. Metadata가 object/enrichment table을 분류해 SAP TEXT 같은 enrichment를 object에 left join한다.

Human-readable 열 이름은 설명과 원래 이름을 Human readable_|_original 형식으로 함께 보존한다. Dataset 설명 이름 옵션을 기존 pipeline에서 켜도 이미 있는 output dataset 이름은 바꾸지 않는다.

복합 primary key는 metadata에 정의된 열을 _|_로 이어 단일 key를 만든다. Foreign key도 관계별 열을 이어 생성하지만 automatic join한 object-enrichment 관계에는 별도 FK를 만들지 않는다. 구분자와 null/타입, 실제 uniqueness를 후속 업무 계약에서 확인한다.

Dedup은 primary key별 최신 행을 선택한다. Streaming의 main output은 batch/incremental에서 읽을 때 deduplicated view로 해석되고 changelog output은 비중복 제거 기록을 제공한다. Stream 소비 시의 changelog와 배치 view를 혼동하지 않는다. 지원 목록 밖 PK 타입은 string으로 cast한다.

Cleaning은 empty string을 null로, DECIMAL을 DOUBLE로 바꿀 수 있다. 이 설정은 정확한 decimal 정밀도와 빈 문자열 의미가 필요한 업무에 영향을 주므로 단순 외관 정리로 취급하지 않는다.

## Compute 선택

Standard는 Spark 기반 전체 expression/transform 범위를 지원한다. Beta Faster는 DataFusion 기반으로 짧고 낮은 지연 작업을 겨냥하며 15분 이하 작업의 이점은 측정할 출발점이다. 이름만으로 모든 표현식 호환이나 성능 개선을 보장하지 않는다. Sync creation, incremental과 compute backend의 beta/experimental 가용성은 enrollment마다 확인한다.

## 출처

- [Palantir Foundry, configuration-options](https://www.palantir.com/docs/foundry/hyperauto/configuration-options/)

## 관련 문서

- [[Palantir-Foundry-HyperAuto]]
