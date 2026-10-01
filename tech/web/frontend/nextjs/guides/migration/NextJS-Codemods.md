---
tags: [nextjs, migration, upgrade]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next codemod의 변환 범위와 검증"]
---

# Next codemod의 변환 범위와 검증

## 자동 변환은 source rewrite다

codemod는 AST 기반으로 import/config/file/callsite를 프로그램적으로 바꾼다. domain semantics나 배포 환경을 자동으로 증명하는 도구는 아니다. `npx @next/codemod <transform> <path>`로 실행하고 --dry는 파일을 쓰지 않는 preview, --print는 변환 결과 비교에 사용한다. target path와 현재 diff를 먼저 확인한다.

upgrade [revision]은 package와 추천 codemod를 함께 적용한다. revision은 patch/minor/major, dist tag(latest/canary/rc), exact version을 받으며 stable 기본은 minor다. target가 현재와 같거나 낮으면 변경하지 않고 종료한다. --verbose는 상세 output, --yes/-y는 모든 prompt의 default를 수용한다.

stdin이 TTY가 아닌 CI/AI agent 환경에서는 yes 동작이 자동 적용된다. React18 이후 upgrade, Turbopack 채택, 추천 변환, React19 codemod를 대화 없이 default로 선택할 수 있으므로 입력이 없다는 사실을 선택권을 보존한 실행으로 오해하지 않는다. 실제 설치/변환 diff와 target를 검토한다.

```bash
npx @next/codemod upgrade patch
npx @next/codemod upgrade 16
npx @next/codemod@canary next-async-request-api . --dry --print
```

## 16.3의 점진 cache 채택

| transform | 변경과 조건 |
| --- | --- |
| cache-components-instant-false | instant 없는 page/layout/default에 false 추가. use client와 기존 instant는 건너뜀 |
| remove-partial-prefetch | global partialPrefetching 채택 뒤 page/layout의 prefetch='partial' 제거. force-disabled 등 다른 값 유지 |

둘은 canary codemod 명령을 제공한다. src project는 ./src/app을 지정한다. 잘못된 path가 `0 ok`로 끝날 수 있어 처리 file count를 반드시 확인한다. instant=false는 validation opt-out이므로 synchronous I/O 오류/cache semantics를 자동 해결하지 않는다. TODO를 route별로 제거하여 실제 Cache Components 모델을 채택한다.

## 16.0의 기계 변경

| transform | 변경 |
| --- | --- |
| remove-experimental-ppr | page/layout의 experimental_ppr export 제거 |
| remove-unstable-prefix | 안정화된 cacheLife/cacheTag 같은 API prefix 정리 |
| middleware-to-proxy | 파일/named export를 proxy로, 관련 flags도 rename |
| next-lint-to-eslint-cli | lint script를 eslint .로, flat config/dependencies 생성, 기존 config 보존 |

middleware flag rename에는 middlewarePrefetch→proxyPrefetch, middlewareClientMaxBodySize→proxyClientMaxBodySize, externalMiddlewareRewritesResolve→externalProxyRewritesResolve, skipMiddlewareUrlNormalize→skipProxyUrlNormalize가 포함된다. runtime을 Node Proxy로 바꾸는 것이 필요한 project 판단인지 확인한다.

remove-unstable-prefix가 모든 unstable API를 stable로 만드는 것은 아니다. unstable_cache/unstable_rethrow와 개별 API stability는 해당 source를 따른다. upgrade 하나가 모든 개별 transform을 실행하지도 않으므로 남은 async request compatibility를 별도로 찾는다.

## 15와14의 타입/metadata 변환

next-async-request-api는 cookies/headers/draftMode를 await 또는 React use로 바꾼다. page/layout/route/default와 generateMetadata/generateViewport의 params/searchParams도 Promise access로 옮긴다. async로 만들 수 없거나 의미를 결정할 수 없는 위치는 UnsafeUnwrapped cast 또는 @next/codemod marker를 남긴다. marker를 검토하지 않은 채 삭제하거나 cast만 유지하면16의 async-only 계약을 충족하지 못한다.

next-request-geo-ip는 @vercel/functions를 설치하고 geo/ip를 geolocation/ipAddress로 바꾼다. Vercel-specific host 계약을 다른 host에도 자동 적용하지 않는다. app-dir-runtime-config-experimental-edge는 당시 experimental-edge→edge 변환이다. 현재 Edge segment export deprecated 안내와 구분한다.

next-og-import는 ImageResponse의 next/server→next/og, metadata-to-viewport-export는 themeColor/colorScheme/viewport 관련 export 분리, built-in-next-font는 @next/font 제거와 next/font import 변환이다. metadata 제목/description과 viewport가 각 파일에서 유지되는지 확인한다.

## 오래된 codebase의 transform

| 도입 버전 | transform | 계약과 주의 |
| --- | --- | --- |
|13|next-image-to-legacy-image|기존 image behavior를 유지하도록 legacy import, future→new image |
|13|next-image-experimental|legacy→new image로 layout/objectFit/objectPosition을 style로, lazyBoundary/lazyRoot 제거. behavior를 바꿀 수 있음 |
|13|new-link|nested a 제거, handler/attribute를 Link로 이동 |
|11|cra-to-next|당시 Pages Router/client-only migration. 최신 App guide와 다른 경로 |
|10|add-missing-react-import|React 참조가 있는 파일에 import 추가 |
|9+|name-default-component|Fast Refresh용 anonymous default component에 파일 기반 camelCase 이름 |
|8|withamp-to-config|withAmp→page amp config. AMP와 이 transform은16에서 제거 |
|6|url-to-withrouter|top-level url prop→Pages withRouter/router. App router로 옮기는 transform은 아님 |

next-image-experimental은 먼저 legacy import transform을 적용하는 역사적 순서를 따른다. 현대 Image와 CSS 결과를 visual/production으로 검사한다. new-link가 custom anchor wrapper까지 원하는 semantics로 변환했는지 확인한다. 오래된 transform 이름이 목록에 남아 있는 것과 current release에서 실행 지원되는 것은 구분한다.

## 완료 기준과 이해 확인

변환 diff, processed file count, old symbol의 전체 references, UnsafeUnwrapped/@next/codemod marker, package/lockfile, lint/type/build와 실제 route 동작을 확인한다. rollback 가능한 작은 변경 단위로 적용한다.

1. non-TTY upgrade는 prompts를 기다리는가?
2. 0 ok를 successful migration으로 판단할 수 있는가?
3. Image import 유지 transform과 behavior 변경 transform의 위험은 어떻게 다른가?

## 출처

- [Next.js, codemods](https://nextjs.org/docs/app/guides/upgrading/codemods)

## 관련 문서

- [[NextJS-Upgrade-16]]
- [[NextJS-Upgrade-14-and-15]]
- [[NextJS-App-Instant-Validation]]
- [[NextJS-App-Prefetch-Config]]
