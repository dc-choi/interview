---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js adapter compatibility 검증", "NextJS-Adapter-Validation"]
---

# Next.js adapter compatibility 검증

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## adapter compatibility harness

Next.js repository의 deploy e2e harness를 이용해 실제 배포에서 routes, actions, caches와 assets를 검증한다. 특정 pinned Next ref와 adapter build를 준비하고 Playwright browser를 설치한다. canary snapshot 성공을 모든 release 호환성 보장으로 취급하지 않는다.

NEXT_TEST_MODE=deploy, NEXT_EXTERNAL_TESTS_FILTERS의 deploy-tests-manifest, NEXT_E2E_TEST_TIMEOUT, NEXT_TEST_JOB과 bundler 선택을 맞춘다. run-tests.js의 group sharding과 concurrency는 CI 자원에 맞춘다. official workflow의 Node/actions 버전은 예시 구성이지 최신 인프라 권장값 보장이 아니다.

## deploy script contract

NEXT_TEST_DEPLOY_SCRIPT_PATH는 isolated temporary app의 cwd에서 실행되는 executable이다. 실패는 nonzero exit, 성공은 deployment URL만 stdout에 출력한다. 진단과 build logs는 stderr 또는 cwd 파일에 기록한다. 별도 프로세스인 logs script가 쓸 build ID/metadata는 파일에 남긴다.

```sh
# 배포 단계 내부에서 stderr에 로그, stdout에는 최종 URL만 출력한다.
pnpm build >&2
printf '%s\n' "$DEPLOY_URL"
```

이 부분 예시의 DEPLOY_URL은 플랫폼이 성공한 deployment에서 받은 값이다. build tool의 stdout이 URL과 섞이지 않도록 redirection을 확인한다.

## logs script contract

NEXT_TEST_DEPLOY_LOGS_SCRIPT_PATH도 app cwd에서 실행되고 NEXT_TEST_DIR, NEXT_TEST_DEPLOY_URL을 받는다. output에는 아래 prefix lines가 포함되어야 한다.

```text
BUILD_ID: <actual build id>
DEPLOYMENT_ID: <actual deployment id>
NEXT_SUPPORTS_IMMUTABLE_ASSETS: <0 or 1>
```

이후 build/server logs를 출력할 수 있다. deploy가 남긴 .adapter-build.log/.adapter-server.log를 replay하는 방식은 하나의 구현 선택이다. actual metadata가 아니라 고정 dummy markers를 출력하면 false diagnosis를 만들 수 있다.

## cleanup script contract

NEXT_TEST_CLEANUP_SCRIPT_PATH는 optional executable이다. tests 뒤 실행하며 같은 cwd와 NEXT_TEST_DIR/NEXT_TEST_DEPLOY_URL을 받는다. deploy가 만든 resources를 정리하고 다른 배포 자원을 삭제하지 않도록 scoped identity를 사용한다. 실패 로그는 cleanup 후에도 회수 가능하도록 보존한다.

## lifecycle와 assertions

deploy URL 접근성, output assets/routing, logs metadata, cleanup을 따로 확인한다. PPR/Server Actions와 cache revalidation은 response 이후 work가 있어 waitUntil과 shared storage도 테스트해야 한다. 통과한 assertion 범위와 skipped/failed tests, exact Next/adapter ref를 함께 기록한다.

## provider 수치 읽기

지원표의 최신 ingestion과 assertion 수는 [[NextJS-Adapter-Providers]]에서 구분한다. rounded percentage 100%도 일부 failure가 있을 수 있으므로 numerator/denominator를 확인한다. harness 성공은 실제 app의 dependency/env/regional/security 조건을 모두 검증하는 것은 아니다.

## 워크플로 예시의 실행 순서와 환경

workflow_dispatch의 nextjsRef(branch/tag/SHA)를 받아 adapter와 vercel/next.js를 별도 path로 checkout한다. Next repository fetch-depth 25, Node 20, Corepack 0.31, build timeout 30분은 원문 예시의 고정값이다. Next.js install/build/재install, Chromium with-deps 설치, adapter install/build 후 두 checkout과 ~/.cache/ms-playwright를 SHA/run ID별 cache에 저장한다.

test job은 build 후 cache를 복원하며 1/16~16/16 shard, fail-fast:false, 60분 timeout, concurrency 2로 node run-tests.js --timings -g <group> -c 2 --type e2e를 실행한다. test env는 NEXT_TEST_MODE=deploy, NEXT_E2E_TEST_TIMEOUT=240000, NEXT_EXTERNAL_TESTS_FILTERS=test/deploy-tests-manifest.json, ADAPTER_DIR, IS_TURBOPACK_TEST=1, NEXT_TEST_JOB=1, NEXT_TELEMETRY_DISABLED=1과 세 executable path다. deploy/logs/cleanup script에 chmod +x가 필요하다.

deploy 예시는 isolated app package.json의 dependencies에 adapter=file:<ADAPTER_DIR>를 넣고 NEXT_ADAPTER_PATH=<ADAPTER_DIR>/dist/index.js로 연결한다. build 뒤 .next/BUILD_ID와 deployment ID, immutable 지원 0/1을 .adapter-build.log에 남긴다. logs script는 파일 존재를 확인해 build/server log를 replay한다. 프로세스 간 상태는 파일로 전달하며 stdout에는 URL만 남겨야 한다.

원문 deploy shell의 pnpm build stdout은 URL-only 계약과 충돌한다. 실제 적용 예시는 pnpm build >&2로 바꿔 진단을 stderr에 보내고 최종 URL만 stdout에 출력한다.

## 출처

- [Next.js, app/api-reference/adapters/testing-adapters](https://nextjs.org/docs/app/api-reference/adapters/testing-adapters)
- [Next.js, pages/api-reference/adapters/testing-adapters](https://nextjs.org/docs/pages/api-reference/adapters/testing-adapters)

## 관련 문서

- [[NextJS-Adapter-Lifecycle]]
- [[NextJS-Adapter-Providers]]
- [[NextJS-Adapter-PPR]]
