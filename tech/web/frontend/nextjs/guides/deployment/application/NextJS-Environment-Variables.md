---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 환경 변수의 로딩과 평가 시점"]
---

# Next.js 환경 변수의 로딩과 평가 시점

## 서버 env와 browser bundle

Next.js는 .env*를 process.env에 읽고 NEXT_PUBLIC_ 값을 browser JavaScript에 build-time inline한다. 비공개 이름은 기본적으로 Node 환경에만 있다. 서버에서 그 값을 HTML/props에 직접 넣거나 next.config.env로 공개하면 접두사만으로 노출을 막을 수 없다.

CNA는 .env 파일을 ignore한다. 실제 비밀은 Git에 저장하지 않고 운영 secret 제공 경로로 주입한다. test 공통 기본값은 아래의 .env.test 예외와 구분한다.

## 파일 위치와 multiline

.env는 프로젝트 root에 둔다. src 프로젝트도 src 안이 아니라 부모 root에서 읽는다. DB_HOST/DB_USER/DB_PASS를 process.env에서 Route Handler의 DB connection에 전달할 수 있으며 myDB.connect는 앱이 구현하는 driver다.

double-quoted multiline 값은 실제 line break 또는 \n escape로 쓸 수 있다. private key 예시는 형식을 보여 주는 placeholder이며 원문 RSA 시작/DSA 끝 label 불일치를 실제 유효 key로 복사하지 않는다. 필요한 key format은 제공한 crypto SDK에 맞춘다.

## 외부 도구에서 같은 load 규칙

~~~ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
~~~

@next/env를 설치하면 ORM/test root config가 Next runtime 밖에서도 같은 .env loading을 사용할 수 있다. envConfig module을 먼저 import한 뒤 process.env.DATABASE_URL로 dbCredentials를 구성한다. TS의 non-null assertion은 존재를 runtime 검증하지 않으므로 필요한 secret을 명시적으로 검사한다. monorepo의 process.cwd가 실제 env root인지 확인한다.

## 변수 expansion

TWITTER_USER=nextjs, TWITTER_URL=https://x.com/$TWITTER_USER이면 URL 값은 https://x.com/nextjs로 확장된다. 실제 dollar 문자는 \$로 escape한다. 변수 참조와 shell expansion은 서로 다른 실행 단계다.

## 공개 변수는 build 때 고정된다

NEXT_PUBLIC_ANALYTICS_ID의 직접 process.env.NEXT_PUBLIC_ANALYTICS_ID 접근은 next build 환경의 값으로 치환된다. setupAnalyticsService(...)를 browser에 보내면 고정된 ID 문자열이 들어간다. Heroku slug 승격이나 하나의 Docker image를 여러 환경으로 옮겨도 이미 들어간 값은 바뀌지 않는다.

process.env[varName] 동적 key와 const env=process.env 뒤 env.NEXT_PUBLIC_ANALYTICS_ID 별칭은 같은 inline 대상이 아니다. 이를 공개 runtime 설정의 대안으로 간주하지 않는다. 공개 runtime 값이 필요하면 서버가 검증한 공개 subset을 별도 API/초기화 응답으로 제공한다.

## 서버 runtime 값

~~~tsx
import { connection } from 'next/server'
export default async function RuntimeValue() {
  await connection()
  const value = process.env.MY_VALUE
  return <span>{value ? '설정됨' : '미설정'}</span>
}
~~~

요청 시 동적으로 실행되는 서버 구간에서 env를 읽으면 단일 image를 환경마다 다른 값으로 사용할 수 있다. cookies/headers 같은 request API도 관련 경로를 동적으로 만든다. Cache Components에서는 request work를 적절한 Suspense 아래에 두며 전체 route가 일괄 dynamic이라는 옛 모델을 그대로 적용하지 않는다. use cache/정적 렌더 안의 env read는 다시 build/cache 시점의 평가가 될 수 있다.

startup 초기화는 instrumentation.register를 사용한다. env 값을 출력한 HTML이 공개돼도 되는지와 읽기 시점은 서로 다른 판단이다.

## test 환경과 Git 기본값

NODE_ENV=test이면 .env.test를 읽고 .env.development/.env.production을 선택하지 않는다. Jest/Cypress 등의 runner가 test를 설정할 수 있으므로 현재 setup을 확인한다. .env.local을 건너뛰어 developer 개인 override가 공통 test 재현성을 깨지 않게 한다.

.env.test는 비밀 없는 공통 기본값으로 commit할 수 있고 .env.test.local은 .env*.local처럼 ignore한다. global setup에서 loadEnvConfig(process.cwd())를 호출해 Next와 같은 규칙을 적용한다.

## key별 load 우선순위

| 순서 | 입력 |
| --- | --- |
| 1 | process.env |
| 2 | .env.<NODE_ENV>.local |
| 3 | .env.local(test에서 제외) |
| 4 | .env.<NODE_ENV> |
| 5 | .env |

각 key는 먼저 발견한 값에서 멈춘다. development.local과 .env에 같은 이름이 있으면 전자가 우선한다. 허용 NODE_ENV는 development/production/test이며 staging 같은 배포 stage는 별도 변수에 둔다. 미지정이면 next dev가 development, 그 외 Next command가 production을 선택하는 문서 계약이다.

## 버전과 이해 확인

9.4에 .env/NEXT_PUBLIC_가 도입됐다. 같은 image의 NEXT_PUBLIC_와 request-time private env를 바꾸었을 때 어떤 값만 runtime에 바뀌는지 설명한다. 로드한 값의 출처, 평가 시점, browser 공개 여부를 각각 확인한다.

## 출처

- [Next.js, environment-variables](https://nextjs.org/docs/app/guides/environment-variables)

## 관련 문서

- [[NextJS-Environment-and-Deployment]]
- [[NextJS-Instrumentation]]
- [[NextJS-Config-Taint-Env]]
