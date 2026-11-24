---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
---

# Excel, OneDrive, Teams와 SharePoint의 데이터 및 권한

Excel driver의 worksheet/cell relational table과 파일 download/edit/upload는 다르다. generic Excel은 저장소 URI를, Excel Online은 Graph를, SharePoint Excel은 on-premise 2010/2013 계열의 별도 계약을 따른다. xls는 지원하지 않고 xlsm은 read-only라는 형식 조건을 확인한다.

2026-11-24 확인한 SharePoint Excel 문서는 workbook에 닿는 경로로 커넥터를 고르게 한다. on-premise SharePoint server의 Excel Services API는 SharePoint Excel, SharePoint Online이나 OneDrive의 Microsoft 365 workbook은 Excel Online, 지원하는 저장소에 놓인 workbook 파일은 generic Excel, 이미 Foundry에 들어온 Excel 파일은 Foundry 안의 Excel parser다. SharePoint Excel은 server가 Excel Services API를 노출해야 하며 파일을 SharePoint에 저장해 둔 것만으로는 부족하다. 기능은 모두 Beta이고 networking 표에는 SharePoint Online 로그인 host가 없다.

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

## OneDrive

2026-11-24 확인한 문서 기준이다. OneDrive 커넥터는 Microsoft Graph로 파일, 폴더, drive, 권한과 공유의 메타데이터를 읽는다. source explorer의 table은 파일 내용이 아니라 이 메타데이터이며 batch sync로 dataset에 쓴다. 기능 표의 Exploration, batch sync, incremental과 OAuth는 모두 Beta다.

문서가 안내하는 batch sync 인증 절차는 Entra ID 위임 로그인(`AuthScheme=AzureAD`, `AzureTenant`, `OAuthClientId`, `OAuthClientSecret`, `InitiateOAuth=REFRESH`)이다. 앱에 `Files.Read.All` 같은 위임 Graph 권한(사용자가 파일을 써야 하면 `Files.ReadWrite.All` 추가)을 주고, source가 만든 `CallbackURL`을 Web redirect URI로 넣은 뒤 Authorize로 대상 사용자가 로그인한다. 테넌트 동의 정책에 따라 관리자 동의가 필요할 수 있다. 같은 페이지의 속성 표는 `AuthScheme` 기본값을 `AzureServicePrincipal`로, 네트워크 표는 `AzureAD`를 기본으로 적어 서로 다르므로 `AuthScheme`을 비워 두지 말고 명시한다.

파일 내용은 sync 정의에 `EXECUTE DownloadFile ResourceId = '1234'` 같은 stored procedure 호출을 넣어 받는다. 결과 dataset은 파일 내용을 Base64 문자열로 담으므로 하류 transform에서 binary로 디코딩한다. 문서의 스크린샷은 `Encoding='NONE'`을 쓰지만 Base64를 받으려면 `Encoding`을 비워 둔다.

업로드와 교체는 batch sync가 아니라 source를 external transform이나 external function으로 가져와 Graph를 직접 호출한다. 이 코드 경로는 source의 `OAuthClientSecret`을 재사용해 OAuth 2.0 client credentials로 짧은 수명의 앱 토큰을 받으며, batch sync의 `AuthScheme`과 별개다. 그래서 Graph 앱 권한(다운로드 `Files.Read.All`, 업로드와 교체 `Files.ReadWrite.All`)과 관리자 동의를 따로 갖춘다. Microsoft 권한 참조상 이 앱 권한은 로그인 사용자 없이 테넌트의 모든 site collection 파일에 미치므로, 로그인한 사용자가 볼 수 있는 파일로 범위가 좁은 위임 경로보다 권한 범위가 훨씬 넓다. 예제는 전역 Microsoft identity와 Graph endpoint를 코드에 고정했으므로 `AzureEnvironment=GLOBAL` source에서만 쓴다. Function 예제는 다운로드만 하더라도 external API access 설정과 source의 export 허용을 요구하고, 쓰기 Function은 `Enable exports to this source without markings validations`도 켠다. external transform으로 쓰기 전에는 source의 export 통제 설정을 마친다.

