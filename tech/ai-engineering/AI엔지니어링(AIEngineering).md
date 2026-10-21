---
tags: [ai]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI Engineering", "AI 시대 엔지니어링"]
---

# AI엔지니어링(AI Engineering)

Software 3.0 패러다임, LLM과 에이전트, 하네스, 평가, 조직 전환과 역할 변화를 다루는 독립 기술 축이다. 주제별 하위 영역으로 나뉘어 있다.

## 원문 확인 대기

- [ ] [아카라이브 AI 홈랩 게시물 185810092](https://arca.live/b/aihomelab/185810092?p=1) — 2026-10-15 정리 요청. HTTP 403과 브라우저 접근 정책 차단으로 제목과 본문 미확보. 본문을 확보한 뒤 주제를 분류하고 지식 문서에 반영한다. 링크 기록만 완료했으며 본문 학습은 미완료다.

## 하위 영역
- [[Palantir-Foundry|Palantir Foundry와 운영 온톨로지]] — 데이터와 모델, 객체 백엔드, 행동과 함수, 보안, SDK와 에이전트 연결
- [[paradigm|패러다임, 모델]] — Software 3.0, 에너지 기반 추론, Gemini 4 Argon, Claude Fable 5 / Mythos 5, Claude Opus 5 (모델, API 거동)
- [[tools|실천 도구]] — 하네스 시스템(구성요소 비교 실험, 런타임 구성도, 게이트 배치, 도입 계단, AI 네이티브 시스템과 조직, 군집 격리), 컨텍스트(멀티레포 분석과 업무 기록 재사용), 에이전트, 사용량 관측, RAG, MCP, LLM 원리와 운영(학습과 생성, 추론 병목과 로컬 메모리 예산, 모델 티어, 워크플로우 패턴과 승인 대기열, 결정 모델, 프롬프트 캐싱, 실패 처리), 음성 인식(로컬 STT 엔진 비교, 영상 전사 파이프라인)
- [[org-role|조직, 역할]] — AX 조직 전환(Maker→Closer), 개발자 역할 재정의, 도달력(Distribution)이 새 해자, 생성형 AI 시장 구도와 규제 논쟁, AI 시민 개발
- [[eval|평가, 신뢰성, 캘리브레이션]] — LLM 평가 전략, Abstention(모른다고 말하는 능력), 환각 유형과 검증, 평가 주도 개발(EDD), 루브릭과 점수 게이트, LLM 판정기, 골든셋과 배포 관문, 서빙 모델 드리프트 감시

## 세부 학습
- [x] [[Java-AI-Integration-Boundaries|Java AI 통합의 실행 경계]] — 원격 및 로컬 추론, 외부 함수 호출과 GPU 코드 변환의 구분
- [x] [[VLLM-Serving-Security|vLLM 서빙 보안]] — API 키의 경로 범위, 내부 통신 격리와 동적 LoRA 관리 권한
- [x] [[AI-Code-Delegation-Review|AI 구현 위임과 코드 리뷰]] — 구현 계약, 시스템 이해와 배포 책임, 경험 기반 전망의 한계
- [x] [[Agent-Repository-Instructions#사용자 판단 기준의 보존과 재정렬|에이전트와 사용자 기준 맞추기]] — ALIGN.md, 선호와 절차의 분리, 재정렬과 벤치마크 해석
- [x] [[Tacit-Knowledge-Judgment-Agent|암묵지와 판단 에이전트]] — 암묵지와 형식지, Nonaka의 네 변환 방식, 사례와 피드백 흡수, 반복 판단의 원칙 승격, 판단 에이전트의 배치와 홀드아웃 일치도
- [x] [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]] — 의미 규칙과 실제 사실의 구분, 허용 관계와 식별자, 반영 전 검사, Palantir Foundry Ontology의 object, link, action과 권한
- [x] [[Agent-Graph-Engineering|그래프 엔지니어링]] — 실행 그래프의 노드와 엣지, 코드와 모델과 사람의 판정 분담, 실패 노드 복귀와 재시도 한도, 그래프를 쓰지 않을 작업
- [x] [[AI-Work-Tool-Selection|AI 업무 도구 선택]] — 병목과 산출물로 제품 및 공개 저장소 비교, 검색과 생성과 관리의 구분, 모델과 데이터 API 및 검수 비용을 포함한 자동화 효과 측정
- [x] [[LLMs-Txt|llms.txt]] — 웹 문서 색인, v2 발견 규칙, 생성 도구와 운영 검증
- [x] [[Agent-Repository-Instructions|AGENTS.md]] — 저장소 지침의 작성과 호스트별 적용, 권한 통제와 검증 경계
- [x] [[MCP#Bedrock Converse와 MCP를 잇는 클라이언트 루프|Bedrock Converse와 MCP 연동]] — 스키마 변환, 도구 실행과 toolUseId 결과 연결
- [x] [[GraphRAG-Retrieval|GraphRAG 검색]] — 관계 확장, 원문 검증, Bedrock 동기화와 자원 정리 경계
- [x] [[Review-Moderation-Pipeline|리뷰 검수 자동화]] — 정책과 판정 수단, 정밀도와 재현율, 재검토 물량과 오래된 결과 방지
- [x] [[LLM-Generation-Mechanics-Training#사전학습 데이터와 재현 가능한 공개 범위|사전학습의 데이터와 재현성]] — 가중치와 학습 과정 공개의 차이, 데이터 필터링과 과업 평가
- [x] [[Harness-Component-Evaluation#코딩 도구의 비용 비교|코딩 도구 비용 비교]] — 모델과 하네스 효과 분리, 실패와 재시도 포함, 환산 사용량과 청구액 구분
- [x] [[Event-Log-Highlight-Generation|이벤트 로그 기반 하이라이트]] — 코드와 모델의 역할 분리, 통계 조회와 사실 검증
- [x] [[Strands-Conversation-State|Strands 대화와 세션 상태]] — 문맥 축약과 저장, 대화별 동시 쓰기 경계
- [x] [[LLM-Gateway|LLM 게이트웨이]] — 키별 권한, 예산 검사의 DB 의존성, 배포 경로와 운영 점검, 캐시 계층의 키와 정산
- [x] [[Generative-AI-Multi-Tenancy|생성형 AI SaaS의 테넌트 격리]] — 자원 배치와 접근 통제, RAG 검색 범위와 토큰 사용량 제한
- [x] [[LLM-Hallucination-Verification#Bedrock의 근거 검사와 정책 검증|Bedrock 환각 검증의 경계]] — grounding과 relevance, 정책 범위, detect mode와 검사 실행 여부
- [x] [[Agent-Skills-Kiro#Kiro Powers: 도구와 지침을 함께 활성화한다|Kiro Powers와 API 명세 연동]] — 도구와 지침의 동적 로드, 현재 패키지 형식과 검증 경계
- [x] [[A2A-Kafka-Transport|A2A와 Kafka 전송]] — 표준 바인딩과 사용자 정의 전송, 외부 부수효과의 멱등성과 MSK 권한
- [x] [[A2A-CLI|A2A CLI]] — 카드 조회, 메시지와 작업 명령, 종료 코드와 작업 결과의 분리, `--exec` 테스트 서버, 코딩 에이전트 스킬
- [x] [[Generative-Product-Image-Workflow|생성형 상품 이미지 워크플로우]] — 편집 영역, 원본 대조, SageMaker GPU 지원과 유휴 축소의 구분
- [x] [[Aspect-Based-Sentiment-Analysis|속성 기반 감성 분석]] — 구문과 감성 추출, 리뷰 집계와 요약, 단계별 평가
- [x] [[Time-Series-Forecast-Evaluation|시계열 예측 평가]] — 예측 시점의 정보, rolling origin, 외부 변수와 MAPE의 해석
- [x] [[Agent-Data-Analysis-Workflow|에이전트 데이터 분석과 보고서]] — 계획, 격리된 코드 실행, 계산 결과 인계와 검산, 정기 보고서의 데이터 확정과 최종 승인
- [x] [[Agent-Ready-API-Design#선택 결과와 화면 데이터를 분리한다|에이전트 출력과 화면 조립]] — 상품 ID 검증, 원본 데이터 재사용과 전체 지연 측정
- [x] [[LLM-Product-Attribute-Extraction|LLM 상품 속성 추출]] — 이미지 전처리, 치수와 모델 정보의 구분, 검증된 예시와 보류 평가
- [x] [[RAG-Retrieval-Engineering#가설을 분해해 반대 근거를 찾는다|가설 검토용 RAG]] — 전제별 반대 근거 검색, 원문과 해석의 연결, 검색 실패와 가설 입증의 구분
- [x] [[Claude-Code-Business-Automation#긴 문서 분석과 출력 독자를 함께 지정한다|문서 분석 프롬프트]] — 원문 구조, 근거 추출, 대상 독자와 반론 검토의 한계
- [x] [[Bedrock-AgentCore-Operations|Bedrock AgentCore 운영 경계]] — 세션 소유 관계, 영속 상태, Gateway Policy와 temporal session, 계측과 모델 초기 구독 권한
- [x] [[Agent-Swarm-Containment#역량 평가와 배포 통제를 분리해 읽는다|사이버 역량 평가의 조건]] — 역량 등급, 평가 접근권, 안전장치와 서비스 설정의 구분
- [x] [[Agent-Spec-Writing#스펙 산출물과 승인 지점을 분리한다|스펙 생성과 검토 흐름]] — 요구사항, 설계와 작업 목록, Quick Spec의 승인 생략과 사후 검토
- [x] [[Agent-Test-Verification-Behavior#마이그레이션에서는 기존 구현을 비교 기준으로 쓴다|생성 코드의 마이그레이션 검증]] — 같은 초기 상태, 반환값과 DB 변경, 의도된 차이와 회귀, 이식한 테스트의 충실도와 알려진 차이
- [x] [[LLM-Generation-Mechanics-Context-and-Agent#계산 계획을 검토 가능한 데이터로 둔다|LLM 계산 계획과 실행]] — 상위 계획, 계산 그래프와 실행 결과의 대조
- [x] [[AI-Workflow-Knowledge-Loop#운영 표준, 작업 경험과 현재 환경을 분리한다|운영 지식의 재사용]] — 표준과 경험의 권위, 실행 시점 환경 조회와 권한 차단의 구분
- [x] [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]] — 화면 배치, 상태 관찰, worktree 분리와 완료 검증

- [x] [[Generative-Video-Editing|생성형 영상 편집]] — 자연어 수정, Google Vids 기능 범위, 원본 보존과 프레임 검수, 세로 숏폼 자동 리프레이밍
- [x] [[LLM-Workflow-Patterns-Text-to-SQL#Text-to-SQL과 데이터 디스커버리|Text-to-SQL]] — 스키마, 업무 정의와 예시 SQL, 생성과 실행의 분리, 오류별 복구 지점과 조회 권한
- [x] [[LLM-Workflow-Patterns-Chain-vs-Agent#시각적 워크플로우의 오류 처리|시각적 워크플로우 오류 처리]] — n8n Error Trigger, 수동 실행과 자동 실행 검증의 차이
- [x] [[Long-Context-Evaluation|긴 문맥 평가]] — 근거 위치와 입력 길이, 검색 누락과 활용 실패, 비용과 정확도 비교
- [x] [[Agent-Client-Protocol|ACP]] — 에디터와 에이전트 연결, 요청/알림, 기능 협상과 실행 승인
- [x] [[LLM-Wiki-Knowledge-Compilation|LLM 위키]] — 합성 결과의 재사용, 원문 추적과 자동 갱신의 검증 경계
- [x] [[Claude-Design-Handoff|AI 디자인 시스템과 구현 인계]] — 시안 선택, 디자인 동기화, 프로토타입 검증과 웹 애니메이션의 영상 렌더링 경계
- [x] [[Claude-Code-Business-Automation#시각 산출물 — 출력 형식과 최종 PDF 검수|문서 생성과 PDF 검수]] — 편집 가능한 원본의 필요, 인쇄 미디어, 웹 화면 캡처와 최종 PDF 페이지 검수의 구분
- [x] [[Agent-Ready-API-Design#명령 발견과 실패 응답도 계약이다|에이전트 CLI 계약]] — 구조화된 도움말, 후속 명령 안내와 재시도 판단의 한계
- [x] [[LLM-Generation-Mechanics-Training#LoRA와 QLoRA: 바꾸는 파라미터와 저장 정밀도|LoRA와 QLoRA]] — 저랭크 변화량, 기반 가중치 고정, 저장 정밀도와 연산 정밀도, 배포 구성 평가
- [x] [[Codex-CLI#구독 요금과 속도 모드의 사용량|Codex 구독과 속도 모드]] — 포함 사용량, 구매 크레딧과 API 과금의 구분
- [x] [[LLM-Decision-Models-Use-Cases#도구 기록을 선별하는 압축|결정 모델을 이용한 기록 선별]] — 원문 보존과 정보 손실, 판정 입력과 반복 호출 비용
- [x] [[LLM-Inference-Bottlenecks#사례 수치는 CPU와 GPU 작업을 나눠 읽는다|가속기 사례의 측정 경계]] — CPU와 GPU 작업, 측정치와 추정치, 독립 검증 여부
- [x] [[Claude-Code-Extension-Reference#화면 변경과 데이터 보호의 경계|Mods 화면 변경]] — 이벤트 전달, 공유 표시 영역과 화면 가림의 데이터 보호 한계
- [x] [[Agent-Ready-API-Design#API 스키마와 생성 결과를 함께 관리한다|API 스키마 기반 도구 생성]] — CLI, SDK와 문서의 공통 계약, 수작업 명령과 생성 결과 검토
- [x] [[LLM-Generation-Mechanics-Context-and-Agent#숫자 생성과 계산 도구 실행은 다르다|LLM 산술과 계산 도구]] — 식과 입력, 실행 증거, 결과 전달의 검증 경계
- [x] [[Agent-Memory-Retain-Recall-Reflect|에이전트 기억의 저장, 검색과 추론]] — CoALA와 Hindsight, 개인화 기억의 출처, 클라우드 저장과 삭제 범위
- [x] [[MCP#변경 알림 구독과 재연결|MCP 변경 알림 구독]] — subscriptions/listen, 재조회와 연결 단절의 의미
- [x] [[Production-Agent-Architecture-Cases-and-Interview#사례|에이전트 격리와 행동 승인 사례]] — 사용자별 VM과 별도 통제 계층

- [x] [[Realtime-Voice-Architecture|실시간 음성 에이전트]] — 전이중 대화와 백엔드 작업 분리, 위임과 취소, 음성 안내와 실제 결과 대조, TTS의 첫 재생 지연과 버퍼 절충
- [x] [[Korean-TTS-Training-and-Evaluation|한국어 TTS 학습과 평가]] — 코덱과 생성 모델의 병목 분리, LoRA와 전체 미세조정, 내용 정확도와 청취 평가
- [x] [[MCP#RAG, 에이전트와 Function Calling의 경계|MCP, RAG와 에이전트의 책임 구분]] — 연결 프로토콜, 근거 검색과 동적 실행 흐름
- [x] [[LLM-Inference-Bottlenecks#에이전트 서빙은 세션 단위로 측정한다|에이전트 서빙 벤치마크]] — 턴별 문맥 증가, 캐시 재사용, 동시성 포화점과 지연 목표
- [x] [[LLM-Generation-Mechanics-Context-and-Agent#대화 요약과 별도 기록의 경계|LLM 대화 요약과 작업 기록]] — 압축의 손실, 외부 상태 저장과 컨텍스트 재주입
- [x] [[Linear-Attention|선형 어텐션]] — 특징 맵, 정규화와 인과 누적 상태
- [x] [[Audio-Token-Generation|음악과 소리 생성]] — 신경망 오디오 코덱과 RVQ, 코드북 펼치기 순서, 조건 방식과 상용 서비스의 공개 범위
- [x] [[Claude-Code-Workflows#긴 작업의 완료와 중단 조건|에이전트의 완료와 중단 조건]] — 결과 증거, 작업 목록과 검증 한계
- [x] [[LLM-Generation-Mechanics-Analogies|비개발자 설명용 LLM 비유와 한계]] — 학습 때 정해지는 것과 요청마다 고르는 것, 네 가지 수량, 비유가 맞는 부분과 깨지는 지점
- [x] [[LLM-Generation-Mechanics-Context-and-Agent#프롬프트, RAG와 파인튜닝은 바꿀 대상으로 고른다|프롬프트, RAG와 파인튜닝 선택]] — 바꾸는 층, 지식과 행동 문제의 구분, 구조화 출력, 비용 비교와 파인튜닝 제공 범위
- [x] [[Agent-Runtime-Deployment|에이전트 런타임과 배포]] — Eve, Mecatl, Strands Harness SDK, OpenCode 2.0, Claude Managed Agents의 책임과 확인 수준
- [x] [[Agent-Reverse-Engineering|에이전트 역공학과 실행 하네스]] — REA, 매칭 디컴파일과 정적 재컴파일의 동등성 구분, 게임 상태 재현, 브라우저 이식, Xbox Labs 발표, Ruby 생태계 사례와 국내 저작권법의 프로그램코드역분석 요건
- [x] [[Agent-Code-Search#Jevgrep: 동작 질문과 원문 발췌|Jevgrep 코드 검색]] — 자연어 후보 탐색, 원문 확인과 동명 패키지 경계
- [x] [[Context-Development-Lifecycle|컨텍스트 개발 수명주기]] — 생성, 평가, 배포와 관찰
- [x] [[MCP-Gateway-Architecture|MCP 게이트웨이]] — Uber의 발견, 활성화와 실행 권한 분리
- [x] [[LLM-Decision-Models-Calibration-Cases|결정 모델 보정과 버전 변경]] — Qwen, Microsoft-Decision-1, Jev 1.14와 표현 안정성
- [x] [[Local-Inference-Deployment-Cases|로컬 추론 배포]] — Janas, Minions, Uzu, LFM2.5와 Muse Spark Open
- [x] [[Agent-Model-Capability-Contracts|기억과 전문 영역 모델 평가]] — Muse Wonder, GLM-Legal
- [x] [[AI-Research-Innovation-Evaluation|AI 연구 혁신 평가]] — InnovationEval의 과제와 개선 달성률
- [x] [[Neural-Circuit-Interpretability|뉴런과 회로 해석]] — 재귀적 일반화 가설과 인과 검증
- [x] [[Generative-Artifact-Contracts|시각 산출물 생성 계약]] — AesCode의 검증 가능한 코드와 Krea 3의 부분 편집
- [x] [[Bedrock-AgentCore-Runtime|Bedrock AgentCore Runtime 실행 계약]] — 컴퓨트 타입, 세션 수명과 새 버전 반영, 엔드포인트 고정과 롤백, 프로토콜 계약, 사용자 ID 헤더의 신뢰 경계, 스냅샷 기반 V2
- [x] [[Agent-Always-On-Mac-Host|상시 실행 Mac 에이전트 호스트]] — 전원 설정, FileVault와 무인 재시작의 절충, 원격 접속, 세션 유지와 재부팅, 플러그인 신뢰
- [x] [[JetBrains-IDE-Agent-Integration|JetBrains IDE의 코딩 에이전트 통합]] — Air in IDEs의 실행 화면과 세션 diff, 구독 인증 경로, 내장 MCP 서버와 로그포인트 디버깅
