---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir Microsoft Access Connector", "Palantir Access 커넥터"]
---

# Microsoft Access 파일 읽기와 한 행 갱신

Microsoft Access는 서버가 아니라 `.mdb`나 `.accdb` 파일에 담긴 데이터베이스다. Foundry의 Access source는 Palantir 제공 driver(CData JDBC)로 그 파일을 읽으며, `ConnectionType`이 파일을 가져올 저장소나 프로토콜을, `DataSource`가 파일 경로를 정한다. 2026-11-24 확인한 문서 기준으로 exploration, batch sync와 incremental은 GA지만 table export는 제공하지 않는다. 문서가 제시한 쓰기 방법은 Azure Files(`AuthScheme=AccessKey`) source에서 Python pipeline으로 파일 전체를 내려받아 고친 뒤 교체하는 것이다.

## source 구성

| 속성 | 2026-11-24 문서 기준 |
|---|---|
| `ConnectionType` | 필수, 기본값 `Azure Files` |
| `DataSource` | 필수, 기본값 없음. Azure Files면 `azurefile://<file-share>/<path>/<database>.accdb` |
| `AzureStorageAccount` | Azure Files 예제에서 저장소 계정 이름 |
| `AuthScheme` | 코드 예제는 `AccessKey`이고 계정 key를 암호화 속성 `AzureAccessKey`로 둔다 |

egress는 `<storage-account>.file.core.windows.net:443`을 허용한다. 다른 저장소의 `DataSource` 형식은 CData의 Access 연결 안내를 따른다. 2026-10-16 수집 표에 있던 기본값(`Local`, 로컬 Windows 경로)과 table export GA 표기는 현재 문서와 다르다.

## 읽기

일반 수집은 source exploration으로 테이블을 미리 보고 테이블마다 batch sync를 만든다.

코드에서 읽을 때는 source가 Access API나 JDBC 연결을 코드에 열어 주지 않는다. 코드가 source의 secret과 proxy로 Azure Files REST에 Shared Key 서명 요청(`x-ms-date`, `x-ms-version` 2023-11-03을 정렬해 HMAC-SHA256)을 직접 보내 파일을 받고 런타임에서 파싱한다. 전제는 다음과 같다.

- source가 Foundry worker에서 실행된다. agent worker source는 코드로 import할 수 없다.
- Python pipeline은 external transform의 source import를, Function은 export control과 외부 API 호출 설정까지 맞춘다.
- TypeScript v1은 import한 source의 생성 식별자를, v2는 source의 API 이름과 RID를 쓴다.

| 런타임 | 파서와 의존성 | 문서가 밝힌 자원 경계 |
|---|---|---|
| Python pipeline | `mdb-export`(`mdbtools==1.0.1`), `polars`, `requests==2.34.2` | 1 MiB chunk 스트리밍, HTTP와 `mdb-export` 각 120초 제한, dataset snapshot 한 번 쓰기 |
| Python Function | `mdbtools`, `requests` | 같은 스트리밍과 제한, CSV 값을 문자열로, 빈 칸을 `null`로 담은 JSON 반환 |
| TypeScript v1, v2 Function | `mdb-reader@^3.2.0` | 파일 전체를 메모리에 올리고 명시적 요청 timeout 없이 JSON 반환 |

읽기 예제는 Azure Files `GET` 한 번만 하고 재시도나 파일 크기 제한이 없다. pipeline 예제는 여러 테이블을 `source_table` 열을 붙여 `diagonal_relaxed`로 합친다. 테이블마다 다른 열은 null로 채워지고, 같은 이름의 열은 한 열로 합쳐지며 타입이 다르면 공통 상위 타입으로 바뀐다. TypeScript 예제는 bigint를 문자열로, Buffer를 base64로 바꿔 직렬화한다.

다음은 예제 해석이다. 예제에 파일 크기 상한과 요청별 timeout이 없어도 Function은 플랫폼 제한을 받는다. 큰 파일은 Function 실행 시간 기본 60초, TypeScript v1의 메모리 128MB와 CPU 30초, v2의 메모리 설정에 먼저 걸릴 수 있다([[Palantir-Functions-Limits-and-Deployment]]). Python Function 예제의 120초 HTTP timeout도 기본 실행 시간보다 길다. `requests`의 timeout은 응답 전체의 시간 상한이 아니라 연결과 수신 대기 기준이다.

## 한 행 갱신

쓰기 예제는 Python pipeline 전용이며 Function의 쓰기 지원을 뜻하지 않는다. 흐름은 다음 순서다.

1. 파일을 받아 `ETag`를 기록한다. 대상이 없으면(404) 아무것도 바꾸지 않고 `skipped_target_missing`을 output에 남긴다.
2. UCanAccess(JDBC, `jaydebeapi`와 OpenJDK 17)로 `UPDATE ... WHERE Id = ? AND Name = ? AND DeptId = ?`를 실행한다. 기대한 옛 값까지 조건에 넣고, 영향받은 행이 정확히 1이 아니면 rollback하고 실패한다.
3. 고친 파일을 고유 이름의 후보 파일(`<경로>.candidate-<uuid>`)로 4 MiB 범위씩 올린다.
4. 원본에 무기한 lease를 잡고, lease 응답의 `ETag`가 처음 받은 값과 다르면 중단한다.
5. lease ID를 지정해 후보를 원본 이름으로 rename(덮어쓰기)한다. 끝나면 lease를 풀고, 교체하지 못했으면 후보를 지운다.

필요한 jar(`ucanaccess-5.1.8`, `jackcess-5.1.7`, `hsqldb-2.7.4`)는 프로젝트 `lib`에 넣어 패키징한다. 문서는 이 방식이 `.accdb` 파일 전체를 교체하므로 버릴 수 있는 사본으로 먼저 시험하라고 경고하며, 매크로, 연결 테이블, 암호화 데이터베이스, 큰 파일과 넓은 동시 쓰기에서의 호환성은 확인되지 않았다고 밝힌다. 코드 예제는 `AuthScheme=AccessKey`인 Azure Files source만 다룬다.

다음은 예제를 읽은 해석이다. `ETag` 비교는 내려받은 뒤 lease를 잡기 전 사이에 파일이 바뀌었는지를 잡는 장치다. 외부 파일 교체와 Foundry output 쓰기는 하나의 트랜잭션이 아니므로, 교체 뒤 build가 실패하면 파일만 바뀐 상태가 된다. 재실행하면 옛 값 조건이 맞지 않아 실패하므로, 이 실패를 이미 반영된 상태와 구분해 확인한다.

## 출처

- [Palantir, Microsoft Access](https://www.palantir.com/docs/foundry/available-connectors/microsoft-access)
- [CData, JDBC Driver for Microsoft Access: Establishing a Connection](https://cdn.cdata.com/help/DCK/jdbc/pg_connectionj.htm)
- [Palantir, Functions enforced limits](https://www.palantir.com/docs/foundry/functions/enforced-limits/)
- [Polars, polars.concat](https://docs.pola.rs/api/python/stable/reference/api/polars.concat.html)

## 관련 문서

- [[Palantir-Driver-Contracts-14]]
- [[Palantir-Source-Identity-and-Code]]
- [[Palantir-BigQuery-Connector]]
- [[Palantir-Functions-Limits-and-Deployment]]
