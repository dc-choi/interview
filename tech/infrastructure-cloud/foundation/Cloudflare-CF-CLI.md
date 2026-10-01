---
tags: [infrastructure, cloudflare, cli, workers, agents, openapi, vite]
status: done
verified_at: 2026-10-01
category: "Infrastructure - 클라우드 기초"
aliases: ["Cloudflare cf CLI", "Cloudflare agentic CLI", "Cloudflare CLI"]
---

# Cloudflare cf CLI: API 운영과 Workers 프로젝트

`cf`는 Cloudflare 공개 API의 리소스 관리와 Workers 프로젝트 개발, 빌드, 배포를 제공하는 CLI다. 사람과 코딩 에이전트가 같은 명령을 사용하며, 명령 검색, 요청 스키마 조회와 JSON 출력으로 에이전트의 도구 탐색을 돕는다. CLI 자체가 자연어 요청을 받아 자율적으로 운영하는 LLM 에이전트라는 뜻은 아니다.

2026-10-01 공식 문서 기준 **open beta**다. 명령, 설정 형식과 Build Output은 안정 버전 전에 바뀔 수 있다. 아래 내용은 공식 문서 대조 결과이며 CLI 실행이나 실제 배포 검증 기록은 아니다.

## API 명령과 프로젝트 명령의 경계

대부분의 API 명령은 OpenAPI 스키마 기반으로 생성된다. 공통 스키마에서 명령과 요청 정보를 만들면 제품별로 명령을 따로 구현할 때 생기는 용어와 옵션 차이를 줄일 수 있다.

| 구분 | 하는 일 | 설정과 실행 경계 |
|---|---|---|
| API 명령 | zone, DNS, D1, R2, 보안 설정 등 리소스 조회와 변경 | API에 필요한 리소스 ID와 계정, zone을 선택 |
| 프로젝트 명령 | `cf dev`, `cf build`, `cf deploy` | `cloudflare.config.ts`와 프레임워크 또는 Cloudflare 빌드 도구 사용 |
| 발견 명령 | `cf cli search`, `cf schema`, `--help` | 작업에 맞는 명령과 입력 계약 확인 |

API를 넓게 호출할 수 있는 것과 모든 리소스를 설정 파일로 선언할 수 있는 것은 별개다. `cloudflare.config.ts`의 현재 범위는 Workers, Container 애플리케이션과 계정 설정이다. API 변경 명령을 나열했다고 Terraform 같은 상태 관리와 드리프트 교정이 생기는 것도 아니다. 선언형 관리와 명령형 호출의 차이는 [[IaC|IaC]]를 참고한다.

## 명령 발견과 요청 확인

작업 설명으로 후보를 찾고, 선택한 명령의 입력을 확인한 뒤 요청을 미리 본다.

```bash
cf cli search "create D1 database"
cf schema d1 create
cf d1 create --help
cf d1 create --name example-database --dry-run
```

검색은 로컬에서 실행되며 자격증명이 필요 없다. `cf schema`는 생성된 API 명령의 메서드, 경로, 파라미터와 body 필드를 JSON으로 보여준다. 프로젝트 명령은 `--help`로 확인한다. 스키마의 body 목록이 불완전하면 API reference를 확인해 `--body`로 완전한 요청을 전달한다.

API 명령의 `--dry-run`은 요청을 출력하고 전송하지 않는다. 이것은 요청 형태 확인이며, 원격 권한이나 실제 변경 성공의 증명은 아니다.

## 출력 계약과 결과 확인

- API 결과는 주로 stdout JSON, 진단과 오류는 stderr로 나뉜다. 별도 `--json` 없이 파이프로 처리할 수 있다.
- 목록은 한 페이지만 반환하므로 전체 조회에는 명령별 pagination 확인이 필요하다.
- R2 객체 같은 원시 데이터는 그대로 출력되고, 반환 데이터가 없는 변경은 stdout이 비어 있을 수 있다.
- 비대화 세션에서 파괴적 명령을 `--force` 없이 실행하면 `Aborted.`와 **종료 코드 0**으로 끝날 수 있다. 삭제 여부는 재조회한다. 일부 명령의 `--force`에는 API 동작을 바꾸는 의미도 있다.

JSON 형식, 종료 코드와 실제 리소스 상태는 각각 확인할 대상이다. 필요한 필드만 남기는 컨텍스트 비용 설계는 [[Tool-Output-Filtering|도구 출력 필터링]]으로 연결된다.

## 인증과 대상 계정

설치와 대화형 로그인 명령은 다음과 같다. 실행하려면 Node.js 22.18 이상을 준비한다. Bun에서 `cloudflare.config.ts`를 로드하는 실행은 지원되지 않는다.

```bash
npm install --global cf
cf auth login
cf zones list
```

`cf auth login`은 브라우저에서 사용자가 접근을 승인하는 흐름이며 Wrangler 로그인과 별개다. 인증 우선순위는 `CLOUDFLARE_API_TOKEN`, `--profile`, 현재 디렉터리에 연결된 profile, 기본 profile 순이다. Global API Key는 지원하지 않는다.

CI에서는 최소 권한 API token과 `CLOUDFLARE_ACCOUNT_ID`를 secret으로 제공한다. token은 저장된 로그인보다 우선하므로 profile을 바꿔도 환경 token이 남아 있으면 인증이 바뀌지 않는다. 토큰을 설정 파일이나 Git에 저장하지 않는다.

