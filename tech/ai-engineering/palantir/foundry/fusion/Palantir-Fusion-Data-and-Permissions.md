---
tags: [palantir, foundry, fusion]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Fusion 데이터 조회, 최신성과 권한

Fusion은 Foundry dataset 조회와 spreadsheet 계산, table 제출 및 dataset writeback을 연결한다. dataset을 쓰려면 Lime에 해당 dataset/branch를 index해야 하며 Up-to-date/Syncing/Stale 상태를 확인한다. 새 index가 보이지 않으면 page 또는 indexed datasets 목록을 refresh한다. lookup은 live 조회지만 index의 최신성과 권한이 전제다.

lookup은 단일 결과를 scalar, 여러 결과를 array로 반환하고 lookup_array는 하나여도 array다. distinct/dropdown/sorted/schema variant를 용도에 맞게 선택한다. lookup_array는 global row ordering을 따르고 lookup_sorted는 명시 column과 ASC/DESC를 받는다. lookup_set은 deprecated unordered set이다. dataset path에 branch()를 적용하고 filter 값에는 exact/fuzzy/eq/neq/gt/gte/lt/lte 또는 token-match modifier를 쓴다. fuzzy edit distance는 0,1,2만 지원하며 기본 2다.

Find and use data import와 lookup 집계는 최대 2,000 rows다. sum(lookup(...))도 전체 dataset 합계라고 단정할 수 없다. 더 큰 집계는 Contour 등에서 먼저 계산한 dataset을 index한다. dataset array에는 source column header가 없고 Shift+drag로 cell에 펼칠 수 있다. object dropdown/table은 기본 최대 200 objects이며 RV-backed object는 일반 filter import와 다르다. object가 든 sheet에는 export dataset sync를 추가할 수 없고 반대도 같다.

Auto-update는 source dataset 변경 시 관련 cells를 갱신하고 manual mode는 최신 데이터 적용 여부를 고르게 한다. sheet 공유 대상은 Sources의 모든 dataset read access가 있어야 document를 열 수 있다. snapshot history는 manual/periodic save를 비교/복원한다. Project scoping은 input/output을 같은 project에 두고 cross-project reference를 명시해야 한다.

Lime/OSv1 re-sync는 migration 또는 index 규모 문제로 필요할 수 있다. 진행 중 sync가 끝난 후 dataset Details/Sync Status에서 Lime sync를 수동 실행하고 실패 원인은 job details로 확인한다. 화면 refresh와 데이터 re-index는 다른 복구다.

동일 본문 canonical alias: [overview](https://www.palantir.com/docs/foundry/fusion/overview).

## 출처

- [Palantir, fusion](https://www.palantir.com/docs/foundry/fusion)
- [Palantir, data-updates-edit-history](https://www.palantir.com/docs/foundry/fusion/data-updates-edit-history)
- [Palantir, find-and-use-data](https://www.palantir.com/docs/foundry/fusion/find-and-use-data)
- [Palantir, index-datasets](https://www.palantir.com/docs/foundry/fusion/index-datasets)
- [Palantir, lookup-datasets](https://www.palantir.com/docs/foundry/fusion/lookup-datasets)
- [Palantir, project-scope](https://www.palantir.com/docs/foundry/fusion/project-scope)
- [Palantir, resync-table-dataset](https://www.palantir.com/docs/foundry/fusion/resync-table-dataset)

## 관련 문서

- [[Palantir-Fusion-Editing-and-Templates]]
- [[Palantir-Fusion-Submission-and-Sync]]
