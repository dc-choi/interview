---
tags: [palantir, foundry, api, ontology, scenario]
status: done
verified_at: 2026-11-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["Ontology Scenario API", "OntologyScenario REST API"]
---

# Ontology V2의 Scenario API

OntologyScenario는 Ontology의 sandbox data fork다. 운영 데이터에 영향을 주지 않고 시뮬레이션을 하도록 scenario를 만들고, 그 안에서 읽기와 쓰기를 한 뒤 변경을 Ontology로 병합한다. 이 문서는 Platform API의 Ontologies V2 resource로 노출된 scenario endpoint의 계약을 정리한다. 수명, 승인과 merge Action 설계는 [[Palantir-Ontology-Scenario-Contracts]]를 따른다. Public API 명세를 대조했으며 실제 Foundry 환경에서 호출하지 않았다.

## 전부 preview endpoint다

확인한 endpoint는 모두 preview이며 예고 없이 바뀌거나 제거될 수 있다. 요청에 `preview=true` query를 붙여야 한다. 운영 연동에서는 OSDK의 scenario 지원 버전과 이 REST 명세를 함께 확인하고, preview 계약에 의존하는 범위를 격리한다.

## Endpoint 지도

Scenario resource 아래 문서는 생성, rebase와 편집 및 충돌 조회로 나뉜다.

| Endpoint | 요청 | 확인한 계약 | Scope |
| --- | --- | --- | --- |
| Create Ontology Scenario | `POST /api/v2/ontologies/{ontology}/scenarios/create` | body `base`(선택, branch 기준), `expireAfter`(선택, 만료 일시 문자열, 생성 시각 이후이고 생성 후 31일 이내, 기본 생성 후 31일), 응답 `scenarioRid` | `api:ontologies-read`, `api:ontologies-write` |
| Rebase Ontology Scenario | `POST /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/rebase` | scenario에서 편집한 object type 전체를 base의 최신 데이터 위로 옮긴다, scenario 편집 권한 필요, 요청 body와 응답 body 정의 없음 | `api:ontologies-read`, `api:ontologies-write` |
| List Scenario Edited Object Types | `GET /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/objectTypes/edited` | scenario 안에서 수정된 object type의 API name 목록, query는 `preview`뿐이고 paging parameter 없음, 응답 `data`(선택, camelCase `ObjectTypeApiName` 문자열 목록) | `api:ontologies-read` |
| List Scenario Edited Objects | `GET /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/objects/{objectType}/edited` | path의 object type에서 scenario 안에서 편집된 객체, query `pageSize`(선택, 페이지당 최대 객체 수), `pageToken`(선택), `preview`, 요청 body 없음, 응답 `data`(선택, `OntologyObjectV2` 목록)와 `nextPageToken`(선택) | `api:ontologies-read` |
| List Scenario Edited Link Types | `GET /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/objectTypes/{objectType}/outgoingLinkTypes/edited` | path의 object type에서 나가는 link 중 scenario 안에서 수정된 link type의 API name 목록, many-to-many link type만 반환, query는 `preview`뿐이고 paging parameter 없음, 응답 `data`(선택, `LinkTypeApiName` 문자열 목록) | `api:ontologies-read` |
| List Scenario Edited Entity Types | `GET /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/editedEntityTypes` | scenario 안에서 수정된 object type과 many-to-many link type을 한 번에 반환, query는 `preview`뿐이고 paging parameter 없음, 응답 `objectTypes`(선택, `ObjectTypeApiName` 문자열 목록)와 `linkTypes`(선택, source object type별 묶음 `ObjectTypeLinkTypeApiNameMapping` 목록) | `api:ontologies-read` |
| List Scenario Edited Links | `GET /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/objects/{objectType}/links/{linkType}/edited` | path의 object type과 link type에서 scenario 안에서 편집된 link를 source object별로 묶어 반환, many-to-many link type만 지원, 두 객체를 모두 볼 수 있는 link만 반환, query `pageSize`(선택, 페이지당 최대 link 수), `pageToken`(선택), `preview`, 요청 body 없음, 응답 `data`(선택, `LinksFromObject` 목록)와 `nextPageToken`(선택) | `api:ontologies-read` |
| List Scenario Conflicting Objects | `GET /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/objects/{objectType}/conflicting` | scenario 생성 뒤 base에서 바뀐 편집과 충돌하는 객체, 응답은 `ObjectLocator` 목록 | `api:ontologies-read` |

