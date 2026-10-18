---
tags: [palantir, compass, resources, discovery]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Compass 발견, 공유와 resource 수명"]
---

# Compass 발견과 resource 수명

Compass는 resource/Project/folder를 관리하는 filesystem이다. Project는 사람, 목적과 권한을 함께 묶고 Files/Autosaved/References/Trash 등으로 resource를 나눈다. 개인 Your files와 Project autosave를 같은 private 공간으로 취급하지 않는다.

## 발견과 접근 허가는 별도다

Quicksearch의 Jump-to는 personalized title 검색이며 full results는 description/column/path/tag/creator 등 metadata를 검색한다. Discover 권한만 있으면 Request access로 이어지고 권한 없는 자료는 보이지 않을 수 있다. 검색 0건으로 resource 부재를 확정하지 않는다.

Object instance 검색은 최대 250개 object type 범위다. Active/prominent부터 normal/experimental 순으로 우선하며 hidden/deprecated type은 제외된다. 특정 객체를 못 찾으면 Object Explorer에서 type/group을 명시한다. Full platform search라는 UI를 모든 instance 전수 검색으로 읽지 않는다.

Catalog collection/description의 가시성과 포함 file의 실제 접근은 다르다. Collection은 curated 후보 집합이며 모든 허용 dataset이 반드시 포함되는 것은 아니다. Resource Promoted는 search boost/checkmark/quick filter를 제공하는 상태다. Editor 이상과 space Resource Curator를 요구하며, Carbon workspace의 organization promotion과 다른 설정이다.

Tag는 category별 Org 가시성을 가진 검색 metadata이며 security control이 아니다. 적용에는 Apply tags workflow가 필요하다. Category/tag 삭제는 모든 resource의 metadata에서 제거되며 undo할 수 없다. 민감정보 보호를 tag filter에 의존하지 않는다.

## Project 생성과 공유

Project를 만들 때 space와 organization 기본 role을 확인한다. Space 설정이 초기 role을 정할 수 있다. Resource Share와 link sharing은 underlying mandatory control/Org/Marking을 모두 없애는 의미로 읽지 않는다. Cross-Project move는 별도 권한을 요구하며 보통 resource Owner가 수행한다.

Project cover page만 볼 수 있으면 metadata도 RID/location/space로 제한될 수 있다. Files 내용, documentation, Marketplace installation/classification, access와 resource queue는 권한/기능에 따라 다르게 보인다. Activity는 최근 한 달 view이며 영구 audit log 대체가 아니다.

Folder documentation은 Markdown README 또는 Add description으로 관리한다. Inline HTML은 disabled이고 기본적으로 Foundry-hosted image만 렌더링한다. RID link는 이름/icon을 해석한다. 기존 README resource가 자동 render되지 않는 경우의 재upload 안내를 적용할 때 원본과 연결을 보존한다.

## Autosave와 reference는 목적이 다르다

기존 resource에서 만든 autosaved file은 원래 folder의 권한을 상속하고 작성자는 Owner다. 같은 folder/Project 접근자에게 보일 수 있으며 직접 공유 전에는 수동 Save가 필요하다. Autosaved라는 이름이 누구에게도 보이지 않는 draft를 보장하지 않는다.

File reference는 다른 Project의 data/resource를 사용하는 명시 경계이며 external reference는 build가 쓰는 package 등이다. Editor가 file reference를 더할 수 있지만 source/destination import permission과 실제 data 접근 자격을 별도로 확인한다. Reference 제거는 source 삭제와 다르다.

## Trash 상태와 검색 index는 시간차가 있다

Move to trash는 즉시 상태가 바뀌어도 Trash 목록의 search index 반영은 늦을 수 있다. Activity 또는 direct resource의 In trash로 확인한다. 목록에서 안 보인다고 실패/삭제 취소로 단정하지 않는다. Restore는 기존 위치와 권한을 복구하고 permanent delete는 별도 결정이다.

업로드 전 format/header/type과 목적을 확인하고 media set, schemaless dataset, 원확장자 raw resource를 선택한다. Media set transactionless는 item별 즉시 반영/실패와 overwrite/delete, transactional은 동시 open transaction 하나와 transaction당 최대 10,000파일, 실패 시 미commit을 제공한다. Snapshot/incremental build 요구와 맞춘다.

## 출처

- [Palantir, Compass](https://www.palantir.com/docs/foundry/compass)
- [Palantir, Create a Project](https://www.palantir.com/docs/foundry/compass/create-a-project)
- [Palantir, Data Catalog](https://www.palantir.com/docs/foundry/compass/data-catalog)
- [Palantir, Manually upload data](https://www.palantir.com/docs/foundry/compass/manually-upload-data)
- [Palantir, Move and share resources](https://www.palantir.com/docs/foundry/compass/move-and-share-resources)
- [Palantir, Quicksearch](https://www.palantir.com/docs/foundry/compass/quicksearch)
- [Palantir, Resource status](https://www.palantir.com/docs/foundry/compass/resource-status)
- [Palantir, Tags](https://www.palantir.com/docs/foundry/compass/tags)
- [Palantir, Project details panel](https://www.palantir.com/docs/foundry/compass/use-project-details-panel)
- [Palantir, Project navigation panel](https://www.palantir.com/docs/foundry/compass/use-project-navigation-panel)

## 관련 문서

- [[Palantir-Carbon-Workspace-and-Access|Carbon promotion]]
- [[Palantir-Pipeline-Projects-and-Releases|Project 출력 계약]]
- [[Palantir-Media-Extraction-and-Evidence|Media와 파생물]]
