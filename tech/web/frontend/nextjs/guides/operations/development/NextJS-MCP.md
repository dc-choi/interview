---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 개발 서버 MCP 진단 계약"]
---

# Next.js 개발 서버 MCP 진단 계약

## endpoint와 bridge

MCP는 agent가 application과 표준 interface로 상호작용하는 protocol이다. Next.js 16+의 dev server는 /_next/mcp endpoint를 제공한다. next-devtools-mcp는 실행 중인 서버를 발견하고 tool call을 올바른 port의 endpoint로 전달하는 bridge다.

여러 project/port를 연결할 수 있으므로 project metadata의 URL과 작업 대상이 맞는지 확인한다. bridge와 Next 내부 implementation을 분리하는 구조이지 현재 연결 성공이나 모든 tool 지원을 설정 파일만으로 증명하는 것은 아니다.

## 설정과 실행

~~~json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
~~~

원문 예시는 project root .mcp.json에 넣고 dev server를 시작하면 discovery한다. 실제 Codex/Claude/다른 host의 등록 위치와 지침을 먼저 따른다. 본문은 기능 설명이며 현재 저장소 설정 변경이나 plugin 설치를 요청한 것이 아니다. latest package는 설치 시점 버전이므로 재현에는 bridge/Next version을 기록한다.

dev 실행 뒤 agent의 MCP config load와 server discovery, 브라우저 route 방문, 진단 tool call을 순서대로 확인한다. 브라우저를 방문하지 않으면 해당 session의 runtime 오류가 아직 없을 수 있다.

## runtime tool의 입력과 결과

| tool | 반환하는 관측 | 제한/고유 조건 |
| --- | --- | --- |
| get_errors | build/runtime/type errors | 현재 dev server/session |
| get_logs | browser console/server output가 담긴 log file 경로 | 로그 문자열 자체 대신 path |
| get_page_metadata | page routes/components/render 정보 | 특정 page 대상 |
| get_project_metadata | project 구조/config/dev URL | port/대상 확인 |
| get_routes | filesystem entrypoints, appRouter/pagesRouter 그룹 | dynamic은 [param]/[...slug] pattern |
| get_server_action_by_id | Action ID의 source file/function name | 해당 build/runtime ID |
| get_compilation_issues | 전체 project bundler warning/errors | Turbopack 전용 |
| compile_route | 해당 route의 on-demand compile issues | HTTP 요청 없이, Turbopack 전용 |

compile_route는 routeSpecifier:'/blog/[slug]' 또는 path:'/blog/hello-world'를 받는다. concrete path는 dev router의 live route table로 matching한다. get_routes의 pattern을 사용해 compile 대상과 request 경로를 구분한다. compile 성공이 data fetch, auth, hydration 및 paint까지 실행한 성공은 아니다.

## 개발 도구의 추가 역할

documentation gateway는 node_modules/next/dist/docs의 version-accurate 문서를 안내한다. Playwright MCP integration은 실제 browser를 확인하는 경로다. server error, live config/routes/middleware, page/layout/component hierarchy와 Action source를 함께 보면 기존 structure에 맞는 수정 후보를 찾을 수 있다.

tool set은 계속 확장되므로 이 표의 이름이 설치 bridge에서 실제 expose되는지 discovery한다. Framework data만으로 구현이 자동 정확해지지는 않으며 code/callers/source와 runtime 결과를 함께 확인한다.

## 오류 진단 예제

원문 hydration 예시는 /about server의 server 텍스트와 client의 client 텍스트가 달라 recoverable error가 난 경우다. discover_servers 후 get_errors를 호출하고 수정 뒤 같은 route/browser session을 다시 실행해 오류가 사라졌는지 확인한다. 예시의 success:true와 port:3000은 bridge call 성공 및 대상 port 정보이며 page 정상의 결론은 별도다.

## upgrade와 concept 질문

upgrade 예시는 공식 npx @next/codemod@latest upgrade latest를 실행하고 breaking changes를 안내하는 workflow다. 설치 channel/목표 version 및 lockfile/code 결과를 먼저 정하고 검토한다. use client 질문은 bundled docs와 현재 codebase 사례를 대조한다. MCP 연결이 source reading이나 현재 사용자 권한을 대신하지 않는다.

## 연결 실패의 점검 순서

Next 16 이상인지, host가 .mcp.json 또는 해당 host 설정을 읽었는지, next-devtools-mcp 등록이 있는지 확인한다. npm run dev로 서버를 시작하고 이전부터 실행 중이었다면 restart 후 다시 discovery한다. 여러 port이면 대상 server를 명시한다. config 존재, bridge 실행, endpoint 연결, tool 결과를 따로 기록한다.

## 이해 확인

get_logs의 path와 get_errors의 browser session이 현재 대상 route를 가리키는가? compile_route 성공 후 auth/data/hydration에서 실패할 수 있는 이유를 설명한다.

## 출처

- [Next.js, mcp](https://nextjs.org/docs/app/guides/mcp)

## 관련 문서

- [[NextJS-AI-Agents]]
- [[NextJS-Development-Workflow]]
- [[NextJS-CLI]]
