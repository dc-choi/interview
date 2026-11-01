---
tags: [security, crawler, rate-limit, observability, robots-txt, ai-crawler, cache]
status: done
verified_at: 2026-11-01
category: "보안(Security)"
aliases: ["Bot Traffic Operations", "봇 트래픽 운영", "AI 크롤러와 robots.txt"]
---

# 봇 트래픽의 관측과 제한

사용자 분석 도구의 방문 수와 서버가 처리한 요청 수는 다르다. JavaScript를 실행하지 않는 크롤러는 페이지 분석에 잘 드러나지 않으면서 서버 자원을 소비할 수 있다.

## 부하를 설명하는 근거

인증 사용자 수만으로 부하를 추정하지 않고 경로별 요청, 응답 코드, 처리 시간, 전송량과 서버 자원을 연결한다. 특정 User-Agent를 봤다는 사실만으로 요청자의 신원을 확정하지 않는다. 정상 검색 유입과 반복 수집, 취약점 탐색을 요청 패턴과 실제 비용으로 구분한다.

`robots.txt`는 협조하는 크롤러에 대한 요청이지 접근 차단 장치가 아니다. 인증이 필요한 데이터는 인증/인가로, 비용이 큰 공개 경로는 캐시와 요청 제한 등 서버 측 제어로 보호한다. 제한 단위는 IP 하나에 고정하기보다 공유망 사용자와 우회 가능성도 고려한다.

## 수집기 이름과 실제 요청자

`robots.txt`의 그룹은 수집기가 스스로 정한 이름(product token)으로 고른다. RFC 9309는 이 이름을 대소문자 구분 없이 비교하게 하고, HTTP에서는 이 이름이 `User-Agent` 헤더의 부분 문자열이어야 한다(SHOULD)고만 정한다. 그래서 로그에는 `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot`처럼 이름이 든 긴 문자열이 남고 버전 숫자는 바뀔 수 있으며, OpenAI는 `robots.txt`를 가져올 때 User-Agent에 `robots.txt` 표시를 더할 수 있다고 밝힌다. 로그에서는 전체 문자열이 아니라 이름이 들어 있는지로 찾는다. `Google-Extended`처럼 별도 HTTP User-Agent 없이 `robots.txt`에서만 쓰는 제어용 이름은 로그에 나오지 않는다. 아래 표는 2026-11-01 각 운영사 공식 문서 기준이며 이름과 정책은 바뀔 수 있다.

| 이름 | 운영사와 용도 | robots.txt와 사용자 요청형 가져오기 |
|---|---|---|
| `GPTBot` | OpenAI. 생성형 AI 기반 모델을 더 유용하고 안전하게 만드는 데 쓰는 수집 | 막으면 콘텐츠를 기반 모델 학습에 쓰지 말라는 뜻으로 본다 |
| `OAI-SearchBot` | OpenAI. ChatGPT 검색 결과 노출 | 막은 사이트는 검색 답변에 나오지 않지만 탐색 링크로는 나올 수 있다. 검색 반영에 약 24시간이 걸릴 수 있다 |
| `ChatGPT-User` | OpenAI. ChatGPT와 Custom GPT의 사용자 행동, 자동 수집에는 쓰지 않음 | 사용자가 시작한 행동이라 robots.txt 규칙이 적용되지 않을 수 있다. 검색 노출 판단에 쓰지 않으므로 검색 거부는 `OAI-SearchBot`으로 한다 |
| `ClaudeBot` | Anthropic. 생성형 AI 모델 학습에 쓰일 수 있는 웹 콘텐츠 수집 | 막으면 이후 자료를 학습 데이터에서 빼라는 신호로 본다 |
| `Claude-User` | Anthropic. 사용자 질문에 필요한 페이지 가져오기 | 막으면 사용자 질문에 맞춰 콘텐츠를 가져오지 않고, 사용자 주도 검색에서 노출이 줄 수 있다 |
| `Claude-SearchBot` | Anthropic. 사용자 검색 결과 품질 개선 | 막으면 검색용 색인에서 빠져 검색 결과의 노출과 정확도가 줄 수 있다 |
| `Google-Extended` | Google. Gemini 모델 학습과 grounding에 쓸지 제어 | 별도 HTTP User-Agent 없이 기존 Google 수집기가 가져온다. Google 검색 포함과 순위에는 영향이 없다 |
| `CCBot` | Common Crawl. 누구나 쓸 수 있는 공개 크롤 데이터 수집 | 페이지를 가져오기 전에 robots.txt를 확인하고 `Crawl-delay`를 따른다 |
| `PerplexityBot` | Perplexity. 검색 결과 노출, AI 기반 모델용 수집에는 쓰지 않음 | 검색에 나오려면 robots.txt와 공개 IP 대역에서 허용하라고 권한다 |
| `Perplexity-User` | Perplexity. 사용자 질문에 답할 페이지 방문 | 사용자가 요청한 가져오기라 robots.txt 규칙을 대체로 무시한다 |

