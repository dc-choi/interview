---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SAP 권한과 원본 타입 보존"]
---

# SAP 권한과 원본 타입 보존

## 권한 계층

서비스 실행 권한과 테이블, extractor, function 등 콘텐츠 접근 권한을 분리한다. 제공 역할을 임의 편집하기보다 문서의 역할 적용 조건을 확인하고 넓은 ALL/wildcard 예제를 실제 업무 범위로 제한한다. Writeback과 디버깅도 읽기 권한과 별개다.

SP16 custom authorization의 TABLE 설정은 기존 콘텐츠 PFCG 권한을 우회할 수 있다고 명시된다. 단순한 추가 필터라고 가정하지 말고 사용자, context와 include/exclude wildcard 범위를 함께 검토한다. 문서의 HANA 역할 이름이 HANAVIEW/HANANVIEW/HANA로 다르게 표기되는 곳은 정확한 설치 역할 확인이 필요하다.

## 타입 변환은 데이터 의미다

- NUMC의 앞자리 0은 식별자의 일부일 수 있다. 문자열 처리와 SP23 JSON 보존 옵션의 기본 false를 확인한다. Kernel/non-kernel 직렬화 변경은 새 초기 적재와 중복 제거를 요구할 수 있다.
- DATS는 날짜 형식, TIMS는 6자리 문자열이다. 시간을 날짜와 합칠 때 시간대 계약을 별도로 정한다. TIMS를 날짜 없는 전역 시각으로 단정하지 않는다.
- QUAN, DEC의 소수 자리와 길이를 임의로 같다고 보지 않는다. 기본 precision 문제의 QUAN→DEC 대안과 필드 길이 override는 실제 원본 값을 대조한다.
- 잘못된 숫자/날짜를 null로 만드는 ignore 옵션과 날짜를 문자열로 읽는 옵션은 서로 다르다. 적재 성공은 원본 값의 유효성 확인과 같지 않다.
- RFC client의 MANDT는 데이터 경계다. 운영 client와 다른 client의 레코드를 같은 집합으로 묶지 않는다.

## 추출 후 변형과 노출

Cockpit은 객체 유형/이름/필드별 regex masking, encryption, hashing과 원본/새 컬럼/숨김 출력을 설정한다. Masking은 읽은 뒤 수행되고, SAP prefilter는 추출 범위를 제한한다. 두 제어가 제공하는 경계가 다르다.

문서에는 AES12CBC라는 암호 알고리즘 표기와 MD5/SHA1/SHA256 선택지가 있다. 표기를 추정해 고치거나 오래된 알고리즘을 권장 보안 기준으로 제시하지 않는다. Hash는 낮은 엔트로피 식별자의 익명성을 자동 보장하지 않는다. 새 masked/encrypted/hashed 컬럼을 추가할 때 원본 컬럼이 함께 남는지도 확인한다.

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
