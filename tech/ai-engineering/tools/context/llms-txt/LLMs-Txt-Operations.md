---
tags: [ai, context, llms-txt, documentation, operations]
status: done
verified_at: 2026-10-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["llms.txt 생성과 검증", "llms.txt 도구", "LLM Documentation Operations"]
---

# llms.txt 생성 도구와 운영 검증

## 게시자와 소비자

게시자는 원문에서 색인과 Markdown을 만들고, 소비자는 해당 자료를 발견해 필요한 부분을 읽는다. 생성 성공, 배포 성공, 에이전트의 실제 사용과 답변 품질은 각각 검증한다. 아래 제품 동작은 2026-10-09 공개 문서와 소스 대조 기준이며 설치나 배포 시험 결과는 아니다.

## 제안과 도구의 동작은 다르다

| 도구 | 확인한 동작 | 해석할 때 주의할 점 |
| --- | --- | --- |
| `llms-txt` Python 패키지 | 파일을 파싱하거나 링크 본문을 모아 XML 컨텍스트 생성 | v2의 필수 소비 방식이 아니라 별도 구현 |
| JavaScript 예제 | 제목, 요약, 설명과 H2별 링크를 정규식으로 추출 | Markdown 전체 문법을 처리하는 범용 파서나 적합성 인증기가 아님 |
| `ed` 예제 | 색인 조회부터 문맥 공급까지의 가상 편집기 흐름 | 예시의 `L`, `x`는 실제 표준 `ed` 명령으로 소개된 기능이 아님 |
| nbdev와 `pysym2md` | Markdown 페이지와 Python 심벌 문서 생성, 색인에서 연결 | API 본문 생성과 색인 링크 관리는 별개 |

Python 문서의 설치와 실행 예시는 다음과 같다. 사용법 기록이며 이 Vault에 패키지를 설치하거나 실행한 것은 아니다.

```bash
pip install llms-txt
llms_txt2ctx -h
llms_txt2ctx llms.txt > llms.md
llms_txt2ctx llms.txt --optional True > llms-with-optional.md
```

출력 파일명을 `.md`로 정해도 이 도구가 만드는 본문은 XML 컨텍스트다. `parse_llms_file(text)`는 `title`, `summary`, `info`, `sections`를 얻는 파싱 단계이고, `create_ctx(text, optional=False, n_workers=None)`는 링크 본문을 모으는 단계다. `mk_ctx`는 파싱 결과에서 프로젝트와 섹션을 만들며 `get_sizes`는 섹션별 크기를 점검한다. `get_sizes`의 숫자를 모델별 토큰 수로 간주하지 않는다.

공개 구현에서 `create_ctx`와 CLI의 기본값은 `optional=False`지만 `mk_ctx`는 `optional=True`다. 직접 호출하는 함수에 따라 포함 범위가 달라지므로 v2의 `Optional` 관례와 혼동하지 않는다. JavaScript 예제는 파싱된 `sections`에 `Optional`도 남긴다.

## 파서와 가져오기 경계

공개 Python/JavaScript 예제는 간단한 정규식 구조다. 운영 소비자에 적용할 때는 H1만 있는 최소 파일, BOM, 줄바꿈, 잘못된 링크, 중복 H2와 괄호가 포함된 URL을 별도 확인한다. 예제의 정상 입력 통과만으로 v2 전체 지원을 입증할 수 없다.

Python `get_doc_content`는 로컬 nbdev 문서 경로를 먼저 찾고 없으면 HTTP로 본문을 가져온다. 확인한 원격 경로는 `httpx.get(url).text`이며 상태 코드 성공 검사를 따로 호출하지 않는다. 따라서 반환 문자열이 오류 페이지일 가능성을 소비자에서 검사해야 한다. 공개 main 소스의 관찰이며 설치된 배포판 전체의 동작으로 확대하지 않는다.

외부 링크는 신뢰할 수 없는 입력이다. 다음은 서비스에 소비자를 넣을 때의 설계 점검 사항이다.

- 허용할 URL 스킴, 도메인과 리디렉션 목적지를 검사한다. 서버 내부 주소로 접근하는 SSRF 경계를 둔다.
- 요청 시간, 다운로드 크기, 재귀 깊이와 중복 방문을 제한한다.
- 문서 안의 명령문을 권한 있는 작업 지시로 승격하지 않는다. 자격 증명이나 실행 권한을 문서에 제공하지 않는다.
- 본문과 함께 최종 URL, 문서 버전과 조회 시점을 보존해 답변 근거를 추적한다.

## nbdev 구성

공식 가이드의 흐름은 `nbs/llms.txt` 작성, `pysym2md` 개발 의존성 지정, Quarto pre-render로 심벌 문서 생성, `*.txt` 리소스 배포다. 다음 예시의 `example_package`는 실제 문서화할 패키지로 바꾼다.

```yaml
project:
  type: website
  pre-render:
    - pysym2md --output-file apilist.txt example_package
  resources:
    - "*.txt"
```

`apilist.txt`를 만들었다면 `llms.txt`에서도 연결한다. 함수 시그니처와 docstring 자동 추출만으로 오류 처리, 권한과 운영 제약까지 문서화됐다고 보지 않는다.

## 플랫폼별 제공 범위

