---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["API Routes의 Node 요청과 응답", "NextJS Pages API Routes"]
---

# API Routes의 Node 요청과 응답

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 페이지가 아닌 서버 endpoint

`pages/api/*`는 `/api/*` HTTP endpoint로 등록된다. 클라이언트 bundle에 포함되지 않는다. default handler는 `handler(req: NextApiRequest, res: NextApiResponse<T>)`이고 Node `IncomingMessage`/`ServerResponse`를 확장한다. App Router Route Handler의 Web Request/Response와 같은 타입이 아니다.

```tsx
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: '허용되지 않은 method' })
  }
  const name = req.body?.name
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '이름을 입력하세요.' })
  }
  try {
    const id = await createItem({ name: name.trim() })
    return res.status(201).json({ id })
  } catch {
    return res.status(500).json({ error: '저장 실패' })
  }
}
```

`createItem`은 애플리케이션 저장 helper 자리다. 공개 endpoint이므로 인증, 객체별 권한과 입력 검증을 필요한 동작 전에 수행한다. TypeScript 응답 타입은 요청의 런타임 검증을 대신하지 않는다. `req.body`는 `any`다.

## request helper와 config

`req.cookies`/`req.query`는 없으면 `{}`, `req.body`는 content-type에 따라 파싱하며 body가 없으면 `null`이다. multipart upload와 webhook raw payload는 이 기본 helper만으로 끝난다고 가정하지 않는다.

```tsx
export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: '4mb',
  },
  maxDuration: 5,
}
```

- `bodyParser`는 기본 활성이다. webhook 서명을 원본 bytes로 검증하려면 `bodyParser: false`로 끄고 raw stream을 처리한다.
- `bodyParser.sizeLimit`는 parsed body 제한이다. bytes가 지원하는 크기 문자열(예: 500kb)을 사용한다. responseLimit의 숫자 byte 옵션과 구분한다.
- `responseLimit`는 기본 4MB 초과 응답에 **경고**한다. 응답 body를 반드시 잘라내는 제한과 다르다. `false`는 대형 응답의 메모리/성능 영향을 판단한 경우에만 사용한다.
- `externalResolver: true`는 Express/connect 같은 외부 resolver 사용 시 미완료 요청 경고를 끈다. 미완료 응답 자체를 고쳐 주지 않는다.
- `maxDuration`은 실행 기간 힌트이며 배포 플랫폼 지원과 제한을 확인한다.

## 응답 helper

| 호출 | 결과 |
| --- | --- |
| `res.status(code)` | 상태 설정 |
| `res.json(body)` | 직렬화 가능한 JSON 응답 |
| `res.send(body)` | string/object/Buffer 응답 |
| `res.redirect([status,] path)` | 기본 307 이동 |
| `await res.revalidate(urlPath)` | 실제 페이지 URL ISR 갱신 |
| `res.end()` | 응답 종료 |

응답한 분기는 return해 중복 응답을 막는다. async 작업의 완료와 응답 종료를 관리한다. 외부 호출 오류와 사용자 입력 오류를 구별하고 내부 오류 상세를 그대로 노출하지 않는다.

## 동적 API와 CORS

`[id]`는 단일 값, `[...slug]`는 배열, `[[...slug]]`는 루트 요청에서 해당 키가 없을 수 있다. 우선순위는 정적 API, 동적 API, catch-all이다. 같은 query 이름의 다중 값도 고려해 `string`인지 확인한다.

기본 CORS header가 없으므로 브라우저 cross-origin 접근은 별도 정책이 필요하다. CORS는 인증이나 CSRF 방어의 대체가 아니며 endpoint 자체를 외부 요청에서 숨기지도 않는다. static export에서는 API Routes를 실행할 수 없다. `pageExtensions`를 바꾸면 API 파일 등록에도 영향을 준다.

## streaming과 진단

Node API Routes는 `writeHead`/`write`/`end`로 streaming할 수 있다. SSE는 `Content-Type: text/event-stream`, `Cache-Control: no-store`와 `data: ...\n\n` 단위를 사용한다. 연결 종료, proxy buffering과 실행 제한까지 확인한다. Next.js 14+에서 새 streaming endpoint를 설계하면 App Route Handler로 점진 전환하는 선택도 있다.

