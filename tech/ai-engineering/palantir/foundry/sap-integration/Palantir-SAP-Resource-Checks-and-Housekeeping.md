---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SAP 리소스 검사와 상태 정리"]
---

# SAP 리소스 검사와 상태 정리

## 기본값을 확정하기 전

같은 공식 문서 묶음에 CPU load 80/50, memory free 5/20, free process 1/5와 Cockpit의 CPU 95/memory 11 같은 값이 함께 나온다. Page size도 일반 매개변수 10,000과 ERP/SLT 50,000이 섞인다. BEX engine의 기본 V2와 활성화 설명, extractor 기본값 표기도 일치하지 않는다. 현재 설치 버전과 실제 설정을 읽어야 하며 한 표를 전역 기본값으로 채택하지 않는다.

Resource check는 CPU, 메모리와 DIA/BG 가용성을 확인한다. ALL 조건의 일부 설명은 모든 서버가 충분하다는 뜻이 아니라 이용 가능한 서버를 찾는 동작이다. CPU_IDLE 설명도 이름과 반대 방향으로 읽힐 수 있어 실제 기준 확인이 필요하다. Sync를 통과시키려고 일괄 비활성화하면 SAP 부하를 늘릴 수 있다.

## 로그의 수명과 재처리 상태

- 설치가 housekeeping을 자동으로 켜 주지는 않는다. 로그, paging, subscription과 증분 상태는 서로 다른 정리 대상이다.
- Housekeeping의 30일 보존과 10일 interval은 문서상 30~40일 구간을 대상으로 하는 창이다. 모든 오래된 데이터가 한 번에 정리된다고 확대하지 않는다.
- Cockpit clear logs에는 low relevance 31일, high relevance 365일, 매 24시간 실행이라는 별도 기본값이 있다. 다른 프로그램의 45일 매개변수와 합쳐 하나의 보존 정책으로 만들지 않는다.
- Only if transferred 설명은 전송된 데이터만 지운다는 문장과 미전송 데이터도 지운다는 문장을 함께 담고 있어 모순된다. 이 옵션을 미전송 상태 보호의 증거로 삼지 않는다.
- Close SLT requests, unused subscription 제거와 LOG01INIT 정리는 지원 대응용 의미를 가진다. 진행 중인 소비자/포인터를 확인하지 않은 일상 정리로 취급하지 않는다.

DB 로그와 SLG 로그, trace level과 debug background process도 다르다. 경고 수준에서 포함되는 정보와 PARAMINFO 예외를 확인하고 민감한 매개변수, 백업과 로그 접근을 제한한다. 이 문서는 문서의 차이를 보존한 것으로 실제 운영 시스템의 리소스 한계나 정리 결과를 측정하지 않았다.

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
