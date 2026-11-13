---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SAP SLT 큐와 OData 구독 계약"]
---

# SAP SLT 큐와 OData 구독 계약

## 복제와 소비 상태

SLT는 원본 ERP의 데이터베이스 트리거로 변경을 Operational Delta Queue에 복제하고 Foundry가 이를 소비하는 경로다. 최초 전체 적재, 이후 변경 polling, SLT 자체의 큐 보존을 구분한다. source의 RFC remote context는 SLT와 원본 ERP 사이 연결의 식별자다. 소스 설정 값의 `SLT~<Alias_Name>` 형식과, 아래 표의 OData 미적용이 이 소스 설정 값에도 해당하는지 문서에 명시되지 않은 점은 [[Palantir-SAP-SLT-Connector#Remote context 값|SAP SLT 커넥터의 Remote context 절]]을 따른다.

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

## SLT 구성 체크포인트

2026-11-13 확인한 SLT 구성 가이드 기준이다. 실제 SAP 시스템에서 설정을 실행해 보지는 않았다.

- 전제: 이전 직접 ODP 경로(커넥터 2.33(SP33) 이하, SAP 보안 패치 적용 뒤 실패하는 경로)는 커넥터를 설치하는 시스템의 SAP_BASIS 7.4 SP14 이상, SLT와 원본 시스템의 DMIS 2011_1_730 SP15 이상, 모든 Mass Transfer ID에 1:N 복제를 허용하는 SLT 구성을 요구한다. OData 경로는 SLT 시스템의 SAP_BASIS 7.50 SP09 이상, SP34 이상의 PALANTIR와 PALCONN, SLT 시스템에 설치한 PALODATA를 요구하며, 최신 OData 기능에는 SP39 Fix Pack 4 이상을 권한다. OData 경로에서 읽거나 적용할 SAP Note로 2854759, 2878969, 3062232, 3023446, 2888122를 든다.
- 소비자 수: 직접 ODP 경로의 전제 절에서, 이전 DMIS 버전은 테이블당 최대 4개 소비자(1:4 등록)로 제한되고 DMIS 2018 SP4부터 SAP의 새 CDC 기능으로 이 소비자 수 제한이 없어진다고 설명한다. 이 설명이 위 표의 OData 활성 구독 하나 제약을 풀어 주지는 않는다.
- 구성 생성: 권장 경로는 Post-Installation Wizard(`/n/PALANTIR/POST_INST`)에서 7단계 Create SLT configuration만 켜는 것이고, 대안은 `LTRC`에서 직접 만드는 것이다. Allow Multiple Usage는 생성 뒤 바꿀 수 없어 나중에 켜려면 구성을 지우고 다시 만들어야 한다. 구독자가 하나면 영향이 없으므로 처음 구성할 때 켜기를 권한다.
- 클라이언트: 운영 환경에서는 Read from Single Client를 켜 RFC 연결에 정의한 클라이언트의 데이터만 복제한다. 기존 SLT 환경에서는 모든 구성의 설정을 맞춘다(트리거 옵션이 다르면 복제가 안 되는 SAP Note 2372636).
- Target System(`LTRC` 절차 기준): Scenario는 ODP(높은 SAP_BASIS SP에서는 RFC Connection 대신 Other 아래), RFC Destination은 `NONE`으로 두고, Queue Alias는 이후 Foundry sync의 context로 쓴다. 가이드의 마법사 입력 표에는 이 항목들이 없고 마법사가 이를 대신 설정하는지도 밝히지 않으므로, 마법사로 만든 구성은 LTRC에서 확인한다(운영 제안, [[Palantir-SAP-SLT-Connector#Remote context 값|SAP SLT 커넥터의 Remote context 절]] 참고).
- 놓치기 쉬운 설정(`LTRC` 절차의 마지막 단계): ODP 시나리오에서는 LTRC 구성의 Expert Functions 탭에서 BAdI 구현이 활성인지 확인한다. 비활성이면 ODP가 제대로 동작하지 않는다. SAP Note 1660374에 따라 `SA38`에서 `SAP_RSADMIN_MAINTAIN`을 실행해 `RODPS_FETCH_TIMEOUT`(초)을 설정한다.
- 원격 SLT: 커넥터와 SLT가 다른 인스턴스면 둘 사이의 RFC 연결을 만들고 `/n/PALANTIR/PARAM`에 Param ID `SLT`, Param Name `RFC_CONFIGURATION`, 값으로 그 RFC 구성 이름을 넣는다. 구성 테이블에 값이 없으면 timestamp OFF, fetchOption XML, pageSize 50000이 기본값이다.
- 처리 여유: SLT 서버(커넥터가 다른 서버에 있으면 그 애플리케이션 서버도)에 빈 background와 dialog 프로세스가 없으면 Foundry 전송이 실패하므로 `SM50`으로 미리 확인한다.
- 저장공간: ODP는 원본 데이터를 ODP 큐 테이블 `ODQDATA_F`에 올리고, 커넥터는 요청 데이터를 `/PALANTIR/PAG_01`, `/PALANTIR/PAG_02`로 paging한다. 모든 페이지 전송이 성공하면 Foundry의 close 요청이 `/PALANTIR/PAG*` 항목을 지운다. 공간이 부족하면 SLT 복제 작업과 Foundry 전송이 실패할 수 있으므로, 초기 대량 sync 전에 대상 테이블 기준으로 데이터베이스 공간을 산정한다.
- 날짜와 시간 필드 길이: 이전 SAP_BASIS SP14에서 SAP가 DATS와 TIMS를 16자로 넘긴 문제는 SAP note로 고쳐졌다. 노트 적용 전에 길이 문제가 나면 Param ID `SLT`, Param Name `SLT_DATA_<XXX>`로 길이를 지정한다. 가이드는 XXX를 필드의 기술명으로 설명하면서 예시로 `SLT_DATA_DATS`=8, `SLT_DATA_TIMS`=6을 든다. 소수 자리가 3이 아닌 QUAN은 Param ID `SLT`, `SLT_DTYPE_QUAN`=`DEC`로 DEC로 바꿔 받는다. 값 의미의 대조는 [[Palantir-SAP-Authorization-Masking-and-Type-Fidelity|SAP 권한, 마스킹과 타입 충실도]]를 따른다.

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
- [[Palantir-SAP-SLT-Connector|SAP SLT 커넥터]]
