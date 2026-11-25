---
tags: [web, frontend, markdown, streaming, llm, webassembly, rendering, security]
status: done
verified_at: 2026-11-25
category: "웹&네트워크(Web&Network)"
aliases: ["Streaming Markdown Rendering", "스트리밍 Markdown 렌더링", "AI 응답 Markdown 렌더링", "Words", "@pierre/words"]
---

# 스트리밍 Markdown 렌더링: 생성 중인 AI 응답을 화면에 그리기

LLM 응답은 조각으로 도착하고 대개 Markdown이다. 조각이 올 때마다 전체 문자열을 처음부터 다시 파싱해 화면을 바꾸면 응답이 길수록 같은 앞부분을 반복해서 처리하고, 아직 닫히지 않은 문법(`**굵`, 열린 코드 블록, 주소가 없는 링크)이 잠깐씩 기호 그대로 보인다. 스트리밍 렌더러는 이미 확정된 부분과 아직 바뀔 수 있는 부분을 나누고, 미완성 문법을 표시용으로만 보정한다. Markdown 문법 자체는 [[Markdown-Document-Structure|Markdown 문서 구조]]에서 다룬다.

## 무엇이 앞부분을 바꾸는가

| 원인 | 예 | 결과 |
|---|---|---|
| 열린 블록 | 목록, 인용, 표, 코드 블록이 아직 닫히지 않음 | 다음 줄에 따라 블록의 해석이 바뀔 수 있다 |
| 미완성 인라인 문법 | 강조 구분자, 코드 스팬, 링크가 반만 도착 | 닫히기 전까지 원문 기호로 보이거나 다른 구조로 읽힌다 |
| 뒤에 오는 정의 | 링크 참조 정의와 각주 정의 | 앞에서 이미 그린 문장이 링크나 각주로 바뀐다 |

CommonMark 0.31.2는 링크 참조 정의가 그것을 쓰는 링크의 앞에도 뒤에도 올 수 있다고 정한다. 그래서 `[보고서][r1]`은 정의가 도착하기 전에는 링크가 아니다가, 응답 끝에 `[r1]: https://...`가 오면 앞 문장이 링크로 바뀐다. 끝까지 받아야 확정되는 문법이 있다는 점이 스트리밍 렌더링의 기본 제약이다.

## 확정 경계, 증분 갱신과 표시용 보정

Pierre Computer Company의 Markdown 렌더러 Words(`@pierre/words`, Apache-2.0)는 이 제약을 다음과 같이 다룬다(2026-11-25 저장소의 README와 ARCHITECTURE 기준). Pierre는 OpenAI가 2026-11-04 인수 계획을 발표한 회사다([[Server-Centric-Version-Control|서버 중심 버전 관리]]).

- **확정 경계:** HTML 세션은 완성된 HTML을 유지하고 원문의 끝부분만 다시 파싱한다. 문서 최상위 수준에서 줄바꿈으로 끝난 빈 줄을 안전한 경계로 보고, 목록, 인용, 표와 코드는 파서가 닫을 때까지 바뀔 수 있는 쪽에 둔다. 결과는 완성된 블록(`stable`), 아직 바뀔 수 있는 부분(`pending`)과 둘을 합친 `html`로 나뉜다.
- **증분 갱신:** 뒤에 덧붙은 텍스트는 완성 블록을 재사용한다. 한 줄짜리 문단과 최상위 코드 블록은 파서가 검증한 뒤 다시 파싱하지 않고 글자를 덧붙일 수 있으며, 문법 문자나 구조 변화가 생기면 파서로 돌아간다.
- **전체 다시 그리기:** 앞부분의 수정, 보정 옵션의 변경, 링크나 각주 정의가 나타나면 세션을 처음부터 다시 렌더링한다. 정의는 앞의 출력을 바꿀 수 있기 때문이다.
- **표시용 보정:** 미완성 문법은 원문을 건드리지 않고 표시용 사본만 고친다. 마지막 블록만 보고, 짝이 맞지 않을 수 있는 닫는 기호는 쓰지 않는다. React 컴포넌트는 스트림이 진행 중인 동안 미완성 강조, 코드와 링크를 보정하고 미완성 이미지는 숨기며, 끝난 텍스트는 일반 Markdown으로 그린다. 주소가 아직 없는 링크와 열린 코드 블록에는 `data-markdown-incomplete` 속성을 붙여 스타일로 구분할 수 있게 한다.
- **사용 방식:** 매 갱신마다 지금까지 받은 전체 문자열을 넘기고, 스트림이 진행 중이라는 표시(`isAnimating`)를 끝날 때까지 유지한다.

```tsx
import { Markdown } from '@pierre/words/react';
import '@pierre/words/styles.css';

<Markdown isAnimating={status === 'streaming'} caret="block">
  {message.text}
</Markdown>;
```

## 렌더러 구현의 선택

Words는 렌더러를 WebAssembly Text(WAT)로 직접 작성했다. README는 CommonMark 0.31.2와 GFM 0.29를 지원하고 HTML이나 터미널용 ANSI를 출력하며, 코어에 런타임 의존성이 없고 Node.js, 브라우저와 Cloudflare Workers에서 돈다고 적는다. 구조 문서에 따르면 하나의 선형 메모리 위에서 두 번 지나가며, 블록 분석이 평평한 레코드를 쓰고 렌더러가 그 레코드를 읽어 출력 바이트를 쓴다. 구문 트리와 범용 메모리 할당기가 없고, 잘못된 입력에도 trap이나 무한 루프에 빠지지 않아야 한다는 것을 제약으로 둔다.

