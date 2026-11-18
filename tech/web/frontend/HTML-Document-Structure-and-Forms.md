---
tags: [web, frontend, html, semantic-html, form, accessibility]
status: done
verified_at: 2026-11-18
category: "웹&네트워크(Web&Network)"
aliases: ["HTML Basics", "HTML 기초", "HTML 문서 구조", "시맨틱 HTML", "Semantic HTML", "HTML 폼", "HTML Forms", "제약 검증", "Constraint Validation"]
---

# HTML 기초: 문서 구조, 의미 요소와 폼

HTML은 문서의 구조와 의미를 표시하는 마크업 언어다. 변수, 조건과 반복이 없고, 요소와 속성으로 각 내용이 무엇인지 브라우저에 알린다. 브라우저는 받은 HTML을 위에서 아래로 파싱해 DOM 트리를 만들고([[Browser-DOM-Manipulation-and-Safety|DOM 조작과 안전성]]), 화면 표현은 CSS가([[CSS-Selectors-Cascade-and-Inheritance|CSS 기초]]), 동작은 JavaScript가 맡는다([[Web-Service-Structure|웹 서비스의 구조]]). 아래는 2026-11-17 갱신된 WHATWG HTML Living Standard 기준이다.

## 문서의 골격

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <title>주문 조회</title>
  </head>
  <body>
    <h1>주문 조회</h1>
    <p>주문 번호를 입력하세요.</p>
  </body>
