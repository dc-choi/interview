---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Solution Designer 표현과 실제 리소스의 경계"]
---

# Solution Designer 표현과 실제 리소스의 경계

## 표현의 수준

Solution Designer는 architecture 표현 도구다. Concept node는 추상적인 단계, component node는 제품/도구, resource node는 실제 Foundry RID와 연결된 항목이다. 세 수준이 한 diagram에 섞일 수 있으므로 node가 있다고 실제 리소스가 생성됐다고 보고하지 않는다. Generic object node와 기존 ontology object type 링크도 다르다.

Edge는 설계자가 표현한 data flow/dependency/relationship이다. 방향 handle, label, validity shading과 animation은 운영 데이터의 실제 흐름이나 권한/정합성을 보증하지 않는다. Group은 논리적 container이며 security boundary를 자동 생성하지 않는다. Resource unlink/node delete는 diagram 표현 변경이고 원본 리소스 삭제와 다르다.

Resource RID link는 native application으로 이동하는 연결이며 custom title과 식별자가 다를 수 있다. Object traversal은 정의된 ontology link type을 diagram에 추가하고 node traversal은 diagram 내 연결을 따라간다. 실제 object instance query 결과와 구분한다.

Reference library와 Data Lineage import는 설계의 시작점이며 import한 시점 이후 실제 배포 상태와 차이가 생길 수 있다. 원본과 설계의 일대일 상세 대응은 필수가 아니다. 확보한 firstDiagram 한국어 문서는 검증되지 않은 과거 자동 번역이고 current tutorial은 component/resource picker UI를 사용하므로 이전 자동추가 메뉴와 혼합하지 않는다.

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
