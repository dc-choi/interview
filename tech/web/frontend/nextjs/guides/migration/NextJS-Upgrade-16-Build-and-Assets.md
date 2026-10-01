---
tags: [nextjs, migration, upgrade]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next16 build, Image와 tooling 변경"]
---

# Next16 build, Image와 tooling 변경

## Turbopack 기본과 Webpack 호환

16부터 next dev/build는 stable Turbopack을 기본으로 사용한다. 예전 --turbo/--turbopack opt-in은 일반 script에서 제거할 수 있다. custom webpack config가 있는데 기본 build를 실행하면 오설정을 막기 위해 fail할 수 있다. plugin이 webpack config를 추가한 경우도 포함한다.

선택은 webpack config를 Turbopack 지원 옵션으로 옮기기, --webpack으로 해당 명령을 유지하기, --turbopack으로 Webpack 설정을 명시적으로 무시하고 진행하기다. dev/build가 서로 다른 bundler면 두 환경 모두 확인한다. experimental.turbopack은 top-level turbopack으로 이동한다.

Node fs 같은 module이 client dependency graph에 들어가면 import 경계를 refactor하는 것이 우선이다. browser 조건의 resolveAlias를 empty module로 바꾸는 fallback은 오류를 숨기는 tradeoff이며 runtime에서 필요한 기능이 없어도 되는 경우에만 쓴다. Sass node_modules import는 legacy ~ prefix를 제거한다. 옮길 수 없으면 ~* alias를 사용할 수 있으나 output을 검증한다.

Turbopack compiler artifact의 filesystem cache는 현재 dev/build 모두 기본으로 활성화되고 해당 experimental flag로 조정할 수 있다. route/data runtime cache와 다른 저장소다. 깨끗한 build와 warm cache를 비교해 config/plugin 오류를 cache hit로 숨기지 않는다.

## Image16의 변경

| 변경 | migration 판단 |
| --- | --- |
| local src의 query | localPatterns.search를 명시적으로 허용. enumeration 방어 |
| minimumCacheTTL60초→14400초 | 변경 image의 갱신 요구, upstream cache header를 확인 |
| imageSizes에서16 제거 | 필요하면16을 명시. DPR2는32px를 사용할 수 있음 |
| qualities 기본[75] | 필요한50/75/100 등을 allowlist, quality prop이 allowlist에 없으면 가까운 허용값으로 coercion |
| local IP optimization 기본 차단 | private network가 실제로 필요할 때 SSRF 위험 검토 후 dangerouslyAllowLocalIP |
| maximumRedirects 무제한→3 | redirect chain 필요성 확인,0으로 차단 가능 |
| next/legacy/image deprecated | new Image behavior/CSS를 검증하며 전환 |
| images.domains deprecated | protocol/host/path/query 제한 가능한 remotePatterns |

```ts
const nextConfig = {
  images: {
    localPatterns: [{ pathname: '/assets/**', search: '?v=1' }],
    qualities: [50, 75, 100], maximumRedirects: 0,
  },
}
```

source prop quality=80이면 위 allowlist에서75로 맞춰질 수 있다. optimizer endpoint의 validation과 prop coercion은 호출 경계가 다르므로 해당 Image API로 확인한다. VPC/split-horizon DNS에서400이 나도 local IP flag를 무조건 켜지 않는다. optimizer가 접근 가능한 주소와 user input 제한을 함께 검증한다.

## lint와 compiler

next lint와 next.config eslint option은 제거되었다. next build는 lint를 실행하지 않는다. ESLint/Biome을 script/CI에 명시하고 flat config로 옮긴다. @next/eslint-plugin-next가 flat config 기본을 제공하는 것과 custom rule/plugin compatibility가 해결되는 것은 다르다.

React Compiler는 stable top-level reactCompiler=true로 opt in하며 기본 활성화가 아니다. babel-plugin-react-compiler가 필요하고 Babel 사용으로 compile time이 늘 수 있다. memoization 개선이 모든 app의 latency 감소를 보장하지 않는다. React Compiler 지원/규칙과 실제 component 상태를 확인한다.

## dev/build 출력과 config 생애

next dev output은 .next/dev로 분리되어 dev와 build를 동시에 실행할 수 있다. 같은 project에 같은 dev/build 여러 instance를 여는 것은 lockfile이 제한한다. tracing path는 .next-profiles/trace-turbopack.bin을 next internal trace에 준다. 기존 .next/trace 경로 가정과 구분한다.

build의 size/First Load JS 표는 RSC payload accounting 문제 때문에16에서 제거되었다. 실제 다운로드/response와 사용자 Web Vitals를 측정한다. 표가 사라졌다고 bundle transfer가0이라는 의미는 아니다.

next dev의 config loading 변화로 process.argv에 dev가 보이지 않을 수 있다. side effect plugin은 NODE_ENV==='development' 또는 config phase를 판단에 사용한다. typegen/build는 argv에서 여전히 관찰될 수 있다. startup side effect가 반복 instance에서도 안전한지 확인한다.

## Adapter와 나머지 변경

