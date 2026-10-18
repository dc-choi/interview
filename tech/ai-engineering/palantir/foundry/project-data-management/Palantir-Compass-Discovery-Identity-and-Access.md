---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Compass 검색, 식별자와 접근 경계"]
---

# Compass 검색, 식별자와 접근 경계

## 발견과 접근의 구분

Compass는 project/resource/folder를 조직하는 filesystem이다. Project는 협업 목적과 보안의 경계이며 Your files/Shared with you/portfolio는 탐색 진입점이다. Data Catalog는 curated collection이며 collection 설명을 볼 수 있어도 개별 file 접근은 공유 여부에 달려 있다. Curated badge는 용도/선별의 표시이지 데이터 정확성 또는 보안 승인 증명이 아니다.

Tags는 구조화된 검색 metadata이며 보안을 추가하거나 암시하지 않는다. Tag category의 Organization visibility와 resource의 data 권한은 별개다. Tag 적용에는 전용 workflow 권한이 필요하고 tag/category 삭제는 모든 resource에서 제거되며 undo할 수 없다고 설명한다.

Project overview의 RID는 read-only 식별자다. Cover page만 볼 수 있는 사용자는 Project 자체 RID/location/space만 제한적으로 볼 수 있다. Definition/description 발견과 내용 열람을 구분한다. Access panel은 Owner의 marking/default/additional role 관리와 Viewer/Editor의 현황 확인이 다르다.

프로젝트 생성 시 space와 default Organization role을 정하며 space 설정의 기본값을 확인해야 한다. 다른 project로 move할 때 cross-project permission이 추가로 필요하고 보통 resource Owner만 project 밖으로 옮길 수 있다. Share link 활성화는 실제 보안 설정 변경이며 단순 URL 복사와 다르다.

원본 prefix root는 중국어 자동 번역의 이전 Projects 개요이고 overview URL은 현재 Compass 개요다. 과거 project catalog 메뉴와 현재 pinned resource/References 구성을 동일한 UI로 합치지 않는다.

## 출처

- [Palantir projects, projects](https://palantir.com/docs/zh/foundry/projects/)
- [Palantir projects, add-documentation](https://www.palantir.com/docs/foundry/projects/add-documentation)
- [Palantir projects, create](https://www.palantir.com/docs/foundry/projects/create)
- [Palantir projects, data-catalog](https://www.palantir.com/docs/foundry/projects/data-catalog)
- [Palantir projects, manually-upload-data](https://www.palantir.com/docs/foundry/projects/manually-upload-data)
- [Palantir projects, move-and-share-resources](https://www.palantir.com/docs/foundry/projects/move-and-share-resources)
- [Palantir projects, overview](https://www.palantir.com/docs/foundry/projects/overview)
- [Palantir projects, tags](https://www.palantir.com/docs/foundry/projects/tags)
- [Palantir projects, use-project-details-panel](https://www.palantir.com/docs/foundry/projects/use-project-details-panel)
- [Palantir projects, use-project-navigation-panel](https://www.palantir.com/docs/foundry/projects/use-project-navigation-panel)

## 관련 문서

- [[Palantir-Project-Data-Management]]
