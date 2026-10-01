---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["자동 server external package 목록", "NextJS-Config-External-Packages"]
---

# 자동 server external package 목록

기준: Next.js 16.3.8 공식 문서. 실험 옵션은 정식 기능과 구분한다.

## 외부화와 배포 의존성

serverExternalPackages는 Server Component/Route Handler bundling을 제외하고 Node require로 해석한다. 이는 의존성을 지우는 옵션이 아니므로 실제 package/native 파일을 runtime에 배포한다. App 기본 bundling, Pages bundlePagesRouterDependencies opt-in을 구분한다. 15.0에 experimental.serverComponentsExternalPackages에서 stable 이름으로 바뀌었다.

## 16.3.8 자동 제외 목록

다음 이름은 공식 snapshot의 자동 opt-out 목록이다. 버전 업데이트 때 실제 목록을 다시 확인한다.

- @alinea/generated, @appsignal/nodejs, @aws-sdk/client-s3, @aws-sdk/s3-presigned-post, @blockfrost/blockfrost-js, @highlight-run/node, @huggingface/transformers, @jpg-store/lucid-cardano
- @libsql/client, @mikro-orm/core, @mikro-orm/knex, @node-rs/argon2, @node-rs/bcrypt, @prisma/client, @react-pdf/renderer, @sentry/profiling-node
- @sparticuz/chromium, @sparticuz/chromium-min, @statsig/statsig-node-core, @swc/core, @xenova/transformers, @zenstackhq/runtime
- argon2, autoprefixer, aws-crt, bcrypt, better-sqlite3, canvas, chromadb-default-embed, config, cpu-features, cypress
- dd-trace, eslint, express, firebase-admin, htmlrewriter, import-in-the-middle, isolated-vm, jest, jsdom, keyv, libsql
- mdx-bundler, mongodb, mongoose, newrelic, next-mdx-remote, next-seo, node-cron, node-pty, node-web-audio-api, onnxruntime-node, oslo
- pg, pino, pino-pretty, pino-roll, playwright, playwright-core, postcss, prettier, prisma, puppeteer-core, puppeteer, ravendb
- require-in-the-middle, rimraf, sharp, shiki, sqlite3, thread-stream, ts-morph, ts-node, typescript, vscode-oniguruma, webpack, websocket, zeromq

단순 이름 목록은 해당 라이브러리의 모든 동작을 Edge/browser에서 지원한다는 뜻이 아니다. 다른 package를 수동 추가하려면 string[]를 사용한다. transpilePackages와 같은 package를 양쪽에 등록하지 않는다.

## 검증과 학습 확인

standalone package에서 native addon과 runtime require가 해결되는지 실제 route를 실행한다. build 성공만으로 동적 require/fs 데이터 포함을 증명하지 않는다. bundle 분석과 traced 파일을 함께 확인한다.

## 출처

- [Next.js, serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)
- [Next.js, serverExternalPackages](https://nextjs.org/docs/pages/api-reference/config/next-config-js/serverExternalPackages)

## 관련 문서

- [[NextJS-Config-Dependencies]]
- [[NextJS-Config-Build-Deployment]]
