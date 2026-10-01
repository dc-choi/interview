---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 ISR과 재검증", "NextJS Pages ISR"]
---

# Pages Router의 ISR과 재검증

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 오래된 성공 결과를 제공하면서 다시 만든다

Pages ISR은 `getStaticProps`의 `revalidate`로 HTML/JSON을 다시 만드는 모델이다. App Router의 Cache Components, cache tag와 Server Component 계약을 그대로 적용하지 않는다.

`revalidate: 60`의 흐름은 build에서 생성, 60초 안 cache 응답, 60초 이후 첫 요청에 stale 응답, background 재생성, 성공 후 다음 요청부터 새 응답이다. 60초마다 timer가 모든 페이지를 자동 갱신하는 기능이 아니다.

새 경로는 `getStaticPaths`의 fallback 정책에 따라 생성한다. background 재생성과 신규 경로의 blocking 생성은 서로 다른 동작이다.

```tsx
export async function getStaticProps({ params }) {
  const response = await fetch(`https://api.example.com/posts/${params.id}`)
  if (response.status === 404) return { notFound: true, revalidate: 60 }
  if (!response.ok) throw new Error(`조회 실패: ${response.status}`)
  return { props: { post: await response.json() }, revalidate: 60 }
}
```

upstream 장애 때 throw하면 마지막 성공 결과가 유지되고 다음 요청에서 재시도한다. 실패 payload를 정상 결과처럼 반환하면 그 내용이 새 cache가 될 수 있다. 삭제와 일시적 장애를 구별한다.

## res.revalidate로 특정 URL을 즉시 갱신한다

CMS webhook 등에 응답하는 API Route에서 `await res.revalidate('/posts/1')`를 호출한다. `getStaticProps`의 시간 `revalidate`를 생략해도 on-demand 갱신은 가능하다.

```tsx
export default async function handler(req, res) {
  if (!process.env.REVALIDATE_SECRET || req.query.secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ error: '인증 실패' })
  }
  try {
    await res.revalidate('/posts/1')
    return res.json({ revalidated: true })
  } catch {
    return res.status(500).json({ error: '재검증 실패' })
  }
}
```

외부에서 재검증을 임의로 실행하지 못하도록 인증한다. on-demand ISR 요청에는 Proxy가 실행되지 않는다. rewrite된 표시 URL이 아니라 실제 페이지 URL을 전달한다. `/post-1`이 `/posts/1`로 rewrite되면 `/posts/1`을 사용한다. 운영 인증 방식과 동적 URL 입력 검증은 webhook 계약에 맞춰 추가한다.

## 운영과 문제 진단

- Node.js runtime을 사용한다. static export에서는 ISR을 지원하지 않는다.
- Node server/Docker는 지원하고 adapter는 플랫폼별 지원을 확인한다.
- 여러 instance의 disk/memory cache는 기본적으로 서로 다른 상태일 수 있다. 공유 durable cache와 invalidation 전달을 배포 구조에 맞게 구성한다.
- `next build` 후 `next start`로 확인한다. `next dev`의 요청별 실행은 production 동작 증거가 아니다.
- `NEXT_PRIVATE_DEBUG_CACHE=1`로 cache hit/miss와 on-demand 생성 로그를 확인한다. 진단용 내부 변수로 다룬다.
- fetch 로그의 `logging.fetches.fullUrl`로 요청을 관측할 수 있다. 민감 URL을 로그에 남기지 않는다.

`x-nextjs-cache`의 `MISS`, `HIT`, `STALE`와 upstream 요청 수를 함께 보면 HTML 결과가 갱신되는지 알 수 있다. cache header 하나만으로 다중 instance의 일관성이 증명되지는 않는다.

## ISR 기능 도입 이력

| 버전 | 기능 |
| --- | --- |
| 9.5 | Pages ISR stable |
| 12.0 | crawler에는 fallback UI를 주지 않는 bot-aware fallback |
| 12.2 | Pages 요청형 ISR stable |
| 13.0 | 별도 App Router 도입 |
| 14.1 | custom `cacheHandler` stable |

custom cache handler의 안정화는 여러 instance의 기본 캐시가 자동 공유된다는 보장이 아니다. 저장소와 invalidation 전달은 직접 구성한다.

## 학습 확인

- 재검증 기간 뒤 첫 요청에 이전 내용이 보이는 이유를 설명한다.
- upstream 500을 만들어 마지막 성공 결과가 유지되는지 확인한다.
- rewrite URL 재검증과 실제 경로 재검증을 구분한다.

## 출처

- [Next.js, incremental-static-regeneration](https://nextjs.org/docs/pages/guides/incremental-static-regeneration)

## 관련 문서

- [[NextJS-Pages-Static-Props]]
- [[NextJS-Pages-Static-Paths]]
- [[NextJS-Pages-API-Routes]]
