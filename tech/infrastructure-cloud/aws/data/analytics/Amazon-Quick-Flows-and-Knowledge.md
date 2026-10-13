---
tags: [aws, amazon-quick, workflow, knowledge-graph, automation]
status: done
verified_at: 2026-10-09
category: "Infrastructure - AWS"
aliases: ["Amazon Quick Flows", "Amazon Quick 개인 지식 그래프"]
---

# Amazon Quick의 워크플로와 개인 지식 그래프

Amazon Quick Flows는 입력, 조사, AI 응답과 연결 앱의 동작을 순서 있는 작업으로 구성하는 기능이다. 개인 지식 그래프는 연결한 자료에서 개체와 관계를 추출해 질문에 필요한 맥락을 찾는다. 두 기능을 사용할 때는 자료 탐색, 결과 생성과 외부 시스템 변경을 구분한다.

## Flows의 입력과 실행

자연어 설명이나 채팅에서 flow를 만들거나 시각적 편집기로 직접 구성할 수 있다. 단계에는 웹 검색, 모델의 일반 지식, 연결된 데이터 조회, 사용자 입력과 앱의 읽기/쓰기 동작 등이 있다. 생성된 단계가 의도한 자료를 읽고 결과를 내는지 실행 전에 확인한다.

설계 예를 들면 업계 동향 보고서는 검색 범위와 기간을 입력받고, 웹 자료를 찾고, 근거를 붙인 초안을 만드는 흐름으로 구성할 수 있다. 모델의 일반 지식으로 만든 문장과 검색한 자료로 확인한 사실을 구별한다. 보고서 생성 성공을 시장 수요나 수익성 검증으로 해석하지 않는다.

## 예약 실행과 쓰기 권한

2026-10-07 공식 문서 기준으로 예약에는 반복 주기, 시작일, 선택적 종료일, 시간대와 기본 입력을 설정한다. 공유받은 flow도 예약할 수 있지만 예약 자체는 개인 소유이며 다른 사용자와 공유되지 않는다.

외부 앱을 변경하는 action 단계가 있으면 `Run with no confirmation` 설정을 확인한다. 문서는 쓰기 action의 자동 양식 제출이 기본 활성화된다고 설명한다. 사람이 확인해야 하는 작업은 이 설정을 끄고 각 action을 검토하도록 구성한다. 예약을 만들었다는 사실만으로 사람의 검토 단계가 생기지는 않는다.

- 커넥터 인증이 만료되면 실행에 필요한 재인증 알림을 받을 수 있다. 예약 전에 수동 실행으로 연결 상태를 확인한다.
- 공유 flow가 새 버전으로 바뀌면 기존 예약도 갱신된 버전으로 계속 실행된다. 변경된 입력과 action을 다시 확인한다.
- 실행 이력에서 성공과 실패를 확인한다. 결과 생성과 외부 앱 변경 완료 여부는 따로 확인한다.

## 연결 앱의 실행 주체와 검증 경계

2026-10-09 공식 문서 기준, Jira Cloud 커넥터는 이슈 검색뿐 아니라 생성, 수정과 삭제 action을 제공한다. 실제로 사용할 수 있는 action은 Jira의 권한과 인증 방식에 따라 달라진다. 문제 해결 안내나 영업 미팅용 초안을 생성하는 작업과 티켓 생성, 상태 변경을 수행하는 작업은 권한과 완료 조건을 나누어 설계한다.

ServiceNow의 서비스 인증에서는 설정한 OAuth application user의 권한으로 action을 실행한다. 해당 통합에 접근할 수 있는 Quick 사용자는 그 계정의 권한을 사용하므로, 각 사용자의 개인 계정 권한이 그대로 적용된다고 가정하지 않는다. 통합 공유 대상과 서비스 계정의 실제 권한을 함께 검토한다.

ServiceNow REST API 경로에는 브라우저의 UI policy, UI action과 client script가 적용되지 않는다. 서버의 business rule, ACL과 data policy는 적용된다. 따라서 화면에서 필수 입력을 요구했다는 사실만으로 자동 생성 티켓에도 같은 검증이 수행된다고 판단하지 않는다.

다음은 위 경계를 적용한 운영 점검 예시다. 티켓 생성 전에 대상 프로젝트나 테이블, 필수 필드와 실행 계정을 확인한다. 실행 뒤에는 반환된 식별자로 생성 결과를 확인하고, 응답이 끊긴 경우 기존 생성 여부부터 조회해 중복을 피한다. 보고서나 알림 초안이 만들어졌다는 사실을 외부 앱 변경이나 수신자 전달의 완료로 기록하지 않는다. 이 점검 절차는 커넥터가 자동으로 보장하는 동작이 아니다.

