---
tags: [ai, context, llms-txt, documentation]
status: done
verified_at: 2026-10-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["llms.txt 형식", "llms.txt v2", "LLM Documentation Discovery"]
---

# llms.txt 형식과 발견 규칙

## 목적과 상태

`llms.txt`는 에이전트가 웹사이트를 이해하고 필요한 원문을 찾도록 제공하는 Markdown 진입점이다. 2026-10-09 확인한 정본은 2026-08-10 수정된 v2 제안이다. 승인된 인터넷 표준이나 모든 LLM의 자동 수집 계약으로 취급하지 않는다.

처리 흐름은 작은 색인 읽기, 관련 링크 선택, 원문 조회, 질문에 대한 근거 확인이다. 파일 게시 자체가 모델 가중치를 학습시키는 것은 아니다. 지식 검색과 컨텍스트 공급을 돕는 설계다.

## 형식

아래 순서를 사용한다. **필수 요소는 프로젝트 또는 사이트 이름을 적은 H1 하나**다.

| 순서 | 요소 | 역할 |
| --- | --- | --- |
| 1 | 선택적 BOM | 파일 맨 앞의 byte-order mark |
| 2 | `# 이름` | 사이트 식별 |
| 3 | 선택적 `>` 인용 블록 | 짧은 설명 |
| 4 | 선택적 문단과 목록 | 추가 맥락, 이 부분에는 제목을 넣지 않음 |
| 5 | 선택적 `## 분류`와 링크 목록 | 필요한 상세 자료로 이동 |

파일 목록의 항목은 `- [제목](URL)`이며 `: 설명`을 붙일 수 있다. 실제 공개 자료를 가리키고 내용을 구별할 수 있는 제목과 설명을 쓴다. 다음은 가상 예시다.

```markdown
# Example Library

> 공개 API와 사용 예제를 제공하는 라이브러리 문서입니다.

버전별 API가 다릅니다. 설치한 버전에 맞는 문서를 먼저 선택하세요.

## 시작하기

- [빠른 시작](https://example.com/docs/start.md): 설치와 첫 요청
- [오류 처리](https://example.com/docs/errors.md): 오류 코드와 재시도 조건

## Optional

- [변경 이력](https://example.com/docs/history.md): 이전 버전과의 차이
```

`Optional`은 덜 중요한 자료를 묶는 관례다. v2에서는 이 이름만으로 자동 생략을 강제하지 않는다. Python 변환 도구의 별도 옵션은 [[LLMs-Txt-Operations|생성 도구와 운영 검증]]에서 구분한다.

## 경로와 발견

`/llms.txt`는 사이트 루트, `/docs/llms.txt`는 `/docs/` 아래를 설명한다. 여러 파일이 해당되면 가장 구체적인 경로의 파일을 사용하도록 제안한다. 같은 origin의 `/blog/`가 `/docs/llms.txt`에 자동 포함되는 것은 아니다.

Markdown 대체 페이지는 기존 URL 뒤에 `.md`를 붙이거나 확장자를 `.md`로 바꿀 수 있다. 파일명이 없는 경로에는 `index.html.md` 또는 `index.md`를 붙이는 방식을 제안한다. URL 문자열을 추측한 것과 서버가 그 파일을 제공하는 것은 다르다.

페이지는 HTML 링크 또는 HTTP 응답 헤더로 위치를 알릴 수 있다. 다음은 배포 시 사용할 수 있는 가상 예시이며, 모든 소비자가 읽는다는 보장은 아니다.

```html
<link rel="alternate" type="text/markdown" href="/docs/setup.md">
<link rel="describedby" href="/docs/llms.txt">
```

```http
Link: </docs/setup.md>; rel="alternate"; type="text/markdown", </docs/llms.txt>; rel="describedby"
```

