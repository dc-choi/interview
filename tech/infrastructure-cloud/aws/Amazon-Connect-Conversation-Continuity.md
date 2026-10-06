---
tags: [aws, amazon-connect, chat, customer-support, security]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["Amazon Connect Conversation Continuity", "Amazon Connect 대화 연속성", "상담 대화 복원"]
---

# Amazon Connect 대화 연속성과 채팅 복원

옴니채널 상담은 음성, 채팅 등 접점이 바뀌어도 고객의 요청과 처리 맥락을 이어 가는 구조다. Amazon Connect Customer는 AI와 사람 상담원 사이의 인계와 채널 간 맥락 공유를 제공한다. Live Sync는 음성 대화에 맞춰 양식과 선택 항목을 화면에 표시하는 기능이다. 이것과 종료된 채팅의 기록을 새 상담으로 불러오는 **persistent chat**은 구분한다. [옴니채널 기능 개요](https://aws.amazon.com/products/connect/customer/omnichannel/)

## 대화 기록을 복원하는 흐름

Persistent chat은 이전 채팅 전사문을 새 채팅에 불러오는 rehydration으로 구현된다. 고객별 이전 contact ID를 찾아 전달하는 연결은 애플리케이션이 준비해야 한다.

1. 고객과 종료된 상담의 contact ID를 연결해 보관한다.
2. `StartChatContact`의 `PersistentChat.SourceContactId`로 이전 상담을 지정하거나, 시작된 채팅의 flow에서 `Create persistent contact association` 블록을 사용한다. 같은 새 채팅에 두 방식을 중복 적용하지 않는다.
3. 복원 범위를 고른다. `ENTIRE_PAST_SESSION`은 이전 세션의 첫 contact ID를 받아 전체 세션을 복원한다. `FROM_SEGMENT`는 지정한 구간과 그 이전에 연결된 기록을 복원하며, 그 뒤의 설문 같은 구간을 제외하는 데 쓸 수 있다.
4. 과거 메시지는 `GetTranscript`의 `NextToken`과 `ScanDirection: BACKWARD`로 이어 읽는다. 과거 항목에 대한 `StartPosition`과 contact ID 필터는 지원되지 않는다.

복원 대상은 종료된 채팅이어야 한다. 전사문 생성이 비동기라 종료 직후에는 준비되지 않을 수 있으며, 공식 가이드는 30~60초 대기를 권한다. 전사문용 S3 버킷을 여러 개 사용하거나 생성된 파일명을 바꾸면 복원이 막힐 수 있다. [Persistent chat 가이드](https://docs.aws.amazon.com/connect/latest/adminguide/chat-persistence.html)

## API 연결과 인증의 경계

- `StartChatContact` 요청의 `RelatedContactId`와 `PersistentChat`은 함께 지정할 수 없다. 영속 채팅 응답의 `ContinuedFromContactId`로 실제 이어진 상담을 확인한다. [API 명세](https://docs.aws.amazon.com/connect/latest/APIReference/API_StartChatContact.html)
- `ClientToken`은 채팅 시작 요청의 멱등성을 위한 값이다. 카드 정지나 환불 같은 외부 업무의 중복 실행까지 방지해 주는 것은 아니므로, 외부 작업은 별도 멱등 계약으로 설계한다. [API 명세](https://docs.aws.amazon.com/connect/latest/APIReference/API_StartChatContact.html)
- Participant token은 소지자가 세션에 접근할 수 있는 bearer token이다. 발급 전에 인증과 인가를 확인하고, 로그와 URL에 넣지 않으며 HTTPS/TLS로 전달한다. [보안 가이드](https://docs.aws.amazon.com/connect/latest/adminguide/security-best-practices.html)
- 상담 메시지를 화면에 표시할 때 `innerHTML`로 직접 삽입하지 않는다. 출력 인코딩과 CSP 등으로 DOM XSS에 대응한다. [보안 가이드](https://docs.aws.amazon.com/connect/latest/adminguide/security-best-practices.html)

## 구현 검토에 적용하기

다음은 위 제약에서 도출한 설계 점검 항목이다. 제품 도입이나 특정 환경의 동작을 검증한 결과는 아니다.

| 확인할 경계 | 재현할 조건 |
|---|---|
| 고객과 과거 상담의 연결 | 다른 고객의 contact ID를 넣었을 때 서버에서 접근을 거부하는가 |
| 비동기 전사문 준비 | 종료 직후의 복원 지연을 처리하고 재시도 횟수에 한도를 두었는가 |
| 인계와 업무 결과 | AI가 요청한 작업과 외부 시스템에서 완료된 작업을 구분해 전달하는가 |
| 복원 범위 | 설문 제외와 여러 상담원 간 전환이 있었던 세션에서 의도한 기록만 보이는가 |
| 민감정보 노출 | 인계 화면, 채팅 렌더링과 로그에서 토큰과 불필요한 고객 정보가 노출되지 않는가 |

과거 대화를 다시 읽을 수 있다는 사실만으로 현재 고객의 본인 확인이나 외부 업무 처리까지 완료됐다고 판단하지 않는다. 실제 배포 전에는 필요한 채널과 리전의 지원 범위, 권한과 보존 정책을 별도로 확인한다.

## 출처

- [Omnichannel Customer Experience — AWS](https://aws.amazon.com/products/connect/customer/omnichannel/)
- [AWS, Enable customers to resume chat conversations in Connect Customer](https://docs.aws.amazon.com/connect/latest/adminguide/chat-persistence.html)
- [AWS, StartChatContact](https://docs.aws.amazon.com/connect/latest/APIReference/API_StartChatContact.html)
- [AWS, Security Best Practices for Connect Customer](https://docs.aws.amazon.com/connect/latest/adminguide/security-best-practices.html)

## 관련 문서

- [[AWS서비스(AWSServices)|AWS 서비스]]
- [[S3|S3 스토리지와 접근 제어]]
- [[IAM|IAM 권한 평가]]
