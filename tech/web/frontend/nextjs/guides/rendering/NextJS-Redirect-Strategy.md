---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 리다이렉트 위치와 규모"]
---

# Next.js 리다이렉트 위치와 규모

## 실행 위치로 선택한다

| 목적 | 수단 | 동작 |
| --- | --- | --- |
| 렌더/서버 처리 중 다른 URL로 | `redirect`, `permanentRedirect` | 일반 문맥 307/308. Action form 응답은 303, JS 환경은 client navigation |
| 사용자 이벤트로 이동 | `useRouter` | client push/replace. 단순 링크는 Link 사용 |
| 빌드 시 알고 있는 경로 규칙 | next.config `redirects` | Proxy보다 먼저 실행, 307/308 |
| 요청 조건 또는 동적 redirect map | Proxy의 `NextResponse.redirect` | 렌더 전 조건 검사, 상태 코드를 명시할 수 있음 |

307/308은 요청 method를 보존한다. 303은 변경 후 GET으로 이동하는 흐름에 적합하다. 영구 이동은 캐시와 검색 색인에 영향을 주므로 임시 로그인 이동과 canonical URL 변경을 구분한다.

`redirect`는 렌더를 중단하는 예외를 던진다. 일반 오류 처리의 `try/catch` 안에서 삼키지 않는다. 이미 streaming이 시작됐으면 HTTP header를 바꿀 수 없으므로 framework의 streaming redirect 동작을 고려한다. 입력 URL을 그대로 신뢰하면 open redirect가 생길 수 있어 허용 origin/path를 검증한다.

## 변경 후 이동

데이터 저장, 권한 검사, cache 갱신, 이동은 서로 다른 단계다. `revalidateTag(tag, 'max')`는 stale-while-revalidate이므로 방금 저장한 값이 반드시 새 페이지에서 보이는 계약과 같지 않다. read-your-own-write가 필요하면 `updateTag` 등의 조건을 확인한다. 이동이 데이터 저장 실패를 숨기지 않도록 실패 경로와 성공 경로를 나눈다.

## 대규모 규칙

작은 정적 목록은 설정으로 충분하다. 플랫폼 제한과 재배포 비용이 실제 문제가 될 때 KV/DB의 redirect map을 검토한다. 원문은 Vercel의 1,024개 제한을 예로 들지만 운영 결정 시 현재 플랫폼 제한을 다시 확인한다.

Bloom filter는 없는 경로를 빠르게 제외하는 앞단이다. 양성이면 실제 map을 다시 조회해야 하며 false positive를 redirect로 확정하지 않는다. filter와 map 배포 시점이 어긋나면 최신 규칙을 놓칠 수 있어 갱신 원자성과 버전도 관리한다. 조회 API 경로가 Proxy에 다시 매칭돼 재귀 요청을 만들지 않게 하고, destination 및 요청 입력을 검증한다.

## 이해 확인

- 저장 성공 후 즉시 새 값이 보여야 한다면 redirect만 호출해서는 왜 부족한가?
- Bloom filter의 양성 결과를 바로 redirect 목적지 존재로 취급할 수 없는 이유는 무엇인가?

## 변경과 요청 조건의 예제

```ts
'use server'
import { redirect, permanentRedirect } from 'next/navigation'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createAuthorizedPost, updateAuthorizedUsername } from '@/lib/data'
export async function createPost(form: FormData) {
  const post = await createAuthorizedPost(form)
  revalidatePath('/posts')
  redirect(`/post/${encodeURIComponent(post.id)}`)
}
export async function changeUsername(form: FormData) {
  const username = await updateAuthorizedUsername(form)
  revalidateTag('username', 'max')
  permanentRedirect(`/profile/${encodeURIComponent(username)}`)
}
```

