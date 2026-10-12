---
tags: [ai, mcp, security, oauth, gateway, credential, http-header]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["MCP Security Boundaries", "MCP 보안 경계", "MCP Gateway", "MCP 게이트웨이", "Credential Injection", "자격 증명 주입", "x-mcp-header", "MCP 헤더 미러링"]
---

# MCP 보안 경계: 서버 자격 증명, 요청 검증과 게이트웨이

MCP 서버가 외부 API의 토큰(개인 액세스 토큰, 서비스 계정 자격 증명)을 들고 있을 때 요청을 인증하지 않거나 아래 경계 검증이 빠지면, 그 서버에 요청을 보낼 수 있는 누구나 그 토큰의 권한으로 도구를 실행할 수 있다. 토큰은 서버에 있어도 그 권한을 쓰는 것은 요청자다. 그래서 MCP 서버의 보안은 토큰을 숨기는 것만으로는 부족하고, 요청이 넘어오는 경계마다 누가 무엇을 어디로 보내는지 검증해야 한다. MCP의 구성과 token passthrough 금지 같은 기본은 [[MCP]]가 맡는다.

## 서버가 지킬 네 경계

| 경계 | 막는 것 | 기준 |
|---|---|---|
| 인증 | 사용자 신원이 없는 요청을 서버(운영자)의 자격 증명으로 처리 | 인증되지 않은 요청은 도구 실행 전에 거절하고, 전역 자격 증명으로 대신 처리하지 않는다 |
| 파일 경로 | 도구 인자의 `file_path`로 서버의 파일(환경 변수, 설정, 키)을 읽어 외부로 업로드 | 경로를 정규화한 뒤 허용한 작업 디렉터리 안인지 확인하고 `..` 탈출을 거절한다 |
| API 목적지 | 요청 헤더나 인자로 API 기준 URL을 바꿔 서버가 토큰을 다른 host로 보내게 함 | 토큰을 붙일 host를 설정의 허용 목록으로 고정한다. IP 대역으로 검증한다면 검증한 IP로 연결을 고정하고, 리디렉션마다 다시 검증한다 |
| Origin과 Host | DNS rebinding으로 웹 페이지가 브라우저를 통해 로컬 MCP endpoint를 호출 | 예상하지 않은 `Origin`, `Host`를 HTTP 경계에서 거절한다. 127.0.0.1 bind는 다른 host의 직접 접근을 줄일 뿐 DNS rebinding은 막지 못한다 |

네 경계는 서로 대신하지 않는다. 인증을 붙여도 인증된 사용자가 `file_path`로 서버의 비밀을 읽을 수 있고, 목적지를 고정해도 인증이 없으면 아무나 서버의 토큰으로 도구를 부른다.

MCP 명세(2026-07-28)의 기준:

- 인가는 MCP 구현의 선택 사항이지만, HTTP 전송에서 인가를 쓰는 서버는 access token이 자기를 대상으로 발급됐는지 검증하고(MUST) 다른 토큰은 받지도 넘기지도 않는다(MUST NOT).
- Streamable HTTP 서버는 모든 연결의 `Origin`을 검증해야 하고(MUST), `Origin`이 있는데 유효하지 않으면 403을 돌려준다. 로컬에서 돌 때는 0.0.0.0이 아니라 127.0.0.1에만 bind하고, 모든 연결에 적절한 인증을 구현하도록 권한다(SHOULD).
- 로컬 전용 서버는 stdio 전송으로 클라이언트만 접근하게 하거나, HTTP를 쓰면 인가 토큰이나 접근이 제한된 unix domain socket 같은 IPC로 다른 프로세스의 사용을 막도록 권한다.
- 상태를 잇는 handle(장바구니 ID, 작업 ID)을 가졌다는 사실을 인증으로 취급하지 않고(MUST NOT), handle을 검증된 사용자에 묶도록 권한다(SHOULD).
- MCP 서버가 알려 준 OAuth 관련 URL을 가져오는 클라이언트와, 클라이언트가 준 metadata 문서 URL을 가져오는 인가 서버도 SSRF의 표적이 된다. 사설 IP 대역과 cloud metadata 주소를 막고, 리디렉션 대상도 같은 규칙으로 검증하며, 검사 시점과 사용 시점의 DNS 결과가 달라지는 문제(TOCTOU)를 고려하도록 권한다. 명세의 SSRF 지침은 이 두 경우를 다루며, 위 표의 API 목적지 기준은 같은 원칙을 서버의 downstream 호출에 적용한 것이다.

