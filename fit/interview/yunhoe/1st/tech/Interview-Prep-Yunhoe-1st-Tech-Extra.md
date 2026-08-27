---
tags: [fit, interview, yunhoe]
status: done
verified_at: 2026-08-26
category: "Interview - Fit"
company: "윤회주식회사 (CARE IDⓒ)"
aliases: ["Yunhoe 1st Tech Extra", "윤회 1차 기술 질문 보강"]
---

# 윤회 1차 본 미팅, 예상 기술 질문, 보강과 안전망

> 상위 TOC: [[Interview-Prep-Yunhoe-1st-Tech|윤회 1차 예상 기술 질문]]
> 전형 기록: 2026-05-20 예정 14:00 대면 1차 본 미팅, 백엔드 리드. 결과는 1차 통과, 2026-05-28 최종합격.

이 문서는 범용 백엔드 기초와 심화 질문의 안전망이다. 특정 회사의 제품, 조직, 내부 기술과 운영 수치는 사실로 쓰지 않으며, 도메인 적용은 가정과 확인 질문으로만 말한다.

## 답변 구조

1. 결론을 한 문장으로 말한다.
2. 선택 기준과 트레이드오프를 설명한다.
3. 검증 방법과 실패 시 복구 경로를 덧붙인다.

## 1. Node.js, V8, 이벤트 루프

- **이벤트 루프 단계는?** → timers, pending callbacks, poll, check, close callbacks를 개념적으로 설명한다. 단계 순서를 고정된 실행 순서로 외우지 않고, Promise와 `queueMicrotask`는 각 JavaScript 콜백 경계에서 처리된다는 점을 함께 말한다.
  - **꼬리**: `setTimeout`과 `setImmediate`의 상대 순서는 실행 문맥에 따라 달라질 수 있다. `process.nextTick`은 일반적인 CommonJS 흐름에서 Promise microtask보다 먼저 처리되지만, 모듈 실행 문맥은 별도로 확인한다.
- **CPU bound 작업이 들어오면?** → 메인 스레드가 막혀 모든 요청의 지연이 커진다. Worker Thread, 별도 프로세스, 큐 기반 워커 중 격리 수준과 운영 비용을 비교해 선택한다.
- **메모리 누수가 의심되면?** → 힙 스냅샷을 비교하고 리스너, 무한 캐시, 오래 잡힌 closure를 확인한다. 재현 조건과 증가 추세를 먼저 잡은 뒤 원인을 좁힌다.

## 2. NestJS 심화

- **요청 처리 파이프라인은?** → Middleware, Guard, Interceptor 전처리, Pipe, Controller, Interceptor 후처리, Exception Filter 순서로 설명한다. 인증과 인가는 Guard, 입력 검증은 Pipe처럼 책임을 나눈다.
- **DI scope는 언제 나누나?** → 기본 싱글톤이 출발점이다. 요청별 컨텍스트가 꼭 필요할 때만 request scope를 쓰며, 생성 비용과 전파 범위를 함께 점검한다.
- **순환 의존은 어떻게 푸나?** → `forwardRef`는 임시 처방이다. 반복되면 모듈 경계와 의존 방향을 다시 설계한다.
  - **꼬리**: Middleware는 HTTP 프레임워크 레벨 처리에, Interceptor는 컨트롤러 결과 변환과 횡단 관심사에 적합하다.

## 3. TypeScript와 입력 검증

- **`unknown`과 `any`의 차이는?** → `any`는 타입 검사를 우회하고, `unknown`은 사용 전에 narrowing을 요구한다. 요청 본문, 환경변수, 외부 API 응답은 `unknown`에서 시작해 런타임 스키마로 검증한다.
- **유틸리티 타입은 언제 쓰나?** → `Pick`, `Omit`, `Partial`, `Record`, `ReturnType`, `Awaited`를 DTO와 반환 타입의 관계가 명확할 때 사용한다. 읽기 모델과 쓰기 모델을 무조건 같은 타입으로 쓰지 않는다.
- **런타임 검증이 필요한 이유는?** → TypeScript 타입은 빌드 뒤에 남지 않는다. 경계에서 유효성 검사를 해야 잘못된 입력이 내부 불변식으로 들어오는 것을 막을 수 있다.

## 4. HTTP, 인증, 보안

- **멱등성은 어디에서 보장하나?** → 비멱등 요청에는 idempotency key와 처리 결과 저장을 둔다. 키의 범위, 만료, 동일 키의 다른 요청을 어떻게 처리할지까지 정한다.
- **인증과 인가의 차이는?** → 인증은 누구인지 확인하는 일이고, 인가는 해당 행위를 할 권한이 있는지 판단하는 일이다. 둘을 같은 미들웨어 하나에 섞지 않는다.
- **JWT와 세션의 선택 기준은?** → JWT는 무상태 확장에 유리하지만 즉시 무효화가 어렵다. 세션은 서버 상태가 필요하지만 제어와 폐기가 단순하다. 민감 작업은 탈취 대응과 즉시 폐기 경로를 우선 검토한다.
- **RBAC와 ABAC는?** → 역할만으로 충분하면 RBAC가 단순하다. 테넌트, 자원 소유자, 시간 같은 속성이 판단에 필요하면 ABAC 또는 정책 계층을 고려한다.

