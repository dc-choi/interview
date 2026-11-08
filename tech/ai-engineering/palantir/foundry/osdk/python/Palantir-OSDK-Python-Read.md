---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
---

# Python OSDK2 조회, modifier와 scenario

Python2 generated package와 object class를 실제 앱 이름으로 바꾼다. Foundry function/workspace/model adapter는 hostname/credential이 runtime에서 제공돼 FoundryClient()를 쓸 수 있지만 standalone은 host/auth를 구성한다. 공개 Python 참조는3.10~3.14를 안내한다.

## page와 property

get은 primary key 단건, page는 data/next_page_token 한 page, iterate는 전체 순회를 위한 iterator, take(n)는 제한된 list다. list(iterate())는 모든 결과를 memory에 모은다. page size 최대10,000과 OSv1 결과10,000 제한을 구별한다.

`page_size`는 한 page의 크기이지 전체 객체 수의 상한이 아니며, page token으로 이어 받는 page는 첫 page의 `page_size` 이하다. 표본이나 화면 표시에만 쓰는 데이터라면 한 page가 맞는 경우가 많다. 화면은 한 번에 보여 줄 수 있는 객체 수가 제한되므로 보이는 만큼 한 page를 읽고 사용자가 scroll할 때 더 가져온다. `take(n)`는 최대 n개만 돌려주고 나머지는 알리지 않고 버리므로 표본이나 표시용 목록처럼 부분 결과가 맞는 경우에만 쓴다. `iterate()`는 일치하는 객체를 모두 돌려줄 때까지 일관된 snapshot에서 page를 이어 읽으며, object set을 `for`로 직접 순회해도 같다. 다만 OSv1(Phonograph) 기반 object type은 결과가 10,000개로 제한되어 10,000개를 넘게 요청하면 `ObjectsExceededLimit` 오류가 나고, streaming 예외와 실패 조건은 아래 절을 따른다.

전체를 적재하기 전에 count, sum 같은 요약은 객체를 적재하지 않고 backend에서 계산하는 aggregation으로 바꾸고, 일부 property만 읽으면 `properties`로 고른다. 모든 객체를 동시에 들고 있어야 하는 코드가 아니면 `list(...)`로 감싸지 않고 loop 안에서 도착하는 대로 처리한다.

RID는 include_rid=True로 요청한다. load_property_securities 기본 false, properties는 generated property reference 배열, load_ontology_defined_derived_properties로 해당 derived 값을 제어한다. property는 ExampleRestaurant.object_type.<property> accessor를 사용한다.

`properties`를 생략하면 해당 object type에서 일반적으로 적재하는 property를 받되 vector property는 빠진다. vector property가 필요하면 `properties`에 명시하고 `AllowBetaFeatures` 안에서 읽는다. 요청에 포함된 property(`properties`를 생략하면 기본 선택 전체)는 코드가 나중에 읽지 않아도 요청 시점에 적재되므로, 큰 text나 array 같은 넓은 property가 있는 object type에서 필요 없는 property까지 받으면 훨씬 느리고 network bandwidth를 더 쓸 수 있다. 선택하지 않아도 primary key property는 함께 반환된다.

## 페이지 일관성과 snapshot

여러 page를 읽는 사이 데이터가 바뀔 수 있다. 동기 method의 snapshot 요청은 다음과 같고, 함수 실행에 설정된 snapshot은 method와 관계없이 적용된다.

| method | 자체 snapshot | page 사이에 데이터가 바뀌면 |
|---|---|---|
| `iterate()`, object set 직접 순회 | 요청 | 모든 page가 같은 시점을 반영해 각 객체를 한 번씩 반환하고, snapshot을 유지하지 못하면 요청이 실패한다. streaming input datasource를 쓰는 object type에는 이 보장이 적용되지 않는다 |
| `page()`, `take()` | 요청하지 않음 | 적용되는 snapshot이 없으면 중복이나 누락이 생길 수 있다 |

Beta인 비동기 method는 다르게 동작할 수 있으며, 일부 SDK 버전의 `async_take()`는 snapshot에서 읽는다. page 사이 불일치를 감지하면 순회가 `PagingInconsistencyDetected`로 실패할 수 있고, 오래 걸리는 순회는 snapshot 만료로도 실패할 수 있다. streaming datasource에는 일관된 snapshot이 보장되지 않는다. `iterate()`는 snapshot을 건너뛰도록 설정할 수 없다.

자주 갱신되는 object type의 전체 순회가 snapshot 오류로 실패하면 업무가 감당할 수 있는 trade-off를 고른다.

