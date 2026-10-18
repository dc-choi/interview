---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# SAP SLT streaming과 OData 전환 조건

SAP SLT는 SAP ERP의 일반 batch sync와 달리 변경 queue를 stream으로 가져온다. ODQ polling 약 1초와 50,000 이하 단일 poll/그 이상 paging 조건, dialog process 수와 stream 수를 맞춘다. primary key partition을 통한 ordering 범위를 확인한다.

## OData와 legacy ODP

확인일 Palantir 문서는 SAP Note 3255746 v11(2026-04) 및 2026-06 patch와 관련해 비 SAP ODP RFC 접근의 제한을 설명하며 OData 경로를 요구한다. 이는 Palantir 문서의 설명이지 독립적으로 확인한 SAP 라이선스/법률 해석이 아니다. 적용 시 현재 SAP 원문과 계약을 확인한다.

OData 경로는 Palantir add-on 2.34 이상, PALODATA와 SAP_BASIS 7.50 SP09 등 조건을 확인한다. table당 active subscription 하나 제약이 있다. legacy ODP가 복수 subscription을 지원했던 사실을 현재 허용 범위로 적용하지 않는다.

remote context와 parallel paging의 legacy ODP 조건을 OData에 그대로 대입하지 않는다. worker restart trigger는 권장 약 1분 조건을 확인하고 streaming 중단/복구와 queue 보존을 함께 설계한다.

## reset의 영향

Reset queue registration을 켠 채 두면 새 등록/재배정으로 매 실행 전체 reload가 될 수 있다. 재등록 후 toggle을 끈다. Force Snapshot 역시 필요한 한 번 실행 후 해제한다. 성공 응답을 받았다는 사실과 의도한 incremental 흐름으로 복귀한 것은 별도로 확인한다.

## 출처

- [Palantir, sap-slt](https://www.palantir.com/docs/foundry/available-connectors/sap-slt)

## 관련 문서

- [[Palantir-Connector-Contracts]]
