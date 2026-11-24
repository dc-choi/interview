---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
---

# Google Drive, Sheets의 driver와 사용자 위임

Google Drive driver의 Files metadata는 파일 bytes가 아니다. `DownloadFile`에서 LocalFile을 빈 문자열로 지정하면 FileData의 Base64 결과를 받는 계약이며 Readonly=true는 stored procedure를 막을 수 있다.

## service account와 사용자 위임

service account는 `AuthScheme=OAuthJWT`, `InitiateOAuth=GETANDREFRESH`와 Google JSON 내용 credential을 설정한다. GOOGLEJSONBLOB은 내용, GOOGLEJSON은 경로라는 차이가 있다. domain-wide delegation을 쓸 때만 subject를 지정하고 불필요한 OAuth client ID/secret을 섞지 않는다.

Sheets pipeline의 credential alias는 문서의 `OAuth_Jwt_Certification`과 맞추고 service account에 파일을 공유한다. 인증이 성공해도 파일 권한이 없으면 읽히지 않는다.

사용자를 대신하는 on-demand 접근은 별도 REST source와 Python/TypeScript v2 Functions의 delegated OAuth 경로다. TypeScript v1 지원을 가정하지 않는다. service-account metadata source와 같은 identity로 간주하지 않는다.

## scope와 실행

Drive API, OAuth와 필요한 추가 host를 egress에 포함한다. `drive.file`은 앱이 생성/열기/picker 등으로 접근할 수 있는 파일 범위이며 file ID만 안다고 임의 파일 접근 권한이 생기지 않는다. drive.readonly의 사용자 파일 전체 범위와 restricted-scope 검증을 구별한다. Sheets는 spreadsheet scope를 맞춘다.

Workshop에서 직접 호출하는 방식으로 첫 interactive authorization을 시작할 수 없는 경로는 Function-backed Action을 사용한다. serverless 환경의 refresh와 배포되지 않은 preview를 구별한다.

## 읽기와 쓰기

Drive binary는 alt=media, Google Workspace 문서는 files.export가 필요하다. 5MB simple upload 예제는 metadata를 먼저 만들기 때문에 이후 upload 실패 시 빈 파일이 남을 수 있다. whole-file replace는 다른 수정 덮어쓰기 여부를 확인한다.

Sheets 예제는 고정 range를 읽고 B2에 RAW 값을 쓰는 단일 호출이다. confirmation flag가 false인 예제를 실행했다고 write가 발생한 것으로 보고하지 않는다. 문서는 대상 cell에 writer를 한 번에 하나만 두고, 요청 결과가 불분명하면 재시도 전에 cell을 확인하라고 한다. 여러 writer, 부분 실패와 결과 미확정 상황의 retry 정책은 별도 설계한다. 이는 문서 예제 밖의 적용 판단이며 실제 쓰기를 검증한 결과는 아니다.

2026-11-24 확인한 Sheets 문서의 service account pipeline 예제 둘은 `@transform_pandas`로 `pd.DataFrame`을 반환하던 형태에서 `@transform.using`과 `LightweightOutput`을 받아 `output.write_table(pl.DataFrame(...))`로 쓰는 형태로 바뀌었고, 저장소에 더할 패키지도 pandas에서 polars로 바뀌었다. 읽기 예제는 응답의 첫 행을 header로 두고 나머지 행이 header보다 짧으면 `None`으로 채운 뒤 모든 열을 `pl.String`으로 고정한다. Sheets API는 응답의 `values`에서 끝쪽의 빈 행과 열을 빼므로, 끝 cell이 빈 행은 header보다 짧게 온다. 다음은 예제를 읽은 해석이다. 예제는 `valueRenderOption`을 주지 않아 기본값인 표시 형식 문자열(예: `$1.23`, 스프레드시트 locale 기준)을 받으므로, 숫자나 날짜 열이 필요하면 하류에서 형식을 감안해 변환하거나 `UNFORMATTED_VALUE`로 요청한다. pipeline 경로는 `oauth2.googleapis.com:443`과 `sheets.googleapis.com:443`, delegated Function 경로는 여기에 `accounts.google.com:443`을 더한 직접 egress를 둔다. pipeline 예제는 source가 proxy URI를 주면 token 교환과 Sheets 호출 모두 그 proxy를 쓰고, Function 예제는 session credential에서 token을 받으므로 Sheets 호출에만 proxy를 쓴다. 사용자 token의 refresh에 기대는 Function은 serverless 모드로 실행한다. deployed 모드는 만료된 호출 사용자 token을 자동으로 refresh하지 못한다.

## 출처

- [Palantir, google-drive](https://www.palantir.com/docs/foundry/available-connectors/google-drive)
- [Palantir, google-sheets](https://www.palantir.com/docs/foundry/available-connectors/google-sheets)
- [Google Sheets API, spreadsheets.values](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values)
- [Google Sheets API, ValueRenderOption](https://developers.google.com/workspace/sheets/api/reference/rest/v4/ValueRenderOption)

## 관련 문서

- [[Palantir-Connector-Contracts]]
