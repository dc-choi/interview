---
tags: [nextjs, app-router, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Server Action의 변경 계약"]
---

# Server Action의 변경 계약

## 서버 함수와 Action

`use server`는 async 함수를 서버에서 실행할 호출 경계로 만든다. 이벤트와 form에서 변경을 수행하는 Server Function을 Server Action이라 부른다. 호출은 POST이며 응답에서 변경 결과와 갱신된 UI를 한 roundtrip에 돌려줄 수 있다. Client Component에 import하려면 파일 최상위 `use server` 모듈의 export를 사용한다. Server Component에서는 함수 안에 directive를 둘 수 있다.

Action은 외부에서 호출 가능한 network endpoint다. UI가 버튼을 숨겼거나 함수가 특정 component에서만 참조된다는 사실로 인증을 대신하지 않는다. 입력을 검증하고 매 호출에 사용자를 확인한 뒤 해당 resource의 변경 권한을 검사한다. 클라이언트가 전달한 ID, hidden field, bound argument를 신뢰하지 않는다.

```ts
'use server'
import { updateTag } from 'next/cache'
export async function savePost(formData: FormData) {
  const user = await requireUser()
  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  await authorizePost(user, id)
  if (!title) return { error: '제목을 입력해 주세요.' }
  await database.post.update({ id, title })
  updateTag(`post-${id}`)
  return { error: null }
}
```

예상 가능한 validation 실패는 반환 상태로 표현한다. 예외는 error boundary로 보내고 domain 실패를 모두 throw로 처리하지 않는다. redirect는 control-flow throw이므로 try/catch 밖에서 호출하거나 Next 내부 throw를 그대로 통과시킨다.

## form과 event

`<form action={fn}>`, 버튼의 `formAction={fn}`은 FormData를 제공하며 자동으로 Transition 안에서 호출한다. Server Component form은 JavaScript가 준비되지 않아도 제출할 수 있다. Client Component의 form 제출은 hydration이 준비될 때까지 queue될 수 있다. 이를 무제한 offline 보장과 혼동하지 않는다.

useActionState는 이전 상태와 FormData를 받는 Action으로 validation 상태와 pending을 연결한다. useFormStatus는 form 내부 자식에서 pending과 제출 정보를 읽는다. event handler에서 직접 호출할 때는 startTransition으로 전환 상태를 연결할 수 있다. pending 동안 중복 제출을 줄이되 서버에서도 동일 변경의 중복 실행을 고려한다. optimistic UI는 실패 시 되돌림과 서버 결과 재조정을 포함해야 한다.

공식 문서 기준 client는 현재 Action을 순차 dispatch한다. 병렬 read fetch의 대체 수단으로 Action을 쓰지 않는다. useEffect에서 Action을 부를 수 있지만 mount/retry가 반복되어도 안전한 작업인지 확인한다.

## 변경 뒤 화면과 cache

`refresh()`는 Action에서 현재 client router UI를 새로 요청한다. tag나 path data cache를 자동으로 invalidate하지 않는다. `updateTag`는 Action 안에서 즉시 expire하여 read-your-own-writes를 보장하고, `revalidateTag('tag', 'max')`는 stale-while-revalidate를 사용한다. `revalidatePath`는 지정 route의 page/layout과 연결된 결과를 갱신한다. 필요한 freshness에 맞춰 선택한다.

Action에서 cookies를 set/delete하면 현재 page와 layout을 서버에서 다시 렌더링하여 UI에 반영한다. 관련 client state는 유지되고 변경된 dependency를 읽는 effect는 다시 실행될 수 있다. cookie 변경과 business data cache invalidation은 별개다. redirect를 한다면 cache 갱신을 먼저 끝내고 redirect를 마지막에 둔다.

## 확인과 실패 진단

Action을 단순 로컬 함수처럼 단위 호출하는 것만으로 serialization, POST 요청, auth, pending, cache refresh를 검증할 수 없다. 실제 form 제출에서 성공/validation/권한 실패/중복 제출/redirect를 확인한다. 데이터는 바뀌었는데 UI가 오래된 경우 mutation 완료 여부, invalidation 대상 tag/path, Client Component 자체 상태를 나누어 확인한다.

## 폼, 버튼과 Effect의 호출 예

createPost(FormData)는 auth() 후 title/content를 추출한다. deletePost는 id 추출 뒤 해당 사용자가 resource 소유자인지도 확인한다. client에서는 Action을 정의하지 않고 server module을 import하거나 `updateItemAction` prop을 받아 `<form action={updateItemAction}>`로 연결한다. title/content input의 name이 FormData key가 된다. Client form은 JS가 없으면 제출을 queue하고 hydration을 우선하며, hydration 후에는 문서 전체 새로고침 없이 제출한다.

LikeButton 예는 initialLikes:number를 useState에 넣고 async onClick에서 `const updatedLikes = await incrementLike()` 뒤 setLikes(updatedLikes)한다. pending 버튼 예는 `const [state, action, pending] = useActionState(createPost, false)`와 `onClick={() => startTransition(action)}`을 사용해 LoadingSpinner를 표시한다. 실제 Action signature는 useActionState의 이전state 인자에 맞춘다. experimental offline가 켜져 있으면 연결이 끊긴 Action은 pending으로 남고 재연결 때 완료된다.

자동 변경 예는 mount Effect에서 `startTransition(async () => { setViews(await incrementViews()) })`를 호출하고 initialViews/isPending을 사용한다. 앱 shortcut onKeyDown, infinite-scroll intersection observer 등 global event도 같은 사용처다. Effect 반복 실행이나 네트워크 재시도를 처리할 수 있는 mutation만 연결한다.

변경 후 auth검증된 updatePost가 refresh()를 호출하면 client router가 갱신되지만 tagged data는 invalidate되지 않는다. createPost가 revalidatePath('/posts') 후 redirect('/posts')하면 freshness 작업이 먼저 수행된다. `const store = await cookies()`의 get(name)?.value, set(name,value), delete(name)는 Action 안에서 지원된다. cookie 변경은 현재 React tree를 다시 렌더하며 필요한 mount/unmount, 유지된 state, dependency 변경 Effect 실행을 포함한다.

## refresh 호출 제한

`refresh(): void`는 인자와 반환값이 없는 next/cache API며 **Server Action에서만** 사용할 수 있다. Handler, Client Component 및 다른 context에서는 오류가 난다. 대표 Action은 title/content FormData로 db.post.create 후 refresh()한다. api/posts/route.ts의 POST에서 refresh()를 부르는 예는 잘못된 사용을 보여 주는 오류 예제다.

## 이해 확인

1. 버튼이 보이지 않는 사용자가 Action을 호출할 수 없다고 말할 수 있는가?
2. refresh와 updateTag는 각각 어떤 저장소 또는 화면을 바꾸는가?
3. 예상 validation 오류를 반환값으로 처리하면 form에 어떤 이점이 있는가?

## 출처

- [Next.js, mutating-data](https://nextjs.org/docs/app/getting-started/mutating-data)

## 관련 문서

- [[React-Action-State]]
- [[React-DOM-Form-Actions]]
- [[NextJS-App-Revalidation]]
- [[NextJS-App-Errors]]
