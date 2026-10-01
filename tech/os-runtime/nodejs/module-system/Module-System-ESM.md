---
tags: [runtime, nodejs]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["ESM", "ES Modules"]
---

# ESM 모듈 시스템

ES Modules는 정적으로 분석 가능한 import/export 그래프와 live binding을 제공하는 JavaScript 표준 모듈 시스템이다. 동적 `import()`는 비동기이고 top-level `await`는 모듈 평가를 비동기로 만들 수 있지만, ESM 자체를 항상 비동기 로딩으로 단정하면 안 된다. 모듈 그래프의 1회 평가와 async 모듈의 평가 지연 같은 언어 의미론은 [[JavaScript-ES-Modules|JavaScript ES Modules]]가 정본이고, 이 문서는 Node.js의 로딩과 상호운용을 다룬다.

## ESM 3단계 로딩

### 1. Construction (파싱)

소스 코드를 정적으로 분석하여 모든 import/export 문을 식별한다. 이 단계에서 전체 의존성 그래프가 구성된다. import가 정적이므로 조건문 안에 넣을 수 없다.

### 2. Instantiation (인스턴스화)

각 export에 대한 메모리 슬롯을 할당하고 import 측에 읽기 전용 바인딩(live binding)을 생성한다. 이 시점에서는 아직 값이 할당되지 않았지만, 메모리 구조가 준비된다.

### 3. Evaluation (실행)

모듈 코드를 실행하여 export 슬롯에 실제 값을 할당한다. 의존성 그래프의 리프 노드부터 실행되며 각 모듈은 한 번만 실행된다.

## Live Bindings

ESM의 import는 export된 binding의 값을 복사하지 않고 원본 binding을 참조한다(live binding). 원본 모듈에서 값이 변경되면 import한 측에서도 즉시 변경된 값을 볼 수 있다. 단, `export default 식`은 평가 시점의 값으로 초기화한 내부 `*default*` binding을 내보내므로 아래 예제에 `export default count;`를 더해도 default import는 `increment()` 뒤에 `0`으로 남는다(Node.js 26.7 확인).

```javascript
// counter.mjs
export let count = 0;
export function increment() { count++; }

// main.mjs
import { count, increment } from './counter.mjs';
console.log(count); // 0
increment();
console.log(count); // 1 (원본의 변경이 즉시 반영됨)
```

## CJS vs ESM 비교표

| 항목 | CommonJS | ESM |
|------|----------|-----|
| 해석과 연결 | `require()` 호출 시 | 정적 import/export 그래프를 link한 뒤 평가 |
| 바인딩 | `module.exports` 객체를 캐시해 반환 | 라이브 바인딩 |
| Tree-shaking | 제한적 | 가능 (정적 분석) |
| 순환 의존성 | 초기화 중인 exports를 볼 수 있음 | live binding과 temporal dead zone이 적용됨. 어느 쪽도 순환을 자동으로 해결하지 않음 |
| 조건부 로딩 | 지원 (if 내 require) | dynamic import() 필요 |
| Top-level await | 불가 | 가능 |
| Top-level `return` | 가능 (wrapper 함수 body에서 실행) | `SyntaxError` |
| this | module.exports | undefined |

CommonJS 파일은 module wrapper 함수 body로 실행되므로 top level의 `return`으로 나머지 코드를 건너뛸 수 있다. ECMAScript의 Script와 Module 문법은 top level에 `return`을 허용하지 않으므로 이런 파일을 ESM으로 옮기면 `SyntaxError: Illegal return statement`가 난다(Node.js 26.7 확인).

## 모듈 캐시와 쿼리 스트링 재로딩

ESM 로더는 모듈을 해석된 URL 단위로 캐시해 같은 모듈을 여러 번 import해도 처음 평가한 인스턴스를 재사용한다. 이 캐시는 CommonJS의 `require.cache`와 별개이고, Node.js 문서에는 `delete require.cache[...]`처럼 ESM 캐시 항목을 지우는 공개 API가 없다(2026-09-30 확인). 캐시 덕분에 모듈 수준 상태는 import한 모든 곳이 공유한다([[Module-System-CommonJS|CommonJS 캐싱]]도 같다).

