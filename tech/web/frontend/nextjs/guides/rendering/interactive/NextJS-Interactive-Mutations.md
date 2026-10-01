---
tags: [nextjs, app-router, interaction]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Taskboard 댓글, 폼 수명과 캐시"]
---

# Taskboard 댓글, 폼 수명과 캐시

## persisted comments와 pending comments

controlled input에서 addComment를 await한 뒤 setContent('')만 하면 입력과 서버 목록이 응답까지 그대로다. 대안은 Server CommentSection이 persisted comments를 렌더하고 Client OptimisticComments는 useOptimistic([])로 pending comments만 별도로 표시하는 것이다.

```tsx
const [pendingComments, setPendingComments] = useOptimistic<Comment[]>([])
const formRef = useRef<HTMLFormElement>(null)
async function submit(formData: FormData) {
  const raw = formData.get('content')
  const content = typeof raw === 'string' ? raw.trim() : ''
  if (!content) return
  formRef.current?.reset()
  setPendingComments(current => [{
    id: crypto.randomUUID(), content, userName: 'You',
    createdAt: new Date().toISOString(),
  }, ...current])
  await addComment(taskId, content)
}
// <form ref={formRef} action={submit}> 안에 name='content'인 required input.
// pendingComments는 pending CommentCard로, 그 뒤 서버 comments를 렌더한다.
```

form action이 transition을 만든다. DOM reset과 optimistic setter는 제출 프레임의 피드백을 주며 일반 state의 transition update는 완료까지 지연될 수 있다. pending UUID는 React key와 임시 항목 구별용이다. fresh render가 오면 빈 base의 pending 목록이 사라지고 서버 항목이 대신 표시된다. 원문 `formData.get(...)?.trim()`은 File도 가능한 FormData 타입을 먼저 좁혀야 한다.

이 reset은 네트워크 완료 전에 입력을 비우는 의도적 선택이다. 실패한 입력을 복구해야 하는 서비스라면 별도 draft/result 상태가 필요하다. React의 function action은 성공 시 uncontrolled field를 자동 reset하므로 즉시 reset과 성공 후 자동 reset을 구분한다.

## create dialog의 pending, close와 reset

수동 onSubmit의 isSubmitting/isOpen state는 완료 후 dialog를 먼저 닫고 board render가 나중에 와 시점이 어긋날 수 있다. field도 별도 reset이 없으면 남는다. useActionState는 결과 key, formAction, isPending을 함께 관리한다.

```tsx
const [{key}, formAction, isPending] = useActionState(async (prev, data) => {
  const raw = data.get('title')
  const title = typeof raw === 'string' ? raw.trim() : ''
  if (!title) return prev
  const description = data.get('description')
  await createTask({title,
    description: typeof description === 'string' ? description : '',
    status: 'todo', priority: 'medium'})
  startTransition(() => setIsOpen(false))
  toast.success('Task created')
  return {key: prev.key + 1}
}, {key: 0})
```

Dialog의 open/onOpenChange는 isOpen/setIsOpen이며 form.action은 formAction이다. inputs를 `<div key={key}>` 아래에 두면 성공 시 key 증가로 모두 remount되어 reset된다. button은 disabled=isPending이고 Creating.../Create Task를 표시한다. 빈 title은 prev를 유지한다. 실제 form에는 서버 validation/실패 결과를 별도로 표시한다.

await 뒤 state update는 현재 transition에 자동 포함되지 않으므로 setIsOpen(false)를 새 startTransition으로 감싼다. 원문은 이 조합으로 createTask의 refresh가 가져온 새 board와 dialog close를 함께 commit하는 예를 설명한다. toast, analytics, focus 같은 React render 상태를 바꾸지 않는 후속 작업은 await 뒤 실행하며 transition이 필수는 아니다.

demo의 status/priority/assignee/label picker도 hidden input에 선택을 기록해 같은 key로 초기화한다. uncontrolled field의 성공 후 자동 reset과 key로 picker subtree까지 reset하는 역할은 다르다.

## 삭제 상태를 ancestor로 알리기

Server CommentCard는 직접 pending을 알 수 없으므로 재사용 DeleteButton이 deleteAction:()=>void|Promise<void>를 받는다. form action에서 useOptimistic(false)의 setter를 true로 바꾸고 await deleteAction()한다. button은 disabled=isPending, aria-label='Delete comment', data-pending={isPending ? '' : undefined}를 설정한다.

