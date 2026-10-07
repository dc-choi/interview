---
tags: [ai]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI Engineering", "AI 시대 엔지니어링"]
---

# AI엔지니어링(AI Engineering)

Software 3.0 패러다임, LLM과 에이전트, 하네스, 평가, 조직 전환과 역할 변화를 다루는 독립 기술 축이다. 주제별 하위 영역으로 나뉘어 있다.

## 하위 영역
- [[paradigm|패러다임, 모델]] — Software 3.0, Gemini 4 Argon, Claude Fable 5 / Mythos 5, Claude Opus 5 (모델, API 거동)
- [[tools|실천 도구]] — 하네스 시스템(구성요소 비교 실험, 런타임 구성도, 게이트 배치, 도입 계단, AI 네이티브 시스템과 조직, 군집 격리), 컨텍스트(멀티레포 분석과 업무 기록 재사용), 에이전트, 사용량 관측, RAG, MCP, LLM 원리와 운영(학습과 생성, 추론 병목과 로컬 메모리 예산, 모델 티어, 워크플로우 패턴과 승인 대기열, 결정 모델, 프롬프트 캐싱, 실패 처리), 음성 인식(로컬 STT 엔진 비교, 영상 전사 파이프라인)
- [[org-role|조직, 역할]] — AX 조직 전환(Maker→Closer), 개발자 역할 재정의, 도달력(Distribution)이 새 해자, 생성형 AI 시장 구도와 규제 논쟁, AI 시민 개발
- [[eval|평가, 신뢰성, 캘리브레이션]] — LLM 평가 전략, Abstention(모른다고 말하는 능력), 환각 유형과 검증, 평가 주도 개발(EDD), 루브릭과 점수 게이트, LLM 판정기, 골든셋과 배포 관문, 서빙 모델 드리프트 감시

