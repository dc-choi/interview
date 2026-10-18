---
tags: [palantir, drag-and-drop, osdk, gotham]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Drag payload와 enrichment"]
---

# Drag payload와 enrichment

Drag-and-drop의 DataTransfer는 media type별 문자열을 담는 전달 계약이다. Drag zone은 draggable element의 dragstart에서 setData하고 drop zone은 허용 type의 dragover/dragenter default를 막은 뒤 drop에서 getData한다. 어떤 drop zone도 전달된 data를 받을 수 있으므로 payload에 불필요한 민감정보를 넣지 않는다.

## Media type은 data shape를 대신 검증하지 않는다

| 개념 | Media type | 직렬화 전 shape |
|---|---|---|
| Foundry object RID | application/x-vnd.palantir.rid.phonograph2-objects.object | string[] |
| Gotham object ID | application/x-vnd.palantir.rid.gotham.object | string[] |
| Foundry object set RID | application/x-vnd.palantir.rid.object-set.temporary-object-set | string[] |

JSON.stringify한 배열을 setData하고 getData의 빈 문자열을 검사한 뒤 JSON.parse한다. Type 이름만 확인하지 말고 runtime validator로 배열과 원소 shape를 검증한다. Object set은 unordered collection을 표현하며 payload가 object 내용 전체가 아니라 set RID 목록인 점을 구분한다. effectAllowed=move가 data source 삭제를 구현하는 것은 아니다.

## Enrichment는 같은 현실 객체의 표현을 연결한다

Foundry/Gotham에 동일한 현실 객체를 표현하는 resource가 각각 있으면 type mapping으로 synonyms를 연결할 수 있다. 두 플랫폼과 type mapping이 enabled인 enrollment/object type이 필요하다. 단일 플랫폼의 같은 media type만 주고받는 흐름에는 enrichment가 필요하지 않다.

Data Bank Service의 batchEnrichDataTransfer에 `dataTransfers: [{mediaType: serializedData}]`를 전달하면 원래 표현과 대응 표현, errors를 반환한다. 이 dataTransfers request field는 브라우저 DataTransfer 객체 자체가 아니다. 현재 문서의 지원 enrichment는 Foundry object RID와 Gotham object ID 양방향이며 임의 custom type이나 object set 전체 변환 보장으로 확대하지 않는다.

여러 플랫폼으로 내보내는 drag zone은 component mount 등에서 미리 enrichment하고 dragstart에서 준비된 값을 넣는다. Dragstart 안에서 비동기 network 결과를 기다리며 payload를 만들지 않는다. 여러 플랫폼에서 받는 drop zone은 drop 후 허용 표현을 enrichment해 처리할 수 있다. 양쪽 모두에서 중복 호출할 필요는 없으며 backend call 비용을 고려한다.

Enrichment 예제에는 async 없는 await, 누락된 parameter comma, parsed array를 serialized string 자리에 넣는 부분, Bearer prefix와 stringify 누락이 있다. JSON 설명 중 깨진 object/escape 예제도 그대로 복사하지 않는다. 실제 request/response shape와 errors를 확인하고 잘못된 응답을 성공 drop으로 처리하지 않는다.

## OSDK React는 object set 처리로 통일한다

@palantir/dnd-osdk-react는 generated OSDK client로 metadata/hydration을 처리하고 OsdkObjectDragZone/DropZone과 acceptedObjectTypes를 제공한다. Object와 object set이 섞여도 dropped object를 object set으로 변환해 API name별 callback으로 넘긴다. Deep comparison memoization은 중복 backend call을 줄이는 수단이다.

예제는 첫 object set의 첫 100개만 fetchPage한다. 모든 dropped set/object를 로드하거나 count가 전체 크기임을 보장하지 않는다. Pagination, 다중 set 처리, fetch 오류와 stale result를 앱 요구에 맞춰 설계한다. Library와 object-type filtering은 backend resource 권한을 대신하지 않는다.

## Loading, invalid와 성공을 나눠 알린다

Drag type 호환 여부를 valid/invalid로 표시하고 enrichment 중에는 loading을 표시한다. Payload hover 중에는 별도 스타일을 적용한다. 작은 input, object card와 전체 map 같은 drop zone 크기에 맞춰 시각적 강도를 조정한다.

Drop 후에도 처리 중이면 loading toast, 성공이면 짧은 성공 toast(가이드 750ms), enrichment 실패나 다중 ID 중 첫 값만 쓰는 경우에는 사용자가 닫을 때까지 설명을 남긴다. 후속 선택지가 여러 개면 dialog로 목적지를 선택하게 한다. 단순히 type가 일치해 drop을 허용한 것을 실제 data 처리 성공으로 표시하지 않는다.

Child element의 dragenter/leaves는 중첩해 발생하므로 counter/capture listener로 깜빡임을 줄이고 drop/cancel에서 style과 counter를 정리한다. 예제의 `drag-enter`/`drag-leave` event 이름과 정의되지 않은 helper/className, CSS의 // comment는 그대로 유효한 구현이 아니다. 실제 DOM event와 CSS 문법에 맞춰 검증한다.

## 출처

- [Palantir, Drag and drop](https://www.palantir.com/docs/foundry/cross-app-interactivity/drag-and-drop-overview)
- [Palantir, Objects](https://www.palantir.com/docs/foundry/cross-app-interactivity/objects)
- [Palantir, Object sets](https://www.palantir.com/docs/foundry/cross-app-interactivity/object-sets)
- [Palantir, Drag and drop between Foundry and Gotham](https://www.palantir.com/docs/foundry/cross-app-interactivity/enrichment-reference)
- [Palantir, Implement drag and drop between Foundry and Gotham](https://www.palantir.com/docs/foundry/cross-app-interactivity/enrichment-tutorial)
- [Palantir, Drag and drop between Ontology SDK applications](https://www.palantir.com/docs/foundry/cross-app-interactivity/osdk-drag-and-drop)
- [Palantir, Create drag-and-drop integration points](https://www.palantir.com/docs/foundry/cross-app-interactivity/tutorial)
- [Palantir, Design guidelines](https://www.palantir.com/docs/foundry/cross-app-interactivity/design-guidelines)

## 관련 문서

- [[Palantir-App-Pairing-and-Command-State|공유 상태와 command]]
- [[Palantir-Foundry-Code-Workspaces|OSDK 앱 개발 환경]]
