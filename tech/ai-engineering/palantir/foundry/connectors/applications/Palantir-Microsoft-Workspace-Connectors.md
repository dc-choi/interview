---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Excel, Teams와 SharePoint의 데이터 및 권한

Excel driver의 worksheet/cell relational table과 파일 download/edit/upload는 다르다. generic Excel은 저장소 URI를, Excel Online은 Graph를, SharePoint Excel은 on-premise 2010/2013 계열의 별도 계약을 따른다. xls는 지원하지 않고 xlsm은 read-only라는 형식 조건을 확인한다.

## Excel의 읽기 부작용

기본 Recalculate는 read 중 workbook을 변경할 수 있다. cached value만 읽으려면 FALSE 선택과 실제 결과를 확인한다. mixed cell의 숫자가 text로 읽히는 경우도 있다. folder URI로 여러 workbook을 찾는 기능과 한 workbook의 sheet 범위를 구별한다.

openpyxl로 다운로드 후 업로드하는 예제는 파일 전체를 교체하며 모든 Excel 기능 보존을 보장하지 않는다. 원본 복사본으로 호환성을 확인하고 storage credential/egress/export 조건도 적용한다.

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
- [Palantir, microsoft-teams](https://www.palantir.com/docs/foundry/available-connectors/microsoft-teams)
- [Palantir, sharepoint-online](https://www.palantir.com/docs/foundry/available-connectors/sharepoint-online)

## 관련 문서

- [[Palantir-Connector-Contracts]]
