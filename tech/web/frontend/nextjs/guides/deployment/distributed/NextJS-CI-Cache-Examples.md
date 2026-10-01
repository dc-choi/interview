---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js CI 캐시 구성 예제"]
---

# Next.js CI 캐시 구성 예제

## YAML 공급자 예제

기존 workflow에 병합하는 fragment다. build/install 및 공급자 runner 설정은 앱에 맞춘다.

~~~yaml
# CircleCI, steps 안
- save_cache:
    key: dependency-cache-{{ checksum "yarn.lock" }}
    paths: [./node_modules, ./.next/cache]
~~~

~~~yaml
# Travis, top-level
cache:
  directories: [$HOME/.cache/yarn, node_modules, .next/cache]
~~~

~~~yaml
# GitLab, top-level
cache:
  key: $CI_COMMIT_REF_SLUG
  paths: [node_modules/, .next/cache/]
~~~

~~~yaml
# CodeBuild buildspec
cache:
  paths: ['node_modules/**/*', '.next/cache/**/*']
~~~

~~~yaml
# GitHub Actions, build 이전 steps
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      ${{ github.workspace }}/.next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-
~~~

~~~yaml
# Bitbucket
definitions:
  caches:
    nextcache: .next/cache
pipelines:
  default:
    - step:
        name: build
        caches: [node, nextcache]
        script: [npm ci, npm run build]
~~~

~~~yaml
# Azure, next build 이전
- task: Cache@2
  displayName: Cache .next/cache
  inputs:
    key: 'next | $(Agent.OS) | yarn.lock'
    path: '$(System.DefaultWorkingDirectory)/.next/cache'
~~~

## Jenkins의 설치와 빌드

~~~groovy
// pipeline stages에 병합, Job Cacher plugin 필요
stage('Dependencies') {
  steps {
    cache(caches: [arbitraryFileCache(
      path: 'node_modules', includes: '**/*',
      cacheValidityDecidingFile: 'package-lock.json'
    )]) { sh 'npm install' }
  }
}
stage('Build') {
  steps {
    writeFile file: 'next-lock.cache', text: env.GIT_COMMIT
    cache(caches: [arbitraryFileCache(
      path: '.next/cache', includes: '**/*',
      cacheValidityDecidingFile: 'next-lock.cache'
    )]) { sh 'npm run build' }
  }
}
~~~

## 자동 통합과 package 설정

Vercel은 Next cache를 자동 설정한다. Netlify는 @netlify/plugin-nextjs 통합을 사용한다.
Heroku는 기존 package.json 최상위에 속성을 병합한다.

~~~json
{ "cacheDirectories": [".next/cache"] }
~~~

cache hit 뒤에도 dependency install/build 검증을 유지한다.

## 출처

- [Next.js, ci-build-caching](https://nextjs.org/docs/app/guides/ci-build-caching)

## 관련 문서

- [[NextJS-CI-Build-Cache]]
