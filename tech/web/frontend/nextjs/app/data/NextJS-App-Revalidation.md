---
tags: [nextjs, app-router, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["tag와 path의 재검증"]
---

# tag와 path의 재검증

## 이름, 수명과 무효화는 서로 다르다

`cacheTag`는 `use cache` 안에서 cache entry에 label을 붙인다. Cache Components를 활성화해야 한다. label은 함수 인자와 closure로 계산한 cache key를 대신하지 않는다. 같은 tag를 여러 entry에 붙이면 한 domain 변경으로 여러 결과를 갱신할 수 있다. 같은 tag를 반복해서 붙이는 것은 idempotent하다.

```ts
async function getPost(id: string) {
  'use cache'
  cacheTag('posts', `post-${id}`)
  return database.post.find(id)
}
```

tag는 case-sensitive이며 최대256자다. cacheTag는 variadic API로 한 호출에 최대128개를 받는다. 초과하거나 너무 긴 tag는 경고와 함께 생략될 수 있으므로 ID 기반으로 길이와 수를 제한한다. cacheLife는 언제 stale/expire할지를, cacheTag는 무엇을 함께 갱신할지를 정한다.

## API 선택

| API | 호출 위치 | 갱신 계약 |
| --- | --- | --- |
| `revalidateTag(tag, 'max')` | Server Function, Route Handler | stale로 표시하고 다음 사용에서 오래된 값을 제공하면서 background 재검증 |
| `revalidateTag(tag, { expire: 0 })` | Server Function, Route Handler | 다음 read에서 새 값을 기다리게 한다. webhook에 사용할 수 있다 |
| `updateTag(tag)` | Server Action만 | 즉시 expire. 변경한 사용자의 다음 read가 새 값을 기다리는 read-your-own-writes |
| `revalidatePath(path, type?)` | Server Function, Route Handler | 특정 page/layout/handler에 연결된 결과를 갱신 |
| `refresh()` | Server Action만 | client router를 refresh. tag data cache를 invalidate하지 않음 |

revalidateTag의 두 번째 인자는 cacheLife profile 이름이나 expire를 가진 object다. profile에서 이 API가 쓰는 값은 expire다. `max` 기본 프리셋의 expire는 1년이다. custom profile/object도 받으므로 이를 모든 expire 값의 상한으로 일반화하지 않는다. 두 번째 인자 없는 예전 즉시 expire 형식은 deprecated이며 현재 TypeScript 계약에서는 오류가 난다. 이 API들은 Client Component나 Proxy에서 부르지 않는다.

## path의 계약과 현재 동작

path는 최대1024자이고 case-sensitive다. `/blog/abc` 같은 concrete URL에는 type을 생략할 수 있다. `/blog/[slug]` 같은 dynamic pattern에는 `page` 또는 `layout`이 필요하다. pattern에 `/page`, `/layout`을 붙이지 않는다. rewrite를 쓰면 주소창의 별칭보다 실제 route destination을 대상으로 한다.

`page`는 해당 page를 대상으로 하고 자식 page를 일괄 포함하지 않는다. `layout`은 해당 layout과 아래 nested layout/page에 영향을 준다. `/`의 layout을 갱신하면 client router cache를 모두 purge하는 넓은 작업이 된다. Route Handler의 GET 응답 cache도 path로 갱신할 수 있다.

Server Action에서 현재 화면의 path를 갱신하면 UI에 즉시 반영된다. 현재 구현은 이전에 방문한 다른 page도 이후 navigation에서 다시 refresh하게 할 수 있으며 공식 문서는 이 부분을 임시 동작으로 설명한다. Route Handler에서 호출하면 다음 방문에 revalidation하도록 표시하며 모든 dynamic path를 그 순간 일괄 계산하지 않는다.

같은 `posts` tag를 쓰는 `/blog`와 `/dashboard`가 있어도 revalidatePath('/blog')만으로 dashboard의 공유 데이터까지 모두 새로 만들지는 않는다. 변경의 대상이 domain data라면 tag도 갱신한다.

```ts
'use server'
export async function publishPost(id: string) {
  await requireEditor(id)
  await database.publish(id)
  updateTag(`post-${id}`)
  updateTag('posts')
  revalidatePath('/blog/[slug]', 'page')
}
```

API 호출 시점의 원본 write가 실제로 완료되어야 한다. background job에 write만 맡기고 바로 invalidation하면 다시 읽은 값도 오래될 수 있다. tag 개수를 무작정 늘리기보다 변경 단위와 query 결과의 의존성을 연결한다.

## 갱신 API의 세부 서명과 예

`revalidateTag(tag: string, profile: string | {expire?:number}): void`, `updateTag(tag:string):void`, `revalidatePath(path:string,type?:'page'|'layout'):void`는 값을 반환하지 않는다. 태그는 먼저 fetch next.tags 또는 use cache 내부 cacheTag로 할당해야 한다. 너무 긴 tag는 entry에 붙지 않으므로 갱신해도 효과가 없다. revalidateTag 호출은 직접 전체 데이터를 생성하지 않고 다음 사용이 갱신을 시작한다. stale 허용 기간이 지나면 새 결과까지 block한다. profile에서 expire만 읽으며 max는1년, expire:0은 stale을 전혀 허용하지 않는 조건이다.

상품 query는 use cache 안에서 cacheLife('hours')와 cacheTag('products')를 붙일 수 있다. 직접수명 `{stale:3600,revalidate:7200,expire:86400}`은 초 단위다. seconds/revalidate:0/expire<5분은 짧은 cache라 shell 대신 dynamic hole이 된다. 수명별 전체 표는 [[NextJS-App-Cache-Life]]에 있다. CMS처럼 변경 알림이 있으면 max 수명/tag와 webhook을 사용해 변하지 않은 콘텐츠의 불필요한 시간 갱신을 줄인다. serverless in-memory entry는 재검증 사이 유지되지 않을 수 있다.

Bookings 예는 type:string 기본값haircut을 encodeURIComponent로 query에 넣고 component에 bookings-data를 붙이거나, helper의 fetch 결과 data.id까지 두태그로 붙인다. Action은 updateBookingData 완료 후 revalidateTag('bookings-data','max')한다. addPost 뒤 updateTag('my-data')는 다음read부터fresh를 기다린다. 새글 Action은 **목록 posts와 상세 post-{id} 두태그**를 expire한 다음 `/posts/{id}`로 redirect하여 자신의쓰기를 즉시 읽는다. Handler에서 updateTag를 부르면 throw하므로 revalidateTag 또는 expire:0을 선택한다.

path는 trailingSlash 설정과 관계없이 끝 slash가 필요 없다. `revalidatePath('/blog/post-1')`은 한페이지, `('/blog/[slug]','page')` 및 `('/(main)/blog/[slug]','page')`는 해당파일에 대응하는 page지만 `/blog/[slug]/[author]`는 제외한다. layout pattern과 route-group 예는 아래 모든layout/page까지 포함한다. `('/','layout')`은 Client Cache 전체purge와 모든cacheddata의다음방문 갱신이다. `/api/data`는 force-cache GET에서 읽은 데이터를 갱신한다. rewrite가 source:/blog,destination:/news이면 `/news`를 사용한다.

/posts tag를 공유하는 blog API와 limit=5 dashboard API는 다른 요청 entry다. path('/blog')만으로 dashboard entry를 갱신하지 않으므로 utility는 DB write 후 path와 updateTag('posts')를 함께 호출한다. Action submitForm 완료 뒤 revalidatePath('/')도 가능하다. 갱신Handler 예는 NextRequest.nextUrl.searchParams에서 path/tag를 읽고 있으면 revalidatePath(path) 또는 revalidateTag(tag,'max') 후 `{revalidated:true,now:Date.now()}`, 없으면 false/now/missing message를 JSON으로 반환한다. 실제 외부 webhook에는 인증과허용대상검증을 추가한다.

## 이해 확인

1. 게시 직후 본인에게 새 값이 필요하면 max와 updateTag 중 어느 쪽인가?
2. 같은 tag를 쓰는 다른 page가 path 갱신만으로 항상 최신이 되는가?
3. webhook에서 updateTag를 호출할 수 없는 이유와 대안은?

## 출처

- [Next.js, revalidating](https://nextjs.org/docs/app/getting-started/revalidating)
- [Next.js, cacheTag](https://nextjs.org/docs/app/api-reference/functions/cacheTag)
- [Next.js, refresh](https://nextjs.org/docs/app/api-reference/functions/refresh)
- [Next.js, revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
- [Next.js, revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [Next.js, updateTag](https://nextjs.org/docs/app/api-reference/functions/updateTag)

## 관련 문서

- [[NextJS-App-Cache-Life]]
- [[NextJS-App-Cache-Functions]]
- [[NextJS-App-Actions]]
- [[NextJS-App-Route-Handlers]]