### CRM 연결의 사용자 인증과 서비스 인증

2026-10-10 Salesforce 연동 공식 문서 대조 기준. 사용자 인증(3LO)은 로그인한 사용자를 대신해 action을 실행하고, 서비스 인증(2LO)은 Salesforce에 지정한 `Run As` 사용자의 권한으로 실행한다. 여러 영업 담당자가 같은 통합을 쓴다고 해서 서비스 인증의 실행 주체가 각 담당자로 바뀌지는 않는다.

영업 미팅용 자료 조회와 CRM 레코드 변경을 구분한다. 연결 성공뿐 아니라 어떤 계정의 권한으로 어떤 고객 자료를 읽고 변경할 수 있는지 확인한다. 이는 Salesforce 커넥터의 인증 경계를 적용한 점검 제안이며, 특정 회사가 사용한 CRM이나 실제 연동 구성을 뜻하지 않는다.

### CRM 조회 action과 지식 기반 수집은 다르다

2026-10-13 Salesforce 통합 공식 문서 대조 기준. 이 커넥터는 action 실행을 지원하며 Salesforce 자료의 데이터 수집 연동과 지식 기반 생성은 지원하지 않는다. 레코드 질의도 action으로 수행할 수 있으므로, 데이터 수집 미지원이 CRM 조회 불가를 뜻하지는 않는다.

영업 현황을 질의해 응답을 받는 것과 CRM 자료를 지속적으로 색인해 지식 기반으로 보관하는 구성을 구분한다. 레코드 변경은 대상 식별자와 변경 필드를 확인하고 실행 뒤 원래 CRM에서 결과를 조회하는 절차를 권한다(운영 점검 제안). 자연어 성공 응답만으로 변경 완료를 판정하지 않는다. 이 절만 추가 대조했으며 문서 전체의 검증일은 유지한다.

### MCP 연결과 도구 갱신

2026-10-13 MCP 통합 공식 문서 부분 대조 기준. Quick은 원격 MCP 서버의 도구를 action으로 등록한다. 로컬 `stdio` 연결은 지원하지 않으며 HTTP streaming을 우선하고 SSE도 지원한다. Enterprise 구독과 서버 접근 조건을 확인한다.

- 비공개 서버는 Quick VPC 연결로 접근할 수 있다. MCP 도구 호출 경로의 `VpcConnectionArn`과 OAuth 인증 경로의 `AuthVpcConnectionArn`은 독립적이다. 도구 서버 연결 성공만으로 비공개 인증 서버까지 연결됐다고 판단하지 않는다.
- 내장 MCP 커넥터는 자동 동기화하지만 사용자 정의 커넥터는 소유자가 `Sync`를 실행해야 도구 변경을 반영한다. 동기화는 재인증 흐름을 시작하며 새로 요구되는 OAuth scope가 허용되지 않았으면 실패한다.

운영 점검 제안: 서버 도구를 바꾼 뒤 Quick에 등록된 action 목록과 실제 권한을 다시 확인한다. 도구 발견, 호출 성공과 외부 상태 변경 완료를 각각 검증한다. 이 절만 추가 대조했으며 기존 검증일은 유지한다.

## 개인 지식 그래프의 근거

Quick은 연결 앱과 폴더 자료에서 사람, 프로젝트, 문서, 일정 같은 개체와 관계를 추출하고 사용자별 계정에 보관한다. 연결 앱의 자동 수집과 폴더별 그래프 추출은 별도 설정이다. 폴더의 키워드/시맨틱 색인과 그래프 추출도 독립적이다.

개체 상세에는 AI 요약, 연결 개체와 추출에 사용한 파일 및 메시지가 표시된다. 그래프에서 관련 자료를 찾은 뒤 원문과 발생 시점을 확인하는 경로로 사용한다. 관계가 표시됐다는 사실만으로 인과관계나 사건의 책임까지 확정하지 않는다. 이는 추출된 맥락을 판단에 사용할 때의 검토 원칙이다.

그래프 초기화는 개체와 관계를 지우지만 원본 파일, 메모리와 연결 서비스는 지우지 않는다. 자동 수집과 폴더 추출을 켜 두면 그래프가 다시 만들어질 수 있다. 따라서 그래프 삭제를 원본 데이터 삭제나 연결 해제로 간주하지 않는다.

## 팀 자료를 모을 때의 공유 경계

