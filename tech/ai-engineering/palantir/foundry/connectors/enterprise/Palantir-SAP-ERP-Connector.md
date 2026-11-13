---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-13
category: "AI엔지니어링(AIEngineering)"
---

# SAP ERP의 추출 유형과 실행 결과

SAP ERP와 legacy Custom source, SLT streaming을 구별한다. ERP는 ECC/S4 on-premise/private-cloud 조건과 Palantir add-on 설치를 확인한다. 문서의 SAP 예제 명령을 실행하거나 운영 계정 권한을 변경한 기록은 아니다.

## 추출과 연결

CDS/HANA는 direct, BW extractor는 remote context, table/function/transaction은 양쪽의 지원 차이를 확인한다. direct와 remote gateway는 같은 접속 필드가 아니다. legacy Custom source에서 parameterized CDS가 지원되지 않는 조건을 신규 ERP의 WithParameters 지원에 적용하지 않는다.

신규 ERP의 page size 기본 50,000, 최소 5,000과 legacy source의 최소 50,000을 구별한다. 최대 row는 근삿값이며 file max bytes는 Parquet buffer 128MB의 두 배 이상 조건을 따른다. 신규 ERP 페이지는 Max file size 기본값을 파일당 50,000행이라는 행 수로 적으므로, 바이트 기준 조건이 이 설정에 그대로 적용되는지는 미확인이다. unexpected value를 null로 바꾸고 경고만 남기는 옵션은 데이터가 정제됐다는 보장이 아니다.

sync 매개변수와 고급 설정 중 몇 가지는 하류 설계와 묶인다(2026-11-13 확인). Timestamp는 일반 매개변수, 소계 숨김은 T-code 매개변수, Avro 필드명 정리와 날짜 문자열 변환은 고급 설정에 있다.

- Timestamp는 동기화 실행 시각 `/PALANTIR/TIMESTAMP`와 레코드 순서 `/PALANTIR/ROWNO` 열을 더하며, 문서는 하류 중복 제거에 유용하다고 적는다. 증분의 `>=` 경계 중복을 지울 때 최신 행을 고르는 기준으로 쓸 수 있다(해석).
- Foundry streams가 쓰는 Avro 스키마 규칙에 맞게 필드명을 정리하는 옵션은 데이터셋을 streaming pipeline에서 쓸 때 필요하다. 배치에서만 쓰던 데이터셋을 나중에 스트리밍으로 옮기면 이 설정부터 확인한다.
- 날짜를 문자열로 받는 옵션은 SAP 날짜 필드에 파싱되지 않지만 업무 의미가 있는 값이 들어 있을 때 쓴다. 이 값을 null로 바꾸는 unexpected value 옵션과 달리 원래 값을 하류에서 해석할 수 있다.
- T-code 추출의 소계와 합계 행 숨김 옵션은 집계 행을 빼고 적재한다. 옵션 없이 받은 결과를 합산하면 소계가 중복 집계될 수 있다(해석).

객체 유형별 추가 입력은 실패 조건이 다르다(2026-11-13 확인).

- CDS View의 `WITH PARAMETERS` 값은 sync 시점에 이름과 값 쌍으로 넣는다. 이름은 CDS view에 선언한 이름과 맞아야 하며, 모르는 매개변수나 빠진 매개변수가 있으면 sync가 실패한다. 빈 행은 저장할 때 버려진다.
- Transaction Code는 Program type(트랜잭션 코드인지 ABAP report인지)이 필수다. Selection variant는 실행 전에 적용할 선택 조건이고, Output variant는 결과 목록의 구조를 정하는 layout이다. SAP 화면에서 쓰던 variant 이름을 그대로 넘기므로 SAP 쪽에서 variant를 바꾸면 적재 결과도 바뀔 수 있다(해석).
- Function Module은 Function input parameters를 IMPORTING 매개변수로 넘기며 대부분의 BAPI에 필요하다. Commit after function call은 호출 뒤 `COMMIT WORK`를 내며 기본은 꺼져 있다. commit에 기대어 변경을 저장하는 표준 BAPI는 이 옵션을 켜야 변경이 남는다.

dynamic filter(add-on SP26 이상)는 filter 값 자리에 `[TODAY]`, `[CURRENTYEAR]`, `[FIRSTDAYOFMONTH]`, `[LASTDAYOFLASTMONTH]` 같은 고정 keyword와 `[ADDDAY]`, `[ADDMONTH]`, `[GETDAY]` 같은 날짜 계산 함수를 쓰고, `[ADDDAY([TODAY], 1)]`처럼 중첩할 수 있다. 고정 날짜를 매번 고치지 않고 지난달 말일까지 같은 기간 조건을 schedule에 둘 수 있다(해석). 문서는 keyword를 언제, 어느 시간대 기준으로 계산하는지 적지 않는다. 날짜 열의 filter 값은 `YYYYMMDD` 형식으로 쓴다. 다만 같은 문서의 `[ADDDAY(22102022,1)]` 예시는 일월년 순서로 적혀 있어, 함수에 날짜 리터럴을 직접 넣을 때의 형식은 설치된 add-on에서 확인한다.

function 추출은 TABULAR output과 SERVICE_USER/CONTENT_FUNCTION_ALL 및 함수별 권한을 확인한다. transaction 결과가 2GB를 넘으면 spool 수집이 필요하다. legacy spool은 모든 값을 string으로 읽는 제약이 있다.

## incremental과 reset

증분 열의 `>=`는 경계 중복이 생기므로 dedup가 필요하다. 여러 column의 OR와 date/time 이어 붙이기는 다른 조건이다. CDHDR/CDPOS join은 insert 누락 가능성과 twin-join 조건을 확인한다. BEx/function에 같은 incremental을 가정하지 않는다.