## 사례: 2026년에 공개된 MCP 서버 권고

| 패키지 | 경계 | 내용 | 수정 버전 |
|---|---|---|---|
| mcp-atlassian | 인증, 파일 경로 | HTTP 전송이 사용자 신원이 없는 요청을 전역으로 설정한 Jira와 Confluence 자격 증명으로 처리했다(GHSA-vc8m-84rp-53hx). `upload_attachment`의 `file_path`도 제한이 없어 서버 파일을 첨부로 올릴 수 있었다(GHSA-cc5h-2pwp-pvcc) | 0.22.0 |
| @zereight/mcp-gitlab | 인증, 파일 경로 | SSE 전송이 인증 없이 모든 도구를 노출했고, `upload_markdown`의 `file_path`로 `/proc/self/environ`을 읽어 개인 액세스 토큰을 빼낼 수 있었다. 권고는 SSE를 Docker 배포의 기본 모드로, docker-compose의 3002 포트 매핑이 0.0.0.0에 열린다고 적는다(GHSA-cv3r-c5h8-f4g5) | 2.1.27 |
| @zereight/mcp-gitlab | API 목적지 | 동적 API URL 설정에서 요청 헤더 `X-GitLab-API-URL`을 host 검증 없이 API 기준 URL로 써서, 서버가 붙이는 GitLab 토큰이 공격자 host로 갈 수 있었다(GHSA-2h44-8472-frjj) | 2.1.27 |
| @zereight/mcp-gitlab | Origin과 Host | 기본 bind 주소가 127.0.0.1인데도 Streamable HTTP endpoint에 유효한 Host, Origin 허용 목록이 없어 DNS rebinding으로 로컬 서버에 닿았다(GHSA-vmp7-252j-cwp7) | 2.1.30 |

mcp-atlassian 권고는 2026-07-10 저장소 보안 권고로 게시됐고 해당 CVE(CVE-2026-77254, CVE-2026-77248)는 2026-09-22에 공개됐다. @zereight/mcp-gitlab 권고는 2026-06-22(GHSA-cv3r), 2026-07-01(GHSA-2h44), 2026-07-03(GHSA-vmp7)에 저장소 보안 권고로 게시됐고 해당 CVE는 2026-09-15에 공개됐다. 버전과 식별자는 2026-10-06 OSV와 GitHub 보안 권고 기준이다.

- 같은 패키지라도 권고마다 수정 버전이 다를 수 있다(@zereight/mcp-gitlab은 2.1.27과 2.1.30). 패치 버전 하나만 보고 판단하지 않고 권고별로 확인한다.
- 배포 기본값이 사고의 크기를 정한다. 기본 Docker 배포 구성을 그대로 쓴 서버는 네트워크에서 인증 없이 도구를 부를 수 있었다.
- 목적지 검증은 한 번의 수정으로 끝나지 않을 수 있다. mcp-atlassian은 SSRF 수정 뒤에도 검증한 IP를 연결에 고정하지 않아 생긴 DNS rebinding 우회(GHSA-72fm-whvq-jghf, GHSA-489g-7rxv-6c8q)와 리디렉션 우회(GHSA-v9m3-wfh8-5646) 권고를 따로 냈다.

## 게이트웨이: 신원, 정책과 자격 증명을 한곳에서