Anthropic은 자사 봇이 robots.txt의 수집 금지 지시를 따르고 비표준 `Crawl-delay`도 지원한다고 밝히며, IP 차단은 robots.txt를 읽지 못하게 해 거부가 제대로 반영되지 않을 수 있다고 안내한다. OpenAI와 Perplexity는 봇별 설정이 서로 독립적이라고 밝히며, OpenAI는 `OAI-SearchBot`은 허용하고 `GPTBot`만 막는 예를 든다. Perplexity는 반영에 최대 24시간이 걸릴 수 있다고 밝힌다. Google은 2027년 초 AIPREF 공통 학습 선호 신호(`user-agent: __usage_ai-training`)를 지원할 계획이라고 밝혔다(2026-10-30 갱신판).

User-Agent는 요청자가 적는 값이라 그대로 흉내 낼 수 있다. OpenAI, Anthropic, Common Crawl과 Perplexity는 수집기 IP 목록을 JSON으로 공개한다(OpenAI와 Perplexity는 봇마다 따로). Anthropic은 출발 IP가 목록에 있으면 Anthropic 수집기라고 안내하고, Common Crawl은 전용 IP 대역에 역방향 DNS를 붙여(IPv6 제외) 로그의 요청이 실제 CCBot인지 확인할 수 있게 한다. Google은 IP의 역방향 DNS 이름이 `googlebot.com`, `google.com`, `googleusercontent.com` 아래인지 보고 그 이름을 정방향으로 다시 조회해 원래 IP가 나오는지 확인하는 방법과, 수집기 종류별 공개 IP 대역 JSON과 대조하는 방법을 안내한다. User-Agent만 바꾼 요청이 실제 수집기와 다른 본문을 받을 수 있다는 점은 [[Web-Content-Manipulation-for-AI#화면과 수집 결과를 대조한다|AI가 읽는 웹 콘텐츠의 조작]]에 있다. 목록은 바뀌므로 허용이나 차단 규칙에 쓰면 주기적으로 다시 받는다(운영 제안).

## robots.txt를 쓸 때 확인할 범위

- **공개 파일이다:** RFC 9309 보안 고려사항은 이 프로토콜이 콘텐츠 보안 수단을 대신하지 않고, 경로를 적으면 공개돼 발견될 수 있다고 경고한다. 숨기려는 경로는 적지 않고 인증으로 보호한다.
- **위치와 형식:** 서비스 최상위의 `/robots.txt`(소문자)에 UTF-8, `text/plain`으로 둔다. 규칙은 파일이 있는 호스트, 프로토콜, 포트에만 적용되므로 하위 도메인마다 둔다([[SEO-Google-Naver-Operations|Google과 네이버 SEO 운영]]). 배포 뒤 `curl -I`로 상태 코드와 `Content-Type`을 확인한다(운영 제안).
- **반영 시간:** RFC 9309는 파일에 닿지 못할 때를 빼면 캐시본을 24시간 넘게 쓰지 않도록 권고한다(SHOULD NOT). Google은 대체로 최대 24시간 캐시하고, 시간 초과나 5xx로 새로 받지 못하면 더 오래 쓰며, `Cache-Control`의 `max-age`에 따라 수명을 늘리거나 줄일 수 있다고 밝힌다. 수정 직후 로그에는 옛 규칙의 결과가 섞이므로 하루 이상 지나 비교한다(운영 제안).
- **응답 코드:** 4xx면 RFC 9309상 수집기는 서버의 모든 자원에 접근해도 되고(MAY), Google은 429를 뺀 4xx를 파일이 없는 것으로 보아 제한이 없다고 간주하며 401과 403으로 수집 속도를 줄이지 말라고 한다. 서버나 네트워크 오류면 RFC 9309상 전체 금지로 가정해야 하고(MUST), Google은 시간 초과도 서버 오류로 보아 처음 12시간 동안 사이트 수집을 멈춘 채 파일을 다시 시도하고 이후 30일 동안 마지막 정상본을 쓴다. 차단 규칙이 `/robots.txt`에 403을 돌려주면 거부 의사가 전달되지 않고, 과부하로 5xx나 시간 초과가 나면 검색 수집까지 멈출 수 있다(이 문서의 해석). `/robots.txt`는 앱을 거치지 않는 정적 파일로 두고 차단과 요청 제한 규칙에서 뺀다(운영 제안). 수집기 쪽 처리 기준은 [[External-Collection-Pipeline-Reliability#6. 규범 준수의 기술적 기준선|외부 수집 파이프라인의 규범 준수]]에 있다.
- **그룹 선택:** 이름이 일치하는 그룹이 없는 수집기는 `User-agent: *` 그룹을 따라야 한다(MUST). 따라서 `User-agent: *`에 `Disallow: /`를 쓰면 이름별 그룹이 없는 검색 수집기까지 막는다. Google은 가장 구체적으로 일치하는 그룹을 따르고 그 그룹과 `*` 그룹을 합치지 않으므로, 이름별 그룹을 만들면 `*` 그룹의 규칙 중 필요한 것을 그 그룹에도 적는다(운영 제안).
- **Crawl-delay:** RFC 9309에 없는 필드다. Google은 지원하지 않고 Anthropic과 Common Crawl은 따른다고 밝힌다. 속도는 서버 쪽 요청 제한으로 묶는다.

한 그룹은 여러 `User-agent` 줄로 시작할 수 있다. 아래는 학습 사용을 거부하는 이름만 모은 예로, `Google-Extended`는 grounding 사용도 함께 거부한다. 검색용 수집기는 그대로 남고, 협조하는 수집기에만 효과가 있다.

```text
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
Disallow: /
```

## 서버 측 방어를 쌓는 순서

이 절은 비용이 낮고 되돌리기 쉬운 계층부터 쌓는 운영 제안이다. 관찰, robots.txt(위 절), 캐시, 요청 제한, WAF 순서로 갈수록 강제력이 커지지만 정상 요청을 막을 위험과 설정 부담도 함께 커진다. 계층을 다 쌓아도 모든 봇이 막힌다는 보장은 없다.

### 관찰

경로, User-Agent, IP와 시간대별 요청 수를 먼저 센다. 측정 없이 차단부터 하면 무엇이 효과였는지 설명할 수 없다. nginx 기본 `combined` 형식에서는 큰따옴표로 나눈 여섯 번째 필드가 User-Agent이고, 공백으로 나누면 첫 필드가 IP, 일곱 번째 필드가 요청 경로다.

```sh
awk -F'"' '{print $6}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
```

한 IP가 짧은 시간에 서로 다른 경로를 대량으로 훑는 것, HTML만 받고 이미지와 CSS는 받지 않는 것, Referer가 빈 것, 오래된 글과 페이지네이션을 순서대로 도는 것은 의심 신호다. RSS 리더, 모니터링 도구와 자기 헬스 체크도 비슷하게 보이므로 신호 하나로 봇이라 단정하지 않는다. `log_format`에 `$request_time`과 `$upstream_cache_status`를 더하면 같은 로그에서 처리 시간과 캐시 결과를 본다. robots.txt를 바꾼 뒤 `/robots.txt`를 읽은 User-Agent와 그 뒤의 금지 경로 요청을 시간순으로 대조한 결과는 준수 여부의 단서로만 쓴다. 캐시본이 하루 가까이 쓰일 수 있고(위 반영 시간) Google은 캐시한 응답을 여러 수집기가 공유할 수 있다고 밝히므로, `/robots.txt` 요청 기록이 없다는 사실만으로 읽지 않았다고 단정하지 않는다. User-Agent의 이름은 위 공개 IP 목록으로 확인하고, OpenAI가 robots.txt 규칙이 적용되지 않을 수 있다고 밝힌 `ChatGPT-User`, Perplexity가 robots.txt 규칙을 대체로 무시한다고 밝힌 `Perplexity-User` 같은 사용자 요청형 가져오기는 따로 센다.

### 캐시

캐시는 요청을 막지 않고 요청의 비용을 줄인다. `Cache-Control: public, max-age=300, s-maxage=3600`이면 브라우저는 5분, CDN이나 리버스 프록시 같은 공유 캐시는 `s-maxage`가 `max-age`를 덮어써 1시간 재사용할 수 있다([[HTTP-Caching|HTTP 캐싱]], [[CDN|CDN]]). nginx `proxy_cache`에서는 다음이 원본 보호에 직접 닿는다.

- `proxy_cache_lock on`: 새 캐시 항목은 한 번에 한 요청만 원본에 보내 채우고, 같은 항목의 나머지 요청은 응답이 캐시에 들어오거나 그 항목의 잠금이 풀릴 때까지, 최대 `proxy_cache_lock_timeout`(기본 5초) 동안 기다린다. 시간이 지나면 원본으로 보내되 그 응답은 캐시하지 않는다. 채우려고 마지막으로 보낸 요청이 `proxy_cache_lock_age`(1.7.8, 기본 5초) 동안 끝나지 않으면 요청 하나를 더 원본에 보낼 수 있다.
- `proxy_cache_use_stale`: `error`, `timeout`, `http_500`, `http_502`, `http_503`, `http_504` 같은 조건에서 오래된 캐시 응답을 대신 주고, `updating`을 더하면 갱신 중에도 오래된 응답을 줘 원본 접근을 줄인다.
- `$upstream_cache_status`: `MISS`, `BYPASS`, `EXPIRED`, `STALE`, `UPDATING`, `REVALIDATED`, `HIT` 중 하나다. 같은 URL을 두 번 요청해 `MISS` 다음 `HIT`가 남는지 본다.

로그인, 관리자, 결제, API처럼 사용자마다 응답이 다른 경로와 세션 쿠키가 있는 요청은 공유 캐시에서 뺀다. RFC 9111은 `private` 응답을 공유 캐시가 저장하지 못하게 하고, `Set-Cookie`는 캐시를 막지 않으므로 서버가 `Cache-Control`로 직접 제어하라고 권한다. nginx는 `Set-Cookie`가 있는 응답을 캐시하지 않지만 `proxy_ignore_headers`로 이 처리를 끌 수 있고, 기본 캐시 키 `$scheme$proxy_host$request_uri`에는 요청 쿠키가 없다. 로그인 여부로 본문이 달라지는 경로는 `proxy_cache_bypass`와 `proxy_no_cache`에 세션 쿠키 변수(예: `$cookie_session`, 이름은 앱에 맞춘다)나 `$http_authorization`을 줘 캐시에서 꺼내지도 저장하지도 않게 한다.

### 요청 제한과 WAF

캐시를 비켜 가는 검색 결과, 매번 다른 쿼리 문자열과 동적 경로에는 클라이언트별 속도 상한을 둔다. nginx `limit_req`의 설정, 시험 모드와 IP 키의 한계는 [[Rate-Limiting#nginx limit_req로 적용할 때|요청 제한 설계]]에 있다. 여러 IP로 분산된 수집은 IP 기준 한도로 묶기 어렵다.

WAF는 앞 계층을 지나 남은 특정 경로나 봇에 User-Agent, 경로, IP 평판 조건의 규칙을 둔다. 처음에는 AWS WAF의 `Count`처럼 허용이나 차단을 정하지 않고 매칭만 세는 동작으로 켜서 걸린 요청의 User-Agent와 경로를 확인한 뒤 차단으로 바꾼다. Challenge와 CAPTCHA는 기록만 하는 동작이 아니다. AWS WAF는 유효한 토큰이 없는 요청을 원래 목적지로 보내지 않고 Challenge는 202, CAPTCHA는 405로 응답하며, 토큰을 만드는 interstitial 스크립트는 HTML을 기대하는 클라이언트만 처리할 수 있다. 그래서 JavaScript를 실행하지 않는 수집기와 링크 미리보기 봇, 토큰 없이 들어오는 API 호출에는 차단과 같은 결과가 된다(AWS WAF 문서 기준, 다른 WAF는 해당 문서로 확인한다). 쓸 수 있는 동작, 규칙 수와 로그 범위는 서비스와 요금제마다 다르고 바뀌므로 현재 문서로 확인한다. AWS WAF의 `Count` 동작과 검증된 봇 분류는 [[Shield-WAF-NetworkFirewall|Shield, WAF, Network Firewall]]과 [[WAF-Bot-Control|AWS WAF Bot Control]]에 있다.

### 사이트 성격과 오탐

- 정적 사이트 생성기로 만든 사이트는 요청 대부분이 파일 응답이라 캐시와 CDN을 먼저 손보고, 요청 제한과 WAF는 문제가 남을 때 더한다. 검색, 로그인, 댓글, API처럼 동적 경로가 많은 사이트는 캐시가 맞지 않는 경로가 생기므로 관찰 다음에 그 경로의 요청 제한을 일찍 검토한다.
- 오탐 후보는 검색 수집기, 링크 미리보기 봇, 업타임 모니터, RSS 리더와 회사, 학교, 모바일망처럼 여러 사용자가 쓰는 공유 IP다. User-Agent에 `bot`이 든 요청을 일괄 차단하거나 `User-agent: *`에 `Disallow: /`를 쓰면 검색 수집기까지 막혀 검색 노출이 줄 수 있다. 국가 단위 차단은 정상 독자가 있는 지역도 함께 막는다.
- 규칙은 한 번에 하나씩 바꾸고 바꾸기 전 설정을 남겨 바로 되돌릴 수 있게 한다. nginx는 `nginx -t`로 문법과 참조 파일을 검사한 뒤 `nginx -s reload`로 적용하고, 규칙마다 추가한 시각을 기록한다.

2026-11-01 위 다섯 운영사의 수집기 문서, Google의 수집기 확인 문서(2026-03-20 갱신판), RFC 9309, RFC 9111, Google의 robots.txt 해석 문서(2026-10-23 갱신판), nginx.org 모듈 문서와 AWS WAF의 규칙 동작, CAPTCHA와 Challenge 동작 문서를 대조했다. 각 봇이 실제로 안내대로 동작하는지, 공개 IP 목록이 모든 요청을 포괄하는지와 설정의 효과는 검증하지 않았다. 계층 순서, 의심 신호와 오탐 사례는 운영 제안이다.

## CAPTCHA 결과와 서버의 처리 결정을 분리한다

reCAPTCHA v2의 체크박스 방식은 클릭 뒤 바로 통과시키거나 추가 문제를 제시할 수 있다. v3는 사용자에게 문제를 풀게 하지 않고 상호작용의 위험을 점수로 반환한다. 따라서 체크박스를 눌렀다는 화면 상태와 실제 서버 검증 성공을 같은 것으로 취급하지 않는다.

v3의 점수는 1.0에 가까울수록 정상 상호작용일 가능성이 높고, 0.0에 가까울수록 봇일 가능성이 높다는 신호다. 서버는 점수와 요청의 맥락에 따라 추가 인증, 검토나 제한 여부를 정한다. `action`별 실제 트래픽을 관찰해 임계값을 조정하며, 하나의 임계값을 모든 경로에 고정하거나 점수를 사람이라는 확정 증명으로 해석하지 않는다. 마우스 궤적이나 쿠키 하나가 통과 여부를 결정한다는 단정도 공개된 API 계약만으로 뒷받침할 수 없다.

### 토큰의 유효성과 요청 맥락을 함께 검사한다

Google의 `siteverify` 방식에서는 클라이언트가 받은 토큰을 백엔드가 검증한다. 응답 토큰은 2분 동안 유효하고 한 번만 검증할 수 있다. v3로 특정 행동을 보호한다면 페이지가 열릴 때 미리 발급받기보다 실제 행동 시점에 `execute`를 호출한다.

적용 점검: 서버 검증의 성공 여부, v3의 점수와 예상한 `action`을 확인하고, 반환된 `hostname`도 서비스가 허용한 호스트와 대조한다. 토큰 만료와 중복 사용은 새 토큰이 필요한 상태로 처리하며, CAPTCHA 통과 뒤에도 인증/인가와 요청 제한은 별도로 적용한다. 정상 사용자 오류와 차단 효과를 함께 관측한다.

2026-10-27 Google의 웹 reCAPTCHA v2/v3와 `siteverify` 공식 문서를 대조했다. 특정 사이트의 판정 신호별 가중치나 공격 성공률, 실제 통합 동작을 검증한 것은 아니다. 아래 서비스 운영자의 경험 사례는 별도의 관측 근거로 유지한다.

## 공개 서비스의 관측 사례

2026-10-14 제공 발췌를 서비스 운영자의 공개 글과 2026-10-16에 대조했다. sprinklz.io는 Hacker News 소개 뒤 로그인 사용자는 적은데 부하가 지속돼 경로별 로그와 NGINX 집계를 확인했다. 주요 요청이 뉴스 API나 화면 JavaScript를 사용하지 않았고, 거의 절반이 한 반복 수집 서비스에서 나왔다는 운영자의 관측이다.

해당 서비스 차단, `robots.txt`, rate limit과 인프라 개선을 적용했다고 설명한다. 이는 특정 사이트의 경험이며 전체 웹에서 AI 봇이 차지하는 비율이나 차단 효과의 일반 통계가 아니다. 로그 원본과 개선 전후 수치는 별도로 확보하지 않았다.

## 운영 점검

차단 전후의 원본 서버 부하, 오류율과 정상 사용자 지연을 함께 본다. 차단 규칙의 적중 수만 높아졌다고 성공을 판단하지 않는다. 악성 요청을 그대로 재생하는 검사는 승인된 격리 환경에서 수행한다.

## 출처

- [Google for Developers, Choosing the type of reCAPTCHA](https://developers.google.com/recaptcha/docs/versions)
- [Google for Developers, reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3)
- [Google for Developers, Verifying the user's response](https://developers.google.com/recaptcha/docs/verify)
- [I posted to HN, and then my website was flooded with AI BOT traffic — Sammy Straus](https://www.sammystraus.com/)
- [RFC 9309, Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html)
- [RFC 9111, HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
- [OpenAI, Overview of OpenAI Crawlers](https://developers.openai.com/api/docs/bots)
- [Anthropic, Does Anthropic crawl data from the web, and how can site owners block the crawler?](https://support.claude.com/en/articles/8896518)
- [Google Crawling Infrastructure, List of Google's common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Google Crawling Infrastructure, How Google interprets the robots.txt specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- [Google Crawling Infrastructure, Verify requests from Google crawlers and fetchers](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests)
- [Common Crawl](https://commoncrawl.org/)
- [Common Crawl, CCBot](https://commoncrawl.org/ccbot)
- [Common Crawl, FAQ](https://commoncrawl.org/faq)
- [Perplexity, Perplexity Crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- [nginx, ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [nginx, ngx_http_upstream_module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [nginx, ngx_http_log_module](https://nginx.org/en/docs/http/ngx_http_log_module.html)
- [nginx, Command-line parameters](https://nginx.org/en/docs/switches.html)
- [AWS WAF, Using rule actions in AWS WAF](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-action.html)
- [AWS WAF, CAPTCHA and Challenge action behavior](https://docs.aws.amazon.com/waf/latest/developerguide/waf-captcha-and-challenge-actions.html)
- [왜 robots.txt만 믿으면 작은 사이트가 더 위험한가 — 길리랩](https://www.youtube.com/watch?v=Hlwwrplcejw)

## 관련 문서

- [[Rate-Limiting|요청 제한 설계]]
- [[Security-Incident-Response|사고 대응과 증거]]
- [[Web-Content-Manipulation-for-AI|AI가 읽는 웹 콘텐츠의 조작 (수집기별 본문 차이와 확인 방법)]]
- [[HTTP-Caching|HTTP 캐싱과 조건부 요청]]
- [[External-Collection-Pipeline-Reliability|외부 수집 파이프라인 (수집기 쪽 robots.txt 처리)]]
- [[SEO-Google-Naver-Operations|Google과 네이버 SEO 운영]]
- [[WAF-Bot-Control|AWS WAF Bot Control]]
