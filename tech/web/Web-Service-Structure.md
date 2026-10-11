---
tags: [web, architecture, html, css, javascript, state, cookie, browser, ssr, csr, jamstack, serverless]
status: done
verified_at: 2026-10-11
category: "웹&네트워크(Web&Network)"
aliases: ["Web Service Structure", "웹 서비스의 구조", "웹 서비스 3대 요소", "정적 웹과 동적 웹", "CSR SSR 판별", "렌더링 방식 판별", "웹사이트 서버 구성 선택"]
---

# 웹 서비스의 구조: 클라이언트 3요소, 서버 처리와 상태 저장

웹 서비스는 클라이언트의 요청과 서버의 응답으로 정보를 주고받는 구조이고, 정적 문서를 내려받아 보여주던 단방향 흐름에서 사용자의 입력에 따라 결과가 달라지는 양방향 상호작용으로 진화했다. 이 진화는 두 질문을 푸는 과정이었다. 무상태 요청 위에서 상태를 어디에 기억할 것인가, 그리고 화면을 어떻게 동적으로 제어할 것인가.

탄생 배경과 첫 구현의 문서 뷰어 모델은 [[Internet-vs-Web]]에서 다룬다. 이 문서는 그 모델 위에 무엇이 어떤 순서로 덧붙었는지를 구성 요소별로 정리한다.

## 정의: 웹 서비스를 이루는 요소

| 위치 | 요소 | 역할 |
|---|---|---|
| 클라이언트 | HTML | 정보의 구조와 뼈대. 문서의 자료구조 |
| 클라이언트 | CSS | 구조를 화면에 어떻게 그릴지 정하는 표현 규칙 |
| 클라이언트 | JavaScript | 사용자 행동에 반응하고 화면과 데이터를 바꾸는 제어 로직 |
| 클라이언트 | 브라우저 | 위 셋을 해석하고 실행하는 런타임 |
| 서버 | 웹 서버 | 요청을 받아 정적 파일을 돌려주거나 처리 주체로 넘김 |
| 서버 | 애플리케이션 서버 | 요청 데이터로 연산하고 응답을 동적으로 생성 |
| 서버 | 데이터베이스 | 사용자 정보와 서비스 상태의 영구 저장소 |

HTML, CSS, JavaScript는 각각 자료구조, 표현, 제어를 맡는다는 점에서 소프트웨어 일반의 데이터, 인터페이스, 제어 로직 구분과 같은 모양이다. 셋을 분리하면 디자인 변경이 구조를 건드리지 않고, 동작 변경이 문서를 다시 쓰게 하지 않는다.

## 동작 원리: 요청과 응답 한 사이클

1. 브라우저가 URL의 문서를 GET으로 요청한다. GET은 데이터를 가져오기만 하고 바꾸지 않는 요청에 쓴다.
2. 정적 사이트면 서버가 파일 시스템의 문서를 그대로 돌려준다. 동적 사이트면 애플리케이션 서버가 요청 URL과 데이터를 보고 데이터베이스에서 값을 꺼내 HTML 템플릿에 끼워 넣어 응답을 만든다.
3. 브라우저가 HTML을 파싱하다가 CSS, 스크립트, 이미지 참조를 만나면 각각 별도 HTTP 요청으로 내려받는다.
4. 사용자가 로그인이나 글 작성처럼 서버에 저장할 정보를 보내면 폼 제출은 POST로 나간다. 서버는 데이터를 저장하거나 검증하고 결과 화면 또는 데이터를 돌려준다.
5. 이후 요청에서 서버가 같은 사용자임을 알아보도록 클라이언트는 쿠키의 식별자를 함께 보내고, 서버는 그 식별자로 저장된 상태를 복원한다.

정적 사이트와 동적 사이트의 차이는 서버가 같은 URL에 늘 같은 파일을 주는가, 요청과 데이터에 따라 내용을 생성하는가에 있다. 요청 구성과 서버 측 처리 체인은 [[Browser-URL-Flow]], 메서드 의미는 [[HTTP-Semantics-and-Messages]]를 본다.