`file:` URL의 query나 fragment가 다르면 Node.js는 같은 파일을 별개 모듈로 다시 로드한다. ``await import(`./counter.mjs?v=${Date.now()}`)``처럼 캐시를 우회할 수 있지만 비용이 따른다.

- 쿼리마다 새 인스턴스가 생겨 카운터, 싱글턴, 커넥션 같은 모듈 수준 상태가 따로 존재하고, 한 인스턴스의 클래스로 만든 객체는 다른 인스턴스의 클래스에 대한 `instanceof`가 `false`다. 아래 듀얼 패키지 위험과 같은 구조다.
- 이전 인스턴스는 모듈 맵에 남는다. 약 0.8MB 배열을 가진 모듈을 쿼리를 바꿔 200번 import하자 GC 뒤에도 힙이 약 5MB에서 167MB로 늘었다(Node.js 26.7 확인). 장시간 실행 프로세스의 핫 리로드에 쓰면 메모리가 계속 쌓이므로 쿼리 재로딩은 개발과 테스트에 한정하고, 운영의 코드 교체는 프로세스 재시작(`node --watch`, 프로세스 매니저)으로 한다.

## 상호운용성

ESM에서 CJS를 가져오는 것은 일반적으로 동작한다. CJS의 module.exports를 ESM의 default export로 취급한다. 단, CJS의 개별 export 이름은 Node.js가 source를 정적 분석해 찾은 것만 named export로 제공하므로 `import { name }`으로 가져올 수 있는지는 Node.js 버전과 CJS의 export 작성 방식에 따라 다르다. named import의 `{ }`는 구조 분해가 아니라 import 목록이며, 분석이 찾지 못한 이름은 default import로 받은 `module.exports`에서 꺼낸다.

CJS에서 ESM을 가져오는 방식은 Node.js 버전과 ESM 그래프에 따라 다르다. 현재 Node.js는 top-level `await`가 없는 **동기 ESM 그래프**를 `require()`로 불러올 수 있다. top-level `await`가 있거나 지원 범위를 넓혀야 하면 CJS와 ESM 모두에서 가능한 비동기 `import()`를 사용한다. 배포 대상 Node.js 버전에서 직접 검증한다.

ESM에는 CommonJS 전역 `__filename`, `__dirname`이 제공되지 않는다. 다만 현재 Node.js의 `file:` 모듈에서는 `import.meta.filename`, `import.meta.dirname`을 제공한다. 브라우저 등 다른 host까지 고려하면 `import.meta.url`과 `fileURLToPath` 조합이 이식성 있는 대안이다.

