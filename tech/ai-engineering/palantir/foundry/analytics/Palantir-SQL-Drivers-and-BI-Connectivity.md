---
tags: [palantir, jdbc, odbc, sql, analytics]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry SQL 드라이버와 BI 연결"]
---

# Foundry SQL 드라이버와 외부 BI 연결

Foundry의 ODBC/JDBC 연결은 dataset을 SQL로 읽는 경로다. Ontology 객체 조회나 Action 쓰기의 대체 인터페이스가 아니다. JDBC를 지원하는 클라이언트라면 JDBC를 우선 검토하고, 실제 앱의 지원 방식과 인증을 함께 맞춘다.

## 실행 엔진과 driver의 계약을 분리한다

SQL은 join, filter와 집계를 지원하지만 결과 크기와 backend 실행 한도를 가진다. Architecture 안내의 Spark/Direct Read 설명은 이전 구현의 조건이며, 현재 Furnace로의 전환은 사용자의 연결 변경 없이 진행되는 것으로 안내된다.

이전 Direct Read는 View가 아닌 dataset, Parquet/CSV/Avro/Soho 같은 지원 형식, 단순 projection에 적용됐다. Aggregate, filter, join, order나 array/map/struct 선택은 이 경로에 적합하지 않았다. 이 조건을 현재 모든 SQL query의 제한으로 옮기지 않는다. 이전 Spark 경로의 driver-memory 제약도 같은 맥락에서 읽는다.

확인일 다운로드 페이지는 ODBC/JDBC 3.41.0과 Tableau connector 2.6.0을 제공한다. 설치 버전과 client compatibility를 별도로 확인한다.

- ODBC는 Windows 64-bit, 관리자 설치와 Visual C++ redistributable이 필요하다.
- JDBC는 Windows/macOS/Linux에서 사용한다. Java 11~15는 기본 실행 경로이며 Java 16 이상은 Arrow memory 접근을 위한 `--add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED` 설정을 확인한다.
- JDBC driver class는 `com.palantir.foundry.sql.jdbc.FoundryJdbcDriver`다.

## 연결과 타입 해석

ODBC의 `BaseUrl`과 `Pwd`, JDBC의 URL과 `Password`를 혼동하지 않는다. `Branch`의 문서상 기본값은 `master`다. Dataset의 branch와 실제 연결 기본값을 확인하며 임의로 `main`으로 바꾸지 않는다. Catalog는 전체 project 경로로 dataset browser의 범위를 지정한다.

JDBC의 jar 옆 `foundry.ini`는 high-priority 항목으로 connection string을 덮어쓸 수 있고 low-priority 항목은 connection string 아래에 적용된다. UI에 입력한 값과 유효 설정이 다르면 이 파일을 확인한다.

| 데이터/설정 | 의미 |
|---|---|
| Timestamp | ODBC 기본값은 시스템 local timezone, `UtcTimestamps`로 변경한다. JDBC는 UTC이며 같은 옵션을 무시한다 |
| Array, map, struct | JSON 문자열로 노출된다 |
| Binary | ODBC는 `0x`가 붙은 hex 문자열, JDBC는 `byte[]` |
| Identifier | Spark의 backtick과 ANSI/ODBC의 double quote 차이를 query 작성 시 맞춘다 |
| Proxy/TLS | OS proxy 탐지와 필요 시 basic auth, `TrustStorePath`의 PEM certificate chain을 사용한다 |

## 개인 인증과 서비스 인증

`Token`, `OauthFlow`, `ClientCredentials`는 같은 운영 방식이 아니다. 개인 OAuth는 Windows desktop ODBC의 interactive flow이며 web runtime에 그대로 적용하지 않는다. Public third-party application이 우선 경로이고 confidential application도 가능하다. Redirect는 `http://127.0.0.1/foundrydriver/oauthredirect`다.

Client credentials는 confidential application의 service user로 실행한다. Application 구성만으로 dataset 권한이 생기지 않으므로 해당 principal에 필요한 권한을 부여한다. 앱이 직접 OAuth를 수행한다면 얻은 access token을 ODBC `Pwd` 또는 JDBC `Password`에 전달한다.

