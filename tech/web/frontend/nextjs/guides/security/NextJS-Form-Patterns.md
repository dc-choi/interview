---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 폼 상태와 제출 패턴"]
---

# Next.js 폼 상태와 제출 패턴

## 서버 검증과 상태 반환

폼 Action의 인자는 `FormData`다. invoice 생성처럼 여러 필드가 있으면 `customerId`, `amount`, `status`를 각각 추출해 타입과 업무 규칙을 검증한 뒤 변경/캐시 갱신을 수행한다. `Object.fromEntries(formData)`에는 `$ACTION_` 필드도 들어갈 수 있다. 어떤 방식으로 받은 값이든 신뢰할 수 없는 입력이다.

브라우저의 `required`, `type="email"`은 빠른 피드백이다. 서버의 Zod/Valibot schema를 대체하지 않는다. 다음은 Zod 4 문법을 사용하며, 이전 예제의 `invalid_type_error`와 instance `.flatten()`을 그대로 혼합하지 않는다. 프로젝트의 `saveEmail`은 사용자 ID에 해당하는 데이터를 변경하고 `auth`는 실제 세션을 검증하는 앱 함수다.

```ts
// app/actions.ts
'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { saveEmail } from '@/lib/users'
const schema = z.object({ email: z.email() })
export interface FormState {
  message: string
  errors?: { email?: string[] }
}
export async function updateEmail(
  _previous: FormState, formData: FormData,
): Promise<FormState> {
  const session = await auth()
  if (!session?.user) return { message: '로그인이 필요합니다.' }
  const result = schema.safeParse({ email: formData.get('email') })
  if (!result.success) return {
    message: '입력을 확인해 주세요.',
    errors: z.flattenError(result.error).fieldErrors,
  }
  await saveEmail(session.user.id, result.data.email)
  revalidatePath('/profile')
  return { message: '저장했습니다.' }
}
```

## useActionState와 pending

```tsx
// app/profile/form.tsx
'use client'
import { useActionState } from 'react'
import { updateEmail, type FormState } from '../actions'
const initial: FormState = { message: '' }
export function EmailForm() {
  const [state, action, pending] = useActionState(updateEmail, initial)
  return <form action={action}>
    <label htmlFor="email">이메일</label>
    <input id="email" name="email" type="email" required />
    <p>{state.errors?.email?.join(', ')}</p>
    <p aria-live="polite">{state.message}</p>
    <button disabled={pending}>저장</button>
  </form>
}
```

`useActionState`로 감싼 함수는 첫 인자로 이전 state를 받는다. 일반 `<form action={fn}>`용 `(formData)` 함수와 signature를 혼동하지 않는다. pending 동안 버튼을 막거나 로딩을 표시한다. 서버에서 반환하는 상태는 클라이언트로 직렬화될 최소 정보다.

```tsx
'use client'
import { useFormStatus } from 'react-dom'
export function SubmitButton() {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending}>저장</button>
}
```

`SubmitButton`을 `<form>` 안의 자식으로 렌더해야 그 폼의 상태를 읽는다. 폼을 만드는 동일 컴포넌트에서 자신이 반환할 폼 상태를 읽는 방식은 작동하지 않는다. React 19는 pending 외에 data/method/action을 제공하고 이전 버전은 pending만 제공한다. 실험적 offline 지원을 활성화하면 연결 단절로 중단된 Action은 pending을 유지하고 재연결 시 완료를 시도한다.

## 추가 인자와 여러 제출 동작

`const action = updateUser.bind(null, userId)`를 `<form action={action}>`에 넘기면 서버는 `(userId, formData)`를 받는다. Server/Client Component 양쪽에서 가능하고 progressive enhancement를 지원한다. hidden input은 HTML에 값이 드러난다. bind나 hidden으로 전달한 ID 모두 서버에서 현재 사용자와 소유권을 대조한다.

```tsx
<form action={publish}>
  <input name="title" required />
  <button formAction={saveDraft}>임시 저장</button>
  <button type="submit">발행</button>
</form>
```

`publish`와 `saveDraft`는 각각 검증/인가하는 Server Action이라고 가정한다. button 외에 `input type="submit"`, `input type="image"`도 formAction을 지원하며 별도 event handler에서 호출할 수도 있다.

## 낙관적 목록

```tsx
'use client'
import { useOptimistic } from 'react'
import { sendMessage } from './actions'
interface Message { id: string; text: string }
export function Thread({ messages }: { messages: Message[] }) {
  const [optimistic, add] = useOptimistic(messages,
    (state, message: Message) => [...state, message])
  const action = async (data: FormData) => {
    const text = data.get('message')
    if (typeof text !== 'string' || !text.trim()) return
    add({ id: crypto.randomUUID(), text })
    await sendMessage(text)
  }
  return <div>
    {optimistic.map((m) => <p key={m.id}>{m.text}</p>)}
    <form action={action}>
      <input name="message" required /><button>보내기</button>
    </form>
  </div>
}
```

`sendMessage`는 서버에서 재검증하고 저장한 뒤 새 확정 목록이 전달되도록 캐시를 갱신한다고 가정한다. 임시 ID는 화면의 key이며 서버의 권한 근거가 아니다. Action이 끝나면 optimistic 값은 실제 props를 기준으로 정리되므로 성공/실패 후 확정 데이터와 오류 UI를 연결한다.

## 키보드로 제출

```tsx
const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if ((event.ctrlKey || event.metaKey) &&
      (event.key === 'Enter' || event.key === 'NumpadEnter')) {
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }
}
// 폼 내부에서 사용한다.
// <textarea name="entry" rows={20} required onKeyDown={onKeyDown} />
```

`requestSubmit()`은 연결된 폼의 유효성 검사와 제출 흐름을 실행한다. `form`이 없는 textarea에서는 optional chain 때문에 아무 작업도 하지 않는다.

## 출처

- [Next.js, forms](https://nextjs.org/docs/app/guides/forms)

## 관련 문서

- [[NextJS-Actions-and-Forms]]
- [[NextJS-Auth-Forms]]