MCP는 도구를 기술하고 찾고 부르는 공통 형식(`tools/list`, `tools/call`)과 클라이언트와 서버 사이의 인가를 정한다. 조직 안에서 어떤 에이전트가 어떤 도구를 쓸지, 누구의 계정으로 실행할지, 접근을 어떻게 회수할지는 조직의 정책으로 남는다. MCP 서버가 늘면 서버마다 OAuth 연결, 비밀 보관과 사용 기록을 따로 구현하게 되므로, 에이전트의 MCP 요청을 하나의 관문으로 받고 관문이 정책과 자격 증명을 적용해 downstream MCP 서버로 넘기는 구성을 쓸 수 있다. 관문이 모든 자격 증명을 쥐게 되므로 위의 네 경계는 관문에 먼저 적용한다.

| 구성 요소 | 역할 |
|---|---|
| Proxy(데이터 평면) | 호출자 인증, 권한 확인, rate limit, 자격 증명 주입, downstream 전달, 사용 이벤트 기록 |
| Registry(제어 평면) | 등록된 에이전트와 MCP 서버, 소유자, 인증 방식, 정책과 노출할 도구 목록의 정본 |

downstream 자격 증명은 네 방식으로 나눠 볼 수 있다.

| 방식 | 내용 |
|---|---|
| 내부 서비스 신원 | 내부 인프라가 검증한 호출자 맥락을 내부 서비스로 전달한다 |
| 관문이 보관한 토큰 | 벤더나 서비스 토큰을 관문의 비밀 저장소에 두고 요청에만 붙인다. 에이전트는 토큰을 받지 않는다 |
| 사용자별 OAuth | 사용자가 외부 서비스에 허락한 권한이다. 관문이 토큰을 보관하고 갱신한다 |
| 서비스 주체(service principal) | 사람이 아닌 팀 자동화의 신원이다. 짧게 유효한 자격 증명을 받아 쓴다 |

- **신원 확인과 자격 증명 선택은 다른 일이다.** 관문에 들어온 호출자가 누구인지와 downstream에 어떤 자격 증명을 붙일지는 따로 정한다. 원본 자격 증명(벤더 키, refresh token)을 에이전트에 주지 않아야 교체, 회수와 감사를 한곳에서 한다.
- **발견과 실행을 따로 인가한다.** `tools/list`에 도구가 보인다고 그 호출이 허용된 것은 아니므로 `tools/call` 때 정책을 다시 확인한다. 저장소 검색 권한이 그 서버의 모든 작업 권한을 뜻하지 않도록 읽기 도구와 변경 도구를 나눠 허용한다.
- **보이는 도구를 줄인다.** 서버의 관리, 결제와 삭제 도구까지 모두 보이면 모델의 선택지와 위험이 함께 늘어난다. 작업에 필요한 도구만 묶어 하나의 endpoint로 보이고, 이름이 겹치면 접두사를 붙인다. 도구 과다 노출의 컨텍스트 비용은 [[Context-Engineering]]을 따른다.
- **외부 계정 연결은 URL 모드 elicitation으로 한다.** 도구 호출 중에 외부 서비스 권한이 필요하면 서버는 연결 시작 URL을 담은 URL 모드 elicitation을 돌려주고, 사용자가 브라우저에서 직접 승인하면 서버가 받은 토큰을 사용자 신원에 묶어 보관한다. 2026-07-28 명세에서 이 요청은 `InputRequiredResult`에 담기고 클라이언트는 원래 요청을 다시 보낸다. 서버는 클라이언트가 선언한 모드로만 요청하므로(MUST NOT) URL 모드(`elicitation.url`)를 선언하지 않은 클라이언트에는 다른 연결 경로를 둔다. URL 모드는 2025-11-25 명세에 도입됐고 명세 스스로 바뀔 수 있다고 적는다. 외부 자격 증명은 클라이언트를 거치지 않아야 하고(MUST NOT), 클라이언트의 토큰을 외부 서비스에 쓰면 금지된 token passthrough다. URL을 연 사람이 elicitation을 시작한 사용자와 같은지 서버가 확인해야 남이 승인한 계정이 공격자 세션에 묶이는 피싱을 막는다.
- **외부 서비스에 하나의 OAuth client로 붙는다면 클라이언트별 동의를 받는다.** 관문이 정적 client ID로 외부 인가 서버에 붙으면서 MCP 클라이언트의 동적 등록을 허용하면, 외부 인가 서버가 동의 쿠키로 재동의를 건너뛸 때 공격자가 등록한 redirect_uri로 인가 코드가 갈 수 있다(confused deputy). 명세는 이런 MCP proxy server가 외부 인가로 넘기기 전에 동적으로 등록된 클라이언트마다 사용자 동의를 받도록 요구한다(MUST).
- **모든 호출을 구조화된 사용 이벤트로 남긴다.** 감사, 과하게 움직이는 에이전트의 탐지와 도구별 실패 분석이 같은 기록에서 나온다. 토큰과 민감한 인자는 가리고 남긴다.

