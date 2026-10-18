---
tags: [palantir, foundry, product-delivery]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Linked products와 workflow 호환성 검증

Automatic link는 upstream output과 downstream input이 **같은 source resource**일 때 만든다. shape가 비슷한 별도 object type만으로 자동 연결하지 않는다. 설치된 upstream의 output을 source로 사용한 경우 installation-based link를 탐지한다. Cross-store link는 downstream store가 upstream store를 참조하는 단방향 설정이며 target store link-to-local-marketplace가 필요하고 기본 Viewer에 준다.

수동 link는 compatible output을 직접 mapping한다. 같은 upstream의 자동 link를 대체하지만 자동으로 mapping이 진화하지 않으므로 추가/삭제를 직접 유지한다. upstream output 변경 후 downstream을 다시 package해야 새 link를 생성한다. breaking change는 major increment로 표시하고 **모든 downstream consumers를 repackaging**해야 호환성을 복원한다. breaking change를 minor로 내면 선택 가능해도 install 오류를 만들 수 있다.

Product를 쪼개면 새 product installation은 기존 큰 product의 installed resource를 재사용하지 않고 새 resource를 만들어 중복될 수 있다. package 순서는 upstream→downstream이고 multi-product draft는 이 dependency order로 자동 package/publish한다. publish 순서 보장이 모든 installation 변경의 원자성을 뜻하지 않는다.

## Product group, beta

Product group은 여러 store의 product/installation 최대100members를 end-to-end offering으로 검증한다. 개별 product의 package/install/upgrade 방식을 바꾸지 않는다. product member는 latest published/pinned/release channel 정책, installation member는 실제 installed version을 쓴다. workflow member/external dependency role은 별개 축이고 최소 하나의 workflow member가 필요하다. default는 product=workflow, installation=external이다.

Validation은 dependency cycle, duplicate outputs, incompatible upstream version, missing inputs, missing recommendation,6개월 넘은 stale version과 unused external dependencies를 찾는다. cycle/중복 ownership을 수정하고 missing input은 output에 포함, missing recommendation은 downstream repackaging으로 해결한다. blocking과 advisory를 구별하고 새 version publish 후 refresh한다.

Immutable group snapshot은 members, 정확한 versions와 validation 결과를 고정하며 실패 상태도 보존한다. latest/channel 정책은 시간이 지나면 달라질 수 있어 재현 가능한 검증 증거에는 snapshot 또는 pinned versions를 쓴다. passing은 확인한 product-group 조건에 대한 결과이며 데이터 품질이나 user workflow 전체 성공의 증명은 아니다.

## 출처

- [Palantir, linked-products](https://www.palantir.com/docs/foundry/foundry-devops/linked-products)
- [Palantir, package-multiple-products](https://www.palantir.com/docs/foundry/foundry-devops/package-multiple-products)
- [Palantir, product-groups](https://www.palantir.com/docs/foundry/foundry-devops/product-groups)

## 관련 문서

- [[Palantir-DevOps-Version-and-Release]]
- [[Palantir-DevOps-Product-Packaging]]