2026-10-10 Spaces 공식 문서 대조 기준. Space는 팀이나 업무 영역에 맞춰 파일, 대시보드, 지식 기반과 action을 모으는 단위다. 자료를 한곳에서 찾는 편의와 각 자료의 접근 권한은 구분한다.

- 기존 Quick 리소스를 Space에 연결해도 원래 리소스의 접근 권한을 우회하지 않는다.
- Space에 직접 업로드한 파일은 해당 Space에 접근할 수 있는 사람에게 공개된다. 원본 저장소의 개별 파일 권한이 업로드 사본에도 유지된다고 가정하지 않는다.
- 파일의 `Text ready`는 텍스트 질의 준비 상태이며 이미지와 표는 아직 처리 중일 수 있다. `Ready`는 텍스트와 미디어 처리가 끝난 상태다.

프로젝트 초안을 만들 때는 공유 가능한 자료만 올리고, 표나 이미지에 의존하는 질문은 처리 상태를 확인한 뒤 평가한다. 초안 생성 시간과 검토, 수정 및 실제 업무 완료 시간도 따로 측정한다. 이는 운영 점검 제안이며 특정 팀의 시간 절감률을 재현한다는 보장은 아니다.

### S3 버킷 접근과 문서별 수집 권한

2026-10-13 S3 통합 공식 문서 부분 대조 기준. S3 통합은 버킷의 문서를 색인해 지식 기반으로 사용하는 기능이다. Enterprise 구독과 관리자의 대상 버킷 접근 허용이 필요하며, 다른 계정의 버킷을 연결할 때도 같은 리전이어야 한다.

ACL을 활성화한 지식 기반에서는 ACL 항목이 없는 문서를 수집하지 않는다. 전역 ACL 파일이나 문서 메타데이터 파일에 해당 문서의 ACL이 있는지 확인한다. 버킷을 연결했지만 특정 문서가 검색되지 않는다면 연결 권한뿐 아니라 문서별 ACL 누락도 조사한다.

이 지식 기반 수집과 파일 업로드, 다운로드, 삭제 action은 별도 기능이다. 공식 안내에서 S3 action은 Quick Automate용으로 한정한다. 지식 기반을 Space에 연결했다고 채팅에서 S3 파일 변경까지 가능하다고 가정하지 않는다. 이 절의 기능만 대조했으며 기존 검증일은 유지한다.

### SharePoint의 지식 수집과 action 권한

2026-10-13 SharePoint 공식 문서 부분 대조 기준. SharePoint 연결은 자료를 색인하는 지식 기반과 목록, 파일, Excel을 읽거나 변경하는 action 통합을 구분한다. 지식 기반은 문서 라이브러리, 사이트, 목록과 페이지를 검색과 질의응답에 사용한다.

- 관리자 관리형 지식 기반은 문서별 ACL을 선택적으로 지원한다. ACL을 활성화하면 SharePoint의 접근 목록을 동기화하고 질의 시 사용자의 권한을 확인한다. 관리자 연결을 만들었다는 사실만으로 ACL 적용을 단정하지 않는다.
- action의 사용자 인증은 로그인한 사용자를 대신한다. 서비스 인증은 사용자 없이 애플리케이션 권한으로 실행하며, 통합 이용자는 그 서비스가 접근할 수 있는 사이트에 action을 수행할 수 있다. 지식 기반의 문서별 ACL을 action의 쓰기 권한으로 확대 해석하지 않는다.

운영 적용 예로, 배송 보고서를 만들 때 필요한 문서를 찾는 단계와 원본 Excel의 셀을 갱신하는 단계를 나눈다. 각 단계의 인증 방식과 허용 대상을 확인하고, 실제 이용자별로 자료 조회와 쓰기 가능 범위를 시험한다. 자동화의 시간 절감은 생성 시간뿐 아니라 검토와 수정까지 포함해 측정한다. 이는 운영 제안이며 특정 공급망 사례의 절감률이나 연동 구성을 재현한다는 주장이 아니다. 이 절의 기능만 추가 대조했으며 frontmatter의 기존 검증일은 유지한다.

## Research의 자료 선택과 근거 추적

2026-10-10 Quick Research 공식 문서 대조 기준. 조사 입력은 웹 검색, 업로드 파일과 Quick 자산 등에서 선택한다. 웹 검색의 선호 사이트에 도메인을 넣어도 실제 조사에 포함된다는 보장은 없다. 접근 제한이나 관련성 판단으로 빠질 수 있으므로 필수 자료가 사용됐는지는 결과에서 확인한다.