- 출력 `Uint8Array`는 Wasm 메모리를 공유하므로 다음 렌더링 전에 디코드하거나 복사해야 한다([[WebAssembly#선형 메모리와 JS 뷰|선형 메모리와 JS 뷰]]).
- 기본 진입점은 Wasm 모듈을 base64로 묶어 넣는다. 별도의 `.wasm` 파일로 불러오면 gzip 뒤 약 20% 작고, 메인 스레드 밖에서 컴파일되며, JavaScript가 바뀌어도 캐시에 남는다고 README는 설명한다([[WebAssembly#브라우저 로딩과 캐싱|브라우저 로딩과 캐싱]]).
- 수식 렌더링을 뺀 빌드는 모듈이 100KB에서 66KB로 줄어든다.
- remark와 rehype 플러그인은 지원하지 않는다. 기존 Markdown 처리 생태계의 플러그인을 재사용해야 하면 이 점이 선택 조건이 된다(이 문서의 판단).

제작자가 밝힌 속도 측정은 저장소의 벤치마크 문서에 있으며 이 문서에서는 읽거나 재현하지 않았다.

## 모델 출력은 신뢰할 수 없는 입력이다

- Words의 `renderToHtml()`은 기본적으로 원문 HTML을 유지한다. README는 신뢰할 수 없는 Markdown의 출력을 페이지에 넣기 전에 sanitize하라고 경고하고, `skipHtml`만으로는 sanitizer가 아니라고 적는다.
- React 컴포넌트는 허용 목록에 없는 원문 HTML을 빼고 안전하지 않은 URL scheme을 거부하지만 외부 이미지는 허용하므로, 막으려면 URL 변환이나 요소 필터를 쓴다. 다만 허용 목록으로 남긴 원문 HTML 태그는 URL 변환을 거치지 않고 내장 URL 검사만 받으므로, 신뢰하는 태그와 속성만 목록에 넣고 원문 HTML의 외부 이미지는 요소 필터로 막거나 `img`를 목록에 넣지 않는다. 허용 목록에 넣어도 `on*`, `srcdoc` 속성과 `javascript:` 값, `script` 태그는 통과하지 못한다. hook과 플러그인은 신뢰된 코드로 취급되므로 그 안에서 더하는 텍스트는 직접 escape한다.
- 자동으로 불러오는 외부 이미지 URL은 모델이 프롬프트 인젝션을 따라 데이터를 실어 보내는 경로가 될 수 있다([[LLM-Application-Security|LLM 애플리케이션 보안]]의 EchoLeak 사례). AI 응답 화면에서는 외부 이미지를 막거나 허용 도메인으로 제한하는 기본값을 검토한다(이 문서의 판단).
- 터미널 출력(`renderToAnsi()`)은 제어 문자를 U+FFFD로 바꿔 문서가 escape sequence를 보내지 못하게 한다([[Terminal-and-Editor-Interfaces#출력은 제어 언어다|터미널 출력은 제어 언어다]]).

## 점검 질문

- 응답 끝에 도착한 링크 참조 정의가 앞 문장을 바꾸는 이유와 렌더러가 이를 다루는 방법을 설명할 수 있는가
- 확정된 블록과 바뀔 수 있는 블록을 나누는 경계를 어디에 둘지 말할 수 있는가
- 미완성 문법 보정이 원문이 아닌 표시용 사본에만 적용돼야 하는 이유는 무엇인가
- AI 응답 렌더링에서 원문 HTML, URL scheme과 외부 이미지를 각각 어떻게 제한하는가

## 출처

- [Words, from Pierre — GitHub, pierrecomputer/pierre](https://github.com/pierrecomputer/pierre/tree/main/packages/words) — 2026-11-25 README의 지원 명세, 출력, React 컴포넌트, HTML 세션, 원문 HTML 정책과 Wasm 로딩 확인
- [Words Architecture — GitHub, pierrecomputer/pierre](https://github.com/pierrecomputer/pierre/blob/main/packages/words/ARCHITECTURE.md) — 두 단계 처리, 스트리밍 경계와 재설정 조건, 표시용 보정, 제약
- [CommonMark Spec 0.31.2, Link reference definitions](https://spec.commonmark.org/0.31.2/#link-reference-definitions) — 정의가 링크의 앞뒤 어디에나 올 수 있다는 규정
- 사용자 제공 GeekNews 알림(2026-11-23): Words - AI 응답을 실시간으로 표시하는 고속 Markdown 렌더러. 학습 계기이며 게시물 번호는 확인하지 못했다

## 관련 문서

- [[Markdown-Document-Structure|Markdown 문서 구조]]
- [[Server-Sent-Events|Server-Sent Events]] — 응답 조각이 도착하는 전송 경로
- [[LLM-Failure-Handling-Response-Validation|LLM 응답 검증과 스트리밍]] — 끊긴 스트림과 이미 보여 준 앞부분
- [[Browser-Main-Thread|브라우저 메인 스레드]]
- [[WebAssembly|WebAssembly]]
