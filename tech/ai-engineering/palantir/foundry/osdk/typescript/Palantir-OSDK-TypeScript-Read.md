---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# TypeScript OSDK2의 조회, page와 representation

TypeScript2 client는 `client(ObjectType)`처럼 호출한다. ObjectType metadata와 데이터 instance의 타입 `Osdk.Instance<ObjectType>`를 구분한다. fetchOne은 단일 object, fetchOneWithErrors는 value/error Result를 반환한다. 실패와 not-found 모두 error일 수 있어 빈값으로 통합하지 않는다.

## pagination과 선택

fetchPage는 한 page이며 data와 nextPageToken을 돌려준다. 다음 요청에 `$nextPageToken`을 전달하거나 asyncIter로 순회한다. 결과를 전부 array로 모으면 전체 client memory를 쓴다. OSv1의10,000 결과 제한과 OSv2의 해당 load endpoint 설명을 확인하며 서비스 전체 무제한 보장으로 확대하지 않는다.

`$snapshot` 기본 false는 최신 결과를 읽는다. true는 query 시점 view를 고정해 paging 중 skip/duplicate를 막는 용도다. `$select`는 object fetch에서는 API-name 배열이고 aggregation의 selector object와 다르다.

select 생략 시 queried type/interface의 native property가 기본이다. ontology-defined derived property는 명시적으로 넣는다. runtime withProperties로 만든 derived 값은 기본 포함되지만 select를 쓰면 그 API name도 선택해야 한다.

`$includeRid`로 RID, `$loadPropertySecurityMetadata`로 property security를 요청한다. interface의 `$includeAllBaseObjectProperties`는 underlying concrete property를 포함하며 일반 object type query에는 효과가 없다.

## property modifier

`$applyModifiers`는 fetchPage/asyncIter에서 source가 허용한 property representation을 바꾼다. applyReducers는 array의 선택된 element, applyMainValue는 struct의 main field, 두 기능의 조합은 설정된 struct-array의 표현을 요청한다. 원본 저장값을 변경하지 않는다.

modifier 없이 array를 선택하면 전체 array가 온다. modifier를 켜면 해당 property 타입이 array에서 element 타입으로 바뀐다. Python의 modified_properties accessor와 같은 구조로 가정하지 않는다.

## link와 filter

instance의 `$link`에서 single multiplicity는 fetchOne/WithErrors, many는 ObjectSet이다. set에서 pivotTo(linkApiName)로 linked set을 만들고 where/aggregate를 이어 간다. 같은 object type set은 union/intersect/subtract를 지원한다.

문자열 prefix/any-term/all-terms/adjacent-in-order는 case-insensitive 검색 조건과 순서를 구별한다. range/eq/null과 not/and/or는 property type별 지원을 따른다. 문자열 sort는 case-sensitive이며 숫자, 대문자, 소문자 순서를 주의한다.

nearestNeighbors는 embedding model에 맞는 vector 또는 text와1~500 numNeighbors를 지정한다. 기본 결과 순서는 relevance 보장이 없고 `$orderBy:"relevance"`를 요청하면 score와 순서를 받는다.

## 출처

- [Palantir, typescript-osdk](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)

## 관련 문서

- [[Palantir-OSDK-TypeScript]]
- [[Palantir-OSDK-TypeScript-Aggregation]]
- [[Palantir-OSDK-Actions]]
