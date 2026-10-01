---
tags: [nextjs, app-router, interaction]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Taskboard 읽기, 필터와 낙관적 이동"]
---

# Taskboard 읽기, 필터와 낙관적 이동

## feature와 서버 정본

Taskboard는 task의 queries, Server Functions, components를 `features/task/`, 공통 UI를 `components/ui/`, 조합하는 page를 `app/`에 둔다. 출발점은 캐시와 Suspense가 없는 Server Component 조회, Client Component의 Server Function 변경, 변경 후 refresh()다. 서버 props는 다음 render가 와야 바뀌므로 함수 호출 자체는 즉시 피드백이 아니다.

cyclePriority(taskId)는 task를 조회하고 없으면 null을 반환한다. 존재하면 PRIORITY_CYCLE의 low → medium → high 순서로 DB를 갱신하고 refresh() 뒤 새 priority를 반환한다. 실제 앱의 Server Function은 인증, 소유권과 입력 검증도 수행해야 한다.

읽기 streaming은 shell의 FCP/LCP를 앞당기고, 낙관적 UI와 transition은 클릭 프레임을 가볍게 하며 prefetch는 목적지 표시를 앞당긴다. 이 패턴만으로 INP가 해결되지는 않는다. client JS 양과 상호작용의 blocking roundtrip도 줄인다.

## task와 comments 읽기의 경계

Page 상단에서 params와 getTask를 await하면 아무것도 표시되지 않고 comments 조회도 그 뒤에 시작한다. sync Page에서 params.then을 outer Suspense 안에 두고 TaskDetail은 자신의 getTask를, CommentSection은 자신의 getComments를 await한다.

```tsx
export default function TaskPage({ params }: {
  params: Promise<{ id: string }>
}) {
  return <div>
    <Suspense fallback={<TaskDetailSkeleton />}>
      {params.then(({ id }) => <>
        <TaskDetail id={id} />
        <Suspense fallback={<CommentSectionSkeleton />}>
          <CommentSection taskId={id} />
        </Suspense>
      </>)}
    </Suspense>
  </div>
}
```

shell은 즉시 표시된다. outer는 params와 task detail을 기다리고, task header가 준비되면 nested comments skeleton이 드러난다. comments 준비 후 해당 영역만 교체한다. 각 section 함수는 서버 조회 결과를 TaskHeader/CommentCard에 넘긴다. 독립 형제와 중첩 경계의 공개 순서는 [[NextJS-Streaming]]에서 구분한다.

## priority toggle의 즉시 반응

button이 server priority prop을 바로 쓰고 cyclePriority만 호출하면 이전 값이 응답까지 남는다. useOptimistic(priority)로 임시 표시를 만들고 useTransition에서 setter와 Server Function을 함께 실행한다.

```tsx
const [optimisticPriority, setOptimisticPriority] = useOptimistic(priority)
const [, startTransition] = useTransition()
function handlePriority() {
  startTransition(async () => {
    setOptimisticPriority(PRIORITY_CYCLE[optimisticPriority])
    await cyclePriority(id)
  })
}
// button의 class와 label도 optimisticPriority를 사용한다.
```

현재 optimistic 값으로 다음 cycle을 계산해 이전 server prop만 읽는 stale closure를 피한다. transition이 끝나면 새 server prop이 기준이 된다. 빠른 연속 입력도 서버의 변경 순서, 응답과 최종 정본이 맞는지 확인한다. 이 예는 분산 서버의 경쟁 상태까지 자동 해결한다는 계약이 아니다. transition 내부의 예상하지 못한 throw는 nearest error boundary로 전달된다.

## URL filter와 재사용 action prop

LabelFilter는 Design/Frontend/Backend 선택을 query의 label로 표현한다. useSearchParams에서 현재 값을 읽고 새 URLSearchParams에 선택값을 set하거나 null이면 delete한 뒤 router.push한다. 다른 query는 보존한다. 직접 push만 하면 목적지 props가 도착하기 전까지 기존 chip이 표시되고 pending을 알 수 없다.

LabelFilter는 URL 갱신 callback `changeAction(value: string | null)`을 ChipGroup에 넘기고 pending 상태를 소유하지 않는다. ChipGroup은 useOptimistic(value)와 useOptimistic(false)로 선택과 pending을 표시한다.

```tsx
function handleClick(newValue: string | null) {
  startTransition(async () => {
    setOptimisticValue(newValue)
    setIsPending(true)
    await changeAction(newValue)
  })
}
// 선택된 chip을 다시 클릭하면 null, 나머지는 item.value를 전달한다.
// root: data-pending={isPending ? '' : undefined}
```

action 또는 Action suffix는 consumer callback을 내부 transition에서 실행한다는 관례다. 값 반환과 void/Promise 모두 다룰 수 있게 await한다. root의 data-pending을 ancestor가 `group-has-data-pending:opacity-50`으로 읽으면 기존 board를 유지한 채 어둡게 표시한다. selected class도 optimisticValue에서 결정한다.

Tailwind의 group-has-data-pending/has-data-pending은 CSS :has로 변환된다. 이 filter는 시작/완료 두 번만 바뀌어 비용이 작다. drag/scroll처럼 자주 바뀌고 anchor subtree가 넓으면 반복 재계산 비용이 커져 client state를 고려한다.

## drag/drop의 reducer와 새로운 base

Board는 서버 tasksPromise를 React use로 읽고 Todo/In Progress/Done별로 분류한다. 직접 updateStatus를 호출하면 card가 기존 column에 남았다가 응답 뒤 이동한다. useOptimistic(tasks, reducer)의 reducer는 taskId에 맞는 한 항목만 새 status로 복사하고 나머지를 유지한다.

```tsx
// Board 내부: useTransition은 React에서 import한다.
const [, startMoveTransition] = useTransition()
const [optimisticTasks, moveTask] = useOptimistic(tasks,
  (current, action: { taskId: string; status: Status }) =>
    current.map(t => t.id === action.taskId ? {...t, status: action.status} : t))
function handleDrop(targetStatus: Status, taskId: string) {
  startMoveTransition(async () => {
    moveTask({taskId, status: targetStatus})
    const result = await updateStatus(taskId, targetStatus)
    if (!result.success) toast.error(result.error)
  })
}
```

각 Column은 optimisticTasks.filter로 자기 status의 tasks와 onDrop을 받는다. background polling/다른 사용자 변경이 base를 갱신하면 reducer가 새 base 위에서 다시 실행된다. 사라진 task 같은 예상 오류는 result로 반환해 toast를 표시하며 optimistic 변경이 완료 시 이전 정본으로 돌아간다. 위처럼 컴포넌트의 useTransition이 반환한 start 함수를 사용하면 예상하지 못한 throw를 error boundary로 처리할 수 있다.

이동 자체가 현재 프레임의 피드백이므로 이 hook의 isPending은 filter의 board fade에 연결하지 않고 data-pending도 붙이지 않는다. Next.js 가이드의 standalone startTransition 예제는 오류가 가까운 boundary로 간다고 설명하지만, React의 standalone 함수는 컴포넌트에 연결되지 않아 실패를 reportError로 전역 보고한다. standalone을 유지한다면 명시적 실패 처리를 별도로 작성해야 한다.

## 출처

- [Next.js, interactive-apps](https://nextjs.org/docs/app/guides/interactive-apps)
- [React, startTransition](https://react.dev/reference/react/startTransition)
- [React, useTransition](https://react.dev/reference/react/useTransition)

## 관련 문서

- [[NextJS-Interactive-Mutations]]
- [[NextJS-App-Actions]]
- [[NextJS-App-Errors]]
