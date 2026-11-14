---
tags: [web, frontend, performance, ttfb, seo, crawling, cdn]
status: done
verified_at: 2026-11-14
category: "웹&네트워크(Web&Network)"
aliases: ["TTFB와 검색 크롤링", "TTFB and Search Crawling", "Time to First Byte"]
---

# TTFB와 검색 크롤링

TTFB(Time to First Byte)는 페이지 이동을 시작한 때부터 응답의 첫 바이트가 도착하기 시작할 때까지의 시간이다. 화면에는 보이지 않지만 그 뒤의 모든 로딩 지표가 이 시간 뒤에서 시작하고, 검색엔진 크롤러가 사이트를 얼마나 수집할지에도 응답 시간이 들어간다. 기능이 비슷한 작은 사이트가 많은 검색어에서는 크롤러가 읽을 수 있는 HTML과 빠른 첫 응답이 사람과 크롤러 양쪽의 경험을 가른다.

## TTFB를 이루는 단계

web.dev는 TTFB를 다음 단계의 합으로 정의한다.

1. 리디렉션 시간
2. 서비스 워커 시작 시간(있는 경우)
3. DNS 조회
4. 연결과 TLS 협상
5. 요청을 보내고 응답의 첫 바이트가 도착할 때까지

마지막 단계에는 서버가 응답을 만드는 시간이 들어 있다. 요청마다 DB를 조회하고 HTML을 조립하는 사이트는 그 시간이 매번 TTFB에 더해진다.

연결, TLS와 요청은 각각 서버까지 왕복해야 끝난다. TCP 위의 새 HTTPS 연결(HTTP/1.1, HTTP/2)이고 TLS 1.3 전체 handshake면 TCP 3-way handshake 1회, TLS handshake 1회, 요청과 응답 1회로 3번 왕복한다(계산 예시, DNS 조회 제외). TLS 1.2 전체 handshake는 왕복이 1회 더 많고, 전송과 암호 handshake를 합친 HTTP/3(QUIC)나 연결 재사용, 0-RTT 재개는 더 적다([[Browser-URL-Flow|브라우저 URL 처리 흐름]]). 거리가 멀수록 이 왕복 시간(RTT)이 그대로 곱해진다. 광섬유의 굴절률을 약 1.47로 잡으면 빛은 대략 초속 20만 km로 달리므로, 대권 거리 약 1만 1천 km인 서울과 뉴욕 사이는 이론상 왕복만 0.11초다(계산 예시). 실제 케이블 경로와 중간 장비를 거치면 더 길어진다. 서버 사양을 올려도 서버가 응답을 만드는 시간만 줄 뿐 거리에서 오는 지연은 줄지 않는다.

## 기준값과 다른 지표의 관계

| 지표 | 좋음 기준 | Core Web Vitals |
|---|---|---|
| TTFB | 0.8초 이하(1.8초 초과는 나쁨) | 아님 |
| LCP | 2.5초 이하 | 해당 |

- TTFB는 FCP와 LCP보다 앞선다. 내비게이션 요청에서 TTFB가 1초면 LCP는 1초 아래로 내려갈 수 없다.
- web.dev는 TTFB 기준을 대략적인 지침으로 둔다. 클라이언트 작업이 적은 서버 렌더링 사이트는 TTFB가 조금 높아도 FCP와 LCP가 더 좋을 수 있다. 반대로 SPA처럼 첫 HTML 뒤에 클라이언트 작업이 많은 구조는 TTFB를 낮추는 것이 특히 중요하다.
- Core Web Vitals는 실제 사용자 페이지 로드의 75번째 백분위수를 모바일과 데스크톱으로 나눠 평가한다. CrUX 전역 데이터셋에는 모든 국가의 사용자 경험이 들어가므로 해외 방문자의 느린 기록도 그 분포에 포함된다. CrUX는 국가 수준 데이터도 제공하며, Google 검색이 어느 단위를 쓰는지는 확인한 문서에 없다.
- Google 검색의 순위 시스템은 Core Web Vitals를 사용한다. 다만 Google은 페이지 경험이 떨어져도 가장 관련성 높은 콘텐츠를 보여준다고 밝히며, 도움이 되는 콘텐츠가 많은 검색어에서 좋은 페이지 경험이 성과에 기여할 수 있다고 설명한다. 속도를 콘텐츠 관련성의 대체물로 보지 않는다.

## 크롤러가 읽는 HTML

Google은 JavaScript 웹 앱을 크롤링, 렌더링, 색인의 세 단계로 처리한다. 200 응답 페이지는 모두 렌더링 대기열에 들어가며 대기 시간은 몇 초일 수도 있고 더 길어질 수도 있다. 첫 HTML에 내용이 없고 JavaScript가 화면을 채우는 페이지는 렌더링이 끝나야 내용이 보인다. Google은 서버 렌더링이나 사전 렌더링이 사용자와 크롤러 모두에게 빠르고, 모든 봇이 JavaScript를 실행하지는 않으므로 여전히 좋은 선택이라고 안내한다.

- 브라우저의 페이지 소스 보기에서 제목과 본문이 보이는지 확인한다. 빈 루트 요소만 있으면 첫 HTML에 내용이 없는 구조다.
- React 같은 클라이언트 렌더링 도구도 빌드 때 페이지마다 HTML을 만드는 정적 생성이나 사전 렌더링을 쓸 수 있다([[Frontend-Rendering-Models|프런트엔드 렌더링 모델]]).
- 랭킹이나 방문자 수처럼 자주 바뀌는 값만 화면이 뜬 뒤 별도 요청으로 받는다. 검색에 걸려야 하는 본문은 첫 HTML에 둔다.
- 언어별 URL을 따로 두면 hreflang으로 대체 언어 버전을 알린다. Google은 HTML, HTTP 헤더, 사이트맵의 세 방법을 지원한다.