- count, sum 같은 요약은 page를 넘기지 않는 aggregation으로 계산한다.
- `properties`를 줄이고 filter로 object set을 좁혀 snapshot이 만료되기 전에 끝낸다.
- append-only 데이터는 고정된 시간 기준으로 최근 객체를 제외한다. 순회 중 늦게 도착한 데이터나 backfill이 기준 시각 이전 구간에 객체를 추가할 수 없을 때만 성립한다.
- `iterate()` 대신 자체 snapshot을 요청하지 않는 `page()`로 page 단위로 이어 읽는다. 함수 실행에 설정된 snapshot은 `page()`에도 적용된다. `get_primary_key()`로 이미 처리한 객체를 건너뛰면 중복은 걸러지지만 누락은 되살리지 못한다.

### 함수와 Action 안에서

Python function 안에서 쓰면 함수의 consistent snapshot 설정도 적용되며, client가 함수 실행의 snapshot을 가지면 loading method와 관계없이 그 snapshot으로 읽는다.

- Snapshot isolation으로 설정한 function-backed Action은 함수 실행에 Action의 snapshot을 쓰며 snapshot을 켜 둬야 한다.
- Read committed 격리에서는 Action이 실행에 snapshot을 주지 않지만 `iterate()`는 자기 순회용 snapshot을 요청한다. 2026-11-08 확인한 Action 일관성 문서는 read committed 절에서 곧 제공될 모드라고 밝히지만 같은 문서의 격리 수준 표와 선택 안내에는 다른 수준과 함께 나열해 표시가 엇갈리므로, 현재 선택할 수 있는 설정으로 전제하지 않는다([[Palantir-Actions-and-Functions|Action 격리 수준]]).
- Snapshot은 수명이 제한된다. 긴 함수가 snapshot 만료로 실패하면 여러 읽기에 걸친 일관된 view가 필요한지 다시 판단한다. 필요 없으면(snapshot isolation Action의 함수는 제외) 함수 설정에서 snapshot을 끄고, 필요하면 켠 채 만료 전에 읽기를 끝낸다. Snapshot을 꺼도 `iterate()`는 자체 snapshot을 요청하므로 page 불일치 오류를 막지 못한다.

## modifier와 representation

Beta ApplyModifiers는 applyReducers, extractMainValue와 조합을 configuration이 허용하는 범위에서 받는다. properties를 같이 넘기면 modifier를 준 property도 목록에 포함해야 하며 빠지면 ValueError다.

modifier를 적용하면 일반 property는 None, 변환값은 modified_properties에 있다. source array/struct 저장값이 변경되는 것이 아니다. modifier 없이 선택하면 reducer 설정이 있어도 전체 array를 받는다. TypeScript처럼 원래 accessor에서 element 타입을 받는 형태와 다르다.

## link와 query

single/many-to-one instance link method는 object 또는 None, many link는 ObjectSet이다. set에서는 search_around_<link>()를 쓰고 runtime string search_around는 잘못된 link면 RuntimeError다.

where는 typed accessor와 Python 비교, `~`, `&`, `|`를 사용한다. is_null은 인자를 받지 않는다. group_by/aggregate는 타입별 metric과 generated grouping을 사용하며 many-to-one link의 property로 그룹을 만들려면 with_properties와 Beta context 조건을 확인한다.

Query는 keyword argument이며 Object/ObjectSet/Attachment/2D/3D aggregation/map을 instance로 반환한다. 3D aggregation은 안쪽도 groups 키다. aggregate response는 typed object이고 to_dict로 이전 dict 표현을 얻는다.

## Beta와 scenario

Marking/Vector는 AllowBetaFeatures context 안에서 읽고 Media는 content/metadata/reference를 직접 읽는 현재 참조를 따른다. nearest_neighbors와 runtime-derived/struct의 Beta 조건을 stable 지원으로 바꾸지 않는다.

scenario client는 experimental이며 새 scenario 생성은 플랫폼 호출, 기존 RID attach는 해당 scenario sandbox 대상으로 처리한다. main Ontology write와 구분하며 source 예제의 package/import 경로는 실제 generated/runtime version의 지원을 확인한다.

## 출처

- [Palantir, python-osdk](https://www.palantir.com/docs/foundry/ontology-sdk/python-osdk)
- [Palantir, how-to-bootstrapping-python](https://www.palantir.com/docs/foundry/ontology-sdk/how-to-bootstrapping-python)
- [Palantir, consistency-guarantees](https://www.palantir.com/docs/foundry/action-types/consistency-guarantees)
- [Palantir, python-osdk-migration](https://www.palantir.com/docs/foundry/ontology-sdk/python-osdk-migration)

## 관련 문서

- [[Palantir-OSDK-Python]]
- [[Palantir-OSDK-Python-Migration]]
- [[Palantir-OSDK-Actions]]
- [[Palantir-Functions-Performance-and-Aggregation|TSv1 전체 순회의 snapshot 계약]]
- [[Palantir-Actions-and-Functions|Action 격리 수준과 snapshot]]
- [[Palantir-Ontology-V2-ObjectSet-API|REST list의 snapshot 선택]]
