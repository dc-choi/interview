---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Functions의 언어, 등록과 실행 경계

Functions는 Ontology 객체와 업무 로직을 애플리케이션에서 재사용하는 실행 단위다. FOO(Functions on Objects)는 별도 런타임 종류가 아니라 객체를 사용하는 함수의 용도를 설명한다.

## 언어별 등록 계약

| 구분 | 등록 위치와 형태 | 식별자 변경 위험 |
|---|---|---|
| TypeScript v1 | `functions-typescript/src/index.ts`에서 export하는 class의 public method에 `@Function`, `@Query` 또는 `@OntologyEditFunction` 적용 | class/method 이름 변경은 새 함수가 될 수 있다 |
| TypeScript v2 | `typescript-functions/src/functions` 아래 파일 이름과 같은 함수의 default export | 하위 디렉터리를 포함한 파일 경로 변경은 새 함수가 된다 |
| Python | `@function`과 모든 입력/출력 타입 선언 | API 타입 별칭으로 registry의 수치 타입을 명확히 한다 |

TypeScript v1은 제한된 JavaScript 환경이다. Node.js의 파일 시스템이나 시스템 모듈을 전제로 한 라이브러리는 그대로 쓸 수 없다. 순수 JavaScript 라이브러리 또는 필요에 맞는 가상 파일 시스템을 검토한다. v2는 Node.js 환경이며 Python과 함께 더 넓은 런타임 기능을 제공한다.

태그는 저장소의 모든 등록 함수를 게시한다. 일부 함수만 변경했어도 함께 게시되는 함수와 소비자를 확인한다. 성공한 release 직후에도 권한 전파 때문에 검색에 늦게 나타날 수 있다. Live preview는 개발 실행 환경이므로 배포 실행의 권한, 자원 한도와 성능을 보장하지 않는다.

## 문서의 지원 표를 읽는 방법

언어 지원 표와 상세 기능 문서가 항상 같은 시점의 내용을 담지는 않는다. 예를 들어 표의 media 변환 미지원과 최신 media 문서의 beta 변환 지원을 구분해야 한다. 상세 SDK 버전과 enrollment 조건을 함께 확인한다. 구형 TypeScript 예제의 decorator를 v2에 그대로 옮기지 않는다.

## 출처

- [Palantir, functions](https://www.palantir.com/docs/foundry/functions)
- [Palantir, overview](https://www.palantir.com/docs/foundry/functions/overview)
- [Palantir, getting-started](https://www.palantir.com/docs/foundry/functions/getting-started)
- [Palantir, foo-getting-started](https://www.palantir.com/docs/foundry/functions/foo-getting-started)
- [Palantir, functions-on-objects](https://www.palantir.com/docs/foundry/functions/functions-on-objects)
- [Palantir, typescript-v1-getting-started](https://www.palantir.com/docs/foundry/functions/typescript-v1-getting-started)
- [Palantir, typescript-v2-getting-started](https://www.palantir.com/docs/foundry/functions/typescript-v2-getting-started)
- [Palantir, python-getting-started](https://www.palantir.com/docs/foundry/functions/python-getting-started)
- [Palantir, decorators](https://www.palantir.com/docs/foundry/functions/decorators)
- [Palantir, add-dependencies](https://www.palantir.com/docs/foundry/functions/add-dependencies)
- [Palantir, language-feature-support](https://www.palantir.com/docs/foundry/functions/language-feature-support)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
