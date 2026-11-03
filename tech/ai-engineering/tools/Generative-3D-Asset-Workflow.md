---
tags: [ai, generative-ai, 3d, workflow, rigging]
status: done
verified_at: 2026-11-04
category: "AI엔지니어링(AIEngineering)"
aliases: ["생성형 3D 자산 제작", "Generative 3D Asset Workflow", "VARCO 3D"]
---

# 생성형 3D 자산 제작

생성형 3D 제작은 이미지에서 모델을 얻는 단계에 더해 메시 정리, 재질, 리깅, 애니메이션과 최종 장면 검수를 연결하는 작업이다. 생성 성공과 프로젝트에서 사용할 수 있는 자산의 완성을 구분한다. 아래 제품 기능은 2026-11-04 확인한 VARCO 공식 자료를 기준으로 한다.

## 장면을 배치 가능한 자산으로 나눈다

복잡한 장면을 한 번에 모델로 만들면 건물과 캐릭터, 소품이 하나로 합쳐질 수 있다. 개별 배치와 수정이 필요하면 요소별 이미지를 준비하고 각각 3D 자산을 만든 뒤 장면에서 조립한다. 이 방식은 특정 템플릿의 자동 분리 정확도를 보장하는 것이 아니라, 수정과 재사용의 단위를 정하는 제작 방식이다.

## 제작 단계를 노드로 연결한다

VARCO의 Custom Workflow는 2026-10-12 Flow로 이름이 바뀌었다. 입력을 보관하는 노드와 생성 작업을 하는 노드를 연결해 앞 단계 출력을 다음 단계 입력으로 보낸다.

| 단계 | 역할 | 다음 단계 전 확인 제안 |
|---|---|---|
| 이미지 준비 | 직접 올리거나 텍스트에서 후보 생성 | 필요한 물체와 형태가 있는가 |
| 3D 생성 | 이미지에서 모델 생성 | 여러 방향에서 형태가 맞는가 |
| Remesh | 목표 폴리곤 수와 Tri/Quad에 맞춰 메시 재구성 | 실루엣과 후속 편집에 맞는가 |
| Texture/PBR | 표면 색상과 거칠기, 금속성 등 재질 처리 | 형태 오류를 재질로 가리고 있지 않은가 |
| Rig/Animate | 골격을 만들고 동작 적용 | 관절과 변형이 자연스러운가 |
| Export | 최종 도구로 자산 전달 | 대상 장면에서 실제로 읽히고 움직이는가 |

필수 입력과 참고 입력은 역할이 다르다. Generate 3D에는 이미지, Remesh와 PBR에는 3D 모델이 필요하다. 연결된 필수 입력이 여러 값을 주면 후속 노드가 값마다 실행될 수 있다. 후보 수가 늘어날 때 실행 횟수도 확인한다. 참고 입력은 보조 지침이며 같은 방식으로 주 실행 수를 정하지 않는다.

모든 단계를 무조건 한 번에 실행하기보다 이미지 후보를 검토한 뒤 필요한 3D 생성만 이어가는 방식을 검토한다(운영 제안). 노드 연결 자체가 출력 품질을 검사해 주는 것은 아니다.

## 형태와 텍스처를 따로 검토한다

Mesh-only 생성으로 형태를 먼저 정하고, 3D Studio의 Generate Texture에서 나중에 텍스처를 추가할 수 있다. 형태용 이미지와 텍스처용 참조 이미지를 구분해 두면 어느 입력을 바꿔야 할지 찾기 쉽다.

Remesh는 메시 구조를 바꾸는 작업이며 PBR 처리는 재질 정보를 다루는 작업이다. 재질을 고쳤다는 사실로 폴리곤 구조가 개선됐다고 판단하지 않는다. 같은 각도와 조명에서 전후를 비교하고, 최종 엔진에서도 결과를 확인한다(검수 제안).

## 자동 리깅 뒤에는 변형을 검사한다

Rig Editor는 Pose, Skeleton, Weights 모드를 나눈다. Pose에서 관절을 움직여 이상을 찾고, 회전 중심이나 부모 관계 문제는 Skeleton에서, 엉뚱한 부위가 따라 움직이는 문제는 Weights에서 수정한다. 수정 뒤 여러 방향으로 다시 움직여 본다.

표준 관절의 이름을 바꾸거나 삭제하면 기존 애니메이션의 이름 매핑이 깨질 수 있다. 부모 관계를 바꾸면 이름이 같아도 변환 전파와 자세가 달라질 수 있다. 편집 완료와 애니메이션 호환성을 따로 확인한다.

Apply Rig Edit는 원본을 유지하고 새 자산을 만든다. 테스트 자세는 새 rest pose로 저장하지 않으며, 적용되는 것은 rest pose에서의 골격과 skin weight 편집이다. 공식 안내상 Rig Editor는 데스크톱에서 사용하고, Free 플랜은 자세 검토만 가능하며 Skeleton 편집, Weight Painting과 편집 적용에는 제한이 있다.

## 에이전트 연결과 제작 완료의 경계

공식 릴리스는 MCP로 에이전트가 생성, Remesh, Texture, Rig, Animate와 Export의 흐름을 구성하고 실행하는 경로를 설명한다. 연결 지원은 이 문서 작성 시 실제 연동을 시험했다는 뜻이 아니다.

적용 제안: 생성할 자산 수, 후속 실행 범위와 내보낼 결과를 정하고 중간 출력부터 검토한다. 완성도, 제작 시간 단축과 경쟁 제품 대비 우위는 동일한 입력과 검수 기준으로 별도 비교한다. 프로모션과 요금은 기능 설명에서 추정하지 않고 이용 시점에 확인한다.

## 출처

- [Understanding Nodes: Input Nodes and Action Nodes — VARCO](https://www.varco.ai/home/en/blog/2026-07-06-understanding-nodes-input-nodes-and-action-nodes)
- [From 3D Model Generation to Cinematic Scenes in Blender — VARCO](https://www.varco.ai/home/en/blog/ai-3d-blender-varco-3d)
- [Building a Monster Village with AI 3D Modeling — VARCO](https://www.varco.ai/home/en/blog/ai-3d-varco-3d)
- [The Full 3D Pipeline, Connected — VARCO 3D](https://3d.varco.ai/docs/release-notes/2026-07-27-the-full-3d-pipeline-connected)
- [Generate the Shape First, Texture It Later — VARCO 3D](https://3d.varco.ai/docs/release-notes/2026-08-27-generate-the-shape-first-texture-it-later)
- [How to Use VARCO 3D Rig Editor — VARCO 3D](https://3d.varco.ai/docs/blog/2026-08-10-how-to-use-varco-3d-rig-editor)
- [Release Notes — VARCO 3D](https://3d.varco.ai/docs/release-notes) — 2026-10-12 Flow 명칭 변경 대조

## 관련 문서

- [[Generative-Product-Image-Workflow|생성형 상품 이미지 워크플로우]]
- [[Generative-Video-Production-Workflow|생성형 영상 제작 워크플로]]
- [[MCP|Model Context Protocol]]