| 동작 | Graph 호출 | 문서와 Graph의 조건 |
|---|---|---|
| 다운로드 | drive item `/content`를 자동 redirect 없이 호출하고, redirect 응답이면 `Location`이 https이고 예상한 host일 때만 받는다 | Graph는 `302 Found`로 사전 인증된 다운로드 URL을 준다. 이 URL은 `Authorization` 헤더 없이 받으며 몇 분 안에 만료될 수 있다. 테넌트별 다운로드 host를 Graph와 로그인 host와 함께 source egress에 허용한다 |
| 업로드와 교체 | `/drives/{drive-id}/root:/{path}:/content`에 `PUT`(simple upload)하고 item ID를 반환 | 대상 경로에 파일이 있으면 내용을 덮어쓰므로 새 파일은 쓰지 않은 경로에 만들고, 결과가 불분명하면 재시도 전에 업로드 여부를 확인한다. simple upload는 250 MB까지다. 민감도 레이블이 붙은 파일은 앱 인증으로 교체할 수 없어 위임 사용자 흐름을 쓰라고 하지만, Palantir 문서는 그 위임 쓰기 절차나 예제를 주지 않는다 |

다운로드 결과는 pipeline에서는 unstructured dataset의 파일로, Python Function은 bytes로, TypeScript Function은 Base64 문자열로 돌려준다. drive와 item ID는 커넥터의 Files view나 Graph로 얻는다. 문서는 읽기 예제의 예상 다운로드 host를 egress에 허용한 host 이름으로 설정하라고 한다. 다음은 예제를 읽은 해석이다. 예제가 비교하는 예상 host는 하나뿐이라 redirect host가 바뀌면 다운로드가 실패하므로 설정을 함께 고친다. 앞 절의 Excel Online Python 예제와 달리 OneDrive 예제는 요청에 timeout을 두지 않으므로, 적용할 때 연결과 응답 대기 상한을 따로 정한다.

## Teams

2026-11-24 확인한 문서 기준이다. Teams 커넥터는 Microsoft Graph로 team, channel, chat, member, message를 relational table로 보여 주고 batch sync로 dataset에 쓴다. 기능 표의 Exploration, batch sync, incremental, OAuth와 table export는 모두 Generally available이다.

인증은 `AuthScheme`으로 고른다. `AzureAD`는 위임 로그인으로, source에 `AzureTenant`, `OAuthClientId`, `OAuthClientSecret`, `InitiateOAuth=REFRESH`와 자동으로 채워지는 `CallbackURL`(Entra 앱의 Web redirect URI)을 넣고 Authorize로 대상 사용자가 로그인한다. `AzureServicePrincipal`(client secret)과 `AzureServicePrincipalCert`(인증서)는 로그인 사용자 없이 앱으로 읽으며 redirect URI와 Authorize 단계가 없고, Graph 앱 권한은 관리자 동의가 있어야 효력이 생긴다. Palantir 문서는 Global Administrator가 동의하라고 적지만, Microsoft Entra 문서는 Privileged Role Administrator도 Microsoft Graph 앱 권한에 동의할 수 있다고 적는다.

| 할 일 | 위임 권한 | 앱 권한 |
|---|---|---|
| team과 channel 찾기 | `Team.ReadBasic.All`, `Channel.ReadBasic.All`(사용자 동의) | 같은 두 권한(관리자 동의) |
| channel 메시지 읽기 | `ChannelMessage.Read.All`(관리자 동의) | `ChannelMessage.Read.All`(테넌트 전체, 관리자 동의) 또는 `ChannelMessage.Read.Group`(앱을 설치한 team만, resource-specific consent) |
| chat과 chat 메시지 읽기 | Palantir 표에 없음(Graph의 chat 메시지 목록 API는 위임 `Chat.Read`를 지원) | `Chat.Read.All`(관리자 동의). Graph 참조는 chat별 resource-specific consent인 `ChatMessage.Read.Chat`을 최소 권한으로 적는다 |
| member와 owner 목록 | `GroupMember.Read.All`, `TeamMember.Read.All`, `ChannelMember.Read.All`(관리자 동의) | 같은 세 권한(관리자 동의) |
| channel 메시지 보내기 | `ChannelMessage.Send`(사용자 동의) | `ChannelMessage.Send.Group`(team마다 resource-specific consent) |

