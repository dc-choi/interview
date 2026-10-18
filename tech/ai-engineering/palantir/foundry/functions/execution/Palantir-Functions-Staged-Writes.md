---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Staged writes의 read-after-write와 원자성

Staged writes는 beta이며 enrollment에서 제공되는지 확인해야 한다. 일반 edit batch와 달리 같은 Action 실행 안에서 방금 쓴 데이터를 검색과 집계로 읽을 수 있다. 외부 실행에는 commit 전까지 보이지 않는다.

## 실행 계약

1. 런타임이 transaction context를 가진 WriteableClient를 첫 매개변수로 주입한다.
2. 객체/링크 편집과 이 client를 통한 조회, 중첩 호출이 같은 staged transaction에 참여한다.
3. 성공하면 Action 완료 전에 함께 commit한다. 예외가 나면 staged edits를 버리고 Action이 재시도할 수 있다.

TypeScript는 `@osdk/functions/experimental`의 `WriteableClient<EditsUnion>`를 사용한다. Python은 생성 SDK의 WriteableClient, `@function(beta=True, edits=[...])`와 `client.ontology.staged_writes()`를 사용한다. Python client는 조회 전에 보류한 편집을 staged transaction으로 보낸다. 직접 새 client를 만들어 주입된 context를 잃지 않는다.

반환값은 edit 배열로 제한되지 않는다. 생성한 ID나 계산 결과를 반환할 수 있다. 다만 수정할 object/link type은 중첩 호출을 포함해 선언해야 한다. interface edits는 staged writes에서 지원하지 않는다고 문서는 명시한다. 1:N 링크는 FK 속성을 편집한다.

중첩 staged 함수, AIP Logic과 Ontology query를 같은 client로 호출하면 앞서 staged한 편집을 읽고 같은 commit에 참여한다. 일반 외부 HTTP 요청을 이 원자성에 포함시키지 않는다. 외부 효과가 있으면 재시도와 보상 경로를 별도 설계한다.

Live/published preview는 Code Repositories에서만 지원하며 로컬 개발과 VS Code workspace에서는 지원하지 않는다는 제한이 있다. 일반 함수 preview 성공을 staged transaction 검증으로 대체하지 않는다.

## 출처

- [Palantir, python-staged-writes](https://www.palantir.com/docs/foundry/functions/python-staged-writes)
- [Palantir, typescript-v2-staged-writes](https://www.palantir.com/docs/foundry/functions/typescript-v2-staged-writes)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
