---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 브라우저 성능 metric 보고"]
---

# Next.js 브라우저 성능 metric 보고

## metric 관측의 목적

서버 요청 시간이 빨라도 브라우저의 loading, interaction, layout 안정성은 나쁠 수 있다. useReportWebVitals로 직접 보고하거나 Vercel의 managed analytics로 수집/시각화를 맡길 수 있다. 실험실 Lighthouse와 실제 사용자 metric 분포는 서로 다른 근거다.

원문의 목록은 TTFB/FCP/LCP/FID/CLS/INP다. TTFB는 첫 byte, FCP는 첫 content paint, LCP는 큰 content paint, CLS는 layout shift, INP는 interaction paint다. FID는 과거 지표이며 현재 Core Web Vitals는 LCP/INP/CLS다. 설치한 web-vitals의 실제 metric 지원과 Core 집합을 구분한다.

## client boundary와 callback

~~~tsx
'use client'
import { useReportWebVitals } from 'next/web-vitals'
function report(metric: { name: string; value: number }) {
  switch (metric.name) {
    case 'FCP':
      console.log('첫 표시', metric.value)
      break
    case 'LCP':
      console.log('주요 표시', metric.value)
      break
  }
}
export function WebVitals() {
  useReportWebVitals(report)
  return null
}
~~~

server root layout의 body 안에 <WebVitals/>와 children을 함께 두면 root 전체가 아닌 작은 metric component만 client graph에 포함된다. name으로 지표별 처리하고 callback reference를 안정적으로 유지해 재등록/중복을 줄인다. 원문의 switch 예시는 break가 없어 fall-through하므로 실제 분기에서는 break/return을 채운다.

## 앱 시작 전 초기화

root instrumentation-client.js/ts는 frontend 코드 실행 전에 global analytics/error/performance setup을 실행한다. window.addEventListener('error',event=>reportError(event.error)) 같은 listener를 설정할 수 있다. reportError는 실제 수집 서비스 함수로 구현하고 초기화 비용/중복 listener/민감정보를 관리한다. 서버 register와는 다른 browser entry다.

## 외부 endpoint 전송

~~~js
function sendMetric(metric) {
  const body = JSON.stringify(metric)
  const url = '/analytics'
  if (!navigator.sendBeacon || !navigator.sendBeacon(url, body)) {
    void fetch(url, { body, method: 'POST', keepalive: true })
  }
}
~~~

원문은 sendBeacon 존재 시 호출, 없으면 fetch POST keepalive로 보낸다. 예시는 sendBeacon이 false를 반환하는 queue 실패도 fallback하도록 보강했다. 크기/lifecycle/network 조건 때문에 호출만으로 도착을 증명할 수 없으며 endpoint에서 실제 수집을 확인한다.

metric.id는 현재 page load를 구분하므로 같은 metric의 분포/percentile 집계에 사용할 수 있다. telemetry에 URL query/token/user input을 무조건 붙이지 않는다. CLS는 단위 없는 비율이고 시간 지표의 ms와 분리해 집계한다.

## Google Analytics 예시의 해석

원문 window.gtag('event',metric.name,...)은 integer value를 만들기 위해 CLS만 value*1000 후 Math.round한다. event_label:metric.id는 load별 구분, non_interaction:true는 과거 bounce-rate 영향 회피 목적이다. gtag는 먼저 초기화돼 있어야 한다.

event_label/non_interaction은 예시 당시 analytics 계약이다. 현재 GA property/version의 dimension/engagement 집계에 그대로 대응한다고 가정하지 않고 명시한 metric 이름/value/id를 해당 수집 schema로 연결한다.

## 이해 확인

LCP 값 하나가 평균 사용자 경험 전체를 설명하는가? metric name/value/id와 load별 샘플, 실제 전송 도착을 확인하고 percentile로 분포를 읽는다. root layout 전체를 Client Component로 바꾸지 않고 metric hook을 배치할 수 있는 이유를 설명한다.

## 출처

- [Next.js, analytics](https://nextjs.org/docs/app/guides/analytics)

## 관련 문서

- [[NextJS-Observability]]
- [[NextJS-Instrumentation]]
