---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Enrollment peering의 식별자와 권한 계약"]
---

# Enrollment peering의 식별자와 권한 계약

## 복제와 패키지 배포를 나눈다

Peer connection은 서로 다른 enrollment의 space 사이에서 object/link 데이터, object set과 지원 파일을 공유한다. Workshop 같은 앱 자체의 배포는 Marketplace 영역이다. Schema 배포와 데이터 peering을 결합할 수 있지만 같은 작업은 아니다.

Enrollment마다 object RID가 달라 peering mapping이 참조를 변환한다. Object type은 양쪽에 있어야 하며 peer할 property만 명시적으로 mapping한다. API 이름이 같을 필요는 없지만 property 타입은 맞아야 한다. Schema가 어긋나면 새 데이터 전송이 멈출 수 있어 양쪽 정의의 release를 함께 관리한다.

## 데이터 종류별 방향과 제한

Source data peering은 현재 단방향이다. Cloud-to-cloud는 direct datasource 조건이 있고 일반 dataset/Restricted View backing은 Foundry connector로 원본을 동기화한 뒤 Action edit를 peer하는 경로를 구분한다. Stream 자체를 object datasource로 쓰는 경우와 direct datasource의 feed로 쓰는 경우도 지원이 다르다.

Action data는 양방향 eventual consistency이며 실시간 실패 시 ACK를 받을 때까지 재전송한다. Cipher text, linked sensor time series와 vector property는 미지원 항목으로 표시된다. 임의의 multi-property transaction/충돌 해결 순서를 이 설명만으로 추정하지 않는다.

Foreign-key link는 양 객체와 양쪽 link 정의가 필요하다. Join table many-to-many는 따로 peering을 구성하고 backing object 관계는 그 object도 peer해야 한다. Peered edit가 양쪽 automation을 다시 트리거해 부작용이 중복될 수 있어 peering patch 제외 조건을 검토한다.

## 전송 허용과 사용자 접근

Connection classification은 허용 최대 등급이고 다른 marking은 전송 리소스의 marking을 모두 포함해야 한다. 단순히 높은 classification만 지정했다고 모든 marking 데이터가 허용되는 것은 아니다. Remote marking이 local에 생성되어도 local 사용자에게 view 권한을 자동 부여하지 않는다. Unknown badge가 보이는 connection 자체의 가시성과 underlying data 접근은 다르다.

양쪽 중 하나가 disable하면 전송이 중단된다. Security 변경은 remote 승인 후 적용된다. Connection을 관리하려면 local space 관리 권한이 필요하며 enrollment 표시 이름/logo는 상대에게 노출될 수 있다. 실제 cross-enrollment 연결이나 데이터 복제는 수행하지 않았다.

## 출처

- [Palantir peer-manager, peer-manager](https://www.palantir.com/docs/foundry/peer-manager)
- [Palantir peer-manager, configure-file-peering](https://www.palantir.com/docs/foundry/peer-manager/configure-file-peering)
- [Palantir peer-manager, configure-ontology-peering](https://www.palantir.com/docs/foundry/peer-manager/configure-ontology-peering)
- [Palantir peer-manager, core-concepts](https://www.palantir.com/docs/foundry/peer-manager/core-concepts)
- [Palantir peer-manager, create-a-peer-connection](https://www.palantir.com/docs/foundry/peer-manager/create-a-peer-connection)
- [Palantir peer-manager, establish-data-relay-connection](https://www.palantir.com/docs/foundry/peer-manager/establish-data-relay-connection)
- [Palantir peer-manager, establish-mpx-connection](https://www.palantir.com/docs/foundry/peer-manager/establish-mpx-connection)
- [Palantir peer-manager, faq](https://www.palantir.com/docs/foundry/peer-manager/faq)
- [Palantir peer-manager, ontology-peering-overview](https://www.palantir.com/docs/foundry/peer-manager/ontology-peering-overview)
- [Palantir peer-manager, overview](https://www.palantir.com/docs/foundry/peer-manager/overview)
- [Palantir peer-manager, peer-connection-settings](https://www.palantir.com/docs/foundry/peer-manager/peer-connection-settings)
- [Palantir peer-manager, peer-profiles](https://www.palantir.com/docs/foundry/peer-manager/peer-profiles)
- [Palantir peer-manager, peering-jobs](https://www.palantir.com/docs/foundry/peer-manager/peering-jobs)

## 관련 문서

- [[Palantir-Data-Governance]]
