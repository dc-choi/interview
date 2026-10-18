---
tags: [palantir, foundry, security, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 접근 제어의 전파와 읽기 경계"]
---

# Foundry 접근 제어의 전파와 읽기 경계

Foundry 보안에서는 읽을 수 있는가와 읽은 데이터의 제약이 downstream에도 남는가를 구분한다. Project role만 확인하거나 화면에서 property label이 보인다는 사실만으로 데이터 흐름 전체를 보호했다고 판단하지 않는다. 아래는 2026-10-16 공식 문서 기준이며 실제 권한 변경은 실행하지 않았다.

## Mandatory와 discretionary

Mandatory control은 marking, classification(CBAC), organization requirement다. Platform이 추적하는 hierarchy/dependency를 따라 데이터와 함께 전달된다. Discretionary control은 resource role과 restricted view/object/property policy 등의 읽기 제어다.

Role은 resource에서 무엇을 할 수 있는지 허용하지만 source role을 만족한 읽기 결과에 정책을 붙여 보내지는 않는다. Row/column policy도 읽기 때 필터링하며 function return, Action edit, AIP context/output, OSDK response와 export에 source policy가 계속 적용되는 것은 아니다. Destination의 control과 source의 read-time control을 나누어 설계한다.

플랫폼 외부 screenshot, clipboard, print와 export 파일을 모든 marking이 자동 통제한다고 확대 해석하지 않는다. Download controls 문서는 이 경로를 별도 한계로 명시한다. Mandatory 전파의 플랫폼 경계와 고객의 외부 데이터 사용 책임을 함께 검토한다.

## Marking 상속

일반 marking은 모두 만족해야 하는 AND 조건이며 membership은 eligibility이지 resource role의 대체물이 아니다. Dataset Owner도 marking의 Expand access 권한이 없으면 제거할 수 없다.

Hierarchy에서 물려받은 file marking은 discovery와 resource 접근을 제한한다. Upstream dependency에서 물려받은 data marking은 데이터 접근을 제한하며 metadata는 보일 수 있다. File/Project access와 data access를 각각 확인한다.

Marking 추가/제거는 downstream에 즉시 영향을 줄 수 있다. Source에서 제거하는 것과 특정 transform 경로에서 상속을 끊는 것은 범위가 다르다. 민감 열 제거, 상속 제거의 승인과 downstream 재빌드를 함께 검토한다. Snapshot 예시의 결과를 APPEND/UPDATE history까지 자동 정리하는 보장으로 확대하지 않는다.

## CBAC는 단순 marking 목록과 다르다

CBAC는 기본 활성화 기능이 아니며 환경별 category/hierarchy를 구성한다. Category 내부는 AND 또는 OR를 사용할 수 있지만 전체 classification의 category들은 AND로 결합한다. 일반 mandatory marking의 AND 규칙과 혼동하지 않는다.

File classification은 discovery, data classification은 내용 읽기, Project classification은 Project 접근을 제한한다. Data classification은 file 및 upstream data classification을 결합한다. Project classification 자체는 downstream data dependency에 상속되지 않아 Project marking과 다르다.

Project maximum classification은 허용 상한이며 기본 Project classification과 같지만 별도로 변경/제거할 수 있다. Upstream 높은 classification을 상속해 상한을 위반해도 보호가 풀리는 것은 아니며 build가 차단될 수 있다.

## Restricted view

Restricted view는 backing dataset의 row를 granular policy로 필터링하는 read-layer resource다. 일반 batch transform input으로 새 dataset을 만드는 경로를 지원하지 않으며 object backing datasource로 사용할 수 있다. User/group/Org는 이름이 아닌 UUID를 사용한다.

Group/marking/organization membership에 NOT을 쓰면 scoped token이 속성을 생략할 때 부정 조건이 통과해 의도보다 접근이 늘 수 있다. Positive eligibility 조건으로 설계하고 scoped-session 조건에서 확인한다.

Marking column은 UUID의 string array여야 한다. `marking_type.mandatory` typeclass는 UI hint이며 그것만으로 정책이 활성화되는 것은 아니다. Marketplace는 policy를 package하고 user attribute/group 상태와 데이터를 복제하지 않으므로 destination의 policy 전제조건도 구성한다.

Branch는 원래 restricted view 권한을 공유한다. Branch backing dataset의 marking이 main과 다르면 main에서 제한한 데이터가 보일 수 있다. Branch add/build, object reindex, review/rebase를 구분하고 branch-only 제거는 되돌릴 수 없는 discard다. Rebase diff는 base 또는 branch 전체 선택 수준이며 세밀한 자동 merge를 보장하지 않는다.

## 보안 label의 한계

Workshop property security pill은 정보를 보여 주는 표시이며 숨겨도 enforcement는 유지된다. 낮은 property label만 보여도 object의 더 높은 classification을 만족해야 할 수 있다. 지원하지 않는 property type이나 hover가 있다고 해서 해당 데이터가 보호되지 않는다는 뜻도 아니다.

Check access의 resource requirements와 additional data requirements를 함께 확인한다. Data Lineage의 resource/data coloring과 access graph는 서로 다른 접근 경로를 설명하는 도구이며 실제 consumer와 principal에 대한 검증을 대신하지 않는다.

## 출처

- [Palantir Security, security](https://www.palantir.com/docs/foundry/security)
- [Palantir Security, access-control-propagation](https://www.palantir.com/docs/foundry/security/access-control-propagation)
- [Palantir Security, branching-restricted-views](https://www.palantir.com/docs/foundry/security/branching-restricted-views)
- [Palantir Security, checking-permissions](https://www.palantir.com/docs/foundry/security/checking-permissions)
- [Palantir Security, classification-based-access-controls](https://www.palantir.com/docs/foundry/security/classification-based-access-controls)
- [Palantir Security, markings](https://www.palantir.com/docs/foundry/security/markings)
- [Palantir Security, overview](https://www.palantir.com/docs/foundry/security/overview)
- [Palantir Security, property-security-markings](https://www.palantir.com/docs/foundry/security/property-security-markings)
- [Palantir Security, protecting-sensitive-data](https://www.palantir.com/docs/foundry/security/protecting-sensitive-data)
- [Palantir Security, restricted-views](https://www.palantir.com/docs/foundry/security/restricted-views)

## 관련 문서

- [[Palantir-Security-Governance]]
- [[Palantir-Security-Projects-Roles-and-Collaboration|Foundry Project, role과 조직 경계]]
- [[Palantir-Security-Audit-Schema-and-Delivery|Foundry audit schema, 전달과 증거 해석]]
- [[Palantir-Security-Privacy-Downloads-and-Justification|Foundry 데이터 최소화, 다운로드와 정당화]]
- [[Palantir-Security-Identity-Resilience-and-Shared-Responsibility|Foundry identity, 복구와 공동 책임]]
- [[Palantir-Security-Code-Scanning-Contracts|Foundry code scanning의 규칙과 검증 범위]]
