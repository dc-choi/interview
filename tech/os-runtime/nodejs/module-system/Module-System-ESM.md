---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["ESM", "ES Modules"]
---

# ESM 모듈 시스템

ES Modules는 CommonJS와 달리 비동기 로딩, 정적 분석, live binding을 지원하는 JavaScript 표준 모듈 시스템이다.

## ESM 3단계 로딩

### 1. Construction (파싱)

소스 코드를 정적으로 분석하여 모든 import/export 문을 식별한다. 이 단계에서 전체 의존성 그래프가 구성된다. import가 정적이므로 조건문 안에 넣을 수 없다.

### 2. Instantiation (인스턴스화)

각 export에 대한 메모리 슬롯을 할당하고, import 측에 읽기 전용 바인딩(live binding)을 생성한다. 이 시점에서는 아직 값이 할당되지 않았지만, 메모리 구조가 준비된다.

### 3. Evaluation (실행)

모듈 코드를 실행하여 export 슬롯에 실제 값을 할당한다. 의존성 그래프의 리프 노드부터 실행되며, 각 모듈은 한 번만 실행된다.

## Live Bindings

ESM의 exports는 값의 복사가 아니라 원본에 대한 참조(live binding)이다. 원본 모듈에서 값이 변경되면 import한 측에서도 즉시 변경된 값을 볼 수 있다.

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
| 시점 | 런타임 | 파싱타임 |
| 바인딩 | 값 복사 | 라이브 참조 |
| Tree-shaking | 제한적 | 가능 (정적 분석) |
| 순환 의존성 | 불완전 exports 반환 | Live Bindings로 해결 |
| 조건부 로딩 | 지원 (if 내 require) | dynamic import() 필요 |
| Top-level await | 불가 | 가능 |
| this | module.exports | undefined |

## 상호운용성

ESM에서 CJS를 가져오는 것은 일반적으로 동작한다. CJS의 module.exports를 ESM의 default export로 취급한다. 단, CJS의 named exports를 직접 구조 분해할 수 있는지는 Node.js 버전과 패키지 구성에 따라 다르다.

CJS에서 ESM을 가져오는 것은 제한적이다. static require()로는 ESM을 불러올 수 없고, async dynamic import()만 사용 가능하다. 이는 ESM의 비동기 로딩 특성 때문이다.

ESM에서는 __filename과 __dirname이 제공되지 않는다. 대신 import.meta.url과 fileURLToPath를 조합하여 재구성할 수 있다.

```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

## package.json exports 필드

`exports` 필드는 패키지의 진입점을 정밀하게 제어한다. `main` 필드보다 우선하며, 조건부 exports로 CJS/ESM을 동시에 지원할 수 있다.

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
| `import` | ESM `import`로 로드될 때 |
| `require` | CJS `require()`로 로드될 때 |
| `node` | Node.js 환경에서만 |
| `default` | 위 조건에 해당하지 않는 폴백 |

서브경로 패턴으로 `"./lib/*": "./lib/*.js"` 형태의 와일드카드도 지원한다.

## 듀얼 패키지 위험 (Dual-Package Hazard)

동일한 패키지가 애플리케이션 내에서 CJS와 ESM 양쪽으로 로드되면, 두 개의 별도 인스턴스가 생성된다. 이 경우 `instanceof` 검사가 실패하고, 모듈 수준 상태가 분리된다.

```
완화 방법:
1. ESM 래퍼 접근법: CJS로 구현하고 ESM은 얇은 래퍼만 제공.
   → CJS 인스턴스가 하나만 존재하므로 상태 분리 없음.
2. 상태 격리: 공유 상태를 별도 패키지로 분리하여 양쪽에서 동일 인스턴스 참조.
```

상세 배포 전략은 [[Package-Publishing|패키지 배포]] 참조.

## Node-API와 ABI 안정성

**Node-API**(구 N-API)는 네이티브 애드온을 위한 안정적인 ABI(Application Binary Interface)를 제공한다. v8.12.0에서 안정화되었다.

```
ABI vs API:
- API: 소스 코드 레벨의 인터페이스. 컴파일 시 검증.
- ABI: 바이너리 레벨의 인터페이스. 런타임 호환성 결정.
  → ABI가 변경되면 네이티브 모듈을 재컴파일해야 한다.

Node-API의 핵심 가치:
- Node.js 메이저 버전 업그레이드 시 네이티브 애드온 재컴파일 불필요
- V8 내부 API 변경에 영향받지 않음
- 누적 버전 관리: N-API v3를 지원하면 v1, v2도 모두 지원
```

## 관련 문서
- [[Module-System-CommonJS|CommonJS 모듈 시스템]]
- [[Module-System|모듈 시스템 인덱스]]
- [[Package-Publishing|패키지 배포]]
- [[Async-Internals|비동기 내부 동작]]
