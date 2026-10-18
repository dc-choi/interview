---
tags: [palantir, foundry, api, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology V2의 객체와 ObjectSet 로딩

V2 object는 V1의 rid/properties wrapper와 달리 property를 직접 담고 `__rid`, `__primaryKey`, `__apiName` metadata를 갖는다. 객체 GET/list, link GET/list와 Search, ObjectSet 로드는 모두 `api:ontologies-read`가 필요하다.

## 선택과 페이지 일관성

선택을 생략하면 Vector를 제외한 property를 가져온다. Vector는 select에 명시한다. null 값은 응답에서 생략된다. select와 재귀 PropertyIdentifier의 selectV2는 동시에 채우지 않는다. excludeRid는 RID 조회를 생략해 OSv2 성능을 개선할 수 있지만 primary key와 type 식별자의 용도를 대신하지 않는다.

`loadOntologyDefinedDerivedProperties`는 experimental이며 기본 true다. 명시적 selection이 없을 때만 적용하고, select/selectV2로 고른 property는 flag와 무관하게 반환한다. Interface property가 OTDP로 구현되었다면 multiple/interface 로딩에서 이 flag와 무관하게 반환된다.

List와 linked list는 기본적으로 동시 변경 중 페이지의 누락/중복이 가능하다. `snapshot=true`는 paging 시작 전 일관된 뷰를 사용하고 false 기본값은 새 결과가 들어오는 대신 누락/중복이 가능하다. 페이지마다 같은 snapshot, query, selection과 크기를 유지한다.

Search/ObjectSet의 pageSize는 최대치다. 내부 메모리 한도로 더 적게 반환할 수 있으므로 nextPageToken을 따른다. OSv1은 10,000개 뒤 `ObjectsExceededLimit`, OSv2에는 이 제한이 없다.

## Search와 relevance

Search는 body의 where로 필터하고 orderBy.fields로 정렬한다. field는 V1의 `properties.age`가 아닌 V2 property API name을 쓴다. 비교/null/array/논리와 text query를 조합하며 and/or query는 최대 세 단계다.

텍스트 이름은 containsAllTerms/containsAnyTerm, containsAllTermsInOrder와 containsAllTermsInOrderPrefixLastTerm이다. startsWith는 마지막 조건의 deprecated alias다. term은 일반적으로 공백/punctuation으로 나뉘며 별도 명시 없이는 부분 term을 매칭하지 않는다. 상세 ObjectSet filter는 [[Palantir-Ontology-SQL-API]]의 필터 계약과 같은 schema를 사용한다.

orderBy의 fields를 주면 orderType은 fields가 되고 전체 orderBy 생략은 정렬 미지정이다. relevance는 text/nearestNeighbors 일치도를 내림차순 정렬하지만 다른 query에서는 순서가 미지정이다. **relevance paging은 snapshot 일반 설명과 별개로 페이지 간 중복/누락이 가능하다.** 완전성이 필요할 때는 문서가 단일 페이지 사용을 안내하며, 이것을 전체 데이터 추출의 보장으로 확대하지 않는다. relevance는 비용이 클 수 있다.

## ObjectSet 정의와 임시 저장

`POST /objectSets/loadObjects`는 base/interfaceBase/static/reference에서 시작한 정의에 link 탐색, filter, union/intersect/subtract, asType/asBaseObjectTypes, nearestNeighbors와 derived property를 조합해 로드한다. 재귀 정의의 의미와 ANN 제약은 [[Palantir-Ontology-SQL-API]]를 참고한다.

`createTemporary`는 Preview이고 read/write scope 모두 필요하다. 정의에서 만든 temporary objectSetRid는 **한 시간 후 만료**한다. 영구적으로 재사용할 식별자로 저장하지 않는다.

Branch와 transaction은 experimental이며 모든 workflow 지원을 보장하지 않는다. endpoint별 scenarioRid 지원도 다르므로 GET list, Search와 ObjectSet endpoint에 일괄 복사하지 않는다. executeInMemoryOnly는 기본 false이고 true면 무거운 계산으로 넘어갈 요청을 실패시킨다. 일반 결과 크기 제한을 끄는 옵션이 아니다.

## 세 가지 로드 결과

| endpoint | 반환 관점 |
|---|---|
| loadObjects | 기본 객체 type property와 `__` metadata |
| loadObjectsMultipleObjectTypes | object type 또는 interface scope, `$` metadata와 구현 mapping |
| loadObjectsOrInterfaces | interface로 볼 수 있으면 interface property, 아니면 object type property |

뒤의 두 endpoint는 Preview다. MultipleObjectTypes는 interface scope라면 구현에 필요한 object type property를 반환하고 interfaceToObjectTypeMappings 및 V2 mapping으로 해석한다. ObjectsOrInterfaces는 interface property를 직접 반환하며 interface property 객체와 object type property 객체를 한 결과에 섞으면 오류다. `$objectTypeApiName`/`$interfaceTypeApiName` 등 실제 metadata를 일반 `__apiName`처럼 고정 파싱하지 않는다.

objectSetEntities는 전체 정의 평가 중 참조한 concrete object type API name을 알린다. 결과 페이지에 그 type의 객체가 없어도 포함될 수 있다. 이용 가능한 경우 첫 페이지에만 나오며 생략은 dependency 정보 미확보다. reload할 때 갱신한다.

## Property security와 Media signing

Experimental loadPropertySecurities=true는 값을 Secured Property Value로 감싸고 propertySecurities 목록의 index를 연결한다. property marking과 container marking을 모두 확인한다. conjunctive는 모든 marking, disjunctive는 바깥 AND와 안쪽 OR의 집합이며 PropertySecurities.disjunction은 보안 결과 사이 OR다. unsupportedPolicy/errorComputingSecurity는 권한 요구 없음으로 해석하지 않는다.

Media Set View 기반 MediaReference는 기본 signed token을 받는다. deprecated signMediaReferences는 true/false 모두 무시된다. 접근은 parent media set의 view 권한 대신 reference를 가진 object의 접근 권한을 사용할 수 있다. **MediaReference 배열은 signing하지 않는다.**

includeComputeUsage는 OSDK application에서만 제공하며 성능 저하 때문에 production 사용을 권장하지 않는다. 공개 schema를 확인한 것이며 실제 enrollment 성능과 experimental 기능 가용성은 시험하지 않았다.

## 출처

- [Search Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-objects/search-objects)
- [List Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-objects/list-objects)
- [Load Object Set](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-object-sets/load-object-set)
- [Load Multiple Object Types](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-object-sets/load-object-set-multiple-object-types)
- [Load Objects Or Interfaces](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-object-sets/load-object-set-objects-or-interfaces)
- [Create Temporary Object Set](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-object-sets/create-temporary-object-set)

## 관련 문서

- [[Palantir-Ontology-V2-Aggregation-API]]
- [[Palantir-Ontology-V2-Metadata-API]]
