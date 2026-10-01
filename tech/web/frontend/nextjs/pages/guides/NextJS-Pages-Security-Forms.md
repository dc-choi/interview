---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 인증, 폼과 CSP", "NextJS Pages Security Forms"]
---

# Pages Router의 인증, 폼과 CSP

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 인증과 데이터 권한을 분리한다

인증은 신원 확인, session management는 요청 간 상태 유지, authorization은 접근 가능한 데이터와 동작 판단이다. Pages 로그인은 form에서 API Route로 POST하고 성공 후 `next/router`로 이동하는 흐름이다. App Server Actions를 전제하지 않는다.

API Route에서 인증 provider와 session library를 사용한다. cookie에는 `httpOnly`, production의 `secure`, 적절한 `sameSite`, 만료와 path를 적용한다. stateless session은 cookie 내용의 서명/암호화와 만료를 검증하고, DB session은 브라우저 식별자를 DB 상태와 대조한다. 요청 body의 userId/role로 곧바로 session을 만들지 않고 인증된 신원으로 만든다.

Proxy의 cookie 기반 optimistic check는 빠른 UX redirect용이다. prefetch에도 실행되므로 모든 요청에서 무거운 DB query를 하기보다, 실제 데이터 접근 가까이의 DAL에서 session과 객체별 권한을 다시 검증한다. API Route를 직접 호출해도 권한이 적용되어야 한다. DTO는 브라우저에 보낼 최소 필드만 만든다. button을 숨기는 것만으로 권한을 보장하지 않는다.

라이브러리 선정 때는 Pages 지원, session revocation/rotation, OAuth/MFA/RBAC와 runtime 호환성을 확인한다. auth guide의 helper는 전체 보안 구현이 아니라 흐름 예시다.

## 폼의 wire format을 끝까지 맞춘다

텍스트 mutation은 JSON POST로 보내고 API Route에서 런타임 schema를 검증할 수 있다. 기본 required/type=email은 사용자 안내이고 서버 검증은 별도다.

```tsx
import { useState, type FormEvent } from 'react'

export default function Form() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.get('name') }),
      })
      if (!response.ok) throw new Error('저장하지 못했습니다.')
      const { id } = await response.json()
      // 성공한 id를 사용해 UI 갱신 또는 router 이동
    } catch (error) {
      setError(error instanceof Error ? error.message : '요청 실패')
    } finally {
      setLoading(false)
    }
  }

  return <form onSubmit={submit}>
    <label>이름<input name="name" required /></label>
    <p role="status">{error}</p>
    <button disabled={loading}>{loading ? '저장 중...' : '저장'}</button>
  </form>
}
```

서버는 허용 method, 인증/권한, body 형태를 검증한 뒤 저장한다. Zod/Valibot 등의 schema 검증을 쓰면 실패 결과를 400 같은 의도한 응답으로 처리한다. `req.body`의 타입 표기만 믿지 않는다.

파일 upload로 FormData를 직접 전송하면 multipart/form-data다. API Routes의 기본 bodyParser가 multipart를 완성된 필드 객체로 제공한다고 가정하지 말고 선택한 multipart parser의 계약을 확인한다. 파일 없이 기본 native form을 보내는 경우 application/x-www-form-urlencoded 파싱 경계도 함께 맞춘다.

fetch의 HTTP redirect는 document navigation과 다르다. mutation 결과 JSON을 받은 뒤 router.push하거나 native form의 document 이동을 사용한다. 307은 method를 보존하므로 제출 후 다른 GET 페이지로 이동할 정책과 구별한다.

## nonce CSP는 request-time 렌더와 연결된다

공통 CSP 정책은 [[NextJS-Content-Security-Policy]]를 따른다. Pages에서는 Proxy가 생성한 `x-nonce`를 `getServerSideProps({ req })`에서 읽어 pageProps로 전달하고 `<Script nonce={nonce}>`에 적용한다. Document의 `getInitialProps`는 `ctx.req?.headers['x-nonce']`를 읽어 `<Head nonce>`와 `<NextScript nonce>`에 넘길 수 있다.

nonce는 매 요청마다 새 값과 같은 CSP header가 필요하다. 정적 생성/ISR cache HTML에 nonce를 고정해 재사용하지 않는다. App Router용 experimental SRI 대안을 Pages 지원으로 오해하지 않는다. third-party script domain, inline style 정책과 dev의 eval 요구는 실제 CSP 위반 로그로 확인한다.

## JSON schema와 실제 저장 응답