## 진화 단계

| 단계 | 서버 | 클라이언트 | 풀린 문제 | 남은 문제 |
|---|---|---|---|---|
| 정적 문서 | 파일을 그대로 전달 | HTML을 그려 보여줌 | 어디서나 같은 문서 열람 | 사용자마다 다른 결과를 줄 수 없음 |
| 서버 동적 생성 | 템플릿에 데이터를 조합 | 폼으로 입력을 보냄 | 사용자별, 데이터별 화면 | 화면을 바꾸려면 매번 전체 문서를 다시 받음 |
| 클라이언트 스크립트 | 문서와 데이터를 제공 | JavaScript가 화면 일부를 갱신 | 전체 새로고침 없는 반응 | 상태와 로직이 양쪽에 흩어짐 |
| API와 SPA | JSON API 제공 | 클라이언트가 화면 구성과 라우팅 담당 | 여러 클라이언트가 같은 API 공유 | 초기 로드, SEO, 상태 동기화 비용 |

각 단계는 앞 단계를 없애지 않고 위에 얹힌다. 서버 렌더링과 클라이언트 렌더링을 섞는 현대의 선택 기준은 [[Mobile-App-Architectures]], 서버 템플릿 렌더링의 구현은 [[Java-Web-JSP-and-SSR]]에서 이어진다.

## 상태를 어디에 기억하는가

HTTP는 각 요청을 다른 요청과 독립적으로 해석하는 무상태 프로토콜이다. 로그인 유지와 장바구니처럼 요청 사이를 잇는 맥락은 프로토콜이 아니라 애플리케이션이 만든다.

| 저장 위치 | 수단 | 담는 것 | 주의 |
|---|---|---|---|
| 서버 | 데이터베이스 | 사용자 정보, 주문 같은 영구 상태 | 단일 출처로 관리하고 요청마다 조회 비용이 든다 |
| 서버 | 세션 저장소 | 로그인 상태처럼 일정 시간 유지되는 상태 | 서버가 여럿이면 공유 저장소가 필요하다 |
| 클라이언트 | 쿠키 | 세션 식별자, 선택값 | 요청마다 자동 전송되고 탈취 대상이다 |
| 클라이언트 | Web Storage와 메모리 | 화면 상태, 임시 입력 | 서버가 모르는 상태라 진실 원천이 아니다 |

상태의 소유자를 정하는 게 중요하다. 쿠키는 서버가 알아볼 식별자를 나르고, 실제 권한과 데이터는 서버가 가진다. 속성과 보안은 [[Cookie]], 세션 설계는 [[Session]]에서 다룬다.

## 브라우저의 세 엔진

| 엔진 | 입력 | 출력 |
|---|---|---|
| 파서 | HTML, CSS 텍스트 | DOM 트리, CSSOM 트리 |
| 렌더링 엔진 | DOM과 CSSOM | 렌더 트리, 레이아웃, 페인트 |
| 스크립트 엔진 | JavaScript | DOM 변경, 네트워크 요청, 이벤트 처리 |

파서는 토큰화와 트리 구성으로 텍스트를 DOM으로 만들고, 렌더링 엔진은 DOM과 CSSOM을 합쳐 `display: none`처럼 박스를 만들지 않는 노드를 뺀 렌더 트리를 만든 뒤 위치를 계산하고 그린다. `visibility: hidden` 노드는 보이지 않아도 공간을 차지하므로 렌더 트리에 남는다. 스크립트 엔진은 JavaScript를 파싱, 컴파일, 실행하며, 스크립트가 DOM을 바꾸면 렌더링이 다시 일어난다. 실제 브라우저에서는 파서가 렌더링 엔진 안에 구현되는 경우가 많고 스크립트 엔진은 별도 구성 요소다. 세 작업이 한 메인 스레드를 나눠 쓰므로 긴 스크립트는 화면 갱신을 막는다 ([[Browser-Main-Thread]]). 엔진 내부 구조는 [[V8]], DOM 조작 API는 [[Browser-DOM-Manipulation-and-Safety]]에서 다룬다.

