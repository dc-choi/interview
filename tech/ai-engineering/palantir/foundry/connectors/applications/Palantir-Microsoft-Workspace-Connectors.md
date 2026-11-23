---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
---

# Excel, Teams와 SharePoint의 데이터 및 권한

Excel driver의 worksheet/cell relational table과 파일 download/edit/upload는 다르다. generic Excel은 저장소 URI를, Excel Online은 Graph를, SharePoint Excel은 on-premise 2010/2013 계열의 별도 계약을 따른다. xls는 지원하지 않고 xlsm은 read-only라는 형식 조건을 확인한다.

## Excel의 읽기 부작용

기본 Recalculate는 read 중 workbook을 변경할 수 있다. cached value만 읽으려면 FALSE 선택과 실제 결과를 확인한다. mixed cell의 숫자가 text로 읽히는 경우도 있다. folder URI로 여러 workbook을 찾는 기능과 한 workbook의 sheet 범위를 구별한다.

openpyxl로 다운로드 후 업로드하는 예제는 파일 전체를 교체하며 모든 Excel 기능 보존을 보장하지 않는다. 원본 복사본으로 호환성을 확인하고 storage credential/egress/export 조건도 적용한다.

## Excel Online

2026-11-24 확인한 문서 기준이다. Excel Online은 OneDrive for Business나 SharePoint Online의 workbook을 Microsoft Graph로 읽어 worksheet마다 `{workbook}_{worksheet}` 이름의 table로 보여 준다(`People.xlsx`의 `People` sheet는 `People_People`). 위치는 `Drive`나 `SharepointURL`, 대상은 `Workbook`(이름이나 ID)으로 고르고 batch sync로 읽는다. `ValueRenderOption`은 표시값(`FormattedValue`), 원시값(`UnformattedValue`), 수식 문자열(`Formula`) 중 무엇을 받을지 정한다. sheet 선택, 범위, 형식과 파싱을 직접 다뤄야 하면 OneDrive나 SharePoint 커넥터로 파일을 받아 transform의 Excel parser, Pipeline Builder `parseExcel`, `pandas.read_excel`이나 `openpyxl`로 파싱한다.

인증은 Entra ID 위임 로그인(`AuthScheme=AzureAD`, `InitiateOAuth=REFRESH`)으로, 로그인한 사용자가 볼 수 있는 파일만 읽는다. Entra 앱에 Web redirect URI로 source가 만든 `CallbackURL`을 넣고, 위임 Graph 권한 `Files.Read.All`, `Sites.Read.All`, `offline_access`를 준 뒤(테넌트가 사용자 동의를 막으면 관리자 동의) source에서 Authorize로 대상 사용자가 직접 로그인한다. 표의 `AuthScheme` 기본값 `AzureServicePrincipal`과 이 절차를 구분한다.

table export는 dataset 행을 workbook에 추가만 하며 개별 행 갱신이나 삭제는 하지 않는다. 키로 행을 다루려면 Graph OAuth 2.0 authorization-code outbound application과 REST source(위임 `Files.ReadWrite`, `offline_access`, `openid`, `profile`)를 따로 만든다. 이 source는 코드 사용과 Function export를 허용하고 Microsoft Graph, Microsoft identity와 workbook 다운로드에 쓰는 SharePoint host에 source-aware egress를 둔다. Function에서 사용자 session credential의 access token으로 Graph를 호출한다. 문서의 Python과 TypeScript v2 예제는 네 동작을 보여 준다.

| 동작 | Graph 호출 | 문서의 경고 |
|---|---|---|
| 다운로드 | drive item `/content`로 `.xlsx` 전체를 받아 base64로 반환 | — |
| 삽입 | `A2:E2` 범위 `insert`(shift Down) 뒤 같은 범위 `PATCH` | 호출마다 행이 늘고, 중복 키를 검사하지 않으며 절반만 채운 행을 복구하지 않는다 |
| 갱신 | `usedRange(valuesOnly=true)`에서 `PersonKey`가 정확히 하나인 행을 찾아 `A:E` 전체를 `PATCH` | 그 범위의 수식이 값으로 바뀌고, 시간 초과 뒤의 모호한 쓰기를 복구하지 않는다 |
| 삭제 | 찾은 행 범위 `delete`(shift Up) | 영구 삭제이며 모호한 삭제를 복구하지 않는다 |

