---
tags: [cs, typescript, build, tooling]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript 빌드 산출물 관리", "outDir 정리", "tsbuildinfo"]
verified_at: 2026-10-01
---

# 빌드 산출물 관리 (outDir, incremental, exclude, removeComments)

[[option|컴파일러 옵션]]에서 emit 산출물 관리만 떼어 둔 문서다. `tsc`는 현재 입력에 대응하는 파일을 쓸 뿐 이전 빌드가 남긴 파일을 정리하지 않고, incremental 정보가 남아 있으면 emit 자체를 건너뛸 수 있다. 아래 동작은 5.9.3, 6.0.3, 7.0.2에서 재현했다.

## outDir에는 이전 산출물이 남는다

`src/index.ts`를 `src/sum.ts`로 바꾸고 다시 빌드하면 `dist`에 `sum.js`, `sum.d.ts`와 함께 이전 `index.js`, `index.d.ts`가 남는다. 삭제한 코드가 다음 경로로 계속 실행되거나 배포된다.

- `dist` 아래 glob으로 파일을 적재하는 설정(TypeORM의 entities, migrations glob 등)
- `node dist/old.js` 같은 직접 실행과 `dist` 전체를 발행하는 npm 패키지
- `dist`를 스캔하는 테스트와 도구

`tsc -b --clean`은 현재 입력에 대응하는 출력과 `.tsbuildinfo`만 지운다. 이름을 바꾼 뒤 실행해도 이전 `index.js`, `index.d.ts`는 남으므로 고아 파일은 outDir 전체를 지워야 없어진다. 빌드 스크립트에서 outDir을 먼저 지우고, 배포 산출물은 로컬 파일이 섞이지 않은 깨끗한 CI checkout에서 만든다. `rimraf dist && tsc`의 rimraf는 Windows에 `rm -rf`가 없는 문제를 피하는 크로스 플랫폼 삭제 도구이며, 의존성을 늘리지 않으려면 Node 내장 `fs.rmSync`로 같은 일을 한다. 단, incremental 설정에서 buildinfo가 outDir 밖에 생기면 outDir만 지우는 스크립트는 다음 절의 함정에 빠지므로 그 buildinfo도 함께 지운다. 아래 예시는 NestJS starter의 `tsconfig.build.json`처럼 루트에 `tsconfig.build.tsbuildinfo`가 생기는 구성을 가정한다.

```json
{
  "scripts": {
    "clean": "node -e \"const { rmSync } = require('node:fs'); for (const path of ['dist', 'tsconfig.build.tsbuildinfo']) rmSync(path, { recursive: true, force: true })\"",
    "build": "npm run clean && tsc -p tsconfig.build.json"
  }
}
```

## incremental과 outDir 삭제

`incremental`(`composite`면 기본으로 켜짐)은 이전 빌드 정보를 `.tsbuildinfo`에 저장하고 바뀐 것이 없으면 emit을 건너뛴다. buildinfo의 기본 위치는 다음과 같다.

- `outDir`만 있으면 `<outDir>/<config 이름>.tsbuildinfo`라 outDir과 함께 지워진다.
- `rootDir`와 `outDir`가 모두 있으면 `<outDir>/<rootDir에서 config까지의 상대 경로>/<config 이름>.tsbuildinfo`다. `rootDir: "src"`, `outDir: "dist"`, 루트의 `tsconfig.json`이면 `./tsconfig.tsbuildinfo`로 outDir 밖에 생긴다.

buildinfo가 outDir 밖에 남은 상태에서 outDir만 지우면 `tsc -p .`도 `tsc -b .`도 아무것도 emit하지 않고 종료 코드 0으로 끝난다. 6.0 이상에서 TS5011을 피하려고 `rootDir: "./src"`를 명시하면 이 조건이 된다. NestJS 12 starter(`@nestjs/schematics` 12.0.6 application 템플릿)의 `tsconfig.build.json`도 `rootDir: "./src"`와 상속한 `incremental: true` 때문에 루트에 `tsconfig.build.tsbuildinfo`를 만든다. 로컬 buildinfo만 복사되고 dist가 빠진 빌드 환경도 같은 조건이다.