System DSN에 개인 token을 저장하면 그 DSN을 사용하는 다른 사용자에게 credential이 공유될 수 있다. DSN의 재사용 범위와 BI에 저장하는 credential의 소유자를 함께 설계한다.

## 클라이언트별 예외

| 클라이언트 | 설치와 연결에서 확인할 점 |
|---|---|
| Excel/Access | ODBC 연결의 password는 Foundry token이다. SQL을 직접 쓰지 않을 때 빈 navigator는 Catalog를 한 project로 제한해 해결할 수 있다. Access는 저장 credential과 table-name 규칙도 맞춘다 |
| Qlik Sense | Server의 System DSN에 `UserAgent=QLIKSENSE`가 필요하다. Token은 이후 connection에 둔다. Password 길이 제약은 connection string의 `PWD` 사용 경로로 처리하고 자동 생성 이름에 token이 남지 않게 한다 |
| MicroStrategy | 2021 Update 8 preview는 별도 JDBC, Update 9 이후는 Workstation/Library 내장 통합을 구분한다. macOS local dossier는 JDBC가 필요하다. Token 인증, Catalog와 고정 SPARK dialect 조건을 확인한다 |
| Microsoft Report Builder | September 2020 이후 desktop과 ODBC/token 연결을 사용한다. Dataset path/RID를 지정하며 저장 credential은 token 만료의 영향을 받는다 |

## 오류를 구분해서 진단한다

`IM003`/error 126은 Windows driver load와 Visual C++ dependency부터 확인한다. `InvalidDatasetCannotAccess`는 dataset/branch 부재와 접근 권한 모두 가능한 반면, `NotAuthorizedToReadInputs`는 입력 접근을 확인한다. `TooManyRows`는 결과 크기와 query 구조를 줄인다.

PKIX/SSL 오류는 OS trust와 TLS inspection의 certificate chain을 확인하고 신뢰한 full PEM chain을 trust store에 넣는다. JDBC의 SLF4J 1.x binding 부재는 logging이 NOP가 되는 문제이며 그 자체가 연결 실패를 뜻하지 않는다. ODBC debug logging은 모든 DSN에 영향을 주므로 재현 후 OFF로 돌린다.

## 출처

- [Palantir, Analytics connectivity overview](https://www.palantir.com/docs/foundry/analytics-connectivity/overview)
- [Palantir, Connectivity architecture](https://www.palantir.com/docs/foundry/analytics-connectivity/architecture)
- [Palantir, Driver downloads](https://www.palantir.com/docs/foundry/analytics-connectivity/downloads)
- [Palantir, ODBC and JDBC drivers](https://www.palantir.com/docs/foundry/analytics-connectivity/odbc-jdbc-drivers)
- [Palantir, Identify a dataset RID](https://www.palantir.com/docs/foundry/analytics-connectivity/identify-dataset-rid)
- [Palantir, Excel](https://www.palantir.com/docs/foundry/analytics-connectivity/excel)
- [Palantir, MicroStrategy](https://www.palantir.com/docs/foundry/analytics-connectivity/microstrategy)
- [Palantir, Qlik Sense overview](https://www.palantir.com/docs/foundry/analytics-connectivity/qlik-sense-overview)
- [Palantir, Qlik Sense setup](https://www.palantir.com/docs/foundry/analytics-connectivity/qlik-sense-setup)
- [Palantir, Qlik Sense getting started](https://www.palantir.com/docs/foundry/analytics-connectivity/qlik-sense-getting-started)
- [Palantir, Report Builder overview](https://www.palantir.com/docs/foundry/analytics-connectivity/msft-report-builder-overview)
- [Palantir, Report Builder setup](https://www.palantir.com/docs/foundry/analytics-connectivity/msft-report-builder-setup)
- [Palantir, Report Builder getting started](https://www.palantir.com/docs/foundry/analytics-connectivity/msft-report-builder-getting-started)
- [Palantir, Troubleshooting ODBC/JDBC](https://www.palantir.com/docs/foundry/analytics-connectivity/troubleshooting-odbc-jdbc)

## 관련 문서

- [[Palantir-Power-BI-Publication|Power BI의 refresh identity]]
- [[Palantir-Tableau-Publication|Tableau의 viewer identity]]
- [[Palantir-Security-and-Governance|권한 경계]]
