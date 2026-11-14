---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-11-14
category: "AI엔지니어링(AIEngineering)"
aliases: ["Vulcan 모델 좌표와 저장 계약"]
---

# Vulcan 모델 좌표와 저장 계약

## 식별과 단위

Vulcan은 CAD mesh(GLB/GLTF/STL/OBJ/PLY/3MF), DXF drawing과 LAS/LAZ point cloud를 변환 없이 Media reference로 렌더링하며 형식은 파일 확장자로 판별한다. Schema는 property 이름이 아니라 vulcan namespace type class로 찾고 required property는 저장 객체에 실제 값도 있어야 한다. 이름에 묶이지 않으므로 property 이름은 자체 Ontology 관례대로 두고, 한 property가 여러 type class를 달아 Vulcan과 다른 앱에 동시에 쓰일 수 있다. CAD object에는 cad_media_reference가 필요하며 Ontology Manager에서 해당 property의 Interaction 탭, Type classes에 kind `vulcan`, name `cad_media_reference`를 추가한다.

Action은 parameter type class 묶음으로 식별되고 Action parameter는 나열된 type class와 data type을 노출해야 Vulcan이 값을 넣는다. annotation과 상위 CAD object를 잇는 Link type은 `cad_object` type class를 달아야 Vulcan이 그 link를 traverse할 수 있고, Create annotation Action도 `cad_object` object reference parameter를 요구한다. 추가 Action parameter에는 Vulcan type class가 필요 없다.

up_axis는 X/Y/Z이며 생략 시 GLB/GLTF는 Y, 나머지 나열 형식은 Z라는 format별 기본값이다. model_unit은 file에 단위가 없는 경우 m/mm 동의어만 처리하고 나머지는 무시한다. GLB/GLTF/3MF는 자체 단위를 읽어 override가 적용되지 않는다고 명시된다. 단위가 없을 때 session Scene units 설정은 reload하면 초기화된다.

## 좌표 직렬화

Measurement는 `[x1,y1,z1,x2,y2,z2,...]`의 평탄한 double 배열이며 연속 구간 거리의 합이다. 두 끝점 직선 거리와 다를 수 있다. Section plane position은 정확히 3개, quaternion은 x/y/z/w 순서 4개다. Annotation attachment와 sphere radius는 model units이며 radius 0은 point marker다. Intent 색은 분류 의미를 강제하지 않는다.

Part transform은 ID와 정확히 16개의 유한 숫자, column-major 4×4 행렬이다. 행 순서로 직렬화하지 않는다. ID 누락이나 잘못된 행렬은 무시될 수 있어 렌더링 성공이 모든 override 적용을 뜻하지 않는다. Part ID는 모든 instance 선택, instance ID는 특정 instance 선택이다.

Part coloring은 instance/assembly ID 배열과 color/opacity/selectedOpacity 중 하나 이상이다. Opacity는 0~1이며 Scene Coloring의 color가 우선해도 configured opacity는 유지된다. Model fallback color는 global fallback보다 우선한다.

## 표시와 영속 변경

Workshop model entry의 object set에서는 첫 객체만 로드한다. 여러 모델은 별도 entry로 구성한다. Model마다 annotation object set을, widget 전체에 measurement와 section plane object set과 primary scenario를 입력한다. Camera target/position은 xyz를 모두 연결하고 zoom과 함께 양방향이며 click xyz는 출력이다. Measurement scene distance는 raw number, unit distance는 표시 단위가 포함된 formatted string(`12.30 mm`)으로 서로 다른 타입이고 인식한 단위가 없으면 `units`로 나온다. Output을 하나 이상 구성해야 measurement 도구에서 보낼 measurement를 고를 수 있다.

Widget 기본값은 Complete mode(조립 모델과 scene tree), Orthographic camera, Orbit controls이며 mode 전환과 part 정보는 켜지고 auto-rotate는 꺼져 있다. Grid mode는 고유 part의 정렬 가능한 grid, Component mode는 선택 component에 집중한다. Sidebar, toolbar, gizmo, context menu와 annotation, mesh styling, measurement, section view, transform, scene coloring 도구도 모두 기본으로 켜져 있어 필요 없는 기능은 끈다.

저장은 Ontology Action이다. Annotation에는 도구가 timestamp를 주지만 measurement/section plane의 timestamp와 모든 객체의 ID/creator는 Action 정의가 채워야 한다. Creator는 제출 사용자로 설정한다. 추가 필수 매개변수도 default나 입력을 제공해야 한다. Action 미지정 시 required parameter type class를 가진 후보를 발견해 고르게 하므로 숨긴 도구 UI가 서버 권한을 제한하는 것은 아니다. Action을 지정하면 저장이 그 Action으로 제한되고 추가 parameter의 default나 입력 필드를 줄 수 있다. 저장한 annotation, measurement, section plane은 Ontology 객체라 alert와 dashboard 같은 다른 워크플로의 입력이 될 수 있다.

Schema는 release마다 바뀔 수 있다고 원문이 경고한다. 실제 모델 렌더링, 물리 치수 측정과 Action 저장은 수행하지 않았다.

## 출처

- [Palantir vulcan, vulcan](https://www.palantir.com/docs/foundry/vulcan)
- [Palantir vulcan, overview](https://www.palantir.com/docs/foundry/vulcan/overview)
- [Palantir vulcan, schema-reference](https://www.palantir.com/docs/foundry/vulcan/schema-reference)
- [Palantir vulcan, tool-overview](https://www.palantir.com/docs/foundry/vulcan/tool-overview)
- [Palantir vulcan, widget](https://www.palantir.com/docs/foundry/vulcan/widget)

## 관련 문서

- [[Palantir-Spatial-Models]]
