---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Draft Mode와 기존 Preview Mode", "NextJS Pages Preview Draft"]
---

# Draft Mode와 기존 Preview Mode

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 특정 브라우저만 정적 생성을 우회한다

Draft Mode는 CMS 초안을 즉시 확인하려고 cookie가 있는 요청에서 `getStaticProps`를 request-time에 실행하는 기능이다. 기존 Preview Mode는 호환성을 위해 지원되는 legacy API이며 새 구현에는 Draft Mode를 사용한다.

```tsx
export default async function handler(req, res) {
  const { secret, slug } = req.query
  if (!process.env.DRAFT_SECRET || secret !== process.env.DRAFT_SECRET || typeof slug !== 'string') {
    return res.status(401).json({ error: '인증 실패' })
  }
  const post = await findDraftPost(slug)
  if (!post) return res.status(401).json({ error: '경로 확인 실패' })
  res.setDraftMode({ enable: true })
  return res.redirect(post.slug)
}
```

`findDraftPost`는 CMS 조회 helper 자리다. 외부 query의 slug로 바로 redirect하지 않는다. 확인한 CMS 레코드의 경로로 이동해 open redirect를 방지한다. secret/slug와 CMS 권한을 확인한 뒤 활성화한다.

`res.setDraftMode({ enable: true })`는 `__prerender_bypass` cookie를 설정한다. cookie가 있는 페이지 요청에서는 `context.draftMode === true`이고 초안 API를 선택할 수 있다.

```tsx
export async function getStaticProps({ draftMode = false, params }) {
  const post = await loadPost({ slug: params.slug, draft: draftMode })
  return { props: { post } }
}
```

초안도 props가 브라우저로 전달된다. 초안 접근을 허용한 사용자의 브라우저에 공개 가능한 정보만 포함한다.

## 종료와 cache의 함정

종료 API에서 `res.setDraftMode({ enable: false })`를 호출하고 응답을 끝낸다. 기본 세션은 브라우저 종료까지다. 종료 링크는 `prefetch={false}`로 자동 요청을 막는다. Pages Link의 hover prefetch까지 완전히 막아야 하는 상태 변경 endpoint라면 native form/button 요청처럼 명시적 동작으로 처리한다.

`getServerSideProps`의 context와 API Route의 `req.draftMode`에서도 상태를 읽는다. Draft/Preview와 `Cache-Control`을 함께 쓰면 HTTP cache가 bypass되지 않을 수 있으므로 직접 cache header를 설정하지 않는다.

빌드마다 bypass cookie 값이 달라진다. 로컬 HTTP 테스트는 브라우저의 third-party cookie와 local storage 허용 여부도 확인한다.

## legacy Preview Mode 계약

| API와 값 | 의미 |
| --- | --- |
| `res.setPreviewData(data, options?)` | preview cookie 설정 |
| `context.preview`, `req.preview` | 활성 여부 |
| `context.previewData`, `req.previewData` | 저장한 preview data |
| `router.isPreview` | 렌더링 중 preview 상태 |
| `res.clearPreviewData({ path? })` | preview cookie 제거 |

Preview는 `__prerender_bypass`와 `__next_preview_data` 두 cookie를 사용한다. data는 cookie 저장 한도 2KB 이내다. `maxAge`는 초 단위 유지 시간, `path` 기본값은 `/`다. 설정할 때 path를 좁혔다면 제거할 때도 같은 path를 사용한다. 종료 링크 prefetch 문제는 Draft와 같다.

빌드마다 cookie bypass 값과 previewData 암호화 private key가 바뀐다. Preview에서도 `getStaticProps`는 요청 시 실행하며, `getStaticPaths`와 함께 쓰면 params를 받는다. `getServerSideProps`도 preview/context data를 지원한다.

## CMS URL과 legacy Preview 실행 예제

CMS preview URL은 `https://example.com/api/preview?secret=<token>&slug=/posts/{entry.fields.slug}`처럼 설정한다. custom URL을 지원하지 않는 CMS는 같은 주소를 수동으로 만든다. Draft는 `/api/draft` endpoint로 동일하게 연결한다.

```tsx
// 인증과 CMS slug 확인을 마친 API Route
res.setPreviewData({ source: 'cms' }, { maxAge: 60 * 60, path: '/posts' })
return res.redirect(post.slug)
```

```tsx
export const getStaticProps = async ({ preview, previewData, params }) => {
  const base = preview ? 'https://draft.example.com' : 'https://api.example.com'
  const response = await fetch(`${base}/posts/${params.slug}`)
  if (!response.ok) throw new Error('게시물 조회 실패')
  return { props: { post: await response.json() } }
}
```

`previewData`는 setPreviewData에 넣은 객체이며 최소 session 정보 전달에 사용할 수 있다. secret 자체나 대형 본문을 넣지 않는다. 인증은 Draft 시작 예제와 같은 순서로 수행하고 `setPreviewData` 호출만 바꾼다.

```tsx
// pages/api/end-preview.ts
export default function handler(req, res) {
  res.clearPreviewData({ path: '/posts' })
  res.end('Preview 종료')
}
```

cookie만 제거하는 함수는 응답을 자동 종료하는 예제로 생각하지 않는다. 직접 end/redirect/json까지 마친다. HTTP local Preview도 third-party cookie와 local storage 허용을 확인한다.

## 학습 확인

- 정상 브라우저와 초안 cookie 브라우저에서 다른 내용이 보이는지 확인한다.
- 악의적인 외부 URL slug가 redirect 대상이 되지 않는지 확인한다.
- 빌드 교체와 cookie path가 기존 preview 세션에 미치는 영향을 설명한다.

## 출처

- [Next.js, draft-mode](https://nextjs.org/docs/pages/guides/draft-mode)
- [Next.js, preview-mode](https://nextjs.org/docs/pages/guides/preview-mode)

## 관련 문서

- [[NextJS-Pages-Static-Props]]
- [[NextJS-Pages-API-Routes]]
- [[NextJS-Pages-Navigation]]
