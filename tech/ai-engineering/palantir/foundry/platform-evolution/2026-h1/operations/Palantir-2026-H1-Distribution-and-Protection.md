---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 설치 순서, data obfuscation과 export 기록

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## 제품 의존성과 설치

- 2월 cross-store linked product와 strict folder tracking이 추가됐다. strict는 source folder 밖 resource 포함을 막고 6월 inline 오류를 표시했다.
- 3월 install configuration에서 기존/새 Project를 고르고 lock role mapping을 구성했다. locked Project 해제는 Compass 또는 installation settings에서 한다.
- 2월 Data Connection export/sync, sidecar ModelInput와 install-time model version 선택, 5월 standalone link type, 6월 versioned object set packaging이 확대됐다.
- 6월 draft group은 여러 제품의 input/output 의존을 시각화하고 dependency 순서대로 publish했다. broken relationship warning와 failed resource drop count를 확인한다.
- 6월 Ontology entity 의존 linked installation beta는 요청 활성화가 필요했고 단일 installation과 같은 500 object type/500 shared property/500 link/750 Action/200 interface 한도를 적용했다. linked product 수만큼 한도가 늘어나는 것은 아니다.
- Peer Manager jobs는 health summary와 전용 jobs page로 나뉘고 XML payload/XSD schema export는 generic Frontend Export 대신 각각 전용 Checkpoint를 사용했다.

## 감지와 암호화의 범위

2월 SDS Obfuscate Data는 Cipher Channel과 **Admin License/key access**를 요구했다. AES-SIV deterministic, AES-GCM-SIV probabilistic와 SHA-512와 SHA-256 hash를 지원했다. default는 match가 있으면 **column 전체**, 그 밖에 row/cell/matched segment mode가 있었다.

scan resource마다 obfuscated **새 output dataset**을 만들므로 원본의 제거나 in-place 익명화를 의미하지 않는다. 탐지 누락, downstream 원본 접근와 output permission을 함께 검토한다. 5월 bellaso-python-lib 0.75는 기존 method를 deprecated로 두고 향후 제거를 예고했지만 즉시 없애지는 않았다.

2~3월 OAuth secret rotation, Analyst chat PDF export, custom iframe camera/microphone/download, Peer Manager payload/schema 등 Checkpoint가 추가됐다. justification 수집은 해당 event의 기록이고 모든 API/파일 download를 포괄하는 자동 보안 보장이 아니다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [February 24, 2026, Automatically obfuscate sensitive data in Sensitive Data Scanner using Cipher — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#1ab288a1-c8d6-49cf-9bc4-87b943f82a3b)
- [June 16, 2026, Package multiple products simultaneously in Foundry DevOps — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#4f20acd3-6b86-4a4f-840a-0881f0efd3b9)
- [June 30, 2026, Install and upgrade multiple products with Ontology entity dependencies in Marketplace — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#e9a5842f151e782e332361bfaa6ef6c12c9f7a0c3dc22c69aa608489a1e3e950)
- [June 29, 2026, Dedicated jobs page in Peer Manager — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#df9d4108-456f-42cc-a4a0-eca73b96b145)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
