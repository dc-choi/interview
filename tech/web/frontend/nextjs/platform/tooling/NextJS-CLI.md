---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js CLI 개발 빌드와 진단", "NextJS-CLI"]
---

# Next.js CLI 개발 빌드와 진단

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## next CLI

next 명령만 실행하면 next dev의 alias다. `next -h` 또는 `next --help`는 사용 가능한 옵션을, `next -v` 또는 `next --version`은 설치된 Next.js 버전을 출력한다. 개별 하위 명령에도 `--help`를 사용할 수 있다. 기본 bundler는 Turbopack이며 필요하면 dev/build에 --webpack을 지정한다. npm run은 flag 전달 전에 --가 필요하고 pnpm/yarn/bun은 같은 forwarding 요구가 없다.

```sh
npm run build -- --debug
```

## commands

| command | 목적 |
| --- | --- |
| dev | HMR/error overlay 개발 서버 |
| build | optimized production build |
| start | 먼저 build한 production 실행 |
| info | OS/binaries/Next/React 정보, --verbose 추가 진단 |
| telemetry | --enable/--disable 선택 |
| typegen | full build 없이 route types 생성 |
| upgrade | 설치 release channel 기준 upgrade, --revision으로 version/tag 선택 |
| experimental-analyze | Turbopack bundle 분석, app build artifact는 생성하지 않음 |

## dev options

directory는 기본 cwd, port는 3000 또는 PORT env, hostname은 0.0.0.0이다. --turbopack/--turbo는 기본 선택을 명시하고 --webpack은 대안이다. .next/dev로 산출해 .next production build와 병행할 수 있다.

--experimental-https는 mkcert의 locally trusted self-signed certificate로 개발 HTTPS를 제공한다. `--experimental-https-key`, `--experimental-https-cert`, `--experimental-https-ca`로 각각 key, certificate, CA 파일을 줄 수 있다. production 인증서 발급/배포 기능이 아니다. --experimental-upload-trace는 원격 trace URL로 subset을 전송하므로 공유할 diagnostic data를 확인한다.

PORT는 HTTP server bootstrap 전에 필요해 .env로 지정할 수 없다. shell env 또는 -p/--port로 준다. NODE_OPTIONS로 heap/inspector 같은 Node arguments를 전달한다.

## build options

| 옵션 | 목적과 제한 |
| --- | --- |
| --debug/-d | headers/redirects/rewrites 등 verbose 정보 |
| --profile | production React profiling, 성능 비용 고려 |
| --no-mangling | 변수명 mangling 생략, debugging용 |
| --experimental-app-only | App Router만 build |
| --experimental-build-mode | compile/generate/default 분리, 실험 |
| --debug-prerender | readable prerender errors, production 배포 금지 |
| --debug-build-paths | comma-separated paths/globs, ! exclusion |
| --experimental-cpu-prof | V8 CPU profiles 수집 |

--debug-prerender는 server minification을 끄고 server sourcemaps를 만들며 첫 오류 이후에도 generation을 진행하도록 설정한다. --debug-build-paths는 app/pages file paths를 받으며 src prefix 유무 모두 지원한다. type checker는 tsconfig 전체 범위를 계속 검사하므로 route debug 선택과 전체 타입 검사를 구분한다.

## start와 keep-alive

start는 일반 production build 후 사용한다. port/hostname과 --keepAliveTimeout milliseconds를 지정할 수 있다. standalone은 생성된 server.js, static export는 host static serving을 사용한다. load balancer 뒤에서는 Next HTTP keep-alive timeout을 downstream proxy보다 길게 두어 proxy가 재사용하려던 연결이 먼저 종료되는 오류를 줄인다.

```sh
npx next start --keepAliveTimeout 70000
```

## typegen

generated types와 next-env.d.ts를 만든다. config를 production build phase로 로드하므로 required env/dependencies가 필요하다. 이어 tsc --noEmit를 실행해 route usage를 검사할 수 있다. generation은 type checker 실행 자체가 아니다.

## upgrade

--revision은 latest/canary/고정 version 등을 선택하고 기본은 현재 설치 channel이다. --verbose는 추가 output을 제공한다. package.json/lockfile/code migration 결과를 검토하고 build, lint와 관련 tests를 다시 실행한다. 명령 성공을 runtime compatibility 증명으로 보지 않는다.