## 렌더링 방식 판별: 첫 문서 응답과 실행 후 DOM

개발자 도구의 Elements 패널은 서버가 보낸 HTML이 아니라 현재의 DOM을 보여 준다. HTML은 초기 페이지 내용이고 DOM은 지금 동작 중인 페이지 내용이라, 스크립트가 노드를 추가, 삭제, 수정하면 둘이 달라진다. 그래서 완성된 구조가 Elements에 보인다는 사실만으로는 서버가 HTML을 만들었는지(SSR), 브라우저가 스크립트로 만들었는지(CSR) 구분할 수 없다. 서버가 보낸 원문과 실행 후 DOM을 비교해야 한다.

1. Network 패널을 연 채 새로고침하고, Doc 유형 필터에서 첫 문서 요청을 골라 Response 탭의 원문을 본다. 페이지 소스 보기나 `curl`로 받은 응답도 같은 원문 비교에 쓸 수 있다.
2. 본문 텍스트와 목록이 원문에 이미 있으면 HTML이 브라우저 밖에서 만들어진 것이다. 내용 없는 루트 요소(`<div id="root"></div>` 같은 형태)와 스크립트 태그만 있으면 브라우저가 스크립트를 받아 실행한 뒤 DOM을 만드는 CSR이다.
3. Command Menu의 Disable JavaScript로 스크립트를 끄고 새로고침하면 로딩 중 페이지가 스크립트에 얼마나 의존하는지 드러난다. 이 설정은 DevTools를 열어 둔 그 탭에서만 유지된다. CSR 페이지는 빈 화면(또는 `<noscript>` 안내)만 남고, 서버에서 만든 페이지는 내용은 남지만 스크립트가 붙이는 상호작용은 동작하지 않는다.

해석할 때 주의할 점:

- 원문에 내용이 있다는 것은 HTML을 미리 만들었다는 뜻이지 요청 시점에 만들었다는 뜻은 아니다. 빌드 시점 정적 렌더링도 같은 결과를 보인다.
- 서버가 만든 페이지도 hydration 스크립트가 실행돼 이벤트 핸들러가 붙기 전까지는 다 그려진 것처럼 보여도 입력에 반응하지 않는다.
- 한 페이지 안에서도 공통 골격은 서버가 만들고 개인화 영역은 클라이언트가 채우는 혼합이 흔하므로 영역별로 비교한다. 서버가 User-Agent, 쿠키나 로그인 상태에 따라 다른 HTML을 줄 수 있으니 같은 조건에서 받은 응답끼리 비교한다.

이 판별은 스크립트를 실행하지 않거나 늦게 실행하는 소비자가 무엇을 받는지 확인하는 절차이기도 하다. Google 검색 문서(2026-03-04 갱신 기준)는 모든 봇이 JavaScript를 실행하지는 않으므로 서버 렌더링이나 사전 렌더링을 권하고, Google도 렌더링 대기열에서 몇 초 또는 그보다 오래 기다린 뒤 스크립트를 실행한다고 설명한다. 첫 문서에 본문과 메타데이터가 없으면 스크립트를 실행하지 않는 소비자에게는 빈 페이지다.

## 사이트를 만들 때 서버 구성 고르기

사이트의 서버 구성은 규모 등급만이 아니라 콘텐츠가 언제 바뀌는지, 요청마다 무엇을 계산하는지, 도메인과 팀을 어떻게 나누는지로 고른다. 흔히 함께 나열되는 Jamstack, 계층형, 서버리스, 마이크로서비스는 비교 축이 다르다. 계층형과 마이크로서비스는 애플리케이션을 나누는 방식, 서버리스는 실행과 운영 모델, Jamstack은 프런트엔드를 전달하는 방식이라 한 사이트 안에서 함께 쓸 수 있다.