공개 사례로 DoorDash는 엔지니어링 블로그에서 에이전트의 도구 발견과 호출을 한 관문으로 모으고, 그 관문이 호출자 인증, 권한 확인, 승인된 도구 목록 노출, 자격 증명 주입, downstream MCP 서버 라우팅과 사용 이벤트 기록을 맡는 Agent Gateway를 설명했다.

## 헤더 미러링: 관문이 읽는 값과 서버의 대조

2026-07-28 명세에서 Streamable HTTP 요청은 본문의 일부 값을 HTTP 헤더에도 싣는다. 로드밸런서, 게이트웨이, WAF 같은 중개자가 JSON-RPC 본문을 파싱하지 않고 라우팅과 정책 판단을 하게 하려는 것이다. `Mcp-Method`, `Mcp-Name`과 `x-mcp-header`는 SEP-2243으로 추가됐고, 2025-06-18부터 있던 `MCP-Protocol-Version`은 이제 본문 `_meta`의 버전과도 같아야 한다.

| 헤더 | 담는 값 | 2026-07-28 명세 기준 |
|---|---|---|
| `MCP-Protocol-Version` | 프로토콜 버전 | 모든 POST에 필수(MUST)이고 본문 `_meta`의 버전과 같아야 한다 |
| `Mcp-Method` | JSON-RPC `method` | 모든 요청에 필수 |
| `Mcp-Name` | `params.name` 또는 `params.uri` | `tools/call`, `resources/read`, `prompts/get`에 필수 |
| `Mcp-Param-{Name}` | 서버가 `x-mcp-header`로 지정한 도구 인자 | 지정은 서버의 선택(MAY), 지원은 클라이언트의 의무(MUST) |

