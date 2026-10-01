---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["JSON-LD의 직렬화와 검색 구조", "NextJS Structured Data"]
---

# JSON-LD의 직렬화와 검색 구조

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## 기계가 읽는 페이지 의미

JSON-LD는 Product, Event, Organization 같은 entity의 속성과 관계를 schema.org vocabulary로 표현한다. 검색/AI 소비자가 페이지 내용을 이해하는 단서이며 표시되는 HTML의 사실과 일치해야 한다. schema를 넣었다고 rich result 노출이 보장되지는 않는다.

page/layout에서 native `script type="application/ld+json"`으로 데이터 블록을 렌더한다. next/script는 실행 JavaScript 로딩을 관리하므로 JSON-LD에 필요한 기본 도구가 아니다. 동적 page는 params Promise를 await하고 조회한 entity로 구성한다.

## JSON과 HTML script context

JSON.stringify는 JSON 구조를 직렬화하지만 HTML script context를 sanitize하지 않는다. 외부 설명에 `</script>`가 있으면 script 요소를 끝내는 HTML로 해석될 수 있다. 최소한 <를 Unicode escape 문자열로 바꾼다.

~~~tsx
export default async function ProductPage({ params }: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProduct(id)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description,
  }
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{
      __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
    }} />
    <h1>{product.name}</h1>
  </>
}
~~~

치환의 결과는 literal backslash-u003c가 되어야 한다. JavaScript 문자열에서 이미 <로 해석되는 값을 넣으면 방어가 사라진다. 조직의 sanitizer 또는 serialize-javascript 같은 검증된 직렬화 경로를 선택하고 escaping이 실제 output에 남는지 확인한다.

React 일반 text escaping과 dangerouslySetInnerHTML의 책임은 다르다. 태그 type이 JSON이어도 HTML parser의 종료 처리가 사라지지 않는다. URL/type/필수 속성의 검증은 escaping과 별도다.

## 타입과 검증 도구

schema-dts의 `WithContext<Product>`를 쓰면 작성 중 schema 구조를 타입 검사할 수 있다. TypeScript 타입은 외부 CMS 데이터를 runtime 검증하지 않고 XSS sanitizer도 아니다.

Google Rich Results Test는 검색 지원 구조를, Schema Markup Validator는 schema 구조를 점검하는 데 사용한다. 유효한 schema와 Google의 해당 rich result 지원/노출 조건은 별도다. 제품 재고/가격/후기는 실제 사용자에게 보이는 데이터와 일치하도록 운영한다.

여러 페이지 공통 Organization은 layout, 개별 Product/Article/Event는 해당 page의 entity에 배치한다. 같은 entity의 중복/상충 data block은 검토하고 안정적인 @id 관계를 제품 모델에 맞게 설계한다.

## schema-dts의 Product 작성 예제

```tsx
import type { Product, WithContext } from 'schema-dts'
const jsonLd: WithContext<Product> = {
  '@context': 'https://schema.org', '@type': 'Product',
  name: 'Next.js Sticker', image: 'https://nextjs.org/imgs/sticker.png',
  description: 'Dynamic at the speed of static.',
}
```

`schema-dts`는 별도 community package다. Rich Results Test(https://search.google.com/test/rich-results)와 Schema Markup Validator(https://validator.schema.org/)에 실제 렌더 HTML/URL을 넣어 검증한다. 예제 페이지의 getProduct는 프로젝트 CMS 조회 함수이며, 실패 응답/없는 상품 처리를 포함해 구현한다.

## 학습 확인

- JSON.stringify만으로 </script> 입력이 안전하지 않은 이유를 HTML parser와 연결한다.
- 타입 검사, runtime data 검증, HTML escaping을 세 단계로 나눈다.
- schema 유효성 통과와 rich result 노출을 구분한다.

## 출처

- [Next.js, json-ld](https://nextjs.org/docs/app/guides/json-ld)

## 관련 문서

- [[NextJS-Scripts-and-Third-Party]]
- [[NextJS-Data-Security]]
