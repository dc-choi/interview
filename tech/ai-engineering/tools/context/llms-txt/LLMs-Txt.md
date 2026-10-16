---
tags: [ai, context, llms-txt, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["llms.txt", "LLM 웹 문서 안내"]
---

# llms.txt, 에이전트를 위한 웹 문서 안내

웹사이트의 핵심 설명과 원문 링크를 작은 Markdown 안내 파일로 제공하는 제안이다. 문서를 공개하는 형식, 에이전트가 실제로 읽는 동작, 검색 노출 효과는 구분한다.

## 학습 순서

1. [[LLMs-Txt-Format|형식과 발견 규칙]]: v2, 경로 범위, Markdown 대체 페이지, 다른 파일과의 차이.
2. [[LLMs-Txt-Operations|생성 도구와 운영 검증]]: Python/JavaScript, nbdev, 문서 플랫폼, 게시와 소비자 검증.
3. [[Agent-Repository-Instructions|AGENTS.md와 비교]]: 웹 근거 안내와 저장소 작업 지침의 역할 구분.

## 이해 확인

- `/docs/llms.txt`가 존재하면 `/blog/`에도 적용되는가? [[LLMs-Txt-Format#경로와 발견|경로 범위]]로 설명한다.
- `Optional`과 `llms-full.txt`를 모든 클라이언트의 필수 동작으로 볼 수 있는가? [[LLMs-Txt-Operations#제안과 도구의 동작은 다르다|도구별 계약]]으로 확인한다.
- 파일을 게시한 뒤 무엇을 측정해야 하는가? [[LLMs-Txt-Operations#게시와 소비자 검증|검증 항목]]에서 발견, 근거 선택과 답변 정확도를 나눈다.

상위: [[Context-Hub|컨텍스트]].
