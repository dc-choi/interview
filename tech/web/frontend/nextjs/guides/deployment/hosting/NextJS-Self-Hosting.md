---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 자체 호스팅"]
---

# Next.js 자체 호스팅

## 서버와 앞단 경계

next start, Docker/standalone 또는 정적 export를 앱 기능에 맞춰 선택한다.
Next 서버 앞에 Nginx 같은 reverse proxy를 두면 malformed request, 느린 연결 공격, payload 크기, rate limit을 처리하고 서버를 렌더에 집중시킬 수 있다.
ingress reverse proxy와 Next의 proxy.js는 서로 다른 계층이다.
next start의 Proxy는 요청을 읽어 동작하므로 export에 없다. 현재 Proxy는 Node.js 런타임이라 과거 Middleware의 Edge 제약으로 판단하지 않는다.
Server Component layout에서 headers/redirect를 처리할 수도 있지만 이것이 모든 요청의 권한 경계를 대신하지 않는다.
config redirects/rewrites의 header/cookie/query 조건 또는 custom server는 요구를 표현할 수 있는지 비교한다.

## 이미지와 환경 변수

next start의 이미지 최적화는 런타임 sharp 연산이다. custom loader는 외부 서비스를 선택하며 export에서도 사용 가능하다.
glibc Linux는 sharp allocator 설정을 추가로 검토해 과도한 메모리를 줄일 수 있다.
minimumCacheTTL은 최적화 이미지 수명이며 해시 정적 파일 수명과 구분한다. unoptimized는 변환을 끄고 Image의 다른 사용 이점을 유지한다.
환경 변수는 기본 서버 값이고 NEXT_PUBLIC_은 build 중 client JS에 inline되어 환경별 image 승격 때 바뀌지 않는다.
await connection 이후 process.env를 읽는 동적 실행은 런타임 값을 사용해 하나의 Docker image를 여러 환경에 승격할 수 있다.
Cache Components에서는 이 요청 경계를 Suspense와 맞춘다. HTML/props로 보낸 값은 서버 변수여도 공개된다.
서버 시작 코드에는 instrumentation의 register를 사용한다.

## 캐시의 기본 저장소와 HTTP

단일 next start와 지속 local disk는 generated page/data 캐시를 재사용한다. ephemeral compute와 각 Kubernetes pod의 local 캐시는 짧은 수명/독립 복사본이다.
기존 cacheHandler 대상의 기본 캐시는 memory 50MB와 disk를 사용한다. use cache의 기본 memory와 다른 계층이다.
해시 이름의 immutable 자산은 public, max-age=31536000, immutable이며 변경 불가능한 자산에 맞춘 정책이다.
Pages getStaticProps ISR은 revalidate 초의 s-maxage와 stale-while-revalidate를 사용하며 false는 기존 모델에서1년 공유 캐시다.
정적/ISR 헤더와 App Cache Components cacheLife는 모드를 구분한다. s-maxage는 HTTP 구문상 =를 사용한다.
동적 페이지와 Draft Mode는 private, no-cache, no-store, max-age=0, must-revalidate로 사용자 응답을 공유하지 않는다.
assetPrefix로 JS/CSS origin을 분리하면 DNS/TLS 연결 시간이 추가될 수 있다.

## 사용자 캐시 구현

cacheHandler: require.resolve('./cache-handler.js')와 cacheMaxMemorySize: 0은 기존 기본 memory 계층을 끄고 handler를 지정한다.
get(key)는 저장한 entry를 반환하고 set(key,data,ctx)는 value, lastModified: Date.now(), ctx.tags를 저장하는 예다.
revalidateTag의 문자열/배열을 평탄화하고 entry.tags와 교집합이 있는 key를 지운다. resetRequestCache는 요청 단위 임시 cache를 비울 자리다.
프로세스 Map 예제는 인터페이스 설명이며 여러 pod의 공유 저장소가 아니다.
실제 구현은 durable backend, eviction, 오류 처리와 분산 태그 상태를 설계해야 consistency를 얻는다. Redis/S3는 저장소 후보다.
revalidatePath는 제공 path/type에 대응하는 특수 태그를 handler invalidation에 전달한다. 조상 layout 태그 전체가 자동 지워진다는 뜻이 아니다.
use cache 계열은 복수 cacheHandlers와 use cache: remote를 별도로 설정한다. cacheMaxMemorySize 0을 모든 캐시의 전역 off로 읽지 않는다.

## 빌드와 Action key

