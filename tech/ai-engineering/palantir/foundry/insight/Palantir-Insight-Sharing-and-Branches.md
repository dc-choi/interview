---
tags: [palantir, foundry, insight]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Insight 저장, 공유와 branch 경계

Workbook Save는 path와 column/chart/map 설정을 파일로 보존한다. Saved workbook의 path를 object set으로 publish하면 다른 앱과 workbook이 재사용한다. Published path는 기본 잠금이며 workbook Edit 사용자가 의도 확인 뒤 해제한다. 변경은 해당 object set을 참조하는 소비자에게 전파된다.

Discoverer는 존재/metadata만, Viewer는 본문과 사본 저장, Editor는 원본 편집/공유 설정, Owner는 보안 포함 전체 관리 권한을 가진다. Link sharing은 선택한 role을 부여하는 별도 경로다. Workbook 접근 허용을 객체 데이터/Action 실행 권한과 같다고 보지 않는다.

## Layout

Layout은 column 순서, visibility와 chart 배치다. 저장 project 권한에 따라 공유된다. 개인 기본값과 everyone 기본값은 다르며 후자는 backing Ontology의 Administrator/Owner 권한이 필요하다. Template 수정은 다른 이용자에게도 영향을 줄 수 있지만 내 workbook만 저장하는 선택도 가능하다. 표시되지 않는 property가 접근 불가라는 뜻은 아니다.

## Global Branching

Branch context는 분석하는 데이터와 실행 Action에 적용된다. Header selector, taskbar 또는 foundry-branch-rid URL parameter로 branch를 선택한다. Workbook 자체는 branchable resource가 아니므로 branch에서 Save/Save as를 할 수 없다.

Branch에서는 layout 저장, object set publish/list 저장, Excel export와 branch 미지원 앱 열기도 막는다. Autosave는 계속돼 reload/navigation 후 진행 중 분석을 복구하지만 파일 저장이나 publish가 완료된 것은 아니다. 실제 변경 작업 전 data/Action branch와 resource 저장 제한을 함께 확인한다.

## 출처

- [Palantir, branching-insight](https://www.palantir.com/docs/foundry/insight/branching-insight)
- [Palantir, create-and-save-layouts](https://www.palantir.com/docs/foundry/insight/create-and-save-layouts)
- [Palantir, save-and-share](https://www.palantir.com/docs/foundry/insight/save-and-share)

## 관련 문서

- [[Palantir-Insight]]
- [[Palantir-Foundry-Development]]