twin table 증분은 ERP Table에서만 쓰며, 대상 table이 아니라 별도 twin table의 필드가 증분 조건을 만족할 때 대상 행을 가져온다. Incremental Twin Table에 twin table 이름을 두고, Incremental Twin Mapping은 `{PRIMARY_TABLE_NAME}-{FIELD_NAME}={TWIN_TABLE_NAME}-{FIELD_NAME}` 형식으로 join 조건을 적고, 여러 조건은 세미콜론으로 이어 AND로 묶는다(2026-11-13 확인). 대상 table에 변경시각 열이 없을 때 header table의 변경시각으로 item table을 끌어오는 식의 설계에 쓸 수 있다(해석). 이때 twin 필드에 반영되지 않은 item만의 변경은 증분에서 빠진다.

BW request 기반은 non-compressed request 조건이며 compressed이면 full load가 다시 필요할 수 있다. legacy reset은 SNAPSHOT/reset=true 실행 뒤 flag 제거/APPEND 복귀, 신규 toggle은 한 번 실행 뒤 해제를 확인한다. reset을 남기면 반복 reload가 될 수 있다. 신규 toggle은 ERP Table, CDS View, HANA View, BW Content Extractor에서만 지원한다. T-code와 Function Module은 증분 자체가 없어 늘 snapshot으로 돈다.

## webhook과 Function 호출

HTTP 성공과 SAP business 성공은 다르다. RETURN과 메시지별 TYPE S/E/W/I/A를 확인한다. webhook commit 기본 true와 function-module batch commit 기본 off를 구별한다.

webhook v2의 bulk/multiple output은 add-on 2.29 이상 조건이다. api-version 생략은 v1의 단일 입출력 경로다. v2에서 retries-per-request>0 설정은 제거하는 안내를 따른다.

input array가 두 개 이상이거나 parallel block을 주면(빈 블록 포함) SAP 쪽에서 자동으로 병렬 실행된다. 기본 3 jobs, job당 4 calls와 1-based ROWNO로 입력/결과를 연결한다. `max-jobs`를 레코드 수보다 크게 잡아도 남는 job은 쓰이지 않을 뿐 자원을 낭비하지 않는다. OAuth bulk parallel 제약도 확인한다.

## 코드 저장소에서 직접 호출

SAP ERP source를 Python external transform이나 function에 가져오면 코드가 SAP 애드온의 REST API를 직접 부른다. 배치 sync, media set sync와 webhook으로 제어가 부족할 때 쓰는 경로다.

- 쓰는 경우: Workshop action에서 BAPI를 동기 호출, 큰 입력 데이터셋의 행마다 BAPI 호출, Foundry 쪽 데이터로 고른 DMS 문서만 받기, 한 build에서 여러 SAP 호출을 잇기.
- 엔드포인트는 source URL(`https://<host>:<port>/sap/palantir`) 아래 `POST /v2/function/{functionName}/writeback`, `POST /v2/function/{functionName}/parallel_writeback`, `GET /v2/get_documents`, `GET /v2/get_document`다. 호출 전 `GET /v2/function/{functionName}/metadata`로 입출력 구조를 확인한다.
- function에서 쓰려면 source에 code import와 exports가 모두 켜져 있어야 한다. SAP `RETURN`의 0이 아닌 severity 메시지는 user-facing error로 올려 호출자가 대응하게 한다. 문서가 webhook에 대해 HTTP 성공 응답에도 SAP 업무 오류가 들어 있을 수 있다고 하므로, REST 호출에서도 `raise_for_status()`만으로 업무 실패를 잡는다고 보지 않는다(해석).
- `parallel_writeback`의 병렬 키는 `paralleljobs`(SAP에 띄울 background job 수)와 `functioncallperjob`(job당 호출 수)이고, webhook의 `max-jobs`, `max-calls-per-job`과 이름이 다르다. `"parallel": false`면 한 번의 bulk 요청은 유지하고 SAP 쪽 실행만 순차로 바뀐다.

## 부가 기능과 운영

지원 기능 표(2026-11-13 확인)는 Exploration, batch sync, incremental, webhook, bulk writeback과 코드 저장소 사용을 일반 제공으로, media set만 beta로 표시한다.

Data Accelerator 경로는 Foundry worker에서만 쓰며 control/data plane egress, Palantir가 준 client certificate와 Cloud Connector의 virtual host/port를 구성한다. 2026-11-13 확인한 ERP 소스 문서는 이 경로에 beta 표시를 두지 않는다. 사용자 OAuth의 outbound task는 별도 흐름이다.

DMS media sync Beta는 기존 항목 제외, path/default .pdf, document type/size 조건을 확인한다. 코드의 get_documents/get_document는 실제 MediaSet 저장과 별개로 결과를 연결해야 한다. metadata endpoint로 BAPI 구조를 확인한다.

BEx member limit은 SP22 조건과 기본 200/최소 2를 확인한다. 과부하 진단에는 SAP background job/resource/load 검사를 포함하되 debug 옵션으로 검사를 끄는 효과를 이해한다.

## 출처

- [Palantir, sap-erp](https://www.palantir.com/docs/foundry/available-connectors/sap-erp)
- [Palantir, sap-custom-source](https://www.palantir.com/docs/foundry/available-connectors/sap-custom-source)
- [Palantir, sap-source-setup](https://www.palantir.com/docs/foundry/sap/sap-source-setup)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-SAP-Extraction-and-Incremental-Identity]]