| 구성 | 동작 | 맞는 조건 | 비용과 확인할 점 |
|---|---|---|---|
| Jamstack(사전 생성과 CDN) | 빌드 때 만든 HTML과 자산을 CDN이 응답하고, 동적 기능은 JavaScript와 API로 붙인다 | 소개, 랜딩, 블로그처럼 방문자마다 내용이 같고 URL을 미리 알 수 있는 페이지 | 콘텐츠를 바꿀 때마다 다시 빌드한다. ISR 같은 부분 재생성은 재생성을 실행할 서버나 호스팅 기능이 필요하고 정적 export에서는 쓸 수 없다. URL을 미리 알기 어렵거나 고유 페이지가 아주 많으면 미리 만들기 어렵고, 첫 HTML에 실시간 데이터나 개인화가 들어가야 하면 요청 시점 서버 렌더링이 맞다 |
| 계층형(N-tier) | 프레젠테이션, 선택적인 중간, 데이터 tier가 요청마다 응답을 만든다 | Azure가 드는 경우: 아키텍처 요구사항이 아직 정해지는 중인 애플리케이션, 온프레미스 애플리케이션을 최소 변경으로 Azure에 옮기는 경우, 온프레미스와 클라우드에 걸친 애플리케이션 | tier를 물리적으로 나누면 확장성과 복원력이 좋아지는 대신 네트워크 지연이 는다. 모놀리식 설계라 기능을 따로 배포할 수 없다. VM으로 옮길 때의 Azure 참조 구성은 tier마다 VM을 둘 이상 두고 데이터 tier를 복제한다 |
| 서버리스 함수 | 요청이나 이벤트가 오면 준비된 실행 환경을 재사용하거나, 없으면 새로 만들어 함수를 실행한다 | 폼 제출, 웹훅, 예약 작업처럼 짧고 간헐적인 처리 | 인프라 관리는 맡기지만 함수 코드, 라이브러리, 설정, IAM 권한과 런타임 지원 종료 대응은 사용자 몫이다. 표준 Lambda 함수의 제한 시간은 최대 900초이고 콜드 스타트의 초기화 시간도 지연과 과금에 들어간다 |
| 마이크로서비스 | 비즈니스 역량 단위로 나눈 서비스를 독립적으로 배포하고 확장한다 | 도메인이 복잡하고 변경이 잦으며 여러 팀이 독립 배포해야 하는 조직 | 시스템 전체 복잡도, 서비스 간 데이터 일관성, 배포와 관측 자동화 부담이 생긴다. 한 서비스의 장애가 전체로 번지지 않는 것은 상류 서비스가 장애를 처리하도록 설계했을 때뿐이다 |

- **규모만으로 고르지 않는다.** Azure Architecture Center는 N-tier의 적합 조건에 사이트 크기 기준을 두지 않는다. 같은 센터의 마이크로서비스 문서는 서비스별 독립 확장을 이점으로 들면서도, 팀이 성공할 역량과 경험이 있는지 신중히 평가하라고 한다. Martin Fowler는 근거가 아직 적다는 단서와 함께, 팀에 마이크로서비스 구축 경험이 충분하지 않으면 마이크로서비스로 시작하지 말라고 본다(2015). Lewis와 Fowler는 모놀리스도 로드 밸런서 뒤에 여러 인스턴스를 두어 수평 확장할 수 있지만 애플리케이션 전체를 함께 늘려야 한다고 설명한다([[Monolith-vs-Microservice|모놀리스와 마이크로서비스]], [[Architecture-Styles|아키텍처 스타일 카탈로그]]).
- **쓴 만큼 낸다는 말에도 조건이 있다.** Lambda의 프로비저닝된 동시성은 호출이 없어도 설정한 기간만큼 과금되고, 함께 쓰는 다른 서비스와 데이터 전송은 따로 청구될 수 있다. 같은 리전에서 S3, DynamoDB, SQS 등 요금 페이지가 열거한 서비스와의 데이터 전송은 무료이고, VPC나 VPC 피어링을 쓰면 추가 요금이 붙는다. 2025-08-01부터는 ZIP 패키지와 관리형 런타임을 쓰는 온디맨드 호출도 초기화(INIT) 단계를 과금한다. Firebase의 Cloud Functions는 배포에 Blaze 요금제가 필요하고 Blaze의 예산 알림은 사용량 상한이 아니다([[AWS-Lambda|AWS Lambda]], [[Cloud-Service-Models|클라우드 서비스 모델]]).
- **빠르고 안전하다는 말에도 범위가 있다.** 사전 생성은 서버가 매번 HTML을 만들지 않아 TTFB가 일정하고 강화할 서버가 줄어든다. 상호작용 지표는 클라이언트 JavaScript를 줄였을 때만 좋아지며, 폼, 결제, 검색 같은 동적 기능의 보안 책임은 연결한 API와 외부 서비스 쪽으로 옮겨 가고, 외부 서비스에 맡겨도 키, 권한과 연동 설정은 사용자 몫으로 남는다([[NextJS-Static-Export|Next.js 정적 export]], [[Frontend-Rendering-Models|프런트엔드 렌더링 모델]]).

