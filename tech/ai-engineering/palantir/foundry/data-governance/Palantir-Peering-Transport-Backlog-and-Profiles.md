---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Peering 전송 상태와 재사용 설정"]
---

# Peering 전송 상태와 재사용 설정

## 네트워크와 데이터 방향

MPX는 직접 네트워크, data relay는 기존 cross-domain solution 위의 전송 경로다. Transport의 ingress/egress는 요청 시작 방향이며 resource별 import/export 권한과 따로 확인한다. Invite 승인 뒤 원 요청자의 activation까지 완료해야 peer 관계가 활성화된다. 양쪽 설정이 대응해야 하며 파일 종류별 peering도 양쪽에 필요하다.

Relay channel은 한 방향이며 송수신 transport type과 선택적 payload 서명 secret이 일치해야 한다. Peering control-plane integration, heartbeat와 binary media용 별도 pipe는 같은 계약이 아니다. Export guard schema version의 호환성도 별도 전제다. 이 문서는 일반 전송 무결성 계약만 다루며 특정 업무 데이터 전송 운용 절차는 제공하지 않는다.

## Job 상태를 해석한다

각 job은 payload(Data/ACK)와 방향으로 나뉜다. ACK는 수신 확인뿐 아니라 공유 상태를 맞추는 metadata도 담는다. Concurrent export는 변경 때 발생하는 빠른 경로이고 sequential export는 relationship별 하나씩 실행하는 누락 보충 경로다. Import의 sequencing 표시는 상대 export를 나타내며 실제 import는 동시 실행된다.

Sequential Collecting data가 길면 미확인 backlog를 모으는 중일 수 있다. 초기 적재/중단 뒤의 일시적 지연과 지속적으로 backlog가 증가하는 상황을 구분한다. 큰 sequential job은 같은 관계의 다음 sequential을 막지만 모든 concurrent 전송이 멈췄다는 뜻은 아니다.

Empty는 data와 ACK 모두 없다는 뜻이며 일정상 자연스럽게 생길 수 있다. 기본 숨김이고 connection health는 최근 non-empty job으로 계산되므로 Empty 하나만으로 전체 무장애를 단정하지 않는다. Ready to download, Awaiting pull과 성공적인 원격 import/ACK도 별도 상태다. Failed는 단계별 오류와 instance ID로 조사한다.

## Profile의 적용 범위

Beta peer profile은 양쪽 한 쌍을 만들고 export/import를 서로 반영한다. Marketplace에 배포해 local space와 remote strategy(All/specific/mesh/label)를 선택하며 기존 connection에도 설정을 적용할 수 있다. Mesh strategy는 이후 가입 enrollment에도 영향을 줄 수 있으므로 현재 연결 목록에만 한정되지 않는다.

Profile에 없는 file type은 영향을 받지 않는다. 설치 뒤 직접 편집은 지원하지 않고 제거/수정/재설치 경로를 요구한다. Draft 생성, package 발행, 양쪽 대응 profile 설치와 connection health를 구분한다. Checklist의 체크를 실제 전송/권한 검증의 증거로 취급하지 않는다.

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
