---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Compass autosave, 참조와 업로드 수명"]
---

# Compass autosave, 참조와 업로드 수명

## 저장과 가시성

Autosaved resource는 원래 folder 권한을 상속하며 생성자가 Owner다. 같은 folder/project 접근자가 볼 수 있으므로 임시/미저장 상태를 개인 비공개로 가정하지 않는다. 별도 sharing 전에 수동 save가 필요하다는 안내와 기존 상속 접근을 구분한다.

File references는 project 밖 리소스를 pipeline/analysis 입력으로 사용하게 하는 경계다. External references는 build에 필요한 code package로 다른 범주다. Reference가 있다는 사실만으로 모든 사용자에게 source data 권한을 부여하지 않는다.

Trash state는 즉시 적용되지만 search-index 기반 목록은 늦게 반영될 수 있다. 직접 resource/folder 또는 Activity로 확인한다. Restore는 이전 위치와 권한을 복구하며 permanent delete는 다른 작업이다. Project Activity는 최근 한 달만 보존하므로 전체 감사 이력으로 간주하지 않는다.

## 업로드의 transaction 경계

Manual upload는 media set(권장), schema 없는 dataset, extension을 유지하는 raw file을 구분한다. Transactionless media write는 item마다 즉시 반영되고 실패도 item 단위이며 snapshot을 지원하지 않는다. Transactional media set은 한 번에 하나의 open transaction과 transaction당 최대10,000file을 가지며 build 실패 시 commit하지 않고 snapshot/incremental을 지원한다. 이 설명을 모든 dataset 형식의 동일한 limit으로 확장하지 않는다.

CSV/TSV/XLS/XLSM/XLSX의 typed dataset upload와 arbitrary file 저장을 구분한다. Header 수, numeric/date type과 승인된 사용 목적을 먼저 확인한다. 화면 preview만으로 parsing/전체행 정합성을 보장하지 않는다.

Folder documentation은 README.md 또는 description으로 만들며 inline HTML이 비활성화되고 기본적으로 Foundry-hosted image만 렌더링한다. 기존 README.md가 자동 in-place rendering으로 전환되지 않는다는 원문 제한이 있다. 문서의 제안된 재업로드/삭제 절차는 여기서 실행하지 않았다.

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
