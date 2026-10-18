---
tags: [palantir, marketplace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Marketplace 입력 mapping과 설치 job

## Product, draft와 설치

Product는 설치 가능한 resource 묶음이고 store는 product를 담는다. 설치할 version의 changelog, inputs와 outputs를 검토한다. Recalled version은 새 수동/자동 설치가 차단되지만 이미 설치된 것은 계속 쓸 수 있다. 가능한 정상 version으로 옮기는 조치는 별도로 필요하다.

Installation job draft는 project/space/Ontology와 여러 제품의 의존성을 구성하는 변경안이다. Create draft는 설치 실행이 아니다. Required input과 blocking validation을 해결한 뒤 Install로 job을 제출한다. Warning은 설치를 막지 않더라도 영향 검토가 필요하다.

기존 installation을 Open하는 것과 Install again으로 새 자원을 만드는 것을 구분한다. 같은 제품을 다른 입력에 다시 설치할 수 있지만 기존 내용이 자동 재사용된다고 가정하지 않는다. 완료 후 Ontology indexing 때문에 앱 가용성이 몇 분 늦을 수 있다.

## 입력을 충족하는 방식

Input은 resource, group, migration 설정이나 prefix일 수 있다. Linked product가 채운 input은 기본 숨김이므로 mandatory 개수만 보지 말고 실제 공급 자원을 확인한다. Downstream tab은 해당 input을 소비할 출력을 보여 준다.

Linked installation은 외부 참조, 기존 설치 upgrade 또는 새 설치로 추가한다. 외부 참조는 store를 넘을 수 있으나 하나의 job에 실제 포함되는 installation은 같은 store와 space여야 한다. Apply changes 전후 graph에서 이번 job이 수정할 대상과 참조만 할 대상을 구분한다.

Placeholder는 검증일 기준 dataset input만 지원한다. 실제 자원이 없을 때 schema stub으로 설치를 진행하므로 데이터가 준비됐다는 뜻이 아니다. 이후 Edit로 실제 입력에 remap한다. Folder auto-selection과 bulk-set도 선택한 자원/column mapping을 검토한다.

## Override와 이름

Manual override는 default/linked product 공급을 덮는다. Unnecessary override는 현재 같은 값이라도 자동 연결을 고정하므로 후속 변경 추적에 차이가 생길 수 있다. Clean up에서 unnecessary override를 지우면 현재 값은 같지만 linked product override를 지우면 값이 달라질 수 있다.

Ontology install prefix는 display name만 또는 display/API name 모두에 적용할 수 있다. 외부 소비자의 API 이름 의존성을 확인한다. Outputs의 configuration/upstream을 검토해 실제 생성/수정 자원을 확인한다.

## 출처

- [Palantir Foundry, marketplace](https://www.palantir.com/docs/foundry/marketplace/)
- [Palantir Foundry, browse-products](https://www.palantir.com/docs/foundry/marketplace/browse-products/)
- [Palantir Foundry, getting-started](https://www.palantir.com/docs/foundry/marketplace/getting-started/)
- [Palantir Foundry, install-product](https://www.palantir.com/docs/foundry/marketplace/install-product/)
- [Palantir Foundry, overview](https://www.palantir.com/docs/foundry/marketplace/overview/)

## 관련 문서

- [[Palantir-Foundry-Marketplace]]
