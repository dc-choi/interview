---
tags: [palantir, foundry, api, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology V2의 Action 결과와 편집 이력

`POST /api/v2/ontologies/{ontology}/actions/{action}/apply`는 parameters map으로 Action을 실행한다. OAuth2 scope는 `api:ontologies-read api:ontologies-write`다. OSv1 edit는 eventual consistency, OSv2는 Action 완료 직후 보인다.

## HTTP 성공과 validation 성공을 나누기

HTTP 200은 서버가 요청을 수신하고 처리했다는 뜻이다. **실제 적용 성공은 응답 validation.result로 확인한다.** submission criteria와 parameter별 validation도 확인해 invalid/unevaluable 원인을 구분한다.

options.mode는 VALIDATE_ONLY 또는 기본 VALIDATE_AND_EXECUTE다. validation만 수행한 호출을 실제 변경 완료로 보고하지 않는다. parameter default value는 이 endpoint에서 지원하지 않는다. 응답의 optional operationId를 실행 추적에 쓰되 별도 멱등성 보장을 추정하지 않는다.

returnEdits 기본값은 NONE이며 ALL 또는 ALL_V2_WITH_DELETIONS를 선택한다. edits variant는 변경 객체/link 목록과 added/modified/deleted 개수, largeScaleEdits는 영향받은 object type을 제공한다. 반환 edit reference는 object type과 primary key이며 전체 현재 object의 복사본이 아니다.

Branch와 transaction은 experimental이며 모든 workflow 지원을 보장하지 않는다. scenarioRid는 지정 scenario에 적용하는 문맥이다. 설정하지 않은 값의 기본 문맥과 권한을 명확히 한 뒤 사용한다.

## Batch와 제한

applyBatch는 같은 action type을 최대 20개 적용하며 OSv2만 수정하고 Function을 호출하지 않는 경우 더 높은 한도를 받을 수 있다. Notification은 지원하지 않는다. Batch options.returnEdits는 ALL/NONE이고 단일 호출의 ALL_V2_WITH_DELETIONS와 같지 않다.

Batch의 상세 edit union은 modifyObject/addObject/addLink이고 별도 삭제 count가 있다. 단일 Action의 deleteObject/deleteLink variant가 그대로 batch 목록에 나온다고 가정하지 않는다. 공개 명세에서 전체 batch 원자성, timeout 뒤 적용 여부나 자동 retry 안전성을 보장하지 않으므로 그런 계약을 덧붙이지 않는다.

## Parameter metadata와 동적 validation

Action type metadata의 validation.defaultValidation은 allowedValues와 arraySize다. allowedValues에는 labelled oneOf, datetime, attachment size, valueType, markdown length, numeric range, mustBeEmpty와 text length/regex가 있다. text regex는 Elasticsearch regex semantics다.

numeric/datetime bound는 고정 literal뿐 아니라 다른 parameter의 값 또는 배열 길이를 참조할 수 있다. 참조 parameter 자체가 metadata에 노출되지 않을 수 있어 해석 불가능한 참조를 정상적으로 처리해야 한다. datetime은 now/fixed/relative를 구분하고 relative duration은 SECOND/MINUTE/HOUR/DAY/WEEK와 PAST/FUTURE를 쓴다.

Runtime validation 응답의 evaluatedConstraints와 정적 metadata를 구분한다. 입력에 따라 적용 제약이 동적으로 바뀐다. V1 validation의 기존 데이터 검사 한계와 직렬화 기본은 [[Palantir-Ontology-V1-Action-API]]를 참고하며 metadata만으로 적용 성공을 보장하지 않는다.

## Object Type Edits History

`POST /objectTypes/{objectType}/editsHistory`는 `api:ontologies-read`로 생성/수정/삭제 이력을 읽는다. 기본 최신순, sortOrder oldest_first도 가능하다. objectPrimaryKey를 지정하면 특정 object, 생략하면 해당 type 전체 이력이다. primary key 값은 date/string/timestamp/boolean/integer/double/long tagged union이다.

filter는 timestampFilter 또는 operationIdsFilter다. Timestamp start/end는 **양쪽 포함**이며 일반 time series의 end 제외와 다르다. OSv1 object type에서는 filter가 무시된다. branch/scenario 문맥을 확인하고 default pageSize 100과 nextPageToken으로 이어 읽는다.

각 entry는 objectPrimaryKey, operationId, actionTypeRid, 수행 principal, timestamp와 edit를 갖는다. createEdit는 생성 property, deleteEdit는 previousProperties, modifyEdit는 변경 전/후 값을 제공한다. 기본 previousProperties는 변경한 property만 포함하며 includesAllPreviousValues와 요청 includeAllPreviousProperties를 구별한다.

이 응답의 totalCount 설명은 **현재 data 배열의 항목 수**다. 일반 검색 totalCount처럼 전체 페이지 개수로 재사용하지 않는다. 실제 이력 조회와 Action 적용은 시험하지 않았다.

## 출처

- [Apply Action](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/actions/apply-action)
- [Apply Action Batch](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/actions/apply-action-batch)
- [Get Action Type](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/action-types/get-action-type)
- [Object Type Edits History](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/object-types/get-object-type-edits-history)

## 관련 문서

- [[Palantir-Ontology-V2-Metadata-API]]
- [[Palantir-Ontology-V2-Property-API]]