다음은 위 조건에서 도출한 설계 예시다. 회사 소개와 블로그는 사전 생성해 CDN에 두고, 문의 폼은 서버리스 함수나 폼 서비스로 받으며, 예약이나 회원 기능이 생기면 그 경로에만 서버 계층과 DB를 붙인다. 마이크로서비스는 팀과 도메인이 커져 단일 애플리케이션의 배포가 병목이 된 뒤에 검토한다. 정적 파일 저장소를 공개하는 방식은 [[S3-Security-Patterns|S3 보안 설계 패턴]]을 따른다.

## 트레이드오프

- **역할 분리는 요청 수를 늘린다.** HTML, CSS, JavaScript를 분리하면 유지보수는 쉬워지지만 문서 하나에 여러 파일 요청이 따른다. 이 비용이 번들링, 캐싱과 HTTP 다중화의 동기다 ([[versions|HTTP 버전]]).
- **서버 생성과 클라이언트 생성은 비용의 위치가 다르다.** 서버 렌더링은 첫 화면이 빠르고 서버 부하가 크며, 클라이언트 렌더링은 상호작용이 매끄럽지만 초기 스크립트가 무겁고 스크립트를 받아 실행하기 전까지 빈 화면이 보일 수 있다. 그래서 한 프로젝트 안에서도 첫 화면과 검색, 공유에 노출되는 콘텐츠는 서버에서, 상호작용이 많은 화면은 클라이언트에서 만드는 식으로 페이지 의도에 따라 섞는다. 실제 페이지가 어느 쪽인지는 위의 판별 절차로 확인한다.
- **상태를 클라이언트에 둘수록 서버는 가벼워지고 신뢰는 낮아진다.** 클라이언트가 보낸 상태는 검증 대상이며 권한 판단의 근거가 될 수 없다.
- **양방향 상호작용은 요청과 응답 모델 안에서 만들어진다.** 서버가 먼저 말을 거는 실시간 통신은 별도 수단이 필요하다 ([[Realtime-Communication-Comparison]]).

## 면접 체크포인트

- HTML, CSS, JavaScript가 각각 구조, 표현, 제어를 맡는 이유와 분리의 이점
- 정적 사이트와 동적 사이트의 차이를 서버가 응답을 만드는 방식으로 설명
- GET과 POST를 데이터 조회와 서버 상태 변경으로 구분해 쓰는 이유
- 무상태 HTTP 위에서 로그인 상태가 유지되는 원리와 쿠키, 세션, 데이터베이스의 역할 분담
- 브라우저가 HTML 텍스트를 화면으로 만드는 단계와 스크립트가 끼어드는 지점
- Elements 패널만으로 CSR과 SSR을 구분할 수 없는 이유와 첫 문서 응답, JavaScript 비활성화로 판별하는 방법
- 정적 문서에서 SPA까지 각 단계가 푼 문제와 남긴 문제
- Jamstack, 계층형, 서버리스, 마이크로서비스를 한 줄로 순위 매길 수 없는 이유와 소개 사이트에 동적 기능이 생길 때의 조합

