---
tags: [web, realtime]
status: index
category: "Web - 실시간"
aliases: ["Realtime"]
---

# 실시간(Realtime)

Polling, SSE, WebSocket, STOMP, 실시간 통신 아키텍처. 게임 클라이언트의 루프와 UI 렌더링 비용도 함께 둔다.

## 목차
- [x] [[Game-State-Authority-and-Prediction|게임 상태 판정과 예측]] — 서버 권위, 예측 보정, 지연 보상의 되감기와 피커 어드밴티지, 명령 공유와 결정적 시뮬레이션
- [x] [[Game-Loop-Frame-Timing|게임 루프의 프레임 시간]] — 프레임 의존 이동, 델타 타임, 고정 시간 간격과 보간, 소수 픽셀의 나머지 누적
- [x] [[Unity-UI-Canvas-Batching|Unity UI 캔버스 배칭과 분할]] — 요소 하나의 변경이 캔버스 전체를 다시 묶는 이유, 갱신 주기별 분할과 드로우콜 증가의 균형, Raycaster와 레이아웃 그룹 비용
- [x] [[Realtime-Communication-Comparison|실시간 통신 기술 비교 (Polling/Long Polling/SSE/WebSocket/WebRTC/WebTransport)]]
- [x] [[Server-Sent-Events|Server-Sent Events (SSE, 유한 스트림, BFF 점진 조립)]]
- [x] [[WebSocket|WebSocket (핸드셰이크와 프레임, 아웃바운드 연결, WebCodecs 화면 스트리밍과 원격 조작 경계)]]
- [x] [[Response-Correlation|채널 기반 응답 매칭 (상관키, SSE 이벤트 ID 구분, 직렬화와 대기 종료)]]
- [x] [[Realtime-Sync-Recovery|실시간 동기화와 재연결 복구 (전달 보장 이벤트와 최신 값, 스냅샷과 커서, 식별자 분리, 하트비트와 처리 확인, EventSource 재연결 조건, 연결 상태와 동기화 상태, 탭 수명주기)]]
- [x] [[Realtime-Chat-Architecture|실시간 채팅 아키텍처 (WebSocket + Redis Pub/Sub + 리액티브, 세션 누수, 메시지 배칭)]]
- [x] [[Realtime-Chat-Architecture-Delivery-and-Storage|채팅 메시지 전달 경로와 이력 저장소 (방 채널 브로드캐스트와 수신자 기준 라우팅, 연결 레지스트리, 오프라인 알림 모듈, 단체방 멤버 조회, 이력 저장 키 설계)]]
- [x] [[STOMP-Protocol|STOMP 서브 프로토콜 (WebSocket 위 pub/sub, Destination, Broker, Spring @MessageMapping)]]
- [x] [[Chat-Web-SDK-Boundaries|채팅 Web SDK 책임 경계 (번들, 토큰 갱신, UI 조립, 오류 전달)]]
