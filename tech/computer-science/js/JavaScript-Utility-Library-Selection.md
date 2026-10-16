---
tags: [cs, javascript, typescript, es-toolkit, lodash, bundle, migration]
status: done
verified_at: 2026-10-15
category: "CS - JavaScript"
aliases: ["JavaScript Utility Library Selection", "es-toolkit과 Lodash", "자바스크립트 유틸리티 선택"]
---

# JavaScript 유틸리티 라이브러리 선택

유틸리티 라이브러리는 배열, 객체, 문자열 가공이나 debounce 같은 반복 작업을 공통 함수로 제공한다. 선택 기준은 함수 개수나 인기도보다 실제로 필요한 입력 계약, 배포 환경, 최종 번들 크기와 기존 호출부의 이주 비용이다. 표준 API만으로 명확하게 표현되는 작업이라면 라이브러리를 추가하지 않는 선택부터 검토한다.

## 번들 크기를 결정하는 두 층

번들 크기는 **사용하지 않는 함수를 제거할 수 있는가**와 **남은 함수가 어떤 동작을 지원하는가**에 함께 좌우된다.

| 층 | 확인할 내용 | 의미 |
|---|---|---|
| 모듈과 빌드 | ESM/CJS 진입점, 개별 함수 import, side effects, production 최적화 | 사용하지 않는 코드가 결과물에 남는지 결정한다 |
| 함수의 계약 | 배열 외 입력, 타입 변환, 구형 환경, 경계 사례 지원 | 실제 사용하는 함수에 필요한 코드량을 결정한다 |

