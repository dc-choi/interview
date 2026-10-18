---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop filter 상태와 Ontology interface"]
---

# Workshop filter 상태와 Ontology interface

Filter widget의 output은 object 자체가 아니라 predicate 상태다. 기본 object set을 filter widget에 주고 그 output filter를 별도 downstream object set에 적용하면 facet 선택이 자기 자신의 base를 불필요하게 줄이는 것을 피할 수 있다.

## Filter identity와 matching

Object type이 달라도 property ID가 같으면 filter를 재사용할 수 있다. Display name만 같다고 같은 property는 아니다. Multiple-type union은 common/shared property와 single-type property를 구분하고 shared property는 같은 Object Storage version을 요구하는 안내가 있다.

Starting filter IS는 exact, NULL은 null, CONTAIN은 현재 prefix matching이며 arbitrary substring이 아니다. String property exact indexing이 없으면 Keyword만 활성화될 수 있고 regex는 Ontology Manager query indexing 설정이 필요하다. Advanced keyword precedence는 quoted term/parentheses/NOT/AND/OR로 안내한다.

Linked filter의 has-link는 existence와 linked property predicate를 구분한다. OSv1 linked object filter에는100,000object 한도가 있다. Search bar/pill의 read-only/remove/update/add mode와 operator 변경 제한은 UX capability이며 data 권한을 대신하지 않는다. Prominent Terms는 beta이고 exact value match count로 안내한다.

## 값 추출

Default filter의 property/shape에 맞는 numeric range, date/time range, string terms만 primitive 변수에 추출한다. Multi-term은 array가 필요하고 scalar면 첫 값만 얻는다. Inclusive LTE/GTE와 negation shape가 맞아야 하며 nested/disjoint ranges와 numeric-axis XY selection은 미지원 또는 예기치 않은 동작이 있다.

다른 property로 옮기려면 추출 변수로 두 번째 filter를 구성해야 한다. Filter variable 자체를 다른 filter의 property value로 넣을 수 없다. Source property가 filter에서 사라지면 추출 변수는 clear되고 그 변수에만 의존한 target filter가 dropped되어 결과 범위가 넓어진다. Empty와 no-filter를 같은 상태로 보지 않는다.

## Ontology interface

Interface-based object set은 implementing types의 공유 property/link를 다루며 사용자 권한에 따라 보이는 object만 포함한다. 새 implementing type이 추가되면 workflow 대상이 늘어날 수 있다. Object type→interface cast는 object를 유지하며 interface→implementing type cast는 해당 type으로 줄인다.

한 object-set definition에는 Cast 또는 Traverse 중 type-changing transform 하나만 허용한다. 미지원 widget은 interface set을 object-type context로 처리해 interface property selector가 없어질 수 있다. 이는 set 자체가 invalid라는 뜻과 다르다. 실제 filtering 결과는 실행하지 않았다.

## 출처

- [Palantir Workshop, object-set-filter-variables](https://www.palantir.com/docs/foundry/workshop/object-set-filter-variables)
- [Palantir Workshop, ontology-interfaces](https://www.palantir.com/docs/foundry/workshop/ontology-interfaces)
- [Palantir Workshop, widgets-exploration-filter-pills](https://www.palantir.com/docs/foundry/workshop/widgets-exploration-filter-pills)
- [Palantir Workshop, widgets-exploration-search-bar](https://www.palantir.com/docs/foundry/workshop/widgets-exploration-search-bar)
- [Palantir Workshop, widgets-filter-list](https://www.palantir.com/docs/foundry/workshop/widgets-filter-list)
- [Palantir Workshop, widgets-filtering](https://www.palantir.com/docs/foundry/workshop/widgets-filtering)
- [Palantir Workshop, widgets-prominent-terms](https://www.palantir.com/docs/foundry/workshop/widgets-prominent-terms)

## 관련 문서

- [[Palantir-Workshop]]
