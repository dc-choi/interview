---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-14
category: "AI엔지니어링(AIEngineering)"
---

# SAP SLT streaming과 OData 전환 조건

SAP SLT는 SAP ERP의 일반 batch sync와 달리 변경 queue를 stream으로 가져온다. ODQ polling 약 1초와 50,000 이하 단일 poll/그 이상 paging 조건, dialog process 수와 stream 수를 맞춘다. primary key partition을 통한 ordering 범위를 확인한다. 이 polling, paging과 ordering 수치는 이전 streaming 설정 페이지 기준이다. 2026-11-14에는 같은 주소가 SAP SLT 커넥터 페이지로 연결되며 현재 문서에서 이 수치를 다시 확인하지 못했다.

## Remote context 값

2026-11-04 커넥터 문서와 SLT 구성 가이드를 대조한 기준이다. 커넥터 문서는 소스 설정에 Remote context 값을 요구하고 `SLT~<Alias_Name>` 형식으로 쓰게 한다. `<Alias_Name>`은 SLT의 `LTRC` 트랜잭션에서 구성한 alias 이름이다. 커넥터 문서가 구성 방법으로 링크한 가이드의 LTRC 절차에서 alias가 나오는 항목은 Target System 절에서 ODP 시나리오를 고른 뒤 지정하는 Queue Alias뿐이고, 가이드는 이 이름을 이후 Foundry dataset sync를 정의할 때 context로 쓴다고 적는다. 따라서 `<Alias_Name>`은 이 Queue Alias로 읽는다(두 문서를 연결한 해석). 가이드는 원본 시스템의 SAP System ID(SID)가 드러나게 이름 짓기를 권한다.

커넥터 문서는 이 값이 SLT Replication Server와 원본 ERP 사이의 RFC 연결을 식별한다고 설명한다. 가이드에서 원본 RFC 연결은 같은 SLT 구성의 Source System 절에서 고르므로 alias가 구성을 거쳐 그 연결을 가리킨다고 읽을 수 있지만, 문서가 직접 설명하지는 않는다. 권장 경로인 Post-Installation Wizard의 입력에는 Queue Alias 항목이 없고 `Context Name`을 고유한 구성 이름으로 설명하므로, 이 이름이 alias에 해당하는지는 LTRC의 실제 구성으로 확인한다(운영 제안).

배치 sync 고급 설정의 Remote context 항목은 값이 있으면 초기 적재가 SLT 큐를 우회해 RFC로 읽게 하며 OData sync에는 적용되지 않는다. API 비교표도 OData가 remote context를 포함하지 않는다고 적는다. 문서는 일부 고급 설정을 소스 수준에서도 정할 수 있다고만 적고, 가이드는 alias를 sync 정의에 쓴다고 하는 반면 커넥터 문서는 소스 설정에 둔다. 커넥터 문서의 Setup은 OData 예외 없이 이 값을 요구한다. 다만 표의 OData 미포함과 고급 설정의 OData 미적용이 이 소스 설정 값에도 해당하는지, 두 항목이 같은 설정인지는 명시하지 않는다.

## OData와 legacy ODP

2026-10-16 확인한 Palantir 문서는 SAP Note 3255746 v11(2026-04) 및 2026-06 patch와 관련해 비 SAP ODP RFC 접근의 제한을 설명하며 OData 경로를 요구했다. 2026-11-14 확인한 커넥터 문서는 버전과 날짜 없이 SAP가 ODP-RFC 접근을 제한하고 있으며, 승인되지 않은 ODP-RFC 호출을 거부하는 SAP 보안 패치가 적용되면 ODP API를 쓰는 SLT sync가 실패하므로 OData로 옮기라고 적는다. 이는 Palantir 문서의 설명이지 독립적으로 확인한 SAP 라이선스/법률 해석이 아니다. 적용 시 현재 SAP 원문과 계약을 확인한다.

OData 경로는 Palantir add-on 2.34 이상, PALODATA와 SAP_BASIS 7.50 SP09 등 조건을 확인한다. 2026-11-14 확인한 커넥터 문서는 add-on이 지원하면 새 sync의 API version 기본값을 OData로 둔다. active subscription은 table과 source가 인증하는 SAP 사용자 조합마다 하나다. 같은 table을 두 sync가 독립적으로 받아야 하면 SAP 사용자를 나눈다. legacy ODP가 복수 subscription을 지원했던 사실을 현재 허용 범위로 적용하지 않는다.

remote context와 parallel paging의 legacy ODP 조건을 OData에 그대로 대입하지 않는다. worker restart trigger는 권장 약 1분 조건(이전 streaming 설정 페이지 기준, 현재 문서에서 미확인)을 확인하고 streaming 중단/복구와 queue 보존을 함께 설계한다.

## 배치 sync 설정

2026-11-14 확인한 커넥터 문서 기준으로 배치 sync를 만들 때 고르는 객체 유형은 둘이다. SLT Replication Server는 원본 ERP의 데이터베이스 트리거로 복제된 table을 읽고, Local table은 SLT 시스템 자신의 table을 직접 읽는다. 증분 배치 sync의 Max rows per sync는 실행당 반환 행 수의 대략적인 상한이며, 큰 table의 초기 sync를 네트워크 장애 같은 간헐 오류에 덜 취약한 여러 번의 작은 실행으로 나눌 때 쓴다.

## reset의 영향

Reset queue registration은 현재 sync 자신의 구독만 초기화하며 다른 sync가 가진 구독을 넘겨받지 못한다. 켜 두면 배치는 실행마다 전체 reload가 되고, streaming은 polling 요청마다 전달돼 stream이 반복 초기화될 수 있으므로 꺼 둔다. 재적재는 배치에서 Reset incremental state, streaming에서 Force snapshot으로 한다. Force snapshot은 stream이 시작될 때마다 적용되므로 전체 전송 뒤 끄고 저장한다. 충돌 해소는 [[Palantir-SAP-SLT-Queues-and-OData-Migration#구독 충돌|SAP SLT 구독 충돌]]을, ODP에서 OData로 stream을 옮기는 절차는 [[Palantir-SAP-SLT-Queues-and-OData-Migration#기존 stream의 ODP에서 OData 전환|SAP SLT stream 전환]]을 따른다. 성공 응답을 받았다는 사실과 의도한 incremental 흐름으로 복귀한 것은 별도로 확인한다.

## 출처

- [Palantir, sap-slt](https://www.palantir.com/docs/foundry/available-connectors/sap-slt)
- [Palantir, configure-sap-slt](https://www.palantir.com/docs/foundry/sap/configure-sap-slt) — 2026-11-04 LTRC 구성의 Queue Alias와 context 사용, Source System의 RFC 연결, Post-Installation Wizard 권장과 입력 항목 대조
- [Palantir, migrate-slt-to-odata](https://www.palantir.com/docs/foundry/sap/migrate-slt-to-odata) — 2026-11-14 테이블과 SAP 사용자별 구독, 충돌 해소와 stream 전환 절차 대조

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-SAP-SLT-Queues-and-OData-Migration|SAP SLT 큐와 OData 구독 계약]]
