---
tags: [palantir, foundry, api, stream, partition, cdc]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Streams API"]
---

# Streams의 branch, view와 offset 계약

Foundry stream은 cold storage인 streaming dataset과 hot storage인 buffer를 결합한다. dataset의 branch 하나마다 active stream 하나를 가진다. branch 이름, active view와 partition별 offset을 구분해야 생성/초기화/소비 상태를 올바르게 추적할 수 있다.

## 생성과 설정

`POST /api/v2/streams/datasets/create`는 name, parentFolderRid와 schema를 받아 dataset과 초기 branch의 stream을 만든다. branchName을 생략하면 enrollment의 default branch를 사용하며 많은 enrollment의 예는 master다. 사용자 개인 folder에는 만들 수 없다.

`POST /api/v2/streams/datasets/{datasetRid}/streams`는 기존 backing dataset에 새 branch와 그 branch의 stream을 만든다. branchName과 schema가 필수며 이미 있는 branch면 BranchAlreadyExists다. 두 생성 경로 모두 `api:streams-write`, `preview=true`를 요구한다.

partitionsCount 기본값은 1이다. 생성 문서는 이 값을 나중에 변경할 수 없다고 명시하므로 사전 용량 계획이 필요하다. partition 하나 약 5 mb/s라는 reference의 일반적 설명은 성능 보장이나 실제 부하 시험의 결과로 사용하지 않는다. streamType은 기본 LOW_LATENCY이며 HIGH_THROUGHPUT과 호환되지 않는다. compressed 기본값은 false다.

schema field는 nullable, dataType과 선택적 customMetadata를 가진다. scalar 외에 struct/subFields, array/itemsSchema, map/keySchema/valueSchema를 표현한다. Decimal의 precision과 scale의 최대값은 각각 38로 기재된다. field 명세와 실제 record의 타입을 함께 검증한다.

## Partition key와 중복 제거는 다르다

keyFieldNames는 같은 key의 record를 같은 partition에 보내 처리 순서를 유지하는 키다. record의 유일성을 강제하거나 자체적으로 중복 제거하지 않는다. 지원 key 타입은 Boolean, Byte, Date, Decimal, Integer, Long, Short, String과 Timestamp다. Float/Double이나 복합 타입을 이름만으로 key로 사용할 수 있다고 가정하지 않는다.

CDC를 설정하려면 key 하나 이상이 필요하다. 확인일 fullRow 방식은 새 전체 행 상태를 publish해 최신 row를 결정한다. deletionFieldName은 삭제 여부를 나타내는 boolean field, orderingFieldName은 최신 상태를 정할 field다. ordering에는 Byte/Date/Decimal/Integer/Long/Short/String/Timestamp를 지원하며 partition key에 허용되는 Boolean과 범위가 다르다.

부분 field만 담은 patch record를 fullRow CDC와 같은 계약으로 보내지 않는다. 같은 key를 여러 번 publish할 때 원본 이벤트의 중복/순서와 최종 row 상태를 구별한다.

## 조회와 publish 입력 위치

Get Stream은 `/api/v2/streams/datasets/{datasetRid}/streams/{streamBranchName}`의 GET이며 `api:streams-read`를 요구한다. schema, branchName, viewRid, partitionsCount, streamType과 compressed를 반환한다. branch 부재, stream 부재와 접근 권한 부재 모두 404일 수 있다.

고처리량 IO prefix는 `/api/v2/highScale/streams/datasets/{datasetRid}/streams/{streamBranchName}`다.

| 작업 | Method와 나머지 경로 | 주요 입력 |
|---|---|---|
| 끝 offset 조회 | GET `/getEndOffsets` | 선택적 viewRid query, Preview |
| record 읽기 | GET `/getRecords` | partitionId, limit, 선택적 startOffset/viewRid query, Preview |
| binary 한 건 publish | POST `/publishBinaryRecord` | binary body, 선택적 viewRid query |
| JSON 한 건 publish | POST `/publishRecord` | body의 record와 선택적 viewRid |
| JSON batch publish | POST `/publishRecords` | body의 records와 선택적 viewRid |

조회는 `api:streams-read`, publish는 `api:streams-write` scope다. 위 IO 모두가 Preview라고 일반화하지 않는다. getEndOffsets/getRecords는 opt-in 경고가 있고 확인일 publish 명세에는 같은 경고가 없다.

JSON record는 stream schema로 검증한다. batch에 하나라도 유효하지 않은 record가 있으면 batch가 거부된다. 이를 모든 네트워크 실패에서 end-to-end exactly-once나 전체 소비자에 대한 원자적 가시성 보장으로 확대하지 않는다. publish 성공 응답은 body가 없으며 중복 제거 계약은 partition key만으로 주어지지 않는다.