- **도구 인자 복제 규칙**: 서버는 도구 `inputSchema`의 속성에 `x-mcp-header`를 붙여 그 인자를 `Mcp-Param-{Name}` 헤더로 보내게 한다. 이름은 비어 있지 않은 HTTP token이고 스키마 안에서 대소문자 구분 없이 유일해야 한다. 값의 타입은 string, integer, boolean만 허용하고 number는 허용하지 않으며, integer는 −2^53+1부터 2^53−1 범위여야 한다. 속성은 루트에서 `properties` 키만 거쳐 닿아야 하며 `items`를 비롯한 배열 키워드, 조합 키워드(`oneOf`, `anyOf`, `allOf`, `not`), 조건 키워드(`if`, `then`, `else`), `$ref`를 거치면 안 된다. ASCII가 아닌 값, 제어 문자나 앞뒤 공백이 있는 값과 인코딩 표시처럼 보이는 평문 값은 `=?base64?...?=` 형식의 Base64로 보내며, `Mcp-Name`에도 같은 인코딩을 쓴다. stdio 같은 다른 전송은 이 표시를 무시할 수 있다.
- **잘못된 표시는 클라이언트 목록의 도구 누락으로 드러날 수 있다**: Streamable HTTP 클라이언트는 규칙을 어긴 `x-mcp-header`가 있는 도구 정의를 거부하고(MUST) `tools/list` 결과에서 뺀다. 도구 이름과 이유를 담은 경고 로그는 권고(SHOULD)다. 한 도구의 잘못된 정의가 다른 정상 도구까지 막지 않게 하려는 규칙이다. 그래서 등록 때 표시를 검사하지 않는 서버 구현에서는 서버가 정상 기동하고 클라이언트 목록에서만 도구가 빠진다.
- **본문과 다르면 거절한다**: 본문을 처리하는 서버는 헤더 값이 본문 값과 다르면 요청을 거절해야 한다(MUST). 응답은 400 Bad Request와 JSON-RPC 오류 `-32020`(`HeaderMismatch`)이며, 필수 헤더 누락, 디코딩 뒤 불일치와 잘못된 문자도 같은 오류로 처리한다. 다만 2025-06-18 이전 클라이언트를 지원하는 서버는 `MCP-Protocol-Version`이 없는 요청을 2025-03-26 버전으로 볼 수 있고(MAY), 중개자는 HTTP 오류 상태만 돌려주면 된다. 대조가 없으면 관문은 헤더 값으로 라우팅하고 서버는 본문 값으로 실행하는 어긋남이 생긴다. 이 오류 코드는 SEP 원문의 `-32001`에서 2026-07-28 명세의 `-32020`으로 바뀌었다. SEP 본문에는 notification 헤더와 중첩 허용 범위처럼 최종 명세와 다른 부분도 남아 있으므로 구현 기준은 명세로 삼는다. 필수 `Mcp-Param-*` 헤더가 없거나 본문과 달라 거절됐다면 클라이언트는 `tools/list`로 도구 스키마 변경을 확인한 뒤 다시 보내도록 권고된다(SHOULD).
- **관문은 버전부터 확인한다**: 테넌트별 라우팅이나 rate limit처럼 복제된 헤더로 정책을 거는 중개자는 `MCP-Protocol-Version`이 헤더와 본문 대조를 요구하는 버전인지 확인하고, 이전 버전이거나 헤더가 없으면 검증되지 않은 헤더 값을 믿지 말고 요청을 거절하도록 권고된다(SHOULD). 알지 못하는 `Mcp-Param-{Name}` 헤더는 그대로 전달한다(MUST). 관문이 도구 이름에 접두사를 붙이거나 `tools/list`를 다시 쓴다면, 대조 규칙상 downstream으로 넘기는 본문과 `Mcp-Name`, `Mcp-Param-*` 헤더를 함께 맞춰야 한다.
- **헤더 값을 권한의 근거로 쓰지 않는다**: 헤더 값은 네트워크 중개자에게 보이므로 비밀번호, API 키, 토큰과 개인정보 인자에는 `x-mcp-header`를 붙이지 않는다(SHOULD NOT). Base64는 인코딩일 뿐 기밀성을 주지 않는다. SEP-2243의 보안 절은 테넌트 ID나 지역처럼 자원 접근을 암시하는 헤더 값을 접근 허용 전에 인증된 사용자의 권한과 따로 대조하도록 요구한다(MUST). 명세 본문에는 이 대조 요구에 해당하는 헤더 한정 문구가 없고, 모든 도구 입력을 검증하고 접근 제어를 구현하라는 일반 원칙(MUST)이 있다. 요청 인자를 신뢰하지 않는다는 위의 네 경계와 같은 원칙이다.

## MCP Python SDK 2.3.0 업그레이드 점검

2026-10-02(UTC) 릴리스 노트와 SDK의 Header parameters 문서 기준이다. 헤더 검증, 인증 흐름과 호환성에 걸친 동작 변화라 업그레이드 점검 목록으로 함께 둔다.

