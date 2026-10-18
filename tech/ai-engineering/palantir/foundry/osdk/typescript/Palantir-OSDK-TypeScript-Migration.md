---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# TypeScript OSDK1에서2로 옮길 때의 계약

v2는 생성 metadata와 runtime client를 분리하고 lazy loading을 지원한다. generator를2로 바꾸는 것과 @osdk/client/@osdk/oauth dependency를 올리는 것을 함께 관리한다. migration 문서의 v1 지원 기간은 출시 후 최소1년이라는 역사적 약속이며 확인일 현재의 지원 종료일을 계산해 단정하지 않는다.

## 타입과 client

legacy generated FoundryClient/PublicClientAuth 대신 runtime createClient와 OAuth factory를 쓴다. ontologyRid는 generated `$ontologyRid` 또는 실제 Ontology RID를 전달한다. v1 nested client.objects 접근은 client(ObjectType) 호출로 바뀐다.

v2 데이터는 Osdk.Instance<ObjectType>, page는 PageResult<Osdk.Instance<T>>다. ObjectType 자체는 instance가 아니므로 helper parameter를 단순 metadata type으로 바꾸지 않는다. GeoShape/GeoPoint는 GeoJSON, LocalDate/Timestamp는 ISO8601 string으로 바뀐다.

작은 앱은 instance 타입을 직접 치환할 수 있고 큰 앱은 별도 frontend model과 translator로 경계를 만들 수 있다. 후자의 추가 계층은 실제 legacy 의존 범위에 맞춰 선택한다.

## 호출과 반환값

fetchOneWithErrors의 Result shape, fetchPage 옵션의 `$pageSize`, fetch 안의 `$orderBy`, `$link`와 object-set where shape를 갱신한다. RID는 기본 포함되지 않으므로 `$includeRid:true`와 `$rid`가 포함된 instance 타입을 명시한다.

aggregate는 chain `.count().compute()` 대신 aggregate의 flat selector와 결과 object/array를 사용한다. `$count`, `property:metric`와 반환 nested metric을 옛 response.value로 읽지 않는다.

Action은 applyAction/batchApplyAction, Function은 executeFunction을 사용한다. `$validateOnly`와 `$returnEdits` 및 throw를 포함한 실패 처리를 갱신한다. OntologyObject 대신 OsdkBase를 검토하며 IsOntologyObject는 v2에 없다는 source 조건을 따른다.

migration은 단순 import 치환이 아니다. date/geo serialization, nullable value, page 끝까지 순회와 Action 실패 처리의 업무 결과를 확인한다. 이 문서는 migration을 실제 코드에 적용한 결과가 아니다.

## 출처

- [Palantir, typescript-osdk-migration](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-migration)
- [Palantir, how-to-bootstrapping-typescript](https://www.palantir.com/docs/foundry/ontology-sdk/how-to-bootstrapping-typescript)

## 관련 문서

- [[Palantir-OSDK-TypeScript]]
- [[Palantir-OSDK-TypeScript-Read]]
- [[Palantir-OSDK-TypeScript-Aggregation]]
