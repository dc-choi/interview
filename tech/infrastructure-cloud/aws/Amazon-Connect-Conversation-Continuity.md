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

## 고객 정보 조회의 대기와 결과 인계를 나눈다

2026-10-14 공식 Lambda 연동과 flow 블록 문서 부분 대조 기준이다. 상담 흐름은 Lambda로 기존 업무 시스템을 조회할 수 있지만, 호출 성공과 고객에게 전달할 결과의 준비를 별도로 확인한다.

| 실행 방식 | 다음 블록으로 이동하는 시점 | 블록 timeout 설정의 최대값 |
|---|---|---|
| 동기 | Lambda 호출이 끝난 뒤 | 8초 |
| 비동기 | Lambda 완료를 기다리지 않고 이동 | 60초 |

비동기 실행 뒤에는 `Wait` 블록으로 기다리고 `Load Lambda Result`로 결과를 읽을 수 있다. 결과 로드에 사용할 호출 ID는 `$.LambdaInvocation.InvocationId`에 있으며 가장 최근의 비동기 호출을 가리킨다. 여러 조회를 연결할 때는 고객과 호출 결과가 올바르게 대응하는지 확인한다(설계 점검).

`STRING_MAP` 응답은 문자열 값의 평평한 객체이고, `JSON` 검증은 중첩 JSON을 허용한다. 함수 응답과 블록의 검증 모드를 맞춘다. 조회 실패나 시간 초과 때 이전 고객 정보로 성공 흐름을 이어 가지 않는지, 후속 상담원에게 미확인 상태가 전달되는지 시험한다(운영 제안). 실제 상담 환경의 통합 시험은 수행하지 않았으며 기존 절 전체의 검증일은 유지한다.

## Lex 응답과 상담 흐름의 종료를 구분한다

2026-10-13 Lex V2 Lambda 응답과 Connect `Get customer input` 공식 문서 대조 기준이다. Lambda가 생성한 답변 텍스트와 다음 대화 동작은 별도 필드다. 응답에는 `sessionState.dialogAction.type`이 필요하며, 선택한 동작에 따라 추가 필드를 채운다.

| 동작 | 의미와 필수 정보 |
|---|---|
| `Delegate` | 다음 단계를 Lex가 결정한다 |
| `ElicitSlot` | 슬롯 값을 다시 받는다. `slotToElicit`과 intent 이름이 필요하다 |
| `ConfirmIntent` | 슬롯 값과 의도 실행 여부를 확인한다. intent 이름, 확인할 slots와 확인 질문 메시지가 필요하다 |
| `Close` | 해당 intent의 fulfillment 과정을 끝낸다. intent 이름과 state가 필요하며 `Failed`, `Fulfilled`, `InProgress`를 사용할 수 있다 |

`Close`를 반환했다는 사실만으로 외부 업무 성공이나 상담원 연결 완료를 판정하지 않는다. Connect는 `Get customer input`에서 Lex intent에 따른 분기를 구성한다. `Timeout`은 입력 대기 시간 초과, `Default`는 분기 조건과 불일치, `Error`는 블록 오류나 Lex intent 미완료를 처리한다. 채팅에서는 이 블록에 Lex를 사용하지 않으면 Error 분기로 간다.

구현 점검 제안: 답변 후 슬롯 재입력, 의도 확인 거절, 시간 초과, intent 실패와 정상 종료를 각각 재현한다. 상담원 연결을 선택한 흐름은 Lex 응답뿐 아니라 후속 큐 전송과 실제 연결 결과까지 확인한다. 대화 제어 상태를 업무 시스템의 완료 기록으로 대신하지 않는다.

## 상담 종료 후 요약과 업무 완료를 구분한다

Post-contact summary는 상담의 주요 문제와 결과를 정리해 ACW(After Contact Work)를 돕는다. 이전 전사문을 복원하는 persistent chat과 별도 기능이며, 요약 생성만으로 환불이나 교환 같은 외부 업무가 완료되지는 않는다.

음성 상담의 CCP 요약은 상담원과 고객 녹음, 음성 분석, 실시간 및 통화 후 분석과 post-contact summary 설정이 필요하다. 조회자의 security profile에도 요약과 관련 데이터 접근 권한이 있어야 한다. 채팅과 이메일은 채널별 설정을 확인한다.

모든 상담에 요약이 생성되는 것은 아니다. 생성 대기 상태와 생성되지 않은 이유를 구분한다.

