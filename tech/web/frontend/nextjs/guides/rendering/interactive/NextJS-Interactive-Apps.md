---
tags: [nextjs, app-router, interaction]
status: index
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Taskboard의 서버 작업과 즉시 피드백"]
---

# Taskboard의 서버 작업과 즉시 피드백

- [[NextJS-Interactive-Feedback]]: Suspense 읽기, 우선순위 toggle, 재사용 필터와 drag/drop
- [[NextJS-Interactive-Mutations]]: 댓글, 생성 dialog, 삭제, cache invalidation과 per-link prefetch

서버 작업은 시간이 일정하지 않고 성공하거나 실패할 수 있다. Taskboard는 서버를 정본으로 유지하면서 현재 클릭에는 낙관적 UI와 pending 표시를 제공한다. 상태가 바뀌지 않는 화면을 보고 사용자가 같은 작업을 반복하는 문제를 줄인다.

- [공식 Taskboard demo](https://async-react-demo.labs.vercel.dev)
- [공식 demo source](https://github.com/vercel-labs/async-react-demo)
- [Next.js, interactive-apps](https://nextjs.org/docs/app/guides/interactive-apps)