Edited Link Types는 many-to-many link type만 돌려준다. One-to-many link의 편집은 foreign key property를 가진 object type의 객체 편집으로 드러나므로, 이 endpoint가 빈 목록을 돌려줘도 one-to-many link가 바뀌지 않았다는 뜻은 아니다. 편집된 many-to-many link 자체는 List Scenario Edited Links로 읽는다. 이 endpoint도 many-to-many link type만 지원하므로 one-to-many link의 편집은 Edited Objects로 확인한다. 응답 `data`의 각 `LinksFromObject`는 `sourceObject`(선택)와 `linkedObjects`(선택, `LinkedObjectLocator` 목록)로 이루어지고, 각 `LinkedObjectLocator`는 `targetObject`(선택)와 `linkType`(선택, link type API name)을 가진다. `sourceObject`와 `targetObject`는 property API name을 key로 둔 map 타입이지만 `__primaryKey`와 `__apiName`만 담으므로 전체 객체가 아니라 object locator로 다룬다. `LinkedObjectLocator`에는 source object 정보가 없어 바깥의 `sourceObject`와 짝지어야 link 하나가 완성된다. 명세는 편집이 link 추가인지 삭제인지 구분하는 필드를 두지 않고, 삭제된 link가 목록에 포함되는지도 적지 않으므로, 응답만으로 편집의 방향을 판단하지 않는다. `pageSize`는 link 수 기준인데 `data`는 source object별로 묶이며, 한 source object의 link가 여러 페이지에 나뉘는지는 명세에 없으므로 페이지를 넘기며 `sourceObject` 기준으로 합친다. Edited Objects와 같이 한 페이지가 `pageSize`보다 적을 수 있으므로 끝은 `nextPageToken`으로 판단하고, 한쪽 객체를 볼 수 없는 link는 빠지므로 보기 권한이 일부뿐인 호출자에게는 편집된 link가 적게 보일 수 있다.

Edited Entity Types는 object type과 link type의 편집 목록을 scenario 단위로 한 번에 준다. `linkTypes`의 각 항목은 `objectTypeApiName`(필수)과 그 object type 기준의 `linkTypes`(선택, `LinkTypeApiName` 문자열 목록)로 이루어진다. Link type API name은 object type 안에서만 유일하므로 link type을 모호하지 않게 식별하려면 이 쌍이 필요하다. 여기서도 many-to-many link type만 반환하며, one-to-many link의 편집은 foreign key property를 가진 object type의 객체 편집으로 드러난다. 명세는 묶음 기준을 source object type, 곧 link type이 속한 object type으로 적을 뿐, 같은 many-to-many link가 반대쪽 object type 아래에도 나오는지는 적지 않는다.

설계 제안(공식 절차 아님): 편집 객체, 편집 link type과 충돌 조회는 path에 `{objectType}`을 받으므로, scenario의 편집을 훑을 때는 먼저 수정된 object type 목록을 얻고 type마다 Edited Objects, Conflicting Objects와 Edited Link Types를 호출한 뒤, 돌려받은 link type마다 Edited Links를 호출하는 순서를 쓸 수 있다. 이 순서는 명세의 path 구조에서 추론한 것이다. Edited Object Types가 many-to-many link만 편집된 object type까지 돌려주는지는 명세에 적혀 있지 않으므로, 그 목록으로 type을 돌면 link만 편집된 object type을 놓칠 수 있다. Edited Entity Types는 scenario 단위라 이 목록에 의존하지 않고 object type과 link type의 쌍을 얻으며, 편집된 object type이 둘 이상이면 호출 수도 줄어든다. 다만 Edited Object Types의 `data`와 Edited Entity Types의 `objectTypes`가 같은 범위인지, source object type 기준인 `linkTypes`와 object type마다 outgoing link를 돌려주는 Edited Link Types가 같은 집합을 주는지(반대쪽 object type에도 나오는지 포함)는 명세로 확인되지 않으므로, 하나를 다른 하나의 대체로 가정하지 말고 실제 환경에서 대조한다. Edited Object Types, Edited Link Types와 Edited Entity Types 응답의 목록 필드는 명세상 필수 필드가 아니지만 언제 빠지는지는 적혀 있지 않으므로, 필드가 없으면 빈 목록으로 다루는 방어적 처리가 필요하다. 다만 세 endpoint의 명세에는 Edited Objects와 달리 호출자가 볼 수 있는 범위만 반환한다는 설명이 없어, 보기 권한과 결과의 관계는 실제 환경에서 확인해야 한다.

## Create 요청의 세부 계약

- Path의 `{ontology}`는 Ontology의 API name 또는 RID를 받는다. 값은 List Ontologies endpoint나 Ontology Manager에서 찾는다.
- `base`는 union이고 명세에 정의된 subtype은 `branch` 하나다. 명세 예시는 `{"base": {"type": "branch", "branch": "my-branch"}}`이며, `branch` 값은 global Foundry branch의 RID 또는 dataset branch identifier다. `base`를 생략했을 때 어떤 기준으로 초기화되는지는 명세에 적혀 있지 않다.
- `expireAfter`는 date-time 형식 문자열이다. 이 시각이 지나면 scenario가 만료되어 자동 정리된다.
- 응답의 `scenarioRid`는 `ri.actions..scenario.<UUID>` 형태 예시로 제시된다. 이후 scenario 문맥 호출에 이 값을 그대로 넘긴다.

## 사용할 때 주의할 점

