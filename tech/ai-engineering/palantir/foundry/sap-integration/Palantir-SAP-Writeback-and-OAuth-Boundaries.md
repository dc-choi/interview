---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-11-14
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

SAP 쪽 OAuth 2.0 서버의 전제(2026-11-14 확인)는 다음과 같다.

- Connector 애드온 SP21 이상, SAP_BASIS 7.4 SP09 이상, 활성화된 SAP Gateway가 필요하다. Foundry 기술 사용자는 `SYSTEM` 유형이어야 한다.
- `/sap/public/bc` 노드 아래 서비스, 특히 `/sap/bc/sec/oauth2*`와 `/default_host/sap/bc/webdynpro/sap/oauth2_authority`를 활성화한다.
- `/PALANTIR/OAUTH_CLIENT` 역할은 기술 사용자와 writeback할 최종 사용자 모두에게, `/PALANTIR/CONTENT_FUNCTION_ALL`은 최종 사용자에게 준다.
- `SOAUTH2`에서 만드는 OAuth 2.0 Client ID와 User ID는 Foundry 기술 사용자의 SAP 사용자명이고, Client User ID and Password와 SSL Client Certificate를 모두 체크한다. Redirect URI는 `https://<FOUNDRY_DOMAIN>/workspace/oauth2-clients/callback`, scope는 `/PALANTIR/SRV_0001`이다. OData 서비스 `palantir`를 활성화하고 `/IWFND/MAINT_SERVICE`에서 system alias `LOCAL`을 둔다.

Foundry 쪽 outbound application은 SAP 연결 방식에 따라 둘로 나뉜다(2026-11-14 확인).

- agent proxy egress 경로: OAuth 2.0 server connection에서 Foundry Worker를 고르고, authorization과 token endpoint URL에 SAP HTTPS 포트를 포함한 `/sap/bc/sec/oauth2/authorize`, `/sap/bc/sec/oauth2/token`을 적은 뒤, SAP에 닿는 agent proxy egress policy를 지정한다.
- Data Accelerator 경로: 같은 ERP source에 `sap-erp-oauth2-token-webhook-task`와 `sap-erp-oauth2-refresh-webhook-task` webhook을 만들고, 두 webhook의 Function configuration을 꺼야 outbound application에서 고를 수 있다. 두 webhook의 Authorization은 outbound application을 고르지 않은 채 두어 순환 의존을 피한다. 실제 source가 Foundry worker여도 outbound 설정 화면에서는 Legacy 표시가 붙은 On-premise webhook 유형을 고른다. 확인한 문서는 이 경로에 beta 표시를 두지 않는다.
- 토큰 요청의 서버 경로와 사용자가 브라우저로 여는 SAP 인증 페이지의 경로는 다르다(해석). 문서는 Data Accelerator 경로에서 토큰 교환과 갱신은 Data Accelerator를 거치지만, 인증 페이지 URL은 사용자 브라우저에서 닿는 SAP 주소여야 한다고 적는다.

Data Accelerator 경로의 token webhook 입력은 client ID, redirect URI, authorization code와 조건부 PKCE code verifier다. Refresh에는 client ID와 refresh token이 쓰인다. 출력 access_token/scope와 선택적 token_type/expires_in/refresh_token은 이 webhook 계약에서 문자열로 선언된다. 일반 OAuth의 expires_in 타입을 보고 임의로 숫자로 바꾸지 않는다.

REST API source에 token/refresh webhook을 직접 만드는 예전 방식은 legacy 단계라 추가 개발이 예정되어 있지 않고, 기존 구성은 계속 동작한다. 이 방식은 SAP source URL이 HTTPS가 아니면 OAuth 흐름의 webhook이 실패한다. legacy token webhook 입력은 code verifier 없는 문자열 세 개(redirect_uri, client_id, authorization_code)이고, 출력 다섯 개는 모두 문자열로 둔다.

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
