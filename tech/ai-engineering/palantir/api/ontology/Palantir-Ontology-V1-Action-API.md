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

### 경로 식별자와 입력 생략을 구분한다

`ontologyRid`에는 Ontology의 RID를, `actionType`에는 Action의 API name을 넣는다. 각각 List Ontologies와 List Action Types 또는 Ontology Manager에서 확인한다. 화면의 표시명을 API name 대신 보내지 않도록 호출 전에 식별자를 구분한다.

요청 본문은 필수지만 그 안의 `parameters` map은 API 스키마에서 선택 필드다. map의 키는 parameter ID다. 이 구조적 생략 가능성을 개별 Action의 필수 입력 면제나 기본값 자동 적용으로 해석하지 않는다. 필요한 입력은 Action 정의와 검증 결과에 맞춰 준비한다.

2026-11-03 Apply Action의 경로, 입력 스키마, 기본값 미지원과 빈 성공 응답을 공식 문서와 대조했다. 이 부분 확인은 아래 Batch, Validate와 Attachment 계약 전체의 재검증을 뜻하지 않는다.

### 여러 번 적용하는 Batch의 경계

`applyBatch`는 같은 action type을 여러 번 적용한다. 일반 상한은 한 요청 20개다. OSv2 객체만 수정하고 Function을 호출하지 않는 Action은 더 높은 한도를 받을 수 있으므로 이를 모든 Action의 보장치로 쓰지 않는다. Batch는 default parameter와 notification을 지원하지 않는다. 공개 본문에 없는 전체 batch 원자성이나 안전한 자동 재시도는 추정하지 않는다.

`POST /api/v1/ontologies/{ontologyRid}/actions/{actionType}/applyBatch`의 본문은 `requests` 배열로 적용별 `parameters` map을 묶는다. Action type은 경로에서 하나를 정하므로 서로 다른 Action type을 배열 원소마다 지정하는 계약이 아니다. OAuth2 호출에는 `api:ontologies-read`와 `api:ontologies-write`가 모두 필요하다.

성공 응답은 `{}`이며 항목별 결과 배열이나 변경 객체 목록이 아니다. 호출한 입력과 변경 확인에 필요한 식별자를 클라이언트에서 별도로 보관하는 것을 운영 기준으로 삼는다. 응답이 비었다는 이유로 실패한 요청이라고 판단해 재전송하지 않는다. 타임아웃처럼 적용 여부가 불명확한 경우의 재시도 안전성은 이 응답 형태만으로 보장되지 않는다.

2026-11-03 버전 없는 문서 주소와 `/api/v1/` 문서 주소가 설명하는 위 V1 endpoint, 요청 예제, 빈 응답과 제한을 대조했다. OSv1/OSv2 변경 가시성은 위 저장소 구분을 따른다. 실제 API 호출이나 장애 시 부분 적용 여부를 재현한 검증은 아니다.

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

### 검증 요청의 성공과 입력의 유효성을 구분한다

검증의 전체 경로는 `POST /api/v1/ontologies/{ontologyRid}/actions/{actionType}/validate`다. `ontologyRid`는 Ontology RID, `actionType`은 Action의 API name이다. 요청 본문 안의 `parameters` map은 선택 필드지만, 생략한 개별 입력은 null로 평가된다. map을 생략할 수 있다는 스키마가 해당 Action의 필수 입력을 면제하지는 않는다.

성공 응답을 받았더라도 본문의 `result`는 `INVALID`일 수 있다. 검증 요청이 처리됐다는 사실과 주어진 입력이 유효하다는 판정을 별도로 다룬다. 응답의 `submissionCriteria` 목록과 `parameters` map도 선택 필드이므로, 전체 판정과 실제 반환된 상세 결과를 구분해서 읽는다.

공식 응답 예제에서는 `age`에 `gte: 18` 제약이 있는데 입력이 17이라 해당 parameter가 `INVALID`다. 별도로 submission criterion도 실패 문구와 `INVALID`를 반환한다. 화면에서는 입력 필드의 제약 위반과 제출 조건의 실패를 나누어 보여주는 설계를 적용할 수 있다. `VALID`를 받아도 기존 데이터와의 충돌이나 실제 적용 성공까지 보증하지는 않는다.

2026-11-03 버전 없는 주소와 `/api/v1/` 문서 주소의 검증 경로, 입력과 응답 스키마, 기본값 미지원 및 응답 예제를 대조했다. 실제 API 실행과 다른 절 전체의 재검증은 하지 않아 기존 `verified_at`은 유지한다.

## Action logic과 직렬화

Action logic에는 object/interface object의 create/modify/delete, link 변경과 applyScenario가 있다. link API name은 object type 내부에서만 유일하다. applyScenario는 scenario에 누적한 edit를 현재 Ontology 문맥에 반영하며 영향받는 object/link type 범위를 명시한다.

parameter baseType 문자열뿐 아니라 선택적 재귀 dataType도 확인한다. array/struct/object set/object/interface/scenario/time series와 marking/cipher text 같은 값은 서로 다른 구조다. long/decimal을 숫자로 강제 변환하면 정밀도를 잃는다. object reference는 primary key 값이며 interface reference는 type 이름까지 필요하다.

## Attachment의 수명

`POST /api/v1/attachments/upload`는 filename query와 binary body를 받는다. Content-Type은 `application/octet-stream`, OAuth2 scope는 `api:ontologies-write`다. 응답 metadata의 attachment RID를 Action parameter에 전달해 object와 연결한다.

업로드 후 **한 시간 안에 Action으로 object와 연결되지 않은 파일은 삭제된다**. 과거 연결되었지만 더 이상 어떤 object와도 연결되지 않은 attachment도 2주 주기로 제거된다. 임시 upload를 장기 보관 완료로 간주하지 않는다.

Attachment metadata GET과 `/content` binary GET은 `api:ontologies-read`다. metadata의 filename, mediaType, sizeBytes와 실제 binary 응답을 구별하며 sizeBytes는 long 문자열이다.

## 출처

- [Apply Action](https://www.palantir.com/docs/foundry/api/ontology-resources/actions/apply-action)
- [Apply Action (v1)](https://www.palantir.com/docs/foundry/api/v1/ontology-resources/actions/apply-action) — 2026-11-03 경로 식별자와 요청 스키마를 대조한 버전 명시 주소
- [Apply Action Batch](https://www.palantir.com/docs/foundry/api/ontology-resources/actions/apply-action-batch)
- [Apply Action Batch (v1)](https://www.palantir.com/docs/foundry/api/v1/ontology-resources/actions/apply-action-batch) — 2026-11-03 요청 배열, OAuth2 scope, 빈 성공 응답과 적용 제한 대조
- [Validate Action](https://www.palantir.com/docs/foundry/api/ontology-resources/actions/validate-action)
- [Validate Action (v1)](https://www.palantir.com/docs/foundry/api/v1/ontology-resources/actions/validate-action) — 2026-11-03 검증 요청과 응답 스키마, INVALID 성공 응답 예제 대조
- [Get Action Type](https://www.palantir.com/docs/foundry/api/ontology-resources/action-types/get-action-type)
- [Upload Attachment](https://www.palantir.com/docs/foundry/api/ontology-resources/attachments/upload-attachment)

## 관련 문서

- [[Palantir-Ontology-V1-Read-API]]
- [[Palantir-API-Client-Contract]]
