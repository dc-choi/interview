---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 에이전트의 문서와 runtime 검증"]
---

# Next.js 에이전트의 문서와 runtime 검증

## 설치 버전의 지식을 먼저 읽는다

에이전트의 학습 기억보다 현재 설치 버전의 API와 convention이 우선한다. Next.js는 next package에 version-matched docs를 넣고 AGENTS.md에서 해당 docs를 읽도록 안내한다. upgrade하면 bundled docs도 갱신돼 같은 기능의 새 안내를 포함한다.

경로는 node_modules/next/dist/docs이며 01-app/01-getting-started, 02-guides, 03-api-reference와 02-pages, 03-architecture, index.mdx가 website 구조에 대응한다. monorepo에서는 AGENTS 파일 위치에서 next package가 실제 resolve되는지 확인한다. 네트워크 없이 installed version을 읽을 수 있는 장점은 실제 package/docs가 존재할 때 성립한다.

Claude Code/Codex/Cursor/Copilot 같은 도구가 agent 지침을 읽는 방식은 도구별 설정과 scope에 달린다. framework 문서의 일반 안내를 모든 host에서 같은 파일이 자동 읽힌다는 보장으로 취급하지 않는다.

## 생성과 opt out의 버전 경계

| 버전 | docs와 agent file |
| --- | --- |
| 16.1 이전 | bundled docs 없음, legacy agents-md codemod가 .next-docs를 다운로드/색인 |
| 16.2 | bundled docs 있음, AGENTS 직접 추가 |
| 16.3 이상 | next dev가 지원 agent 환경을 감지하면 managed block 없는 AGENTS/CLAUDE 생성 또는 upsert |

create-next-app은 AGENTS.md/CLAUDE.md를 기본 생성하며 --no-agents-md로 끈다. 원문의 canary 생성 명령은 해당 release channel 예시다. 현재 앱의 channel 선택과 설치 버전을 명시한다.

next dev는 BEGIN:nextjs-agent-rules와 END:nextjs-agent-rules HTML markers 안을 관리하고 밖의 사용자 지침은 보존한다. CLAUDE의 @AGENTS.md import 예시도 제공한다. block을 diff에서 삭제하면 재생성될 수 있으며 generator 구현은 next/dist/server/lib/generate-agent-files.js다.

agentRules:false는 framework 자동 생성을 끈다. 원문의 eval 성능 주장은 특정 benchmark 결과이며 모든 repo의 작업 성공률 보장은 아니다. 외부 예시가 이 저장소의 기존 지침을 수정하거나 commit하라는 사용자 권한을 부여하지 않는다.

## 네트워크 문서

nextjs.org/docs URL에 .md를 붙이거나 Accept:text/markdown으로 Markdown을 받는다. /docs/messages의 error docs는 bundled package와 별도라 네트워크 조회가 필요할 수 있다. llms.txt는 전체 index, llms-full.txt는 single-file 문서다. 최신 웹 문서와 installed package의 version 차이를 먼저 확인한다.

## framework와 browser의 두 관측면

next dev는 browser error/warning을 logging.browserToTerminal로 terminal에 전달한다. .next/dev/lock에는 PID/port/URL이 있으며 같은 project에서 두 번째 dev를 띄우면 기존 URL과 PID를 안내하므로 기존 server를 재사용할 수 있다.

framework 관측은 /_next/mcp의 routes/logs/compilation issues다. get_compilation_issues와 compile_route는 실제 dev compiler 결과를 읽어 full build 없이 compile 여부를 조사한다. Turbopack 조건과 server discovery는 [[NextJS-MCP]]에서 확인한다.

browser 관측 예시 agent-browser는 DOM/console/network/Web Vitals를 structured text로 보여 준다. open의 --enable react-devtools 뒤 react tree를 사용하면 component tree와 pending Suspense를 읽을 수 있다. 이는 도구의 지원 환경이 전제이며 server compilation 성공만으로 화면 정상임을 증명하지 않는다.

## 오류에서 선택할 세 가지 수정

Cache Components에서 uncached fetch/connection이 Suspense 밖에 있으면 blocking-prerender-dynamic 오류가 난다. dev overlay의 Copy prompt와 terminal/build 메뉴는 선택한 수정의 canonical pattern/error page/tradeoff를 연결한다.

| 선택 | 바뀌는 동작 | 제약 |
| --- | --- | --- |
| stream | data access를 Suspense fallback 아래 둠 | placeholder가 유용해야 함 |
| cache | use cache로 data access 재사용 | connection에는 적용 불가 |
| block | export const instant=false | blocking을 허용하는 제품 선택 |

dev stack은 원본 source로 연결된다. production minified 오류는 next build --debug-prerender로 server map과 여러 실패를 조사한다. 디버그 산출물은 production에 배포하지 않는다. instant() 테스트는 지정한 UI가 클릭 순간 나오는지 회귀를 확인한다.

## knowledge lookup과 workflow skill

bundled docs는 framework knowledge, skill은 여러 단계의 작업 순서를 다룬다. runtime foundation은 inspect/edit/verify, interactive workflow는 사용자 checkpoint, unattended loop는 검증 가능한 목표와 실제 판단에서만 멈추는 흐름이다. source는 vercel/next.js skills, 탐색은 skills.sh다.

설치 형식은 npx skills add vercel/next.js --skill <name>이다. 설치하지 않은 skill이 현재 실행됐다고 주장하지 않고 저장소 사용자 지침의 scope/권한을 우선한다.

## next-dev-loop

매 edit 후 running server의 MCP와 browser 양쪽으로 페이지를 확인하는 foundation이다. prompt는 편집 뒤 runtime 검증을 요청한다. 실제 route/input, server logs, browser DOM/console이 서로 맞는지 확인한다.

## next-cache-components-adoption

flag를 켜고 prerender 불가 route를 찾는다. feature 하나씩 사용자 checkpoint를 거쳐 수정하고 next dev/build를 모두 확인한 뒤 해당 feature를 떠난다. 일련의 PR인지 한 branch인지는 사용자가 정하는 workflow 선택이다. 이 원문 예시가 현재 task의 branch/PR/commit 권한을 대신하지 않는다.

## next-cache-components-optimizer

이미 Cache Components로 build되는 route가 전제다. target route와 클릭 순간 보여야 할 UI를 지정한다. 실패하는 instant() 테스트를 만든 뒤 Suspense 아래로 data read를 이동하는 등의 refactor로 통과시키고 passing test와 변경을 함께 관리한다. /settings -> /dashboard의 header/project list 즉시 표시가 구체적 예시다.

## next-partial-prefetching-adoption

Cache Components와 production-like prefetch 검증 build가 먼저 필요하다. 기존 Link prefetch:true에서 보이는 UI를 audit하고 passing instant() test로 보존한다. flag 활성화 뒤 destination마다 같은 테스트를 변경 없이 통과하도록 옮긴다. URL-data insights를 해결하고 optional per-link prefetch 후보를 이후 작업으로 표시한다.

## 이해 확인

compile_route 성공과 사용자 UI 성공은 어떻게 다른가? stream/cache/block 중 하나를 선택하면 latency, freshness, placeholder 및 regression test의 어떤 조건이 달라지는지 설명한다. framework skill 설명과 현재 저장소에서 승인된 실제 작업을 분리한다.

## 출처

- [Next.js, ai-agents](https://nextjs.org/docs/app/guides/ai-agents)

## 관련 문서

- [[NextJS-Development-Workflow]]
- [[NextJS-MCP]]
- [[NextJS-CLI]]