| 원인 코드 예 | 확인할 내용 |
|---|---|
| `QUOTA_EXCEEDED` | 동시 요약 작업 한도 |
| `INSUFFICIENT_CONVERSATION_CONTENT` | 요약할 대화의 양과 지원 메시지 유형 |
| `INVALID_ANALYSIS_CONFIGURATION` | 분석 설정과 지원 언어 |
| `FAILED_SAFETY_GUIDELINES` | 보안과 품질 보호 기준 충족 여부 |
| `INTERNAL_ERROR` | 서비스 내부 오류 |

운영 설계에서는 요약 부재를 상담 정상 종료나 업무 해결의 증거로 쓰지 않는다. 상담원이 권한 범위에서 전사문을 확인하고 후처리를 이어 갈 경로를 둔다. 외부 업무의 완료 상태는 해당 업무 시스템에서 확인한다.

## AI 상담의 종료와 사람 상담원 인계를 연결한다

2026-10-10 공식 문서 기준, agentic self-service의 `Complete`와 `Escalate`는 Return to Control 도구다. 호출하면 AI 대화가 끝나고 contact flow로 제어가 돌아간다. 도구 이름과 입력은 Lex session attributes에 저장되므로, flow가 이를 읽어 종료나 상담원 큐 전송으로 분기해야 한다. `Escalate`라는 도구를 추가한 것만으로 큐 라우팅 구성이 끝나지는 않는다.

사용자 정의 인계 도구의 입력에는 고객 의도, 시도한 작업, 인계 이유와 요약을 담을 수 있다. 상담원이 볼 contact attributes로 필요한 값을 복사해 전달한다. 생성 요약과 실제 외부 업무 결과는 기존 업무 시스템의 기록으로 대조하는 것이 운영 점검 제안이다.

2026-10-10 공식 가이드 기준, Contact details의 AI agent trace details는 음성 채널에서 제공된다. 이 화면에서 도구 호출 정보와 인계 시점 등을 조사할 수 있다. Automated Interaction Logs와 관련 설정, 조회 권한이 필요하며 음성 상담 종료 후 로그가 제공되기까지 최대 30분을 허용하라는 안내가 있다. 이 조회 경로와 대기 안내를 채팅에도 적용한다고 가정하지 않는다. 음성 상담도 종료 직후 로그가 없다는 사실만으로 도구 호출이나 인계가 없었다고 결론 내리지 않는다.

검증 시에는 정상 종료, 도구 실패 후 인계, 고객의 사람 상담 요청을 각각 재현한다. AI가 인계를 요청한 기록과 실제 큐 전송 및 상담원 연결 결과를 구분해 확인한다. 이는 위 기능을 적용하기 위한 검증 제안이며 특정 기업의 처리량이나 비용 절감 성과를 일반화한 기준은 아니다.

## 대화 연속성과 자동 평가의 근거 범위를 구분한다

