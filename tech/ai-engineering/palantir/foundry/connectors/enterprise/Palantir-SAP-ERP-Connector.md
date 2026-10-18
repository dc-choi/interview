---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# SAP ERP의 추출 유형과 실행 결과

SAP ERP와 legacy Custom source, SLT streaming을 구별한다. ERP는 ECC/S4 on-premise/private-cloud 조건과 Palantir add-on 설치를 확인한다. 문서의 SAP 예제 명령을 실행하거나 운영 계정 권한을 변경한 기록은 아니다.

## 추출과 연결

CDS/HANA는 direct, BW extractor는 remote context, table/function/transaction은 양쪽의 지원 차이를 확인한다. direct와 remote gateway는 같은 접속 필드가 아니다. legacy Custom source에서 parameterized CDS가 지원되지 않는 조건을 신규 ERP의 WithParameters 지원에 적용하지 않는다.

신규 ERP의 page size 기본 50,000, 최소 5,000과 legacy source의 최소 50,000을 구별한다. 최대 row는 근삿값이며 file max bytes는 Parquet buffer 128MB의 두 배 이상 조건을 따른다. unexpected value를 null로 바꾸고 경고만 남기는 옵션은 데이터가 정제됐다는 보장이 아니다.

function 추출은 TABULAR output과 SERVICE_USER/CONTENT_FUNCTION_ALL 및 함수별 권한을 확인한다. transaction 결과가 2GB를 넘으면 spool 경로가 필요할 수 있다. legacy spool은 모든 값을 string으로 읽는 제약이 있다.

## incremental과 reset

증분 열의 `>=`는 경계 중복이 생기므로 dedup가 필요하다. 여러 column의 OR와 date/time 이어 붙이기는 다른 조건이다. CDHDR/CDPOS join은 insert 누락 가능성과 twin-join 조건을 확인한다. BEx/function에 같은 incremental을 가정하지 않는다.

BW request 기반은 non-compressed request 조건이며 compressed이면 full load가 다시 필요할 수 있다. legacy reset은 SNAPSHOT/reset=true 실행 뒤 flag 제거/APPEND 복귀, 신규 toggle은 한 번 실행 뒤 해제를 확인한다. reset을 남기면 반복 reload가 될 수 있다.

## webhook과 Function 호출

HTTP 성공과 SAP business 성공은 다르다. RETURN과 메시지별 TYPE S/E/W/I/A를 확인한다. webhook commit 기본 true와 function-module batch commit 기본 off를 구별한다.

webhook v2의 bulk/multiple output은 add-on 2.29 이상 조건이다. api-version 생략은 v1의 단일 입출력 경로다. v2에서 retries-per-request>0 설정은 제거하는 안내를 따른다.

input array가 두 개 이상이거나 빈 parallel block을 두면 병렬이 활성화될 수 있다. 기본 3 jobs, job당 4 calls와 1-based ROWNO로 입력/결과를 연결한다. OAuth bulk parallel 제약도 확인한다.

## 부가 기능과 운영

Data Accelerator Beta는 Foundry worker의 control/data plane, Palantir certificate와 virtual host/port를 구성한다. 사용자 OAuth의 outbound task는 별도 흐름이다.

DMS media sync Beta는 기존 항목 제외, path/default .pdf, document type/size 조건을 확인한다. 코드의 get_documents/get_document는 실제 MediaSet 저장과 별개로 결과를 연결해야 한다. metadata endpoint로 BAPI 구조를 확인한다.

dynamic keyword는 SP26, BEx member limit은 SP22 조건과 기본 200/최소 2를 확인한다. 과부하 진단에는 SAP background job/resource/load 검사를 포함하되 debug 옵션으로 검사를 끄는 효과를 이해한다.

## 출처

- [Palantir, sap-erp](https://www.palantir.com/docs/foundry/available-connectors/sap-erp)
- [Palantir, sap-custom-source](https://www.palantir.com/docs/foundry/available-connectors/sap-custom-source)

## 관련 문서

- [[Palantir-Connector-Contracts]]
