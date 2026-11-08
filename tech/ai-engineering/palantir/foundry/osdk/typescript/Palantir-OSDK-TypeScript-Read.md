---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
---

# TypeScript OSDK2의 조회, page와 representation

TypeScript2 client는 `client(ObjectType)`처럼 호출한다. ObjectType metadata와 데이터 instance의 타입 `Osdk.Instance<ObjectType>`를 구분한다. fetchOne은 단일 object, fetchOneWithErrors는 value/error Result를 반환한다. 실패와 not-found 모두 error일 수 있어 빈값으로 통합하지 않는다.

## pagination과 선택

fetchPage는 한 page이며 data와 nextPageToken을 돌려준다. 다음 요청에 `$nextPageToken`을 전달하거나 asyncIter로 순회한다. 결과를 전부 array로 모으면 전체 client memory를 쓴다. OSv1의 10,000 결과 제한과 OSv2의 해당 load endpoint 설명을 확인하며 서비스 전체 무제한 보장으로 확대하지 않는다.

전체 순회 전에 목적을 다시 확인한다. count나 sum 같은 요약은 backend에서 계산하는 aggregation으로, 화면 표시나 sample은 한 page로 충분하다. 일부 property만 읽으면 `$select`로 줄이고, 모든 객체를 동시에 쓸 필요가 없으면 `for await` 안에서 도착하는 대로 처리해 array에 모으지 않는다.

`$snapshot` 기본 false는 최신 결과를 읽는다. 단, 함수 실행에 snapshot이 있으면 그 snapshot을 따른다. true는 query 시점 view를 고정해 paging 중 skip/duplicate를 막는 용도다. `$select`는 object fetch에서는 API-name 배열이고 aggregation의 selector object와 다르다.

select 생략 시 queried type/interface의 native property가 기본이며 vector property는 빠진다. ontology-defined derived property는 명시적으로 넣는다. runtime withProperties로 만든 derived 값은 기본 포함되지만 select를 쓰면 그 API name도 선택해야 한다.

property는 코드가 나중에 읽는지와 관계없이 요청 시점에 적재된다. 큰 text나 array처럼 넓은 property가 있는 type에서는 읽을 property만 `$select`로 고르는 편이 훨씬 빠를 수 있다. primary-key property는 선택하지 않아도 반환되고, 반환 객체 타입은 선택한 property로 좁혀져 선택하지 않은 property를 읽으면 타입 오류가 난다.

## page 일관성과 snapshot

| method | 자체 snapshot | page 사이에 데이터가 바뀌면 |
|---|---|---|
| `asyncIter()` | 요청 | 모든 page가 같은 시점을 반영해 각 객체를 한 번씩 반환하고, snapshot을 유지하지 못하면 요청이 실패한다. streaming input datasource를 쓰는 object type에는 이 보장이 적용되지 않는다 |
| `fetchPage()` | `$snapshot: true`일 때만 | 적용되는 snapshot이 없으면 중복이나 누락이 생길 수 있다 |

page 사이 불일치를 감지하면 순회가 `PagingInconsistencyDetected`로 실패할 수 있고, 오래 걸리는 순회는 snapshot이 만료되면 실패할 수도 있다. 자주 갱신되는 type의 전체 순회가 snapshot 오류로 실패하면 업무가 감당할 trade-off를 고른다.

- 요약값이면 page를 넘기지 않는 aggregation으로 바꾼다.
- `$select`와 filter로 순회를 줄여 snapshot 만료 전에 끝낸다.
- append-only 데이터는 고정된 시간 기준으로 최근 객체를 제외한다. 순회 중 늦게 도착한 데이터나 backfill이 기준 이전 구간에 객체를 추가할 수 없을 때만 성립한다.
- snapshot을 요청하지 않은 `fetchPage()`를 `$nextPageToken`으로 직접 이어 읽는다. 함수 실행에 설정된 snapshot은 `fetchPage()`에도 적용되므로 함수 snapshot의 만료는 이 방법으로 피하지 못한다. `$primaryKey`로 이미 처리한 객체를 건너뛰면 중복은 걸러지지만 누락은 되살리지 못한다.

TypeScript v2 function 안에서는 함수의 consistent snapshot 설정도 적용되며, client가 함수 실행의 snapshot을 가지면 loading method와 관계없이 그 snapshot으로 읽는다. snapshot isolation으로 설정한 function-backed Action은 Action의 snapshot을 쓰고 snapshot을 켜 둬야 한다. read committed 격리에서는 Action이 snapshot을 주지 않지만 `asyncIter()`는 자기 순회용 snapshot을 요청한다. read committed를 현재 선택할 수 있는 설정으로 전제하지 않는 이유는 [[Palantir-OSDK-Python-Read|Python OSDK 조회]]의 같은 절과 [[Palantir-Actions-and-Functions|Action 격리 수준]]에 둔다.

긴 함수가 snapshot 만료로 실패하면 여러 읽기에 걸친 일관된 view가 필요한지 다시 판단한다. 필요 없으면(snapshot isolation Action의 함수는 제외) 함수 설정에서 snapshot을 끄고, 필요하면 켠 채 만료 전에 읽기를 끝낸다. snapshot을 꺼도 `asyncIter()`는 자체 snapshot을 요청하므로 page 불일치 오류를 막지 못한다.

`$includeRid`로 RID, `$loadPropertySecurityMetadata`로 property security를 요청한다. interface의 `$includeAllBaseObjectProperties`는 underlying concrete property를 포함하며 일반 object type query에는 효과가 없다.

## property modifier

`$applyModifiers`는 fetchPage/asyncIter에서 source가 허용한 property representation을 바꾼다. applyReducers는 array의 선택된 element, applyMainValue는 struct의 main field, 두 기능의 조합은 설정된 struct-array의 표현을 요청한다. 원본 저장값을 변경하지 않는다.

modifier 없이 array를 선택하면 전체 array가 온다. modifier를 켜면 해당 property 타입이 array에서 element 타입으로 바뀐다. Python의 modified_properties accessor와 같은 구조로 가정하지 않는다.

## link와 filter

instance의 `$link`에서 single multiplicity는 fetchOne/WithErrors, many는 ObjectSet이다. set에서 pivotTo(linkApiName)로 linked set을 만들고 where/aggregate를 이어 간다. 같은 object type set은 union/intersect/subtract를 지원한다.

문자열 prefix/any-term/all-terms/adjacent-in-order는 case-insensitive 검색 조건과 순서를 구별한다. range/eq/null과 not/and/or는 property type별 지원을 따른다. 문자열 sort는 case-sensitive이며 숫자, 대문자, 소문자 순서를 주의한다.

nearestNeighbors는 embedding model에 맞는 vector 또는 text와 1~500 numNeighbors를 지정한다. 기본 결과 순서는 relevance 보장이 없고 `$orderBy:"relevance"`를 요청하면 score와 순서를 받는다.

## 출처

- [Palantir, typescript-osdk](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)

## 관련 문서

- [[Palantir-OSDK-TypeScript]]
- [[Palantir-OSDK-TypeScript-Aggregation]]
- [[Palantir-OSDK-Actions]]
- [[Palantir-OSDK-Python-Read]]
- [[Palantir-Functions-Performance-and-Aggregation]]
