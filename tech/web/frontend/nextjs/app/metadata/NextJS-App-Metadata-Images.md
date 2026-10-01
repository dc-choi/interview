---
tags: [nextjs, app-router, metadata]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["아이콘, OG image와 ImageResponse"]
---

# 아이콘, OG image와 ImageResponse

## file convention

| 파일 | 위치와 format |
| --- | --- |
| favicon.ico | app root만, ico만. favicon handler 코드 생성은 지원하지 않음 |
| icon | app 아래 segment, ico/jpg/jpeg/png/svg |
| apple-icon | app 아래 segment, jpg/jpeg/png |
| opengraph-image | app 아래 segment, jpg/jpeg/png/gif |
| twitter-image | app 아래 segment, jpg/jpeg/png/gif |

icon1/icon2 같은 numbered suffix는 lexical 순서로 적용할 수 있다. 위치에 따라 해당 route subtree에 metadata가 생기고 더 가까운 segment의 image가 상위 값을 대체한다. SVG나 size를 알 수 없는 icon은 sizes=any로 출력할 수 있다. OG는8MB, Twitter image는5MB limit을 넘으면 build가 실패한다.

정적 파일의 alt는 opengraph-image.alt.txt/twitter-image.alt.txt로 설정한다. generated handler는 alt, size, contentType을 export한다. browser favicon과 apple touch icon, OG와 Twitter card 이미지는 용도가 다르므로 하나의 규격을 무조건 공유하지 않는다.

## 코드 image handler

icon.tsx/apple-icon.tsx의 default export는 Blob, ArrayBuffer, TypedArray, DataView, ReadableStream 또는 Response를 반환할 수 있다. opengraph-image.tsx/twitter-image.tsx의 반환 계약은 Response다. 보통 ImageResponse를 쓴다. params는 Promise이며 dynamic image는 요청 값을 unwrap한다. generateImageMetadata를 사용하면 default handler의 id도 Promise다.

```tsx
import { ImageResponse } from 'next/og'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export default async function Image({ params }: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await loadPost(slug)
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%',
      background: 'white', fontSize: 64 }}>{post.title}</div>,
    size,
  )
}
```

static data면 image를 prerender할 수 있고 uncached runtime API/데이터를 쓰면 request-time이다. 생성 handler가 static file보다 무조건 더 최신이라는 의미는 아니다. cache와 content update 시점도 확인한다.

## generateImageMetadata

이 함수는 한 file에서 여러 image variant metadata를 반환한다. argument의 params는 일반 page/handler와 달리 source 계약에 동기 object로 표기된다. 반환 array의 각 item에는 id와 선택 alt/size/contentType이 있다. default image handler에는 해당 id와 params가 Promise로 전달된다.16 이전의 동기 id 예제를 현재 API에 그대로 쓰지 않는다.

```ts
export function generateImageMetadata() {
  return [{ id: 'wide', size: { width: 1200, height: 630 }, contentType: 'image/png' }]
}
// default handler에서 const id = await props.id
```

공식 표는 id를 string으로, 일부 예시는 number로 보여 주며 default handler type은 string|number를 포함한다. 이 차이를 숨겨 하나의 타입으로 단정하지 않고 새 예시는 string ID를 사용한다. variant ID와 metadata/image 생성 결과를 함께 테스트한다.

## ImageResponse의 option과 한계

ImageResponse는 JSX를 Satori와 Resvg를 통해 PNG로 만드는 API다. 기본1200x630, emoji 기본 twemoji이며 fonts(name/data ArrayBuffer/weight/style), debug, width/height, status(기본200), statusText, headers를 설정할 수 있다. browser 전체 CSS renderer가 아니다. flexbox와 지원 CSS subset을 쓰며 grid와 모든 browser layout 기능을 기대하지 않는다.

bundle limit은500KB이며 JSX/CSS/font/image 같은 자산을 포함한다. 큰 font 전체를 bundle에 넣기보다 필요한 font를 runtime 조회하거나 subset한다. ttf/otf/woff가 지원되며 woff2를 같은 방식으로 가정하지 않는다. 외부 image/font 실패와 timeout도 image endpoint 실패로 이어질 수 있다.

고정 local assets는 module scope async read로 재사용할 수 있다. image engine의 img ArrayBuffer 지원과 일반 HTML img src type은 달라 TS suppress가 필요할 수 있지만 실제 engine 지원에 근거해 좁게 적용한다. base64 data URL은 일반 string 경로다. 원격 user input URL을 무제한 조회하지 않는다.

## 생성되는 태그와 icon 입력 계약

