---
tags: [palantir, hyperauto]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# HyperAuto 소스와 생성 자원 소유

## Metadata 기반 자동 생성

HyperAuto(SDDI)는 source metadata를 이용해 sync, Pipeline Builder 변환과 선택적 Ontology를 생성한다. V2의 검증일 지원 source는 SAP이며 Salesforce/NetSuite는 V1 경계에 남는다. 자동 생성은 업무 의미와 보안 검토를 대신하지 않는다. AIP input suggestion은 workflow 설명을 바탕으로 후보 table과 이유를 제안한다.

기존 sync가 여럿이면 최근 sync가 기본 선택되며 사용자가 다른 sync나 신규 생성을 고를 수 있다. 새 sync는 초기 수집을 끝내야 다음 생성 단계가 진행되므로 전체 시간이 길어질 수 있다. HyperAuto pipeline과 입력 dataset은 같은 project에 둔다.

## SAP와 folder 입력

직접 SAP 연결은 ECC/S4HANA와 direct, SLT, remote context를 구분한다. Streaming에는 SLT가 필요하다. 문서의 최소 요구는 magritte-sap-source 1.25.0, Foundry SAP Connector SP26(2.26.0)이며 실제 배포와 호환 조건을 확인한다.

직접 연결이 없으면 raw SAP table dataset과 DD02L, DD02T, DD03L, DD04T, DD05S, DD08L data dictionary를 같은 folder 바로 아래 둔다. 입력은 기술적 열 이름을 유지한 미변환 추출이어야 하고 dictionary는 raw/unfiltered여야 한다.

Table 이름과 dataset 이름이 맞으면 자동 mapping하기 쉽다. Undiscovered table은 수동 mapping이 필요하며, unmapped 입력은 pipeline 생성 때 무시된다. 목록에 추가됐다는 사실과 실제 처리 대상이 됐다는 사실을 구분한다.

## 생성 자원의 변경 계약

HyperAuto가 만든 sync와 builder pipeline은 HyperAuto가 소유하므로 직접 바꾸면 후속 생성과 충돌한다. Pipeline Builder 화면은 로직을 검토하는 데 쓰고 변경은 HyperAuto Configuration에서 proposal로 만든다. Pipeline당 한 proposal만 존재한다.

Proposal의 Changes를 확인하고 merge한 뒤 Main branch 배포까지 해야 출력에 변경이 반영된다. Merge만으로 배포 완료를 판단하지 않는다. 필요 시 HyperAuto pipeline 자원을 삭제하면 builder pipeline의 관리 소유를 해제해 직접 수정할 수 있지만 자동 관리 이점과 변경 책임이 달라진다.

## 출처

- [Palantir Foundry, hyperauto](https://www.palantir.com/docs/foundry/hyperauto/)
- [Palantir Foundry, aip](https://www.palantir.com/docs/foundry/hyperauto/aip/)
- [Palantir Foundry, architecture](https://www.palantir.com/docs/foundry/hyperauto/architecture/)
- [Palantir Foundry, folder-based-sap](https://www.palantir.com/docs/foundry/hyperauto/folder-based-sap/)
- [Palantir Foundry, getting-started](https://www.palantir.com/docs/foundry/hyperauto/getting-started/)
- [Palantir Foundry, overview](https://www.palantir.com/docs/foundry/hyperauto/overview/)
- [Palantir Foundry, proposals](https://www.palantir.com/docs/foundry/hyperauto/proposals/)
- [Palantir Foundry, supported-sources](https://www.palantir.com/docs/foundry/hyperauto/supported-sources/)

## 관련 문서

- [[Palantir-Foundry-HyperAuto]]