Palantir 문서는 channel 메시지 조회(`GET /teams/{team-id}/channels/{channel-id}/messages`)의 Microsoft 제한을 앱 전체 초당 200회, 앱과 테넌트 조합당 초당 20회, channel당 초당 1회로 적는다. Microsoft throttling 문서의 Teams 표도 같은 세 값을 적지만, 그 문서는 수치가 바뀔 수 있고 요청 하나가 여러 제한에 동시에 걸려 가장 먼저 닿는 제한이 적용된다고 밝힌다. 같은 Teams 절은 더 긴 구간에서 표 값의 약 83%인 지속 제한도 본다고 적는다. 사용자별 열이 비어 있으면 그 요청도 기본 제한을 받는다는 주석과 기본 표의 사용자당 GET 초당 1회를 합쳐 읽으면, 위임 로그인 경로는 사용자별 제한에도 걸릴 수 있다(기본 표 머리말은 앞 표에 없는 요청에 적용한다고 적어 문서 안에서 해석이 갈린다). 다음은 표를 읽은 해석이다. 앱 token(service principal) 경로에서는 제한이 channel당 초당 1회이므로 많은 channel을 동시에 읽는 sync와 한 channel의 긴 이력을 읽는 sync는 병목이 다르다. 사용자 한 명의 위임 token이면 모든 channel이 사용자당 제한을 나눠 쓰므로 channel을 병렬로 읽어도 빨라지지 않을 수 있다. 어느 경로든 긴 이력을 초당 1회로 꽉 채워 오래 읽는다고 가정하지 않는다.

코드에서 쓰는 경로는 읽기와 보내기가 다르다.

- 읽기: Teams source를 code repository나 Function에 가져와 service principal로 쓴다. Python pipeline, Python Function, TypeScript v1과 v2 Function 예제는 source의 `OAuthClientSecret`으로 `client_credentials` grant와 `https://graph.microsoft.com/.default` scope의 앱 token을 받아 channel 메시지를 `$top=20`으로 한 번 요청하고 `id`, `createdDateTime`, `webUrl`만 반환한다. 본문이 아닌 메타데이터이고 첫 페이지뿐이다. Graph는 기본 20개, 최대 50개를 한 페이지로 주고 `@odata.nextLink`로 다음 페이지를 이어 준다. 이 API는 답글 없이 최상위 메시지만 주고 답글 묶음의 마지막 수정 시각 순으로 정렬하므로, 링크를 끝까지 따라가도 최상위 메시지만 모인다. 답글까지 필요하면 `$expand=replies`(기본으로 답글을 200개까지 담고, 더 많으면 답글 목록에 별도의 다음 페이지 링크가 붙는다)나 답글 목록 API를 함께 쓴다. team과 channel ID는 source explorer의 `Teams`, `Channels` table에서 찾는다.
- 보내기: Teams source가 아니라 `https://graph.microsoft.com`에 대한 REST API source와 outbound application을 만든다. 메시지를 보낼 사용자가 outbound application을 authorize하고, Python과 TypeScript v2 Function은 그 사용자의 session credential에서 access token을 꺼내 channel 메시지 `POST`에 붙인다. Workshop이나 자동화에서 바로 쓰기 전에 function-backed action으로 authorize를 먼저 거친다. Function은 호출한 사용자의 인증으로 돌므로 그 인증이 만료되거나 취소되면 사용자가 대화형 흐름에서 다시 authorize해야 한다. 실행하면 channel 구성원에게 보이는 메시지가 올라가므로 시험은 운영이 아닌 channel에서 한다. Microsoft는 channel 메시지 `POST`를 channel당, 사용자당 초당 1회로 제한하고, Teams를 로그 파일처럼 쓰는 것은 이용 약관 위반이라고 적는다. 예제 `POST`에는 재시도와 중복 방지가 없어, 시간 초과 뒤 다시 보내면 같은 메시지가 두 번 올라갈 수 있다.

