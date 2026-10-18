---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Recipes 수명과 알림 결과의 해석"]
---

# Recipes 수명과 알림 결과의 해석

## 역사적 기능과 대체 경로

Recipes는 sunset 예정이지만 원문은 full support 중인 기능으로 설명한다. 제거 완료로 바꾸지 않는다. 대체 도구는 Automate/Rules/Monitoring/Workshop이며 단순 이름 치환이 아니라 조건/스케줄/수신자와 권한을 다시 매핑해야 한다.

Recipes는 건강한 데이터의 변화 알림을 위한 기능이다. Data Health 모니터링이나 안전에 중요한 저지연 제어의 유일한 수단으로 사용하지 않는다는 원문 범위를 유지한다. 만료는 monitoring을 멈추며 recipe를 삭제하는 것이 아니다. 만료 연장과 재활성화, 개인 mute와 전체 pause, owner의 삭제는 다른 상태 전이다.

## 권한과 delivery 결과

Recipe의 view/edit는 기반 resource 접근과 소유권에 연결된다. 수신자가 recipe를 보더라도 기반 data를 읽을 수 있는 것은 아니다. 원문의 일반적인 permission-respecting delivery 설명과 접근 부족 시 attachment 없이 링크 알림을 보낼 수 있다는 설명을 함께 보존한다. 알림 도착은 data 접근 승인의 증거가 아니다.

Run success는 조건/전달 결과와 함께 해석한다. Success with exceptions에는 일부 recipient의 접근 부족이나 PDF export 실패 후 링크 fallback이 포함될 수 있다. Skipped는 모두 mute하거나 조건이 false인 경우를 포함하고 Failed와 구분한다. 수신자 전체가 같은 결과를 받았다고 가정하지 않는다.

기본 recipient 한도25명, dataset preview 최대5column과 creator-local timezone은 확인한 문서 범위다. Preview가 전체 dataset이거나 timezone이 수신자 기준이라는 보장은 없다. 실제 recipe 생성/알림 전송은 수행하지 않았다.

## 출처

- [Palantir recipes, recipes](https://www.palantir.com/docs/foundry/recipes)
- [Palantir recipes, configure-notifications](https://www.palantir.com/docs/foundry/recipes/configure-notifications)
- [Palantir recipes, core-concepts](https://www.palantir.com/docs/foundry/recipes/core-concepts)
- [Palantir recipes, create-a-recipe](https://www.palantir.com/docs/foundry/recipes/create-a-recipe)
- [Palantir recipes, edit-a-recipe](https://www.palantir.com/docs/foundry/recipes/edit-a-recipe)
- [Palantir recipes, overview](https://www.palantir.com/docs/foundry/recipes/overview)
- [Palantir recipes, view-recipes](https://www.palantir.com/docs/foundry/recipes/view-recipes)

## 관련 문서

- [[Palantir-Workflow-Operations]]
