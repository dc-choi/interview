---
tags: [business, marketing, ai, mcp, connectors, permissions, ad-operations]
status: done
verified_at: 2026-10-26
category: "비즈니스&제품(Business&Product)"
aliases: ["AI Marketing Connectors", "AI 마케팅 커넥터"]
---

# AI 마케팅 커넥터의 권한과 데이터 경계

AI 마케팅 커넥터는 Claude 같은 AI 어시스턴트가 웹 수집, 광고 계정, 제품 분석과 SNS 게시 도구를 MCP 서버로 호출하게 하는 연결이다. 조사부터 집행까지 한 대화에서 이어지므로 판단의 중심은 연결할 도구의 개수가 아니라 작업마다 허용할 조회와 실행의 범위다. 프로토콜 구조는 [[MCP|MCP]], 서버 자격 증명과 요청 검증은 [[MCP-Security-Boundaries|MCP 보안 경계]]에서 다루고, 이 문서는 1인 사업자와 작은 팀의 운영 판단을 다룬다.

## 권한은 세 층에서 정해진다

| 층 | 정하는 것 | 확인할 곳 |
|---|---|---|
| 서비스 계정 | 연결한 계정이나 토큰이 접근하는 광고 계정, 프로젝트, 게시 프로필 | OAuth 동의 화면, API 키의 범위, 서비스의 역할 설정 |
| MCP 서버 | 노출하는 도구와 부수효과(읽기, 생성, 수정, 삭제, 게시, 발신) | 서버 문서의 도구 목록, 도구 필터와 읽기 전용 모드 |
| 호스트 | 대화별 사용 여부, 도구별 승인과 조직 제한 | Claude는 채팅 입력창 `+`의 Connectors 토글, 커넥터 설정의 Tool permissions, Team과 Enterprise에서는 Owner가 건 조직 제한 |

