---
tags: [nextjs, migration, upgrade]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next14와15의 역사적 변경 계약"]
---

# Next14와15의 역사적 변경 계약

## release별 변경을 현재와 구분하기

이 문서는13→14,14→15 upgrade에서 생긴 변화의 이유와 대응을 기록한다.16.3 설치에 적용할 현재 요구조건은 Next16 문서에서 확인한다. 역사적 guide의 latest 명령은 실행 시점의 최신 major를 설치하므로15 target에 대한 pin 명령이 아니다.

Next14 guide는 next@next-14, React18과 해당 ESLint config 설치를 안내한다. 실제 package tag가 필요한 support/patch를 가리키는지 확인한다. React/type package를 함께 맞춘다. Next15 guide의 React19 prerelease peer warning을 force/legacy-peer-deps로 우회하라는 문장은 과도기 설명이며 현재 conflict는 실제 package support부터 확인한다.

## 13에서14

| 변경 | 대응 |
| --- | --- |
| 최소 Node16.14→18.17 | 당시 Node16 지원 종료. 현재16 target은20.9+ |
| next export command 제거 | next.config output='export'와 next build |
| ImageResponse import 이동 | next/server→next/og |
| @next/font 완전 제거 | built-in next/font |
| next-swc WASM target 제거 | 지원되는 SWC/build 실행 환경 확인 |

export config 전환은 server 기능을 제공하는 배포로 바뀌는 것이 아니다. build 산출물/host와 optimizer/API 지원을 검사한다.

## 14에서15: React와 Request API

15 guide의 React 최소19에서 useFormState는 deprecated되고 useActionState가 권장되었다. pending을 직접 읽을 수 있다. React19 useFormStatus는 pending 외 data/method/action을 제공하며 React18의 hook 결과와 구분한다. React/type versions를 함께 맞춘다.

cookies/headers/draftMode, page/layout/route/default/metadata image의 params, page searchParams가 async API가 되었다.15에는 임시 synchronous compatibility와 UnsafeUnwrapped casts/dev warnings가 있었지만16에서는 제거되었다. final migration은 await 또는 React use로 Promise를 unwrap하는 코드다.

```tsx
import { cookies } from 'next/headers'
export default async function Page(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const theme = (await cookies()).get('theme')?.value
  return <p>{slug}: {theme}</p>
}
```

Client Component/synchronous component에서는 React use로 params/searchParams Promise를 읽을 수 있다. generateMetadata/generateViewport, route context도 async type에 맞춘다. GSP options.params와 generateImageMetadata params는 별도 동기 계약이므로 이름만 보고 모두 Promise로 바꾸지 않는다.

## 15의 cache 기본값 변화

fetch는 기본 cached가 아니며 필요한 경우 force-cache를 명시한다. 당시 fetchCache='default-cache' segment option으로 default를 바꿀 수 있었지만 Cache Components에서는 해당 export가 지원되지 않는다. GET Route Handler도 기본 cached가 아니고 legacy dynamic='force-static' opt-in은 현재 cache mode에 따라 판단한다.

page segments는 Link/useRouter의 새 navigation에서 기본 Client Cache 재사용 정책이 달라졌다. back/forward와 공유 layout/loading은 여전히 재사용될 수 있다. staleTimes로 page caching을 opt in할 수 있지만16.3 Cache Components의 Activity/client stale/prefetch와 섞어 하나의 버전 무관한 계약으로 설명하지 않는다.

## 15의 config와 host 변화

experimental-edge runtime value는 오류가 되어 edge로 옮기는 codemod가 제공되었다. 현재 segment runtime Edge deprecated를 최종 목표와 구분한다.

experimental.bundlePagesExternals는 stable bundlePagesRouterDependencies로, experimental.serverComponentsExternalPackages는 serverExternalPackages로 이름이 바뀌었다. bundling과 externalization은 반대 성격의 설정이므로 단순 배열 복사 외 실제 package runtime behavior를 확인한다.

Next15에서 Speed Insights auto instrumentation은 제거되었다. 실제 analytics가 필요하면 명시적으로 integration을 연결한다. NextRequest.geo/ip도 host-provided 값이라 제거되었고 Vercel에서는 @vercel/functions의 geolocation/ipAddress를 사용할 수 있다. 다른 host의 header/forwarded trust 계약을 무조건 Vercel helper와 같다고 가정하지 않는다.

## 확인과 이해 확인

historical code를 읽을 때 version, cacheComponents 여부, router, host를 함께 표시한다. current16 app에서 UnsafeUnwrapped/experimental-edge/old config가 남아 있는지 exact reference search로 확인한다.

1.15의 temporary sync API가16에서도 warning만 내고 동작하는가?
2. fetch cache default 변화는 HTTP browser cache와 같은 변경인가?
3. geo/ip helper를 Vercel 밖에서 사용하면 동일한 host evidence가 보장되는가?

## 출처

- [Next.js, version-14](https://nextjs.org/docs/app/guides/upgrading/version-14)
- [Next.js, version-15](https://nextjs.org/docs/app/guides/upgrading/version-15)

## 관련 문서

- [[NextJS-Upgrade-16]]
- [[NextJS-Codemods]]
- [[NextJS-App-Request-Response]]
- [[NextJS-App-Fetching]]
- [[React-Action-State]]
