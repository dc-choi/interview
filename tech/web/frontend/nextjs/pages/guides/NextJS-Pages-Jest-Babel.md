---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Babel을 쓰는 Pages 프로젝트의 Jest 수동 구성"]
---

# Babel을 쓰는 Pages 프로젝트의 Jest 수동 구성

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## Next compiler 대안의 책임

Next 12부터의 next/jest 자동설정과 다르게 compiler를 제외하고 Babel을 선택한 기존 앱은 babel-jest와 identity-obj-proxy를 추가 설치하고 transform/mock/coverage를 직접 구성한다. 기본 공통 Jest 의존성/설치는 [[NextJS-Testing-Unit#Jest 설치와 설정]]을 따른다.

```sh
npm install -D babel-jest identity-obj-proxy
```

```js
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageProvider: 'v8',
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}', '!**/*.d.ts', '!**/node_modules/**',
    '!<rootDir>/out/**', '!<rootDir>/.next/**', '!<rootDir>/*.config.js',
    '!<rootDir>/coverage/**',
  ],
  moduleNameMapper: {
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    '^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '@next/font/(.*)': '<rootDir>/__mocks__/nextFontMock.js',
    'next/font/(.*)': '<rootDir>/__mocks__/nextFontMock.js',
    'server-only': '<rootDir>/__mocks__/empty.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  testEnvironment: 'jsdom',
  transform: { '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }] },
  transformIgnorePatterns: ['/node_modules/', '^.+\\.module\\.(css|sass|scss)$'],
}
```

moduleNameMapper에서 CSS Module을 먼저 매칭해 class 이름 proxy를 반환하고 일반 CSS는 빈 object로 넘긴다. 이미지 import는 file stub이며 png/jpg/jpeg/gif/webp/avif/ico/bmp/svg 전부 매핑한다. @next/font는 과거 namespace, next/font는 현재 namespace다. alias는 실제 tsconfig/jsconfig paths와 맞춘다. server-only를 빈 모듈로 넘긴 것은 테스트용 격리이며 server secret을 client에서 사용해도 된다는 의미가 아니다.

coverage는 소스 js/jsx/ts/tsx에서 declaration/node_modules/out/.next/root config/coverage 출력을 제외한다. testPathIgnorePatterns는 테스트 파일 탐색, transformIgnorePatterns는 변환 대상 제외다. 이 둘을 같은 효과로 해석하지 않는다. v8 provider 관련 원문의 Node14 설명은 과거 배경이며 현재 Next runtime 요구를 낮추지 않는다.

## stylesheet, image와 font mock

```js
// __mocks__/fileMock.js
module.exports = 'test-file-stub'
```

```js
// __mocks__/styleMock.js와 __mocks__/empty.js 각각 같은 내용
module.exports = {}
```

```js
// __mocks__/nextFontMock.js
module.exports = new Proxy({}, {
  get() {
    return () => ({
      className: 'className', variable: 'variable',
      style: { fontFamily: 'fontFamily' },
    })
  },
})
```

font 이름별 getter가 같은 반환 함수를 만들어 className/variable/style.fontFamily를 소비하는 UI를 렌더한다. 실제 font download/preload/metric 동작을 검증하는 mock은 아니다. image/style import도 시험 중 asset 바이트를 다운로드하지 않는 경로다.

```js
// jest.setup.js
import '@testing-library/jest-dom'
```

원문 setup은 optional이며 사용하면 above setupFilesAfterEnv를 활성화한다. Jest가 CJS/ESM 중 어느 모드인지 프로젝트 설정에 맞춘다. 소스 자체는 next/babel preset으로 babel-jest가 변환한다. SWC 자동설정과 이 수동 설정을 섞으면 겹치는 mock/transform이 생길 수 있어 선택한 compiler 경로만 구성한다.

## alias와 검증 범위

```json
{
  "compilerOptions": {
    "module": "esnext", "moduleResolution": "bundler", "baseUrl": "./",
    "paths": { "@/components/*": ["components/*"] }
  }
}
```

Jest mapper의 `'^@/components/(.*)$': '<rootDir>/components/$1'`와 같은 실제 위치다. 테스트는 pages 밖에 두고 설치된 dependency를 못 찾는 실패, CSS/image/font mock이 없는 import 실패, alias 해석 오류를 각각 구분한다. Jest 공식 config/static asset 문서와 next/jest 구현은 옵션을 더 확인하는 자료이며 전체 external manual을 이 지식노트 범위로 복제하지 않는다.

## 출처

- [Next.js, Jest](https://nextjs.org/docs/pages/guides/testing/jest)

## 관련 문서

- [[NextJS-Pages-Testing]]
- [[NextJS-Testing-Unit]]
- [[NextJS-Pages-PostCSS-Babel]]