Palantir 문서는 선택한 team에 앱으로 보낼 때 `ChannelMessage.Send.Group` RSC와 읽기 예제의 앱 token 패턴을 쓰라고 하고, `Teamwork.Migrate.All`은 과거 메시지 import용이지 새 메시지 전송용이 아니라고 한다. Microsoft 문서끼리도 갈린다. Graph v1.0의 channel 메시지 전송 API 참조는 앱 권한으로 `Teamwork.Migrate.All`만 적고 앱 권한은 migration에만 지원한다고 쓰지만, Teams의 resource-specific consent(RSC) 문서는 `ChannelMessage.Send.Group`을 이 team의 channel에 메시지를 보내는 앱 전용 권한으로 적어 Palantir 설명과 맞는다. RSC 문서 본문은 앱 전용 RSC를 관리자나 리소스 소유자만 동의할 수 있다고 쓰지만 같은 페이지의 표는 앱 전용 team 권한에 team 소유자나 구성원이 동의할 수 있다고 적어 서로 다르므로 동의 주체는 테넌트 정책으로 확인한다. 이 문서는 또 channel RSC는 앱을 따로 추가하지 않은 private, shared channel에는 미치지 않는다고도 적는다. 참조 문서가 어긋나므로 앱 token으로 일반 메시지를 보내는 경로는 대상 테넌트에서 실제로 되는지 먼저 확인하고, 확인 전에는 문서가 예제를 준 위임 경로를 쓴다.

## SharePoint Online

native SharePoint Online connector는 파일 기반이며 on-premise는 REST source를 검토한다. 파일 format을 보존하고 2일 넘는 sync 중단 조건이 있다. SharePoint Lists는 native 파일 sync가 아니라 Graph external transform으로 다룬다.

Entra app의 client credentials는 Sites.Read.All 또는 Sites.Selected와 admin consent를 구성한다. Sites.Selected에는 별도 site grant와 read/write role이 필요하다. exports에 write 권한을 추가한다. username/password 경로는 delegated permission/public-client 설정과 사용자 site membership을 따르며 원문은 이 흐름에서 2FA를 지원하지 않는다고 명시한다.

Graph Lists 예제는 list item의 `@odata.nextLink`를 이어 가지만 list 목록 자체는 첫 page일 수 있다. 요청 실패를 None으로 바꾼 뒤 누적 결과를 반환하므로 partial 결과를 완전한 목록으로 보고할 위험이 있다. token 획득 코드가 수명을 읽는 것과 실제 refresh를 구현한 것은 다르다. 적용 시 failure propagation, 모든 page와 token 만료를 검증한다.

## 출처

- [Palantir, microsoft-excel](https://www.palantir.com/docs/foundry/available-connectors/microsoft-excel)
- [Palantir, microsoft-excel-online](https://www.palantir.com/docs/foundry/available-connectors/microsoft-excel-online)
- [Palantir, microsoft-sharepoint-excel](https://www.palantir.com/docs/foundry/available-connectors/microsoft-sharepoint-excel)
- [Microsoft Learn, Range: insert](https://learn.microsoft.com/en-us/graph/api/range-insert?view=graph-rest-1.0)
- [Palantir, microsoft-onedrive](https://www.palantir.com/docs/foundry/available-connectors/microsoft-onedrive)
- [Microsoft Learn, Download driveItem content](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0)
- [Microsoft Learn, Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Microsoft Learn, Upload small files](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content?view=graph-rest-1.0)
- [Requests, Quickstart: Timeouts](https://requests.readthedocs.io/en/latest/user/quickstart/#timeouts)
- [Palantir, microsoft-teams](https://www.palantir.com/docs/foundry/available-connectors/microsoft-teams)
- [Microsoft Learn, Microsoft Graph service-specific throttling limits](https://learn.microsoft.com/en-us/graph/throttling-limits)
- [Microsoft Learn, List channel messages](https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0)
- [Microsoft Learn, Send chatMessage in a channel](https://learn.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0)
- [Microsoft Learn, Resource-Specific Consent for Teams Agents and Apps](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Microsoft Learn, Grant tenant-wide admin consent to an application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent)
- [Microsoft Learn, List messages in a chat](https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0)
- [Palantir, sharepoint-online](https://www.palantir.com/docs/foundry/available-connectors/sharepoint-online)

## 관련 문서

- [[Palantir-Connector-Contracts]]
