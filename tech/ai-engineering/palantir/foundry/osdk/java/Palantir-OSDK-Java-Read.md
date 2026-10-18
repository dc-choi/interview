---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Java OSDK의 조회, 집계와 stream 소유권

Java generated client는 object type의 fetch(primaryKey) Optional, fetchStream과 fetchPage를 구분한다. fetchStream은 소비량에 따라 자동 paging하고 toList는 전량 memory 수집이다. OSv1의10,000 결과와 OSv2 load endpoint 조건을 구별한다.

## fetch 옵션

FetchRequest는 single/stream의 includeRids와 property-security metadata를 제어하며 기본 false다. interface stream의 includeAllBaseObjectProperties는 concrete property를 포함하고 일반 object type에는 효과가 없다.

FetchPageRequest는 pageSize 기본1,000, 이전 Page의 pageToken, RID/security 옵션을 받는다. selectedProperties field가 있어도 현재 generated Java read 메서드는 적용하지 않아 property selection을 지원한다고 볼 수 없다.

## filter, sort와 aggregation

ObjectTypeFilter/Ordering의 typed accessor를 사용한다. 문자열 prefix/term 검색의 case-insensitive 규칙과 string sort의 case-sensitive 순서를 구별한다. numeric/string/date range와 eq/null/not/and/or를 해당 property type에 적용한다.

count/approximateDistinct/numeric avg/min/max/sum을 filter 뒤 계산하고 metric alias를 지원하는 Java 형태를 따른다. exact/max-group-count, fixed-width, inclusive-start/exclusive-end range와 date-duration grouping을 구분한다. raw HTTP example과 typed response를 혼동하지 않는다.

## Action, Function과 media

Action builder/apply/validation visitor와 applyBatch all-or-nothing은 [[Palantir-OSDK-Actions]]의 계약을 따른다. Query는 execute().getReturnValue()로 선언된 ObjectSet 등을 반환한다.

Media는 getId/fetchMetadata/openStream surface다. InputStream은 try-with-resources 등으로 닫고 readAllBytes의 전량 memory 비용을 확인한다. upload 후 returned Media를 Action에 넣어 object에 연결하며 동일 backing MediaSet 조건을 보존한다.

bootstrap Java17~21 범위는 확보된 미검증 중국어 번역 자료의 설명이다. 최신 Java 지원을 이 일반 참조에서 실행 확인한 것으로 보고하지 않는다.

## 출처

- [Palantir, java-osdk](https://www.palantir.com/docs/foundry/ontology-sdk/java-osdk)
- [Palantir, how-to-bootstrapping-java (미검증 기계번역 alias)](https://palantir.com/docs/zh/foundry/ontology-sdk/how-to-bootstrapping-java/)

## 관련 문서

- [[Palantir-OSDK]]
- [[Palantir-OSDK-Actions]]
