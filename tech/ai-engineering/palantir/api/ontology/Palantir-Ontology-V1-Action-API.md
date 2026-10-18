---
tags: [palantir, foundry, api, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology V1의 Action 검증, 적용과 첨부파일

Action은 action type을 한 번 적용한 것이다. Action type metadata는 parameter와 논리, 상태 ACTIVE/ENDORSED/EXPERIMENTAL/DEPRECATED를 제공한다. Action 적용 API는 사용자에게 허용된 Ontology 변경을 실행하는 계약이다.

## 적용과 저장소 일관성

`POST /api/v1/ontologies/{ontologyRid}/actions/{actionType}/apply`의 parameters map에 값을 전달한다. OAuth2는 `api:ontologies-read`와 `api:ontologies-write` 모두 필요하다. 성공 응답은 빈 object이며 이것을 변경 객체 목록으로 해석하지 않는다.

OSv1 object/link 변경은 eventual consistency, OSv2 변경은 Action 완료 직후 보인다. 동일한 API 응답 뒤 즉시 읽기 결과가 다른 이유를 저장소 backend와 함께 판단한다. 이 endpoint는 parameter default value를 지원하지 않는다.

`applyBatch`는 같은 action type을 여러 번 적용한다. 일반 상한은 한 요청 20개다. OSv2 객체만 수정하고 Function을 호출하지 않는 Action은 더 높은 한도를 받을 수 있으므로 이를 모든 Action의 보장치로 쓰지 않는다. Batch는 default parameter와 notification을 지원하지 않는다. 공개 본문에 없는 전체 batch 원자성이나 안전한 자동 재시도는 추정하지 않는다.

## 검증은 적용 성공의 보증이 아니다

`POST .../validate`는 `api:ontologies-read`로 parameter와 submission criteria를 평가해 VALID/INVALID를 반환한다. 성능 때문에 기존 객체나 Foundry 데이터를 검사하지 않으므로 primary key 유일성, user ID 존재 여부는 검증하지 않는다. 생략 parameter는 null이며 Action의 configured default value를 적용하지 않는다.

응답은 전체 result, submissionCriteria별 결과와 configuredFailureMessage, parameter별 result/evaluatedConstraints/required/defaultValue를 구분한다. 제약은 입력 parameter에 따라 동적으로 결정되며 최종 제약 집합에 대해 평가한다.

| 제약 | 확인할 사항 |
|---|---|
| oneOf | option display/value와 otherValuesAllowed |
| range | lt/lte/gt/gte의 포함 여부 |
| stringLength | 길이의 포함 경계 |
| stringRegexMatch | 지정 정규식 |
| arraySize, array | 전체 길이와 지원되는 원소별 평가 |
| groupMember | 지정 그룹 중 적어도 하나의 user ID |
| objectQueryResult | object set 내 객체의 primary key |
| objectPropertyValue | object set 내 객체의 property 값 |
| unevaluable | 다른 parameter/객체 집합이 누락 또는 invalid여서 평가 불가 |

Struct parameter는 field별 제약과 required를, array parameter는 지원되는 원소별 제약을 갖는다. unevaluable은 통과와 동일하지 않다. submission criteria의 실패 문구와 parameter 오류를 분리해 사용자에게 원인을 보여준다.

## Action logic과 직렬화

Action logic에는 object/interface object의 create/modify/delete, link 변경과 applyScenario가 있다. link API name은 object type 내부에서만 유일하다. applyScenario는 scenario에 누적한 edit를 현재 Ontology 문맥에 반영하며 영향받는 object/link type 범위를 명시한다.

parameter baseType 문자열뿐 아니라 선택적 재귀 dataType도 확인한다. array/struct/object set/object/interface/scenario/time series와 marking/cipher text 같은 값은 서로 다른 구조다. long/decimal을 숫자로 강제 변환하면 정밀도를 잃는다. object reference는 primary key 값이며 interface reference는 type 이름까지 필요하다.

## Attachment의 수명

`POST /api/v1/attachments/upload`는 filename query와 binary body를 받는다. Content-Type은 `application/octet-stream`, OAuth2 scope는 `api:ontologies-write`다. 응답 metadata의 attachment RID를 Action parameter에 전달해 object와 연결한다.

업로드 후 **한 시간 안에 Action으로 object와 연결되지 않은 파일은 삭제된다**. 과거 연결되었지만 더 이상 어떤 object와도 연결되지 않은 attachment도 2주 주기로 제거된다. 임시 upload를 장기 보관 완료로 간주하지 않는다.

Attachment metadata GET과 `/content` binary GET은 `api:ontologies-read`다. metadata의 filename, mediaType, sizeBytes와 실제 binary 응답을 구별하며 sizeBytes는 long 문자열이다.

## 출처

- [Apply Action](https://www.palantir.com/docs/foundry/api/ontology-resources/actions/apply-action)
- [Apply Action Batch](https://www.palantir.com/docs/foundry/api/ontology-resources/actions/apply-action-batch)
- [Validate Action](https://www.palantir.com/docs/foundry/api/ontology-resources/actions/validate-action)
- [Get Action Type](https://www.palantir.com/docs/foundry/api/ontology-resources/action-types/get-action-type)
- [Upload Attachment](https://www.palantir.com/docs/foundry/api/ontology-resources/attachments/upload-attachment)

## 관련 문서

- [[Palantir-Ontology-V1-Read-API]]
- [[Palantir-API-Client-Contract]]
