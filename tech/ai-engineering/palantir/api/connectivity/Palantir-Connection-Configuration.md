---
tags: [palantir, foundry, api, connectivity, configuration]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 외부 시스템별 Connection Configuration

Platform API의 configuration은 s3/rest/snowflake/databricks/smb/jdbc union이다. 아래 값은 Palantir endpoint 명세에 적힌 기본값과 제약이며 공급자 SDK 최신 기본값을 별도 검증한 결과는 아니다. secret 표현과 Worker는 [[Palantir-Connection-API]]를 따른다.

## S3와 S3 호환 시스템

bucketUrl은 필수이고 끝의 `/`를 포함한다. matchSubfolderExactly 기본 false이면 bucket 전체를 sync하며 true일 때 bucket URL에 지정한 subfolder만 sync한다고 설명한다. prefix가 자동으로 범위를 제한한다고 가정하지 않는다.

인증은 access key ID+암호화 secret, cloudIdentityRid 또는 OIDC(audience/issuerUrl/Connection RID subject)다. 공개 AWS S3 bucket은 authenticationMode가 없어도 연결 가능하다. optional STS role 설정에는 roleArn과 roleSessionName이 필수이며 externalId, endpoint와 duration을 추가할 수 있다.

STS roleSessionDuration은 900초부터 role의 최대 session duration까지이며 최대 설정은 1~12시간이다. 예제 duration 30초는 이 설명과 맞지 않으므로 실행값으로 복사하지 않는다. 지역 STS endpoint는 지연/중복성과 token 유효성 이유로 권장한다고 명세가 설명한다.

| optional 설정 | Palantir 명세 기본값/용도 |
|---|---|
| connectionTimeoutMillis | 최초 연결 10,000 ms |
| socketTimeoutMillis | 열린 연결의 전송 대기 50,000 ms |
| maxErrorRetry | 실패 요청 재시도 3회 |
| maxConnections | sync당 HTTP 연결 최대 50 |
| enableRequesterPays | 기본 false, requester-pays header 사용 |
| clientKmsConfiguration | client-side KMS key와 optional region |
| s3Endpoint/region | AWS 외 S3 호환 endpoint와 bucket region |
| s3EndpointSigningRegion | custom endpoint가 별도 signing region을 요구할 때 |

KMS configuration 객체 안의 kmsKey는 필수다. region과 region을 포함한 custom endpoint를 함께 지정하면 예상 밖 동작이 있을 수 있다고 경고한다. proxy는 host/port를 별도로 지정하며 HTTP/HTTPS protocol 기본 HTTPS, optional credentials와 wildcard 가능한 nonProxyHosts를 받는다.

## REST는 허용 Domain과 인증을 함께 지정한다

domains는 schema상 optional 배열이지만 설명은 적어도 하나를 요구한다. 각 domain의 host는 필수, scheme 기본 HTTPS와 optional port/auth를 사용한다. 인증이 있으면 scheme은 HTTPS여야 한다.

auth는 bearer token, API key(headerName 또는 queryParameterName), basic username/password, OAuth2다. OAuth2는 Control Panel의 outbound application과 oauth2ClientRid가 필요하다. 연결 하나가 사용할 outbound application은 하나이며 이를 바꾸면 OAuth2로 설정한 모든 domain에 적용된다.

additionalSecrets는 코드/webhook에서 참조하는 별도 secret들이다. REST 구성에서 인증을 생략하는 것은 외부 시스템이 인증을 요구하지 않는다는 요청 설정이며 Foundry 자체 인증 면제와 관계없다.

## Snowflake, Databricks와 JDBC

Snowflake는 accountIdentifier와 authenticationMode가 필수다. schema/database/warehouse를 생략하면 빈 문자열, role을 생략하면 driver 시작 시 role을 쓰지 않는다고 설명한다. 지정 role은 사용자에게 이미 부여되어야 하며 schema/database/warehouse 권한도 있어야 한다.

Snowflake 인증은 externalOAuth, user+privateKey의 keyPair, basic이다. external OAuth 조회 설정에는 audience/issuer/subject가 있지만 create의 externalOauth에는 해당 child 입력이 열거되어 있지 않다. 조회 schema를 그대로 create 입력의 필수값으로 확대하지 않는다.

Databricks는 hostName과 compute httpPath, authentication이 필수다. workflowIdentityFederation은 권장 방식이며 Foundry를 IdP로 신뢰하는 federation policy가 필요하다. optional servicePrincipalApplicationId가 있으면 service principal federation policy, 없으면 account federation policy로 token을 교환한다. 조회 응답에는 issuer/audience/subject도 포함될 수 있지만 create 입력은 audience와 optional application ID를 받는다.

다른 Databricks 인증은 OAuth M2M(clientID/clientSecret), PAT, basic이다. 일반 JDBC는 url과 fully-qualified driverClass, optional credentials와 jdbcProperties를 받는다. Snowflake/Databricks에도 JDBC properties를 추가할 수 있지만 모두 비암호화 property 전용이다.

## SMB의 경로와 서명

SMB hostname에는 IP/local network name/FQDN을 쓰고 `https://`나 `smb://` 같은 protocol을 포함하지 않는다. port 기본 445, share와 username/password 인증은 필수다. Windows domain 기본값은 WORKGROUP이며 baseDirectory를 지정하면 모든 read/write가 그 하위에서 이뤄진다.

optional proxy는 hostname/port와 HTTP/SOCKS protocol이다. requireMessageSigning 기본 true이며 서버가 서명을 지원하지 않으면 연결이 실패한다. 안정적 연결을 위해 임의로 검증/서명을 끄는 기본값으로 바꾸지 않는다.

이 문서는 공개 schema 학습이며 실제 공급자 인증, 네트워크나 connection test를 수행하지 않았다.

## 출처

- [Palantir, Create Connection 입력 schema](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/connections/create-connection)
- [Palantir, Get Configuration 조회 schema](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/connections/get-configuration)
