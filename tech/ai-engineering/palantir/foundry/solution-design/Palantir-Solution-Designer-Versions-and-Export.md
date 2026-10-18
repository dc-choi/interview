---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Solution Designer version과 export 경계"]
---

# Solution Designer version과 export 경계

## 저장과 충돌

Auto-save와 manual save마다 timestamp version이 생긴다. 과거 version restore는 새 version을 생성하고 기존 이력을 지우지 않는다. Auto-save indicator, 수동 save 성공과 서버 충돌을 구분한다. 동시편집 충돌의 Keep your changes는 서버 변경을 덮고 Keep server changes는 로컬 변경을 버리므로 단순 새로고침으로 해결됐다고 판단하지 않는다.

Network/권한 실패 시 JSON backup이 도움이 되지만 export 역시 saved diagram과 edit permission을 요구한다. Read-only viewer는 export할 수 없다. 따라서 편집권한이 없는 사용자의 저장 실패 상황에 무조건 export를 약속하지 않는다.

## 화면 모드와 권한

viewer=true는 pan이 켜진 read-only UI로 열며 focusRID는 특정 resource node로 이동한다. URL parameter와 canvas lock은 실제 resource ACL을 대체하지 않는다. 잠긴 diagram을 해제하는 것과 edit permission 획득은 다르다. Graph setting은 diagram별로 저장된다.

JSON은 diagram 구조를 보존하는 import/export 형식이고 PNG는2배 zoom으로 생성한 시각 자료다. Selected node export는 전체 architecture가 아니며 큰 diagram은 browser render 한계가 있다. PDF는 browser에서 생성하므로 긴 Critic 대화나 memory 부족으로 실패할 수 있다.

JSON import는 Solution Designer가 기대하는 형식이어야 한다. Export를 공유할 때 diagram/설명에 민감 정보가 포함될 수 있으며 원래 resource link의 접근 권한이 외부 파일을 보호하는 것은 아니다. 실제 save/export/import는 수행하지 않았다.

## 출처

- [Palantir solution-designer, solution-designer](https://www.palantir.com/docs/foundry/solution-designer)
- [Palantir solution-designer, aip-architect](https://www.palantir.com/docs/foundry/solution-designer/aip-architect)
- [Palantir solution-designer, aip-critic](https://www.palantir.com/docs/foundry/solution-designer/aip-critic)
- [Palantir solution-designer, diagrams](https://www.palantir.com/docs/foundry/solution-designer/diagrams)
- [Palantir solution-designer, firstDiagram](https://palantir.com/docs/kr/foundry/solution-designer/firstDiagram/)
- [Palantir solution-designer, navigation](https://www.palantir.com/docs/foundry/solution-designer/navigation)
- [Palantir solution-designer, overview](https://www.palantir.com/docs/foundry/solution-designer/overview)
- [Palantir solution-designer, troubleshooting](https://www.palantir.com/docs/foundry/solution-designer/troubleshooting)
- [Palantir solution-designer, tutorial-create-your-first-diagram](https://www.palantir.com/docs/foundry/solution-designer/tutorial-create-your-first-diagram)

## 관련 문서

- [[Palantir-Solution-Design]]
