---
tags: [runtime, deno, typescript, permissions]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Deno", "Deno Runtime"]
---

# Deno Runtime

Deno는 JavaScript, TypeScript와 Web API를 기본 지원하는 runtime과 toolchain이다. TypeScript 파일을 바로 실행할 수 있지만 실행과 타입 검사는 별도 단계다. `deno run`은 기본적으로 타입을 제거하고 실행하며, `deno check` 또는 `deno run --check`가 정적 타입 검사를 수행한다.

## 등장 배경과 Node.js와의 차이

Deno는 Node.js를 만든 개발자가 JSConf EU 2018 발표에서 Node 설계의 후회 지점을 짚으며 공개한 runtime이다. V8, Rust와 Tokio 위에 만들었다. 개선 과제의 첫머리는 보안이었고, 권한 flag, URL과 registry specifier 기반 module 해석, `deno.json` 중심의 설정이 그 결과다. `.ts` 파일을 바로 실행하는 runtime으로는 Bun도 있다.

TypeScript 직접 실행과 권한 모델이라는 초기 차별점은 현재 Node에서 좁혀졌다.

| 비교 축 | Node.js | Deno |
|---|---|---|
| TypeScript 실행 | erasable 문법만 기본 type stripping한다. `tsconfig.json`을 읽지 않고 enum, parameter property는 기본 대상이 아니다([[TypeScript-Node]]). | enum, namespace, parameter property를 포함한 TypeScript 전체를 flag 없이 실행하고 `compilerOptions`와 `deno check`를 같은 toolchain에서 제공한다. |
| 권한 | `--permission`을 켜야 동작하는 안전장치다([[Security]]). | I/O 접근이 없는 상태가 기본값이고 필요한 자원만 flag로 연다. |

TypeScript를 바로 실행한다는 점만으로는 차이가 약하다. 기본 거부 권한 모델, `fmt`, `lint`, `check`, `test`, `task`를 묶은 toolchain, Web 표준 API와 JSR, npm dependency 전략을 함께 비교한다. 속도나 Node 대체 가능성 같은 평가는 벤치마크와 채택 근거로 따로 확인한다.

## 지원 계획과 운영 전환 (2026-10-10 확인)

2026-10-09 발표 기준, Deno 팀은 Cloudflare에 합류하며 제품별로 다른 유지 계획을 공지했다.

- **Deno runtime**: 발표 이후 1년 동안 버그 수정과 보안 업데이트를 포함한 월별 릴리스를 제공하고, 그 뒤 해당 팀의 런타임 개발을 종료할 계획이다. 코드는 오픈소스로 남으며 다른 주체의 개발 지속 가능성과 기존 팀의 지원 약속을 구분한다.
- **Deno Deploy**: 발표 이후 6개월간 운영한 뒤 종료할 계획이다. 유료 고객의 Cloudflare Workers 이전 지원을 제공한다고 밝혔다.
- **JSR**: 운영을 계속하며 인프라를 Cloudflare로 옮길 계획이다.
- **rusty_v8**: 지원을 계속하고 workerd 통합을 추진한다.

이 일정은 발표 시점의 계획이며 런타임이 이미 실행 불가능해졌다는 뜻은 아니다. 외부 플랫폼이 Deno 기반 런타임을 사용한다는 이유만으로 그 플랫폼의 종료 일정까지 확정하지 않는다. 플랫폼별 공식 지원 정책을 별도로 확인한다.

운영 점검 제안: 직접 실행하는 런타임, Deploy 호스팅, JSR 패키지 의존성을 나누어 목록화한다. 런타임 API와 권한 모델의 호환성 시험, 데이터와 비밀값 이전, 배포와 복구 절차를 준비하고 실제 전환일은 서비스별 공지와 계약으로 확인한다. 아래 설치와 실행 예시는 기술 사용법이며 장기 지원 보장을 뜻하지 않는다.

## 설치와 프로젝트 구성

공식 설치 경로 또는 package manager를 사용하고 `deno --version`으로 runtime, V8, TypeScript 버전을 함께 확인한다. 프로젝트 설정은 `deno.json` 또는 `deno.jsonc`에 둔다. `deno.json`은 Node의 `package.json`이 맡던 task와 dependency, `tsconfig.json`이 맡던 `compilerOptions`를 함께 담는다. Deno는 기본 TypeScript 설정을 권장하므로 필요한 옵션만 바꾼다.

```json
{
  "tasks": {
    "check": "deno fmt --check && deno lint && deno check src/main.ts",
    "dev": "deno run --watch --allow-net=0.0.0.0:8000 src/main.ts"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@^1"
  }
}
```

