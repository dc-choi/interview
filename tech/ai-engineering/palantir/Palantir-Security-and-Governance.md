---
tags: [palantir, foundry, security, authorization, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 보안과 거버넌스", "Foundry Security"]
---

# Palantir 보안과 거버넌스

보안 모델은 누가 어떤 데이터와 행동에 접근할 수 있는지 정하고 집행하는 계약이다. 정책 작성, 읽기 시점 차단과 읽은 데이터의 후속 이용은 다른 경계다. 일반 접근 제어 개념은 [[Access-Control-Models|RBAC, ABAC와 정책 집행]]에서 다룬다.

2026-10-16 공식 문서 대조 기준이다. 실제 enrollment의 정책 설정, API 거부, 외부 전송과 감사 로그를 시험한 기록은 아니다.

## 플랫폼 통제와 고객 책임을 구분한다

Foundry는 인증과 인가, 암호화와 감사 등 플랫폼 보안 기능을 제공한다. 고객은 업로드할 데이터의 적합성, 사용자 신원, 접근 설정과 고객 앱을 관리한다. 관리형 인프라의 보호 기능이 업무별 최소 권한이나 규제 준수를 자동으로 완성하지는 않는다. ([Security overview](https://www.palantir.com/docs/foundry/security/overview), [Shared responsibility](https://www.palantir.com/docs/foundry/security/shared-security-responsibility-model))

예를 들어 플랫폼의 암호화와 MFA 제공 여부, 사내 사용자의 올바른 그룹 배정 여부, 고객 앱의 로그에 민감 정보가 남는지는 각각 확인할 대상이다.

## 스키마 접근과 데이터 접근은 별개다

Object type, link type과 action type은 스키마 자원이고, 실제 primary key와 property 값은 object와 link 데이터다. 스키마를 보는 권한이 데이터 전체를 읽는 권한은 아니다. ([Object permissioning](https://www.palantir.com/docs/foundry/object-permissioning/overview))

프로젝트 기반 권한 모델은 Ontology 자원을 Compass project에 저장해 관리한다. 새 Ontology와 기존 Ontology의 활성화/마이그레이션 상태를 구분해야 한다. 객체를 읽으려면 object type View와 데이터 접근이 필요하고, 데이터 접근의 근거는 설정에 따라 달라진다. ([Ontology permissions](https://www.palantir.com/docs/foundry/object-permissioning/ontology-permissions))

| 데이터 보안 방식 | 객체 접근의 근거 |
|---|---|
| Object/property security policies | Object type에 설정한 정책. Backing datasource 권한과 독립 |
| Data source policies | Backing datasource의 접근 권한 |
| Backing datasource 없는 object type | 프로젝트 기반 관리와 object security policy 필요 |

따라서 모든 객체에 backing datasource View가 필수라고 일반화하지 않는다. 반대로 type Viewer만 부여하고 실제 데이터 접근이 열렸다고 판단하지 않는다.

## 전파되는 통제와 읽기 필터를 구분한다

2026년 4월 object/property security GA는 batch/stream backing 양쪽에서 source와 독립된 row/column 정책을 구성하고 조합해 cell 접근을 제한했다. Property 정책은 먼저 object 정책을 만든 뒤 primary key 외의 property에 설정하는 계약이었다. Ontology 밖에서 쓰지 않는 Restricted View의 대체를 검토할 수 있지만 외부 consumer가 있으면 그 접근 경로도 유지/이전해야 한다.

2025년 12월 project-based permission 도입에서 새 resource의 project 저장을 요구하는 toggle은 기존 resource를 이동하지 않았다. 기존 migration은 resource Owner와 target project Editor가 필요했다. 당시 default Ontology/CBAC 미지원은 역사적 rollout 조건이다. 당시 예시의 type+datasource Viewer 조건은 source-policy 경로이며 현재의 object/property security policy까지 일반화하지 않는다.

Mandatory controls에는 markings, Classification-based Access Controls(CBAC)와 organization 경계가 있다. 이들은 데이터의 파생 흐름에 따라 전파된다. Discretionary controls에는 자원별 role과 restricted view, object/property 정책의 세부 행/열 필터가 있다. 두 통제의 차이는 필터 정밀도만이 아니라 읽은 뒤에도 제약이 이어지는지에 있다. ([Security overview](https://www.palantir.com/docs/foundry/security/overview))

세부 행/열 정책은 실행 사용자가 읽는 범위를 필터링하지만 그 정책이 반환 payload와 함께 전파되지는 않는다. 함수 반환, Action의 목적지 쓰기, OSDK 응답, AIP Logic 모델 문맥과 내보내기에 원래 행/열 정책이 자동으로 붙는다고 가정하지 않는다. 목적지와 후속 경로의 통제를 별도로 설계한다. 같은 정책 안의 mandatory/CBAC 통제는 세부 필터와 구별한다. ([Access control propagation](https://www.palantir.com/docs/foundry/security/access-control-propagation), [Manage object security](https://www.palantir.com/docs/foundry/object-permissioning/managing-object-security))

후속 파생물까지 보호해야 하면 markings 등 전파되는 통제를 함께 선택한다. 다만 Action의 출력 보안은 Action 로직이 정한다. Read/write authorization은 선택 설정이며, read authorization이 없으면 저장/발행 시 declassification 권한 검사 없이 더 낮은 보안으로 쓸 수 있다. 따라서 marking 사용만으로 모든 Action 출력까지 보호된다고 판단하지 않는다. 구체적인 상한/하한과 예외는 [[Palantir-Actions-and-Functions#입력 보호와 출력 보호를 구별한다]]에서 확인한다. ([Read and write authorizations](https://www.palantir.com/docs/foundry/action-types/read-write-authorizations))

## 참조를 숨기는 것과 원본을 보호하는 것은 다르다

Media-reference property의 inherited marking을 source별로 구성하는 경로가 2026년 1월 추가됐다. 참조 property의 inherited marking 선택과 media 원본의 직접 접근 정책을 함께 확인하며 특정 상속을 제거한 것이 원본 marking까지 삭제한다는 뜻으로 해석하지 않는다.

Object property가 media item을 참조해도 그 property의 권한이 media set 원본 권한을 대신하지 않는다. 속성은 보이지 않지만 media set의 직접 읽기 권한으로 파일을 가져올 수 있는 구성이 가능하다. 참조 대상 자원에도 적절한 권한을 설정해야 한다. Object/property 정책은 backing datasource의 직접 접근도 대신 보호하지 않는다. ([Manage object security](https://www.palantir.com/docs/foundry/object-permissioning/managing-object-security))

예를 들어 정비 기록 앱에서 첨부 이미지 속성을 숨겨도 파일 원본 API, 다운로드와 미디어 집합의 직접 접근이 허용되어 있으면 보호 요구를 충족하지 못할 수 있다. 이는 경계 검증 예시다.

## Action 실행은 별도의 권한 검사다

단일 datasource 객체의 편집은 객체를 읽을 수 있고 submission criteria를 통과해야 한다. 다중 datasource 객체의 수정은 수정 대상 property의 기존 값을 볼 수 있는지 검사하며, 보지 못하는 다른 property는 검증 중 null로 나타날 수 있다. 객체 삭제에는 전체 객체를 볼 권한이 필요하다. 생성, 수정, 삭제와 link 변경을 같은 권한 조건으로 묶지 않는다. ([Permission checks for Actions](https://www.palantir.com/docs/foundry/object-edits/permission-checks))

Action type의 정의를 편집하는 권한과 해당 Action을 제출하는 권한도 구분한다. 제출 조건의 개념은 [[Ontology-Knowledge-Graph]]에서 다룬다.

## 정책 존재와 실행 강제를 나눠 확인한다

아래는 실행 검증 기준이며 현재 환경에서 통과한 결과가 아니다.

| 확인 단계 | 확인할 증거 |
|---|---|
| 정의 | 정책, project role, marking과 대상 자원이 실제로 연결돼 있음 |
| 읽기 | 권한 없는 사용자의 object와 property가 API에서도 차단됨 |
| 쓰기 | 제출 조건 위반, 부분 접근과 삭제 권한 부족이 실행에서 거부됨 |
| 후속 이용 | 함수 반환, 모델 입력, 로그와 export의 목적지 보호 범위 |
| 우회 경로 | Backing dataset, media set과 외부 API의 직접 접근 결과 |
| 운영 | 정책 변경, 접근 철회와 실행 이력이 감사 근거에 남음 |

정책 화면과 Check access 같은 진단은 구성을 파악하는 근거다. 실제 실행 사용자, 호출 경로와 결과를 대조해야 실행 강제를 확인할 수 있다. 외부 모델 공유 자격 증명의 권한 위임은 [[Palantir-Data-and-Model-Integration]]에서 다룬다.

2026년 5월 CBAC Ontology의 project 저장 지원은 2025년 12월/2026년 1월의 미지원 조건을 확장했다. File 생성 때 project 최대 이하 classification이 필요하고 미지정이면 object materialization이 실패한다고 안내했다. 기존 Ontology는 수동 enable/migration이며 migration만으로 datasource 접근권은 바뀌지 않는다. 현재 data-security mode별 읽기 조건은 위 표와 전용 문서를 따른다.

Ontology Manager의 policy test는 user/object를 골라 property visibility를 확인한다. 2026년 6월 도입은 source object 권한에 의존하는 derived property를 시험하지 못했고, 검사자가 policy 참조 org의 member/admin이 아니면 guest/secondary membership을 반영하지 못해 warning을 냈다. 진단의 권한/coverage 한계를 실제 사용자 API 테스트로 보완한다.

## 출처

- [Palantir, Security and governance](https://www.palantir.com/docs/foundry/security/overview)
- [Palantir, Shared security responsibility model](https://www.palantir.com/docs/foundry/security/shared-security-responsibility-model)
- [Palantir, Object permissioning](https://www.palantir.com/docs/foundry/object-permissioning/overview)
- [Palantir, Ontology permissions](https://www.palantir.com/docs/foundry/object-permissioning/ontology-permissions)
- [Palantir, Access control propagation](https://www.palantir.com/docs/foundry/security/access-control-propagation)
- [Palantir, Manage object security](https://www.palantir.com/docs/foundry/object-permissioning/managing-object-security)
- [Palantir, Read and write authorizations](https://www.palantir.com/docs/foundry/action-types/read-write-authorizations)
- [Palantir, Permission checks when applying an Action](https://www.palantir.com/docs/foundry/object-edits/permission-checks)
- [Palantir, December 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-12)
- [Palantir, January 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-01)
- [Palantir, April 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-04)
- [Palantir, May 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-05)
- [Palantir, June 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-06)

## 관련 문서

- [[Access-Control-Models|접근 제어와 정책 집행]]
- [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]]
- [[Palantir-Data-and-Model-Integration|데이터와 모델 통합]]
- [[Palantir-Object-Backend|객체 색인과 저장]]
- [[Palantir-Foundry-Administration|조직, 네트워크와 실행 환경 관리]]
- [[Palantir-Logs-and-Usage-Governance|로그의 별도 보호와 전달 한계]]