- **등록 시점 실패**: `MCPServer`의 `@mcp.tool()`, `add_tool`, `Tool.from_function`은 잘못된 `x-mcp-header`가 있으면 도구 이름과 문제를 담은 `InvalidSignature`를 던진다. 이전에는 서버가 그대로 떴고 2026-07-28 클라이언트의 목록에서만 도구가 빠졌다. `str`, `int`, `bool`이 아닌 인자(`str | None`, `float`, 리스트, enum 포함), token이 아닌 이름과 대소문자만 다른 두 이름이 거부된다. 선택 인자를 헤더로 보내려면 pydantic `WithJsonSchema`로 스키마를 직접 적는다. 값 제약은 표시를 쓰는 서버에도 걸리는 MUST지만 명세가 정한 시행 지점은 클라이언트의 제외이고, 등록 시점 거부는 SDK가 고른 시행 지점이다. 저수준 `Server`는 표시를 검사하지 않아 잘못된 표시가 그대로 제공된다.
- **검증에 쓰는 스키마**: `MCPServer`는 `tools/call`마다 `tools/list`를 돌리지 않고 이름으로 찾은 등록 스키마로 `Mcp-Param-*`를 검증한다. `tools/list`를 걸러 내거나 바꾸는 미들웨어는 이 검증에 영향을 주지 않고, 미들웨어에 추가 `tools/list` 요청도 보이지 않는다. 저수준 `Server`는 `get_tool_input_schema`를 주지 않으면 표시한 도구가 없어도 인자가 있는 호출마다 `on_list_tools` 핸들러를 실행해 스키마를 얻는다.
- **클라이언트 재시도**: `Client.call_tool`은 `HeaderMismatch`(`-32020`)를 받으면 도구 목록을 다시 받고 한 번 재시도한다.
- **로그인 대기와 요청 타임아웃의 분리**: `OAuthClientProvider`가 `redirect_handler`와 `callback_handler`를 기다리는 동안 요청 타임아웃이 멈춘다. 아무도 끝내지 않는 로그인을 요청 타임아웃이 끊어 주지 않으므로, 무인 실행 환경에서는 `callback_handler` 안에 대기 상한을 둔다.
- **빈 필드 생략**: 2025-11-25 이하 버전 연결에서는 빈 `_meta`를 더 보내지 않고 `ping`과 커서 없는 목록 요청을 `params` 없이 보낸다. 받는 쪽에서는 `ctx.meta`가 `{}` 대신 `None`이고, `params`가 없는 요청에서 미들웨어가 보는 `ctx.params`도 `None`이다. 빈 객체를 가정하고 값을 꺼내는 인증이나 감사 미들웨어는 요청을 실패시킬 수 있으므로 함께 점검한다. 2026-07-28 연결은 바뀌지 않았다.

업그레이드 검증은 서버 기동과 도구 등록 경로부터 시작한다. 저수준 `Server`처럼 등록 때 표시를 검사하지 않는 구현을 쓰면 클라이언트의 실제 `tools/list` 결과에 도구가 모두 있는지 확인한다.

## 면접 체크포인트

- 서버에 둔 토큰의 권한을 결국 누가 쓰는지와 네 경계(인증, 파일 경로, API 목적지, Origin과 Host)
- 127.0.0.1에 bind한 로컬 서버에도 DNS rebinding이 닿는 원리와 Origin, Host 검증
- 같은 패키지의 권고마다 수정 버전이 다를 때 버전을 확인하는 법
- 게이트웨이에서 호출자 신원과 downstream 자격 증명을 분리하는 이유
- 발견(`tools/list`)과 실행(`tools/call`)을 따로 인가하는 이유
- URL 모드 elicitation으로 외부 계정을 연결할 때 지킬 조건(클라이언트가 선언한 모드, 클라이언트를 거치지 않는 자격 증명, 같은 사용자 확인)
- 본문 값을 헤더로 복제할 때 서버가 둘을 대조해야 하는 이유(`HeaderMismatch`, `-32020`)와 관문이 `MCP-Protocol-Version`을 먼저 확인하는 이유
- 등록 때 표시를 검사하지 않는 구현에서 잘못된 `x-mcp-header`가 서버 오류가 아니라 클라이언트 목록의 도구 누락으로 나타나는 구조와 업그레이드 검증 순서

## 출처