Tree shaking은 ESM의 정적 import/export 구조를 활용해 사용하지 않는 코드를 제거한다. ESM으로 작성됐다는 사실만으로 최종 제거가 보장되지는 않는다. bundler 설정, 변환 후 모듈 형식과 부수 효과 분석도 확인해야 한다. [webpack Tree Shaking](https://webpack.js.org/guides/tree-shaking/)

Lodash에는 `lodash-es`와 개별 함수 진입점도 있다. 따라서 `import { sample } from 'lodash'` 하나만 보고 모든 프로젝트에서 라이브러리 전체가 번들된다고 단정할 수 없다. 대안을 비교할 때는 기존 코드도 적절한 import와 빌드 설정을 적용한 상태로 측정한다. [Lodash Module Formats와 Installation](https://lodash.com/)

## 좁은 입력 계약과 명시적 변환

`es-toolkit`의 기본 `sample`은 `readonly T[]`를 받는다. 객체의 값이나 문자열에서 고르려면 호출부에서 배열로 변환해 의도를 드러낼 수 있다. [es-toolkit sample](https://es-toolkit.dev/reference/array/sample.html)

```ts
import { sample } from 'es-toolkit';

const fromArray = sample([1, 2, 3]);
const fromObjectValues = sample(Object.values({ first: 1, second: 2 }));
const fromString = sample([...'hello']);
```

입력 범위를 좁히면 여러 자료형을 수용하기 위한 분기를 줄일 여지가 생긴다. 대신 변환이 여러 호출부에서 반복될 수 있고, 기존 함수의 암묵적 변환이나 경계 동작에 의존했다면 이주 작업이 필요하다. 이는 제공 기능과 호출자 책임을 어디에 둘지의 선택이다.

이전 환경을 위한 우회 코드나 폭넓은 입력 처리를 전부 불필요한 방어 로직으로 취급해서는 안 된다. 지원 대상에 그 환경이나 동작이 포함되면 필요한 계약이다. es-toolkit도 구형 브라우저 지원에는 dependency transpilation과 사용하는 런타임 API의 polyfill을 안내한다. 이 비용까지 포함해 최종 크기를 비교한다. [es-toolkit Browser Support](https://es-toolkit.dev/browser-support.html)

## 타입 검사와 런타임 검증의 경계

TypeScript 타입은 개발 중 잘못된 호출을 찾지만 emit된 JavaScript에서 사라지며 런타임 동작을 바꾸지 않는다. 타입 선언을 추가했다고 외부 입력을 검증하는 코드가 생기지는 않는다. [TypeScript Erased Types](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#erased-types)

- API 응답, 사용자 입력과 저장 데이터는 신뢰 경계에서 실제 값과 필요한 제약을 검증한다.
- `any`, 타입 단언이나 JavaScript 호출부로 잘못된 값이 들어오는 상황을 타입만으로 막을 수 없다.
- 배열 타입은 비어 있지 않다는 업무 조건까지 표현하지 않는다. 무작위 항목이 반드시 필요하면 빈 입력 정책도 정해야 한다.

안전한 흐름은 외부 값 검증 후 정해진 내부 타입으로 가공하고 유틸리티에 전달하는 것이다. 유틸리티의 입력 계약을 좁히는 것과 신뢰 경계의 검증을 제거하는 것은 별개다.

## 기본 API와 호환 API의 역할

`es-toolkit/compat`는 기존 Lodash 호출 형태를 유지하면서 이주할 수 있게 하는 호환 계층이다. 기본 API보다 추가 동작을 제공하므로 두 경로의 번들 크기나 실행 비용이 같다고 전제하지 않는다.

| 경로 | 적합한 상황 | 먼저 확인할 점 |
|---|---|---|
| 표준 JavaScript API | 필요한 동작이 간단하고 의미가 명확함 | 기존 유틸리티와 경계 동작이 같은가 |
| `es-toolkit` | 새로운 호출부이거나 입력 계약을 정리할 수 있음 | 함수별 인자와 반환값, 지원 환경 |
| `es-toolkit/compat` | Lodash 의존 호출부를 단계적으로 옮김 | 사용 함수의 구현 상태와 호환 범위 |
| 기존 Lodash 유지 | 교체 이익보다 변경 비용이 크거나 필요한 계약이 다름 | 실제 병목과 유지보수, 보안 상태 |

2026-10-15 확인한 공식 compat 문서는 Lodash 테스트 통과를 근거로 v1.39.3부터 100% 호환을 안내하면서도, 같은 페이지의 설계 원칙에는 realm, 내장 prototype 변경과 method chaining 등을 범위 밖으로 적고 있다. 암묵적 타입 변환의 설명도 절마다 범위가 달라 보인다. 이 문구를 모든 Lodash 사용 방식의 완전한 대체 보장으로 확대하지 말고 실제 사용 함수와 입력을 대조한다. [es-toolkit/compat](https://es-toolkit.dev/compat/intro.html)

호환 계층의 제품적 가치는 교체에 필요한 초기 변경을 줄인다는 데 있다. 먼저 import를 바꿔 동작을 확인하고, 이후 호출부를 정리해 기본 API로 옮길 수 있다. 다만 namespace/default import나 chaining까지 기계적으로 치환해도 된다는 의미는 아니다.

## 성능 수치 읽기

번들 벤치마크와 실행 속도 벤치마크는 다른 문제를 측정한다. 함수 하나의 크기 차이가 서비스 전체의 같은 비율 감소로 이어지거나, 유틸리티 실행 속도 차이가 페이지 응답 시간의 같은 비율 개선으로 이어지지는 않는다.

- **번들 크기**: 공식 표의 `sample`은 es-toolkit 1.49.0에서 94 bytes, lodash-es 4.18.1에서 4,849 bytes다. esbuild 0.28.0으로 단일 함수를 import해 사용하는 코드를 측정한 결과이며 서비스 전체나 gzip/Brotli 전송량으로 대신 읽지 않는다. [Bundle Footprint](https://es-toolkit.dev/bundle-size.html)
- **실행 속도**: 공식 표는 es-toolkit 1.49.0과 lodash 4.18.1을 Node.js 24.11.1, Windows x64, i5-13400F 환경에서 비교한다. `pick`은 3.9배지만 `union`은 0.8배, `unionBy`는 0.9배로 표시된다. 함수와 입력에 관계없이 항상 빠르다고 일반화할 수 없다. [Performance](https://es-toolkit.dev/performance.html)

실제 평가에서는 패키지 버전, 함수 목록, 데이터 형태와 크기, 기본/compat 경로, bundler 설정과 압축 여부를 고정한다. 브라우저 서비스라면 실제 청크 크기, 전송량과 사용자 지연을, 서버라면 해당 함수가 차지하는 CPU 비중과 처리 시간을 확인한다. 로컬 또는 서비스 벤치마크는 이 문서 작성 과정에서 실행하지 않았다.

## 이주 확인 순서

1. 전체 Lodash import와 사용하는 함수, chaining, shorthand와 암묵적 변환 의존을 찾는다.
2. 현재 production 빌드와 대표 입력의 결과를 기준으로 남긴다.
3. 작은 경계부터 compat 또는 기본 API로 옮기고 빈 값, `null`/`undefined`, 반환 형태와 원본 변경 여부를 확인한다.
4. 비교 조건을 유지해 번들, 실행 비용과 호출부 복잡도를 다시 측정한다.
5. 기존 의존이 남지 않았는지 확인한 뒤 제거한다. 성능 이득이 작고 계약 변경 비용이 크면 유지를 선택할 수 있다.

릴리스 간격이나 인기 지표만으로 Lodash의 유지보수가 중단됐다고 단정하지 않는다. 유지보수와 보안 상태는 선택 시점의 공식 지원 정보, 릴리스와 보안 공지를 별도로 확인한다.

## 출처

- [거인을 쓰러트리고 있는 토스 — Velog, Antoliny Lee](https://velog.io/@antoliny0919/거인을-쓰러트리고-있는-토스)
- [es-toolkit — GitHub, Toss](https://github.com/toss/es-toolkit)
- [es-toolkit, sample](https://es-toolkit.dev/reference/array/sample.html)
- [es-toolkit, Browser Support](https://es-toolkit.dev/browser-support.html)
- [es-toolkit, Lodash Compatibility](https://es-toolkit.dev/compat/intro.html)
- [es-toolkit, Bundle Footprint](https://es-toolkit.dev/bundle-size.html)
- [es-toolkit, Performance](https://es-toolkit.dev/performance.html)
- [TypeScript, The Basics](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)
- [webpack, Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- [Lodash](https://lodash.com/)

## 관련 문서

- [[JavaScript-ES-Modules|ES Modules와 모듈 그래프]]
- [[Runtime-Validation-Libraries|외부 입력의 런타임 검증]]
- [[TS-Any-Boundaries|any가 만드는 타입 경계]]
