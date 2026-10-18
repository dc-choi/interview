---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 함수 version, Global branch와 API name

게시 버전은 immutable이며 Semantic Versioning을 사용한다. 호환성 검사는 입력/출력 구조를 검사하지만 같은 타입의 의미 변화까지 보장하지 않는다. optional custom field 관련 검사 결과도 실제 동작 호환성과 나눠 판단한다.

## 소비자가 선택하는 버전

Pinned 버전은 명시한 버전을 사용한다. 허용된 compatible range는 일반 실행에서 최대 만족 버전으로 eventual하게 바뀌며 수분의 전파 시간이 있을 수 있다. deployed 함수는 현재 배포 버전이 range를 만족해야 하고 아니면 오류다. range 설정 자체가 새 서비스를 배포하지 않는다.

API-named query는 최신 tagged 버전으로 연결되며 일반 함수의 pinning과 다르다. API 이름을 제거하거나 변경해 새 태그를 내면 기존 호출자를 깨뜨린다. 호환되지 않는 변경은 별도 API name으로 병행 제공한다. API name은 lowerCamelCase, 100자 미만, 숫자로 시작하지 않으며 Ontology 범위에서 고유해야 한다.

Query는 read-only 계약이다. 외부 시스템 변경도 금지되며 편집은 Action으로 노출한다. v1 query/LLM 호출의 정적 분석이 빠뜨리는 의존성은 `@Uses({ queries: [...] })`로 보완한다. 생성 parameter 이름과 예제 호출의 이름이 다르면 실제 SDK 계약을 따른다.

## Global branch

v1 child template 0.903 이상, v2 parent 0.1299 이상, Python 0.724 이상과 local SDK 조건을 확인한다. branch 버전은 같은 branch context에서만 사용하며 목표 stable 버전과 연결된다. branch의 target을 바꾸면 dependent를 갱신해야 한다.

rebase만으로 main의 함수 버전이 자동 갱신되는 것은 아니다. merge 때 target에 해당하는 버전과 다른 시험 버전을 구분한다. query 함수 branch dependency 지원 제한도 확인한다. 함수 호환성, Ontology revision과 Action provenance를 함께 검토한다.

## 출처

- [Palantir, functions-versioning](https://www.palantir.com/docs/foundry/functions/functions-versioning)
- [Palantir, branching-functions](https://www.palantir.com/docs/foundry/functions/branching-functions)
- [Palantir, version-range-dependencies-for-functions](https://www.palantir.com/docs/foundry/functions/version-range-dependencies-for-functions)
- [Palantir, query-functions](https://www.palantir.com/docs/foundry/functions/query-functions)
- [Palantir, python-functions-advanced-usage](https://www.palantir.com/docs/foundry/functions/python-functions-advanced-usage)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
