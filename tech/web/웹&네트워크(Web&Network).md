---
tags: [web, network]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["웹&네트워크(Web&Network)", "Web & Network"]
---

# 웹&네트워크(Web&Network)

## 목차

- [[Internet-vs-Web|인터넷과 웹]] — 인터넷 인프라와 웹 응용 시스템의 차이, Tier 분류와 상호접속 주체, 웹의 탄생 배경, 1989년 요구사항이 만든 설계(저장과 표시 분리, URL, 단방향 링크와 끊긴 링크), 이름의 유래, 첫 구현의 세 요소, 초기 문서 뷰어 모델과 개방 표준
- [[Web-Technology-Evolution|웹 기술의 진화와 퇴장 패턴]] — 플러그인, 브라우저 종속과 표준화가 기술 수명에 미치는 영향
- [[Web-Service-Structure|웹 서비스의 구조]] — HTML, CSS, JavaScript 역할 분리, 정적과 동적 서버, 상태 저장 위치(DB, 세션, 쿠키), 브라우저 세 엔진, CSR과 SSR 판별(첫 문서 응답과 실행 후 DOM), 정적 문서에서 SPA까지의 진화 단계
- [[tech/web/frontend/프론트엔드(Frontend)|프론트엔드]] — React Learn/Reference, Next.js, React Native Guides/Components/APIs/Architecture, UI/state, DOM, 라우터, 캐시와 배포
- [[tech/web/http/HTTP|HTTP & API]] — HTTP 진화, 메서드 의미, Status, Content-Type, REST, GraphQL, gRPC와 Protobuf 인코딩, Rate Limit, Cookie, 분할 전송
- [[tech/web/network/네트워크(Network)|네트워크 (Network)]] — TLS, OSI 계층과 캡슐화(소켓 식별과 역다중화, 스트림과 메시지 경계, MTU/MSS, DPI), IP 헤더, LAN과 WAN, 토폴로지 유형, L2 스위치 계층과 업링크, 라우팅과 NAT, 응용 프로토콜(DHCP, DNS, SSH, 메일), 패킷 캡처와 Wireshark, TCP(헤더, 핸드셰이크, 흐름/오류 제어), Loopback, Browser URL Flow
- [[tech/web/realtime/실시간(Realtime)|실시간 (Realtime)]] — SSE, WebSocket, STOMP, 채널 응답 매칭과 대기 종료, 채팅 아키텍처(메시지 전달 경로, 오프라인 알림, 이력 저장소), Web SDK 책임 경계
- [[Mobile-App-Architectures|모바일 앱 개발 방식 4유형]] — 네이티브, 모바일 웹, 웹 앱(SPA), 하이브리드(웹뷰), 다중 버전 공존과 API 호환, 코드 공유 전제의 재평가
- [[Expo|Expo]] — Home/Guides/EAS/Reference/Learn 전체, SDK API, Expo UI, native 확장과 배포

## 추가 주제
- [x] [[Bootstrap-6-Migration|Bootstrap 6 전환]] — alpha 기준 클래스와 Sass, JavaScript 로딩과 브라우저 조건
- [x] [[Responsive-Web-Layout|반응형 웹 레이아웃]] — 좁은 화면의 정보 보존, 하단 바와 모달 메뉴의 접근성
- [x] [[Swiper-Carousel|Swiper 이미지 슬라이드]] — CSS와 JavaScript 구성, 상호작용 뒤 재생과 접근성 제어
- [x] [[Agent-Friendly-Websites|에이전트 친화적 웹사이트]] — 의미 있는 HTML, 접근성 정보와 시각적 표현의 일치
- [x] [[Design-System-Lint#토큰 생성, 정적 검사와 화면 검증을 나눈다|디자인 토큰과 화면 검증]] — 기준값 생성, 실측 생략 표시, 일반 텍스트와 큰 텍스트의 대비 기준
- [x] [[HTTP-2#바이너리 프레이밍과 요청 스머글링|HTTP/2의 요청 스머글링 경계]] — 가변 길이 프레임, 필드 검증과 HTTP/1.1 변환
- [x] [[Frontend-Rendering-Models|프런트엔드 렌더링과 상호작용 모델]] — hydration, islands, resumability와 서버 HTML 조각 교체의 실행 비용
- [x] [[Application-Layer-Protocols#SMTP 수락과 최종 배달은 다르다|SMTP 성공의 경계]] — 수신자 수락, 본문 수락과 배달 실패 반송
- [x] [[HTTP-3#스트림별 멀티플렉싱 (HOL 블로킹 제거)|QUIC의 손실 격리 범위]] — 여러 스트림을 담은 패킷, 공유 제어와 QPACK 대기
- [x] [[Foldable-Web-Layout|폴더블 웹 레이아웃]] — Device Posture, 구획 수와 CSS 환경 변수, 미지원 환경의 기본 화면
- [x] [[HTTP-Status-Code#HTTP 성공과 업무 완료를 구분한다|HTTP 성공과 업무 완료]] — 200 응답과 결제 상태, 421의 의미, 결과 미확인과 재시도 경계
- [x] [[tech/web/http/versions/versions|HTTP/1.1, HTTP/2, HTTP/3 (진화, 멀티플렉싱, HPACK, QUIC, HOL 차이)]]
- [x] [[Content-Negotiation|Content Negotiation]] — 기존 보강: [[HTTP-Content-Type#요청 vs 응답|Accept와 Content-Type의 기본 관계]]
- [x] [[tech/web/http/Idempotency|Idempotent / Safe Method]]
- [x] [[API-Versioning|API Versioning]] — 기존 보강: [[API-Conventions-Operations#Versioning|URL, Header, Query 버저닝]], [[Mobile-App-Architectures#백엔드 관점: 클라이언트 유형이 서버에 미치는 영향|다중 클라이언트 버전 공존]]
- [x] [[API-Conventions-Response#페이지네이션|Pagination]] / [[API-Conventions-Response#필터링, 정렬, 검색|Filtering, Sorting, Search]]