## 5. RDBMS와 트랜잭션

- **격리 수준과 MVCC는?** → 필요한 일관성 수준을 먼저 정하고, 긴 트랜잭션이 버전 정리와 잠금에 주는 영향을 설명한다. 기본 격리 수준도 엔진과 쿼리 패턴에 따라 검증한다.
- **B+Tree와 Hash 인덱스의 선택은?** → 범위, 정렬, prefix 조회는 B+Tree가 적합하고 정확 일치만 필요한 경우 Hash를 검토한다. 인덱스는 조회 조건, 정렬, 선택도, 쓰기 비용을 함께 본다.
- **정규화와 비정규화는?** → 쓰기 정합성과 변경 용이성은 정규화가 유리하고, 반복 집계나 읽기 성능은 별도 read model을 고려한다. 비정규화에는 갱신 책임과 재계산 경로가 필요하다.

## 6. 분산 처리와 캐시

- **DB 변경과 이벤트 발행이 어긋나면?** → 변경과 outbox 기록을 같은 트랜잭션으로 커밋하고, 별도 publisher가 재시도 가능하게 발행한다. 소비자는 중복을 전제로 멱등하게 만든다.
- **Saga는 언제 쓰나?** → 긴 흐름과 이질 저장소에서는 보상 트랜잭션을 설계한다. 단계가 단순하면 choreography, 흐름 제어와 관측이 중요하면 orchestration을 비교한다.
- **캐시 무효화는 어떻게 하나?** → cache-aside와 TTL을 기본으로 시작하고, 쓰기 후 invalidate, 버전 키, stampede 방지를 데이터 특성에 맞춰 더한다. 캐시 hit율만이 아니라 오래된 데이터의 사용자 영향을 관측한다.

## 7. 테스트, 배포, 관측성

- **테스트 피라미드는?** → 빠른 단위 테스트를 중심으로 두고, DB나 메시지 브로커 경계는 통합 테스트로, 핵심 흐름만 종단 간 테스트로 검증한다.
- **무중단 배포의 판단 기준은?** → Rolling은 단순하고, Blue-Green은 빠른 롤백에, Canary는 점진 검증에 유리하다. 데이터 마이그레이션은 이전 버전과 호환되는 단계로 나눈다.
- **관측성의 세 축은?** → Metrics, Logs, Traces를 각각 집계, 사건 맥락, 요청 흐름으로 구분한다. 알림은 사용자 영향과 행동 가능한 임계값을 기준으로 둔다.
  - **꼬리**: API는 RED, 인프라와 큐는 USE 관점으로 시작하되 실제 장애 양상에 맞춰 지표를 보완한다.

## 8. 시스템 설계 답변 틀

> 요구사항 → 데이터 경계 → 실패 시나리오 → 정합성, 확장성 트레이드오프 → 관측과 되돌리기 순서로 설명한다.

- 동시 요청이 같은 자원을 바꾸면 불변식을 어디에서 강제할지, 재시도는 어떤 키로 멱등하게 만들지 설명한다.
- 물리적 식별자나 QR 검증을 가정한 질문에는 ID의 유일성, 서명 검증, 폐기 상태 반영, 권한 검사, 캐시의 최신성 사이 트레이드오프를 말한다.
- 다중 사용자 발급을 가정한 질문에는 테넌트별 범위, 속도 제한, 공정성, 중복 방지, 복구 단위를 먼저 정한다.
- 분석 조회가 운영 DB를 압박하면 변경 이벤트를 분석 저장소로 분리하고, 원본과 집계의 갱신 지연을 명시한다.

## 답변 룰

- 모르는 도메인 사실은 가정으로 표시하고 확인할 질문으로 끝낸다.
- 대안의 장점만 말하지 않고 비용, 실패 모드, 되돌리기 조건을 함께 말한다.
- 실무 사례는 공개 가능한 메커니즘과 검증 방식만 사용한다.

## 관련 문서

- [[Interview-Prep-Yunhoe-1st|1차 본 미팅 TOC]]
- [[Interview-Prep-Yunhoe-1st-FIT|JD 매칭과 FIT 답변]]
- [[Interview-Prep-Yunhoe-1st-Lead-Questions|백엔드 리드, 컬처핏, 역질문, 체크리스트]]
- [[My-Tech-Cards|마스터 기술 카드]]

## 출처

- [Node.js, The Node.js Event Loop](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Node.js, `queueMicrotask`와 `process.nextTick`](https://nodejs.org/api/process.html#when-to-use-queuemicrotask-vs-processnexttick)
- [NestJS 공식 문서](https://docs.nestjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