계정 선택은 환경변수, 설정의 `accountId`, 이전에 저장된 계정, 자격증명이 접근하는 유일한 계정 순이다. 여러 계정을 쓸 수 있는 비대화 실행에서는 대상을 명시한다. zone 명령은 `--zone`으로 대상 ID나 도메인을 선택할 수 있다.

## 타입이 있는 구성과 빌드 위임

`cloudflare.config.ts`는 `cf/config`의 `defineConfig`, `bindings`, `triggers`로 설정을 표현한다. `worker.env`에는 binding을, `worker.triggers`에는 route, queue, cron 등의 실행 계기를 둔다. 타입은 편집기 자동완성과 잘못된 설정 값 검출을 돕지만 배포 성공을 보장하지 않는다.

파일은 TypeScript 모듈로 **실행**된다. 일반 API 명령도 가장 가까운 설정에서 계정 기본값을 읽으므로 import 오류나 최상위 runtime 오류의 영향을 받는다. 함수형 구성은 mode마다 완전한 설정을 반환하고, Wrangler의 `env` 블록처럼 자동 병합하지 않는다. mode에 따라 계정을 바꾸면 API 명령에도 `--mode`를 명시한다.

`cf`가 직접 개발 서버나 bundler를 구현하는 것은 아니다. 지원 프레임워크의 명령을 먼저 선택하고, 아니면 프로젝트에 설치된 Cloudflare Vite plugin 또는 Wrangler에 위임한다. `cf build`는 `.cloudflare/output/v0/`를 검증하고 업로드하지 않는다. `cf deploy`는 빌드 결과를 검증하고 Worker Version을 업로드한 뒤 배포한다.

기존 `package.json`의 build script는 자동 실행되지 않는다. `tsc` 같은 추가 검사는 별도 script에서 `cf build`와 연결해야 한다. 배포 dry run도 미설정 프로젝트에서는 자동 설정과 패키지 설치를 수행할 수 있으므로, 원격 API 미전송과 로컬 파일 무변경을 같은 뜻으로 취급하지 않는다.

## Wrangler와 함께 쓰거나 이전하기

Wrangler 프로젝트에서도 `cf`의 계정과 리소스 명령을 쓸 수 있다. 다만 그 명령은 Wrangler 설정의 `account_id`를 읽지 않는다. 프로젝트를 이전하기 전에는 개발과 배포에 Wrangler를 계속 사용한다.

`wrangler.jsonc`, `wrangler.json` 또는 `wrangler.toml`만 있고 `cloudflare.config.ts`가 없는 프로젝트에서 `cf dev/build/deploy`나 `cf init .`를 바로 실행하면 기존 entrypoint와 binding을 반영하지 않은 설정이 생기거나 명령이 실패할 수 있다.

이전은 다음 순서로 검토한다.

1. `cf migrate --dry-run`으로 변경 파일 목록과 수동 후속 항목을 확인한다. 파일 본문 diff까지 보여주지는 않는다.
2. `cf migrate` 후 생성 설정과 dependency 변경을 검토한다.
3. `TODO(@cloudflare)`의 필수 항목을 해결한다. Durable Object lifecycle, Workflow와 Container 설정 등은 수동 검토나 변환이 필요할 수 있다.
4. 기존 route, binding, 리소스 ID, mode별 Worker 이름을 확인하고 빌드와 배포 검증을 진행한다.

Vite plugin을 선언한 프로젝트는 Vite, 그렇지 않으면 Wrangler bundler를 선택할 수 있다. `cf migrate`만으로 Vite 설치와 설정 생성까지 완료되지는 않는다. Wrangler의 유지보수 지원 종료 날짜도 현재 beta 발표일로 계산하지 않는다. 공지된 지원 계획은 beta 종료 뒤 18개월이다.

## 운영 점검

- 리소스 명령과 프로젝트 이전 중 어느 범위인지 구분했는가
- token 권한, 계정과 zone이 의도한 대상을 가리키는가
- 검색 후보에서 입력 계약과 dry run을 확인한 뒤 변경했는가
- pagination, 빈 출력과 삭제 중단을 실제 성공으로 오인하지 않았는가
- 설정 타입 검사, 빌드 검증과 실제 배포 후 확인을 구분했는가

## 출처

- [Introducing cf: the agentic CLI for the entire Cloudflare API — Cloudflare Blog](https://blog.cloudflare.com/cloudflare-cf-cli-launch/)
- [cf: the agentic CLI for the entire Cloudflare API — Cloudflare GitHub](https://github.com/cloudflare/cf)
- [Cloudflare Docs, Cloudflare CLI](https://developers.cloudflare.com/cf/)
- [Cloudflare Docs, Use cf with coding agents](https://developers.cloudflare.com/cf/agents/)
- [Cloudflare Docs, Get started](https://developers.cloudflare.com/cf/get-started/)
- [Cloudflare Docs, Use cf in CI](https://developers.cloudflare.com/cf/ci/)
- [Cloudflare Docs, Programmatic configuration](https://developers.cloudflare.com/cf/projects/cloudflare-config/)
- [Cloudflare Docs, Develop, build, and deploy](https://developers.cloudflare.com/cf/projects/)
- [Cloudflare Docs, cf for Wrangler users](https://developers.cloudflare.com/cf/wrangler/)
- [Cloudflare Docs, Migrate a Wrangler project](https://developers.cloudflare.com/cf/wrangler/migrate/)

## 관련 문서

- [[Cloudflare-vs-Vercel-Hosting|Vercel과 Cloudflare 호스팅 선택]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]]
- [[Tool-Output-Filtering|도구 출력 필터링]]
- [[IaC|선언형 인프라 관리와 명령형 호출]]