세 쓰기 모두 재시도 전에 workbook을 직접 확인하라고 한다. 다음은 예제를 읽은 해석이다. 삽입은 두 요청으로 나뉘어 둘째가 실패하면 빈 행이 남고, 갱신과 삭제는 행 번호를 읽은 시점과 쓰는 시점 사이에 다른 사용자가 행을 옮기면 다른 행을 바꿀 수 있다. Python 예제는 요청마다 `timeout=60`(연결과 수신 대기 기준이며 전체 시간 상한은 아니다)을 두고, TypeScript v2 예제는 다운로드에만 전체 deadline인 `AbortSignal.timeout(60_000)`을 건다. 위임 로그인 절차의 scope는 읽기 전용인데 Palantir 문서는 table export에 필요한 쓰기 권한을 밝히지 않는다. Graph의 range insert는 위임 `Files.ReadWrite`를 요구하므로, 읽기 scope만 준 source로 export가 되는지는 따로 확인한다.

## Teams

Teams driver는 team/channel/chat/member/message를 relational 형태로 제공한다. delegated 사용자 권한, tenant app 권한과 selected RSC를 구별한다. service principal은 tenant/client/secret 또는 certificate, application permission과 admin consent를 맞추며 interactive redirect/Authorize 단계가 필요하지 않은 흐름이다.

discovery의 Team.ReadBasic/Channel.ReadBasic과 message read, member read는 다르다. ChannelMessage.Read.All, Chat.Read.All의 광범위한 app 권한과 ChannelMessage.Read.Group RSC를 같은 범위로 보지 않는다.

일반 새 메시지 전송에는 delegated ChannelMessage.Send 또는 해당 RSC가 필요하다. Teamwork.Migrate.All은 역사적 메시지 import이며 일반 send의 대안이 아니다. read 예제는 최근 20개 metadata이지 모든 대화의 전체 본문 수집이 아니다.

별도 REST delegated send는 첫 authorization과 실제 사용자에게 보이는 post를 수반한다. 문서가 안내하는 앱/tenant/channel별 rate limit은 Palantir 문서 기준이며 현재 Microsoft 전체 quota를 별도로 검증한 값은 아니다.

## SharePoint Online

native SharePoint Online connector는 파일 기반이며 on-premise는 REST source를 검토한다. 파일 format을 보존하고 2일 넘는 sync 중단 조건이 있다. SharePoint Lists는 native 파일 sync가 아니라 Graph external transform으로 다룬다.

Entra app의 client credentials는 Sites.Read.All 또는 Sites.Selected와 admin consent를 구성한다. Sites.Selected에는 별도 site grant와 read/write role이 필요하다. exports에 write 권한을 추가한다. username/password 경로는 delegated permission/public-client 설정과 사용자 site membership을 따르며 원문은 이 흐름에서 2FA를 지원하지 않는다고 명시한다.

Graph Lists 예제는 list item의 `@odata.nextLink`를 이어 가지만 list 목록 자체는 첫 page일 수 있다. 요청 실패를 None으로 바꾼 뒤 누적 결과를 반환하므로 partial 결과를 완전한 목록으로 보고할 위험이 있다. token 획득 코드가 수명을 읽는 것과 실제 refresh를 구현한 것은 다르다. 적용 시 failure propagation, 모든 page와 token 만료를 검증한다.

## 출처

- [Palantir, microsoft-excel](https://www.palantir.com/docs/foundry/available-connectors/microsoft-excel)
- [Palantir, microsoft-excel-online](https://www.palantir.com/docs/foundry/available-connectors/microsoft-excel-online)
- [Palantir, microsoft-sharepoint-excel](https://www.palantir.com/docs/foundry/available-connectors/microsoft-sharepoint-excel)
- [Microsoft Learn, Range: insert](https://learn.microsoft.com/en-us/graph/api/range-insert?view=graph-rest-1.0)
- [Requests, Quickstart: Timeouts](https://requests.readthedocs.io/en/latest/user/quickstart/#timeouts)
- [Palantir, microsoft-teams](https://www.palantir.com/docs/foundry/available-connectors/microsoft-teams)
- [Palantir, sharepoint-online](https://www.palantir.com/docs/foundry/available-connectors/sharepoint-online)

## 관련 문서

- [[Palantir-Connector-Contracts]]