보고서의 번호 인용은 원문 링크를 제공하고, `Understand the statement`는 문장을 도출한 근거와 결론의 설명을 보여준다. 인용의 존재와 설명 기능을 사실 검증 완료로 취급하지 않고 원문의 수치, 기간과 비교 대상을 대조한다.

경쟁사 조사나 캠페인 보고서에 적용한다면, 먼저 조사에 쓸 자료를 정하고 결과의 근거를 확인한 뒤 예산 변경처럼 외부 상태를 바꾸는 action을 별도로 검토한다. 이는 기능을 활용하는 운영 제안이다. 보고서 생성이나 추천 출력만으로 캠페인 성과 개선이 입증되지는 않는다.

## 웹 자료 동기화와 보고서 실행은 따로 확인한다

2026-10-13 Web Crawler와 Flows 예약 실행 공식 문서 부분 대조 기준. Enterprise Edition의 Web Crawler는 웹페이지를 수집해 지식 기반을 만드는 통합이다. 웹사이트를 변경하는 action은 제공하지 않는다. 지식 기반 생성 시 동기화가 시작되고, 첫 전체 수집 뒤에는 변경분을 동기화한다.

- 수집 깊이와 링크 범위가 대상 페이지를 포함하는지 확인한다. PDF 같은 연결 파일은 첨부파일 수집 설정도 확인한다.
- JavaScript 렌더링은 지원하지만 클릭, 스크롤과 hover를 흉내 내지는 않는다. 상호작용 뒤에만 나타나는 링크가 빠질 수 있으므로 수집 성공과 대상 문서 확보를 구분한다.
- Flows 실행 이력은 30일 보존된다. 예약 실행 성공 기록만으로 원천 자료가 최신인지, 필요한 페이지를 전부 수집했는지 판단하지 않는다.

공개 정책 변경을 모니터링하는 운영 예라면 원천 페이지의 개정일, 지식 기반 동기화 상태와 보고서 실행 시각을 각각 확인한다. 필요한 규정의 누락과 요약 오류를 원문 대조로 점검하고, 장기 감사가 필요하면 실행 결과와 근거 보존 방식을 별도로 정한다. 이는 기능 경계에 근거한 운영 제안이며 실시간 변경 탐지나 규정 준수의 보장은 아니다. 이 절만 추가 대조했으며 기존 검증일은 유지한다.

## Chat agent의 배포와 자료 권한을 분리한다

2026-10-10 Custom chat agents 공식 문서 대조 기준. 업무별 chat agent에는 응답 지침, Space 등의 지식 자료와 action을 연결할 수 있다. 에이전트 공유 권한과 연결한 개별 리소스의 접근 권한은 별도로 관리한다.

- `Update preview`로 변경을 저장하고 시험한 뒤 `Launch`로 반영한다. 생성 도중 출시하지 않고 나가면 preview는 저장되지 않는다.
- 처음 출시한 agent는 기본 비공개다. 공유 후 다시 수정하고 출시하면 접근 권한이 있는 사용자들에게 같은 agent의 변경이 반영된다.
- `Owner`는 편집, 공유, 사용과 삭제를 할 수 있고 `Viewer`는 조회와 사용을 할 수 있다. 초안을 사용하는 사람 모두에게 편집 권한을 줄 필요는 없다.

콘텐츠 생성에 적용할 때는 승인된 제품 설명과 대상 독자를 지침에 넣고, 실제 이용자의 권한으로 자료 조회와 결과를 시험한다. 이는 기능에 근거한 운영 제안이다. agent 링크 공유만으로 원문 접근, 문구의 정확성이나 콘텐츠 발행 승인까지 확보됐다고 판단하지 않는다.

## 메일 피드와 Outlook 확장의 읽기 조건

2026-10-14 Activity feed와 Outlook extension 공식 문서 부분 대조 기준. 연결 서비스의 활동을 모으는 피드와 Outlook 안에서 요청을 실행하는 확장은 읽기 조건이 다르다.

- 활동 피드는 연결된 메일, 메시지와 일정에서 중요도를 정하고 요약과 후속 행동을 제안한다. 표시할 출처와 확인 주기를 설정하며, 데스크톱 앱을 닫거나 컴퓨터를 꺼도 클라우드에서 갱신될 수 있다.
- Outlook 확장은 사이드 패널이 닫혀 있으면 메일과 콘텐츠를 읽지 않으며, 사용자가 프롬프트를 보내기 전에는 Quick으로 데이터를 보내지 않는다. 이 조건을 별도로 연결한 활동 피드의 중지 조건으로 해석하지 않는다.
- 받은편지함 정리와 일정 관리 같은 일부 확장 기능은 관리자가 승인한 Microsoft Graph API 권한이 필요하다. 확장 설치와 필요한 권한 확보를 구분한다.