- 정리 스크립트에서 outDir과 `*.tsbuildinfo`를 함께 지우거나, `tsBuildInfoFile`을 outDir 안으로 지정하거나, `tsc -b --clean` 뒤 outDir을 지운다.
- CI에서는 빌드 종료 코드만 믿지 않고 기대 산출물(예: `dist/main.js`)이 있는지 확인한다.
- NestJS CLI의 `deleteOutDir`는 11.0.17 이하에서 outDir만, 11.0.18부터 11.0.24까지 outDir과 명시한 `tsBuildInfoFile`만 지워 기본 위치의 buildinfo가 남는다. 12.0.0부터는 컴파일러가 계산한 기본 위치의 buildinfo도 지운다(@nestjs/cli 11.0.0~11.0.24, 12.0.0~12.0.8 각 릴리스의 패키지 코드 기준).

## exclude를 직접 적으면 outDir 기본 제외가 사라진다

`include`를 생략하면 `**/*`가 기본이고, `exclude`를 생략하면 `node_modules`, `bower_components`, `jspm_packages`와 `outDir`이 기본으로 제외된다. `exclude`를 직접 적으면 이 기본값이 대체된다. `include` 없이 `exclude: ["**/*.test.ts"]`만 적고 `declaration: true`로 두 번 빌드하면 첫 빌드가 만든 `dist/src/a.d.ts`가 입력으로 잡혀 TS5055(Cannot write file ... because it would overwrite input file)가 난다.

- `include`를 `src`로 좁혀 outDir을 입력 범위 밖에 두거나, `exclude`를 직접 적을 때 outDir도 함께 적는다. NestJS starter의 `tsconfig.build.json`이 `exclude`에 `dist`를 적는 이유다.
- 실제 입력은 `tsc --showConfig`의 `files` 목록으로 확인한다.
- `**` 와일드카드는 `exclude`와 관계없이 `node_modules`로 내려가지 않았고, import로 해석된 파일은 `exclude`와 무관하게 프로그램에 포함된다. `exclude`의 `node_modules`는 관례에 가깝다.

## removeComments의 범위

`removeComments: true`는 JavaScript 출력에서 줄 주석, 블록 주석, 인라인 주석과 JSDoc을 모두 지운다.

- `declaration: true`면 `.d.ts`의 JSDoc도 지워진다. 라이브러리를 발행하면 소비자 IDE의 호버 문서와 `@deprecated` 같은 태그 정보가 사라지므로 발행용 선언 파일은 주석을 유지하는 구성을 따로 둔다.
- 파일 맨 앞에 있고 다음 코드와 빈 줄로 떨어진 `/*!` 주석(저작권 헤더)만 JavaScript와 `.d.ts`에 남는다. 파일 중간의 `/*!`와 `@license` JSDoc은 지워진다.
- 보안 수단이 아니다. `sourceMap`과 `inlineSources`를 함께 켜면 원본 TypeScript가 주석째 map의 `sourcesContent`에 들어가고, bundler 설정으로 원본을 map에 담아 배포해도 같다. 비밀값과 내부 정보는 처음부터 소스와 주석에 두지 않는다.

## 출처

- [TypeScript TSConfig, include](https://www.typescriptlang.org/tsconfig/#include)
- [TypeScript TSConfig, exclude](https://www.typescriptlang.org/tsconfig/#exclude)
- [TypeScript TSConfig, incremental](https://www.typescriptlang.org/tsconfig/incremental.html)
- [TypeScript TSConfig, tsBuildInfoFile](https://www.typescriptlang.org/tsconfig/tsBuildInfoFile.html)
- [TypeScript TSConfig, removeComments](https://www.typescriptlang.org/tsconfig/removeComments.html)
- [TypeScript TSConfig, inlineSources](https://www.typescriptlang.org/tsconfig/inlineSources.html)
- [TypeScript Handbook, Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [NestJS, Monorepo](https://docs.nestjs.com/cli/monorepo#global-compiler-options)
- [delete-out-dir.ts — nestjs/nest-cli](https://github.com/nestjs/nest-cli/blob/master/lib/compiler/helpers/delete-out-dir.ts)
- [application tsconfig.build.json 템플릿 — nestjs/schematics](https://github.com/nestjs/schematics/blob/master/src/lib/application/files/ts/tsconfig.build.json)
- [인프런, yongsoocho, include와 exclude](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136792)
- [인프런, yongsoocho, outDir와 rootDir](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136793)
- [인프런, yongsoocho, extends](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136800)

## 관련 문서

- [[option|컴파일러 옵션]]
- [[compile|컴파일과 emit]]
- [[TypeScript-AST|TypeScript와 AST (incremental 빌드의 의미)]]
- [[Monorepo-CICD|모노레포 CI/CD (composite와 incremental)]]