헤더는 Markdown 같은 비HTML 응답에서도 발견 경로를 제공할 수 있다. `/.well-known/llms.txt`는 일부 제품의 호환 경로이지 이 제안의 필수 배치 위치가 아니다. v2가 하위 경로 배치를 허용하는 이유 중 하나는 공유 호스트에서 자기 경로만 관리하는 게시자도 참여할 수 있게 하기 위해서다.

## v1 자료를 읽을 때

| 항목 | v2에서 확인할 점 |
| --- | --- |
| Markdown URL | `.html.md`뿐 아니라 `.md` 치환도 허용 |
| 하위 경로 | 그 경로 아래에 적용, 더 구체적인 파일을 우선 |
| 발견 | `alternate`와 `describedby` 링크 관계 권장 |
| 소비 방식 | 관련 링크만 찾아 읽는 방식 명시 |
| 컨텍스트 확장 | 일괄 XML 확장 도구는 제안의 일부에서 제외 |
| `Optional` | 보조 링크 관례로 유지, 기계적 생략 의미는 제거 |

튜토리얼과 구현이 모두 같은 시점의 규칙을 반영한다고 가정하지 않는다. 예를 들어 nbdev 안내의 요약 인용 블록 필수 설명과 정본의 H1만 필수라는 설명이 다르면 형식 판정은 정본을 따른다.

## 다른 형식과의 경계

| 형식 | 주된 역할 | 대신하지 않는 것 |
| --- | --- | --- |
| `llms.txt` | 웹 콘텐츠의 선별된 안내와 링크 | 인증, 접근 허가, 답변 정확성 |
| `llms-full.txt` | 일부 도구가 제공하는 본문 합본 | 모든 사이트의 필수 파일, 무제한 컨텍스트 |
| `robots.txt` | 크롤러에게 허용할 경로를 알리는 규칙 | 실제 접근 통제, 문서 요약 |
| `sitemap.xml` | 검색엔진의 URL 발견 지원 | 선별된 설명과 학습 경로 |
| 구조화 데이터 | 페이지의 엔티티와 속성 표현 | 상세 API 본문과 작업 지침 |
| `AGENTS.md` | 저장소 작업의 명령, 규약과 경계 | 웹사이트 색인, 실행 권한 강제 |

RFC 9309는 `robots.txt`도 접근 인가 수단이 아니라고 명시한다. 민감 문서는 인증과 인가로 보호해야 하며, 공개 색인에서 링크를 빼는 것만으로 보호됐다고 판단하지 않는다.

## 검색 노출과 도입 효과

Google Search의 2026-07-10 공식 안내는 `llms.txt`를 검색 및 생성형 검색 기능의 특별 신호로 사용하지 않으며, 파일 자체가 노출이나 순위를 높이거나 낮추지 않는다고 설명한다. 이는 Google Search의 범위이며 모든 에이전트가 무시한다는 뜻은 아니다.

Chrome Lighthouse의 agentic browsing 검사는 별도 기능이다. 공식 설명상 `llms.txt` 조회의 서버 오류를 지적하고, 파일이 없는 404는 현재 선택 기능이므로 N/A로 처리한다. 이 검사의 존재를 검색 순위 가산점이나 모든 사이트의 필수 요건으로 해석하지 않는다.

## 출처

- [llms-txt, The /llms.txt file, v2](https://llmstxt.org/)
- [llms-txt, Changes](https://llmstxt.org/changes.html)
- [llms-txt, Python source](https://llmstxt.org/core.html)
- [llms-txt, How to help LLMs understand your nbdev project](https://llmstxt.org/nbdev.html)
- [RFC 9309, Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html)
- [Google Search Central, Guide to optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Chrome for Developers, llms.txt](https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt)

## 관련 문서

- [[LLMs-Txt|llms.txt 학습 지도]]
- [[LLMs-Txt-Operations|생성 도구와 운영 검증]]
- [[Agent-Repository-Instructions|AGENTS.md와 저장소 지침]]
- [[Context-Engineering|컨텍스트 엔지니어링]]
