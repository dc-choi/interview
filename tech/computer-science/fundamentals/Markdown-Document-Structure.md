---
tags: [cs, markdown, documentation, markup]
status: done
verified_at: 2026-11-04
category: "CS - 기초"
aliases: ["Markdown 문서 구조", "Markdown Document Structure", "MD 파일"]
---

# Markdown 문서 구조

Markdown은 일반 텍스트에 제목, 목록, 링크 같은 구조를 표시하는 문법이다. `.md` 파일에는 그 텍스트를 저장하며, 편집기나 변환기가 문법을 해석해 읽기 좋은 화면으로 표시한다. 원문과 렌더링된 화면은 같은 문서의 서로 다른 표현이다.

## 문법은 구조를, 화면은 표현을 맡는다

CommonMark 0.31.2 기준으로 `#`부터 `######`까지는 제목의 1~6단계를 나타낸다. 내용이 있는 제목에서는 `#` 다음에 공백이나 탭을 둔다. `#제목`을 제목으로 해석한다고 가정하지 않는다. 제목 단계는 글자 크기를 직접 지정하는 값이 아니며, 실제 크기와 색상은 표시하는 도구의 스타일에 달려 있다.

| 목적 | 원문 예 | 의미 |
|---|---|---|
| 제목 | `## 입력 조건` | 두 번째 수준 제목 |
| 목록 | `- 입력 파일 확인` | 순서 없는 항목 |
| 순서 | `1. 파일을 읽는다` | 순서 있는 항목 |
| 강조 | `**필수**` | 강한 강조 |
| 링크 | `[문서](https://example.com)` | 표시명과 목적지 |
| 코드 | 백틱으로 감싼 식별자 | 문장 안에서 코드를 구분 |

여러 줄 코드는 백틱 세 개 이상으로 앞뒤를 둘러싼 fenced code block으로 표시할 수 있다. 코드 블록 안의 내용은 일반 본문의 제목이나 강조 문법으로 해석하지 않는다.

## 형식이 같아 보여도 확장은 다를 수 있다

CommonMark는 문법 해석을 명세로 정한다. GitHub Flavored Markdown(GFM)은 CommonMark에 표와 task list 등의 확장을 더한다. `.md`라는 확장자만으로 모든 도구가 같은 확장을 지원한다고 보지 않는다. 전달할 도구에서 표, 체크박스와 링크를 확인한다.

GitHub는 GFM을 HTML로 변환한 뒤에도 보안과 일관성을 위한 후처리를 수행한다. Markdown 문법 지원과 임의 HTML 허용은 별개의 조건이다.

## 작성과 확인의 작은 흐름

다음은 구조를 드러내는 문서 작성 예다. 제목으로 목적, 입력과 완료 조건을 나누고, 필요한 항목을 목록에 둔다.

```markdown
# 데이터 정리

## 입력
- 열 이름이 있는 CSV 파일

## 완료 조건
- 원본 파일을 보존한다.
- 빠진 값의 개수와 처리 방법을 기록한다.
```

VS Code에서는 `.md` 파일을 저장한 뒤 macOS의 `Cmd+Shift+V`, Windows/Linux의 `Ctrl+Shift+V`로 미리보기를 전환할 수 있다. 원문과 미리보기를 함께 확인하면 제목과 목록이 의도한 구조로 해석됐는지 점검하기 쉽다.

AI에 전달할 때도 목적, 입력, 제약과 완료 조건을 구분하는 형식으로 활용할 수 있다(작성 제안). 다만 Markdown 명세는 모델의 이해도나 지시 준수율을 보장하지 않는다. 특정 형식이 모든 AI에서 가장 잘 작동한다는 결론에는 모델과 과업을 맞춘 별도 평가가 필요하다. 형식의 정확성과 내용의 정확성도 구분한다.

## 출처

- [Daring Fireball, Markdown](https://daringfireball.net/projects/markdown/)
- [CommonMark Spec 0.31.2](https://spec.commonmark.org/0.31.2/)
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
- [Visual Studio Code, Markdown and Visual Studio Code](https://code.visualstudio.com/docs/languages/markdown)

## 관련 문서

- [[CS-Data-Representation|데이터 표현]]
- [[Agent-Spec-Writing|에이전트 스펙 작성법]]
- [[LLMs-Txt|웹 문서를 위한 llms.txt]]
