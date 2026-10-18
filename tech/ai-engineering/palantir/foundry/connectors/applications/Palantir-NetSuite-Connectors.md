---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# NetSuite SuiteAnalytics, SuiteQL과 SuiteTalk 선택

SuiteAnalytics는 대량 relational read, SuiteQL은 더 작은 entity 범위의 빠른 REST query, SuiteTalk은 폭넓은 SOAP 접근이라는 차이가 있다. 같은 NetSuite 계정이라도 각 role, 통신 경로와 auth 지원을 따로 맞춘다.

## SuiteAnalytics

SuiteAnalytics Connect를 켜고 자체 JDBC driver `com.netsuite.jdbc.openaccess.OpenAccessDriver`를 제공한다. 이 Foundry 경로는 username/password 인증 조건을 따르며 Data Warehouse Integrator role의 TBA 지원을 자동 적용하지 않는다.

NetSuite2.com data source, custom role의 Connect와 table/list permission을 확인한다. Read All role만으로 이 계약이 충족되는 것은 아니다. 비 HTTPS port 1708, DNS/CIDR과 IP 변경을 고려한다.

JDBC AccountID/RoleID, `NegotiateSSLClose=false`, encrypted=1 설정을 확인한다. 일반 웹 API의 HTTPS 443 allowlist로 대체하지 않는다.

## SuiteQL과 SuiteTalk

두 경로는 integration의 TBA 활성화, client ID/secret과 token ID/secret을 설정한다. secret은 발급 시 한 번 표시될 수 있고 reset이 기존 token을 무효화할 수 있다. REST와 SOAP에서 허용되는 role/custom-field permission이 다르다.

SuiteQL schema는 초기 행 표본에서 발견하는 column과 hardcoded schema의 제약을 구별한다. RowScanDepth 기본 1,000을 조정할 수 있지만 0으로 전체 탐색하면 접근 불가 열 때문에 permission 오류가 발생할 수 있다.

SuiteTalk은 더 폭넓은 table/custom field를 다루지만 큰 table에서 느릴 수 있다. 제품 이름만으로 성능 수치나 모든 record type 지원을 보장하지 않는다.

## 출처

- [Palantir, netsuite-overview](https://www.palantir.com/docs/foundry/available-connectors/netsuite-overview)
- [Palantir, netsuite-suiteanalytics](https://www.palantir.com/docs/foundry/available-connectors/netsuite-suiteanalytics)
- [Palantir, netsuite-suiteql-jdbc](https://www.palantir.com/docs/foundry/available-connectors/netsuite-suiteql-jdbc)
- [Palantir, netsuite-suitetalk-jdbc](https://www.palantir.com/docs/foundry/available-connectors/netsuite-suitetalk-jdbc)

## 관련 문서

- [[Palantir-Connector-Contracts]]
