---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SAP writeback과 OAuth 실행 경계"]
---

# SAP writeback과 OAuth 실행 경계

## 요청 형식과 업무 성공

SAP Function writeback은 원격 부작용이다. Foundry 데이터셋 트랜잭션이 실패했다고 SAP 변경도 함께 rollback된다는 보장은 없다. 재시도에는 업무 키, 중복 방지와 결과 대사가 필요하다.

- Webhook task 형식은 function-name, inputs와 output을 사용하며 단일/배열 입력과 단일/복수 출력의 모양이 다르다. 단일 출력은 행 목록, 복수 출력은 출력 이름별 객체다.
- Parallel 응답은 입력별 ROWNO(1부터), OUTPUT과 MSG를 포함한다. 메시지에는 성공, 오류, 경고와 중단 등이 구분된다. HTTP 성공만 검사하면 SAP 업무 오류를 놓칠 수 있다.
- Webhook writeback의 commit 기본값 true와 batch Function 추출의 호출 후 commit 기본값 off를 혼동하지 않는다. 비어 있는 parallel 설정 블록도 병렬 실행을 활성화할 수 있다.
- Raw REST의 function writeback은 input과 output 배열, parallel_writeback은 bulkinput과 병렬 매개변수를 사용한다. Webhook task DSL과 키를 서로 복사하지 않는다.
- API v2 전제와 재시도 설정은 애드온 버전에 의존한다. bulk/parallel 방식은 문서상 OAuth를 지원하지 않는다. driver collect 예제를 대량 처리의 확장성 보장으로 해석하지 않는다.

## 사용자 위임과 기술 사용자

OAuth writeback은 SAP가 인증 서버, Foundry가 클라이언트인 authorization code 흐름이다. 사용자에게 실제 SAP Function 실행 권한이 있어야 한다. 기술 사용자의 서비스 권한과 최종 사용자의 콘텐츠 권한을 구분한다.

일반 연결에서는 토큰 요청의 서버 경로와 사용자가 여는 SAP 인증 페이지의 브라우저 경로가 다르다. Data Accelerator용 beta 구성은 동일 ERP source의 token/refresh webhook을 사용하며 해당 Function 설정과 outbound application 연결을 꺼 순환 의존을 피한다. 실제 source가 Foundry worker여도 outbound 설정 화면에서 Legacy라는 webhook 유형을 고르는 절차가 문서에 남아 있다.

토큰 webhook 입력은 client ID, redirect URI, authorization code와 조건부 PKCE code verifier다. Refresh에는 client ID와 refresh token이 쓰인다. 출력 access_token/scope와 선택적 token_type/expires_in/refresh_token은 이 webhook 계약에서 문자열로 선언된다. 일반 OAuth의 expires_in 타입을 보고 임의로 숫자로 바꾸지 않는다.

SAP 서비스별 CSRF 설정 지침은 해당 통합의 전제다. 전체 SAP 서비스의 보호를 일괄 해제하라는 일반 보안 권고로 확대하지 않는다. 문서 예제와 실제 인증/쓰기 실행은 별도로 검증해야 한다.

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
