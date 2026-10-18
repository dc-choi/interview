---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Vulcan 모델 좌표와 저장 계약"]
---

# Vulcan 모델 좌표와 저장 계약

## 식별과 단위

Vulcan은 CAD mesh(GLB/GLTF/STL/OBJ/PLY/3MF), DXF drawing과 LAS/LAZ point cloud를 Media reference로 렌더링한다. Schema는 property 이름이 아니라 vulcan namespace type class로 찾고 required property는 저장 객체에 실제 값도 있어야 한다. CAD object에는 cad_media_reference가 필요하다.

up_axis는 X/Y/Z이며 생략 시 GLB/GLTF는 Y, 나머지 나열 형식은 Z라는 format별 기본값이다. model_unit은 file에 단위가 없는 경우 m/mm 동의어만 처리하고 나머지는 무시한다. GLB/GLTF/3MF는 자체 단위를 읽어 override가 적용되지 않는다고 명시된다. 단위가 없을 때 session Scene units 설정은 reload하면 초기화된다.

## 좌표 직렬화

Measurement는 `[x1,y1,z1,x2,y2,z2,...]`의 평탄한 double 배열이며 연속 구간 거리의 합이다. 두 끝점 직선 거리와 다를 수 있다. Section plane position은 정확히3개, quaternion은 x/y/z/w 순서4개다. Annotation attachment와 sphere radius는 model units이며 radius0은 point marker다. Intent 색은 분류 의미를 강제하지 않는다.

Part transform은 ID와 정확히16개의 유한 숫자, column-major 4×4 행렬이다. 행 순서로 직렬화하지 않는다. ID 누락이나 잘못된 행렬은 무시될 수 있어 렌더링 성공이 모든 override 적용을 뜻하지 않는다. Part ID는 모든 instance 선택, instance ID는 특정 instance 선택이다.

Part coloring은 instance/assembly ID 배열과 color/opacity/selectedOpacity 중 하나 이상이다. Opacity는0~1이며 Scene Coloring의 color가 우선해도 configured opacity는 유지된다. Model fallback color는 global fallback보다 우선한다.

## 표시와 영속 변경

Workshop model entry의 object set에서는 첫 객체만 로드한다. 여러 모델은 별도 entry로 구성한다. Camera target/position은 xyz를 모두 연결하고 양방향이며 click xyz는 출력이다. Measurement scene distance는 raw number, unit distance는 표시 단위가 포함된 formatted string으로 서로 다른 타입이다.

저장은 Ontology Action이다. Annotation에는 도구가 timestamp를 주지만 measurement/section plane의 timestamp와 모든 객체의 ID/creator는 Action 정의가 채워야 한다. Creator는 제출 사용자로 설정한다. 추가 필수 매개변수도 default나 입력을 제공해야 한다. Action 미지정 시 required parameter type class를 가진 후보를 발견해 고르게 하므로 숨긴 도구 UI가 서버 권한을 제한하는 것은 아니다.

Schema는 release마다 바뀔 수 있다고 원문이 경고한다. 실제 모델 렌더링, 물리 치수 측정과 Action 저장은 수행하지 않았다.

## 출처

- [Palantir vulcan, vulcan](https://www.palantir.com/docs/foundry/vulcan)
- [Palantir vulcan, overview](https://www.palantir.com/docs/foundry/vulcan/overview)
- [Palantir vulcan, schema-reference](https://www.palantir.com/docs/foundry/vulcan/schema-reference)
- [Palantir vulcan, tool-overview](https://www.palantir.com/docs/foundry/vulcan/tool-overview)
- [Palantir vulcan, widget](https://www.palantir.com/docs/foundry/vulcan/widget)

## 관련 문서

- [[Palantir-Spatial-Models]]
