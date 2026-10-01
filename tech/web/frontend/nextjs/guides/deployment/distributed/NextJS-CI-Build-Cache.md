---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js CI 빌드 캐시"]
---

# Next.js CI 빌드 캐시

## 저장 대상과 키

Next.js는 빌드 사이 재사용 정보를 .next/cache에 저장한다. CI는 이 디렉터리를 restore/save해야 build cache를 활용한다.
캐시가 지속되지 않으면 No Cache Detected 안내가 나올 수 있다. 빌드 캐시는 배포 결과, 서버 Data Cache나 ISR 저장소와 다른 대상이다.
의존성 설치 캐시와 Next 빌드 캐시를 각각 보존하고 OS, lockfile, source 변경에 맞춰 키와 fallback을 설계한다.
캐시 hit 여부뿐 아니라 복구 비용과 실제 build 시간을 비교한다.

## 공급자별 구성

| 공급자 | 설정 위치와 계약 |
| --- | --- |
| Vercel | Next 캐시 자동 구성, Turborepo의 remote cache는 별도 제품 설정 확인 |
| CircleCI | .circleci/config.yml save_cache에 node_modules와 .next/cache, dependency-cache와 yarn.lock checksum 키 |
| Travis CI | .travis.yml cache.directories에 사용자 yarn cache, node_modules, .next/cache |
| GitLab CI | .gitlab-ci.yml cache.key에 CI_COMMIT_REF_SLUG, paths에 node_modules/와 .next/cache/ |
| Netlify CI | Next 전용 @netlify/plugin-nextjs 플러그인으로 통합 |
| AWS CodeBuild | buildspec.yml cache.paths의 node_modules/**/*와 .next/cache/**/* |
| GitHub Actions | actions/cache@v4에 사용자 .npm 및 workspace .next/cache |
| Bitbucket Pipelines | definitions.caches.nextcache: .next/cache, 각 step caches에 node와 nextcache 참조 |
| Heroku | 최상위 package.json cacheDirectories 배열에 .next/cache |
| Azure Pipelines | next build 이전 Cache@2, key는 next/Agent.OS/yarn.lock, path는 System.DefaultWorkingDirectory의 .next/cache |
| Jenkins Pipeline | Job Cacher arbitraryFileCache로 node_modules와 .next/cache를 구별해 감쌈 |

GitHub 예제는 runner OS, package-lock.json hash, 모든 js/jsx/ts/tsx hash를 결합해 새 키를 만든다.
source만 바뀌면 OS+lockfile prefix의 restore-keys로 이전 Next 캐시를 복구하고 새 빌드 결과를 저장한다.
다른 패키지 관리자는 yarn/bun 등에 맞는 설치 캐시 경로를 선택하거나 setup-node의 캐시 통합을 사용한다.
CircleCI에 save_cache 단계 자체가 없으면 먼저 공급자 캐시 절차를 구성한다.
Bitbucket은 top-level 정의만 추가해서 끝나지 않고 실제 build step에서 nextcache를 참조해야 한다.

## Jenkins의 두 수명

Restore npm packages stage는 node_modules/includes **/*를 package-lock.json으로 검증하고 npm install을 실행한다.
Build stage는 next-lock.cache에 GIT_COMMIT를 기록하고 그 파일을 .next/cache/includes **/*의 cacheValidityDecidingFile로 사용한 뒤 npm run build를 실행한다.
원문 예제는 두 stage에서 같은 commit 파일을 기록하지만 dependency 캐시의 검증 파일은 lockfile이다. 역할을 혼동하지 않는다.
commit별 키는 안전한 분리와 재사용률 사이의 선택이다. source 변경 때도 재사용 가능한 캐시 구조라면 공급자의 fallback 정책을 확인한다.

## 이해 확인

- GitHub Actions에서 source hash가 바뀌어도 lockfile prefix fallback을 사용하는 이유는 무엇인가?
- .next/cache를 보존하는 것과 ISR 응답을 여러 서버에 공유하는 것은 왜 다른 작업인가?

## 출처

- [Next.js, ci-build-caching](https://nextjs.org/docs/app/guides/ci-build-caching)

## 관련 문서

- [[NextJS-Build-and-Performance]]
- [[NextJS-Self-Hosting]]