```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

```javascript
// Node.js의 file: ESM에서만 사용
const filename = import.meta.filename;
const dirname = import.meta.dirname;
```

## package.json exports 필드

`exports` 필드는 패키지의 진입점을 정밀하게 제어한다. `main` 필드보다 우선하며 조건부 exports로 CJS/ESM을 동시에 지원할 수 있다.

```json
{
  "exports": {
    ".": {
      "import": "./esm/index.mjs",
      "require": "./cjs/index.js",
      "default": "./cjs/index.js"
    },
    "./utils": {
      "import": "./esm/utils.mjs",
      "require": "./cjs/utils.js"
    }
  }
}
```

| 조건 키 | 매칭 시점 |
|---------|---------|
| `node-addons` | Node.js 환경. `--no-addons`로 끌 수 있어 네이티브 애드온을 쓰는 진입점에 둔다 |
| `node` | Node.js 환경 |
| `import` | `import`, `import()`와 `import.meta.resolve()` 같은 ESM 로더의 해석. 대상 파일 형식과 무관 |
| `require` | `require()`로 로드될 때. 대상은 CJS, JSON, 애드온, ESM처럼 `require()`로 불러올 수 있어야 한다 |
| `module-sync` | `import`, `import()`, `require()` 모두. `require(esm)`이 켜져 있을 때만 인식하며 대상은 top-level `await` 없는 ESM |
| `default` | 항상 매칭되는 폴백. 마지막에 둔다 |

객체 안에서 먼저 나온 키가 우선하므로 Node.js 문서는 위 표의 순서처럼 구체적인 조건부터 적도록 안내한다. `default`를 `module-sync` 앞에 두면 `module-sync`는 쓰이지 않는다(Node.js 26.7 확인).

서브경로 패턴으로 `"./lib/*": "./lib/*.js"` 형태의 와일드카드도 지원한다.

## 듀얼 패키지 위험 (Dual-Package Hazard)

패키지가 CJS와 ESM 소스를 따로 두고 `import`와 `require` 조건이 서로 다른 파일을 가리키거나 `pkg`와 `pkg/module`처럼 서로 다른 진입 경로가 CJS와 ESM 소스를 나눠 가리키면 한 애플리케이션에서 두 버전이 함께 로드될 수 있다. 애플리케이션 코드는 `import`로 ESM 버전을, 의존성은 `require()`로 CJS 버전을 불러오는 경우다. 두 버전은 별개 모듈 인스턴스이므로 한쪽 클래스로 만든 객체는 다른 쪽 클래스에 대한 `instanceof` 검사에서 `false`가 되고 모듈 수준 상태도 따로 존재한다. 위 `exports` 예시의 `import`, `require` 분기가 이 구조이며, `require(esm)`을 지원하는 Node.js에서도 두 조건이 다른 소스를 가리키면 인스턴스가 둘로 나뉜다(Node.js 26.7 확인).

`require(esm)`은 이 위험을 피하는 선택지를 새로 만든다. `require()`는 20.x에서 v20.19.0, 22.x에서 v22.12.0, 23 이후는 v23.0.0부터 플래그 없이 ESM을 불러오고, v25.4.0과 v24.15.0에서 실험 단계를 벗어났다. top-level `await`가 없는 ESM 빌드 하나를 `import`와 `require()` 양쪽에 제공하면 두 경로가 같은 모듈 인스턴스를 받는다(Node.js 26.7 확인). `require(esm)`이 없는 Node.js를 지원하지 않으면 `default`가 ESM 빌드를 가리키는 ESM 전용 배포로 충분하다. 그런 Node.js까지 지원해야 하면 `import`, `import()`, `require()` 어느 쪽에도 매칭되는 `module-sync` 조건에 ESM 빌드를 두고 `default`에 CJS 빌드를 둔다. `module-sync`를 인식하지 않는 Node.js에서는 두 경로 모두 `default`의 CJS 빌드로 내려가므로 인스턴스가 하나로 유지된다. 단, ESM 그래프에 top-level `await`가 있으면 `require()`가 `ERR_REQUIRE_ASYNC_MODULE`을 던지고, 기능을 끈 프로세스에서는 ESM 전용 패키지를 `require()`하면 `ERR_REQUIRE_ESM`이 나며 `module-sync`도 매칭되지 않는다. 끄는 플래그는 v24.15.0 이후 24.x와 v25.4.0 이후에서 `--no-require-module`이고, 20.x, 22.x, 23.x, v24.15.0 이전 24.x와 v25.4.0 이전 25.x에서는 `--no-experimental-require-module`이다. 이름이 바뀐 버전에서도 이전 이름은 legacy alias로 동작한다(v24.15.0, v25.4.0, v26.7.0 확인).

`require(esm)`을 전제로 할 수 없던 시기의 완화 방법은 아래 두 가지다. Node.js는 이 설명을 Packages 문서에서 `nodejs/package-examples` 저장소로 옮겼고, 저장소는 `require(esm)` 지원 이후 상당 부분이 낡았으니 새 패키지에는 당분간 따르지 말라고 표시한다(2026-09-28 확인). 두 방법의 결과는 Node.js 26.7에서 확인했다.

```
1. ESM 래퍼 접근법: CJS로 구현하거나 ESM 소스를 CJS로 트랜스파일하고,
   ESM 진입점은 CJS를 import해 named export를 다시 내보내는 얇은 래퍼로 둔다.
   CJS가 함수나 객체 하나를 내보내거나 default import를 지원하려면 default export도 둔다.
   → 두 경로가 같은 CJS 인스턴스를 공유하므로 클래스와 상태가 갈라지지 않는다.
