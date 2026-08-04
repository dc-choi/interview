---
tags: [runtime, deno, typescript, permissions]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Deno", "Deno Runtime"]
---

# Deno Runtime

Deno는 JavaScript, TypeScript와 Web API를 기본 지원하는 runtime과 toolchain이다. TypeScript 파일을 바로 실행할 수 있지만 실행과 타입 검사는 별도 단계다. `deno run`은 기본적으로 타입을 제거하고 실행하며, `deno check` 또는 `deno run --check`가 정적 타입 검사를 수행한다.

## 설치와 프로젝트 구성

공식 설치 경로 또는 package manager를 사용하고 `deno --version`으로 runtime, V8, TypeScript 버전을 함께 확인한다. 프로젝트 설정은 `deno.json` 또는 `deno.jsonc`에 둔다.

```json
{
  "tasks": {
    "check": "deno fmt --check && deno lint && deno check src/main.ts",
    "dev": "deno run --watch --allow-net src/main.ts"
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

`--allow-all`은 개발 편의를 위해 권한 경계를 사실상 제거하므로 일반 기본값으로 두지 않는다. dependency도 부여된 프로세스 권한 안에서 실행되므로 출처와 lockfile을 함께 관리한다.

## Dependency 관리

현재 application code는 JSR와 npm registry package를 우선 사용하고 `deno add`, `deno install`로 `deno.json`과 lockfile에 기록할 수 있다. URL import도 지원되지만 version, 무결성, offline build와 중앙 관리 측면에서 registry dependency가 더 관리하기 쉽다.

```bash
deno add jsr:@std/assert
deno add npm:chalk
deno install
```

`deno install`은 현재 project dependencies를 설치하는 명령과 entrypoint를 실행 가능한 command로 설치하는 기능을 문맥에 따라 제공한다. 현재 CLI에서는 executable 설치 의도를 `deno install --entrypoint`로 명확히 할 수 있다. CI와 container에서는 lockfile 검증과 cache layer를 사용한다.

## Docker 배포

공식 Deno image를 사용하고 dependency cache와 source copy를 분리하면 소스 변경 때 dependency layer를 재사용할 수 있다. build에서 `deno check`, `deno test`를 수행하고 runtime stage에는 필요한 파일과 최소 권한만 남긴다.

```dockerfile
FROM denoland/deno:alpine
WORKDIR /app
COPY deno.json deno.lock ./
RUN deno install --frozen
COPY src ./src
RUN deno check src/main.ts
CMD ["run", "--allow-net=0.0.0.0:8000", "src/main.ts"]
```

실제 배포에서는 검증한 image tag나 digest로 고정하고 base image 보안 update를 확인한다.

## 관련 문서

- [[TypeScript-Node|Node.js에서 TypeScript 실행]]
- [[option|TypeScript 컴파일러 옵션]]
- [[컨테이너(Container)|컨테이너]]

## 출처

- [Deno, TypeScript](https://docs.deno.com/runtime/fundamentals/typescript/)
- [Deno, deno.json and package.json](https://docs.deno.com/runtime/reference/deno_json/)
- [Deno, Packages and dependencies](https://docs.deno.com/runtime/packages/)
- [Deno, Docker](https://docs.deno.com/runtime/reference/docker/)
- yongsoocho, [Deno 개발 환경 구성](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=166731)
- yongsoocho, [권한 flag](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227030)
- yongsoocho, [deno.json과 tasks](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227031)
- yongsoocho, [dependencies 관리](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227032)
- yongsoocho, [Docker와 Deno](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227033)
