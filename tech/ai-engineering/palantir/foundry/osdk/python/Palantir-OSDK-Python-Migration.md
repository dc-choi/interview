---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Python OSDK1에서2로 옮길 때의 타입 변화

Python2는 OSDK/Platform SDK를 shared client로 사용하고 Config를 제공한다. 내부 _session을 고치는 대신 default_headers/proxies/timeout/verify/default_params/scheme를 설정한다. timeout 기본 None, TLS verify 기본 true와 HTTPS 기본을 확인한다.

## accessor와 반환 타입

where/group/order의 generated property는 `.object_type`를 포함한다. is_member_of는 in_로 바뀐다. starts_with는2.75.0에서 제거됐다는 migration 문서 조건을 따르며 prefix는 contains_all_terms_in_order(...,prefix_last_term=True)로 대체한다.

single link는 ObjectLink wrapper.get 대신 object/None, many link는 iterator/get 한정 wrapper 대신 모든 ObjectSet 메서드를 쓴다. set 단위 search_around도 구분한다.

Query의 인자는 모두 keyword다. Object primary key, ObjectSet RID와 Attachment RID를 반환하던1.x와 달리2.x는 각 instance를 반환한다. 새2D/3D aggregation/map도 typed return으로 확인한다.

aggregate dict는 AggregateObjectsResponse로 바뀌고 to_dict로 표현을 변환한다. range grouping 입력의 start/end dict 목록은 tuple set으로 바뀐다. attachment upload는 AttachmentMetadata 대신 Attachment며 Action으로1시간 안에 연결하는 lifecycle을 따른다. Point는 GeoPoint로 이름이 바뀐다.

## Action과 error

ActionResponse는 SyncApplyActionResponse, BatchActionResponse는 BatchApplyActionResponse다. configuration은 foundry_sdk_runtime.types, request exception은 foundry_sdk에서 import한다. validation은 enum 대신 literal VALID와 response.validation.result로 검사한다.

## Beta opt-in

AllowBetaFeatures context/decorator 또는 Foundry function beta=True가 필요한 범위를 확인한다. stable2.x 패키지에 들어 있다고 Beta API의 문법/존재/안정성이 보장되는 것은 아니다. runtime-derived property, nearest-neighbor, Marking/Vector/Struct 등 source별 요구를 대조한다.

이 문서는 migration의 contract 변경을 정리한 것이며 실제 프로젝트를 변환하거나 query/Action을 실행한 결과는 아니다.

## 출처

- [Palantir, python-osdk-migration](https://www.palantir.com/docs/foundry/ontology-sdk/python-osdk-migration)

## 관련 문서

- [[Palantir-OSDK-Python]]
- [[Palantir-OSDK-Python-Read]]
- [[Palantir-OSDK-Compatibility]]