</html>
```

- `<!DOCTYPE html>`은 레거시 호환 때문에 필요한 머리말이다. 빠지면 브라우저가 일부 명세와 맞지 않는 다른 렌더링 모드를 쓸 수 있다.
- `lang`은 내용의 주 언어를 BCP 47 태그로 밝힌다. 브라우저와 보조 기술은 이 값을 글꼴과 발음, 사전, 날짜 선택기 같은 폼 컨트롤의 UI를 고르는 데 쓸 수 있다.
- 문자 인코딩 선언 `<meta charset="utf-8">`은 문서의 처음 1024바이트 안에 있어야 한다.
- `title`은 탭과 북마크에 보이는 문서 제목이다. 이메일 제목처럼 상위 프로토콜이 제목을 주는 경우가 아니면 필수다.
- `head`에는 문서에 관한 정보를, `body`에는 화면에 나타낼 내용을 둔다. 위 예와 아래 폼 예는 W3C Nu Html Checker에서 오류와 경고 없이 통과했다.

## 요소, 태그와 속성

요소는 보통 시작 태그, 내용, 끝 태그로 이뤄지고 속성은 시작 태그에 `이름="값"`으로 쓴다.

- `area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `source`, `track`, `wbr`은 내용을 가질 수 없는 void 요소라 끝 태그를 쓰지 않는다.
- `controls`, `muted`, `required`, `autofocus` 같은 불리언 속성은 있으면 참이다. `"true"`와 `"false"`는 허용된 값이 아니고 거짓은 속성을 빼서 나타낸다([[Browser-DOM-Manipulation-and-Safety#property와 attribute|property와 attribute]]).
- `method`처럼 정해진 키워드 중 하나를 받는 열거형 속성은 ASCII 대소문자를 구분하지 않는다. `method="get"`과 `method="GET"`은 같고, 요청에는 HTTP 메서드 `GET`으로 나간다.
- 기본 스타일(`white-space: normal`)에서는 연속된 공백이 하나로 합쳐지고, 영어와 한국어처럼 띄어 쓰는 언어에서는 소스의 줄바꿈도 공백 하나가 된다(줄바꿈을 공백으로 바꿀지 없앨지의 세부 규칙은 브라우저가 정한다). 문단을 나누려면 빈 줄 대신 `<p>`로 감싼다.
- `<`나 `&`를 글자로 보이려면 문자 참조 `&lt;`, `&amp;`를 쓴다. `©`는 이름 참조 `&copy;`, 10진 `&#169;`, 16진 `&#xA9;`로 쓸 수 있고, UTF-8 문서라면 문자를 그대로 써도 된다.

## 구조와 의미를 나타내는 요소

| 요소 | 의미 | 주의 |
|---|---|---|
| `h1`~`h6` | 제목과 그 계층 | 글자 크기를 바꾸려고 고르지 않는다(크기는 CSS `font-size`). 수준을 건너뛰지 않고 `h1`은 보통 페이지에 하나 둔다 |
| `p` | 문단 | |
| `ul`, `ol`, `li` | 순서 없는 목록, 순서 있는 목록과 그 항목 | `ol`은 번호를 브라우저가 매기므로 중간에 항목을 넣어도 번호를 고칠 필요가 없다 |
| `table`, `thead`, `tbody`, `tr`, `th`, `td` | 행과 열로 된 데이터 | 배치 수단으로 쓰면 비적합이다. 스크린 리더 사용자가 그런 페이지를 탐색하기 매우 어려워진다 |
| `header`, `nav`, `main`, `footer` | 페이지의 영역 | 아래 랜드마크 참조 |
| `div`, `span` | 의미 없는 묶음 | 맞는 의미 요소가 없을 때 쓴다 |

HTML-AAM 기준으로 `body` 범위의 `header`와 `footer`는 banner와 contentinfo, `nav`는 navigation, `main`은 main 랜드마크로 보조 기술에 노출된다. 스크린 리더는 랜드마크로 주요 영역 사이를 키보드로 이동하게 해 준다. `main`이나 `article`, `section` 같은 섹션 요소 안의 `header`와 `footer`는 그 섹션의 머리말과 꼬리말이며 페이지 랜드마크가 아니다. 숨기지 않은 `main`은 문서에 하나만 둔다. 이 요소들은 기본 렌더링에서 `div`와 같은 블록으로 그려지므로, 차이는 겉모양이 아니라 보조 기술과 프로그램이 읽는 구조에서 난다.

## 이미지, 영상과 링크

- `img`의 `alt`는 이미지를 대신하는 텍스트다. 모든 이미지를 alt 텍스트로 바꿔도 페이지의 뜻이 그대로이도록 쓰고 캡션이나 제목을 넣지 않는다. 옆 텍스트와 같은 뜻의 아이콘이나 정보를 더하지 않는 장식 이미지는 `alt=""`로 비우고, 사이트 전체의 장식 그림은 CSS로 넣는다.
- `video` 안의 여러 `source`는 위에서부터 보며 처음 재생할 수 있는 것을 쓴다. `type`을 적으면 지원하지 않는 형식을 내려받지 않고 건너뛴다. 재생 UI는 `controls`로 켠다.
- 자동 재생은 브라우저 정책이 막을 수 있다. MDN 기준으로 소리가 꺼졌거나(`muted` 또는 볼륨 0), 사용자가 사이트와 상호작용했거나, 허용 목록에 든 경우처럼 조건 하나를 만족해야 대체로 허용되고 정확한 조건은 브라우저마다 다르다. 스크립트의 `play()`가 `NotAllowedError`로 거부되면 재생 버튼을 보여 준다.
- `a`의 `href`는 이동할 주소이고 태그 사이 텍스트는 보여 줄 문구라 둘은 서로 다를 수 있다. 문구에는 은행 주소를 쓰고 `href`는 가짜 사이트로 두는 피싱 링크가 이 성질을 이용하므로, 링크 문구가 아니라 이동한 뒤 주소창의 도메인으로 판단한다([[Targeted-Social-Engineering|표적형 사회공학]]).

## 폼과 쿼리 문자열

```html
<form action="https://www.google.com/search" method="get">
  <label for="q">검색어</label>
  <input id="q" name="q" type="search" autocomplete="off">
  <button>검색</button>
</form>
```

- http(s) 주소로 GET 제출하면 브라우저는 `name`이 있는 컨트롤의 `이름=값` 쌍을 `application/x-www-form-urlencoded`로 직렬화해 `action` URL의 query를 그 결과로 바꾼다. 위 폼에 cats를 넣으면 `https://www.google.com/search?q=cats`로 이동한다. `name`이 없거나 빈 컨트롤은 빠지고, 공백이 `+`가 되는 인코딩은 [[URI-URL-URN#percent-encoding과 비ASCII 문자|percent-encoding]]에 있다.
- `method`를 생략하거나 모르는 값을 쓰면 GET이고, `action`이 비어 있으면 현재 문서의 URL로 제출한다. 요청이 갈 곳은 `action`이 정하므로 다른 서비스의 검색 주소로 보내는 화면도 서버 코드 없이 만들 수 있다.
- `type` 없는 `button`은 `command`, `commandfor` 속성이 없고 부모가 `select`가 아니면 제출 버튼으로 동작한다. 제출하지 않을 버튼에는 `type="button"`을 쓴다.
- `placeholder`는 값이 없을 때만 보이는 짧은 힌트라 `label`을 대신하지 않는다([[Browser-DOM-Manipulation-and-Safety#label과 form control 연결|label 연결]]).
- `autocomplete="off"`는 자동 완성을 끄라는 요청이다. MDN 기준 대부분의 최신 브라우저는 로그인 칸에서 이 값을 무시하고 비밀번호 관리자의 저장과 채우기를 허용할 수 있다.

## 제약 검증은 사용자 경험 기능이다

`required`, `type="email"`, `pattern`, `minlength`, `min` 같은 속성은 제출 전에 브라우저가 값을 검사하게 한다(constraint validation). 폼에 `novalidate`가 있거나 누른 제출 버튼에 `formnovalidate`가 있으면 제출 때 검사하지 않는다.

- `pattern`은 `^(?:`와 `)$`로 감싸 `v` 플래그로 컴파일하므로 값 전체와 맞아야 한다. 앵커 없는 JavaScript `test()`처럼 일부만 맞아 통과하는 일은 없다([[JavaScript-Numbers-Strings-and-Regular-Expressions|JavaScript 정규식]]). Node.js 24에서 같은 규칙으로 `[0-9]{3}`을 컴파일하면 `123`만 맞고 `1234`와 `12a`는 맞지 않았다. 빈 값은 `pattern`으로 검사하지 않으므로 필수 입력이면 `required`를 함께 둔다.
- `type="email"`이 받는 형식과 한계는 [[JavaScript-Numbers-Strings-and-Regular-Expressions|이메일 형식 검증]]에 있다.
- 받은 HTML은 사용자 기기의 사본이다. 개발자 도구에서 `required`나 `pattern`을 지우거나 `type`을 바꾸면 검사가 사라지고, curl처럼 폼을 거치지 않는 요청도 있다. HTML 표준도 서버가 클라이언트 검증에 기대면 안 되며 이 기능은 사용자 경험을 위한 것이지 보안 수단이 아니라고 적는다. 같은 규칙을 서버에서 다시 검사하고 SQL에는 [[SQL-Injection|파라미터 바인딩]]을 쓴다.

## 문법 검사

브라우저의 HTML 파서는 문법이 틀린 문서도 표준이 정한 오류 처리 규칙으로 끝까지 읽어 DOM을 만든다. 닫는 태그가 빠지거나 태그가 엇갈려도 화면은 대체로 그려지므로, 의도와 다른 트리가 만들어져도 눈치채기 어렵다. W3C Nu Html Checker(validator.w3.org/nu)는 이런 실수를 찾는 적합성 검사기다. 검사 결과를 개발자 도구 Elements 패널의 실제 DOM과 비교하면 파서가 어떻게 고쳐 읽었는지 보인다.

## 이해 확인

1. 폼 안의 `<button>`에 `type`을 쓰지 않았을 때 클릭하면 무슨 일이 일어나고, 제출하지 않는 버튼은 어떻게 만드는가?
2. `pattern="[0-9]{3}"`인 입력에 `1234`, 빈 값, `12a`를 넣으면 각각 어떻게 판정되는가? `required`를 더하면 무엇이 달라지는가?
3. GET 폼의 `action`이 `/search?lang=ko`일 때 `q=cats`를 제출하면 최종 URL은 무엇인가?
4. 클라이언트 검증을 통과한 값만 들어온다고 가정한 서버가 위험한 이유를 두 가지 경로로 설명한다.

## 출처

- [WHATWG HTML Standard, The DOCTYPE](https://html.spec.whatwg.org/multipage/syntax.html#the-doctype), [Elements](https://html.spec.whatwg.org/multipage/syntax.html#elements-2), [Character references](https://html.spec.whatwg.org/multipage/syntax.html#character-references), [Parse errors](https://html.spec.whatwg.org/multipage/parsing.html#parse-errors)
- [WHATWG HTML Standard, Specifying the document's character encoding](https://html.spec.whatwg.org/multipage/semantics.html#charset), [The title element](https://html.spec.whatwg.org/multipage/semantics.html#the-title-element), [The lang and xml:lang attributes](https://html.spec.whatwg.org/multipage/dom.html#attr-lang), [Boolean attributes](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes), [Keywords and enumerated attributes](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#keywords-and-enumerated-attributes)
- [WHATWG HTML Standard, The main element](https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element), [The table element](https://html.spec.whatwg.org/multipage/tables.html#the-table-element), [Requirements for providing text to act as an alternative for images](https://html.spec.whatwg.org/multipage/images.html#alt), [Media elements](https://html.spec.whatwg.org/multipage/media.html#media-elements), [Rendering, Flow content](https://html.spec.whatwg.org/multipage/rendering.html#flow-content-3)
- [WHATWG HTML Standard, Form submission algorithm](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm), [Constraints, Security](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#security-forms), [The button element](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element), [The pattern attribute](https://html.spec.whatwg.org/multipage/input.html#the-pattern-attribute), [The placeholder attribute](https://html.spec.whatwg.org/multipage/input.html#the-placeholder-attribute)
- [W3C, HTML Accessibility API Mappings 1.0](https://www.w3.org/TR/html-aam-1.0/), [W3C WAI, Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/), [W3C, About the Nu Html Checker](https://validator.w3.org/nu/about.html)
- [W3C, CSS Text Module Level 3, White Space Processing](https://www.w3.org/TR/css-text-3/#white-space-processing)
- [MDN, Heading elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/Heading_Elements), [MDN, source element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/source), [MDN, Autoplay guide for media and Web Audio APIs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), [MDN, HTML attribute: autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete)
- [YouTube, Harvard CS50 (2026), Lecture 8: HTML, CSS, JavaScript](https://www.youtube.com/watch?v=gmuTjeQUbTM&t=67927s) — freeCodeCamp.org 채널, 2026-02-05 공개, 18:52:07부터. 이 문서를 만든 계기이며 사실은 위 표준과 문서로 2026-11-18 대조했다.

## 관련 문서

- [[CSS-Selectors-Cascade-and-Inheritance|CSS 기초: 적용 위치, 선택자, 캐스케이드와 상속]]
- [[Browser-DOM-Manipulation-and-Safety|브라우저 DOM 조작과 안전성]]
- [[Web-Service-Structure|웹 서비스의 구조]]
- [[Agent-Friendly-Websites|에이전트 친화적 웹사이트]] — 의미 있는 HTML과 접근성 트리
- [[URI-URL-URN|URI, URL, URN]]
- [[HTTP-Status-Code|HTTP 상태 코드]]
- [[XSS|Cross-Site Scripting]]
