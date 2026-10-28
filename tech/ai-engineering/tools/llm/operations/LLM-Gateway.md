---
tags: [ai, llm, gateway, litellm, aws, finops, cache]
status: done
verified_at: 2026-10-25
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Gateway", "LLM 게이트웨이", "LiteLLM 프록시"]
---

# LLM 게이트웨이의 호출, 권한과 비용 경계

LLM 게이트웨이는 애플리케이션과 모델 제공자 사이에서 호출 인터페이스, 접근 제어와 사용량 추적을 모으는 프록시다. LiteLLM 기반 AWS 참조 구성은 ECS 또는 EKS에서 프록시를 운영하고, RDS에 virtual key와 설정을, Secrets Manager에 외부 제공자 자격증명을 보관한다.

## 키의 역할을 나눈다

관리용 master key와 애플리케이션에 배포할 virtual key를 구분한다. Virtual key에는 허용 모델과 예산을 지정하고, 사용자나 팀에 연결해 사용량을 추적할 수 있다. 운영 애플리케이션에 관리 키를 공용으로 배포하는 대신 업무별 권한과 귀속 단위를 정한다.

API 형식을 통합해도 모델의 답변 품질과 도구 호출 의미까지 같아지는 것은 아니다. 모델을 바꾸는 경로는 [[LLM-Failure-Handling-Recovery#폴백과 기능 저하|실패 처리]]와 같은 평가 조건으로 확인한다.

## 내 사용을 관측하려고 직접 운영하는 프록시

게이트웨이는 조직의 통제 수단이면서 개인이나 작은 팀이 자기 사용을 관측하는 수단이기도 하다. 제공자 대시보드가 엔지니어링 결정에 쓸 시계열 토큰 데이터를 주지 않으면 직접 운영하는 프록시가 그 기록을 만든다. 여러 제공자와 모델을 내가 통제하는 한 엔드포인트로 받아 빠르게 바꾸고, 어느 키가 어느 클라이언트로 언제 어떤 모델을 불렀고 결과가 어땠는지 남기며, 작업, 에이전트와 하네스마다 다른 virtual key를 발급해 주 키를 퍼뜨리지 않는다. 코딩 세션의 캐시 미스 원인도 이 요청 기록에서 찾는다(한 개발자는 손으로 20초 안에 찾았다고 적는다). 이 이점은 2026-10-18 개인 의견 글의 경험에 근거하며 특정 제품을 권하거나 효과를 측정한 결과는 아니다.

직접 운영하면 다음 비용도 함께 진다(운영 제안).

- 프록시는 모든 프롬프트와 응답, 제공자 키가 지나는 지점이다. 기록의 보존 기간, 열람 권한과 삭제 절차를 먼저 정한다.
- 프록시 소프트웨어 자체가 공급망 위험이다. LiteLLM은 2026년 3월과 10월에 악성 릴리스 사고를 겪었다([[Supply-Chain-Security|공급망 보안]]). 버전 고정과 사고 공지 확인을 운영 절차에 넣는다.
- 캐시 미스를 진단하려면 아래 캐시 절의 적중 상태와 캐시 읽기, 쓰기 토큰이 요청 기록에 남는지부터 확인한다. 제공자의 사용량 내보내기로 충분한 지표는 프록시 없이 얻는 쪽과 비교한다.

## 예산 설정의 저장소 의존성을 확인한다

2026-10-07 LiteLLM 문서 기준, 예산 검사는 DB에서 읽은 누적 사용액에 의존한다. DB 없이 구동하면 `litellm_settings.max_budget`은 요청을 차단하지 않으며, virtual key 기반 사용자와 팀 예산도 사용할 수 없다. 설정 파일에 금액을 적었다는 사실만으로 지출 차단을 보장하지 않는다.

아래는 이 의존성에서 도출한 운영 점검이다.

- 제한된 키로 허용 모델 호출과 비허용 모델 거절을 각각 확인한다.
- 작은 예산을 소진한 뒤 후속 요청이 차단되는지 확인한다.
- DB 장애와 사용량 기록 지연 때의 동작은 별도로 시험한다. DB 없는 배포의 동작으로 장애 시 동작까지 추정하지 않는다.
- 재시도와 폴백을 포함한 총사용량을 제공자의 청구 자료와 대조한다.

## 배포 예제와 운영 보장을 구분한다

AWS 참조 구성에는 CloudFront를 둔 공개 경로, ALB 직접 접근과 private VPC 경로가 있다. 선택한 경로의 인증, 네트워크 노출과 외부 모델로 나가는 데이터 범위를 확인한다. 내부 진입점이라고 외부 모델 전송까지 차단된다고 가정하지 않는다.

단일 서비스에 중앙 관리 요구가 없다면 프록시의 DB, 컨테이너와 운영 비용도 비교한다. 이 문서는 참조 구조와 제품 문서의 대조 결과이며, 특정 배포의 보안이나 가용성을 검증한 결과가 아니다.

## 호환성은 요청 수락과 기능 보존으로 나눠 확인한다

2026-10-08 공식 문서 대조 기준, Anthropic의 OpenAI SDK 호환 계층은 도구 호출의 `strict`를 무시하며, 지원하지 않는 필드 다수를 오류 없이 무시한다. 정상 응답을 받았다는 사실만으로 원래 요청의 제약이 적용됐다고 판정하지 않는다. 이 제약은 해당 호환 계층의 동작이며, 모든 게이트웨이 구현에 그대로 적용되는 것은 아니다.

Gemini의 Generate Content API에서는 모델 응답의 `thoughtSignature`가 후속 호출에 필요한 불투명 상태를 전달한다. 공식 Google Gen AI SDK를 사용하고 전체 모델 응답을 이력에 추가하면 서명을 자동으로 처리한다. 프록시가 응답에서 텍스트나 도구 이름만 추출해 다시 만들면 필요한 상태를 잃을 수 있다. 반환 의무와 위치는 모델별로 다르므로 해당 모델의 계약을 확인한다.

이 차이에서 도출한 게이트웨이 이전 점검은 다음과 같다.

- 일반 텍스트뿐 아니라 스트리밍, 도구 호출 왕복과 모델 고유 필드가 보존되는지 실제 클라이언트로 확인한다.
- 필수 기능을 지원하지 않는 경로는 명시적으로 거절하거나 지원 경로로 보낸다. 조용히 필드를 버리는 동작을 성공으로 처리하지 않는다.
- 폴백 후보는 모델 이름 외에 필요한 기능과 대화 상태의 호환 여부로 제한한다. 다른 제공자의 같은 계열 모델이라는 이유만으로 진행 중 대화를 옮기지 않는다.

위 목록은 제품별 제약에서 도출한 설계 점검이며, 특정 배포의 호환성을 시험한 결과는 아니다.

## 호출 계층과 프롬프트 배포 계약을 분리한다

호출 권한과 사용량을 모으는 것과 프롬프트의 작성, 버전, 평가를 관리하는 것은 별도 책임이다. 같은 플랫폼에 두더라도 운영 호출이 어떤 프롬프트와 모델 설정을 사용했는지 식별할 수 있어야 한다. 이는 프롬프트 관리 기능을 게이트웨이에 연결할 때의 설계 점검이다.

2026-10-10 Bedrock Prompt management 공식 문서 기준, 저장한 draft는 수정할 수 있고 배포용 version은 특정 시점의 스냅샷이다. `Converse`와 `ConverseStream`에서 관리 프롬프트를 호출할 때는 다음 제약을 지킨다.

- `modelId`에 프롬프트 버전 ARN을 전달하고 변수 값은 `promptVariables`로 전달한다.
- `additionalModelRequestFields`, `inferenceConfig`, `system`, `toolConfig`를 같은 요청에 넣을 수 없다.
- 추가한 `messages`는 프롬프트에 정의된 메시지 뒤에 붙는다.

따라서 게이트웨이가 모델 직접 호출용 공통 필드를 무조건 덧붙이면 관리 프롬프트 호출 계약을 어길 수 있다. 호출 유형별로 필드를 구성하고, 프롬프트 버전 변경 전후에 같은 평가 입력으로 결과를 비교하는 방안을 검토한다. 버전 생성 자체가 출력 품질 검증은 아니다. 이 절은 Bedrock API 계약을 확인한 것이며 특정 게이트웨이의 구현이나 배포 동작을 시험한 결과는 아니다.

## 처리량 확장은 호출 한도와 데이터 이동을 함께 검토한다

게이트웨이 인스턴스를 늘리는 것과 모델 제공자의 처리 한도를 늘리는 것은 다르다. 2026-10-10 Bedrock 공식 문서 기준, 계정에 적용되는 quota는 공개 기본값보다 낮을 수 있으므로 Service Quotas에서 실제 값을 확인한다. API 진입점의 여유 용량만으로 모델 추론의 여유를 판단하지 않는다.

Cross-Region inference profile은 요청을 해당 프로파일의 목적지 리전으로 라우팅한다. 출발 리전에 따라 목적지가 달라질 수 있으므로 사용할 각 출발 리전에서 `GetInferenceProfile`의 `models`에 담긴 모델 ARN을 확인한다. 프로파일 이름의 지역 접두사만으로 데이터 처리 위치를 확정하지 않는다.

프로파일의 목적지 중 하나라도 SCP에서 차단되면 다른 목적지가 허용돼 있어도 요청이 실패할 수 있다. 조직의 데이터 위치 제약을 먼저 확인하고 그 범위에 맞는 프로파일과 IAM/SCP를 선택한다. 처리량을 늘리기 위해 금지된 리전을 일괄 허용하는 방식으로 해결하지 않는다.

다음은 이 제약에서 도출한 설계 점검이다. 모델, 리전과 호출 경로별 포화 및 스로틀링을 관측하고, 대기열이나 부하 제한을 검토한다. 다른 모델로의 폴백은 앞 절의 기능 호환성뿐 아니라 데이터 전송 허용 범위도 만족해야 한다. 멀티 리전 호출 자체를 모든 장애의 복구 보장으로 취급하지 않는다.

## 공통 플랫폼에서도 업무별 정책을 보존한다

모델 호출 API를 공통화해도 업무마다 허용 데이터, 답변 범위와 비용 귀속은 다를 수 있다. 공통 인증만 검사하고 모든 요청에 같은 정책을 적용하면 개별 업무의 제약을 놓칠 수 있다. 테넌트 격리의 구현 조건은 [[Generative-AI-Multi-Tenancy|생성형 AI의 테넌트 격리]]에서 다룬다.

2026-10-10 대조한 2024년 9월 BT Group 공개 사례는 업무별 테넌트, PII 필터, 예산 추적과 애플리케이션 범위를 벗어난 질문의 필터링을 함께 설명한다. 이는 중앙 플랫폼 안에서도 업무별 경계를 유지하는 사례다. 발표만으로 각 통제의 누락 가능성이나 실제 차단 효과까지 검증한 것은 아니다.

적용 시에는 인증된 호출자를 업무 정책에 연결하고 허용 모델, 데이터 처리 위치와 비용 귀속을 함께 결정하는 방안을 검토한다. 업무별 정상 요청뿐 아니라 다른 업무의 데이터 접근과 범위 밖 요청도 시험한다. 이 점검안은 해당 사례의 상세 구현을 재현했다는 뜻이 아니다.

## 게이트웨이 경로의 캐시는 계층별 적중 조건과 정산을 나눈다

게이트웨이 경로의 캐시는 계층마다 비교 기준과 다시 쓰는 대상이 다르다. 완성된 응답을 다시 쓰는 응답 캐시뿐 아니라 입력별 벡터를 다시 쓰는 임베딩 캐시와 제공자 쪽 입력 계산을 다시 쓰는 프롬프트 캐시도 함께 비교한다. 같은 적중이라도 생략되는 작업과 남는 비용이 달라 하나의 적중률로 효과를 판단하지 않는다. 의미 캐시의 임계값, 문맥, 권한과 무효화는 [[ElastiCache-Use-Cases#8. Semantic Cache (Gen AI)|시맨틱 캐시]]를, 제공자 캐시의 과금과 TTL은 [[LLM-Prompt-Caching|프롬프트 캐싱]]을 따르고, 이 절은 게이트웨이에서 계층을 나눌 때의 키, 범위와 정산을 다룬다.

| 계층 | 비교 기준 | 다시 쓰는 것 | 적중해도 남는 비용과 위험 |
|---|---|---|---|
| 정확 일치 | 응답에 영향을 주는 요청 필드의 해시(포함 범위는 제품과 설정마다 다름) | 완성된 응답 | 키 조회와 저장, 키에서 빠진 필드나 호출자 범위 때문에 다른 요청이나 호출자에게 같은 응답이 나가는 재사용 |
| 근접 중복(설계 선택지) | SimHash 같은 표면 특징 지문의 해밍 거리 | 완성된 응답 | 지문 계산과 후보 검색, 작은 차이로 답이 바뀌는 오적중 |
| 의미 캐시 | 요청 텍스트 임베딩의 유사도 | 완성된 응답 | 조회마다 드는 임베딩과 벡터 검색, 오적중, 필터에서 빠진 모델이나 설정, 호출자 범위 때문에 다른 요청의 응답이 나가는 재사용 |
| 스트림 재생 | 정확 일치나 의미 캐시 키와 스트리밍 여부 | 종료 이벤트까지 받은 스트림 | 키 조회와 저장. 의미 키를 쓰면 임베딩과 벡터 검색, 오적중 |
| 임베딩 캐시 | 입력 텍스트의 해시(모델 구분은 namespace 설정) | 입력별 벡터 | 캐시에 없던 입력의 새 계산, 키 해시 충돌 |
| 제공자 프롬프트 캐시 | 요청 앞부분(prefix)의 일치 | 앞부분의 입력 계산 결과(KV 상태) | 재사용 구간의 캐시 읽기 요금, 캐시 뒤 입력의 일반 요금과 출력 생성. 쓰기 할증과 저장 요금의 유무는 제공자와 모델마다 다름 |

정확 일치의 재사용 범위는 키에 무엇을 넣는지로 정해진다. 2026-10-21 공식 문서 기준, Cloudflare AI Gateway는 텍스트와 이미지 응답에 한해 같은 요청만 캐시하며 제공자, 엔드포인트, 모델, 제공자 인증 헤더와 요청 본문 전체를 이어 SHA-256으로 해시한 값을 기본 키로 쓴다. 사용자 지정 키(`cf-aig-cache-key`)는 같은 응답을 받아도 되는 요청만 묶으라고 안내한다. APISIX `ai-cache`는 `ai-proxy`가 제공자, 옵션과 override 설정을 적용한 뒤 실제로 보내는 요청을 키로 식별한다. LiteLLM의 Cache Controls 문서는 기본 키에 표준 OpenAI 파라미터만 넣는다고 설명하지만, 2026-10-21 main 소스는 LiteLLM이 아는 API 파라미터 집합(OpenAI SDK의 chat, completions, embeddings, transcription, Responses 파라미터와 Anthropic Messages, rerank 필드 등)을 키에 넣는다. 이 집합 밖에서 Vertex AI처럼 출력에 영향을 주는 제공자 고유 파라미터는 `enable_caching_on_provider_specific_optional_params`를 켜야 키에 들어간다. 캐싱 개요 문서는 요청 전체를 해시한다고도 적어 문서끼리도 설명이 다르므로, 키 범위는 배포한 버전의 소스로 확인한다. 요청별로 캐시를 건너뛰는 제어도 있다(Cloudflare `cf-aig-skip-cache`, LiteLLM의 조회 생략 `no-cache`와 저장 생략 `no-store`). 게이트웨이가 덧붙이거나 바꾸는 필드 가운데 응답을 바꾸는 값이 키에서 빠지지 않았는지 확인한다.

SimHash는 고차원 특징 벡터를 짧은 지문으로 줄이는 기법이다. Charikar(2002)의 무작위 초평면 해싱은 두 벡터의 비트가 일치할 확률이 둘 사이의 각도로 정해지므로, 비트를 이어 붙인 지문의 해밍 거리로 유사도를 추정할 수 있다. 웹 크롤링 연구(Manku 외, 2007)는 토큰화, 대소문자 통일, 불용어 제거 같은 기법으로 뽑은 가중 특징에 이를 적용했고, 한 바이트만 달라도 전혀 다른 값을 내는 SHA-1이나 MD5와 달리 근접 중복 문서의 지문은 적은 비트에서만 다르다고 설명한다. 웹 페이지 80억 개에 64비트 지문과 해밍 거리 3을 적절한 값으로 보고했지만, 이는 광고나 타임스탬프 정도만 다른 웹 문서를 같은 문서로 보는 판정에서 정밀도와 재현율이 모두 약 0.75인 지점이라 응답 재사용의 오적중 기준으로 그대로 옮기지 않는다. 비교 대상이 글의 표면 특징이므로 뜻이 같은지는 판정하지 않으며, 숫자나 부정어 하나로 답이 달라지는 요청도 가까운 지문을 가질 수 있다. 이 절에서 확인한 게이트웨이 문서(LiteLLM, Cloudflare, APISIX, Kong)는 응답 재사용 방식으로 정확 일치와 의미 캐시만 설명하므로(Cloudflare는 정확 일치만 제공하고 의미 검색은 향후 계획으로 언급), 근접 중복 계층은 이 기법에서 도출한 설계 선택지다.

의미 캐시가 무엇을 임베딩하는지도 제품마다 다르다. 2026-10-21 LiteLLM 문서 기준, 의미 캐시는 시스템 프롬프트를 포함한 `messages` 전체의 텍스트를 요청마다 먼저 임베딩하고 이 호출이 끝나야 모델로 넘어간다(기본 5초를 넘기면 미스로 진행). 다중 턴과 에이전트 요청은 직전 요청에 짧은 내용이 붙는 형태라 연속 턴의 임베딩이 거의 같아 이전 턴의 응답이 다시 나갈 수 있다. 임계값을 높여도 안정적으로 해결되지 않고 assistant의 `tool_calls`는 임베딩 대상이 아니므로, 에이전트가 쓰는 virtual key의 메타데이터에 `no-cache`를 두거나 캐시가 필요하면 정확 일치 캐시를 쓰라고 권한다. 2026-10-21 main 소스 기준 `no-cache`는 조회만 건너뛰고 저장은 `no-store`가 막는다. Cache Controls 문서의 표는 `no-cache`를 저장 생략으로 적어 같은 문서의 설명과 소스와 다르므로, 저장할 때의 임베딩과 저장까지 막으려면 `no-store`를 함께 두거나 캐시를 기본으로 끄는 설정을 검토한다. 반대로 2026-10-21 APISIX `ai-cache` 문서 기준, 의미 조회(L2)는 기본으로 꺼져 있고(`layers` 기본값 `["exact"]`), 켜면 마지막 `user` 메시지 하나만 임베딩하며(`semantic.match.message_countback` 기본 1) system, assistant, tool 메시지를 뺀다. 문서에는 적혀 있지 않지만 릴리스 3.19 소스는 임베딩에서 뺀 응답 결정 문맥(시스템 프롬프트, 앞 턴, RAG 문서)을 L2 partition에 접어 넣고 그 partition 안에서만 벡터 검색을 한다. 앞 문맥이 그대로 같은 요청끼리만 의미 비교하므로 다중 턴 요청의 L2 적중률은 낮을 수 있다.

다중 턴 요청은 [[ElastiCache-Use-Cases#문맥, 권한과 수명|시맨틱 캐시의 문맥 조건]]대로 마지막 질문만으로 검색하지 않는다. 답을 바꾸는 앞 턴의 문맥(대상 식별자, 확정된 조건, 참조한 도구 결과의 버전)을 정규화해 정확 일치 조건이나 검색 필터에 넣을 수 있는 대화형 요청에 한해 마지막 질문을 의미 비교한다. 그렇게 표현할 수 없는 문맥이 남는 요청과 에이전트 요청은 의미 캐시를 건너뛰는 구성을 검토한다(설계 제안).

2026-10-21 APISIX `ai-cache` 문서 기준, 스트림 응답은 프로토콜의 종료 이벤트를 받은 뒤에만 저장한다. 클라이언트 연결 종료나 `ai-proxy`의 `max_stream_duration_ms`, `max_response_bytes` 제한으로 끊긴 스트림은 저장하지 않으므로 그렇게 끊긴 응답은 재생되지 않는다. 문서가 밝힌 저장 조건에서 도출하면 출력 토큰 한도로 잘렸어도 프로토콜상 정상 종료한 응답은 저장될 수 있으므로, `finish_reason`이 `length`인 응답의 저장 여부를 시험한다(설계 점검). 적중하면 종료 이벤트를 포함한 하나의 `text/event-stream` 본문으로 돌려준다. 같은 프롬프트라도 스트리밍과 비스트리밍 요청은 정확 일치와 의미 조회 두 계층에서 모두 따로 저장하고, SSE 종료 이벤트가 없는 Bedrock ConverseStream 같은 이진 스트림은 캐시하지 않는다.

임베딩 캐시는 응답 대신 벡터를 다시 쓴다. 2026-10-21 소스 기준 LangChain `CacheBackedEmbeddings`는 입력 목록을 캐시에서 먼저 찾고 없는 텍스트만 하위 임베딩 모델로 계산해 저장한다. 다른 캐시와 충돌하지 않게 namespace를 두는 예로 임베딩 모델 이름을 들지만 기본값은 빈 문자열이라, 설정하지 않으면 모델이 키에 들어가지 않는다. 질의 임베딩(`embed_query`)은 기본으로 캐시하지 않는다. 기본 키 인코더인 SHA-1은 충돌 저항성이 없어 의도적으로 만든 다른 텍스트가 같은 키를 얻을 수 있다고 경고한다. 부분 적중에서는 새로 계산한 입력만 제공자 사용량을 만들므로 요청 하나를 적중이나 미스 하나로 정산하지 않는다. 키에 넣을 모델과 전처리 조건은 [[Vector-Similarity-Search#임베딩 공간은 versioned contract다|임베딩 공간 계약]]을 따른다.

캐시를 여러 서버가 공유하는지에 따라 적중률과 격리 범위가 달라진다. 2026-10-21 LiteLLM 문서 기준, 메모리 캐시는 워커 프로세스 안에만 있어 워커가 넷이면 캐시도 넷으로 나뉘어 적중률이 떨어지고, 문서는 메모리와 디스크 캐시 모두 워커와 복제본 사이에 공유되지 않는다며 로컬 개발용으로 권한다. 디스크 캐시는 고정 경로를 쓰므로 같은 호스트의 워커끼리 실제로 나뉘는지는 배포 환경에서 확인한다. Cloudflare는 캐시가 휘발성이며, 같은 요청 둘이 동시에 오면 앞 요청이 제때 저장되지 않아 뒤 요청이 캐시를 쓰지 못할 수 있다고 안내한다. 공유 범위의 기본값도 제품마다 다르다. APISIX는 라우트 단위로 격리하며, 여러 호출자(consumer)가 한 라우트를 쓰면 한 호출자의 응답이 다른 호출자에게 나갈 수 있어 `cache_key.include_consumer`로 나누라고 안내한다. LiteLLM 의미 캐시는 항목을 virtual key, 팀과 조직의 범위로 격리하므로 같은 virtual key 뒤의 최종 사용자는 기본적으로 한 범위를 공유하고, `semantic_cache_scope: end_user`로 분리한다. 2026-10-21 main 소스 기준 이 범위는 의미 캐시에만 붙으므로, 정확 일치 캐시는 같은 요청이면 virtual key를 넘어 공유될 수 있다. 배포한 버전에서 다시 확인한다. Claude 모델의 프롬프트 캐시는 호출 경로에 따라 workspace나 조직 단위로 격리되므로([[LLM-Prompt-Caching|프롬프트 캐싱]]), 게이트웨이가 같은 workspace나 조직으로 여러 테넌트를 호출하면 그 범위를 함께 쓴다. 다른 제공자의 격리 단위는 각 문서로 확인하고, 테넌트별 격리나 쓰기 비용 귀속이 필요하면 workspace나 조직을 나누는 구성을 검토한다(설계 점검). 앞 절의 업무별 정책도 캐시 키와 검색 필터에 반영한다.

적중 여부와 계층은 요청 기록의 필드로 확인한다. 2026-10-21 Kong AI Gateway 감사 로그 문서 기준, `cache_status`는 `Hit`, `Miss`, `Bypass`, `Refresh` 중 하나이고, 캐시 응답에서는 `llm_latency`와 `time_per_token`이 빠지며 의미 캐시 적중에는 임베딩 제공자, 모델과 지연이 함께 남는다. APISIX는 의미 조회(L2)를 정확 일치(L1) 미스 때만 수행하고 응답 헤더 `X-AI-Cache-Status`에 `MISS`, `HIT`, `BYPASS` 중 하나를 붙인다. `HIT`는 정확 일치와 의미 적중을 구분하지 않으며 의미 적중에만 `X-AI-Cache-Similarity`가 붙으므로, 요청 기록만으로 계층별 적중률을 나누려면 두 헤더를 함께 남겨야 한다. 제공자 프롬프트 캐시의 사용량은 LiteLLM이 지원 제공자에 한해 OpenAI 형식으로 맞춰 `prompt_tokens`에 적중과 미적중 입력을 함께 담고, 적중분은 `prompt_tokens_details.cached_tokens`, 캐시 쓰기분은 문서 예시상 Anthropic의 `cache_creation_input_tokens`로 나눈다. 적중 토큰의 단가는 미적중 토큰과 다를 수 있으므로 입력 합계만 남기면 정산에 필요한 구분을 잃는다. 쓰기 요금이 있는 다른 제공자도 정규화한 사용량에 쓰기분이 남는지 배포한 버전에서 확인한다.

아래는 이 구조에서 도출한 설계 점검이며, 특정 게이트웨이의 동작을 시험한 결과는 아니다.

- 응답 캐시의 조회 순서(예: 정확 일치, 근접 중복, 의미 조회, 제공자 호출)를 정하고, 앞 계층에서 적중해 건너뛴 계층을 미스로 세지 않는다. 분모는 응답 캐시 계층이면 그 계층까지 온 요청 수, 임베딩 캐시면 입력 수, 제공자 프롬프트 캐시면 입력 토큰 수로 나눠 정한다. 조회와 저장을 모두 건너뛴 요청(APISIX `BYPASS`)과 조회만 건너뛴 요청(LiteLLM `no-cache`)은 분모에서 빼서 따로 센다. Kong의 `Bypass`와 `Refresh`처럼 정의가 문서에 없는 상태는 조회를 실제로 했는지, 찾은 항목을 쓰지 못했는지 확인해 나누고 원인을 기록한다.
- 공유 저장소 앞에 프로세스 안의 로컬 복제본을 두는 2단 구성이면, 항목을 복제본으로 옮길 때 남은 수명만 넘기고 새 TTL을 주지 않는다. 키의 테넌트, 사용자와 정책 범위도 그대로 유지한다. 공유 저장소에서 항목을 지우거나 정책, 프롬프트, 모델이 바뀌어도 복제본은 남은 수명 동안 이전 응답을 낼 수 있으므로 이 버전들을 키에 넣거나 무효화를 복제본까지 전파하고 로컬 TTL에 상한을 둔다.
- 순이득은 생략한 모델 호출 비용에서 미스를 포함한 조회 전체의 임베딩과 검색 비용, 저장 비용, 오적중 처리 비용을 빼서 계산하고, 미스 경로에서 늘어나는 지연도 따로 본다. 생략한 호출은 청구서에 나타나지 않으므로 청구 자료와는 게이트웨이가 기록한 실제 제공자 사용량을 대조하고, 절감액은 추정치로 표시한다.
- 적중한 요청도 현재 호출자의 virtual key, 팀과 최종 사용자로 기록하고 적중 계층과 재사용한 항목을 남긴다. 처음 응답을 만든 호출자에게 귀속하지 않으며, 적중을 예산과 한도에 어떻게 셀지는 정책으로 정하고 실제 기록으로 확인한다.

## 게이트웨이 사용 지표는 표본과 집계 정의부터 읽는다

게이트웨이 사업자가 공개하는 사용 지표는 그 게이트웨이를 거친 고객 트래픽의 집계다. 시장 전체 점유율이나 자기 서비스의 모델 선택 근거로 옮기기 전에 분류 기준, 집계 단위와 비교 기간을 확인한다. 다른 게이트웨이의 같은 유형 자료는 [[AI-Capability-and-Cost-Trends#4. 오픈웨이트 모델과 사용량 점유율|오픈웨이트 모델과 사용량 점유율]]에서, 점유율의 분모와 채널을 읽는 기준은 [[LLM-Market-Landscape|생성형 AI 시장 경쟁 구도]]에서 다룬다.

2026-10-25 확인한 Vercel AI Gateway Production Index(2026-10-15 게시, 2026년 9월까지 이 게이트웨이를 거친 익명화된 집계)의 수치와 정의를 짝지으면 다음과 같다.

| 수치 | 집계 정의 | 읽을 때의 한계 |
|---|---|---|
| 오픈웨이트가 토큰 71.5%, 지출 23%(보고서 제목의 수치). 지출 비중은 6월 약 20분의 1에서 9월 4분의 1 가까이로 늘었다 | 오픈웨이트 분류는 현재 모델 목록을 따르며 이전 보고서보다 넓다. 토큰에는 입력, 출력, 추론, 캐시 입력과 캐시 생성 토큰이 들어간다 | 이전 보고서의 비율과 바로 잇지 않으며 이전 달 수치도 방법론이 바뀌면 수정될 수 있다. 지출은 공개 정가로 추정해 실제 청구액과 다를 수 있다 |
| DeepSeek-v4.1-Flash가 9월 토큰의 절반 가까이, 지출의 2.6% | 같은 토큰 정의와 정가 추정 | 토큰 비중으로 지출 구조를 추정하지 않는다 |
| 9월에 팀 셋 중 하나 가까이가 가장 많이 쓰는 연구소를 바꿈(지수 기록상 최고) | 두 달 모두 유료 토큰 1,000만 개 이상인 유료 팀을 유료 토큰 기준으로 비교 | 기준에 못 미치는 소규모 팀은 빠진다 |
| 10억 토큰 이상 처리한 팀이 평균 42개 모델 사용 | 2025-12부터 2026-09까지 누적하고 버전마다 따로 셈. 팀 규모 기준(10억 토큰)은 그 기간의 입력과 출력 토큰 합으로만 적혀 있어, 추론과 캐시 토큰까지 나열한 1행의 토큰 정의와 범위가 같은지는 밝히지 않는다 | 한 시점에 42개를 함께 운영한다는 뜻이 아니다 |
| 9월 중국 기원 모델 지출의 3분의 2 이상이 미국 기반 제공자로 감(12월에는 10분의 1 미만) | 제공자 위치는 본사 기준 | 본사 위치가 추론이 실행되는 리전이나 데이터 처리 위치를 뜻하지는 않는다 |

자기 게이트웨이의 사용 기록에는 다음을 적용한다(설계 점검).

- 토큰은 입력, 출력, 추론, 캐시 읽기와 캐시 쓰기로 나눠 남기고, 지출은 정가 추정과 실제 청구를 따로 둔다.
- 모델 교체와 혼용이 잦으면 모델 버전과 실행 제공자를 요청 기록에 남겨 품질과 비용의 변화를 버전 단위로 비교한다.
- 모델을 만든 연구소와 실행하는 제공자를 구분하고, 데이터 처리 위치는 처리량 확장 절처럼 실제 목적지 리전으로 확인한다.

## 출처

- [당근은 왜 LLM Router를 직접 만들었을까? — 당근 팀, 2026 당근 빌더 밋업](https://www.youtube.com/watch?v=anmRVnqdyco)
- [Guidance for Multi-Provider Generative AI Gateway on AWS — AWS Solutions Library Samples](https://github.com/aws-solutions-library-samples/guidance-for-multi-provider-generative-ai-gateway-on-aws)
- [LiteLLM, Virtual Keys](https://docs.litellm.ai/docs/proxy/virtual_keys)
- [LiteLLM, Budgets, Rate Limits](https://docs.litellm.ai/docs/proxy/users)
- [Anthropic, OpenAI SDK compatibility](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk)
- [Google AI for Developers, Thought signatures (Generate Content API)](https://ai.google.dev/gemini-api/docs/generate-content/thought-signatures)
- [Amazon Bedrock, Deploy a prompt to your application using versions in Prompt management](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management-deploy.html)
- [Amazon Bedrock, Test a prompt using Prompt management](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management-test.html)
- [Amazon Bedrock, Quotas for Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html)
- [Amazon Bedrock, Supported Regions and models for inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)
- [BT Group’s Digital Unit launches ‘GenAI Gateway’ platform, powered by AWS — Amazon Press Center](https://press.aboutamazon.com/aws/2024/9/bt-groups-digital-unit-launches-genai-gateway-platform-powered-by-aws-accelerating-the-companys-safe-adoption-of-generative-ai-at-scale)
- [LiteLLM, Caching](https://docs.litellm.ai/docs/proxy/caching)
- [LiteLLM, Cache Controls](https://docs.litellm.ai/docs/proxy/caching_controls)
- [LiteLLM, Semantic Caching](https://docs.litellm.ai/docs/proxy/caching_semantic)
- [LiteLLM, Prompt Caching](https://docs.litellm.ai/docs/completion/prompt_caching)
- [Cache (litellm/caching/caching.py) — LiteLLM GitHub](https://github.com/BerriAI/litellm/blob/main/litellm/caching/caching.py) — 2026-10-21 main, 의미 캐시에만 붙는 테넌트 범위
- [LLMCachingHandler (litellm/caching/caching_handler.py) — LiteLLM GitHub](https://github.com/BerriAI/litellm/blob/main/litellm/caching/caching_handler.py) — 2026-10-21 main, `no-cache` 조회 생략과 `no-store` 저장 생략
- [ModelParamHelper (litellm/litellm_core_utils/model_param_helper.py) — LiteLLM GitHub](https://github.com/BerriAI/litellm/blob/main/litellm/litellm_core_utils/model_param_helper.py) — 2026-10-21 main, 캐시 키에 넣는 파라미터 집합
- [Cloudflare AI Gateway, Caching](https://developers.cloudflare.com/ai-gateway/features/caching/)
- [Apache APISIX, ai-cache](https://apisix.apache.org/docs/apisix/plugins/ai-cache/)
- [ai-cache semantic layer (apisix/plugins/ai-cache/semantic.lua) — Apache APISIX GitHub](https://github.com/apache/apisix/blob/release/3.19/apisix/plugins/ai-cache/semantic.lua) — 릴리스 3.19, 임베딩 밖 문맥의 L2 partition
- [Kong, AI Gateway audit log reference](https://developer.konghq.com/ai-gateway/ai-audit-log-reference/)
- [CacheBackedEmbeddings (langchain_classic/embeddings/cache.py) — LangChain GitHub](https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain_classic/embeddings/cache.py)
- [Similarity Estimation Techniques from Rounding Algorithms — STOC 2002, Moses S. Charikar](https://www.cs.princeton.edu/courses/archive/spr04/cos598B/bib/CharikarEstim.pdf)
- [Detecting Near-Duplicates for Web Crawling — WWW 2007, Gurmeet Singh Manku, Arvind Jain, Anish Das Sarma](https://archives.iw3c2.org/www2007/papers/paper215.pdf)
- [No.1 A.I Gateway Ziq Cache 구조 — 데브아트 DevArt](https://www.youtube.com/watch?v=sEDu9sSV0Ww) — 계층 구분과 설계 점검의 계기이며 제품 고유 동작은 근거로 쓰지 않음
- [Open weight takes 71.5% of tokens and 23% of spend — Vercel](https://vercel.com/blog/ai-gateway-production-index-october-2026) — 2026-10-15 게시, 2026년 9월까지의 게이트웨이 집계와 방법론 대조
- [If you don't run your own LLM proxy, how the f*** do you even know whats going on? — jrdsgl.com](https://jrdsgl.com/if-you-dont-run-your-own-llm-proxy-how-the-fuck-do-you-even-know-whats-going-on) — 2026-10-18 개인 의견 글, 2026-10-27 본문 확인. 제목의 비속어는 가렸다
- 사용자 제공 GeekNews 알림 요약(2026-10-16~27): 관측을 위한 LLM 프록시 자체 운영. 게시물 URL은 확인하지 못했고 위 원문으로 대조했다

## 관련 문서

- [[LLM-Cost-Optimization|LLM 비용 최적화]]
- [[LLM-Failure-Handling|LLM 실패 처리]]
- [[Generative-AI-Multi-Tenancy|생성형 AI의 테넌트 격리]]
- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱]]
- [[ElastiCache-Use-Cases|ElastiCache 사용 사례 (시맨틱 캐시와 챗봇 캐시)]]
- [[Supply-Chain-Security|공급망 보안]] — 프록시 소프트웨어의 릴리스 사고
- [[AI-Coding-Agent-Usage-Telemetry|AI 코딩 에이전트 사용량 텔레메트리]] — 클라이언트 기록 기반 사용량 집계