한 층의 제한이 다른 층을 대신하지 않는다. 호스트에서 도구를 막아도 계정 권한은 줄지 않고, 계정 권한을 좁혀도 남은 권한 안의 쓰기 도구는 실행된다. 호스트에서는 집행과 발신 도구를 Needs approval이나 Blocked로 두고, Team과 Enterprise에서는 Owner가 조직 전체에 건 도구 제한을 구성원이 바꿀 수 없으므로 조직에서 쓰는 커넥터의 집행 도구 제한은 Owner 설정에 둔다(적용 제안). 승인 선택지, 커넥터 라벨의 의미와 사용자 정의 커넥터의 조건은 [[Claude-Code-Business-Automation#외부 서비스 연동 — 전부 MCP|Claude 커넥터 권한 설정]]에 있다.

## 작업 유형별 판단

작업마다 공식 API나 공식 MCP, 중개 서비스, 수작업 가운데 경로를 고른다. 비교 기준은 플랫폼 토큰을 누가 보관하는지, 무료 한도의 공유 범위와 초과 동작, 대상 플랫폼 약관이 그 경로의 자동화를 허용하는지다. 제품사가 운영하지 않는 서드파티 서버는 운영 주체, 토큰 저장 위치와 노출 도구를 공식 서버와 따로 확인한다. 유형마다 첫 문단의 운영 원칙과 경로 선택은 운영 판단(적용 제안)이고, 첫 문단의 제품 설명과 제품 항목은 2026-10-25와 2026-10-26 각 제품의 공식 문서, 공식 저장소와 요금 문서로 확인한 사실이며 그 안의 해석과 제안에는 따로 표시한다. 도구 이름, 요금과 한도는 연결 시점에 다시 확인한다.

### 조사와 수집

검색과 공개 페이지 수집은 데이터를 읽기만 해도 대상 사이트의 약관과 개인정보 문제가 따라오므로 계정 안의 조회와 나눠 다루고, 확인 항목은 아래 수집 데이터 절을 따른다. 레코드나 크레딧 단위로 과금되는 대량 수집과 반복 모니터는 실행할 때마다 비용이 나가는 비용 집행이고, 브라우저의 클릭, 입력과 폼 작성은 다른 사이트에 행동을 일으키는 실행이다.

- 경로 선택: 대상 플랫폼의 공식 API나 공개 조회 도구가 있는지 먼저 확인하고, 약관이 자동 수집을 막는 대상은 공식 경로나 수작업 조회로 한정한다. 수집 서비스는 키를 URL에 두지 않는 인증, 키별 사용 한도와 도구 묶음 필터를 지원하는지로 고른다.
- Firecrawl 비용: 수집과 크롤링은 기본 페이지당 1크레딧이고, JSON 형식 추출은 페이지당 4크레딧, PDF 파싱은 PDF 페이지당 1크레딧이 더해지며 크롤링한 페이지에도 같은 옵션 비용이 붙는다. 브라우저 조작(`firecrawl_interact`)은 브라우저 사용 분당 2~7크레딧이다. API 키별 사용 한도를 걸면 한 키가 팀 잔액을 다 쓰지 못한다.
- Firecrawl 도구: 키 없는 연결은 수집, 검색, 파싱 세 도구만 노출하고, 키 없는 무료 이용은 IP 주소별 일일 한도를 따른다. 공식 저장소의 고정 범위 검색 엔드포인트(`https://mcp.firecrawl.dev/v2/mcp-search`)는 검색 계열 도구와 `firecrawl_find_tools`, `firecrawl_scrape`를 포함한 9개 도구만 노출해 브라우저 조작과 모니터 도구가 없다. 같은 저장소의 `src/index.ts`는 `CLOUD_SERVICE=true`일 때 안전 모드를 켜고 `src/server.ts`는 안전 모드에서 `firecrawl_scrape`의 `actions`를 받지 않으므로, 원격 호스팅 서버의 `firecrawl_scrape`는 브라우저 동작을 받지 않지만 로컬로 실행한 서버의 `firecrawl_scrape`는 `actions`로 클릭, 입력, 키 입력과 JavaScript 실행을 받는다. 모니터 도구는 반복 점검과 웹훅이나 이메일 알림을 다루고, 점검마다 URL 지정 모니터는 URL당, 크롤링 모니터는 발견한 페이지당 기본 1크레딧이 들고 검색 모니터는 결과 10개당 2크레딧이며, 판정을 켜면 URL 지정과 크롤링 모니터는 판정이 확인한 변경 페이지마다, 검색 모니터는 판정한 결과마다 1크레딧이 더해진다. 공식 저장소 기준으로 권장 방식(`page`나 `pages`와 `goal`)은 URL 지정 모니터를 만들고, 주기를 따로 주지 않으면 30분마다 점검하며 `goal`이 있으면 의미 있는 변경 판정을 자동으로 실행하므로, 기본 주기로 페이지 하나만 걸어도 30일이면 판정 비용을 빼고도 1,440크레딧이 된다(계산). 요금 문서는 점검 중 오류가 난 페이지에도 기본 1크레딧을 차감한다고 적는다. 공식 저장소는 API 키를 서버 URL이나 에이전트 대화에 넣지 말라고 안내한다.
- Bright Data: 기본으로 32개 도구를 모두 노출하므로 `groups`, `tools` 매개변수로 필요한 묶음만 연다(적용 제안). 원격 서버는 API 키를 `token` 질의 문자열로 받거나 OAuth 2.1 토큰을 `Authorization` 헤더로 받고, 두 방식은 같은 도구와 크레딧을 쓴다. 질의 문자열 방식은 URL이 곧 비밀번호가 되므로 OAuth를 먼저 검토한다(적용 제안). 사전 구축 스크레이퍼는 레코드 단위로 과금되고 공식 저장소는 Instagram 프로필, 게시물, 릴스, 댓글을 데이터 예로 들며, 원격 브라우저 묶음은 이동, 클릭, 입력, 폼 작성을 한다.

### 광고 집행

광고 서버는 일시 중지 상태의 초안 생성, 예산 지출을 시작하는 활성화, 기존 광고 수정과 고객 목록 변경을 한곳에 둔다. 지출과 맞춤 타겟 업로드는 되돌리기 어려우므로 생성, 활성화, 수정과 데이터 변경을 다른 권한으로 나누고, 활성화를 승인할 때는 대상, 금액, 기간과 승인자를 남겨 서비스 쪽 활동 기록과 대조한다. 반복 분석과 예산 집행을 다른 결정으로 다루는 원칙은 [[AI-Marketing-Analysis#반복 분석과 광고비 집행은 다른 결정이다|AI 마케팅 분석]]과 같고, 광고 구조와 지표 해석은 [[Meta-Paid-Ads|Meta 유료 광고]]를 따른다.

- 경로 선택: 제품사가 운영하는 MCP나 CLI처럼 공식 경로가 있어도 토큰의 권한 범위를 확인한 연결에서만 집행하고, 확인 전에는 활성화와 부스트를 광고 관리자에서 사람이 실행한다.
- Meta 광고 AI 커넥터: Meta는 2026-04-29 오픈 베타로 발표하며 MCP 연결에 개발자 자격 증명, API 설정이나 코딩이 필요 없다고 설명했다. 2026-10-25 개발자 문서에는 베타 표기가 없지만 현재 출시 단계는 확인하지 못했다. 서버 주소는 `https://mcp.facebook.com/ads`이고, 활동 기록 도구(`ads_account_get_activity_logs`)는 광고 관리자의 변경 기록에 대응한다. 개발자용 Ads CLI는 시스템 사용자 토큰으로 Marketing API를 호출한다.
- 생성과 집행 도구: 캠페인, 광고 세트, 광고 생성 도구는 대상을 일시 중지 상태로 만들고, `ads_activate_entity`로 활성화하면 예산 지출이 시작된다. 문서는 활성화 전에 AI 클라이언트가 확인을 요청한다고만 적고 방식을 밝히지 않는다. `ads_update_entity`는 바꿀 수 있는 필드를 밝히지 않는다. 페이지 서두는 쓰기 도구가 대상을 일시 중지 상태로 만든다고 일반적으로 적지만, Instagram 게시물을 광고로 전환하는 `ads_boost_ig_post` 행에는 일시 중지 표기가 없어 부스트 광고에도 적용되는지 확인하지 못했다. 고객 목록 맞춤 타겟에 해시 처리한 개인 데이터를 올려 사용자를 추가하거나 빼는 도구, 맞춤 타겟의 생성, 이름, 설명, 규칙과 라벨 수정, 삭제, 카탈로그 생성과 상품 데이터 추가, A/B 테스트와 전환 상승 연구 생성 도구도 있다. 신호와 데이터셋 묶음에는 픽셀 이벤트 규칙의 생성, 활성화와 비활성화, 삭제와 픽셀 매개변수의 생성, 수정, 삭제 도구가 있다.
- 권한: 자체 Meta 앱을 쓰면 OAuth 연결은 Facebook Login for Business 대화상자에서 권한을 승인하고, 사용자 액세스 토큰이나 시스템 사용자 토큰을 직접 쓸 수도 있다. 토큰에는 최소 `ads_mcp_management`와 `ads_read` 또는 `ads_management`가 필요하며 권한을 더 주면 쓸 수 있는 도구가 늘어난다. 시스템 사용자 토큰은 Employee 역할만 지원하고 Admin 역할 토큰은 MCP 서버에 접근할 수 없다(Ads CLI는 Admin과 Employee 시스템 사용자 모두 가능). `ads_read`만 준 토큰의 도구 목록, Meta 앱 없이 쓰는 연결 경로(발표가 말한 개발자 자격 증명 없는 연결)의 권한 범위와 광고 계정 선택 가능 여부는 확인하지 못했으므로, 확인 전에는 그 경로에서 집행 도구를 Blocked로 둔다(적용 제안).
- 승인 설정: 문서가 말한 활성화 전 확인을 Claude의 도구 승인으로 확보하도록 활성화와 수정 도구는 Needs approval로 둔다(적용 해석).

### 분석 질의

분석 도구는 이미 수집된 이벤트를 질의한다. 결제 직전 이탈을 단계별로 보려면 상품 조회, 결제 시작, 결제 완료 같은 단계가 이벤트로 남아 있어야 하고, 어떤 이벤트로도 남지 않은 단계는 질의로 만들어지지 않는다. PostHog의 액션은 과거 이벤트에도 적용되므로 페이지뷰나 자동 수집 이벤트가 남아 있으면 단계를 나중에 정의할 수 있다. 대화의 요약과 별도로 퍼널의 단계, 전환 기간과 집계 단위를 확인하고, 이벤트 설계는 [[App-Analytics-Event-Tracking|앱 분석 이벤트 계측]]을 따른다.

- 경로 선택: 제품사의 공식 MCP가 읽기 전용 모드와 프로젝트 고정을 지원하면 그 경로를 쓰고, 쓰기를 서버 층에서 막을 수 없으면 필요한 데이터만 내보내 분석한다.
- PostHog: 원격 서버(`https://mcp.posthog.com/mcp`)는 OAuth가 권장 경로이고, OAuth를 지원하지 않는 클라이언트는 MCP Server 프리셋으로 만든 프로젝트 범위의 개인 API 키를 Bearer 헤더로 보낸다. 연결과 도구 호출 자체에는 별도 요금이 없지만 질의가 쓰는 기반 데이터에는 기존 사용량 과금이 적용되고, 내부에서 LLM을 쓰는 일부 도구는 PostHog AI 사용액으로 과금될 수 있다. 조직과 프로젝트를 고정하면 전환 도구가 빠진다.
- PostHog 도구 모드: Claude, Claude Code, Cowork와 Codex는 기본으로 CLI 모드라 `exec` 도구 하나로 나머지 도구를 찾아 호출하므로, Claude의 도구별 승인으로는 읽기와 쓰기를 나눌 수 없다(적용 해석). 쓰기를 막으려면 읽기 전용 모드(`x-posthog-read-only` 헤더나 `readonly=true`)를 켜고, 도구별 승인을 쓰려면 `x-posthog-mcp-mode: tools` 헤더나 `mode=tools`로 개별 도구 모드를 고른다. 문서는 읽기 전용 모드와 `features`, `tools` 필터를 노출 도구 목록 기준으로만 설명하고 CLI 모드에서의 적용은 밝히지 않으므로, 연결 뒤 쓰기 도구가 실제로 빠졌는지 확인한다(적용 제안).

### 게시와 발신

게시, 예약, 댓글 답글과 DM은 공개되거나 상대에게 도달하면 되돌릴 수 없는 외부 발신이다. 중개 서비스는 자체 플랫폼 앱으로 연결을 단순하게 하지만 그만큼 게시와 발신 권한을 그 서비스 쪽에 맡기게 되므로, 해제도 서비스와 플랫폼 양쪽에서 한다.

- 경로 선택: 플랫폼의 공식 게시 경로가 있는지 먼저 확인하고, 중개 서비스는 보관하는 권한의 범위, 계정별 상한과 해제 방법을 비교해 고른다. 화면 조작으로 게시하는 방식은 대상 서비스 약관의 자동화 금지 조항부터 확인한다.
- Upload-Post: 공식 원격 서버(`https://mcp.upload-post.com/mcp`)는 `Authorization` 헤더의 API 키나 OAuth 2.1로 연결하고, OAuth 연결은 Connected Apps에서 해제한다. 업로드 도구는 `scheduledDate`와 `addToQueue`를 모두 주지 않으면 즉시 게시하고, 같은 서버에 예약 게시물의 조회, 수정, 취소, 분석, 댓글 답글과 DM 발송 도구가 있다. DM 묶음의 `manage_autodms`는 게시물에 댓글을 단 사람에게 자동으로 답하는 상시 모니터를 만들며, API 문서는 프로필당 하루 2개, 15일 뒤 자동 만료라고 적는다.
- 토큰 보관: Instagram은 비즈니스나 크리에이터 계정이어야 하고, Upload-Post는 자체 승인된 Meta 앱으로 게시하며 연결할 때 요청 권한을 모두 승인하라고 안내한다. API 문서는 Instagram DM 기능에 `instagram_business_manage_messages`, 댓글에 `instagram_business_manage_comments` 권한을 요구하므로, 게시와 DM 발송 권한이 담긴 토큰은 중개 앱 쪽에 있다고 보고 관리한다(적용 해석). 끝낼 때는 예약 게시물과 자동 DM 모니터를 먼저 취소하거나 중지하고, Connected Apps의 MCP 연결과 Upload-Post에 연결한 소셜 계정을 모두 끊고 플랫폼 쪽 연결 앱 권한도 확인해 해제한다(적용 제안).
- 한도: 무료 요금제는 월 10회 업로드와 프로필 2개이고, 월 업로드 한도를 넘으면 429와 현재 사용량을 반환한다(프로필 수 초과 시 동작은 요금 문서에 없다). Instagram 게시는 연결 계정마다 24시간 50건이 상한이고 이런 일일 상한에 걸려도 429를 반환한다. 요금 문서는 예약과 분석을 유료 요금제의 포함 항목으로 적는다.

## 작업별 기본 권한

다음은 위 문서에 맞춘 운영 제안이다. 분석은 틀려도 다시 조회하면 되지만(질의 데이터나 AI 기능이 사용량으로 과금되는 서비스에서는 재조회에도 비용이 든다) 예산 지출, 공개 게시와 외부 발신은 되돌리기 어렵다. 조회 전용 업무도 호스트 설정만 믿지 않고 읽기 전용 모드와 범위를 좁힌 키처럼 서버와 계정 층의 제한을 함께 쓴다.

| 작업 | 분류 | 기본 설정 |
|---|---|---|
| 성과 조회, 퍼널 질의, 활동 기록 조회 | 조회 | 대상 계정과 프로젝트를 고정하고 허용. 서버 쪽 계정 고정 설정이 문서에 없는 Meta는 토큰이 접근하는 광고 계정을 좁힌 연결에서만 허용. 읽기와 쓰기가 한 도구로 묶인 서버는 개별 도구 모드로 바꾸거나, 읽기 전용 모드를 켠 뒤 쓰기 도구가 빠졌는지 확인하고 허용 |
| 웹 검색, 공개 페이지 수집 | 수집 | 대상 사이트의 약관과 개인정보를 확인하기 전에는 Needs approval, Meta 제품 대상 스크레이퍼는 Blocked |
| 레코드 단위 스크레이퍼와 크롤링 같은 대량 수집, 반복 모니터의 생성, 수정과 즉시 점검 | 비용 집행 | Needs approval. 키별 사용 한도와 점검 주기를 먼저 정함 |
| 일시 중지 상태의 캠페인, 광고 세트, 광고 생성 | 초안 | Needs approval로 시작하고, 생성 결과가 일시 중지 상태임을 확인한 뒤 완화할 수 있음 |
| 광고 활성화, 게시물 부스트, 기존 광고 수정, 실험 생성과 수정 | 집행 | Needs approval. 권한 범위를 확인하지 못한 연결에서는 Blocked로 두고 광고 관리자에서 사람이 실행 |
| 즉시 게시, 예약과 예약 수정, 댓글 답글, DM(예약 취소도 같은 설정) | 외부 발신 | Needs approval |
| 자동 DM 모니터(`manage_autodms`) 생성 | 외부 발신 | Blocked를 기본으로 하고, 허용할 때는 대상 게시물, 답장 문구와 기간을 정해 승인 |
| 맞춤 타겟 생성과 수정, 사용자 변경과 삭제, 카탈로그 변경, 픽셀 이벤트 규칙과 매개변수 변경, 모니터 삭제 | 데이터 변경 | Blocked를 기본으로 하고 필요한 작업에서만 허용 |
| 브라우저 클릭, 입력, 폼 작성(로컬 Firecrawl 서버의 `firecrawl_scrape` 동작 포함) | 실행 | 조사 목적이면 Blocked. 수집에는 원격 호스팅 서버를 쓰거나 로컬 서버의 `firecrawl_scrape`도 이 행으로 다룸 |

## 수집 데이터의 약관, 저작권, 개인정보

공개 웹 데이터라는 제품 설명이나 수집 도구와의 계약은 대상 서비스의 약관, 콘텐츠 권리와 개인정보 검토를 대신하지 않는다. 아래는 확인할 대상이며 개별 수집의 법적 결론이 아니다.

- 약관의 적용 조건: 수집하는 사람이 그 서비스 약관에 동의한 계정 사용자인지, 로그인한 상태로 수집하는지, 내가 직접 수집하는지 수집 서비스가 수집하는지를 먼저 확인한다. 어떤 약관이 누구에게 적용되는지는 이 조건에 따라 달라질 수 있으므로 판단이 필요하면 법률 검토를 거친다.
- Meta의 자동 데이터 수집 약관(2024-10-07 시행)은 Meta 제품에서 자동화 도구로 데이터를 수집하려면 먼저 Meta의 명시적 서면 허가를 받아야 하고 약관 수락만으로는 그 허가가 되지 않는다고 적는다. 수집 데이터와 파생 데이터의 제3자 이전, 판매, 라이선스를 금지하고 Meta의 robots.txt 등 거부 규약을 따르게 한다.
- Instagram 이용 약관(2025-01-01 시행) 4.2는 로그인 상태인지와 관계없이 명시적 허가 없이 자동화된 방식으로 정보에 접근하고 수집하는 행위를 금지 행위에 포함하고, 저작권 침해 등 타인의 권리 침해도 금지한다. 다른 서비스의 화면 수집과 조작 조항은 [[Solo-Seller-Execution-Lessons-AI-Automation|1인 판매자의 AI 활용과 자동화 경계]]에 있다.
- Firecrawl 약관(2026-10-07 개정) 5.d.4는 법령, 규정이나 계약 조항을 위반하는 사용을 금지 사용으로 둔다.
- 경쟁 계정의 릴스, 광고 문구와 이미지를 재사용할지는 [[Competitive-Analysis#아이디어 참고와 표현 복제의 경계|아이디어 참고와 표현 복제의 경계]]에 따라 따로 판단한다. 경쟁사의 Meta 광고 소재는 Meta 광고 라이브러리처럼 플랫폼이 제공하는 공개 조회 경로를 먼저 검토한다([[Competitive-Analysis#매일 볼 수 있는 공개 도구|공개 도구의 해석 한계]]).
- 댓글, 프로필과 고객 목록에는 개인정보가 들어 있다. 수집하거나 맞춤 타겟에 올리기 전에 처리 목적, 근거와 보관 기간을 확인하고, 수집 서비스나 광고 플랫폼에 넘기는 것이 처리위탁인지 제3자 제공인지, 국외 이전에 해당하는지를 [[Privacy-Operations-for-Small-Business#외주업체와 클라우드에 맡겨도 되는가|대표의 개인정보 운영]] 기준으로 구분한다. 조회 결과는 대화의 컨텍스트로 들어오므로 대화의 보존 정책도 함께 본다.

## 트레이드오프

- 노출 도구가 많을수록 한 대화에서 조사부터 집행까지 이어지지만 잘못된 도구 호출과 프롬프트 인젝션이 미치는 범위도 커진다. 도구 묶음 필터나 읽기 전용 모드를 제공하는 서버(Bright Data의 `groups`, PostHog의 읽기 전용 모드 등)에서는 이를 켜 노출 도구를 줄이면 그 범위도 줄어든다(적용 해석). PostHog 문서도 실행 전에 도구 호출을 검토하고 읽기 전용 모드, 도구 필터와 프로젝트 고정으로 위험을 줄이라고 안내한다. 다만 PostHog는 Claude에서 기본 CLI 모드라 노출 도구가 `exec` 하나이므로, 읽기 전용 모드가 쓰기를 실제로 막는지 연결 뒤 확인한다.
- 승인 단계는 집행을 늦춘다. 초안 생성 도구는 일시 중지 생성을 확인한 뒤 완화하고 활성화, 게시와 발신 도구는 Needs approval로 유지하면, 초안 단계의 승인은 줄이면서 지출 시작, 게시와 발신은 사람이 확인하게 나눌 수 있다.
- API 키는 설정이 단순하지만 키를 가진 누구나 그 권한을 쓰고, URL에 든 토큰은 공유와 기록에 노출되기 쉽다. OAuth는 사용자별 연결과 해제가 가능하다.
- 2026-10-25 기준 무료 한도는 Bright Data 신규 계정 월 5,000 크레딧(일부 요금제 제외), Firecrawl 무료 요금제 월 1,000 크레딧, Upload-Post 무료 요금제 월 10회 업로드다. 한도는 키가 아니라 계정이나 팀에 걸리기도 해서 Bright Data는 계정의 모든 사용자가 공유하고, Firecrawl은 키별 사용 한도로 팀 잔액의 소진을 나눠 막는다. 소진 뒤에는 오류로 멈추거나(Firecrawl 무료 요금제 402, Upload-Post 429, 잔액 없는 Bright Data) 종량 과금으로 이어진다(잔액 있는 Bright Data). 정기 실행 하나가 다른 작업의 한도를 다 쓰거나 과금을 일으킬 수 있으므로 실행 빈도와 키별 비용 상한을 정한다.
- 커넥터 수, 자동 실행 횟수와 보고서 수는 투입 지표다. 성과는 같은 정의의 전환과 공헌이익을 비교 조건과 함께 본다([[Metrics-Framework|지표 설계]]). Meta MCP 문서는 A/B 테스트와 전환 상승 연구 도구를 묶어 광고의 증분 효과를 재는 용도로 설명하지만, Marketing API 문서는 A/B(분할) 테스트를 겹치지 않는 대상에게 광고 전략을 비교하는 방법으로 설명하고 인과 효과는 리프트 연구로 보게 한다. 광고안 사이의 상대 비교는 A/B 테스트로, 광고가 없을 때 대비 증분은 대조 집단을 둔 전환 상승 연구로 읽는다(적용 해석). 기회 점수나 업계 벤치마크 같은 플랫폼 진단값은 증분 측정이 아니므로 증분 효과는 비교 집단을 둔 실험으로 확인한다([[Metrics-Framework#광고 노출, 브랜드 리프트와 전환을 구분한다|리프트 실험의 비교 집단]]).

## 점검 항목

- [ ] 연결할 서버가 제품사가 운영하는 공식 서버인지, 서드파티라면 운영 주체, 토큰 저장 위치와 노출 도구를 확인했고, 플랫폼 토큰을 호스트, MCP 서버, 중개 서비스 가운데 누가 보관하는지 알고 있는가
- [ ] OAuth 범위, API 키 범위, 광고 계정과 프로젝트를 작업에 필요한 만큼으로 좁혔는가
- [ ] 생성(일시 중지 생성을 확인한 광고 초안 생성 도구는 완화 가능), 수정, 삭제, 활성화, 게시, 발신, 브라우저 조작 도구를 Needs approval이나 Blocked로 두었고, 집행과 발신 도구의 승인 요청에서 Always allow를 고르지 않는가
- [ ] 단일 실행 도구로 여러 도구를 호출하는 서버는 읽기 전용 모드나 개별 도구 모드처럼 서버 층에서 막았는가
- [ ] 서버 업데이트 뒤와 정기적으로 도구 목록과 도구별 권한을 다시 확인하는가
- [ ] 광고 활성화와 게시의 승인 기록을 남기고 서비스 쪽 활동 기록과 대조하는가
- [ ] 수집 대상의 약관 적용 조건, 콘텐츠 권리, 개인정보의 위탁과 제3자 제공, 국외 이전 여부를 확인했는가
- [ ] 퍼널을 질의하기 전에 단계 이벤트가 계측돼 있는지 확인했는가
- [ ] 무료 한도의 공유 범위와 초과 시 동작(오류 또는 종량 과금)을 알고 키별 사용 한도를 정했는가
- [ ] 끝난 연결은 대화에서 끄고 Claude에서 Disconnect하거나 다시 쓰지 않으면 Remove했으며(Team과 Enterprise의 조직 커넥터는 Owner가 조직 설정에서 제거), API 키나 URL 토큰으로 연결한 서버는 서비스에서 키를 폐기했고, 중개 서비스의 연결 해제와 플랫폼 쪽 연결 앱 권한 해제까지 마쳤는가

## 출처

2026-10-25와 2026-10-26 아래 문서를 열어 대조했다. Meta 비즈니스 지원 센터의 AI 커넥터 도움말은 제목만 열려 Meta 앱 없이 쓰는 연결 경로의 권한 범위를 확인하지 못했다. Claude 커넥터의 승인 선택지, Owner 조직 제한, 라벨과 사용자 정의 커넥터 근거는 [[Claude-Code-Business-Automation|Claude Code 비즈니스 자동화]]의 출처에 둔다.

- [Meta 광고 AI 커넥터 소개: 기존에 사용 중인 AI 도구에서 Meta 광고 관리하기 — Meta for Business](https://www.facebook.com/business/news/meta-ads-ai-connectors) — 2026-04-29 게시, 오픈 베타와 MCP 연결 조건
- [Meta 비즈니스 지원 센터, Meta 광고 AI 커넥터를 사용하여 AI 에이전트의 광고 관리하기](https://www.facebook.com/business/help/1456422242197840) — 2026-10-26, 제목만 확인, Ads MCP Server get started가 Meta 앱 없이 쓰는 경로로 안내하는 문서
- [Meta for Developers, Ads MCP Server](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-overview) — 서버 주소, 카탈로그와 실험 도구, 베타 표기 없음
- [Meta for Developers, Ads MCP Server get started](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-get-started) — Facebook Login for Business, 최소 권한과 시스템 사용자 토큰
- [Meta for Developers, Ad creation and management tools](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-tools-ad-creation-and-management) — 일시 중지 생성, 활성화와 지출 시작, 부스트와 맞춤 타겟 도구
- [Meta for Developers, Signals and datasets tools](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-tools-signals-and-datasets) — 2026-10-26, 픽셀 이벤트 규칙과 매개변수 도구
- [Meta for Developers, A/B tests and conversion lift studies](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-tools-abtests-and-conversion-lift-studies) — 실험 생성 도구와 증분 효과 측정 목적
- [Meta for Developers, Split testing](https://developers.facebook.com/docs/marketing-api/guides/split-testing/) — 2026-10-26, 분할 테스트의 비교 대상과 리프트 연구 안내
- [Meta for Developers, Comprehensive reporting tools](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-tools-comprehensive-reporting) — 성과 조회, 기회 점수, 업계 벤치마크
- [Meta for Developers, Activity logs tools](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-tools-activity-logs)
- [Meta for Developers, Ads CLI](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-cli/ads-cli-overview) — 시스템 사용자 토큰과 Marketing API 호출
- [Meta for Developers, Ads CLI get started](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-cli/setup/get-started) — 2026-10-26, Admin과 Employee 시스템 사용자
- [Meta, Automated Data Collection Terms](https://www.facebook.com/apps/site_scraping_tos_terms.php) — 2024-10-07 시행본
- [Instagram 고객센터, Instagram 이용 약관](https://www.facebook.com/help/instagram/581066165581870) — 2025-01-01 시행본 4.2
- [Bright Data Docs, MCP Server overview](https://docs.brightdata.com/ai/mcp-server/overview) — 팀 계정의 무료 한도 공유
- [Bright Data Docs, MCP Server tools](https://docs.brightdata.com/products/mcp-server/tools) — 기본 32개 도구, 도구 묶음, 레코드 단위 과금
- [Bright Data Docs, Bright Data MCP OAuth 2.1 setup](https://docs.brightdata.com/ai/mcp-server/remote/oauth) — 질의 문자열 토큰과 OAuth 헤더의 같은 도구와 크레딧
- [Bright Data Docs, Free tier](https://docs.brightdata.com/general/account/billing-and-pricing/free-tier) — 월 5,000 크레딧, 소진 뒤 종량 과금 또는 오류
- [brightdata/brightdata-mcp — GitHub](https://github.com/brightdata/brightdata-mcp) — 원격 URL의 토큰, 스크레이퍼 데이터 예시
- [Firecrawl Docs, MCP Server](https://docs.firecrawl.dev/mcp-server) — OAuth와 API 키 연결, 키 없는 연결의 도구
- [Firecrawl Docs, Firecrawl MCP tools](https://docs.firecrawl.dev/mcp-server/tools) — 브라우저 조작과 모니터 도구
- [Firecrawl Docs, Billing](https://docs.firecrawl.dev/billing) — 차감 단위, 402, 키별 사용 한도, 키 없는 이용의 IP별 일일 한도
- [Firecrawl Docs, Monitoring](https://docs.firecrawl.dev/features/monitoring) — 2026-10-26, 모니터 유형별 점검 과금, 판정이 확인한 변경 페이지당 1크레딧
- [Firecrawl Docs, Website monitoring](https://docs.firecrawl.dev/features/monitoring-website) — 2026-10-26, 크롤링 모니터의 점검당 발견 페이지 과금과 선택형 판정
- [firecrawl/firecrawl-mcp-server — GitHub](https://github.com/firecrawl/firecrawl-mcp-server) — 고정 범위 검색 엔드포인트, `src/index.ts`의 `CLOUD_SERVICE`와 안전 모드 연결, `src/server.ts`의 `actions` 허용 범위, `src/monitor.ts`의 기본 주기, URL 지정 대상과 `queries` 검색 대상, 모니터 자동 판정, API 키 취급
- [Firecrawl, Terms of Service](https://www.firecrawl.dev/terms-of-service) — 2026-10-07 개정본 5.d.4
- [PostHog Docs, PostHog MCP FAQ and advanced setup](https://posthog.com/docs/model-context-protocol/faq) — 인증, CLI 모드와 도구 모드, 읽기 전용 모드와 필터, 과금
- [PostHog Docs, Actions](https://posthog.com/docs/data/actions) — 2026-10-26, 과거 이벤트에 적용되는 액션과 페이지뷰 기반 정의
- [Upload-Post Docs, MCP Server](https://docs.upload-post.com/guides/mcp-server-integration) — 인증, Connected Apps, 즉시 게시와 `addToQueue`, 도구 목록과 `manage_autodms`
- [Upload-Post Docs, Pricing & Limits](https://docs.upload-post.com/resources/pricing-and-limits) — 무료 한도와 429
- [Upload-Post Docs, How to Post to Instagram with an API](https://docs.upload-post.com/guides/post-to-instagram-api) — 계정 유형, 자체 Meta 앱과 권한 승인, 24시간 50건
- [Upload-Post Docs, API Reference](https://docs.upload-post.com/api/reference/) — Instagram DM과 댓글의 필요 권한, 자동 DM 모니터의 프로필당 하루 2개와 15일 만료
- [Claude Docs, Get started with connectors](https://claude.com/docs/connectors/getting-started) — 2026-10-26, 대화별 Connectors 토글, Tool permissions, Disconnect와 Remove, Owner의 조직 커넥터 제거

## 관련 문서

- [[MCP|MCP]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[AI-Marketing-Analysis|AI 마케팅 분석]]
- [[Meta-Paid-Ads|Meta 유료 광고]]
- [[App-Analytics-Event-Tracking|앱 분석 이벤트 계측]]
- [[Competitive-Analysis|경쟁사 분석]]
- [[Privacy-Operations-for-Small-Business|대표의 개인정보 운영]]
- [[Solo-Seller-Execution-Lessons-AI-Automation|1인 판매자의 AI 활용과 자동화 경계]]
- [[Claude-Code-Business-Automation|Claude Code 비즈니스 자동화]]
