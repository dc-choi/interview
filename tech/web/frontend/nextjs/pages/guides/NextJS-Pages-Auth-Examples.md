---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages의 로그인 API, session cookie와 권한 검사"]
---

# Pages의 로그인 API, session cookie와 권한 검사

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## 로그인 form과 인증 provider

```tsx
// pages/login.tsx
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/router'
export default function Login() {
  const router = useRouter()
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const response = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
    })
    if (response.ok) await router.push('/profile')
    else setError('로그인하지 못했습니다.')
  }
  return <form onSubmit={submit}>
    <input type="email" name="email" required placeholder="Email" />
    <input type="password" name="password" required placeholder="Password" />
    <p role="alert">{error}</p><button type="submit">Login</button>
  </form>
}
```

```ts
// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { signIn } from '@/auth'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).end(); return }
  const { email, password } = req.body ?? {}
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Invalid input' }); return
  }
  try {
    await signIn('credentials', { email, password })
    res.status(200).json({ success: true })
  } catch (error) {
    const type = typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined
    res.status(type === 'CredentialsSignin' ? 401 : 500).json({ error:
      type === 'CredentialsSignin' ? 'Invalid credentials' : 'Something went wrong' })
  }
}
```

signIn은 선택한 provider의 Pages API 호환 adapter다. App Action에만 맞는 API를 그대로 import하지 않는다. 인증 성공은 provider가 credential을 검증하고 session을 설정한 뒤의 상태다. 예제는 오류를 unknown으로 좁히며 실제 서비스는 schema/rate limit/CSRF와 provider 계약을 적용한다.

## 서버에서 cookie와 DB session 생성

```ts
import { serialize } from 'cookie'
import type { NextApiRequest, NextApiResponse } from 'next'
import { encrypt, authenticate } from '@/lib/session'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.status(405).end(); return }
  const user = await authenticate(req.body)
  if (!user) { res.status(401).end(); return }
  const session = await encrypt({ userId: user.id })
  res.setHeader('Set-Cookie', serialize('session', session, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/',
  }))
  res.status(200).json({ message: 'Successfully set cookie' })
}
```

authenticate/encrypt는 검증된 인증/session library로 구현하고 cookie package는 별도 설치한다. 원문처럼 req.body 전체를 암호화해 곧바로 session을 만들면 공격자가 userId/role을 지정할 수 있어 검증된 user로 바꿨다. encrypt가 Promise면 반드시 await한다. 삭제는 동일 name/path/domain으로 maxAge:0 cookie를 응답하며 서버 DB session도 revoke한다.

DB session은 table과 insert/update/delete 수명을 만들고 인증된 userId에 대해 cryptographically random sessionId를 생성한다. createdAt/만료를 저장한 뒤 선택적으로 암호화한 ID를 cookie에 설정한다. 서버 상태와 cookie를 동기화한다. 원문 generateSessionId() 미정의/req.body user.id/JSON sessionId 반환 예는 완성된 인증 구현이 아니다. session ID를 frontend 응답 본문으로 불필요하게 노출하지 않는다. 이 ID의 생성/만료/rotation/revocation은 [[NextJS-Session-Lifecycle]]을 따른다.

stateless는 cookie token을 서버에서 검증하고 DB 방식은 cookie의 ID로 DB 상태를 확인한다. DB 방식이 존재만으로 항상 안전하고 stateless가 항상 불안전한 것은 아니며 구현/폐기 요구에 맞게 선택한다. Iron Session/Jose 같은 session library와 auth provider를 구분한다.

## optimistic Proxy와 API의 secure 검사

```ts
// proxy.ts
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const session = await decrypt(request.cookies.get('session')?.value)
  if (path === '/dashboard' && !session?.userId)
    return NextResponse.redirect(new URL('/login', request.url))
  if (['/login', '/signup', '/'].includes(path) && session?.userId)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  return NextResponse.next()
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'] }
```

루트 `/dashboard`만 검사하는 예는 하위 route를 보호하지 않는다. 실제 protected policy에 맞춰 matcher/경로를 정한다. Node Proxy에서 library 호환성을 확인하며 prefetch마다 DB 조회를 반복하지 않는다. optional Proxy는 cookie 기반 빠른 redirect와 static paywall 초기 gate이고 실제 데이터/공개 API authorization을 대신하지 않는다.

```ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/session'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req)
  if (!session) { res.status(401).json({ error: 'User is not authenticated' }); return }
  if (session.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin privilege required' }); return
  }
  res.status(200).json({ allowed: true })
}
```

원문의 인증된 사용자 권한 부족 401을 403으로 구분했다. object별 권한은 DAL에서 data 조회/수정 가까이에 검증하고 DTO로 필요한 field만 반환한다. Cache Components의 per-user cache/session 규칙은 App에 대한 [[NextJS-Auth-Cache-Patterns]]와 현재 Router 범위를 맞춘다.

## auth 자료의 역할

Auth0/Better Auth/Clerk/Descope/Kinde/Logto/NextAuth(OAuth/Auth.js)/Ory/Stack Auth/Supabase/Stytch/WorkOS는 공식 가이드의 Next 호환 후보다. Pages adapter와 session/authorization/social login/MFA/RBAC 지원을 실제 버전에 확인한다. XSS/CSRF, Next server security, Copenhagen Book은 심화 학습 자료이며 이 목록을 구현 검증으로 간주하지 않는다.

## 출처

- [Next.js, Authentication](https://nextjs.org/docs/pages/guides/authentication)

## 관련 문서

- [[NextJS-Pages-Security-Forms]]
- [[NextJS-Session-Lifecycle]]
- [[NextJS-Auth-Access-Checks]]
