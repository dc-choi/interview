---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo Plan, 제약과 긴급 명령

## Plan 선택과 실패 복구

Plan은 설치, 설정 변경, 버전과 설정의 동시 변경, 제거와 secret 작업 같은 실행 단위다. Hub는 release channel의 가능한 최신 버전 중 제약을 만족하는 후보와 그 버전에 맞는 config override를 함께 고른다. recall roll-off와 긴급 command를 우선한다. 환경 전체를 원하는 한 상태로 직접 바꾸는 대신 작업별 명세와 진행/결과를 노출한다.

의존/피의존 엔티티 Reported State, settings, config/secret, 채널의 새 릴리스와 recall이 바뀌면 다시 계산한다. 제약에 막힌 Plan은 4시간이 지나면 다시 검토한다. 의존 그래프의 변화는 해당 엔티티와 인접 의존/피의존 대상으로 전파되며 임의의 전체 환경 재배포를 뜻하지 않는다.

실패하면 엔티티 자동 suppression으로 같은 작업의 반복을 막고 다른 엔티티 작업은 계속한다. 자동 suppression 엔티티 수가 설정 임계치를 넘으면 환경 전체를 막고 임계치 아래로 내려가면 환경 자동 suppression을 해제한다. 실패 전 상태로 복구하는 rollback Plan은 자동 실패 suppression을 통과할 수 있지만 수동 suppression은 존중한다.

실패 조사에서는 raw Plan output을 읽고, 일반 실행 실패 화면에서는 Plan 발행, agent 수신과 실행 실패를 나눈 timeline을, Helm chart rollout 실패에서는 ready가 되지 못한 Kubernetes resource 목록을, Product validation 실패에서는 validation error 세부를 함께 확인한다. 공식 Product validation 실패 화면은 변경 미적용을 명시하지만 일반 실행 실패 화면은 같은 보장을 하지 않는다. 실패 표시만으로 무변경이나 rollback 완료를 가정하지 않는다. (2026-10-18 [공식 실패 화면과 본문](https://www.palantir.com/docs/apollo/core/plans-and-constraints) 대조)

## 시간과 가용성 제약

Maintenance window는 변경 가능한 시간, suppression window는 발행을 막는 시간이다. suppression이 우선한다. maintenance override는 시간 제약만 잠시 열며 다른 제품 의존성이나 active Plan 충돌을 없애지 않는다. Helm chart는 downtime/no-downtime 어느 window에서도 바꿀 수 있어 둘을 같은 일정으로 제한해야 의도한 시간 통제가 된다.

최신 Plans and Constraints 문서의 resolved window 규칙은 Product window가 있으면 이를 사용하되 환경이 Product window를 무시하도록 설정하면 제외하는 방식이다. Product window가 없으면 Entity window를 쓰고 별도 Entity window가 없으면 Environment window를 쓴다. 실습의 그림을 단순 교집합 알고리즘으로 일반화하지 않는다. 최종 resolved 값을 UI에서 확인한다.

recall roll-off는 기본적으로 유지보수 시간 밖에서도 가능하지만 해당 환경의 require-maintenance-windows-for-no-downtime-recalled-release-roll-offs가 true면 시간을 지킨다. 이는 다른 제약까지 모두 우회한다는 뜻이 아니다. canary soak 중 자동 suppression은 더 새 버전으로 바뀌어 평가가 무한 연기되는 것을 막고 recall roll-off에는 예외를 둔다.

artifact availability는 Available, Unavailable, Unchecked로 구분한다. registry 요청 실패도 Unavailable이 될 수 있다. Hub 접근을 기대하지 않거나 URI에 맞는 registry가 없는 Unchecked는 그 검사로 Plan을 막지 않는다. Unchecked를 실제 pull 가능의 증거로 해석하지 않는다.

## 긴급 command와 취소

command는 Plan의 일반 제약과 우선순위를 우회한다. maintenance/suppression, unhealthy, recalled 버전 조건에서도 실행할 수 있지만 같은 엔티티의 active 작업과 충돌하면 기다린다. 엔티티당 pending/executing command는 하나다. Install, Uninstall, Enforce config, Enforce config and version과 Helm resource restart 등의 동작을 목적에 맞춰 고른다. 대기 중 secret 작업이 command에 함께 포함될 수 있다.

command 후에는 정상 Plan 평가를 재개하므로 수동 downgrade가 다시 upgrade될 수 있다. 재발 방지 의도라면 recall/채널 정책을 함께 고친다. 버전만 고정하려면 별도 채널을 만들어 원하는 릴리스만 넣는 방식이 config까지 막는 suppression보다 적합하다. 이 경우에도 recall과 후보 부족으로 현재 recalled 버전에 남을 수 있다.

active Plan 취소는 agent의 응답이 필요하다. agent가 죽거나 끊기면 즉시 취소를 보장하지 못한다. 취소만 하면 같은 Plan을 다시 발행할 수 있어 짧은 suppression을 함께 둔다. command abort 이후 엔티티가 healthy라는 보장도 없으므로 결과를 직접 확인한다.

## 출처

- [Palantir, introduction-maintenance](https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-maintenance) — 환경/제품 유지보수 일정 실습과 downtime 양쪽 설정.
- [Palantir, plans-and-constraints](https://www.palantir.com/docs/apollo/core/plans-and-constraints) — Plan 생명주기, 재계산, rollback, window와 artifact 제약.
- [Palantir, prevent-product-release-upgrades-for-an-entity](https://www.palantir.com/docs/apollo/managing-entities/prevent-product-release-upgrades-for-an-entity) — 자동 승격 밖 custom 채널로 버전 동결.
- [Palantir, user-issued-commands](https://www.palantir.com/docs/apollo/managing-entities/user-issued-commands) — command 제약 우회, active 충돌과 취소의 한계.
- [Palantir, create-maintenance-window-overrides](https://www.palantir.com/docs/apollo/managing-environments/create-maintenance-window-overrides) — 환경/엔티티 maintenance override 권한과 제거 범위.
- [Palantir, environment-settings](https://www.palantir.com/docs/apollo/managing-environments/environment-settings) — 환경 settings, window override와 dependency group의 기본값.
- [Palantir, suppression-windows-and-cancelling-plans](https://www.palantir.com/docs/apollo/managing-environments/suppression-windows-and-cancelling-plans) — 수동/자동 suppression과 cancel 뒤 재발행 예방.
- [Palantir, product-maintenance-window](https://www.palantir.com/docs/apollo/managing-products/product-maintenance-window) — 제품 window는 자동 승격에도 적용, 수동 승격은 예외.

## 관련 문서

- [[Apollo-Hub-Spoke-and-Environment-State]]
- [[Apollo-Release-Promotion-and-Recalls]]
