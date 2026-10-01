---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js RSC 모듈 경계와 직렬화"]
---

# Next.js RSC 모듈 경계와 직렬화

## 코드가 실행되는 곳과 HTML 생성 시점

Server Component는 서버에서 실행되어 Client Component 참조와 직렬화한 props를 담은 RSC Payload를 만든다. Client graph가 Server graph 코드를 import하는 것은 아니다. 같은 모듈을 두 환경에서 사용하면 각 graph로 별도 컴파일한다. RSC 이전의 React도 서버에서 HTML을 만들고 같은 컴포넌트 코드를 브라우저에 보내 hydrate할 수 있었다.

| 구성 요소 | 서버 실행 | 브라우저 실행 |
|---|---|---|
| Server Component | 가능 | 코드가 전달되지 않음 |
| Client Component | 초기 HTML 생성에 참여 | hydration과 상태 업데이트 |

`'use client'` 파일에서 render 중 `console.log('render')`를 호출하면 직접 방문 시 서버와 hydration 시 브라우저에서 로그를 볼 수 있다. 클라이언트 탐색에서는 RSC Payload를 받고 브라우저가 렌더링하며 새로운 SSR HTML을 받는 흐름과 다르다. SSG는 빌드, ISR은 빌드 이후 재생성, SSR은 요청 시 HTML 생성 시점이다. 이 구분과 RSC의 코드 배치 경계는 별개다.

HTML만 읽는 crawler에도 초기 서버 렌더에 도달한 Server/Client Component 내용은 보인다. 이벤트 뒤에만 나타나는 내용을 SEO에 필요한 초기 HTML로 간주하지 않는다.

## 데이터를 트리에 넣는 방법

Pages Router는 getStaticProps/getServerSideProps가 읽은 값을 props로 트리에 전달하는 패턴을 쓴다. RSC에서는 async Server Component가 DB, 파일 시스템, 내부 서비스나 DAL을 직접 읽고 렌더할 수 있다. 이를 위해 공개 API Route를 먼저 만들 필요는 없다.

```tsx
// app/page.tsx: getPosts는 서버 DAL, PostList의 props는 공개 가능한 DTO다.
import { getPosts } from '@/lib/data'
import { PostList } from './post-list'
export default async function Page() {
  const posts = await getPosts()
  return <PostList posts={posts} />
}
```

Client Component로 전달하는 props는 브라우저에 직렬화된다. 서버에서 읽었다는 이유로 비밀 값까지 넘겨도 되는 것은 아니다. 서버에서 요청을 시작한 뒤 await하지 않은 Promise를 prop으로 넘기고 클라이언트 `use()`가 읽게 할 수도 있다. 미완료 동안 가장 가까운 Suspense fallback이 표시되며 mount 후 재요청하는 waterfall을 줄인다. 브라우저 전용 상태나 클릭 뒤에만 결정되는 요청은 여전히 클라이언트에서 시작할 수 있다.

서버 render 중 적합한 동일 fetch는 memoization되고 `use cache`는 별도의 수명과 무효화 규칙을 가진다. 한 번의 render 중 중복 제거와 여러 요청 사이 재사용을 구분한다.

## 상태와 브라우저 동작

Server Component는 탐색, refresh나 revalidation 뒤 서버에서 다시 실행될 수 있다. 초기 로드에는 HTML과 함께 RSC Payload도 전달된다. 새 payload를 받은 React가 트리를 조정하도록 하며, Server Component가 소유한 DOM을 임의로 바꾸면 React 상태와 어긋날 수 있다.

useState, useEffect와 이벤트 handler는 브라우저 실행이 필요하다. 반면 details 열기, video controls와 Server Function action을 쓰는 form 제출은 native 동작만으로 구성할 수 있다. 제어 input, 실시간 filter나 drag처럼 변하는 브라우저 상태를 관리할 때 Client Component를 둔다.

## import와 props의 경계

`use client`는 client subtree의 진입 파일에 둔다. 그 파일에서 import한 모듈도 client graph에 포함되므로 모든 하위 파일에 지시어를 반복할 필요는 없다. shared hook 컴포넌트를 수정하기 어렵다면 client wrapper에서 import한다. 경계 없이 client API가 server graph로 들어오면 컴파일러가 필요한 경계를 지적한다.

props는 React가 직렬화할 수 있어야 한다. 일반 onClick 함수를 서버에서 클라이언트로 넘길 수 없지만 `use server` Server Function은 참조로 전달할 수 있다. TypeScript plugin은 이름이 `action` 또는 `Action`으로 끝나는 함수 prop을 허용하는 휴리스틱을 쓴다. 이름을 바꾸는 것이 일반 함수를 Server Function으로 변환하거나 런타임 검증을 대신하지는 않는다.

```tsx
// Server Page가 두 JSX의 owner다. Modal은 client, Cart는 server다.
import { Cart } from './cart'
import { Modal } from './modal'
export default function Page() {
  return <Modal title={<h2>Cart</h2>}><Cart /></Modal>
}
```

```tsx
// app/modal.tsx: 조합만 보이는 예제다. 실제 dialog의 focus 관리 등은 별도 구현한다.
'use client'
import { useState, type ReactNode } from 'react'
export function Modal({ title, children }: {
  readonly title: ReactNode; readonly children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return <section aria-label="Cart">
    {title}<button onClick={() => setOpen(false)}>Close</button>{children}
  </section>
}
```

Page는 Modal과 Cart JSX를 작성한 owner이고 Modal은 렌더 트리에서 Cart를 포함하는 parent다. Modal은 title/children으로 전달된 React element 출력만 배치하고 Cart 코드 자체를 import하지 않는다. 화면에서 안에 보인다는 이유만으로 server 코드가 client bundle에 들어가지는 않는다.

같은 graph 안의 compound component `Menu.Item`은 사용할 수 있다. 서버가 Client Menu를 import하면 함수 객체 대신 client reference를 받기 때문에 static member를 읽는 방식은 실패할 수 있다. 서버에서 사용할 조각은 named export로 제공하거나 compound 사용 자체를 다른 Client Component 안에 둔다.

## 출처

- [Next.js, server-and-client-boundary](https://nextjs.org/docs/app/guides/server-and-client-boundary)

## 관련 문서

- [[NextJS-Rendering-Strategy]]
- [[NextJS-Data-Security]]
- [[NextJS-Streaming]]