## 출처

- [웹 서비스 3대 요소 — 널널한 개발자 TV](https://www.youtube.com/watch?v=byR3BcrChT8&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=11)
- [MDN, Client-Server overview](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/First_steps/Client-Server_overview)
- [MDN, Populating the page: how browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)
- [W3C, CSS 2.2 Visual effects](https://www.w3.org/TR/CSS22/visufx.html)
- [모던 자바스크립트 딥다이브 스터디 #8-1 (CH 38 브라우저의 렌더링 과정) — FE재남](https://www.youtube.com/watch?v=lO6gsAQWfjM)
- [Chrome for Developers, Get started with viewing and changing the DOM](https://developer.chrome.com/docs/devtools/dom)
- [Chrome for Developers, Network features reference](https://developer.chrome.com/docs/devtools/network/reference)
- [Chrome for Developers, Disable JavaScript](https://developer.chrome.com/docs/devtools/javascript/disable)
- [Rendering on the Web — web.dev](https://web.dev/articles/rendering-on-the-web)
- [Google Search Central, Understand JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [인프런, 윤상석, 서버 사이드 렌더링의 이해 (CSR vs SSR)](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=86916)
- [Azure Architecture Center, N-tier architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier)
- [Azure Architecture Center, Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)
- [Monolith First — martinfowler.com, Martin Fowler](https://martinfowler.com/bliki/MonolithFirst.html)
- [Microservices — martinfowler.com, James Lewis와 Martin Fowler](https://martinfowler.com/articles/microservices.html)
- [AWS, AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [AWS Lambda Developer Guide, Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [AWS Lambda Developer Guide, Understanding the Lambda execution environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [AWS Lambda Developer Guide, Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)
- [AWS Lambda standardizes billing for INIT Phase — AWS Compute Blog](https://aws.amazon.com/blogs/compute/aws-lambda-standardizes-billing-for-init-phase/)
- [AWS Whitepaper, Security Overview of AWS Lambda](https://docs.aws.amazon.com/pdfs/whitepapers/latest/security-overview-aws-lambda/security-overview-aws-lambda.pdf)
- [Firebase, Get started: write, test, and deploy your first functions](https://firebase.google.com/docs/functions/get-started)
- [Firebase, Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Next.js Docs, How to implement Incremental Static Regeneration (ISR)](https://nextjs.org/docs/app/guides/incremental-static-regeneration)
- [What is Jamstack? — Jamstack](https://jamstack.org/what-is-jamstack/)
- [Why Jamstack? — Jamstack](https://jamstack.org/why-jamstack/)

## 관련 문서

- [[Internet-vs-Web|인터넷과 웹 (탄생 배경과 문서 뷰어 모델)]]
- [[Web-Technology-Evolution|웹 기술의 진화와 퇴장 패턴]]
- [[Mobile-App-Architectures|모바일 서비스 아키텍처 (SSR, CSR, SPA)]]
- [[Frontend-Rendering-Models|프런트엔드 렌더링과 상호작용 모델]]
- [[Monolith-vs-Microservice|모놀리스와 마이크로서비스]]
- [[Architecture-Styles|아키텍처 스타일 카탈로그]]
- [[AWS-Lambda|AWS Lambda]]
- [[NextJS-Static-Export|Next.js 정적 export]]
- [[Browser-URL-Flow|브라우저 URL 입력 흐름]]
- [[HTTP-Semantics-and-Messages|HTTP 의미와 무상태]]
- [[Cookie|Cookie]]
- [[Session|Session]]
- [[Browser-Main-Thread|브라우저 메인 스레드]]
- [[Spring-MVC-Essentials|WAS vs Web Server]]
- [[웹&네트워크(Web&Network)|웹&네트워크 인덱스]]