이전 대화를 복원할 수 있다는 사실만으로 여러 상담에 걸친 문제 해결을 자동 평가할 수 있다고 가정하지 않는다. 2026-10-10 공식 가이드 기준, 생성형 AI 성과 평가는 대화 전사문을 근거로 질문에 답한다. CRM 같은 외부 시스템이나 화면 녹화에 접근하지 못하고, 여러 contact를 가로지르는 대화를 평가하지 못한다. 복원 기능과 평가 기능의 입력 범위는 별도로 확인한다. [성과 평가 가이드](https://docs.aws.amazon.com/connect/latest/adminguide/generative-ai-performance-evaluations.html)

- 상담원이 해결 방법을 설명했는지는 전사문으로 평가할 수 있지만, 외부 시스템에서 실제 처리가 끝났는지는 업무 기록으로 대조한다.
- 여러 언어가 섞이거나 인계 중 여러 사람이 겹쳐 말하면 전사 정확도가 낮아져 평가에도 영향을 준다. 이런 상담은 자동 평가 대상에서 제외하거나 사람이 검토할 조건을 정한다.
- AI 평가의 표본을 사람이 다시 평가하고 시간에 따른 차이를 확인한다. 평가 건수 증가를 정확도 개선으로 해석하지 않는다.

위 적용 기준은 공식 가이드의 입력 제한과 수동 검토 권고에서 도출한 운영 제안이다. 상담 복원, 인계 성공, 실제 업무 해결과 평가 정확도를 각각 측정한다.

## 인계할 맥락과 임시 조회값의 보존 범위를 나눈다

2026-10-10 `Set contact attributes` 공식 문서 기준. Flow attribute는 설정한 flow 안에서만 사용하는 임시 변수다. 다른 flow로 전송되지 않고 contact record, 상담원의 CCP와 `GetContactAttributes`에도 노출되지 않는다. Lambda로 전달하려면 `Invoke AWS Lambda function` 블록에 파라미터로 명시해야 한다. 그러나 flow logging이 켜져 있으면 키와 값이 CloudWatch 로그에 남는다. 임시 변수라는 이유만으로 민감정보가 저장되지 않는다고 판단하지 않는다.

운영 적용 제안: 고객 기록 조회에 잠시 쓰는 값과 다음 상담원이 알아야 할 업무 맥락을 나눈다. 필요한 인계 정보만 별도로 전달하고, 민감한 조회값이 contact attributes나 로그에 복제되는지 확인한다. 임시 변수의 수명, 인계 가능 여부와 로그 보존을 각각 시험하며, 고객 기록의 매칭 결과를 본인 확인이나 해당 기록의 열람 권한으로 간주하지 않는다.

## 상담 통합의 효과는 같은 지표 정의로 비교한다

2026-10-10 Amazon Connect 공식 문서 기준, 평균 처리 시간(AHT)은 대화 시간뿐 아니라 고객 보류 시간과 상담 후처리(ACW)를 포함한다. task에는 상담원 일시정지 시간도 포함된다. `GetMetricData`의 식별자는 `HANDLE_TIME`, `GetMetricDataV2`는 `AVG_HANDLE_TIME`이다. 모든 구성 시간이 null인 contact record는 평균 계산에서 제외한다.

따라서 AHT 감소를 대화 시간 감소나 고객 문제 해결의 증가와 같은 뜻으로 읽지 않는다. 다음은 통합 전후를 비교하기 위한 운영 제안이다.

- 같은 채널, 상담 유형, 기간과 집계 조건을 맞추고 대화, 보류와 ACW를 나눠 확인한다.
- 새 시스템에서 누락되는 기록이 있는지 확인해 분모 변경을 개선으로 오인하지 않는다.
- 전사문과 업무 시스템의 완료 기록으로 실제 해결 여부를 별도 확인한다. 애플리케이션 수를 줄였다는 사실만으로 고객 경험 개선을 입증하지 않는다.

## 상담 화면 접속과 음성 연결을 따로 확인한다

2026-10-14 CCP 네트워크 공식 가이드 부분 대조 기준이다. 브라우저 상담 화면을 열 수 있어도 음성 경로가 준비됐다는 뜻은 아니다. CCP 관련 HTTPS와 WebSocket 경로의 TCP 443뿐 아니라, 해당 리전의 TURN/NLB endpoint로 나가는 UDP 3478과 DNS 해석을 확인한다. IP와 포트를 허용했어도 TURN 도메인을 해석하지 못하면 소프트폰 연결이 실패할 수 있다.

프록시의 WebSocket 처리도 실제 상담 흐름으로 시험한다. Stateless firewall은 응답 UDP를 받을 브라우저의 임시 포트 범위까지 확인해야 하므로, 아웃바운드 포트만 열었다고 완료 처리하지 않는다. 필요한 endpoint와 범위는 사용 리전의 최신 공식 표로 확인한다.

Direct Connect는 사내 edge router와 AWS 사이의 연결 개선에 쓸 수 있지만, 단말부터 edge router까지의 사내 LAN/WAN 문제를 해결하지는 않는다. 운영 점검에서는 화면 로그인, 통화 수신, 양방향 음성과 종료를 나눠 재현한다(설계 제안). 실제 상담 환경의 연결 품질을 검증한 결과는 아니며 기존 절의 검증일은 유지한다.

## CCP 오류는 로그의 실패 단계로 좁힌다

2026-10-23 공식 CCP 로그와 오류 가이드 부분 대조 기준이다. 오류 직후 CCP의 Settings에서 Download logs를 선택해 `agent-log.txt`를 확보한다. 새로고침하면 CCP 로그가 유지되지 않으므로 재로그인이나 새로고침 전에 보존한다. CCP Log Parser의 Snapshots & Logs로 오류와 상담원 상태를 함께 보고, API Call Metrics와 WebRTC Metrics로 API 지연과 통화 미디어 상태를 구분한다.

| 증상 또는 로그 | 우선 확인할 경계 |
|---|---|
| 마이크 접근 실패 | 브라우저의 미디어 접근 권한과 실제 장치. Endpoint Test Utility로 접근을 확인하고 Firefox는 통화 시 CCP 탭의 포커스도 확인 |
| `ice_collection_timeout` | 소프트폰 미디어 endpoint로 가는 UDP 3478, 방화벽과 NAT, DNS 및 단말 조건 |
| `signalling_connection_failure`, `signalling_handshake_failure` | signaling 서버와 통신하는 TCP 443, 프록시와 방화벽 |
| `webrtc_error` | 앞선 ICE 시간 초과와 재시도 실패 여부. 선행 ICE 오류가 없으면 RTC 세션이 실패한 상태를 로그에서 확인 |
| 초기화 실패 | 시작 시 WebSocket 연결과 TCP 443 경로. 사용하지 않는 CCP 창도 닫아 연결 한도 문제를 구분 |
| 발신 설정 오류 | 인스턴스의 발신 활성화, 기본 발신 큐의 caller ID, 상담원 security profile의 발신 권한 |
| 번호 오류 | E.164 형식, 허용된 발신 국가와 동시 통화 한도. `createOutboundContact` 요청 뒤의 오류를 대조 |

오류 문구는 조사 시작점이며 원인을 하나로 확정하는 증거가 아니다. 인스턴스의 수신과 발신은 별도로 활성화하므로 수신 성공만으로 발신 복구를 판정하지 않는다.

복구 판정 제안: 같은 단말과 네트워크 경로에서 원래 실패한 동작을 다시 시험한다. 수신 오류는 수신 연결을, 발신 오류는 같은 상담원, 큐와 목적지 조건의 발신 연결을 확인하고, 각각 양방향 음성과 종료까지 확인한다. 이 절은 문서 대조 결과이며 실제 CCP 재현이나 기존 대화 복원 절 전체의 재검증은 하지 않았다.

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

- [AWS, Update settings for your Connect Customer instance](https://docs.aws.amazon.com/connect/latest/adminguide/update-instance-settings.html)
- [AWS, Download and review Connect Customer Contact Control Panel (CCP) logs](https://docs.aws.amazon.com/connect/latest/adminguide/download-ccp-logs.html)
- [AWS, Contact Control Panel (CCP) Issues](https://docs.aws.amazon.com/connect/latest/adminguide/common-ccp-issues.html)
- [How do I troubleshoot CCP user interface errors in Amazon Connect? — AWS re:Post](https://repost.aws/knowledge-center/connect-troubleshoot-ccp-ui-errors)
- [AWS, Set up your network to use the Connect Customer Contact Control Panel (CCP)](https://docs.aws.amazon.com/connect/latest/adminguide/ccp-networking.html)
- [AWS, Grant Connect Customer access to your AWS Lambda functions](https://docs.aws.amazon.com/connect/latest/adminguide/connect-lambda-functions.html)
- [AWS, Flow block in Connect Customer: AWS Lambda function](https://docs.aws.amazon.com/connect/latest/adminguide/invoke-lambda-function-block.html)
- [AWS, AWS Lambda response format for Lex V2](https://docs.aws.amazon.com/lexv2/latest/dg/lambda-response-format.html)
- [AWS, Flow block in Connect Customer: Get customer input](https://docs.aws.amazon.com/connect/latest/adminguide/get-customer-input.html)
- [AWS, Metric definitions in Connect Customer](https://docs.aws.amazon.com/connect/latest/adminguide/metrics-definitions.html)
- [AWS, Flow block in Connect Customer: Set contact attributes](https://docs.aws.amazon.com/connect/latest/adminguide/set-contact-attributes.html)
- [AWS, Evaluate agent performance in Connect Customer using generative AI](https://docs.aws.amazon.com/connect/latest/adminguide/generative-ai-performance-evaluations.html)
- [AWS, Use agentic self-service](https://docs.aws.amazon.com/connect/latest/adminguide/agentic-self-service.html)
- [AWS, AI agent traces using Contact search and Contact details](https://docs.aws.amazon.com/connect/latest/adminguide/ai-agent-traces.html)
- [Omnichannel Customer Experience — AWS](https://aws.amazon.com/products/connect/customer/omnichannel/)
- [AWS, Enable customers to resume chat conversations in Connect Customer](https://docs.aws.amazon.com/connect/latest/adminguide/chat-persistence.html)
- [AWS, StartChatContact](https://docs.aws.amazon.com/connect/latest/APIReference/API_StartChatContact.html)
- [AWS, Security Best Practices for Connect Customer](https://docs.aws.amazon.com/connect/latest/adminguide/security-best-practices.html)
- [AWS, View generative AI-powered post-contact summaries in Connect Customer](https://docs.aws.amazon.com/connect/latest/adminguide/view-generative-ai-contact-summaries.html)

## 관련 문서

- [[AWS서비스(AWSServices)|AWS 서비스]]
- [[S3|S3 스토리지와 접근 제어]]
- [[IAM|IAM 권한 평가]]
