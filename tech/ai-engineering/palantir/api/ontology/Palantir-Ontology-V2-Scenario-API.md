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
| List Scenario Edited Objects | `GET /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/objects/{objectType}/edited` | object type별 편집 객체, `pageSize`, `pageToken`, 응답 `data`, `nextPageToken` | `api:ontologies-read` |
| List Scenario Edited Link Types | `GET /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/objectTypes/{objectType}/outgoingLinkTypes/edited` | path의 object type에서 나가는 link 중 scenario 안에서 수정된 link type의 API name 목록, many-to-many link type만 반환, query는 `preview`뿐이고 paging parameter 없음, 응답 `data`(선택, `LinkTypeApiName` 문자열 목록) | `api:ontologies-read` |
| List Scenario Conflicting Objects | `GET /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/objects/{objectType}/conflicting` | scenario 생성 뒤 base에서 바뀐 편집과 충돌하는 객체, 응답은 `ObjectLocator` 목록 | `api:ontologies-read` |

Edited Link Types는 many-to-many link type만 돌려준다. One-to-many link의 편집은 foreign key property를 가진 object type의 객체 편집으로 드러나므로, 이 endpoint가 빈 목록을 돌려줘도 one-to-many link가 바뀌지 않았다는 뜻은 아니다. 같은 resource에는 편집된 entity type과 link를 나열하는 endpoint도 있다. 이 문서에서는 이름만 확인했고 요청과 응답 필드는 대조하지 않았다.

설계 제안(공식 절차 아님): 편집 객체, 편집 link type과 충돌 조회는 path에 `{objectType}`을 받으므로, scenario의 편집을 훑을 때는 먼저 Edited Object Types로 수정된 object type을 얻고 type마다 Edited Objects, Conflicting Objects와 Edited Link Types를 호출하는 순서를 쓸 수 있다. 이 순서는 명세의 path 구조에서 추론한 것이다. 다만 Edited Object Types가 many-to-many link만 편집된 object type까지 돌려주는지는 명세에 적혀 있지 않으므로, link 편집을 빠짐없이 찾아야 하면 같은 resource의 편집된 entity type 조회 endpoint가 이 목록을 한 번에 주는지 먼저 확인하고, 그렇지 않으면 모든 many-to-many link type의 양 끝 object type을 link type 정의에서 확인해 각각 Edited Link Types를 호출한다. Edited Object Types와 Edited Link Types 응답의 `data`는 명세상 필수 필드가 아니지만 언제 빠지는지는 적혀 있지 않으므로, 필드가 없으면 빈 목록으로 다루는 방어적 처리가 필요하다. 다만 두 endpoint의 명세에는 Edited Objects와 달리 호출자가 볼 수 있는 범위만 반환한다는 설명이 없어, 보기 권한과 결과의 관계는 실제 환경에서 확인해야 한다.

## Create 요청의 세부 계약

- Path의 `{ontology}`는 Ontology의 API name 또는 RID를 받는다. 값은 List Ontologies endpoint나 Ontology Manager에서 찾는다.
- `base`는 union이고 명세에 정의된 subtype은 `branch` 하나다. 명세 예시는 `{"base": {"type": "branch", "branch": "my-branch"}}`이며, `branch` 값은 global Foundry branch의 RID 또는 dataset branch identifier다. `base`를 생략했을 때 어떤 기준으로 초기화되는지는 명세에 적혀 있지 않다.
- `expireAfter`는 date-time 형식 문자열이다. 이 시각이 지나면 scenario가 만료되어 자동 정리된다.
- 응답의 `scenarioRid`는 `ri.actions..scenario.<UUID>` 형태 예시로 제시된다. 이후 scenario 문맥 호출에 이 값을 그대로 넘긴다.

## 사용할 때 주의할 점

- 생성 응답은 RID 하나다. Apply Action, Execute Query와 Load Object Set은 `scenarioRid` query parameter로 scenario 문맥을 받는다. V2 List Objects는 branch만 받고 `scenarioRid`가 없으므로 endpoint별 지원 여부를 확인한다. 상세는 [[Palantir-Ontology-V2-ObjectSet-API]]와 [[Palantir-Ontology-V2-Action-API]]를 참고한다.
- `expireAfter`는 생성 후 31일을 넘길 수 없다. 장기 보관이나 감사 기록 용도로 scenario를 쓰지 않는다.
- Rebase는 편집한 object type 단위로 동작한다. 같은 base에서 같은 object type을 편집한 다른 scenario도 갱신된 데이터를 볼 수 있다. Ontology 가이드는 scenario가 10분마다 자동 rebase되고 임의 rebase는 지원하지 않는다고 설명하므로, preview rebase endpoint를 쓰기 전에 실제 환경의 지원 범위를 확인한다.
- 편집 객체 목록은 호출자가 볼 수 있는 객체만 반환하고, 한 페이지가 `pageSize`보다 적을 수 있다. 짧은 페이지를 끝으로 판단하지 말고 `nextPageToken`으로 판단한다.
- 충돌 조회의 `pageSize`는 반환 개수가 아니라 충돌 여부를 검사할 객체 수다. 사용자에게 보이는 객체 데이터에 드러나지 않는 변경도 충돌로 셀 수 있어 false positive가 생긴다. 충돌 조회도 호출자가 볼 수 있는 객체만 반환하므로 보기 권한이 일부뿐인 호출자에게는 충돌이 없는 것처럼 보일 수 있다.
- 설계 제안(공식 절차 아님): 충돌 조회를 병합 차단 조건으로 쓰려면 편집한 객체를 모두 볼 수 있는 주체로 호출하고, 실제 충돌 여부는 scenario 생성 시점에 저장한 편집 대상 property 기준값과 현재 base 값을 비교해 판단한다.

## 출처

- [Ontology Scenario basics](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/ontology-scenario-basics)
- [Create Ontology Scenario](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/create-ontology-scenario)
- [Rebase Ontology Scenario](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/rebase-ontology-scenario)
- [List Scenario Edited Object Types](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-edited-object-types)
- [List Scenario Edited Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-edited-objects)
- [List Scenario Edited Link Types](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-edited-link-types)
- [List Scenario Conflicting Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-conflicting-objects)
- [Apply Action](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/actions/apply-action)
- [Execute Query](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/queries/execute-query)
- [List Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-objects/list-objects)
- [Scenarios overview](https://www.palantir.com/docs/foundry/ontology/overview-ontology-scenario)

## 관련 문서

- [[Palantir-Ontology-Scenario-Contracts|Scenario의 격리, 수명과 병합 계약]]
- [[Palantir-Ontology-Scenarios|Scenario 편집과 반영]]
- [[Palantir-Ontology-V2-Action-API]]