## experimental-analyze

route별 client/server view, module이 들어온 import chain과 server/client/dynamic boundary를 탐색한다. 기본 local analyzer port 4000 또는 PORT다. --output/-o는 server를 띄우지 않고 .next/diagnostics/analyze에 static 분석 결과를 만든다. --profile/--no-mangling도 지원한다. 실제 deploy build를 생성하는 command가 아니다.

## CPU profiling

dev/build/start에 --experimental-cpu-prof를 주면 종료 때 .next-profiles에 .cpuprofile를 쓴다. Chrome DevTools Performance 등에 로드한다. dev-main은 orchestration, dev-server는 rendering/request process다. build-main과 bundler worker profiles를 나눠 보고 webpack은 client/server/edge worker가 분리된다. start-main은 production server다. 정상 종료와 profile flush를 확인한다.

## 진단 결과의 한계

production route/asset를 실제 요청해 build result와 serving을 함께 확인한다. partial debug build, profile/no-mangling 산출물을 운영 artifact로 승격하지 않는다. info/trace/profile에는 source paths와 환경 정보가 들어갈 수 있어 공유 전 내용을 확인한다.

## CLI의 두 역할과 공통 directory 옵션

create-next-app은 default/example로 새 앱을 만들고 next는 기존 앱의 dev/build/start/typegen 등을 실행한다. npx next [command] [options], pnpm next, yarn next, bunx next가 실행 형식이다. dev/build/start/typegen/upgrade/analyze의 optional directory는 기본 cwd이며 typegen ./apps/web로 monorepo 앱을 지정할 수 있다. info/telemetry/typegen/upgrade/analyze의 -h 또는 --help도 공통 지원된다. telemetry 참여는 선택이며 --enable/--disable로 전환한다. info는 OS platform/architecture/version, available memory/CPU cores, Node/npm/yarn/pnpm과 next/react/react-dom/eslint-config-next/typescript 및 config.output을 진단 자료로 출력한다. 예시의 버전 숫자는 해당 설치 버전의 현재 요구 사항이 아니다.

## debug와 profiling의 정확한 설정

debug-prerender는 experimental.serverMinification=false, turbopackMinify=false, serverSourceMaps=true, prerenderEarlyExit=false를 적용해 readable stack/codeframe과 여러 generation 오류를 보여 준다. debug-build-paths는 app/(marketing)/about/page.tsx 같은 route group filesystem path, app/**/page.tsx glob, app/**/page.tsx,!app/admin/** 같은 제외 및 comma-separated App/Pages 목록을 받는다. src/app/page.tsx와 app/page.tsx는 같은 route로 해석한다.

NODE_OPTIONS='--throw-deprecation', '-r esm', '--inspect'로 Node 자체 옵션을 next에 전달할 수 있다. CPU profile은 Ctrl+C/SIGTERM 등 종료 시 timestamp 파일로 저장된다.

| 명령 | profile prefix |
| --- | --- |
| dev | dev-main-*, dev-server-* |
| build(Turbopack) | build-main-*, build-turbopack-* |
| build(webpack) | build-main-*, build-webpack-client-*, build-webpack-server-*, build-webpack-edge-server-* |
| start | start-main-* |

dev-server가 보통 요청/render 분석 대상이고 main은 orchestration이다. 분석 결과 --output 뒤 .next/diagnostics/analyze를 별도 디렉터리에 복사하면 refactor 전후 결과를 보존해 비교할 수 있다. 15.4 debug-prerender, 15.5 typegen, 16.0 build의 JS bundle size metrics 제거, 16.1 upgrade와 experimental-analyze 도입 이력을 구분한다.

## 출처

- [Next.js, app/api-reference/cli/next](https://nextjs.org/docs/app/api-reference/cli/next)
- [Next.js, pages/api-reference/cli/next](https://nextjs.org/docs/pages/api-reference/cli/next)

## 관련 문서

- [[NextJS-TypeScript]]
- [[NextJS-Turbopack]]
- [[NextJS-Config-Build-Deployment]]
