---
tags: [infrastructure, cloudflare, cdn, cache, html]
status: done
verified_at: 2026-10-07
category: "Infrastructure - Network"
aliases: ["Cloudflare HTML 캐시", "Cloudflare HTML Cache"]
---

# Cloudflare HTML 캐시

Cloudflare 프록시를 경유하는 것과 HTML 응답이 엣지 캐시에 저장되는 것은 다르다. 일반 CDN의 기본 정책은 파일 확장자를 기준으로 하며 HTML과 JSON은 기본 캐시 대상이 아니다. CSS와 JS가 캐시되어도 첫 HTML 요청은 오리진 응답을 기다릴 수 있다. 이 문서는 일반 CDN의 Cache Rules를 다루며 Workers나 Pages의 별도 동작까지 같은 정책으로 가정하지 않는다.

## 캐시 대상 지정과 실제 저장

Cache Rules의 `Eligible for cache`는 일치하는 요청을 캐시 후보로 만든다. 응답이 반드시 저장된다는 보장은 아니다. 오리진의 캐시 지시자와 `Set-Cookie`, 적용된 Edge TTL 설정도 실제 저장 여부에 영향을 준다.

공개 HTML을 캐시할 때는 다음 순서로 범위를 정한다.

1. 모든 방문자에게 같은 응답을 주는 공개 경로만 선택한다.
2. 해당 경로를 `Eligible for cache`로 지정한다.
3. Edge TTL은 오리진의 캐시 지시자를 따르도록 정한다. 헤더가 없으면 캐시를 건너뛰는 옵션도 있다.
4. 로그인, 계정, 장바구니와 결제 경로는 캐시 제외 규칙으로 보호한다. 같은 공개 URL이 세션에 따라 달라지면 경로만으로 구분하지 말고 세션 조건도 확인한다.

`Ignore cache-control header and use this TTL`은 오리진 지시자를 무시하는 설정이다. 캐시 적중률을 높이려고 전체 사이트에 적용하면 로그인 HTML이 저장되거나 `Set-Cookie`가 제거되어 세션이 깨질 수 있다. 캐시 적용보다 공개 응답과 개인화 응답의 구분이 먼저다.

## 응답 헤더로 확인

브라우저 개발자 도구에서 이미지나 JS가 아니라 **HTML 문서 요청**의 `CF-Cache-Status`를 확인한다. 공개 페이지를 같은 조건으로 반복 요청하고 캐시 제외 경로도 별도로 확인한다.

| 상태 | 해석 |
|---|---|
| `HIT` | Cloudflare 캐시에서 응답을 찾음 |
| `MISS` | 캐시 대상이지만 요청 시 저장된 응답이 없어 오리진에서 가져옴 |
| `DYNAMIC` | 요청 단계에서 캐시 대상이 아니라고 판단함. HTML 기본 정책이나 캐시 제외 규칙 등이 원인 |
| `BYPASS` | 요청은 캐시 후보였지만 오리진 응답 조건 등에 따라 저장하지 않음 |

캐시 제외 규칙의 결과가 반드시 `BYPASS`라는 뜻은 아니다. 요청 단계에서 제외하면 `DYNAMIC`이 나올 수 있다. `MISS` 한 번만으로 규칙 실패를 단정하지 않고, 반복 요청의 상태와 응답 헤더를 함께 본다.

## 적용 판단과 확인 범위

- 공개 소개 페이지는 캐시 후보지만, 로그인 상태나 사용자별 데이터에 따라 바뀌는 HTML은 공유 캐시에서 제외한다.
- `HIT`은 캐시 적중의 근거다. 실제 속도 개선은 HTML의 TTFB와 전체 페이지 로딩 시간을 변경 전후로 측정한다.
- 배포한 HTML의 반영 시점은 TTL과 무효화 정책에 달려 있다. 새 배포가 캐시 때문에 늦게 보이는지도 확인한다.
- 이 문서는 공식 문서 대조 결과다. 실제 계정의 규칙 변경이나 성능 측정을 수행한 기록은 아니다.

## 출처

- [Cloudflare, Default cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)
- [Cloudflare, Cache Rules settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/)
- [Cloudflare, Cloudflare cache responses](https://developers.cloudflare.com/cache/concepts/cache-responses/)
- [Cloudflare, Dynamic content and login issues](https://developers.cloudflare.com/cache/troubleshooting/dynamic-content-and-login-issues/)

## 관련 문서

- [[CDN|CDN의 캐시 키, TTL과 무효화]]
- [[Cloudflare-vs-Vercel-Hosting|Cloudflare와 Vercel 호스팅 선택]]
- [[Latency-Optimization|레이턴시 최적화]]