DAL 함수는 인증, 권한과 입력 검증을 수행하는 앱 의존성이다. 실패하면 성공 redirect까지 진행하지 않는다. redirect/permanentRedirect는 Server Component, Route Handler와 Server Function에서 사용할 수 있다. Client Component render에서도 redirect가 가능하지만 이벤트 handler에서는 `const router = useRouter()`와 `onClick={() => router.push('/dashboard')}`를 쓴다. absolute URL도 허용되므로 신뢰할 수 없는 목적지를 직접 넘기지 않는다.

```ts
// next.config.ts
import type { NextConfig } from 'next'
export default {
  async redirects() {
    return [
      { source: '/about', destination: '/', permanent: true },
      { source: '/blog/:slug', destination: '/news/:slug', permanent: true },
    ]
  },
} satisfies NextConfig
```

설정은 path 외에도 header, cookie와 query 조건을 지원한다. permanent false는 307, true는 308이며 Proxy 전에 실행한다. Proxy에서 인증 조건을 볼 때는 provider의 비동기 여부를 확인하고 `await authenticate(request)` 후 `NextResponse.next()` 또는 `NextResponse.redirect(new URL('/login', request.url))`를 반환한다. 예컨대 matcher `/dashboard/:path*`로 제한한다. Proxy의 낙관적 인증 확인은 DAL의 최종 권한 검사를 대체하지 않는다.

## map과 Bloom filter의 조회 흐름

map의 한 항목은 `"/old": { "destination": "/new", "permanent": true }`다. JSON 파일 또는 읽기 최적화 KV/Redis/Global Config에서 pathname으로 찾는다. 외부 저장소에서 받은 JSON도 destination string과 permanent boolean을 검증해야 한다. `NextResponse.redirect`에는 상대 문자열을 그대로 주지 않고 request URL을 기준으로 절대 URL을 만든다.

```ts
// Proxy의 조회 핵심: bloomFilter와 readRedirect는 앱이 제공한다.
const pathname = request.nextUrl.pathname
if (bloomFilter.has(pathname)) {
  try {
    const entry = await readRedirect(pathname)
    if (entry) {
      const destination = new URL(entry.destination, request.url)
      if (destination.origin === request.nextUrl.origin &&
          destination.pathname !== pathname) {
        return NextResponse.redirect(destination, entry.permanent ? 308 : 307)
      }
    }
  } catch (error) {
    console.error('Redirect lookup failed', error)
  }
}
return NextResponse.next()
```

이 조각은 same-origin만 허용하는 정책 예다. 외부 이전이 필요하면 별도 origin allowlist를 둔다. 원문처럼 `ScalableBloomFilter.fromJSON(generatedFilter)`로 미리 만든 filter를 로드하면 Proxy에 큰 map 전체를 포함하지 않아도 된다. filter는 `bloom-filters` 같은 도구로 map의 키에서 생성하며 실제 map 조회는 양성일 때만 한다.

원문은 `/api/redirects?pathname=${encodeURIComponent(pathname)}`를 fetch하고 응답이 ok일 때 JSON entry를 읽는다. lookup Route Handler에서 searchParams의 pathname 누락/잘못된 입력은 400, map 부재도 원문에서는 400으로 처리하고 호출자는 계속 진행한다. 큰 map 파일은 이 handler에만 둔다. 구현에서는 `Object.hasOwn(redirects, pathname)`을 확인한 뒤 entry를 읽어 prototype 상속 키를 배제한다. Proxy matcher는 lookup 경로를 제외하여 재귀 호출을 막는다.

Bloom 양성이어도 map에 없으면 false positive이므로 redirect하지 않는다. 조회 장애 시 통과할지 오류를 반환할지는 URL 이전의 요구에 따라 정한다. filter와 map을 함께 갱신하지 않으면 새로운 키를 놓칠 수 있어 현재 버전의 filter를 사용한다. 대규모 이전이 아니라면 이런 추가 경로 없이 정적 redirects 또는 단일 KV 조회로 충분하다.

## 출처

- [Next.js, redirecting](https://nextjs.org/docs/app/guides/redirecting)

## 관련 문서

- [[NextJS-Actions-and-Forms]]
- [[NextJS-Authentication]]