- [Model Context Protocol, Authorization (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [Model Context Protocol, Streamable HTTP (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [Model Context Protocol, Security Best Practices (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices)
- [Model Context Protocol, Elicitation (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation)
- [Model Context Protocol, Tools (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [Model Context Protocol, Overview, Error Codes (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/index#error-codes)
- [Model Context Protocol, Key Changes (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [Model Context Protocol, SEP-2243: HTTP Header Standardization for Streamable HTTP Transport](https://modelcontextprotocol.io/seps/2243-http-standardization)
- [v2.3.0 — GitHub, modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk/releases/tag/v2.3.0)
- [MCP Python SDK, Header parameters](https://py.sdk.modelcontextprotocol.io/advanced/header-parameters/)
- [Unauthenticated HTTP MCP requests can use globally configured Jira and Confluence credentials (GHSA-vc8m-84rp-53hx) — GitHub, sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian/security/advisories/GHSA-vc8m-84rp-53hx)
- [Unauthenticated arbitrary local file read via upload_attachment file_path, chained with missing auth on streamable-http transport (GHSA-cc5h-2pwp-pvcc) — GitHub, sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian/security/advisories/GHSA-cc5h-2pwp-pvcc)
- [Incomplete fix for CVE-2026-27826: DNS rebinding bypasses SSRF validation (validated IP not pinned) (GHSA-72fm-whvq-jghf) — GitHub, sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian/security/advisories/GHSA-72fm-whvq-jghf)
- [DNS-rebinding TOCTOU bypass of the SSRF fix (GHSA-7r34): unauthenticated SSRF to cloud metadata on patched ≥0.17.0 (GHSA-489g-7rxv-6c8q) — GitHub, sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian/security/advisories/GHSA-489g-7rxv-6c8q)
- [Incomplete fix for GHSA-7r34-79r5-rcc9 (CVE-2026-27826): redirect-based SSRF via unhooked requests session in Jira user-permission lookup (GHSA-v9m3-wfh8-5646) — GitHub, sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian/security/advisories/GHSA-v9m3-wfh8-5646)
- [Unauthenticated arbitrary file read via upload_markdown enables PAT exfiltration and full account takeover (GHSA-cv3r-c5h8-f4g5) — GitHub, zereight/gitlab-mcp](https://github.com/zereight/gitlab-mcp/security/advisories/GHSA-cv3r-c5h8-f4g5)
- [Server-Side Request Forgery (SSRF) in zereight/mcp-gitlab (GHSA-2h44-8472-frjj) — GitHub, zereight/gitlab-mcp](https://github.com/zereight/gitlab-mcp/security/advisories/GHSA-2h44-8472-frjj)
- [DNS rebinding reaches local Streamable HTTP MCP transport (GHSA-vmp7-252j-cwp7) — GitHub, zereight/gitlab-mcp](https://github.com/zereight/gitlab-mcp/security/advisories/GHSA-vmp7-252j-cwp7)
- [OSV, CVE-2026-77254](https://osv.dev/vulnerability/CVE-2026-77254)
- [OSV, CVE-2026-77248](https://osv.dev/vulnerability/CVE-2026-77248)
- [OSV, CVE-2026-61560](https://osv.dev/vulnerability/CVE-2026-61560)
- [OSV, CVE-2026-61559](https://osv.dev/vulnerability/CVE-2026-61559)
- [OSV, CVE-2026-61568](https://osv.dev/vulnerability/CVE-2026-61568)
- [How DoorDash Built a Centralized Gateway for AI Agent-Tool Access — DoorDash Engineering](https://careersatdoordash.com/blog/how-doordash-built-a-centralized-gateway-for-ai-agent-tool-access/)
- [MCP 서버 보안, 넣어 둔 토큰이 요청자의 권한이 되는 이유 — YouTube, 길리랩 - 실전 구현 랩](https://www.youtube.com/watch?v=zQ4SFM857L4)
- [MCP Python SDK 2.3.0, 도구 등록이 멈추는 이유 — YouTube, 길리랩 - 실전 구현 랩](https://www.youtube.com/watch?v=8cn9qiyRS8U)

## 관련 문서

- [[MCP|MCP (Model Context Protocol)]]
- [[SSRF|SSRF]]
- [[LLM-Application-Security|LLM 애플리케이션 보안]]
- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘]]
