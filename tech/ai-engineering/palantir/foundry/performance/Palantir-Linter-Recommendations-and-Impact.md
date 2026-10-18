---
tags: [palantir, linter]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Linter 권고의 상태와 절감 추정

## Sweep와 권고

Linter는 resource metadata를 규칙에 대입해 anti-pattern 후보를 찾는다. Resource Savings는 비용을, Pipeline Resilience는 안정성을 목적으로 하며 같은 자원도 목적에 따라 다른 조치가 필요하다. 권고는 확정 결함이나 자동 변경 완료를 뜻하지 않는다.

Sweep schedule은 space에 속하고 기본적으로 그 space의 project를 대상으로 한다. 선택 project로 좁힐 수 있으며 rule preset을 적용한 뒤 개별 rule을 추가하고 exclude rule을 제거한다. Control Panel에서 현재 선택한 space가 실제 scope인지 확인한다.

Fix proposal은 변경안을 만들 뿐 기저 자원을 바꾸지 않는다. 사용자 검토/적용 후 다음 sweep에서 조건을 다시 평가해야 권고가 사라진다. 권고의 가시성은 원래 resource 열람 권한을 따른다. Assignee는 추적 담당자이며 접근 권한을 부여하지 않는다. Snooze는 원인 제거가 아니라 기간 동안 숨기는 상태다.

## 두 종류의 상태

추천 화면의 default/snoozed/snooze expired와 impact 추적의 open/under investigation/resolved는 목적이 다른 상태다. 처음 권고를 열면 snapshot을 남겨 추적하며 열지 않은 open 권고는 다음 sweep에서 사라질 수 있고 impact 집계에도 남지 않는다.

Estimated impact는 조치 전 예측을 30일로 정규화한다. Verified impact도 실제 금액의 확정값이 아니라 조치 전 7일과 후 7일의 usage 차이를 30일로 정규화한 추정이다. 보통 7일이 지나야 나타나며 두 주가 대표적이지 않으면 차이가 왜곡된다.

API visibility의 한계와 여러 rule이 같은 resource를 가리키는 중복 때문에 권고별 절감량을 단순 합산하지 않는다. 빠르게 조치했거나 업무량이 바뀌면 estimated와 verified 값이 크게 다를 수 있다. Resource Management와 실제 목표 달성 여부로 결과를 검증한다.

## 출처

- [Palantir Foundry, linter](https://www.palantir.com/docs/foundry/linter/)
- [Palantir Foundry, impact-tracking](https://www.palantir.com/docs/foundry/linter/impact-tracking/)
- [Palantir Foundry, modes](https://www.palantir.com/docs/foundry/linter/modes/)
- [Palantir Foundry, overview](https://www.palantir.com/docs/foundry/linter/overview/)
- [Palantir Foundry, recommendations](https://www.palantir.com/docs/foundry/linter/recommendations/)
- [Palantir Foundry, sweep-schedules](https://www.palantir.com/docs/foundry/linter/sweep-schedules/)

## 관련 문서

- [[Palantir-Foundry-Performance]]