## 크롤링 속도와 응답 시간

Google 크롤링 문서에 따르면 Googlebot의 기본 IP는 미국에 있는 것으로 보이며, 미국 밖 IP로도 함께 크롤링한다. 한 지역에만 서버를 두면 다른 대륙의 사용자뿐 아니라 크롤러도 먼 거리를 왕복한다.

Google은 사이트가 일관되게 응답하고 응답 시간이 안정적이거나 개선되면 크롤링 용량 한도를 올리고, 느려지거나(지연 증가나 응답 시간 증가) 5xx 오류나 HTTP 429 같은 rate-limit 신호를 내면 한도를 내린다. 크롤링 예산 문서는 이 응답 시간에 지연과 TTFB가 포함된다고 명시한다. 다만 이 문서의 주 대상은 고유 페이지 100만 개 이상이면서 주 1회 정도 바뀌는 사이트, 1만 개 이상이면서 매일 바뀌는 사이트, Search Console에서 발견됨 - 현재 색인이 생성되지 않음으로 분류된 URL 비중이 큰 사이트이며, 페이지 수도 정확한 경계가 아닌 대략적인 분류다. 페이지가 적고 그 상태의 URL 비중도 크지 않으면 크롤링 예산을 주요 원인으로 먼저 의심하지 않는다.

Search Console의 설정에 있는 크롤링 통계 보고서는 기간 내 사이트에서 가져온 모든 리소스의 평균 응답 시간을 보여 준다. 페이지가 연결한 리소스도 각각 별도 응답으로 센다. 이 보고서는 루트 수준 속성에서만 볼 수 있다.

## 구조로 줄이는 방법

1. **미리 만든다**: 방문자마다 같은 페이지는 정적 HTML로 만들어 요청 시점의 서버 처리 시간을 없앤다. 크롤러가 읽을 내용도 첫 HTML에 들어간다([[Web-Service-Structure|웹 서비스 구조의 서버 구성 선택]]).
2. **사용자 가까이 복제한다**: 오리진은 한 곳에 두고 앞에 CDN을 세워 가까운 엣지가 연결, TLS와 응답을 처리하게 한다.
3. **HTML도 캐시되는지 확인한다**: Cloudflare 일반 CDN의 기본 캐시 대상은 확장자 기준이라 HTML이 빠져 있다. 이미지와 CSS만 캐시되면 TTFB를 만드는 HTML은 여전히 오리진까지 간다. 공개 경로만 캐시 대상으로 지정하고 로그인 화면처럼 사용자마다 다른 HTML은 제외한다([[Cloudflare-HTML-Cache|Cloudflare HTML 캐시]]).

## 측정과 해석

- 여러 지역에서 TTFB를 단계별(DNS, TCP, TLS, 서버 대기)로 나눠 잰다. 가까운 지역은 빠르고 먼 지역만 느리면 거리 문제이고, 모든 지역에서 서버 대기가 길면 서버의 응답 생성 문제다.
- 측정 도구가 HEAD 요청을 쓰면 실제 페이지 GET 요청과 결과가 다를 수 있으므로 GET으로 다시 잰다.
- CDN을 붙인 뒤에는 HTML 문서 요청의 캐시 상태 헤더와 TTFB를 변경 전후로 비교한다.
- 실험실 측정과 실제 사용자 분포(CrUX, PageSpeed Insights의 실제 사용자 데이터)를 구분한다.

## 면접 체크포인트

- TTFB가 Core Web Vitals가 아닌데도 중요한 이유는 FCP와 LCP의 시작점이기 때문이다.
- 해외 사용자의 TTFB가 느릴 때 서버 증설보다 정적 생성과 CDN을 먼저 검토하는 이유는 왕복 지연이 거리에 묶여 있기 때문이다.
- CDN을 붙여도 TTFB가 그대로라면 HTML이 캐시 대상인지부터 확인한다.

## 출처

- [Time to First Byte (TTFB) — web.dev](https://web.dev/articles/ttfb)
- [Largest Contentful Paint (LCP) — web.dev](https://web.dev/articles/lcp)
- [Chrome for Developers, CrUX methodology](https://developer.chrome.com/docs/crux/methodology)
- [Google Search Central, Understand JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Crawling Infrastructure, Crawl budget management for large sites](https://developers.google.com/crawling/docs/crawl-budget)
- [Google Search Central, Locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages)
- [Google Search Central, Tell Google about localized versions of your page](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google Search Central, Understanding page experience in Google Search results](https://developers.google.com/search/docs/appearance/page-experience)
- [Search Console Help, Crawl Stats report](https://support.google.com/webmasters/answer/9679690)
- [Cloudflare, Default cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)
- [IETF, RFC 9846 The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc9846.html)
- [IETF, RFC 9000 QUIC: A UDP-Based Multiplexed and Secure Transport](https://www.rfc-editor.org/rfc/rfc9000)

## 관련 문서

- [[Cloudflare-HTML-Cache|Cloudflare HTML 캐시]]
- [[Frontend-Rendering-Models|프런트엔드 렌더링과 상호작용 모델]]
- [[Web-Service-Structure|웹 서비스의 구조]]
- [[SEO-Google-Naver-Operations|Google과 네이버 SEO 운영]]
- [[Browser-URL-Flow|브라우저 URL 처리 흐름]]
- [[Latency-Optimization|레이턴시 최적화]]
