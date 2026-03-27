---
tags: [runtime, nodejs]
status: note
category: "OS & Runtime"
aliases: ["패키지 배포"]
---

# 패키지 배포 (Package Publishing)

## 배포 전략 개요

| 전략 | `type` 필드 | 진입점 | 적합 대상 |
|------|------------|--------|---------|
| CJS 전용 | 생략 또는 `"commonjs"` | `"main": "index.js"` | 레거시 호환 필요 |
| ESM 전용 | `"module"` | `"main": "index.js"` | 최신 프로젝트 |
| CJS + ESM 듀얼 | `"commonjs"` | `"exports"` 조건부 | 라이브러리 배포 |
| ESM 래퍼 | `"commonjs"` | CJS 코어 + ESM 래퍼 | 점진적 전환 |

## CJS 전용 배포
```json
{
  "name": "my-package",
  "type": "commonjs",
  "main": "index.js"
}
```

## ESM 전용 배포
```json
{
  "name": "my-package",
  "type": "module",
  "main": "index.js"
}
```
- `.js` 파일이 ESM으로 해석됨
- CJS가 필요한 경우 `.cjs` 확장자 사용

## CJS + ESM 듀얼 배포

### exports 조건부 설정
```json
{
  "name": "my-package",
  "type": "commonjs",
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

### ESM 래퍼 패턴
CJS에서 구현하고, ESM은 얇은 래퍼만 제공하는 방식. 듀얼 패키지 위험을 줄인다.
```js
// esm/wrapper.mjs
import cjsModule from '../cjs/index.js';
export const { method1, method2 } = cjsModule;
export default cjsModule;
```

### 조건부 exports 키워드

| 조건 | 설명 |
|------|------|
| `import` | ESM `import`로 로드될 때 |
| `require` | CJS `require()`로 로드될 때 |
| `node` | Node.js 환경에서 |
| `default` | 위 조건에 해당하지 않는 폴백 |

### 서브경로 패턴
```json
{
  "exports": {
    ".": "./index.js",
    "./lib/*": "./lib/*.js",
    "./package.json": "./package.json"
  }
}
```

## 파일 확장자 규칙

| 확장자 | `"type": "module"` 없을 때 | `"type": "module"` 있을 때 |
|--------|-------------------------|-------------------------|
| `.js` | CJS | ESM |
| `.mjs` | ESM (항상) | ESM (항상) |
| `.cjs` | CJS (항상) | CJS (항상) |

## 배포 워크플로

### 배포 전 확인
```bash
npm publish --dry-run    # 포함될 파일 목록 미리 확인
npm pack                 # 로컬에서 .tgz 생성하여 검증
npm pack --dry-run       # 패킹될 파일만 확인
```

### files 필드 (허용 목록)
```json
{
  "files": [
    "lib/",
    "esm/",
    "index.js",
    "index.mjs",
    "README.md"
  ]
}
```
- `files` 미지정 시 `.npmignore` 또는 `.gitignore` 기반으로 결정
- `files` 지정 시 허용 목록 방식으로 동작 (더 안전)

## dist-tags와 버전 관리

### dist-tag 기본 개념
```bash
npm publish                    # 자동으로 latest 태그
npm publish --tag beta         # beta 태그로 배포
npm publish --tag next         # next 태그로 배포

npm dist-tag ls my-package     # 태그 목록 확인
npm dist-tag add my-package@2.0.0 latest  # 태그 수동 변경
```

### 사용자 설치 시
```bash
npm install my-package          # latest 태그 (기본)
npm install my-package@beta     # beta 태그
npm install my-package@2.0.0    # 정확한 버전
```

## Node-API 모듈 배포
```
Node-API(구 N-API)를 사용하는 네이티브 애드온은 Node.js 메이저 버전 간 재컴파일 없이 동작한다.
배포 시 dist-tag를 활용하여 Node-API 버전과 일반 버전을 분리할 수 있다.
```

```bash
# Node-API 버전 배포
npm publish --tag n-api

# 사용자 설치
npm install my-native-addon@n-api
```

## 관련 문서
- [[Module-System|모듈 시스템]]
- [[Node.js]]
