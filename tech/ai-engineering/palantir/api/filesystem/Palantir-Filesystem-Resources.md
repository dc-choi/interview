---
tags: [palantir, foundry, api, filesystem, resource]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 리소스 조회, 경로와 삭제 수명주기

Foundry filesystem은 Dataset, Workshop module, Slate application 등 여러 resource와 Folder/Project를 다룬다. 일반 Resource API와 Folder/Project/Space 전용 API는 같은 객체를 항상 같은 방식으로 조회하는 범용 인터페이스가 아니다.

## 계층과 메타데이터

Folder의 type은 `FOLDER`, `PROJECT`, `SPACE`를 구분한다. parentFolderRid는 Project이면 Space RID, Space이면 root folder `ri.compass.main.folder.0`이다. Folder의 projectRid는 Space일 때 없고, Space의 spaceRid는 자신의 RID와 같다.

Resource에는 RID/type, displayName/path, createdBy/updatedBy, createdTime/updatedTime, trashStatus, parent/project/space RID가 있다. description/documentation은 optional이다. type은 RID에서 유도되는 제품 종류다. 이 type만으로 해당 제품의 본문을 읽은 것으로 처리하지 않고 제품별 API를 사용한다.

Resource의 updatedTime은 일반 Folder라면 하위 resource 변경을 포함하지만 최상위 Space/Project는 성능상 child update로 갱신되지 않는다. 이 시각만 감시해 전체 project 변경이 없었다고 결론 낼 수 없다.

## Folder와 Resource 조회

| 작업 | `/api/v2/filesystem` 아래 경로 |
|---|---|
| Folder 생성 | `POST /folders`, parentFolderRid와 displayName 필수 |
| Folder 단건/batch | `GET /folders/{folderRid}`, `POST /folders/getBatch` |
| 바로 아래 자식 | `GET /folders/{folderRid}/children` |
| Resource 단건/batch | `GET /resources/{resourceRid}`, `POST /resources/getBatch` |
| 경로 단건/batch | `GET /resources/getByPath?path=...`, `POST /resources/getByPathBatch` |
| Space 목록 | `GET /spaces` |

Folder 생성은 Project 안에서만 지원하며 같은 parent의 이름 충돌, 유효하지 않은 folder/name과 권한 오류를 처리한다. Folder와 Resource batch는 최대 1,000개다. Folder batch의 data는 folder RID map, Resource batch도 RID map이며 경로 batch는 Resource 목록이다. 요청 배열과 반환 순서를 일대일로 맞추지 않는다.

일반 Resource API는 root folder와 Space를 조회하지 못한다. Resource batch에서는 존재하지 않는 RID, root/Space가 빠진다. path batch는 존재하지 않음, 접근 불가, root/Space를 모두 생략한다. 누락을 삭제 확정으로 해석하지 않는다. Folder API도 root folder 조회를 지원하지 않는다.

절대 path는 resource 이름까지 포함하며 선행 `/`는 optional이다. 구성요소 사이에는 단일 `/`를 사용한다. path 조회는 별도 query parameter라 URL 인코딩을 적용한다. 이동이나 이름 변경 뒤 이전 path를 영구 식별자로 쓰지 않는다. 마지막 문장은 RID와 path의 역할에 따른 연동 설계다.

Folder children은 재귀 탐색 전체 결과가 아니라 바로 아래 자식이다. 기본 및 최대 pageSize는 2,000이다. 다른 list endpoint도 nextPageToken이 있으면 이어서 요청한다. Space 목록은 요청 크기보다 실제 페이지가 작거나 클 수 있으며 nextPageToken 부재로 마지막을 판단한다.

조회는 명시된 경우 `api:filesystem-read`, 생성/삭제는 `api:filesystem-write` scope다. children의 명세에는 scopes가 빈 배열이지만 익명 접근이나 리소스 권한 면제를 의미하지 않는다. 공통 권한 계약은 [[Palantir-API-Client-Contract]]를 따른다.

## 휴지통과 복원은 영구 삭제와 구별한다

`DELETE /resources/{resourceRid}`는 휴지통으로 이동한다. Space, autosaved resource와 hidden resource는 이 작업을 지원하지 않는다. trashStatus는 직접 버린 `DIRECTLY_TRASHED`, 상위가 버려진 `ANCESTOR_TRASHED`, `NOT_TRASHED`를 구별한다.

`POST /resources/{resourceRid}/permanentlyDelete`는 resource가 직접 휴지통에 있어야 한다. 상위 휴지통 상태만으로는 부족하며 `ResourceNotTrashed`가 난다. 이 단계는 복원 가능한 delete와 의미가 다르다.

`POST /resources/{resourceRid}/restore`는 resource와 직접 휴지통에 들어간 조상들을 복원한다고 설명한다. 휴지통 상태가 아니면 무시한다고도 설명하지만 오류에는 `ResourceNotDirectlyTrashed`가 있다. 조상에 의한 trash와 직접 trash의 경계 동작은 실제 응답을 확인하고, 무조건 성공하는 idempotent 복원으로 단정하지 않는다.

이 기록은 공개 명세 확인이며 실제 생성, 삭제나 복원을 수행하지 않았다.

## Space 목록이 알려주는 운영 문맥

Space는 공통 목적과 Ontology를 가진 Project들의 상위 컨테이너다. 응답에는 filesystem ID, 사용량이 귀속될 usageAccountRid, defaultRoleSetId, 접근 Organization 목록이 있다. spaceMavenIdentifier는 설정한 경우에만 존재한다.

deletionPolicyOrganizations의 기본 Last Out 정책은 목록의 마지막 Organization이 삭제될 때 Space와 그 Project도 삭제된다는 설명이다. 이 목록에는 같은 enrollment의 Organization만 들어간다. 일반 resource trash 정책과 혼용하지 않는다.

## 출처

- [Palantir, Resource basics](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resources/resource-basics)
- [Palantir, Create Folder](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/folders/create-folder)
- [Palantir, Get Folders Batch](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/folders/get-folders-batch)
- [Palantir, List Children of Folder](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/folders/list-children-of-folder)
- [Palantir, Get By Path](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resources/get-by-path)
- [Palantir, Get By Path Resources Batch](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resources/get-by-path-resources-batch)
- [Palantir, Get Resources Batch](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resources/get-resources-batch)
- [Palantir, Delete Resource](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resources/delete-resource)
- [Palantir, Permanently Delete Resource](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resources/permanently-delete-resource)
- [Palantir, Restore Resource](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resources/restore-resource)
- [Palantir, List Spaces](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/spaces/list-spaces)