운영 점검 제안: 고객 후속 연락을 관리할 때 어떤 연결이 백그라운드로 자료를 읽는지 확인하고, 제안된 답장과 할 일을 원문에 대조한다. 생성한 답장에는 수신자가 접근할 수 없는 자료가 포함될 수 있으므로 발송 전에 공유 범위를 검토한다. 피드에서 항목이 해결됨으로 표시된 사실을 CRM 변경이나 고객 연락의 완료 증거로 대신하지 않는다. 이 절만 추가 대조했으며 기존 검증일은 유지한다.

## 적용 전 확인

- 반복할 절차와 필요한 입력이 명확한가. 변하지 않는 단순 집계라면 기존 쿼리와 보고서로 충분한지도 검토한다.
- 자료 조회 권한과 앱 변경 권한을 구분했는가.
- 생성 결과를 검토할 사람이 누구이며, 무인 실행에 허용한 action은 무엇인가.
- 그래프가 가리키는 원문으로 되돌아가 사실과 추론을 구별할 수 있는가.

## 출처

- [Amazon Quick, Activity feed](https://docs.aws.amazon.com/quick/latest/userguide/activity-feed-desktop.html)
- [Amazon Quick, Amazon Quick Microsoft Outlook extension](https://docs.aws.amazon.com/quick/latest/userguide/outlook-extension-guide.html)
- [Amazon Quick, Model Context Protocol (MCP) integration](https://docs.aws.amazon.com/quick/latest/userguide/mcp-integration.html)
- [Amazon Quick, Amazon S3 integration](https://docs.aws.amazon.com/quick/latest/userguide/s3-integration.html)
- [Amazon Quick, Troubleshooting Amazon S3 integration issues](https://docs.aws.amazon.com/quick/latest/userguide/s3-integration-troubleshooting.html)
- [Amazon Quick, Web Crawler integration](https://docs.aws.amazon.com/quick/latest/userguide/web-crawler-integration.html)
- [Amazon Quick, Microsoft SharePoint knowledge base integration](https://docs.aws.amazon.com/quick/latest/userguide/sharepoint-knowledge-base.html)
- [Amazon Quick, Admin-managed setup (service credentials)](https://docs.aws.amazon.com/quick/latest/userguide/sharepoint-kb-admin-managed.html)
- [Amazon Quick, Microsoft SharePoint action integration](https://docs.aws.amazon.com/quick/latest/userguide/sharepoint-action-integration.html)
- [Amazon Quick, Custom chat agents](https://docs.aws.amazon.com/quick/latest/userguide/custom-agents.html)
- [Amazon Quick, Select research materials](https://docs.aws.amazon.com/quick/latest/userguide/select-research-materials.html)
- [Amazon Quick, View research report](https://docs.aws.amazon.com/quick/latest/userguide/view-research-report.html)
- [Amazon Quick, Salesforce integration](https://docs.aws.amazon.com/quick/latest/userguide/salesforce-integration.html) — 사용자 인증과 서비스 인증의 실행 주체.
- [Amazon Quick, Organize, collaborate, and share resources with spaces](https://docs.aws.amazon.com/quick/latest/userguide/working-with-spaces.html)
- [Amazon Quick, Atlassian Jira Cloud integration](https://docs.aws.amazon.com/quick/latest/userguide/jira-integration.html)
- [Amazon Quick, ServiceNow integration](https://docs.aws.amazon.com/quick/latest/userguide/servicenow-integration.html)
- [Amazon Quick, Using Amazon Quick Flows](https://docs.aws.amazon.com/quick/latest/userguide/using-amazon-quick-flows.html)
- [Amazon Quick, Scheduling your Amazon Quick Flows](https://docs.aws.amazon.com/quick/latest/userguide/schedules-in-quick-flows.html)
- [Amazon Quick, Knowledge graph](https://docs.aws.amazon.com/quick/latest/userguide/knowledge-graph-desktop.html)

## 관련 문서

- [[QuickSight|Quick Sight의 BI와 대시보드]]
- [[LLM-Workflow-Patterns|LLM 워크플로 패턴과 실행 경계]]
- [[Agent-Data-Analysis-Workflow|에이전트 데이터 분석과 보고서]]