## JSON, 일반 응답, redirect와 stream 실행 예제

`responseLimit`은 숫자 byte 또는 `1000`, `'500kb'`, `'3mb'`, `'8mb'` 같은 bytes 형식으로 경고 threshold를 바꿀 수 있다. `bodyParser.sizeLimit: '500kb'`는 요청 파싱 한도를 별도로 줄인다.

```tsx
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return res.status(200).json({ message: '정상 응답' })
  if (req.method !== 'POST') return res.status(405).send('허용되지 않은 method')
  const { name, message } = req.body ?? {}
  if (typeof name !== 'string' || typeof message !== 'string') {
    return res.status(400).json({ error: '입력 형식 오류' })
  }
  try {
    await handleFormInput({ name, message })
    return res.redirect(307, '/')
  } catch {
    return res.status(500).send({ error: '저장 실패' })
  }
}
```

`handleFormInput`은 애플리케이션 저장 함수 자리다. 성공 JSON과 일반 `send` 오류, 입력 저장 뒤 redirect를 비교한다. 307은 method/body를 보존하므로 POST 뒤 GET 화면으로 전환하려는 계약에는 303 등 의도한 HTTP 상태를 선택한다.

```tsx
// pages/api/events.ts
import type { NextApiRequest, NextApiResponse } from 'next'
export default async function events(req: NextApiRequest, res: NextApiResponse) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
  })
  for (let index = 0; index < 10; index += 1) {
    if (res.destroyed) return
    res.write(`data: ${index}\n\n`)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  res.end()
}
```

catch-all handler는 `Array.isArray(req.query.slug)`로 검사한 뒤 `slug.join(', ')`을 응답할 수 있다. `/api/post/a/b/c`는 배열 `['a', 'b', 'c']`다. optional catch-all `/api/post`는 slug key가 없으므로 배열 전용 메서드를 무조건 호출하지 않는다. route 우선순위 예시는 `/post/create`, `/post/[pid]`, `/post/[...slug]` 순이다.

## 동적 URL의 실제 반환

```ts
// pages/api/post/[...slug].ts
import type { NextApiRequest, NextApiResponse } from 'next'
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = req.query.slug
  if (!Array.isArray(slug)) { res.status(400).end('잘못된 경로'); return }
  res.end(`Post: ${slug.join(', ')}`)
}
```

`/api/post/a`의 query는 `{slug:['a']}`, `/api/post/a/b`는 `{slug:['a','b']}`다. `[...param]`처럼 이름은 바꿀 수 있다. `[pid].ts`는 pid를 string으로 검사한 뒤 `res.end('Post: ' + pid)`로 `/api/post/abc`에 `Post: abc`를 보낸다. `[[...slug]]`의 `/api/post` query는 빈 객체다. `NextApiResponse<{message:string}>`를 사용하면 `res.status(200).json({message:'Hello from Next.js!'})` 반환 형태를 타입으로 제한할 수 있다. status/redirect의 code는 유효 HTTP status여야 한다.

공식 예제의 request helper/GraphQL/REST/CORS 모음은 각각 [proxy](https://github.com/vercel/next.js/tree/canary/examples/api-routes-proxy), [GraphQL](https://github.com/vercel/next.js/tree/canary/examples/api-routes-graphql), [REST](https://github.com/vercel/next.js/tree/canary/examples/api-routes-rest), [CORS](https://github.com/vercel/next.js/tree/canary/examples/api-routes-cors) 구현을 비교하는 진입점이다. App으로 전환하면 서버 직접 조회는 Server Component, HTTP API는 Route Handler가 대응하며 일부 정적 GET Route Handler의 export 가능 여부와 Pages API의 export 불가를 구분한다.

## 학습 확인

- 잘못된 method/body에 저장 함수가 실행되지 않는지 확인한다.
- webhook 검증에 파싱 전 raw body가 필요한 이유를 설명한다.
- 응답 4MB 경고와 body parser 제한의 차이를 설명한다.

## 출처

- [Next.js, api-routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)

## 관련 문서

- [[NextJS-Pages-Security-Forms]]
- [[NextJS-Pages-ISR]]
