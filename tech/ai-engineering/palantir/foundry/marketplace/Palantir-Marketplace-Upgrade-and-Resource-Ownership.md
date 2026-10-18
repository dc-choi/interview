---
tags: [palantir, marketplace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Marketplace 업그레이드와 자원 소유

## 업그레이드 조건

Manual upgrade/downgrade는 원하는 version의 draft를 만들고 새 input과 validation을 해결한다. 기존 version에서 Edit하면 version을 바꾸지 않고 input 변경이나 재실행을 할 수 있다.

Beta automatic upgrade는 Production/Bootstrap mode 모두 기본 off다. Maintenance window와 channel을 설정하고 새 input mapping이나 validation 오류가 있으면 수동 처리로 돌아온다. 업그레이드는 설치 자원 downtime을 유발할 수 있으므로 Always open의 의미를 검토한다.

Channel은 배타적 집합이 아니다. Release track은 Release/Test/Stable tag를, Test는 Test/Stable을, Stable은 Stable만 받는다. 단순히 이름이 같은 tag만 받는다고 해석하지 않는다. Recalled version은 자동 upgrade 대상에서 제외된다.

## Lock, unlock과 detach

Production project lock은 설치 자원의 직접 수정을 막지만 Marketplace upgrade는 허용한다. Unlock 후의 직접 수정은 다음 version 적용 때 덮어쓸 수 있다. Code Repository는 source code가 packaging되어야 unlock 이후에도 수정 가능하다.

Detach는 출력과 Marketplace의 관리 연결을 영구적으로 끊는다. 이후 upgrade는 detached 자원을 덮지 않고 새 output을 생성하며 uninstall도 detached output은 지우지 않는다. Unlock과 달리 되돌릴 수 있는 편집 모드 전환이 아니다.

## 삭제 범위

Delete installation permanently는 되돌릴 수 없다. Outputs를 선택하면 모든 설치 version의 해당 자원을 영구 삭제하고, folder/project에 다른 자원이 없으면 그 container도 삭제한다. 일부만 유지하려면 먼저 detach하고, 전체 출력을 유지하려면 Outputs 선택을 해제하는 식으로 preview를 검토한다.

부분 실패 시 성공/실패 자원을 분리해 보여 준다. Force delete는 실패 자원이 남는 것을 수락하고 installation 관리 정보를 지우는 동작이므로 모든 자원이 삭제됐다는 뜻이 아니다.

## Apollo 관리 제품

Beta Foundry products는 enrollment 간 이식 가능한 Marketplace product를 Apollo로 전달한다. Managed installation은 installation 자체를 Apollo/Palantir가 관리하고 artifact installation은 product만 제공해 사용자가 Marketplace에서 설치한다. 제품 가시성과 실제 설치 소유/운영 책임을 구분한다.

## 출처

- [Palantir Foundry, foundry-products](https://www.palantir.com/docs/foundry/marketplace/foundry-products/)
- [Palantir Foundry, installations](https://www.palantir.com/docs/foundry/marketplace/installations/)
- [Palantir Foundry, upgrades](https://www.palantir.com/docs/foundry/marketplace/upgrades/)

## 관련 문서

- [[Palantir-Foundry-Marketplace]]
