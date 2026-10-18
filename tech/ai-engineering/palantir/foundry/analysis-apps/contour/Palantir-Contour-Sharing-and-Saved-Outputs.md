---
tags: [palantir, foundry, contour]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 분석 공유, dashboard와 저장 결과의 버전

공유한 분석은 이후 편집을 반영한다. Viewer는 분석/project뿐 아니라 join한 source에도 접근할 수 있어야 한다. Row/column 정책은 사용자마다 다른 입력을 보여주지만 export/download/scheduled output에 그대로 전파되지 않으므로 Marking/CBAC를 검토한다.

편집은 사용자 하나, 브라우저 창 하나의 lock으로 보호한다. 다른 편집자가 기다리면 15분 비활성 후 Viewing으로 전환한다. Reload로 다른 변경을 가져온 뒤 편집한다.

Dashboard는 분석당 하나이고 화면의 board 재배치는 실제 계산 순서를 바꾸지 않는다. Chart selection은 원래 path의 downstream에만 전파된다. Parameter/selection override는 사용자별 임시 상태이며 PDF에는 현재 override 상태가 반영된다. Export checkpoint는 사유 요구를 추가할 수 있다. Notepad의 live/static 보고와 legacy Reports의 지원 범위를 구분한다.

## 분석 버전과 dataset build는 다르다

분석의 version selector는 과거 입력으로 path를 다시 계산한다. 그러나 `Save as Dataset`의 build는 분석에서 고른 과거 버전이 아닌 최신 input dataset을 사용한다. 따라서 저장 결과가 과거 분석의 스냅샷이라고 가정하면 안 된다.

분석 로직을 바꾼 뒤에는 path의 Update로 저장 job의 로직도 갱신해야 한다. Dataset preview/Lineage에서 build만 하면 새 데이터는 반영해도 새 분석 로직은 반영하지 않는다. RV를 입력으로 쓰는 path는 Save as Dataset을 지원하지 않는다.

Project-scoped 저장에서는 모든 input이 project 내부 또는 reference여야 하고 output은 analysis와 같은 project에 있어야 한다. 탐색만 할 때는 reference가 필수는 아니다. Import-from/import-to 권한은 scope에 대한 허용이며 원천 데이터 접근을 자동 부여하는 뜻은 아니다.

## 출처

- [Palantir, analysis-share-collaborate](https://www.palantir.com/docs/foundry/contour/analysis-share-collaborate)
- [Palantir, analysis-share-results](https://www.palantir.com/docs/foundry/contour/analysis-share-results)
- [Palantir, change-dataset-version](https://www.palantir.com/docs/foundry/contour/change-dataset-version)
- [Palantir, dashboards-getting-started](https://www.palantir.com/docs/foundry/contour/dashboards-getting-started)
- [Palantir, dashboards-overview](https://www.palantir.com/docs/foundry/contour/dashboards-overview)
- [Palantir, datasets-save](https://www.palantir.com/docs/foundry/contour/datasets-save)
- [Palantir, project-references](https://www.palantir.com/docs/foundry/contour/project-references)

## 관련 문서

- [[Palantir-Contour]]
- [[Palantir-Pipeline-Builder]]
