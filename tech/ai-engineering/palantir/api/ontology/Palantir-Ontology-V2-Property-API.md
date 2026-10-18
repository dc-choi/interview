---
tags: [palantir, foundry, api, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology V2의 파일, Cipher와 시계열 property

특수 property endpoint도 object type API name과 primary key, property API name을 문맥으로 사용한다. 이 문서의 읽기 scope는 `api:ontologies-read`이며, Attachment upload만 `api:ontologies-write`다. Public API 명세를 확인한 것으로 실제 권한과 스트림 처리는 시험하지 않았다.

## Attachment와 MediaReference

V2 Attachment upload는 `/api/v2/ontologies/attachments/upload`에 filename과 octet-stream body를 보낸다. 한 시간 이내 Action으로 연결하지 않으면 삭제되고, 기존에 연결되었으나 고아가 된 파일은 2주 주기로 제거된다. RID metadata/content 직접 조회와 object property에 연결된 조회를 구별한다.

`/objects/.../attachments/{property}` metadata 응답은 single 또는 multiple variant다. multiple은 data와 nextPageToken을 제공한다. RID를 붙여 특정 attachment의 metadata/content를 읽을 때는 해당 RID가 그 property의 attachment 배열에 있어야 한다. 다른 object의 attachment를 RID만으로 같은 문맥에 포함하지 않는다.

MediaReference는 현재 Media Set View item만 지원한다. mediaSetItem 직접 참조나 datasetFile 참조는 object load 응답에서 생략되어 Foundry UI에 미디어가 있어도 클라이언트에는 값 없음처럼 보일 수 있다.

Preview `/media/{property}/content`는 단일 Range `bytes=start-end` 또는 `bytes=start-`를 지원한다. 가능한 범위는 206과 Content-Range/Accept-Ranges/반환 길이, 불가능한 범위는 416과 `Content-Range: bytes */<total length>` 및 빈 body다. malformed/unsupported Range는 무시해 전체 content와 200을 반환한다. 다운로드 클라이언트는 Range를 보냈다는 이유만으로 partial content라고 가정하지 않는다.

Media content는 branch/transaction/scenario를 지원하지만 branch/transaction은 endpoint 설명의 experimental 범위를 따른다. Signed media reference와 배열의 제약은 [[Palantir-Ontology-V2-ObjectSet-API]]를 참고한다.

## CipherText

CipherText property는 Cipher로 암호화한 데이터다. `/ciphertexts/{property}/decrypt` GET은 plaintext 문자열을 담은 DecryptionResult를 반환한다. SDK package/version과 branch 문맥이 제공된다. metadata나 일반 object load 값과 평문 복호화 결과를 분리해 취급한다.

## Time Series point streaming

`/timeseries/{property}/firstPoint`와 lastPoint는 ISO timestamp의 time과 string 또는 double value를 반환한다. streamPoints는 POST body에 optional absolute/relative range와 aggregate를 넣고 binary stream을 받는다. 출력 기본 JSON이며 ARROW가 대량 스트림에 더 효율적이다.

Absolute range는 시작 포함, 끝 제외다. relative는 현재 순간 기준 BEFORE/AFTER, value와 시간 unit을 사용한다. 날짜 범위나 상대 month를 고정 초로 임의 환산하지 않는다.

aggregate method는 SUM/MEAN/STANDARD_DEVIATION/MAX/MIN/PERCENT_CHANGE/DIFFERENCE/PRODUCT/COUNT/FIRST/LAST다. strategy는 다음과 같다.

| strategy | window 계약 |
|---|---|
| cumulative | 현재 점을 포함한 모든 이전 점 |
| rolling | 현재 timestamp를 포함한 duration 또는 pointsCount window |
| periodic | 고정 duration 구간, 빈 구간은 출력하지 않음 |

고정 duration unit은 NANOSECONDS/SECONDS/MINUTES/HOURS/DAYS/WEEKS이며 하루 24시간, 일주일 7일이다. periodic alignmentTimestamp 기본은 UTC epoch이며 각 tick이 해당 timestamp에서 window duration의 정수 배수에 놓인다. windowType START/END도 지정한다. 지역 달력상의 하루와 이 고정 duration을 동일시하지 않는다.

## Value Bank와 geotemporal

latestValue는 time과 string/double/geopoint value를 반환한다. 같은 geotime integration에 history와 live가 모두 있으면 **live를 우선**한다. streamValues는 geotime reference까지 포함한 값을 range로 읽으며 streamPoints의 aggregate/format 옵션이 똑같이 제공된다고 가정하지 않는다.

Preview geotemporal loadEntries는 range의 startTime/endTime **모두 필수**다. 공용 TimeRange schema의 optional 표시보다 endpoint의 조건을 함께 확인한다. 시작 포함, 끝 제외이며 time과 position은 항상 포함한다.

additionalProperties는 speed/heading 등 추가 필드를 요청한다. integration에 없는 property는 생략된다. 각 entry는 property name/value map이며 pageToken/nextPageToken으로 이어 읽는다. **Cold storage만 활성화된 geotemporal integration은 지원하지 않는다.** time series binary stream과 이 페이지 응답을 동일 프로토콜로 처리하지 않는다.

## 출처

- [List Property Attachments](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/attachment-properties/list-property-attachments)
- [Read Media Content](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/media-reference-properties/read-media-content)
- [Media Reference basics](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/media-reference-properties/media-reference-property-basics)
- [Decrypt](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/cipher-text-properties/decrypt)
- [Stream Points](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/time-series-properties/stream-points)
- [Get Latest Value](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/time-series-value-bank-properties/get-latest-value)
- [Load Geotemporal Series Entries](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/geotemporal-series-properties/load-geotemporal-series-entries)

## 관련 문서

- [[Palantir-Ontology-V2-Action-API]]
- [[Palantir-Media-APIs]]
