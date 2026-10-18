---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AIP Threads context와 인용의 한계"]
---

# AIP Threads context와 인용의 한계

## 문서를 넣는 것과 모델이 읽는 범위

AIP Threads는 AIP/custom workflow 활성화가 필요하며 접근 가능한 native(non-scanned) PDF와 Chatbot으로 대화한다. Upload는 media set 저장 위치와 thread context 선택을 구분한다. 일반 document mode는 명시적으로 넣은 문서만 context로 사용하며 조직 전체 자료에 자동 접근하는 것이 아니다.

Full document text는 문서 전체 추출본을 넣으려는 모드지만 model context window를 넘을 수 있다. Relevant chunks는 beta retrieval로 관련 부분만 넣는다. 기본4,096문자 chunk/512문자 overlap과 ada-002는 현재 이 문서의 설정 예이며 enrollment에서 다른 embedding을 사용할 수 있다. Chunk검색 답변을 전체문서 읽기와 동등하게 보고하지 않는다.

모델은 원문 PDF page citation을 달도록 지시받지만 인용 정확성을 사용자 검증이 필요하다고 명시한다. Citation 존재만으로 문장 전체의 근거나 추론의 정확성이 증명되지 않는다. Temperature0은 더 집중된 출력을 지향하는 값이지 완전 결정성/사실성을 보장하지 않는다.

## 대화 상태와 재사용

Context 문서를 바꾸려면 새 thread나 current configuration으로 시작하는 새 thread를 사용한다. Thread history 삭제, conversation JSON/PDF export와 원문 media의 저장 수명은 같은 계약이 아니다.

Document/model/prompt 구성이 반복 사용에 적합하면 Chatbot Studio로 승격해 configure/publish한 뒤 Threads에서 선택할 수 있다. Chatbot mode는 해당 봇의 정보/도구 문맥을 사용하므로 일반 document mode와 접근 범위가 다르다. Default chatbot 고정도 각 tool 실행의 권한/사용자 의도를 대체하지 않는다.

Third-party LLM 처리와 조직 정책의 경계가 적용된다. 문서 검색 및 일반 문서 분석 계약만 정리했으며 실제 PDF upload, 대화와 Chatbot 발행은 수행하지 않았다.

## 출처

- [Palantir threads, threads](https://www.palantir.com/docs/foundry/threads)
- [Palantir threads, getting-started](https://www.palantir.com/docs/foundry/threads/getting-started)
- [Palantir threads, overview](https://www.palantir.com/docs/foundry/threads/overview)

## 관련 문서

- [[Palantir-Collaborative-Analysis]]
