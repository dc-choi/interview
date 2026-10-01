---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Web Push 구독과 worker"]
---

# Next.js Web Push 구독과 worker

## 공개 키와 private 키

`web-push`를 프로젝트 서버 의존성으로 준비한다. 원문의 전역 CLI 설치는 `npm install -g web-push`이며 pnpm add -g, yarn global add, bun add -g도 같은 목적이다. `web-push generate-vapid-keys`로 만든 값을 환경변수에 넣는다.

```dotenv
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

서버의 `webpush.setVapidDetails('mailto:push@example.com', publicKey, privateKey)`에는 실제 운영 연락 URI를 설정하며 `<mailto:...>`의 꺾쇠는 넣지 않는다. private key는 서버에만 둔다. `NEXT_PUBLIC_` 값은 client build에 포함되는 공개 정보다.

## 브라우저 등록과 구독

예제는 `public/sw.js`를 실제 URL `/sw.js`로 등록해 아래 header 경로와 일치시킨다. 원문의 `new URL('../lib/service-worker.js', import.meta.url)`은 번들 URL을 사용하므로 배포 산출 URL, root scope 허용과 header 매칭을 별도로 확인해야 한다.

```ts
const decodePublicKey = (value: string) => {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0))
}
const register = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/', updateViaCache: 'none',
  })
  await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}
// subscribeUser는 아래 서버 계약을 구현한 Action이다. 사용자 클릭에서 실행한다.
const subscribe = async () => {
  const registration = await navigator.serviceWorker.ready
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) throw new Error('Missing public VAPID key')
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true, applicationServerKey: decodePublicKey(key),
  })
  await subscribeUser(subscription.toJSON())
  return subscription
}
```

Client Component는 지원 여부, 현재 subscription과 테스트 message를 state로 관리한다. Effect에서 register를 호출하고 실패 상태를 표시한다. 구독 중에는 Unsubscribe와 메시지 전송 UI, 없으면 Subscribe를 보여 준다. 권한 요청은 사용자 동작에서 수행한다. 원문의 JS 예제에 남은 TypeScript `!`/`as any`, 잘못 escape된 base64 정규식과 raw PushSubscription 전달을 그대로 복사하지 않는다.

구독 해지는 `subscription.unsubscribe()` 결과와 서버 삭제를 모두 확인하고 UI를 갱신한다. 한쪽 실패 시 재시도/동기화가 필요하다. 메시지 입력은 성공적으로 sendNotification을 마친 뒤 비운다. pending 중 중복 클릭과 사용자에게 보이는 오류 처리도 둔다.

## Server Action 계약

`'use server'` 모듈의 subscribeUser, unsubscribeUser와 sendNotification은 공개 호출 경계다. 다음은 저장소 계약을 설명하는 의사코드이며 DB와 validator를 앱이 제공해야 한다.

```ts
'use server'
import webpush from 'web-push'
import { requireUser, validateSubscription, db } from '@/lib/push-data'
export async function subscribeUser(input: unknown) {
  const user = await requireUser()
  const sub = validateSubscription(input)
  await db.saveSubscription(user.id, sub)
  return { success: true }
}
export async function unsubscribeUser(endpoint: string) {
  const user = await requireUser()
  await db.removeOwnedSubscription(user.id, endpoint)
  return { success: true }
}
export async function sendNotification(message: string) {
  const user = await requireUser()
  if (typeof message !== 'string' || message.length > 500) throw new Error('Invalid message')
  const sub = await db.findOwnedSubscription(user.id)
  if (!sub) throw new Error('No subscription available')
  await webpush.sendNotification(sub, JSON.stringify({
    title: 'Notification', body: message, icon: '/icon.png',
  }))
  return { success: true }
}
```

VAPID 설정은 서버 모듈 초기화에서 완료되어야 한다. validateSubscription은 endpoint, keys.auth/p256dh와 허용 push-service 목적지를 검사한다. 서버가 임의 URL로 요청하는 통로를 만들지 않는다. 발송 권한과 rate limit을 별도로 적용한다. 원문의 전역 `let subscription`은 단일 데모 상태라 재시작과 다중 사용자/서버에 쓸 수 없다. 브라우저 PushSubscription 인스턴스 대신 서버 라이브러리가 요구하는 plain payload를 저장하고 만료 endpoint는 정리한다. 발송 실패를 성공으로 표시하지 않는다.

## push와 notificationclick 수명

```js
// public/sw.js: 서버에서 검증한 payload만 발송하는 계약과 함께 사용한다.
self.addEventListener('push', event => {
  if (!event.data) return
  let data
  try { data = event.data.json() } catch { return }
  if (typeof data.title !== 'string' || typeof data.body !== 'string') return
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icon.png', badge: '/badge.png',
    vibrate: [100, 50, 100], data: { dateOfArrival: Date.now(), primaryKey: '2' },
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow(new URL('/', self.location.origin).href))
})
```

icon/badge는 public 파일로 준비한다. 원문처럼 사용자 정의 icon을 받으려면 허용 origin/path를 검증한다. vibrate는 지원 기기에만 적용된다. data에는 후속 클릭 처리용 정보를 넣을 수 있다. 원문의 `<https://your-website.com>`은 실제 유효한 앱 URL로 바꿔야 한다. 임의 외부 URL을 클릭 대상으로 신뢰하지 않는다. 비동기 showNotification/openWindow는 waitUntil로 worker 이벤트 수명에 연결한다.

## header와 배포

```js
module.exports = {
  async headers() {
    return [
      { source: '/(.*)', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ] },
      { source: '/sw.js', headers: [
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
      ] },
    ]
  },
}
```

nosniff는 MIME 추측을 막고 DENY는 iframe embedding을 막는다. Referrer-Policy는 cross-origin 전달 정보를 제한한다. worker MIME은 JavaScript여야 하고 CSP는 worker 자신의 실행 정책이다. 이 정책이 document CSP를 대신하지 않는다. HTTP 캐시를 막아도 이미 활성화된 worker가 모든 탭에서 즉시 교체되지는 않는다.

정적 export에서는 Action을 외부 API로 옮기고 header는 정적 호스트/프록시에 설정한다. Next Proxy 런타임이 static export에 생기는 것은 아니다. HTTPS, 설치 상태, OS 알림, 만료 구독, worker 업데이트와 offline/reconnect를 기기별로 확인한다.

## 출처

- [Next.js, progressive-web-apps](https://nextjs.org/docs/app/guides/progressive-web-apps)

## 관련 문서

- [[NextJS-PWA]]
- [[NextJS-Content-Security-Policy]]
- [[NextJS-Offline-Recovery]]
