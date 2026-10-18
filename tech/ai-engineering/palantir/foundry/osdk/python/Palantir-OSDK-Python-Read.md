---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Python OSDK2 조회, modifier와 scenario

Python2 generated package와 object class를 실제 앱 이름으로 바꾼다. Foundry function/workspace/model adapter는 hostname/credential이 runtime에서 제공돼 FoundryClient()를 쓸 수 있지만 standalone은 host/auth를 구성한다. 공개 Python 참조는3.10~3.14를 안내한다.

## page와 property

get은 primary key 단건, page는 data/next_page_token 한 page, iterate는 전체 순회를 위한 iterator, take(n)는 제한된 list다. list(iterate())는 모든 결과를 memory에 모은다. page size 최대10,000과 OSv1 결과10,000 제한을 구별한다.

RID는 include_rid=True로 요청한다. load_property_securities 기본 false, properties는 generated property reference 배열, load_ontology_defined_derived_properties로 해당 derived 값을 제어한다. property는 ExampleRestaurant.object_type.<property> accessor를 사용한다.

## modifier와 representation

Beta ApplyModifiers는 applyReducers, extractMainValue와 조합을 configuration이 허용하는 범위에서 받는다. properties를 같이 넘기면 modifier를 준 property도 목록에 포함해야 하며 빠지면 ValueError다.

modifier를 적용하면 일반 property는 None, 변환값은 modified_properties에 있다. source array/struct 저장값이 변경되는 것이 아니다. modifier 없이 선택하면 reducer 설정이 있어도 전체 array를 받는다. TypeScript처럼 원래 accessor에서 element 타입을 받는 형태와 다르다.

## link와 query

single/many-to-one instance link method는 object 또는 None, many link는 ObjectSet이다. set에서는 search_around_<link>()를 쓰고 runtime string search_around는 잘못된 link면 RuntimeError다.

where는 typed accessor와 Python 비교, `~`, `&`, `|`를 사용한다. is_null은 인자를 받지 않는다. group_by/aggregate는 타입별 metric과 generated grouping을 사용하며 linked-derived property로 그룹을 만들려면 with_properties와 Beta context 조건을 확인한다.

Query는 keyword argument이며 Object/ObjectSet/Attachment/2D/3D aggregation/map을 instance로 반환한다. 3D aggregation은 안쪽도 groups 키다. aggregate response는 typed object이고 to_dict로 이전 dict 표현을 얻는다.

## Beta와 scenario

Marking/Vector는 AllowBetaFeatures context 안에서 읽고 Media는 content/metadata/reference를 직접 읽는 현재 참조를 따른다. nearest_neighbors와 runtime-derived/struct의 Beta 조건을 stable 지원으로 바꾸지 않는다.

scenario client는 experimental이며 새 scenario 생성은 플랫폼 호출, 기존 RID attach는 해당 scenario sandbox 대상으로 처리한다. main Ontology write와 구분하며 source 예제의 package/import 경로는 실제 generated/runtime version의 지원을 확인한다.

## 출처

- [Palantir, python-osdk](https://www.palantir.com/docs/foundry/ontology-sdk/python-osdk)
- [Palantir, how-to-bootstrapping-python](https://www.palantir.com/docs/foundry/ontology-sdk/how-to-bootstrapping-python)

## 관련 문서

- [[Palantir-OSDK-Python]]
- [[Palantir-OSDK-Python-Migration]]
- [[Palantir-OSDK-Actions]]
