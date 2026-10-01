---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages CSS 변환과 Babel preset의 설정 계약"]
---

# Pages CSS 변환과 Babel preset의 설정 계약

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## custom PostCSS는 default pipeline을 대체한다

custom config를 만들면 필요한 plugin을 직접 설치하고 선언해야 한다. `.module.css`는 별도 설정 없이 CSS Module로 처리한다.

```bash
npm install postcss-flexbugs-fixes postcss-preset-env
```

```js
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-flexbugs-fixes': {},
    'postcss-preset-env': {
      autoprefixer: { flexbox: 'no-2009' },
      stage: 3,
      features: { 'custom-properties': false },
    },
  },
}
```

plugin 이름 문자열 또는 위 interoperable object를 사용한다. `require(plugin)`으로 함수 자체를 전달하지 않는다. 배열 형식은 `['postcss-flexbugs-fixes', ['postcss-preset-env', options]]`다. config 이름은 postcss.config.json/js, .postcssrc.json/js 또는 package.json의 postcss key도 가능하다. environment에 따라 production에만 plugin 배열을 두고 development는 `[]`로 둘 수 있지만 dev/prod 변환 차이를 검증한다.

PostCSS의 기존 default 설명은 vendor prefix와 flexbug 수정, all/break/font-variant/gap/media query range 변환을 포함한다. 해당 설명의 IE11 변환은 Next16 전체 브라우저 지원이 아니다. 기본 grid와 CSS custom property는 해당 legacy 변환 대상으로 켜지지 않는다.

```css
/* autoprefixer grid: autoplace */
```

legacy grid 변환이 실제로 필요하면 파일 주석 또는 autoprefixer 옵션 `grid:'autoplace'`를 선택한다. CSS 변수는 runtime 값/상속으로 인해 안전한 정적 치환이 불가능할 수 있다. compile-time 변수는 Sass를 비교한다.

```json
{ "browserslist": [">0.3%", "not dead", "not op_mini all"] }
```

Browserslist는 Autoprefixer와 compiled CSS의 target이다. browsersl.ist로 선택 결과를 볼 수 있다. JavaScript/runtime의 지원 범위를 같은 설정으로 모두 확보한다고 단정하지 않는다.

## Babel preset과 option 확장

`.babelrc` 또는 babel.config.js가 있으면 해당 config가 source of truth이므로 next/babel을 유지한다. server compilation은 사용하는 Node 버전을 따른다.

```json
{
  "presets": [["next/babel", {
    "preset-env": { "modules": false },
    "transform-runtime": {},
    "styled-jsx": {},
    "class-properties": {}
  }]],
  "plugins": ["@babel/plugin-proposal-do-expressions"]
}
```

plugin 예시는 해당 plugin을 실제 설치하고 변환 필요가 있을 때만 추가한다. custom option이 없으면 `presets:['next/babel'], plugins:[]`로 시작할 수 있다. preset-env modules를 바꾸면 Webpack code splitting을 끌 수 있다. 현재 SWC/Turbopack에서 커스텀 Babel 변환이 필요한지와 지원 경로를 함께 확인한다.

## Pages의 scoped CSS 예제

```tsx
export default function Panel() {
  return <div><p>component CSS</p>
    <style jsx>{`
      p { color: blue; }
      div { background: red; }
      @media (max-width: 600px) { div { background: blue; } }
    `}</style>
    <style jsx global>{`body { background: black; }`}</style>
  </div>
}
```

scoped와 global 적용 범위를 구분한다. 다른 CSS-in-JS library는 library별 SSR/Document 연결을 따른다. App의 streaming registry 예제와 같은 setup으로 자동 취급하지 않는다.

## 출처

- [Next.js, post-css](https://nextjs.org/docs/pages/guides/post-css)
- [Next.js, babel](https://nextjs.org/docs/pages/guides/babel)
- [Next.js, css-in-js](https://nextjs.org/docs/pages/guides/css-in-js)

## 관련 문서

- [[NextJS-Pages-Fonts-CSS-MDX]]
- [[NextJS-CSS-in-JS]]
