---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SAP 추출 타입과 증분 식별 계약"]
---

# SAP 추출 타입과 증분 식별 계약

## 객체별 의미

ERP 커넥터는 테이블, CDS/HANA 뷰, T-code와 Function 등 서로 다른 객체를 다룬다. T-code와 Function 추출은 snapshot 방식이다. CDS 매개변수는 이름과 필수 입력을 정확히 맞춰야 하며, 알려지지 않거나 빠진 매개변수는 실패할 수 있다. HANA 외부 뷰는 ABAP Dictionary 타입 매핑과 ADT 정의를 확인한다.

Extractor는 ODP 노출과 활성화, source/RFC context가 필요하다. 개요의 넓은 지원 설명과 세부 문서의 원격 연결 제약을 하나의 무조건 지원 주장으로 합치지 않는다. SP20 이후 다중 context를 사용할 때 기본 context의 fallback과 명시한 source를 구분한다.

## 증분 기준과 행의 동일성

- 단조 증가 키나 일시를 사용하는 append는 원본의 변경 전체를 자동 추적하는 CDC와 다르다. 여러 필드의 ANY 이상 비교와 필드를 이어 붙인 사전식 비교도 다르다.
- 날짜 기준의 `>=` 비교는 경계 중복을 만들 수 있다. 기본키와 적절한 변경시각을 이용하는 중복 제거가 필요하다. CDHDR/CDPOS나 twin table은 별도 변경 근거다.
- snapshot만 수행해 증분 추적 상태가 없다면 첫 append에서 전체를 다시 읽을 수 있다. 상태 초기화는 파일 대체를 수반하는 전체 snapshot과 연결되므로 단순 재시도로 취급하지 않는다.
- Max rows per sync는 대략적인 실행 단위 분할이다. 정확한 LIMIT 결과 수를 보장하지 않는다. 초기 대량 적재를 여러 실행으로 나눌 때 기준 키와 재시도 중복을 함께 고려한다.

## 필터와 파일의 함정

SAP 관리자의 전역 prefilter는 Foundry가 요청한 필터에 추가된다. 탐색 화면에서 보이는 요청만으로 실제 추출 범위를 판단하지 않는다. Dynamic filter 문서는 YYYYMMDD라는 설명과 다른 순서의 날짜 예제를 함께 담고 있어 실제 값과 버전의 검증이 필요하다.

T-code spool은 큰 출력과 소계 행의 영향을 받는다. STXL 장문은 압축 CLUSTD를 일반 문자열로 읽는 것이 아니며 SP16 이후 해제 경로와 TDOBJECT/TDID 범위 제한을 고려한다. DMS 경로가 이미 존재하면 건너뛰는 방식에서는 같은 경로의 내용 교체가 자동 반영된다고 가정하지 않는다.

일부 오래된 configure URL은 현재 동일한 ERP 커넥터 본문을 반환했다. URL 이름만으로 과거 개별 계약을 복구했다고 주장하지 않는다.

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