task는 반복 명령을 공유하는 이름일 뿐 권한 모델을 우회하지 않는다. task에 `--allow-*` flag를 적으면 해당 task를 실행한 사용자가 그 권한을 명시적으로 부여한 것이다.

## 권한 모델

Deno 프로그램은 기본적으로 file system, network, environment variable과 subprocess 접근이 제한된다. 필요한 범위만 flag로 허용한다.

```bash
deno run --allow-net=api.example.com --allow-env=API_URL src/main.ts
```

`--allow-all`은 개발 편의를 위해 권한 경계를 사실상 제거하므로 일반 기본값으로 두지 않는다. 같은 thread의 코드는 권한을 나눠 가질 수 없어 dependency도 부여된 프로세스 권한을 그대로 쓰므로, 출처와 lockfile을 함께 관리한다.

flag가 막는 것과 막지 못하는 것, 권한 에러의 구분, task별 권한 분리와 permission set은 [[Deno-Runtime-Permissions|Deno 권한 모델]]에서 다룬다.

## Dependency 관리

현재 application code는 JSR와 npm registry package를 우선 사용하고 `deno add`, `deno install`로 `deno.json`과 lockfile에 기록할 수 있다. HTTPS URL import도 지원되지만 공식 문서는 작은 단일 파일 script에 맞다고 보고 application에는 registry를 권장한다. HTTPS import는 파일마다 다른 버전으로 흩어질 수 있고, `deno add`와 `deno install`의 관리 대상이 아니며, 제공하는 host를 신뢰해야 하기 때문이다. `deno.land/x`나 esm.sh 같은 CDN URL import도 여기에 해당한다.

```bash
deno add jsr:@std/assert
deno add npm:chalk
deno install
```

`deno.land/x` URL, 별도 `import_map.json`과 CDN import가 섞인 Deno 1.x 코드는 `deno add jsr:...`나 `deno add npm:...`로 옮기고 매핑을 `deno.json`의 `imports`로 합친다.

### import map

import map은 코드의 import specifier를 실제 위치로 바꾸는 매핑 표다. 브라우저 표준 기능이며([[JavaScript-ES-Modules]], [[In-Browser-Build]]), Deno에서는 `deno.json`의 `imports`가 이 역할을 한다. 코드에는 `@std/assert`처럼 바뀌지 않는 이름만 두고 버전과 출처는 `deno.json` 한곳에서 바꾼다.

```json
{
  "imports": {
    "@std/assert": "jsr:@std/assert@^1",
    "@/": "./src/"
  },
  "scopes": {
    "./legacy/": { "@std/assert": "jsr:@std/assert@^0.224.0" }
  }
}
```

- 끝이 `/`인 `@/` 항목은 prefix 매핑이다. runtime과 타입 검사가 같은 매핑을 읽으므로, Node에서 tsconfig `paths` 별칭을 실행 시점 해석과 따로 맞추던 문제([[option]])가 설정 하나로 줄어든다.
- `scopes`는 특정 경로 prefix 아래에서 불러온 module에만 다른 매핑을 적용한다.
- 표준 import map 파일은 module마다 specifier 항목과 끝에 `/`를 붙인 항목을 모두 적어야 한다. `deno.json`의 `imports`는 표준을 확장해 specifier 항목만 적어도 된다.
- `importMap` 필드나 `--import-map` flag로 지정한 별도 파일은 표준 규칙을 그대로 따른다. 현재 공식 문서는 `deno.json`의 `imports`를 기준으로 설명한다.

### 캐시와 lockfile

- 받은 dependency는 기본적으로 모든 프로젝트가 공유하는 전역 캐시 `DENO_DIR`에 저장된다. `--reload`로 강제하기 전에는 캐시에 있는 module을 다시 받지 않으므로, 원격 내용이 바뀌어도 캐시에 있던 내용으로 실행된다.
- `deno run --reload main.ts`는 전부, `--reload=jsr:@std/fs`는 지정한 module만 다시 받는다. `deno clean`은 전역 캐시를 지운다.
- `deno.lock`은 모든 dependency의 정확한 버전과 integrity hash를 기록하고 이후 실행마다 검증하므로 commit한다. 다시 받은 내용의 hash가 기록과 다르면 이 검증에서 드러난다. `--frozen`이나 `deno.json`의 `"lock": {"frozen": true}`는 lockfile이 바뀌어야 하는 변경을 에러로 멈춘다.
- `--cached-only`는 network를 쓰지 않고, 캐시에 없는 module이 있으면 실패한다. `deno.json`의 `"vendor": true`는 dependency를 프로젝트의 `vendor` 디렉터리에 캐시한다. Deno 2에서 `deno vendor` 명령을 대체한 설정이다.

