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
| Create Ontology Scenario | `POST /api/v2/ontologies/{ontology}/scenarios/create` | body `base`(선택, branch 등 기준), `expireAfter`(선택, 만료 일시 문자열, 생성 시각 이후이고 생성 후 31일 이내, 기본 생성 후 31일), 응답 `scenarioRid` | `api:ontologies-read`, `api:ontologies-write` |
| Rebase Ontology Scenario | `POST /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/rebase` | scenario에서 편집한 object type 전체를 base의 최신 데이터 위로 옮긴다, scenario 편집 권한 필요 | `api:ontologies-read`, `api:ontologies-write` |
| List Scenario Edited Objects | `GET /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/objects/{objectType}/edited` | object type별 편집 객체, `pageSize`, `pageToken`, 응답 `data`, `nextPageToken` | `api:ontologies-read` |
| List Scenario Conflicting Objects | `GET /api/v2/ontologies/{ontology}/scenarios/{scenarioRid}/objects/{objectType}/conflicting` | scenario 생성 뒤 base에서 바뀐 편집과 충돌하는 객체, 응답은 `ObjectLocator` 목록 | `api:ontologies-read` |

같은 resource에는 편집된 object type, link type, entity type과 link를 나열하는 endpoint도 있다. 이 문서에서는 이름만 확인했고 요청과 응답 필드는 대조하지 않았다.

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
- [List Scenario Edited Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-edited-objects)
- [List Scenario Conflicting Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-scenarios/list-scenario-conflicting-objects)
- [Apply Action](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/actions/apply-action)
- [Execute Query](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/queries/execute-query)
- [List Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-objects/list-objects)
- [Scenarios overview](https://www.palantir.com/docs/foundry/ontology/overview-ontology-scenario)

## 관련 문서

- [[Palantir-Ontology-Scenario-Contracts|Scenario의 격리, 수명과 병합 계약]]
- [[Palantir-Ontology-Scenarios|Scenario 편집과 반영]]
- [[Palantir-Ontology-V2-Action-API]]
