---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 렌더링 전략과 모듈 경계"]
---

# Next.js 렌더링 전략과 모듈 경계

## 정적과 동적 렌더링의 선택 단위

Next.js의 정적 생성은 미리 계산한 출력을 재사용하고, 동적 렌더링은 요청 시점 정보를 반영한다. Cache Components를 켜면 정적 shell, 캐시한 UI와 요청별 UI를 컴포넌트 단위로 조합한다. 이 모델은 `cacheComponents: true`가 전제이며, 모든 기존 App Router와 Pages Router에 같은 규칙을 적용하지 않는다.

| 모델 | 적합한 조건 | 운영 비용과 제약 |
|---|---|---|
| 빌드 시 정적 출력 | 배포 때만 콘텐츠 변경 | 정적 호스팅 단순, 변경 반영은 다시 빌드 |
| 경로 단위 정적/동적 분리 | 경로별 최신성 요구가 명확 | 요청별 경로는 서버 실행과 응답 캐시 정책 필요 |
| 컴포넌트별 정적 shell와 동적 영역 | 같은 화면에 공개 콘텐츠와 개인화 혼재 | streaming, 캐시 무효화, HTML/RSC 일관성과 플랫폼 지원 확인 |

단일 Node.js 서버도 동적 기능을 실행할 수 있다. 모든 호스트가 정적 shell를 edge에 배치하거나 같은 지연을 내는 것은 아니다. 기능이 작동하는지와 CDN 적중, streaming latency, 무효화 전파 속도는 별도로 검증한다.

## Server Component와 Client Component

Server Component는 서버 모듈 그래프에서 실행되고 Client Component 참조와 직렬화 가능한 props를 RSC Payload로 만든다. Client Component는 초기 방문에서 서버 HTML 생성에도 참여하고 브라우저에서 hydrate한다. 이후 client navigation은 RSC Payload를 받아 기존 트리에 병합할 수 있다. RSC는 SSR, SSG와 ISR 중 하나의 다른 이름이 아니다.

`use client`는 파일과 그 의존 모듈을 Client graph 진입점으로 만든다. 부모가 Client Component라고 해서 children으로 전달된 Server Component의 소스까지 브라우저로 가는 것은 아니다. 반대로 Client module에서 직접 import한 모듈은 클라이언트 의존성으로 검토해야 한다.

```tsx
// Server Component가 두 자식의 소유자다.
export default function Page() {
  return <ClientModal><ServerCart /></ClientModal>
}
```

ClientModal은 이미 서버가 만든 children을 배치한다. ServerCart를 ClientModal 내부로 import하는 구조와 다르다. state, Effect, 이벤트 handler, 브라우저 API는 Client Component에 두고 DB와 비밀 접근은 서버 경계에 둔다. native details, 서버 form action, video 같은 상호작용은 별도 client module 없이도 가능하다.

같은 utility를 서버와 클라이언트 양쪽이 import하면 각 그래프에 포함될 수 있다. 공유 모듈이 자동으로 서버 전용이 되는 것은 아니다. Client component의 `Menu.Item` 같은 정적 속성을 서버 참조에서 읽는 패턴은 named export 또는 client wrapper로 바꾼다.

## 공개 페이지와 개인화 영역

상품 설명과 공지는 재사용 가능한 공개 데이터다. 로그인 메뉴와 사용자별 가격은 요청 정보를 요구한다. Cache Components에서는 공개 조회에 `use cache`를 적용하고 사용자 UI를 Suspense 아래에서 읽어 shell가 먼저 표시되게 한다.

데이터를 사용하는 페이지 최상단에서 먼저 await한 뒤 자식을 Suspense로 감싸면 이미 발생한 대기를 분리할 수 없다. await를 실제 소비하는 하위 컴포넌트로 내린다. 사용자별 데이터는 인증 후 분리된 키와 적절한 lifetime을 정하고, 공개 캐시에 요청 전체나 비밀 토큰을 넣지 않는다.

## 데이터와 HTML의 경계

Server Component는 같은 앱의 Route Handler를 내부 HTTP로 재호출할 필요 없이 DAL이나 기존 백엔드를 직접 호출할 수 있다. Promise를 Client Component에 전달해 `use()`로 읽을 때도 해결된 값은 클라이언트에 직렬화된다. 코드가 서버에 있다는 이유만으로 props가 비밀인 것은 아니다.

초기 HTML에 포함된 Server/Client UI는 모두 검색 엔진에 보일 수 있다. 사용자 상호작용 뒤에만 만들어지는 내용까지 초기 HTML에 있다고 가정하지 않는다. bundle 감소, 서버 응답 지연, hydration과 메모리 사용을 각각 측정한다.

