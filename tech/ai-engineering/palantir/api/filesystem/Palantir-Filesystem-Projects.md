---
tags: [palantir, foundry, api, filesystem, project]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Project 생성, Template와 외부 참조

Project는 관련 resource의 협업 경계다. 일반 폴더 생성, Project 생성과 template 적용은 각각 입력과 권한이 다르다. Organization과 역할 제약은 [[Palantir-Filesystem-Access]]와 함께 확인한다.

## 직접 생성은 관리 가능한 소유자가 필요하다

`POST /api/v2/filesystem/projects/create`의 displayName과 spaceRid는 필수다. description, roleGrants, defaultRoles, organizationRids와 resourceLevelRoleGrantsAllowed를 추가할 수 있다. displayName은 Space 안에서 유일해야 하고 `/`를 포함할 수 없다.

OAuth2 앱은 `api:filesystem-write`를 요청해야 한다. 이 endpoint를 사용하는 third-party application은 Ontology SDK와 연결할 수 없다. SDK 연결은 작업 범위를 특정 Project들로 제한하므로, 앱의 Resources 설정에서 Ontology SDK를 쓰지 않는 옵션을 선택하라고 명시한다. scope만 추가하면 해결된다고 단정하지 않는다.

roleGrants는 Role ID에서 user/group principal 배열로 매핑한다. 생성에 쓰는 principal은 ID와 USER/GROUP type을 모두 갖는다. defaultRoles와 roleGrants의 Role ID는 해당 Space의 Project role set에 실제로 있어야 한다.

생성 결과에 owner-like role을 받은 principal이 하나도 없으면 `CreateProjectNoOwnerLikeRoleGrant`다. owner-like의 기준은 `compass:edit-project` operation이며 기본 role set에서는 통상 `compass:manage`다. 표시 이름 Owner를 문자열로 검사하는 것과 다르다.

resourceLevelRoleGrantsAllowed를 생략하면 true다. 응답에는 실제 설정값을 포함한다. 사용자의 Space에서 Project 생성 자체가 지원되지 않을 수도 있다. 이름 충돌, 없는 Space/Organization, Space에 없는 organization marking과 생성 권한 오류도 구분한다.

`GET /api/v2/filesystem/projects/{projectRid}`는 `api:filesystem-read`로 Project 메타데이터와 resourceLevelRoleGrantsAllowed를 읽는다. 반환 성공이 해당 Project의 모든 하위 resource 접근을 뜻하지 않는다.

## Template는 고정값과 사용자 입력을 구별한다

`POST /api/v2/filesystem/projects/createFromTemplate`은 필수 templateRid와 optional variableValues, defaultRoles, organizationRids, projectDescription을 받는다. variableValues는 template variable ID에서 문자열 값의 map이다. template에 정의하지 않은 variable, 빠진 값, 허용하지 않은 enum option은 각각 오류다.

optional로 보이는 필드도 template 설정에 따라 조건부 규칙이 있다. description이 미설정이면 값을 넣어야 하지만 고정 description에 값을 넣으면 오류다. Organization/default role도 suggested이면 요청 값이 필요하고 fixed이면 덮어쓰면 안 된다. schema의 required flag만으로 이 조건을 대체하지 않는다.

template은 group과 marking 생성도 수반할 수 있다. group 생성/부모 group 추가 권한, 기존/새 group 이름 충돌, marking 이름 충돌, 유효하지 않은 principal ID를 확인한다. Project create 권한 하나가 모든 하위 작업을 포괄한다고 가정하지 않는다. default role은 Space의 role set에 속해야 하고 owner-like principal도 보장해야 한다.

명세는 Project를 응답하며 별도 비동기 job/polling 계약을 제공하지 않는다. 일부 작업 뒤 실패했을 때의 원자성이나 신규 create 재시도의 중복 방지는 명시되어 있지 않다.

## Reference는 외부 resource의 프로젝트 내 import다

`/api/v2/filesystem/projects/{projectRid}/references` 아래에서 GET list, POST `/add`, POST `/remove`를 사용한다. add/remove는 filesystem-write, list는 filesystem-read scope다.

add의 resources는 `filesystem` 또는 `external` union이다. filesystem은 다른 Project의 resourceRid를 참조한다. external은 filesystem 밖의 Spark profile/LLM model 같은 resourceRid와 프로젝트 내 식별 label인 importName이 필요하다. 외부 웹 URL을 가져오는 기능이라는 뜻이 아니다.

list의 referenceType은 EXTERNAL/FILESYSTEM으로 필터링하며 생략하면 모두 반환한다. 응답은 실제 reference와 importedAt/importedBy를 담고, external name은 사용자가 지정한 label, filesystem name은 참조 resource의 displayName이다. pageToken/pageSize와 nextPageToken으로 이어서 조회한다.

remove의 resources는 filesystem/external RID를 모두 받을 수 있다. 원본 삭제와 Project 참조 제거를 구별한다. malformed RID, reference type 불일치나 참조 불가 대상은 `InvalidResourceReference`, 유효하지 않은 Project RID는 `InvalidProject`이며 각각의 권한/존재 오류도 있다.

공개 명세를 대조했으며 실제 Project/template/reference 변경을 수행하지 않았다.

## 출처

- [Palantir, Create Project](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/projects/create-project)
- [Palantir, Get Project](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/projects/get-project)
- [Palantir, Create Project From Template](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/projects/create-project-from-template)
- [Palantir, Add Project Resource References](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/project-resource-references/add-project-resource-references)
- [Palantir, List Project Resource References](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/project-resource-references/list-project-resource-references)
- [Palantir, Remove Project Resource References](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/project-resource-references/remove-project-resource-references)