```ts
// pages/api/submit.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
const schema = z.object({ name: z.string().trim().min(1) })
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).end(); return }
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: '이름 필요' }); return }
  const response = await fetch('https://store.example.com/items', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  })
  if (!response.ok) { res.status(502).json({ error: '저장 실패' }); return }
  const { id } = await response.json()
  res.status(200).json({ id })
}
```

Zod는 별도 설치하고 저장 provider/인증을 실제 backend에 맞춘다. 원문 form은 FormData multipart를 보내면서 req.body 객체를 schema.parse하므로 기본 API bodyParser와 맞지 않는다. 위 JSON form과 JSON handler를 한 쌍으로 쓰거나 multipart parser를 명시적으로 구성한다. basic HTML required/type=email과 server schema는 역할이 다르다. loading/error 예는 이전 error clear, response.ok 검사, catch unknown 좁히기, finally에서 loading false 복구와 button disabled를 포함한다.

성공 후 문서 이동은 native form API 응답 redirect 또는 client에서 JSON id를 받고 router.push(`/post/${id}`)로 구성한다. 원문 res.redirect(307,...)는 POST/body를 보존하는 정책이며 GET result page 이동이면 303을 검토한다. fetch redirect는 fetch 응답을 따라갈 뿐 browser의 top-level URL을 바꾸지 않는다. CORS header 없는 API는 browser cross-origin 접근을 허용하지 않는 기본 상태지만 다른 server/CLI 호출을 차단하는 인증 장치가 아니다. API key/env는 서버에서만 사용한다.

## Pages에서 nonce를 전달하는 전체 예제

아래 page는 요청 시점 SSR을 선택하고 header의 string/array 타입을 정규화한다. 원문에 섞인 `app/page.tsx`의 `connection()` 예제는 App 전용이며 Pages의 동적 렌더링은 getServerSideProps로 구성한다. 공통 Proxy에서 생성한 request CSP와 x-nonce가 선행해야 한다.

```tsx
// pages/index.tsx
import Script from 'next/script'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
export const getServerSideProps: GetServerSideProps<{ nonce: string | null }> = async ({ req }) => {
  const value = req.headers['x-nonce']
  return { props: { nonce: typeof value === 'string' ? value : null } }
}
export default function Page({ nonce }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <Script src="https://www.googletagmanager.com/gtag/js"
    strategy="afterInteractive" nonce={nonce ?? undefined} />
}
```

공통 script는 `_app`에서 `pageProps.nonce`를 읽고 `<Component {...pageProps}/>`와 함께 같은 Script를 렌더한다. 그러면 해당 script가 필요한 모든 page에서 nonce를 제공해야 한다. Document는 최초 document 서버 렌더에만 실행되므로 client navigation용 request 데이터 제공을 대신하지 않는다.

```tsx
// pages/_document.tsx
import Document, { Html, Head, Main, NextScript,
  type DocumentContext, type DocumentInitialProps } from 'next/document'
interface Props extends DocumentInitialProps { nonce?: string }
export default class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext): Promise<Props> {
    const initialProps = await Document.getInitialProps(ctx)
    const value = ctx.req?.headers['x-nonce']
    return { ...initialProps, nonce: typeof value === 'string' ? value : undefined }
  }
  render() {
    const { nonce } = this.props
    return <Html lang="en"><Head nonce={nonce}/><body>
      <Main/><NextScript nonce={nonce}/>
    </body></Html>
  }
}
```

Google 분석 정책의 예는 script-src에 `https://www.googletagmanager.com`, connect-src에 `https://www.google-analytics.com`, img-src에 `data:`와 `https://www.google-analytics.com`을 허용한다. nonce/strict-dynamic과 각 지시어의 상호작용을 적용 브라우저에서 확인한다. 필요한 inline script만 허용해야 하거나 민감 정보/엄격한 규정이 있는 경우 nonce를 검토하며 SSR 비용을 함께 평가한다.

## 학습 확인

- API 직접 호출로 인증과 권한 검사가 우회되지 않는지 확인한다.
- JSON/multipart/native form의 content-type과 서버 파서를 각각 맞춘다.
- CSP response nonce와 HTML script nonce가 같은지 확인한다.

## 출처

- [Next.js, authentication](https://nextjs.org/docs/pages/guides/authentication)
- [Next.js, content-security-policy](https://nextjs.org/docs/pages/guides/content-security-policy)
- [Next.js, forms](https://nextjs.org/docs/pages/guides/forms)

## 관련 문서

- [[NextJS-Pages-API-Routes]]
- [[NextJS-Pages-Server-Props]]
- [[NextJS-Pages-Scripts]]
- [[NextJS-Authentication]]
