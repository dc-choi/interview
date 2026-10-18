---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo CEL 승인 정책

## 정책 결합 단위

CEL은 CR 전체가 아니라 개별 변경마다 실행한다. 두 엔티티를 바꾸는 요청은 별도로 평가된다. space의 활성 정책을 모두 평가하고 요구사항은 AND로 결합한다. 한 정책의 approve가 다른 정책의 요구사항을 지우지 않는다. 모든 정책이 no_op이면 오류다.

각 식은 모든 분기에서 approve, reject, no_op 또는 require 계열 결과를 반환해야 한다. approve/reject의 사유는 감사나 재제출 판단의 근거다. require_role과 require_operation은 자원 RID와 역할/operation을, require_team은 팀 이름을 받는다. require_any는 role/operation/team 요구사항 중 하나 충족이라는 OR를 한 정책 내부에서 표현한다.

## 입력을 안전하게 해석한다

공통 입력은 type, author, 선택 onBehalfOf, editors, 내부 metadata, type별 request, sparse diff, referencedResources, createdAt과 now다. diff에는 바뀐 필드만 있으며 제거값은 `<<unset>>`이다. author는 서비스 계정일 수 있고 실제 대리 요청자는 onBehalfOf에 있을 수 있다.

referencedResources의 공통 필드는 rid, name, labels, authorRoles다. 모든 타입에 같은 자원 key가 있지 않으므로 type을 먼저 검사한다. resource map도 일부 타입에서는 비어 있다. Module 관련 module/moduleRelease는 단일 Module 설치에 연결된 변경에만 있으므로 존재 여부를 먼저 확인한다.

| 변경 계열 | 주의할 request와 참조 범위 |
|---|---|
| 엔티티 생성/설정/운영 설정/삭제 | CREATE에는 installation이 없고 UPDATE/DELETE에는 있다. entity 설정과 configOverrides는 다르다. |
| network-security 엔티티 | configOverrides는 version map이 아니라 type/v1 discriminator union이다. egress, HTTPS, TCP, UDP rule 모양도 다르다. |
| 유지보수 override | entity, startTime, endTime, DOWNTIME/NO_DOWNTIME을 검사한다. generic 타입은 product 참조가 없다. |
| 환경 설정/config/속성 | settings, 전체 config, owner/coOwner와 운영 책임 변경을 구분한다. |
| pipeline 생성/변경 | 생성은 pipelineRoot, 변경은 bundlingpipeline, 연결 변경은 transferTarget을 참조한다. |
| 팀/제품 설정 | 팀은 group/user locator의 name과 realm, 제품은 productId와 운영 책임 범위를 다룬다. |
| egress 정책 | data 전체의 address, port와 range, protocol, network routing을 검사한다. |
| 취약점 suppression | CVE, scanner, image 이름/접두사, product, EOSL별로 다른 map/set을 받는다. |
| management override | referencedResources가 없고 name, owner, products와 service locator가 request에 있다. |

## 신뢰와 자동 승인

개발 환경의 모든 변경을 일괄 자동 승인하는 단일 내장 설정은 없다. 변경 타입별 정책의 autoApproveEnvironments를 구성하거나 label과 작성자 역할을 함께 검사한다. 엔티티 생성 정책만 바꿔도 설정 편집이나 namespace/network 보안 변경까지 승인되지는 않는다.

서비스 계정 신뢰는 username 일치만으로 판단하지 않는다. is_author_service_user는 author/onBehalfOf가 서비스 계정인지와 다른 편집자가 없는지도 검사한다. should_auto_approve_service_user는 Apollo 1st-party 자동화의 허용 변경 타입을 내장한다. 기본 정책의 이 호출을 제거하면 자동 workflow를 깨뜨릴 수 있다.

is_trusted_module_request는 신뢰된 Module 요청만 판별한다. 자동 업데이트 승인 모드까지 지키려면 is_trusted_module_update_eligible_for_auto_approval을 쓴다. 후자는 Apollo 생성/다른 편집자 없음, 소유자의 자동 승인 선택, 자동 업데이트 여부, 기존 사용자 config를 덮어쓰지 않음을 함께 확인한다. trusted import도 Apollo가 만든 환경 동기화 요청이고 다른 편집자가 없어야 한다.

특정 Module 자동 승인을 추가할 때 별도 approve 정책 하나만 만들면 기본 정책의 operator 요구가 남는다. 영향을 받는 기존 entity policy마다 우선 분기를 수정해야 한다. 경로 제한에는 diff_only_modifies_paths를 쓰며 *는 한 key, **는 여러 깊이다. egress 자동 승인에서는 data.all로 모든 대상 host/port가 범위 안인지 검사한다.

## 출처

- [Palantir, Auto-approve changes in development environments](https://www.palantir.com/docs/apollo/cel-policies/auto-approving-dev-environments) — 자동 승인은 환경뿐 아니라 변경 타입과 신뢰 작성자로 제한.
- [Palantir, Response types](https://www.palantir.com/docs/apollo/cel-policies/cel-functions) — 결과/조건 함수, 신뢰 자동화와 diff 경로 검사.
- [Palantir, Examples](https://www.palantir.com/docs/apollo/cel-policies/examples) — 정책 AND 결합, Module key guard와 egress 전체 검사.
- [Palantir, Change type API reference](https://www.palantir.com/docs/apollo/cel-policies/input-types) — 변경 타입별 request, referencedResources와 union 구조.
- [Palantir, CEL policies](https://www.palantir.com/docs/apollo/cel-policies/overview) — 개별 변경 평가, 전부 no_op 오류와 공통 입력.
- [Palantir, Change Requests](https://www.palantir.com/docs/apollo/managing-changes/change-requests) — CR 상태, reviewer 조건과 Do not merge label.
- [Palantir, Change Types](https://www.palantir.com/docs/apollo/managing-changes/change-types) — config diff와 기존/신규 설정의 승인 맥락.
- [Palantir, Overview](https://www.palantir.com/docs/apollo/managing-changes/overview) — 수동 운영 변경의 감사와 승인 시스템.
- [Palantir, Required approvers](https://www.palantir.com/docs/apollo/managing-changes/required-approvers) — space별 기본 정책과 관리자 조정.

- [Palantir, cel-policies](https://www.palantir.com/docs/apollo/cel-policies) — 부모 CEL 경로도 개별 변경과 AND 평가 계약을 제공.

- [Palantir, managing-changes](https://www.palantir.com/docs/apollo/managing-changes) — 부모 변경 관리 경로의 감사/승인 체계.

## 관련 문서

- [[Apollo-CLI-Resources-and-Changes]]
- [[Apollo-Access-and-Debugging]]
