---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Functions의 언어, 등록과 실행 경계

Functions는 Ontology 객체와 업무 로직을 애플리케이션에서 재사용하는 실행 단위다. FOO(Functions on Objects)는 별도 런타임 종류가 아니라 객체를 사용하는 함수의 용도를 설명한다.

## 서버 실행과 호출 목적

Functions의 로직은 서버 측 격리 환경에서 실행한다. Ontology 객체의 속성을 읽고 링크를 따라가거나 객체를 편집하는 로직을 작성할 수 있다. 화면에서 함수를 사용하더라도 브라우저에서 실행하는 코드로 간주하지 않는다.

호출 목적에 따라 결과와 연결 지점을 나눈다. Workshop의 객체 집합, 변수, 파생 열과 차트 집계는 조회 결과를 소비하고, 여러 객체를 갱신하는 복잡한 편집은 function-backed Action에 연결할 수 있다. Slate의 화면용 백엔드 로직과 Quiver의 사용자 정의 지표도 활용 예다. 외부 시스템 조회, 언어 모델 결과의 점진적 스트리밍, Pipeline Builder에서 Python 함수를 sidecar 컨테이너로 사용하는 경우도 있다.

이 목록은 Functions 전체의 활용 범위다. 모든 언어와 버전이 각 기능을 똑같이 지원한다는 뜻은 아니므로 선택한 런타임의 지원 표와 개별 기능 문서를 함께 확인한다. 이 절은 2026-10-18에 공식 overview와 대조했으며, 아래 언어별 세부 계약 전체의 재검증 날짜를 바꾸지는 않는다.

## 언어별 등록 계약

| 구분 | 등록 위치와 형태 | 식별자 변경 위험 |
|---|---|---|
| TypeScript v1 | `functions-typescript/src/index.ts`에서 export하는 class의 public method에 `@Function`, `@Query` 또는 `@OntologyEditFunction` 적용 | class/method 이름 변경은 새 함수가 될 수 있다 |
| TypeScript v2 | `typescript-functions/src/functions` 아래 파일 이름과 같은 함수의 default export | 하위 디렉터리를 포함한 파일 경로 변경은 새 함수가 된다 |
| Python | `@function`과 모든 입력/출력 타입 선언 | API 타입 별칭으로 registry의 수치 타입을 명확히 한다 |

TypeScript v1은 제한된 JavaScript 환경이다. Node.js의 파일 시스템이나 시스템 모듈을 전제로 한 라이브러리는 그대로 쓸 수 없다. 순수 JavaScript 라이브러리 또는 필요에 맞는 가상 파일 시스템을 검토한다. v2는 Node.js 환경이며 Python과 함께 더 넓은 런타임 기능을 제공한다.

태그는 저장소의 모든 등록 함수를 게시한다. 일부 함수만 변경했어도 함께 게시되는 함수와 소비자를 확인한다. 성공한 release 직후에도 권한 전파 때문에 검색에 늦게 나타날 수 있다. Live preview는 개발 실행 환경이므로 배포 실행의 권한, 자원 한도와 성능을 보장하지 않는다.

## 객체를 입력으로 받는 함수의 최소 흐름

객체를 쓰는 함수는 먼저 필요한 객체 타입, 링크 타입과 interface를 저장소가 속한 Project로 import한다(세부 단위는 [[Palantir-Functions-Imports-and-Local-SDK|Ontology imports, 생성 SDK와 로컬 개발]]). 그 뒤 import 경로가 버전마다 다르다.

| 구분 | 타입 import | 객체 입력 타입 |
|---|---|---|
| TypeScript v1 | `@foundry/ontology-api`, private Ontology는 `@foundry/ontology-api/<ontology-api-name>` | 생성된 객체 타입 그대로(`airport: Airport`) |
| TypeScript v2 | import 뒤 Ontology SDK를 생성하고 설치해야 `@ontology/sdk`에서 쓸 수 있다 | `@osdk/client`의 `Osdk.Instance<Airport>`로 감싼다 |

```typescript
// TypeScript v2: src/functions/airportLocation.ts
import { Airport } from "@ontology/sdk";
import { Osdk } from "@osdk/client";

export default function airportLocation(airport: Osdk.Instance<Airport>): string {
    return `${airport.city}, ${airport.country}`;
}
```

객체를 입력으로 받는 함수를 Live preview로 실행하려면 그 객체 타입의 backing datasource를 functions helper에서 따로 import해야 한다. Live preview에서 객체 타입에 대한 권한은 TypeScript 저장소가 각 객체 타입의 backing datasource에 갖는 권한으로 정해진다. notification을 만드는 함수는 preview에서 수신자 권한을 검사하지 않으므로, preview에서 성공해도 다른 곳의 Action에서 실패할 수 있다([[Palantir-Functions-Consumers-and-Notifications|함수 소비자와 notification]]). 게시는 코드를 커밋하고 Branches 탭에서 새 tag를 게시하는 방식이며, 게시한 뒤에야 다른 애플리케이션에서 쓸 수 있다. 이 절은 2026-11-26에 foo-getting-started와 대조했다.

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
