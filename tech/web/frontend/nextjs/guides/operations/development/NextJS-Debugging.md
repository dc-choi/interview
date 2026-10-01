---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js browser와 Node 디버거 연결"]
---

# Next.js browser와 Node 디버거 연결

## 실행 위치에 맞는 디버거

frontend는 browser DevTools, backend는 Node inspector에 붙는 debugger로 조사한다. source map으로 authored code와 실행 code를 연결하며 VS Code, Chrome/Firefox, WebStorm을 사용할 수 있다. Next dev와 browser 각각의 프로세스에 breakpoint를 걸어야 full-stack 흐름을 읽을 수 있다.

## VS Code launch 설정

root .vscode/launch.json의 version은 0.2.0, configurations 배열에 목적별 entry를 둔다.

| 대상 | 핵심 설정 |
| --- | --- |
| server | type:node-terminal, request:launch, command:npm run dev -- --inspect |
| Chrome client | type:chrome, request:launch, url:http://localhost:3000 |
| Firefox client | type:firefox, request:launch, url, reAttach:true, pathMappings |
| full stack | type:node, request:launch, program:workspace/node_modules/next/dist/bin/next, runtimeArgs:[--inspect], skipFiles:[<node_internals>/**], serverReadyAction |

Firefox VS Code extension이 필요하다. pathMappings의 url은 webpack://_N_E, path는 workspace folder다. full-stack serverReadyAction은 action:debugWithEdge, killOnServerStop:true, pattern:'- Local:.+(https?://.+)', uriFormat:'%s', webRoot:workspace folder다. Chrome을 쓰면 action을 debugWithChrome으로 바꾼다.

app port를 변경했다면 url의 3000도 맞춘다. monorepo app이 apps/web에 있다면 server/full-stack config cwd를 workspace/apps/web으로 설정한다. npm command는 yarn dev 또는 pnpm dev로 바꿀 수 있다.

Debug panel(Windows/Linux Ctrl+Shift+D, macOS Shift+Command+D)에서 config를 선택하고 F5 또는 Debug: Start Debugging을 실행한다. source path 규칙은 실제 사용 bundler의 map과 맞춘다.

## WebStorm

Edit Configurations에서 JavaScript Debug를 만들고 실제 app URL/browser를 설정한다. Node application debug와 browser debug를 함께 실행하면 서버/클라이언트 두 프로세스가 연결된다. browser만 열었다고 server inspector까지 연결된 것은 아니다.

## browser breakpoint

next dev/npm run dev/yarn dev 뒤 실제 URL을 연다. Chrome은 DevTools Sources, Firefox는 Debugger 탭이다. debugger 문장에서 정지하거나 Ctrl/Command+P로 file을 찾아 breakpoint를 추가한다. Firefox는 왼쪽 file tree도 사용할 수 있다.

Chrome DevTools shortcut은 Windows/Linux Ctrl+Shift+J, macOS Option+Command+I다. Firefox는 Windows/Linux Ctrl+Shift+I, macOS Option+Command+I다. 원문의 client source prefix는 webpack://_N_E/./이고 Turbopack에서는 실제 map 주소를 확인한다.

React DevTools는 component inspect, props/state 편집, performance 문제를 확인한다. JavaScript breakpoint와 React component tree의 역할은 다르다.

## Node inspector 연결

~~~sh
npm run dev -- --inspect
# 첫 code 실행 전 중단하려면 Node 자체 옵션에 지정한다.
NODE_OPTIONS=--inspect-brk next dev
~~~

pnpm dev --inspect, yarn dev --inspect, bun run dev --inspect도 같은 Node flag 전달이다. inspector는 보통 ws://127.0.0.1:9229/... URL, 앱은 http://localhost:3000 URL이므로 두 port를 혼동하지 않는다.

Chrome은 chrome://inspect의 Remote Target에서 inspect 후 Sources를 열고 Firefox는 about:debugging -> This Firefox -> Remote Targets -> Inspect -> Debugger로 연결한다. 원문의 server source는 webpack://<package.json application-name>/./이며 실제 bundler/source map을 기준으로 찾는다.

--inspect-brk와 --inspect-wait는 NODE_OPTIONS로 지정한다. 전자는 첫 실행 전 break, 후자는 지원 Node에서 debugger 접속을 기다리는 선택이다. --inspect=0.0.0.0은 Docker 등 localhost 밖 접근을 열 수 있어 trusted network/port mapping 범위에서만 사용한다. 일반 app HTTP host와 debugger host는 다르다.

## error overlay에서 server로 이동

오류 overlay의 Next version 아래 Node.js icon을 누르면 DevTools URL을 clipboard로 복사한다. 별도 browser tab에 열어 해당 server process의 source를 조사한다. 오류를 발생시킨 실제 process/session인지 확인한다.

## Windows 파일 감시와 보호 도구

원문은 Defender 비활성화를 안내하지만 파일 읽기 검사에 따른 Fast Refresh 지연 보고를 모든 환경의 조치로 일반화하지 않는다. 실제 file watching/scan 병목을 측정하고 조직 정책에 맞는 제한된 exclusion 또는 개발 filesystem 구성을 검토한다. 시스템 보호 전체 해제를 기본 디버깅 절차로 기록하지 않는다.

## 재현과 이해 확인

동일 route/input에서 breakpoint, source map, request stack을 함께 읽는다. 직접 browser 실행, server inspector, compile 검증이 각각 어느 실패를 보여 주는지 구분한다. 추가 도구 사용법은 VS Code breakpoints, Chrome Debug JavaScript와 Firefox Debugger 공식 문서를 따른다.

## VS Code 실행 예제

다음 JSON은 app port 3000, workspace root가 앱이라는 전제다. Firefox extension과 browser 설치가 필요하다.

~~~json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next server", "type": "node-terminal",
      "request": "launch", "command": "npm run dev -- --inspect"
    },
    {
      "name": "Next Chrome", "type": "chrome",
      "request": "launch", "url": "http://localhost:3000"
    },
    {
      "name": "Next Firefox", "type": "firefox", "request": "launch",
      "url": "http://localhost:3000", "reAttach": true,
      "pathMappings": [{ "url": "webpack://_N_E", "path": "${workspaceFolder}" }]
    },
    {
      "name": "Next full stack", "type": "node", "request": "launch",
      "program": "${workspaceFolder}/node_modules/next/dist/bin/next",
      "runtimeArgs": ["--inspect"], "skipFiles": ["<node_internals>/**"],
      "serverReadyAction": {
        "action": "debugWithEdge", "killOnServerStop": true,
        "pattern": "- Local:.+(https?://.+)", "uriFormat": "%s",
        "webRoot": "${workspaceFolder}"
      }
    }
  ]
}
~~~

## 출처

- [Next.js, debugging](https://nextjs.org/docs/app/guides/debugging)

## 관련 문서

- [[NextJS-Development-Workflow]]
- [[NextJS-MCP]]
- [[NextJS-CLI]]