같은 build 산출물로 여러 인스턴스를 시작한다. stage마다 재빌드한다면 generateBuildId async 함수가 GIT_HASH 등 일관된 식별자를 반환하도록 구성한다.
이를 명령이 아니라 next.config 옵션 함수로 사용한다. deploymentId가 설정된 현재 모델에서는 고정 build ID를 쓰고 generateBuildId는 효력이 없다.
Server Function closure는 build별 key로 암호화한다. 다중 인스턴스가 같은 key를 사용하지 않으면 복호화/Action 호출 오류가 날 수 있다.
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY를 next build 시점에 제공한다. base64를 decode한 AES key는16/24/32bytes이며 기본 생성은32bytes다.
key는 build 결과에 포함되어 runtime에 사용된다. 비밀로 관리하고 같은 key만으로 서로 다른 Action ID/구현이 호환된다고 가정하지 않는다.
이 Action 계약은 App Router이며 Pages API Routes에 필수로 적용하지 않는다.

## 배포 skew

rolling deployment는 missing JS/CSS, 이전 Server Function ID, 옛 prefetch와 새 서버의 불일치를 만들 수 있다.
deploymentId: process.env.DEPLOYMENT_VERSION을 설정하면 자산 ?dpl=, client navigation의 x-deployment-id와 서버 비교를 사용한다.
불일치 시 hard navigation으로 새 문서를 읽는다. 이는 모든 인프라가 옛 asset을 제거해도 안전하다는 보장이 아니다.
전체 reload는 useState 등의 메모리 상태를 잃는다. URL/local storage에 보존한 상태는 남을 수 있으므로 미완료 입력 정책을 설계한다.

## 스트리밍과 분산 태그

Nginx는 X-Accel-Buffering: no를 응답 header로 보내거나 맞는 proxy 설정으로 buffering을 끈다.
config headers는 모든 경로 패턴에 이 key/value를 붙이는 예다. 중간 LB/압축/CDN까지 chunked HTTP/1.1 또는 HTTP/2 stream을 보존해야 한다.
AWS ALB의 Lambda 통합처럼 buffered 경로도 있어 실제 paint/chunk를 측정한다.
PPR의 shell와 dynamic을 합쳐 완료 뒤 보내면 TTFB 이점을 잃는다.
단일 인스턴스 revalidateTag 호출이 다른 인스턴스를 자동 동기화하지 않는다.
복수 cacheHandlers의 refreshTags는 요청 전에 공유 저장소의 tag 상태를 읽어 무효화를 빠르게 전파할 자리다.
공유 entry 저장과 공유 invalidation 상태의 전파를 모두 설계한다. 기존 singular handler는 해당 인터페이스의 별도 무효화 전달이 필요하다.

## Cache Components, CDN과 종료

Cache Components는 Node next start/Docker에서도 동작하고 CDN 전용 기능이 아니다. 켜는 설정과 cache boundary는 앱에서 맞춰야 한다.
기존 모드의 fully static/public과 요청 API/private 구분을 Cache Components 혼합 route 전체의 단순 판정으로 확대하지 않는다.
CDN은 HTTP cache와 HTML/RSC variant를 보존하고 서버 on-demand invalidation과 별도 purge를 연결한다.
next start의 after는 지원된다. SIGINT/SIGTERM 뒤 요청과 pending callback을 끝낼 drain을 둔다.
공식 가이드의10~30초는 권장 범위이며 인프라 timeout과 실제 작업을 측정해 설정한다.
강제 종료 전에 끝나지 않는 durable 작업은 queue/별도 worker 같은 수명 계약을 사용한다.

## 이해 확인

- 같은 Redis를 entry 저장소로 사용해도 tag 전파 구현이 필요한 이유는 무엇인가?
- Action encryption key, build ID와 deploymentId는 각각 어떤 불일치를 다루는가?

## 캐시 인터페이스 예제

다음 Map은 단일 프로세스 학습 예제다. production 공유 저장소와 eviction/오류/분산 tag 상태가 별도로 필요하다.

~~~js
// cache-handler.cjs
const entries = new Map()
module.exports = class CacheHandler {
  constructor(options) { this.options = options }
  async get(key) { return entries.get(key) }
  async set(key, data, ctx) {
    entries.set(key, {
      value: data, lastModified: Date.now(), tags: ctx.tags ?? [],
    })
  }
  async revalidateTag(tags) {
    const invalidated = [tags].flat()
    for (const [key, entry] of entries) {
      if (entry.tags.some(tag => invalidated.includes(tag))) entries.delete(key)
    }
  }
  resetRequestCache() {}
}
~~~

~~~js
// next.config.js: CommonJS 프로젝트 예제이며 next.config.cjs는 지원되지 않는다.
module.exports = {
  cacheHandler: require.resolve('./cache-handler.cjs'),
  cacheMaxMemorySize: 0,
}
~~~

## 출처

- [Next.js, self-hosting](https://nextjs.org/docs/app/guides/self-hosting)

## 관련 문서

- [[NextJS-Custom-Server]]
- [[NextJS-CDN-and-PPR]]
- [[NextJS-Environment-Variables]]
- [[NextJS-Config-Cache-Handlers]]