## 세부 학습
- [x] [[Event-Log-Highlight-Generation|이벤트 로그 기반 하이라이트]] — 코드와 모델의 역할 분리, 통계 조회와 사실 검증
- [x] [[Strands-Conversation-State|Strands 대화와 세션 상태]] — 문맥 축약과 저장, 대화별 동시 쓰기 경계
- [x] [[LLM-Gateway|LLM 게이트웨이]] — 키별 권한, 예산 검사의 DB 의존성, 배포 경로와 운영 점검
- [x] [[Generative-AI-Multi-Tenancy|생성형 AI SaaS의 테넌트 격리]] — 자원 배치와 접근 통제, RAG 검색 범위와 토큰 사용량 제한
- [x] [[LLM-Hallucination-Verification#Bedrock의 근거 검사와 정책 검증|Bedrock 환각 검증의 경계]] — grounding과 relevance, 정책 범위, detect mode와 검사 실행 여부
- [x] [[Agent-Skills#Kiro Powers: 도구와 지침을 함께 활성화한다|Kiro Powers와 API 명세 연동]] — 도구와 지침의 동적 로드, 현재 패키지 형식과 검증 경계
- [x] [[A2A-Kafka-Transport|A2A와 Kafka 전송]] — 표준 바인딩과 사용자 정의 전송, 외부 부수효과의 멱등성과 MSK 권한
- [x] [[Generative-Product-Image-Workflow|생성형 상품 이미지 워크플로우]] — 편집 영역, 원본 대조, SageMaker GPU 지원과 유휴 축소의 구분
- [x] [[Aspect-Based-Sentiment-Analysis|속성 기반 감성 분석]] — 구문과 감성 추출, 리뷰 집계와 요약, 단계별 평가
- [x] [[Time-Series-Forecast-Evaluation|시계열 예측 평가]] — 예측 시점의 정보, rolling origin, 외부 변수와 MAPE의 해석
- [x] [[Agent-Data-Analysis-Workflow|에이전트 데이터 분석과 보고서]] — 계획, 격리된 코드 실행, 계산 결과 인계와 검산, 정기 보고서의 데이터 확정과 최종 승인
- [x] [[Agent-Ready-API-Design#선택 결과와 화면 데이터를 분리한다|에이전트 출력과 화면 조립]] — 상품 ID 검증, 원본 데이터 재사용과 전체 지연 측정
- [x] [[LLM-Product-Attribute-Extraction|LLM 상품 속성 추출]] — 이미지 전처리, 치수와 모델 정보의 구분, 검증된 예시와 보류 평가
- [x] [[RAG-Retrieval-Engineering#가설을 분해해 반대 근거를 찾는다|가설 검토용 RAG]] — 전제별 반대 근거 검색, 원문과 해석의 연결, 검색 실패와 가설 입증의 구분
- [x] [[Claude-Code-Business-Automation#긴 문서 분석과 출력 독자를 함께 지정한다|문서 분석 프롬프트]] — 원문 구조, 근거 추출, 대상 독자와 반론 검토의 한계
- [x] [[Bedrock-AgentCore-Operations|Bedrock AgentCore 운영 경계]] — 세션 소유 관계, 영속 상태, Gateway Policy 적용 경로와 계측 범위
- [x] [[Agent-Swarm-Containment#역량 평가와 배포 통제를 분리해 읽는다|사이버 역량 평가의 조건]] — 역량 등급, 평가 접근권, 안전장치와 서비스 설정의 구분
- [x] [[Agent-Spec-Writing#스펙 산출물과 승인 지점을 분리한다|스펙 생성과 검토 흐름]] — 요구사항, 설계와 작업 목록, Quick Spec의 승인 생략과 사후 검토
- [x] [[Agent-Test-Verification-Behavior#마이그레이션에서는 기존 구현을 비교 기준으로 쓴다|생성 코드의 마이그레이션 검증]] — 같은 초기 상태, 반환값과 DB 변경, 의도된 차이와 회귀
- [x] [[LLM-Generation-Mechanics-Context-and-Agent#계산 계획을 검토 가능한 데이터로 둔다|LLM 계산 계획과 실행]] — 상위 계획, 계산 그래프와 실행 결과의 대조
- [x] [[AI-Workflow-Knowledge-Loop#운영 표준, 작업 경험과 현재 환경을 분리한다|운영 지식의 재사용]] — 표준과 경험의 권위, 실행 시점 환경 조회와 권한 차단의 구분
- [x] [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]] — 화면 배치, 상태 관찰, worktree 분리와 완료 검증

- [x] [[Generative-Video-Editing|생성형 영상 편집]] — 자연어 수정, Google Vids 기능 범위, 원본 보존과 프레임 검수
- [x] [[LLM-Workflow-Patterns#Text-to-SQL과 데이터 디스커버리|Text-to-SQL]] — 스키마, 업무 정의와 예시 SQL, 생성과 실행의 분리, 오류별 복구 지점과 조회 권한
- [x] [[LLM-Workflow-Patterns#시각적 워크플로우의 오류 처리|시각적 워크플로우 오류 처리]] — n8n Error Trigger, 수동 실행과 자동 실행 검증의 차이
- [x] [[Long-Context-Evaluation|긴 문맥 평가]] — 근거 위치와 입력 길이, 검색 누락과 활용 실패, 비용과 정확도 비교
- [x] [[Agent-Client-Protocol|ACP]] — 에디터와 에이전트 연결, 요청/알림, 기능 협상과 실행 승인
- [x] [[LLM-Wiki-Knowledge-Compilation|LLM 위키]] — 합성 결과의 재사용, 원문 추적과 자동 갱신의 검증 경계
- [x] [[Claude-Design-Handoff|AI 디자인 시스템과 구현 인계]] — 시안 선택, 디자인 동기화, 프로토타입 검증과 웹 애니메이션의 영상 렌더링 경계
- [x] [[Claude-Code-Business-Automation#시각 산출물 — 출력 형식과 최종 PDF 검수|문서 생성과 PDF 검수]] — 편집 가능한 원본의 필요, 인쇄 미디어, 웹 화면 캡처와 최종 PDF 페이지 검수의 구분
- [x] [[Agent-Ready-API-Design#명령 발견과 실패 응답도 계약이다|에이전트 CLI 계약]] — 구조화된 도움말, 후속 명령 안내와 재시도 판단의 한계
- [x] [[LLM-Generation-Mechanics-Training#LoRA와 QLoRA: 바꾸는 파라미터와 저장 정밀도|LoRA와 QLoRA]] — 저랭크 변화량, 기반 가중치 고정, 저장 정밀도와 연산 정밀도, 배포 구성 평가
- [x] [[Codex-CLI#구독 요금과 속도 모드의 사용량|Codex 구독과 속도 모드]] — 포함 사용량, 구매 크레딧과 API 과금의 구분
- [x] [[LLM-Decision-Models#도구 기록을 선별하는 압축|결정 모델을 이용한 기록 선별]] — 원문 보존과 정보 손실, 판정 입력과 반복 호출 비용
- [x] [[LLM-Inference-Bottlenecks#사례 수치는 CPU와 GPU 작업을 나눠 읽는다|가속기 사례의 측정 경계]] — CPU와 GPU 작업, 측정치와 추정치, 독립 검증 여부
- [x] [[Claude-Code-Extension-Reference#화면 변경과 데이터 보호의 경계|Mods 화면 변경]] — 이벤트 전달, 공유 표시 영역과 화면 가림의 데이터 보호 한계
- [x] [[Agent-Ready-API-Design#API 스키마와 생성 결과를 함께 관리한다|API 스키마 기반 도구 생성]] — CLI, SDK와 문서의 공통 계약, 수작업 명령과 생성 결과 검토
- [x] [[LLM-Generation-Mechanics-Context-and-Agent#숫자 생성과 계산 도구 실행은 다르다|LLM 산술과 계산 도구]] — 식과 입력, 실행 증거, 결과 전달의 검증 경계
- [x] [[Agent-Memory-Retain-Recall-Reflect|에이전트 기억의 저장, 검색과 추론]] — CoALA와 Hindsight, 개인화 기억의 출처, 클라우드 저장과 삭제 범위
- [x] [[MCP#변경 알림 구독과 재연결|MCP 변경 알림 구독]] — subscriptions/listen, 재조회와 연결 단절의 의미
- [x] [[Production-Agent-Architecture#사례|에이전트 격리와 행동 승인 사례]] — 사용자별 VM과 별도 통제 계층

- [x] [[Realtime-Voice-Architecture|실시간 음성 에이전트]] — 전이중 대화와 백엔드 작업 분리, 위임과 취소, 음성 안내와 실제 결과 대조, TTS의 첫 재생 지연과 버퍼 절충
- [x] [[MCP#RAG, 에이전트와 Function Calling의 경계|MCP, RAG와 에이전트의 책임 구분]] — 연결 프로토콜, 근거 검색과 동적 실행 흐름
- [x] [[LLM-Inference-Bottlenecks#에이전트 서빙은 세션 단위로 측정한다|에이전트 서빙 벤치마크]] — 턴별 문맥 증가, 캐시 재사용, 동시성 포화점과 지연 목표
- [x] [[LLM-Generation-Mechanics-Context-and-Agent#대화 요약과 별도 기록의 경계|LLM 대화 요약과 작업 기록]] — 압축의 손실, 외부 상태 저장과 컨텍스트 재주입
- [x] [[Linear-Attention|선형 어텐션]] — 특징 맵, 정규화와 인과 누적 상태
- [x] [[Claude-Code-Workflows#긴 작업의 완료와 중단 조건|에이전트의 완료와 중단 조건]] — 결과 증거, 작업 목록과 검증 한계
