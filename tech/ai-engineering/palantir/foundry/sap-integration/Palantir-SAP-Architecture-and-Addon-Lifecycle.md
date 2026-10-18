---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SAP 연결 경로와 애드온 수명주기"]
---

# SAP 연결 경로와 애드온 수명주기

## 연결과 실행 주체

Foundry SAP Connector는 SAP 애플리케이션 계층의 HTTPS 서비스를 통해 읽고 쓴다. ABAP에 등록한 HANA 외부 뷰를 읽는 경로도 SAP 데이터베이스에 직접 접속하는 커넥터와 구분한다. ERP 직접 연결, SLT Replication Server를 통한 연결, 이전 Remote Agent 경유 연결은 설치 위치와 RFC 문맥이 다르다.

- PALANTIR는 기반 컴포넌트, PALCONN은 주 커넥터, PALAGENT는 원격 연결용이다. SLT의 OData 경로에는 PALODATA가 필요하다.
- 컴포넌트의 support package 수준을 맞춘다. Support package는 SPAM, 해당 SP용 fix pack은 STMS 경로를 사용한다. 업데이트 중 동기화와 housekeeping이 잠금을 만들 수 있다.
- 설치를 수행하는 대화형 관리자와 서비스 호출용 기술 사용자는 다르다. 기술 사용자는 비대화형 System(Type B)이며 OAuth writeback에도 이 사용자 유형이 요구된다.
- 기본 지원 전제와 원격 시스템의 전제는 동일하지 않다. 원격 6.20 설치 안내를 현재 주 커넥터의 최소 버전으로 해석하지 않는다. SLT OData는 SAP_BASIS 7.50 SP09 이상이라는 별도 조건을 갖는다.

## 네트워크 경계

신규 연결은 Foundry worker를 권장하며 agent worker는 legacy로 표시된다. 사용자 인증, egress 정책, SAP 서버 인증서 신뢰는 별도 조건이다. 인증서 기반 agent 인증에 쓰는 No authentication 선택지를 SAP 서비스의 무인증 공개로 해석하지 않는다.

Data Accelerator는 beta 경로로 SAP Cloud Connector를 이용한다. 네트워크 경로를 바꾸며 SAP 객체의 권한과 동기화 의미를 대체하지 않는다. Foundry worker 대상이고 agent 경로용이 아니다. 가상 host/port와 선택적 Location ID, 클라이언트 인증서, 제어 및 동적 데이터 경로의 443 통신을 각각 확인한다.

## 상태를 가진 설치

SP13 이후 백업 ZIP에는 커넥터 테이블과 증분 포인터가 들어간다. 재설치 후 상태 복원은 연결 정보만 다시 입력하는 것과 다르며, 백업에는 민감한 설정과 키가 포함될 수 있다. 제거 시 기반 PALANTIR보다 종속 컴포넌트들을 먼저 제거하거나 함께 제거한다.

이 문서는 공식 문서의 계약을 대조한 기록이다. 실제 SAP 설치, 네트워크 연결과 복원 시험은 수행하지 않았다.

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