| 플랫폼 | 확인한 제공 방식 | 운영상 확인할 것 |
| --- | --- | --- |
| Mintlify | `llms.txt`, `llms-full.txt` 자동 생성, 사용자 파일로 대체 가능 | 기본 언어/버전과 공개 범위, 수동 대체 파일의 갱신 책임 |
| GitBook | 공개 제품 안내에서 자동 생성과 Markdown 문서 제공 설명 | 사이트의 실제 공개 경로와 현재 문서 위치 확인 |
| Wix | 자동 생성, 대시보드 편집과 비활성화 지원 | 업그레이드, 사용자 도메인과 검색 색인 허용이 전제. 수동 편집 후 자동 갱신이 멈추고 기본값 복원 시 재개 |
| VitePress 플러그인 | 빌드 산출물에 색인, 합본과 페이지 Markdown 생성 | 배포 후 base path, 상대 링크와 리디렉션 확인 |
| Docusaurus 플러그인 | 빌드 시 색인과 합본 생성, 페이지 Markdown은 옵션 | 다중 문서/버전, 경로 변환과 MDX 정리 결과 확인 |

Mintlify의 자동 색인이 100,000자를 넘으면 `/_llms/` 아래 분할 색인을 연결한다. 소비자는 중간 색인을 따라 실제 문서에 도달해야 한다. 이는 제품의 제한이며 llms.txt 형식 전체의 크기 제한이 아니다. reverse proxy에서도 해당 경로와 공개 base path를 맞춘다.

Mintlify는 `/.well-known/` 호환 경로, `X-Llms-Txt`와 제품 고유 Link 관계도 제공한다. 이 헤더들을 [[LLMs-Txt-Format|v2의 발견 링크]]와 같은 필수 규칙으로 취급하지 않는다. 완전 인증 사이트와 부분 인증 사이트의 색인 공개 범위도 다르므로 실제 비인증 요청에서 확인한다.

`llms-full.txt`는 본문을 한 번에 받을 수 있지만 다운로드와 컨텍스트 비용이 커질 수 있다. 작은 자료집이나 오프라인 처리에는 합본을 검토하고, 큰 사이트의 특정 질문에는 색인에서 필요한 원문을 선택한다. 어느 방식이 정확한지는 같은 질문 집합으로 비교한다.

## 게시와 소비자 검증

다음은 도입 시 실행할 절차이며 이 문서 작성 중 실제 사이트에 적용한 결과는 아니다.

1. **원문 확정:** 공개할 현재 버전, 핵심 안내, API와 오류 문서를 고른다. 기업 정책, 학교 강좌, 식당 메뉴처럼 개발 문서 밖의 정보도 같은 구조로 안내할 수 있다.
2. **내용 동기화:** HTML과 Markdown의 의미, 코드, 표와 버전이 일치하는지 확인한다. 화면이나 그림에만 있는 필수 설명은 텍스트로 보완한다.
3. **공개 경로 검사:** 색인과 링크가 실제 본문을 반환하는지 확인한다. 200 상태라도 로그인 페이지나 SPA fallback HTML이면 실패로 본다.
4. **발견 검사:** HTML 링크/응답 헤더와 하위 경로를 확인한다. 자동 생성기의 출력과 실제 CDN 응답을 구분한다.
5. **질문 평가:** 설치, 인증, 오류와 버전 차이에 관한 대표 질문을 고르고, 색인만 진입점으로 준 에이전트가 올바른 원문과 답에 도달하는지 본다.
6. **비교와 유지:** 동일 모델과 조건에서 기존 탐색 방식과 비교한다. 근거 정확도, 요청 수, 지연과 입력 토큰을 측정하고 원문 변경 시 함께 갱신한다.

조회 로그의 요청 횟수는 해당 파일이 요청됐다는 증거다. 답변에 채택됐거나 매출, 검색 순위가 개선됐다는 증거로 쓰지 않는다. 디렉터리 등재와 생성 플러그인 설치도 소비자 지원의 보증이 아니다.

## 추가 생태계와 확인 범위

제안 사이트는 [llmstxt.site](https://llmstxt.site/), [llmstxt.cloud](https://directory.llmstxt.cloud/), [llmstxthub.com](https://llmstxthub.com/)을 예시 탐색 경로로 연결한다. WordPress의 Yoast/AIOSEO, Drupal, PHP 라이브러리, VS Code PagePilot과 MCP 서버도 통합 후보로 소개한다. 전체 목록은 [공식 Integrations](https://llmstxt.org/#integrations)에서 찾는다. 여기서는 이들 모두의 설치, 유지 상태나 호환성을 검증하지 않았다.

## 출처

- [llms-txt, Python module & CLI](https://llmstxt.org/intro.html)
- [llms-txt, Python source](https://llmstxt.org/core.html)
- [Python 구현 core.py — AnswerDotAI/llms-txt](https://github.com/AnswerDotAI/llms-txt/blob/main/llms_txt/core.py)
- [JavaScript 파서 예제 — AnswerDotAI/llms-txt](https://github.com/AnswerDotAI/llms-txt/blob/main/nbs/llmstxt-js.html)
- [llms-txt, ed example](https://llmstxt.org/ed.html)
- [llms-txt, How to help LLMs understand your nbdev project](https://llmstxt.org/nbdev.html)
- [llms-txt, Different Domains](https://llmstxt.org/domains.html)
- [Mintlify, llms.txt](https://www.mintlify.com/docs/ai/llmstxt)
- [What is llms.txt? — GitBook](https://www.gitbook.com/blog/what-is-llms-txt)
- [Wix, Understanding Your Site's llms.txt File](https://support.wix.com/en/article/understanding-your-sites-llmstxt-file)
- [vitepress-plugin-llms — okineadev](https://github.com/okineadev/vitepress-plugin-llms)
- [docusaurus-plugin-llms — rachfop](https://github.com/rachfop/docusaurus-plugin-llms)

## 관련 문서

- [[LLMs-Txt|llms.txt 학습 지도]]
- [[LLMs-Txt-Format|형식과 발견 규칙]]
- [[Agent-Repository-Instructions|저장소 작업 지침]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
