---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["가입 폼에서 인증 제공자까지"]
---

# 가입 폼에서 인증 제공자까지

## 입력, 검증과 계정 생성

가입은 자격 증명 수집, 서버 검증, 계정 생성 또는 로그인 확인, 세션 생성, 이동의 순서다. form의 name은 FormData key이고 label의 htmlFor/id는 접근 가능한 이름을 연결한다. email/password input은 브라우저 UX이며 서버 검증의 대안이 아니다.

인증 제공자가 검증을 담당할 수도 있고 Zod, Valibot, Yup으로 직접 스키마를 둘 수도 있다. 이름 길이, email 형태, 비밀번호 최소 길이와 문자 규칙은 서비스 정책이다. 예제의 8자/문자/숫자/특수문자 조합을 보편적 보안 표준으로 고정하지 않는다. 이름과 email의 정규화와 달리 비밀번호를 임의 trim하면 사용자가 입력한 비밀 자체가 바뀐다.

```ts
// app/actions/signup.ts: createAccount와 createSession은 앱의 서버 모듈이다.
'use server'
import * as z from 'zod'
import { redirect } from 'next/navigation'
import { createAccount } from '@/data/accounts'
import { createSession } from '@/lib/session'

const inputSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(8),
})
interface State { errors?: Partial<Record<'name' | 'email' | 'password', string[]>>; message?: string }
export async function signup(_previous: State, form: FormData): Promise<State> {
  const result = inputSchema.safeParse({
    name: form.get('name'), email: form.get('email'), password: form.get('password'),
  })
  if (!result.success) return { errors: z.flattenError(result.error).fieldErrors }
  const user = await createAccount(result.data)
  if (!user) return { message: '계정을 생성하지 못했습니다.' }
  await createSession(user.id)
  redirect('/profile')
}
```

실제 createAccount는 비밀번호를 해시하고 DB의 중복 제약과 오류를 처리해야 한다. 공식 교육 예제의 bcrypt cost 10은 예시 값이다. DB insert의 반환 첫 항목이 없을 때 실패를 반환하며, 계정 생성 성공 뒤에만 세션을 만든다. 입력 오류에서 일찍 반환하면 인증 API/DB 호출을 줄일 수 있다.

## useActionState의 상태 계약

```tsx
'use client'
import { useActionState } from 'react'
import { signup } from './actions/signup'
export function SignupForm() {
  const [state, action, pending] = useActionState(signup, {})
  return <form action={action}>
    <label htmlFor="signup-name">이름</label>
    <input id="signup-name" name="name" required />
    <label htmlFor="signup-email">이메일</label>
    <input id="signup-email" name="email" type="email" required />
    <label htmlFor="signup-password">비밀번호</label>
    <input id="signup-password" name="password" type="password" required />
    <p aria-live="polite">{state.message}</p>
    <ul>{Object.entries(state.errors ?? {}).flatMap(([field, errors]) =>
      (errors ?? []).map((error, i) => <li key={`${field}-${i}`}>{error}</li>))}</ul>
    <button disabled={pending}>가입</button>
  </form>
}
```

Action을 form에 바로 넘기면 주 입력은 FormData이지만 useActionState로 감싸면 앞에 이전 state가 추가된다. 반환 errors를 필드 가까이에 표시하면 어떤 입력을 고쳐야 하는지 알기 쉽다. 위 코드는 계약을 보여주는 축약 UI다. useFormStatus는 form 하위 컴포넌트에서 pending을 읽고 React 19에서는 data/method/action도 제공한다.

중복 email/사용자명은 blur 또는 debounced 입력 검사로 미리 안내할 수 있다. 이 UX 검사가 동시 가입 경쟁을 막지 않으므로 최종 서버 검증과 DB unique 제약은 유지한다. 인증 성공과 변경 작업에 대한 인가도 별개다.

## 인증 라이브러리와 세션 라이브러리

인증 라이브러리는 외부 로그인, 다중 인증, 역할 정책과 세션 운영을 묶을 수 있다. 세션 라이브러리의 서명/암호화 도구만으로 계정 복구와 인증 전체가 구현되지는 않는다.

공식 가이드가 연결하는 Next.js 인증 통합은 Auth0, Better Auth, Clerk, Descope, Kinde, Logto, NextAuth.js(Auth.js), Ory, Stack Auth, Supabase, Stytch, WorkOS다. 세션 도구로 iron-session과 jose를 연결한다. 목록 등재는 현재 프로젝트의 보안 검증이나 비용/기능 적합성을 증명하지 않는다. 선택 시 설치 버전의 App Router/Node runtime, cookie, refresh/revoke, 외부 로그인과 다중 인증 지원을 확인한다.

XSS, CSRF와 세션 설계의 배경 자료는 공식 가이드 하단의 보안 문서와 Copenhagen Book으로 이어진다. 해당 외부 자료 전체를 이 Next.js 문서의 직접 수집 범위로 보지는 않는다.

## 출처

- [Next.js, authentication](https://nextjs.org/docs/app/guides/authentication)

## 관련 문서

- [[NextJS-Authentication]]
- [[NextJS-Session-Lifecycle]]
- [[NextJS-Actions-and-Forms]]