`deno install`은 project dependencies를 설치하거나 script와 package를 전역 command로 설치한다. Executable 설치에는 `deno install --global`(`-g`)을 사용한다. `--entrypoint`(`-e`)는 지정한 entrypoint와 dependency를 미리 설치하고 cache하는 옵션이며, Deno 1.x의 `deno cache` 명령이 Deno 2에서 이 옵션으로 합쳐졌다. CI와 container에서는 lockfile 검증과 cache layer를 사용한다.

## Docker 배포

공식 Deno image를 사용하고 dependency cache와 source copy를 분리하면 소스 변경 때 dependency layer를 재사용할 수 있다. build에서 `deno check`, `deno test`를 수행하고 runtime stage에는 필요한 파일과 최소 권한만 남긴다. dependency는 build 단계에서 lockfile 기준으로 받아 두어 container가 시작할 때 내려받지 않게 한다.

```dockerfile
FROM denoland/deno:alpine
WORKDIR /app
COPY deno.json deno.lock ./
RUN deno ci
COPY src ./src
RUN deno check src/main.ts
CMD ["run", "--allow-net=0.0.0.0:8000", "src/main.ts"]
```

- `deno ci`는 Deno 2.8에 추가된 CI용 설치 명령으로 `npm ci`에 대응한다. `deno.lock`이 없으면 실패하고, 기존 `node_modules`를 지운 뒤 `--frozen`으로 설치한다. Deno 2.8보다 오래된 image에서는 `deno install --frozen`을 쓴다.
- 공식 Docker 예시는 image를 줄이려고 `deno ci --prod --skip-types`를 쓴다. `--prod`는 devDependencies를, `--skip-types`는 `@types/*` package를 뺀다. CLI 문서는 `--skip-types`가 이름 기반 추정이라 runtime 코드를 담은 package까지 뺄 수 있다고 경고하므로, 같은 stage에서 `deno check`를 한다면 붙이지 않는다.
- multi-stage build에서는 builder stage에 `ENV DENO_DIR=/deno-dir`를 두고 그 디렉터리를 runtime stage로 복사한다. 복사하지 않으면 runtime container가 첫 실행에서 dependency를 다시 받는다.
- runtime에 `--cached-only`를 주면 image에 없는 코드를 받으려는 시점에 바로 실패하므로 누락이 드러나고 추가 다운로드도 막는다.

실제 배포에서는 검증한 image tag나 digest로 고정하고 base image 보안 update를 확인한다.

## 관련 문서

- [[Deno-Runtime-Permissions|Deno 권한 모델]]
- [[TypeScript-Node|Node.js에서 TypeScript 실행]]
- [[Security|Node.js 보안 (권한 모델)]]
- [[option|TypeScript 컴파일러 옵션]]
- [[컨테이너(Container)|컨테이너]]

## 출처

- [Deno is joining Cloudflare — Deno Blog](https://deno.com/blog/cloudflare)
- [Deno, TypeScript](https://docs.deno.com/runtime/fundamentals/typescript/)
- [Deno, deno.json and package.json](https://docs.deno.com/runtime/reference/deno_json/)
- [Deno, Modules](https://docs.deno.com/runtime/fundamentals/modules/)
- [Deno, Packages and dependencies](https://docs.deno.com/runtime/packages/)
- [Deno, Security and permissions](https://docs.deno.com/runtime/fundamentals/security/)
- [Deno, `deno install`](https://docs.deno.com/runtime/reference/cli/install/)
- [Deno, `deno ci`](https://docs.deno.com/runtime/reference/cli/ci/)
- [Deno, Deno 1.x to 2.x migration guide](https://docs.deno.com/runtime/reference/migration_guide/)
- [Deno, Docker](https://docs.deno.com/runtime/reference/docker/)
- [Deno 2.8 — Deno Blog](https://deno.com/blog/v2.8)
- [denoland/deno — GitHub](https://github.com/denoland/deno)
- [Bun, Docs](https://bun.com/docs)
- [10 Things I Regret About Node.js — JSConf EU 2018](https://www.youtube.com/watch?v=M3BM9TB-8yA)
- yongsoocho, [Deno 개발 환경 구성](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=166731)
- yongsoocho, [flag의 등장](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227030)
- yongsoocho, [deno.json과 tasks](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227031)
- yongsoocho, [dependencies 관리](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227032)
- yongsoocho, [Docker와 함께...](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227033)