2. 상태 격리: CJS와 ESM 버전을 모두 두되 패키지를 stateless로 만들거나,
   상태를 인스턴스화한 객체 또는 양쪽 진입점이 함께 불러오는 CJS 파일에 둔다.
   → 공유 CJS 파일의 상태는 하나지만 패키지 코드는 두 번 로드된다.
     클래스를 각 진입 파일에 정의하면 instanceof는 여전히 갈라지고,
     싱글턴에 붙는 플러그인은 양쪽에 따로 붙어야 한다.
```

상세 배포 전략은 [[Package-Publishing|패키지 배포]] 참조.

## Node-API와 ABI 안정성

**Node-API**(구 N-API)는 네이티브 애드온을 위한 Node.js 메이저 버전 간 ABI 안정성을 제공한다. 다만 해당 애드온이 Node-API만 사용하고 외부 네이티브 라이브러리와 대상 OS, 아키텍처가 호환될 때의 보장이다.

```
ABI vs API:
- API: 소스 코드 레벨의 인터페이스. 컴파일 시 검증.
- ABI: 바이너리 레벨의 인터페이스. 런타임 호환성 결정.
  → ABI가 변경되면 네이티브 모듈을 재컴파일해야 한다.

Node-API의 핵심 가치:
- 지원하는 Node-API 버전 안에서는 Node.js 메이저 업그레이드 때 재컴파일을 피할 수 있음
- V8 내부 API 변경과 분리됨. V8, libuv, Node.js C++ API를 함께 쓰면 같은 보장이 적용되지 않음
- 필요한 Node-API 버전과 배포 대상 플랫폼을 명시해 호환성을 검증
```

## 출처

- [Node.js, Modules: Packages](https://nodejs.org/api/packages.html)
- [Node.js, ECMAScript modules](https://nodejs.org/api/esm.html)
- [Node.js, Node-API](https://nodejs.org/api/n-api.html)
- [Node.js, Modules: CommonJS modules](https://nodejs.org/api/modules.html#the-module-wrapper)
- [Node.js, Modules: CommonJS modules, Loading ECMAScript modules using require()](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require)
- [Node.js, Modules: Packages, Conditional exports](https://nodejs.org/api/packages.html#conditional-exports)
- [Node.js, Command-line API, --no-require-module](https://nodejs.org/api/cli.html#--no-require-module)
- [Node.js v24, Command-line API, --no-require-module](https://nodejs.org/docs/latest-v24.x/api/cli.html#--no-require-module)
- [Node.js v24, Modules: CommonJS modules, Loading ECMAScript modules using require()](https://nodejs.org/docs/latest-v24.x/api/modules.html#loading-ecmascript-modules-using-require)
- [Node.js v22, Command-line API, --no-experimental-require-module](https://nodejs.org/docs/latest-v22.x/api/cli.html#--no-experimental-require-module)
- [ECMAScript Language Specification, Scripts](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-scripts)
- [ECMAScript Language Specification, Modules](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-modules)
- [모던 자바스크립트 딥다이브 스터디 #2-2 (CH12 함수) — FE재남](https://www.youtube.com/watch?v=KiyJliK94fs)
- [Dual CommonJS/ESM package distributions — Node.js package-examples](https://github.com/nodejs/package-examples/blob/main/guide/07-dual-packages/README.md)
- [Shipping ESM for CommonJS consumers — Node.js package-examples](https://github.com/nodejs/package-examples/blob/main/guide/04-cjs-esm-interop/shipping-esm-for-cjs/README.md)
- [Node.js 22.10.0, New module-sync exports condition — Node.js Blog](https://nodejs.org/en/blog/release/v22.10.0#new-module-sync-exports-condition)
- [Node.js, ECMAScript modules, URLs](https://nodejs.org/api/esm.html#urls)
- [Node.js, ECMAScript modules, No require.cache](https://nodejs.org/api/esm.html#no-requirecache)
- [인프런, 얄팍한 코딩사전, 모듈 1 - CommonJS](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=268910)
- [인프런, 얄팍한 코딩사전, 모듈 2 - ES Module](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=268911)

## 관련 문서
- [[JavaScript-ES-Modules|JavaScript ES Modules]]
- [[Module-System-CommonJS|CommonJS 모듈 시스템]]
- [[Module-System|모듈 시스템 인덱스]]
- [[Package-Publishing|패키지 배포]]
- [[Async-Internals|비동기 내부 동작]]