- 생성 응답은 RID 하나다. Apply Action, Execute Query와 Load Object Set은 `scenarioRid` query parameter로 scenario 문맥을 받는다. V2 List Objects는 branch만 받고 `scenarioRid`가 없으므로 endpoint별 지원 여부를 확인한다. 상세는 [[Palantir-Ontology-V2-ObjectSet-API]]와 [[Palantir-Ontology-V2-Action-API]]를 참고한다.
- `expireAfter`는 생성 후 31일을 넘길 수 없다. 장기 보관이나 감사 기록 용도로 scenario를 쓰지 않는다.
- Rebase는 편집한 object type 단위로 동작한다. 같은 base에서 같은 object type을 편집한 다른 scenario도 갱신된 데이터를 볼 수 있다. Ontology 가이드는 scenario가 10분마다 자동 rebase되고 임의 rebase는 지원하지 않는다고 설명하므로, preview rebase endpoint를 쓰기 전에 실제 환경의 지원 범위를 확인한다.
- 편집 객체 목록은 호출자가 볼 수 있는 객체만 반환하고, 한 페이지가 `pageSize`보다 적을 수 있다. 짧은 페이지를 끝으로 판단하지 말고 `nextPageToken`으로 판단한다. 첫 요청에는 `pageToken`을 넣지 않고, 다음 페이지는 이전 응답의 `nextPageToken` 값을 `pageToken`에 넣어 요청한다.
- 편집 객체 응답의 `data` 항목 타입은 충돌 조회의 `ObjectLocator`(object type과 primary key)가 아니라 `OntologyObjectV2`다. 이 타입은 property API name을 key로, property 값을 value로 둔 map이다. 다만 명세는 어떤 property가 포함되는지, scenario 안에서 삭제된 객체가 어떻게 나오는지 적지 않는다. 같은 구조(같은 설명과 property map 형태)를 쓰는 List Scenario Edited Links는 객체에 `__primaryKey`와 `__apiName`만 담아 locator처럼 쓴다고 밝히므로, 타입만 보고 전체 객체라고 가정하지 않는다.
- Property 값은 타입별 JSON 인코딩을 따른다. Long과 Decimal은 문자열, Date는 ISO 8601 날짜 문자열, Timestamp는 UTC의 ISO 8601 date-time 문자열, GeoPoint와 GeoShape는 GeoJSON이다. Secured Property Value는 `value`와 `propertySecurityIndex`를 가진 객체로, Timeseries는 객체 또는 series id 문자열로 올 수 있다. 하위 호환을 위해 Boolean, Byte, Double, Float, Integer와 Short 값은 JSON 문자열로도 올 수 있으므로 역직렬화에서 두 형태를 모두 받는다.
- 명세는 반환 값이 scenario 안의 편집 후 값인지 설명하지 않는다. 편집 후 값이라고 해도 현재 base와 비교하면 생성 이후 base 변경이 섞이므로 편집 전후 비교가 되지 않는다. 설계 제안(공식 절차 아님): 편집 전 값이 필요하면 아래 충돌 판단과 같이 scenario 생성 시점의 기준값을 저장하고, 응답 값의 의미는 실제 환경에서 확인한다.
- 충돌 조회의 `pageSize`는 반환 개수가 아니라 충돌 여부를 검사할 객체 수다. 사용자에게 보이는 객체 데이터에 드러나지 않는 변경도 충돌로 셀 수 있어 false positive가 생긴다. 충돌 조회도 호출자가 볼 수 있는 객체만 반환하므로 보기 권한이 일부뿐인 호출자에게는 충돌이 없는 것처럼 보일 수 있다.
- 설계 제안(공식 절차 아님): 충돌 조회를 병합 차단 조건으로 쓰려면 편집한 객체를 모두 볼 수 있는 주체로 호출하고, 실제 충돌 여부는 scenario 생성 시점에 저장한 편집 대상 property 기준값과 현재 base 값을 비교해 판단한다.

## 출처

- [Ontology Scenario basics](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/ontology-scenario-basics)
- [Create Ontology Scenario](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/create-ontology-scenario)
- [Rebase Ontology Scenario](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/rebase-ontology-scenario)
- [List Scenario Edited Object Types](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-edited-object-types)
- [List Scenario Edited Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-edited-objects)
- [List Scenario Edited Link Types](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-edited-link-types)
- [List Scenario Edited Entity Types](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-edited-entity-types)
- [List Scenario Edited Links](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-edited-links)
- [List Scenario Conflicting Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-conflicting-objects)
- [Apply Action](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/actions/apply-action)
- [Execute Query](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/queries/execute-query)
- [List Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-objects/list-objects)
- [Scenarios overview](https://www.palantir.com/docs/foundry/ontology/overview-ontology-scenario)

## 관련 문서

- [[Palantir-Ontology-Scenario-Contracts|Scenario의 격리, 수명과 병합 계약]]
- [[Palantir-Ontology-Scenarios|Scenario 편집과 반영]]
- [[Palantir-Ontology-V2-Action-API]]
