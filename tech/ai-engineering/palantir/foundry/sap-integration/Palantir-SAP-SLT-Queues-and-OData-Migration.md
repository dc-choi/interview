---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SAP SLT 큐와 OData 구독 계약"]
---

# SAP SLT 큐와 OData 구독 계약

## 복제와 소비 상태

SLT는 원본 ERP의 데이터베이스 트리거로 변경을 Operational Delta Queue에 복제하고 Foundry가 이를 소비하는 경로다. 최초 전체 적재, 이후 변경 polling, SLT 자체의 큐 보존을 구분한다. source의 RFC remote context는 SLT와 원본 ERP 사이 연결의 식별자다.

이전 ODP 경로에서는 remote context를 지정한 초기 적재가 SLT 큐를 우회해 RFC로 읽을 수 있으며 parallel paging도 적용된다. 이 두 옵션을 OData에 그대로 옮길 수 없다. 원본과 게이트웨이의 DIA/BG 작업 여유, ODQ와 커넥터 paging 양쪽의 임시 저장공간을 고려한다.

## 현재 API와 이전 API

2026-10-16 확인한 Palantir SLT 문서는 SAP Note 3255746의 2026년 4월 버전과 6월 보안 패치를 근거로 비 SAP 애플리케이션의 ODP-RFC 사용이 허용되지 않는다고 명시한다. 이 기록은 Palantir 문서의 안내를 확인한 것이며 SAP 계약과 패치를 직접 실행 검증한 것은 아니다.

| 항목 | OData, SP34 이상 | ODP, 이전 경로 |
|---|---|---|
| 전제 | PALODATA, SAP_BASIS 7.50 SP09 이상 | 이전 ODP/RFC 설정 |
| 테이블 구독 | 활성 구독 하나 | 여러 구독 가능했던 계약 |
| Remote context | 적용 안 됨 | 지원 |
| Parallel paging | 적용 안 됨 | 지원 |
| 현재 문서의 판단 | 이전 대상 경로 | SAP가 더 이상 허용하지 않는다고 명시 |

이전 DMIS 버전의 최대 소비자 수와 Allow Multiple Usage 설명은 OData의 활성 구독 하나 제약을 없애지 않는다. 과거 설정을 변경할 때 삭제와 재생성이 필요한 조건도 있어 기존 상태를 보존한 단순 토글 변경으로 가정하지 않는다.

## 전체 재적재를 일으키는 제어

Force snapshot은 트리거나 포인터가 손상된 경우 전체 테이블을 다시 읽은 뒤 변경 polling으로 돌아가기 위한 설정이다. 전체 전송 후 해제하는 절차가 명시된다.

Reset queue registration은 기존 OData 구독을 해제하고 현재 sync에 넘긴다. 켜 둔 채 실행하면 매번 전체 재적재하므로 구독 재할당 후 해제해야 한다. 구독 소유 변경과 평상시 retry를 구분한다.

기본 페이지는 50,000행, 최소 5,000행으로 제시된다. Max file size 항목도 이름과 달리 행 수를 설명하므로 바이트 한도로 단정하지 않는다. parse 실패를 무시하는 옵션은 잘못된 날짜/숫자를 null로 적재하고 요약 로그를 남긴다.

## 출처

- [Palantir sap, sap](https://www.palantir.com/docs/foundry/sap)
- [Palantir sap, addon-parameters](https://www.palantir.com/docs/foundry/sap/addon-parameters)
- [Palantir sap, architecture](https://www.palantir.com/docs/foundry/sap/architecture)
- [Palantir sap, authorization-roles](https://www.palantir.com/docs/foundry/sap/authorization-roles)
- [Palantir sap, backup-restore](https://www.palantir.com/docs/foundry/sap/backup-restore)
- [Palantir sap, configure-bex-query](https://www.palantir.com/docs/foundry/sap/configure-bex-query)
- [Palantir sap, configure-custom-authorizations](https://www.palantir.com/docs/foundry/sap/configure-custom-authorizations)
- [Palantir sap, configure-extractors](https://www.palantir.com/docs/foundry/sap/configure-extractors)
- [Palantir sap, configure-functions](https://www.palantir.com/docs/foundry/sap/configure-functions)
- [Palantir sap, configure-sap-slt](https://www.palantir.com/docs/foundry/sap/configure-sap-slt)
- [Palantir sap, configure-tcode-extraction](https://www.palantir.com/docs/foundry/sap/configure-tcode-extraction)
- [Palantir sap, create-sap-rfc-connection](https://www.palantir.com/docs/foundry/sap/create-sap-rfc-connection)
- [Palantir sap, data-accelerator](https://www.palantir.com/docs/foundry/sap/data-accelerator)
- [Palantir sap, download-sap-addon](https://www.palantir.com/docs/foundry/sap/download-sap-addon)
- [Palantir sap, extract-long-text](https://www.palantir.com/docs/foundry/sap/extract-long-text)
- [Palantir sap, faq](https://www.palantir.com/docs/foundry/sap/faq)
- [Palantir sap, housekeeping](https://www.palantir.com/docs/foundry/sap/housekeeping)
- [Palantir sap, ingest-hana-views](https://www.palantir.com/docs/foundry/sap/ingest-hana-views)
- [Palantir sap, install-sap](https://www.palantir.com/docs/foundry/sap/install-sap)
- [Palantir sap, install-sap-connector](https://www.palantir.com/docs/foundry/sap/install-sap-connector)
- [Palantir sap, install-sap-fixpack](https://www.palantir.com/docs/foundry/sap/install-sap-fixpack)
- [Palantir sap, install-sap-remote-agent](https://www.palantir.com/docs/foundry/sap/install-sap-remote-agent)
- [Palantir sap, install-sap-remote-agent-620](https://www.palantir.com/docs/foundry/sap/install-sap-remote-agent-620)
- [Palantir sap, install-sap-support-package](https://www.palantir.com/docs/foundry/sap/install-sap-support-package)
- [Palantir sap, oauth2-writeback](https://www.palantir.com/docs/foundry/sap/oauth2-writeback)
- [Palantir sap, overview](https://www.palantir.com/docs/foundry/sap/overview)
- [Palantir sap, sap-cockpit](https://www.palantir.com/docs/foundry/sap/sap-cockpit)
- [Palantir sap, sap-dynamic-filters](https://www.palantir.com/docs/foundry/sap/sap-dynamic-filters)
- [Palantir sap, sap-exploration](https://www.palantir.com/docs/foundry/sap/sap-exploration)
- [Palantir sap, sap-incremental-syncs](https://www.palantir.com/docs/foundry/sap/sap-incremental-syncs)
- [Palantir sap, sap-object-types](https://www.palantir.com/docs/foundry/sap/sap-object-types)
- [Palantir sap, sap-source-setup](https://www.palantir.com/docs/foundry/sap/sap-source-setup)
- [Palantir sap, sap-streaming-sync-setup](https://www.palantir.com/docs/foundry/sap/sap-streaming-sync-setup)
- [Palantir sap, sap-sync-setup](https://www.palantir.com/docs/foundry/sap/sap-sync-setup)
- [Palantir sap, uninstall-sap](https://www.palantir.com/docs/foundry/sap/uninstall-sap)

## 관련 문서

- [[Palantir-SAP-Integration]]
