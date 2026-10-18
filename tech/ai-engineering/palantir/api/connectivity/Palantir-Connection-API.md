---
tags: [palantir, foundry, api, connectivity, secrets]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Connection 생성과 Secret, Export의 경계

Connection은 외부 시스템/API와 Foundry의 연결이며 source라고도 부른다. Connection RID는 외부 데이터 자체나 동기화 실행의 RID가 아니다. 연결 설정의 공급자별 조건은 [[Palantir-Connection-Configuration]]에서 다룬다.

## 생성과 Worker

`POST /api/v2/connectivity/connections`는 direct connection runtime의 연결을 만든다. 필수 입력은 parentFolderRid, configuration, 비어 있지 않은 displayName과 worker다. create 예제는 worker를 생략하지만 schema는 필수이므로 예제만 복사하지 않는다.

worker는 Foundry worker를 사용한다. unknownWorker는 이전/잘못된 설정을 조회할 때 나타날 수 있으나 create/update 입력으로 사용할 수 없다. Foundry worker의 networkEgressPolicyRids로 direct/agent proxy egress 정책을 구성하는 계약을 확인한다.

응답은 Connection RID, parent folder, displayName, configuration, worker와 exportSettings다. 읽은 configuration이 모두 쓰기 가능한 것은 아니다. 예를 들어 JDBC의 uploadedJdbcDrivers는 별도 업로드 endpoint로 관리하고 unknownWorker도 그대로 재전송하지 않는다.

## 읽기와 Batch 누락

`GET /connections/{connectionRid}`는 전체 연결, `GET /connections/{connectionRid}/getConfiguration`은 설정만 반환하는 가벼운 조회다. `POST /connections/getConfigurationBatch`는 최대 200개를 받아 Connection RID map을 돌려준다. 없거나 token의 권한이 부족한 연결은 응답에서 생략된다.

조회 scope는 `api:connectivity-connection-read`, 생성/secret/export/driver 변경은 `api:connectivity-connection-write`다. 잘못된 property blank, 지원하지 않는 connection type/worker, 없는 parent folder/connection과 작업 권한 오류를 구별한다. ConnectionTypeNotSupported는 Foundry에 해당 연결이 없다는 뜻이 아니라 Platform API 미지원일 수 있다.

## Secret은 읽기와 쓰기 표현이 다르다

암호화 property를 읽으면 실제 비밀값 대신 secret name을 반환한다. 쓸 때는 asPlaintextValue로 새 값을 암호화 저장하거나 asSecretName으로 기존 값을 유지한다. secret name을 보낼 때는 그 property의 기존 secret name과 같아야 한다. 다른 secret 이름으로 임의 참조를 바꾸는 계약이 아니다.

`POST /connections/{connectionRid}/updateSecrets`의 secrets는 이미 연결에 설정된 이름에서 plaintext 값으로 가는 map이다. 요청에서 빠진 기존 secret은 유지되며 없는 이름은 SecretNamesDoNotExist다. 연결의 새 secret schema를 만드는 동작과 값 교체를 구별한다.

공식 명세는 생성/secret 갱신 시 네트워크 전송은 TLS, 저장은 암호화지만 서버 처리를 위해 메모리에서 일시 plaintext로 유지되고 garbage collection 때 정리된다고 설명한다. 이 처리를 피하려면 Foundry UI를 쓰라고 안내한다. API 호출에 없는 client-side encryption 보장을 덧붙이지 않는다.

REST의 additionalSecrets는 쓰기 시 이름→plaintext map(asSecretsWithPlaintextValues), 읽기 시 이름 목록(asSecretsNames)으로 다르다. 일반 JDBC jdbcProperties는 비암호화 값만 허용하므로 secret을 거기에 넣지 않는다.

## Export는 별도 보안 결정이다

`POST /connections/{connectionRid}/updateExportSettings`는 exportSettings를 받으며 **Information Security Officer 역할 사용자만** 변경할 수 있다. write scope만으로 충분하지 않다.

exportsEnabled는 Foundry dataset의 외부 export 허용 여부다. exportEnabledWithoutMarkingsValidation은 일부 interactive workflow에서 Marking 검증을 수행할 수 없을 때도 export를 허용하는 설정이며, 사용자가 조직 정책 준수를 책임지는 조건이다. import 가능 여부나 일반 네트워크 egress 허용과 혼용하지 않는다.

## JDBC Driver 업로드

`POST /connections/{connectionRid}/uploadCustomJdbcDrivers`는 기존 JDBC 연결에 driver를 올린다. fileName query는 `.jar`로 끝나야 하고 body는 binary, Content-Type은 application/octet-stream이다. 응답은 갱신된 Connection이다. 일반 JSON body를 보내는 wrapper와 분리한다.

공개 명세 검토이며 실제 secret, export 설정이나 외부 연결을 변경하지 않았다. 실행 시 공통 권한/오류는 [[Palantir-API-Client-Contract]]와 함께 확인한다.

## 출처

- [Palantir, Create Connection](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/connections/create-connection)
- [Palantir, Get Connection](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/connections/get-connection)
- [Palantir, Get Configuration](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/connections/get-configuration)
- [Palantir, Get Configuration Connections Batch](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/connections/get-configuration-connections-batch)
- [Palantir, Update Secrets For Connection](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/connections/update-secrets-for-connection)
- [Palantir, Update Export Settings](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/connections/update-export-settings-for-connection)
- [Palantir, Upload Custom JDBC Drivers](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/connections/upload-custom-jdbc-drivers-connection)