## 선택을 확인하는 질문

- 어느 값이 배포 때 고정되고, 어느 값이 사용자 요청과 URL마다 달라지는가?
- 최신성이 필요한 영역만 늦게 표시할 수 있는가, 페이지 전체가 일관된 snapshot이어야 하는가?
- 사용 중인 호스트가 shell 재사용, 동적 resume, streaming과 cache invalidation을 어떻게 구현하는가?

## 공개 페이지를 단계적으로 구성하기

`cacheComponents: true`인 상품 페이지를 예로 든다. 요청 헤더, params, 현재 시간이나 난수, 외부 조회를 읽지 않는 Header는 미리 렌더링할 수 있다. 여기에 캐시하지 않은 DB 조회를 페이지에서 바로 await하면 응답 전체가 기다릴 수 있고, Cache Components에서는 Suspense 밖의 uncached data 오류가 발생한다.

```tsx
import { Suspense } from 'react'
import { db } from '@/lib/db'
import { Promotion, PromotionSkeleton } from './promotion'

async function ProductList() {
  'use cache'
  const products = await db.product.findMany()
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}
export default function Page() {
  return <>
    <Suspense fallback={<PromotionSkeleton />}><Promotion /></Suspense>
    <header><h1>Products</h1></header>
    <ProductList />
  </>
}
```

DB와 Promotion 모듈은 앱에서 구현하는 의존성이다. ProductList의 입력을 빌드 전에 알 수 있으면 캐시한 결과가 prerender에 포함된다. Promotion은 지역, A/B 실험이나 사용자 요청 정보를 내부에서 읽으며 경계 안에서 대기한다. 공개 Header, 목록과 fallback은 먼저 보내고 프로모션만 나중에 스트리밍한다.

빌드 출력의 `○`는 정적, `◐`는 부분 prerender를 나타낸다. 원문 예제의 `15m`, `1y`는 그 빌드의 표시값이며 모든 앱의 고정 기본값을 증명하지 않는다. 정적 shell을 CDN 지연으로 보내는지는 배포 플랫폼이 shell 저장과 resume을 지원하는지에도 달려 있다. 공개 콘텐츠 변경은 ISR로 갱신할 수 있고 동적 params와 private 데이터는 각각의 캐시 계약을 추가로 적용한다.

## 세밀한 렌더링의 운영 계약

컴포넌트별 경계는 유용한 shell을 먼저 보여 주고 비싼 조회만 점진적으로 캐시하게 한다. 다만 `use cache`는 직렬화, 요청 API 접근과 배치 위치의 제약을 지키는 함수에 적용하며 모든 함수에 무조건 사용할 수 있다는 뜻은 아니다. 무효화 대상도 cache entry, tag, path의 계약에 따른다.

| 플랫폼 책임 | 필요한 이유 |
|---|---|
| 스트리밍 전달 | 초기 shell 뒤에 동적 결과를 같은 응답으로 전달 |
| 다중 인스턴스 무효화 전파 | 한 서버의 revalidate가 다른 서버의 오래된 캐시와 어긋나지 않게 함 |
| HTML과 RSC 일관성 | 새로고침과 클라이언트 탐색에서 서로 다른 버전이 보이지 않게 함 |
| shell 저장과 resume 통합 | origin 요청 이전에 CDN에서 shell을 보내고 동적 렌더링을 이어감 |

단일 Node.js 프로세스는 기본 실행 대상이다. 중간 프록시가 응답을 버퍼링하면 기능 결과는 전달되더라도 점진적 표시의 성능 이점은 사라진다. 공유 캐시와 edge compute는 다중 서버의 일관성 및 지연 개선을 위해 별도로 설계한다.

공식 문서는 adapter test suite 충족을 기능 지원 계약(functional fidelity)으로, CDN shell 지연과 ISR 전파 속도 등을 성능 수준(performance fidelity)으로 구분한다. 테스트 통과가 이 저장소에서 해당 플랫폼을 직접 검증했다는 뜻은 아니다. CDN의 KV, blob, edge compute 보유만으로 PPR resume 통합이 자동 완성되지는 않는다. 커뮤니티 adapter의 실제 기능 행렬과 CDN 통합 범위를 [[NextJS-Deployment-Guides]]에서 확인한다.

## 출처

- [Next.js, rendering-philosophy](https://nextjs.org/docs/app/guides/rendering-philosophy)
- [Next.js, server-and-client-boundary](https://nextjs.org/docs/app/guides/server-and-client-boundary)
- [Next.js, public-static-pages](https://nextjs.org/docs/app/guides/public-static-pages)

## 관련 문서

- [[NextJS-Streaming]]
- [[NextJS-Data-Security]]
