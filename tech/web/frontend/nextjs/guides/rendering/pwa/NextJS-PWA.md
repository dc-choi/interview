---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js PWA와 Web Push"]
---

# Next.js PWA와 Web Push

## 설치와 offline은 별도 능력이다

PWA는 웹 앱에 manifest, 설치 UI, service worker와 push 같은 기능을 점진 추가하는 방식이다. manifest가 있다고 모든 브라우저가 자동 설치 prompt를 띄우거나 offline reload를 지원하는 것은 아니다. HTTPS, 브라우저/OS 정책과 사용자 설치 상태를 함께 확인한다.

app/manifest.ts 또는 manifest.json에 name, short_name, start_url, display, 색과 적절한 icons를 정의한다. 설치되지 않은 iOS 사용자에게 홈 화면 추가 절차를 안내할 수 있지만 일반 버튼 하나가 브라우저 설치를 자동 실행하지는 않는다. beforeinstallprompt는 플랫폼 공통 API가 아니다.

## Push 흐름

1. 지원 여부와 권한을 확인하고 실제 service worker URL/scope를 등록한다.
2. 사용자 동작에서 pushManager.subscribe를 호출한다. 공개 VAPID key는 client에 제공하고 private key는 서버에 보관한다.
3. subscription을 plain serializable data로 서버에 보내 검증한 사용자/기기와 연결해 저장한다.
4. 서버가 허용된 수신자에게 알림을 전송하고 service worker의 push 이벤트가 showNotification을 실행한다.
5. notificationclick은 notification을 닫고 허용한 앱 URL을 열거나 기존 client를 활성화한다. 비동기 처리는 event.waitUntil로 수명에 연결한다.

예제의 전역 subscription 변수는 단일 사용자 데모다. 여러 사용자와 재시작, 여러 instance를 처리하려면 durable storage, 구독 폐기와 실패 endpoint 정리가 필요하다. 발송 Action에도 인증, 인가, 내용 길이와 rate limit을 적용한다. private VAPID key를 NEXT_PUBLIC_에 넣지 않는다.

## Worker와 배포 일치

등록한 worker 경로와 security/header 규칙의 경로를 일치시킨다. 번들된 lib/service-worker.js URL을 쓰면서 /sw.js에만 header를 설정하면 의도한 정책이 적용되지 않을 수 있다. root scope는 worker 위치와 Service-Worker-Allowed 등 실제 브라우저 조건을 확인한다.

worker MIME/CSP, 업데이트 캐시와 lifecycle을 확인한다. no-cache 설정만으로 이미 활성화된 모든 worker가 즉시 새 코드로 교체되지는 않는다. 인증 데이터의 offline 캐시, 로그아웃과 사용자 변경 삭제 정책도 필요하다.

정적 export에서는 push subscription/발송에 필요한 Server Action을 외부 API로 옮기고 header 정책은 정적 호스트에서 적용한다. full offline caching은 service worker 전략의 영역이며 experimental useOffline의 framework retry와 구분한다.

## 검증

설치 전후, 알림 허용/거부, OS 전체 알림 차단, 구독 만료, offline reload와 재연결, 새 worker 배포를 실제 대상 기기에서 확인한다. iOS push는 지원 버전의 홈 화면 설치 앱 조건이 있으며 브라우저 기능 탐지와 생산 배포 조건을 함께 본다.

## manifest와 설치 안내

```ts
// app/manifest.ts: 아래 두 이미지 파일은 public/에 준비한다.
import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Example PWA', short_name: 'Example',
    description: 'Installable web application', start_url: '/',
    display: 'standalone', background_color: '#ffffff', theme_color: '#000000',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

정적 manifest.json도 가능하며 아이콘 생성 도구를 사용할 수 있다. 단일 코드베이스로 배포하고 앱 스토어 심사를 기다리지 않고 웹 콘텐츠를 갱신하는 장점이 있다. 설치 UI와 지원 범위는 브라우저 정책에 따른다.

Client Component Effect에서 `window.matchMedia('(display-mode: standalone)').matches`를 확인해 이미 설치된 모드에는 설치 안내를 숨긴다. 원문의 iPad/iPhone/iPod userAgent 검사는 안내용 휴리스틱이며 모든 기기 판별을 보장하지 않는다. iOS에는 공유 메뉴의 홈 화면에 추가 절차를 보여 준다. handler 없는 Add 버튼은 설치 기능을 구현한 것이 아니다. beforeinstallprompt가 없는 Safari iOS에 같은 버튼 동작을 약속하지 않는다.

## 지원과 로컬 검사

원문 기준 Web Push는 iOS 16.4 이상에서 홈 화면에 설치한 앱, macOS 13 이상 Safari 16, Chromium과 Firefox를 대상으로 설명한다. 실제 실행에서는 serviceWorker/PushManager 존재, 권한과 OS 정책을 확인한다. 설치 가능성과 완전한 offline 지원은 별도다.

`next dev --experimental-https`로 로컬 HTTPS를 사용하고 브라우저별 알림 허용과 OS 전체 차단 상태를 확인한다. 허용 prompt를 거부한 경우와 다른 브라우저에서의 차이를 비교한다. background sync, periodic background sync와 File System Access 같은 추가 능력은 브라우저 지원을 확인한 뒤 점진적으로 도입한다.

full offline caching은 Serwist의 Turbopack/webpack 통합 같은 service worker 전략으로 확장할 수 있다. useOffline/config는 연결 상태 UI와 실패한 navigation/Action 재시도이며 모든 정적 자원의 offline 저장을 대신하지 않는다. 지원하지 않는 브라우저에서도 핵심 웹 흐름이 동작하게 한다. 구현 예제와 header 계약은 [[NextJS-Web-Push]]로 이어진다.

## 출처

- [Next.js, progressive-web-apps](https://nextjs.org/docs/app/guides/progressive-web-apps)

## 관련 문서

- [[NextJS-Offline-Recovery]]
- [[NextJS-Environment-and-Deployment]]
- [[NextJS-Data-Security]]