timestamp field를 stream key로 쓸 때는 Unix epoch millisecond로 publish한다. binary endpoint는 stream schema가 binary field 하나인 경우에만 사용한다. 읽기 응답의 binary 값은 base64 문자열이므로 원래 byte가 필요하면 decoding한다.

## Offset은 개수나 페이지 번호가 아니다

getEndOffsets는 각 partition에 **다음에 쓸 record의 offset**을 반환한다. 이미 존재하는 마지막 record offset과 같은 의미가 아니다.

getRecords의 startOffset은 포함 하한이며 생략하면 partition 처음부터 읽는다. offset은 0 이상 순서지만 `0, 2, 3, 5`처럼 비어 있을 수 있다. 인접 offset 차이를 record 수나 누락 건수로 계산하지 않는다. 응답은 limit보다 적을 수 있으며 offset/value 목록을 반환한다.

재개 지점을 설계할 때 viewRid, partitionId와 실제 처리한 offset을 함께 기록하는 방식을 검토한다. startOffset이 포함 경계이므로 같은 값을 다시 쓰면 마지막 처리 항목을 다시 읽을 수 있다. 이는 API 경계에서 도출한 소비자 설계 점검이며 서버가 소비 commit이나 자동 중복 제거를 제공한다는 뜻은 아니다.

offset은 Long 문자열 형식의 schema인 반면 예제에는 JSON 숫자도 나타난다. 실제 SDK/wire 타입을 확인하고 큰 offset의 정확도를 보존한다.

## Reset은 데이터 유지형 설정 변경이 아니다

`POST /api/v2/streams/datasets/{datasetRid}/streams/{streamBranchName}/reset`은 기존 record를 비우고 새 설정을 적용한다. 새 stream view가 만들어져 branch의 viewRid가 바뀌며 이후 branch 쓰기의 대상이 된다. `api:streams-write`, `preview=true`를 요구한다.

reset body에서 schema, partitionsCount, streamType과 compressed를 생략하면 기존 설정을 사용한다. record를 유지하며 설정을 바꾸려면 플랫폼 UI의 stream settings를 사용하라는 별도 안내가 있다. 이 안내를 어떤 설정도 무제한으로 변경할 수 있다는 보장으로 해석하지 않는다.

viewRid를 지정하면 특정 view에만 읽기/쓰기한다. 생략하면 branch의 최신 stream을 사용한다. reset 전후에 같은 branchName과 offset만 이어 쓰면 다른 view의 위치를 혼동할 수 있다. 특정 view를 고정한 client가 reset 이후 어떻게 전환할지도 함께 설계한다.

InvalidSchema/InvalidFieldSchema, schema 없는 stream, 잘못된 streamType과 작업별 PermissionDenied를 구분한다. 공식 전체 schema 대조를 수행했으며 실제 publish/소비, 처리량, CDC 재정렬과 reset의 데이터 삭제를 시험하지 않았다.

## 출처

- [Palantir, Streaming Dataset basics](https://www.palantir.com/docs/foundry/api/streams-v2-resources/datasets/dataset-basics)
- [Palantir, Stream basics](https://www.palantir.com/docs/foundry/api/streams-v2-resources/streams/stream-basics)
- [Palantir, Create Streaming Dataset](https://www.palantir.com/docs/foundry/api/streams-v2-resources/datasets/create-streaming-dataset)
- [Palantir, Create Stream](https://www.palantir.com/docs/foundry/api/streams-v2-resources/streams/create-stream)
- [Palantir, Get Stream](https://www.palantir.com/docs/foundry/api/streams-v2-resources/streams/get-stream)
- [Palantir, Get End Offsets For Stream](https://www.palantir.com/docs/foundry/api/streams-v2-resources/streams/get-end-offsets-for-stream)
- [Palantir, Get Records From Stream](https://www.palantir.com/docs/foundry/api/streams-v2-resources/streams/get-records-from-stream)
- [Palantir, Publish Binary Record To Stream](https://www.palantir.com/docs/foundry/api/streams-v2-resources/streams/publish-binary-record-to-stream)
- [Palantir, Publish Record To Stream](https://www.palantir.com/docs/foundry/api/streams-v2-resources/streams/publish-record-to-stream)
- [Palantir, Publish Records To Stream](https://www.palantir.com/docs/foundry/api/streams-v2-resources/streams/publish-records-to-stream)
- [Palantir, Reset Stream](https://www.palantir.com/docs/foundry/api/streams-v2-resources/streams/reset-stream)

## 관련 문서

- [[Palantir-Data-APIs]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-Python-Incremental-Contract]]
