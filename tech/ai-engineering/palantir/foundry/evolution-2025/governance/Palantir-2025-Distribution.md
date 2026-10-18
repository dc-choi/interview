---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Marketplace, DevOps와 peering의 설치 계약

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## Package와 installation

- 1월 installation build failure를 installation job failure로 취급하도록 바뀌었고 3월 build/install error를 별도 status로 드러냈다.
- 3월 새 Production mode installation은 automatic upgrade가 기본 비활성화됐다. 기존 설치는 영향 없고 Settings에서 켤 수 있다.
- 3월 dataset schedule packaging validation은 제거되고 dataset이 install 시 기본 build하도록 바뀌었다. 사용 가능한 schedule 선택은 Build Settings에 남았다.
- 3월 folder/project bulk add와 refresh, 같은 repo packaged Function 변경 관리, error reporting가 개선됐다.
- 4월 stream tracking은 install 시작 추적이지 완료 보장이 아니었다. 설치 status와 데이터 build를 따로 확인한다.
- 7월 DevOps workflow 개편은 기존 draft와 비호환이라 새 draft 작성이 필요했다. 8월 공지는 9월 첫 주 DevOps GA/기본 활성화를 알렸다.
- 11월 singleton Space/Ontology, 12월 struct value type의 포함 또는 install input, Function runtime config와 Quiver materialization card 등 packaging 범위가 확대됐다.

## SDK와 custom component

2월 Notepad Function widget은 한 Function의 한 version만 함께 package했다. OSDK template/hosting, 4월 OSDK Marketplace, 7월 Python/TS2 SDK와 Ontology input remapping, 11월 custom widget set의 manual/API enable 조건은 서로 다른 배포 계약이다. 단일 Marketplace 지원 문구로 resource마다 필요한 scope나 API name mapping이 자동 보장된다고 읽지 않는다.

## Peering과 환경 경계

- 9월 Peer Manager 베타는 Control Panel connection 구성을 소개했다. artifact connection 설정과 artifact 실제 peering 제공은 별도 일정이었다.
- 10월 M2M authentication, 11월 셋째 주 GA는 Space admin, link/object 선택과 object set job의 real-time sync를 묶었다. artifact peering은 당시 연말 향후 범위였다.
- 8월 consumer mode는 전용 Org/Space, 인증 triage/access restriction과 OAuth/client credentials 패턴을 설명했다. 설치자 권한과 최종 사용자 격리를 별도로 설계한다.

배포 판단은 package 유효성, install success, build success, consumer version, resource scope와 data freshness를 나눠 확인한다. 자동 upgrade와 stable Function version policy는 함께 검토해야 변경 파급을 통제할 수 있다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [August 19, 2025, Foundry DevOps will be generally available as of the first week of September — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#567f620b-3be6-4cf5-b75b-4c88fc4e7b8e)
- [November 6, 2025, Create, view, and monitor Foundry peering connections using Peer Manager — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#b1f8eea8-29ad-435f-8bb4-52ddc2f1e4b6)
- [September 9, 2025, Configure and monitor Foundry peering with Peer Manager — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#90981959-0afa-4407-8e92-e4304231bf48)
- [July 24, 2025, Experience faster DevOps packaging with streamlined bulk operations and an intuitive workflow — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#efc28db7-d61a-45b1-a223-d56661ddd1e0)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
- [[Palantir-Product-Delivery]]