16.0 안내의 Build Adapters API는 alpha experimental.adapterPath 예시지만 source는16.2에서 stable top-level adapterPath로 승격되었다고 명시한다.16.3 작업은 현재 adapterPath API를 따르고 옛 nested option을 그대로 복사하지 않는다. adapter가 config/build output을 바꾸는 host 계약을 확인한다.

sass-loader16과 modern Sass API 지원으로 custom Sass 설정/plugin의 compatibility를 점검한다. runtime env, Proxy, async request/PPR/AMP 제거는 [[NextJS-Upgrade-16]]에서 다룬다. source section을 하나씩 옮겼다는 사실만으로 production deploy가 검증되었다고 기록하지 않는다.

## bundler, compiler와 Image 설정 실행 코드

```js
// next.config.mjs
export default {
  turbopack: { resolveAlias: { fs: { browser: './empty.ts' }, '~*': '*' } },
  reactCompiler: true,
  images: {
    localPatterns: [{ pathname: '/assets/**', search: '?v=1' }],
    minimumCacheTTL: 60, imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [50, 75, 100], maximumRedirects: 0,
  },
}
```

위는 각 migration 옵션을 함께 보여 주는 예이며 모두 필수는 아니다. fs browser alias가 필요하면 empty.ts에 `export {}`를 둔다. client가 fs 기능을 실제 필요로 한다면 이 fallback은 해결책이 아니므로 server/client module을 분리한다. ~* alias 대신 Sass `@import '~bootstrap/dist/css/bootstrap.min.css'`에서 ~를 제거하는 편이 직접적이다. reactCompiler는 `npm install -D babel-plugin-react-compiler`도 필요하다.

Image의 기본은 minimumCacheTTL14400,16px제외 imageSizes,qualities[75],maximumRedirects3이다. 예는 옛60초/16px/다중quality/redirect차단 요구가 있는 경우다. maximumRedirects5는 chain을 늘리는 대안이며 동일 object에0과5를 중복 선언하지 않는다. VPC private source가 필요한 경우만 dangerouslyAllowLocalIP:true를 검토하며 공개 입력 SSRF 위험을 확인한다.

```tsx
import Image from 'next/image'
<Image src="/assets/photo?v=1" alt="Photo" width={100} height={100} />
```

local query는 localPatterns.search 정확한허용이 필요하다. remotePatterns는 protocolhttps/hostnameexample.com에 pathname/port/search를 추가해 최소 범위로 제한한다. domains는14부터deprecated,legacy component는16deprecated다. Image import만 바꾸면 layout/objectFit 같은 prop 변환이 완성되지 않으므로 shared 상세 API와 migration visual을 확인한다.

```json
{
  "scripts": { "dev": "next dev", "build": "next build --webpack", "start": "next start" }
}
```

기본16 dev/build에는 --turbo/--turbopack이 필요 없다. custom webpack config를 무시하기로 결정했다면 next build --turbopack, 유지하면 --webpack, 완전 이전하면 top-level turbopack으로 옮긴다. dev/build가다른bundler인 위 예는두환경을검증한다. turbopack advanced loader condition/debugIds는 current config reference의 옵션이다.

```js
// phase로 개발용 side effect 실행
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'
import { startServer } from 'docs-lib/dev-server'
export default function config(phase) {
  if (phase === PHASE_DEVELOPMENT_SERVER) startServer()
  return {}
}
```

위 helper는프로젝트에설치/구현한다. NODE_ENV==='development'도상황에따라선택가능하며process.argv의dev검사는이제false일수있다.16.0의alpha adapter는 experimental.adapterPath=require.resolve('./my-adapter.js')였으나16.2부터 top-level adapterPath를사용한다. dev `.next/dev`와 build는분리됐고동일모드다중인스턴스는lockfile로제한된다. tracing은 `npx next internal trace .next-profiles/trace-turbopack.bin`이다.

AMP의next/amp useAmp/page configamptrue 및next.config amp.canonicalBase는모두제거한다. next lint/next.config eslint도제거됐고ESLint/Biome를직접실행한다. devIndicators에서appIsrStatus/buildActivity/buildActivityPosition만제거되며indicator는유지된다. experimental.dynamicIO/useCache를사용하지않았다면제거하고실제도입중일때만cacheComponents:true로의미를이전한다. unstable_rootParams는next/root-params로바꾼다.

## 이해 확인

1. custom webpack 설정을 남기고16의 기본 build를 실행하면 어떤 오류가 날 수 있는가?
2. lint가 build에서 자동 실행된다고 CI를 생략할 수 있는가?
3. 최소 image TTL이4시간이면 새 이미지를 같은 URL로 바꿀 때 무엇을 확인해야 하는가?

## 출처

- [Next.js, version-16](https://nextjs.org/docs/app/guides/upgrading/version-16)

## 관련 문서

- [[NextJS-Upgrade-16]]
- [[NextJS-App-Styling-Assets]]
- [[NextJS-App-Instrumentation]]
- [[NextJS-SPA-Migration-Compatibility]]