favicon.ico는 `<link rel="icon" href="/favicon.ico" sizes="any">`를 출력한다. icon은 rel=icon, apple-icon은 rel=apple-touch-icon에 generated URL/type/sizes를 붙인다. 32x32 PNG는 image/png와 sizes 32x32, SVG나 크기를 알 수 없는 파일은 any다. icon1/icon2 등은 숫자순이 아닌 사전순이다. 코드 icon/apple-icon의 js/ts/tsx default 함수는 size 32x32/contentType image/png를 export한다. ImageResponse에 ...size를 넘겨 검은 배경, 흰 A, fontSize 24와 flex 중앙 배치를 그릴 수 있다. favicon은 코드 생성이 불가능하다.

image handler의 params는 root부터 colocated segment까지만 포함한다. `/shop`은 undefined, `/shop/1`은 Promise<{slug:'1'}>, `/shop/1/2`는 Promise<{tag:'1',item:'2'}>다. icon 옵션은 size:{width:number,height:number}, contentType:string이며 OG/Twitter는 alt:string도 지원한다. 각 special handler는 page/layout과 같은 segment config를 지원하지만 Cache Components에서 제거된 옵션은 적용하지 않는다. 13.3에 image convention/generateImageMetadata가 도입되었으며 16.0에 handler params와 variant id가 Promise로 바뀌었다.

OG 파일은 property=og:image 및 :type/:width/:height를, Twitter는 name=twitter:image와 같은 suffix를 출력한다. alt.txt 문자열은 해당 image:alt 태그로 이어진다. root OG보다 blog 폴더의 OG가 해당 route에서 우선한다. generated OG의 size 1200x630/contentType image/png/alt를 태그와 맞추고 ImageResponse에도 size를 넘긴다. slug Post 예는 params를 await한 뒤 fetch한 post.title을 fontSize 48, 흰색, flex 중앙 배치로 그린다. 입문 예는 getPost(slug)와 fontSize 128로 title을 중앙에 배치한다.

## 이미지 variant와 local asset 예

generateImageMetadata의 동기 params는 /shop에서 undefined, slug object, tag/item object다. array item의 id는 필수이며 alt/contentType/size는 선택이다. small 48x48/medium 72x72 PNG variant를 반환하고 handler는 await id로 Icon 식별자를 그린다. 상품 variant 예는 getOGImages(params.id)를 map해 index id, 1200x600 size, alt=image.text를 만든다. default 함수는 `(await params).id`와 await variant id로 getCaptionForImage(productId,imageId)를 조회한다. 원문 표의 string id와 예제의 number id 차이는 계약 충돌로 기록한다.

Node local logo는 source file 대신 process.cwd() 기준 `join(process.cwd(),'logo.png')`를 module에서 readFile한다. base64는 data:image/png;base64 문자열로 img.src에 넘기고 height 100을 설정한다. buffer 대안은 Uint8Array.from(logoData).buffer를 넘기며 Satori 지원에 한해 @ts-expect-error를 좁게 둔다. 고정 Inter-SemiBold.ttf도 module readFile 후 fonts:[{name:'Inter',data,style:'normal',weight:400}]에 넣는다. 실제 font weight와 asset이 일치하는지는 따로 확인한다.

## ImageResponse 옵션 표

| 옵션 | 타입과 기본값 |
| --- | --- |
| element | ReactElement 첫인자 |
| width/height | number,1200/630 |
| emoji | twemoji/blobmoji/noto/openmoji,twemoji |
| fonts | {name:string,data:ArrayBuffer,weight:number,style:normal/italic}[] |
| debug | boolean,false |
| status | number,200 |
| statusText | string |
| headers | Record<string,string> |

Route Handler의 JS 전용 예는 GET의 try에서 흰 배경/flex column/padding 40, 제목 60px/부제 30px 이미지를 만든다. 실패하면 message를 로그로 남기고 status 500 Response를 반환한다. file-based 예는 alt/size/contentType과 1200x630 기본 문구를 그린다. CSS는 flex/absolute/text wrap/custom font/nested img subset이며 grid는 불가능하다. ttf/otf가 woff보다 font parsing에 유리하다. OG Playground에서 지원 layout을 확인할 수 있다. 13.0에 @vercel/og 도입, 13.3에 next/server import, 14.0에 next/og로 이동했다.

## 이해 확인

1. ImageResponse에서 일반 browser CSS grid가 그대로 동작하는가?
2. generateImageMetadata params와 default image handler params는 같은 동기 계약인가?
3. runtime image가 실패해도 metadata의 image URL만 있으면 preview가 보장되는가?

## 출처

- [Next.js, app-icons](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons)
- [Next.js, opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- [Next.js, generate-image-metadata](https://nextjs.org/docs/app/api-reference/functions/generate-image-metadata)
- [Next.js, image-response](https://nextjs.org/docs/app/api-reference/functions/image-response)

## 관련 문서

- [[NextJS-App-Metadata-Contract]]
- [[NextJS-App-Fetching]]
- [[NextJS-App-Static-Params]]