parent card의 `has-data-pending:opacity-30`은 descendant attribute를 읽어 클릭 즉시 30% opacity로 표시한다. 서버 목록에서 삭제가 확인되면 card가 unmount된다. state를 ancestor로 올리거나 callback을 여러 층 전달하지 않아도 된다. 서버는 deleteComment.bind(null,comment.id)를 전달하고 demo에서 userName==='You'일 때만 버튼을 표시한다. 실제 삭제 권한은 서버의 소유권 검증으로 결정해야 한다.

## 재사용 읽기와 정확한 변경 갱신

앞의 일곱 단계는 Cache Components 없이도 작동한다. 마지막 단계는 Next.js 16의 cacheComponents:true를 활성화한다. 기존 앱의 모든 route에도 prerender 검증이 적용되므로 request cookies/headers/searchParams가 Suspense 밖에 있으면 먼저 경계를 수정한다.

```ts
export async function getTask(id: string) {
  'use cache'
  cacheLife('hours')
  cacheTag('tasks', `task-${id}`)
  return getTaskById(id)
}
export async function updateStatus(taskId: string, status: Status) {
  const updated = await updateTaskStatus(taskId, status)
  if (!updated) return {success: false as const, error: 'Task no longer exists'}
  updateTag('tasks')
  updateTag(`task-${taskId}`)
  return {success: true as const, status}
}
```

재사용할 read인지, write가 정확히 invalidate할 수 있는지를 먼저 판단한다. task-{id}는 개별 task, tasks는 목록의 갱신 손잡이다. 성공 write 뒤 해당 tag를 updateTag한다. refresh는 dynamic work를 다시 실행하지만 cache entry는 유지하므로 cached task를 갱신하는 용도로 대체할 수 없다.

demo의 comment thread는 열린 페이지의 최신 토론을 위해 dynamic으로 유지한다. 추가/삭제 뒤 refresh로 현재 comments를 다시 읽고 task cache는 보존한다. private/remote scope, lifetime와 Route Handler의 revalidateTag는 각각의 캐시 계약을 따른다.

## URL별 prefetch와 선택 표

16.3 이후 Partial Prefetching의 기본 Link는 현재 사용자에 대해 links가 공유하는 App Shell을 가져온다. params/searchParams는 링크별 URL data라 기본 shell에서 제외된다. task card의 `<Link href={'/task/' + id} prefetch={true}>`는 URL data까지 클릭 전에 resolve한다. card가 viewport로 들어올 때 detail을 준비하는 예다.

목적지의 URL별 작업을 사용자가 곧 필요로 할 때 per-link prefetch 가치가 크다. cached read는 Client Cache에서 재사용하고 tag로 invalidate할 수 있다. Partial Prefetching의 prerender는 uncached read에서 멈춘다. 이 예제에서 dynamic으로 유지한 comments는 prefetch=true만으로 클릭 전에 완료되지 않고 탐색 후 stream된다. 캐시할 수 있는 URL별 task 데이터와 이 uncached 토론을 구분한다. 가이드의 dynamic read도 클릭 전에 완료된다는 설명은 partial-prefetch 계약과 충돌하여 일반 보장으로 적용하지 않는다. 데이터 정본을 browser로 옮기는 패턴은 아니다.

| 상황 | primitive |
| --- | --- |
| 느린 조회를 page와 독립적으로 표시 | Suspense |
| async 작업 중 바뀐 값을 즉시 표시 | useOptimistic |
| pending, throw 전달, UI update 조정 | useTransition |
| form pending/reset/result | useActionState |
| ancestor가 다른 곳의 pending 표시 | data-pending과 CSS |
| 요청 간 read 재사용과 write 후 최신성 | use cache, cacheTag, updateTag/revalidateTag |
| 이동 즉시 목적지 표시 | Partial Prefetching, URL data는 prefetch=true |

여러 primitive를 섞되 각 제약에 맞춰 선택한다. direct browser fetch와 initial data/client cache 조정은 client-side data fetching, shared reducer의 서버/클라이언트 목록 정렬은 SPA, state animation은 View Transitions 문서로 이어진다.

## 출처

- [Next.js, interactive-apps](https://nextjs.org/docs/app/guides/interactive-apps)
- [Next.js, Adopting Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching)
- [Next.js, Optimizing Prefetching](https://nextjs.org/docs/app/guides/optimizing-prefetching)
- [React, function form action과 uncontrolled reset](https://react.dev/reference/react-dom/components/form)

## 관련 문서

- [[NextJS-Interactive-Feedback]]
- [[NextJS-App-Revalidation]]
- [[NextJS-App-Prefetch-Config]]
- [[NextJS-View-Transitions]]
