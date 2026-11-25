---
tags: [ai, llm, operations, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM 선택, 서빙과 운영", "LLM Selection Serving and Operations"]
---

# LLM 선택, 서빙과 운영

모델을 고르고 호출하고 운영하는 계층 — 모델 티어와 라우팅, 결정 모델, 추론 병목, 프롬프트 캐싱, 게이트웨이, 실패 처리. 상위: [[llm|LLM 원리와 운영]].

## 목차

- [[VLLM-Serving-Security|vLLM 서빙 보안]]: API 키의 경로 범위, 내부 통신 격리, 동적 LoRA 관리 권한과 v0.32.0의 CORS 기본값 제한
- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅]]: 3단 티어 수렴, 벤더 내 100배 단가 격차와 출력/입력 단가 비, 재작업 비용과 effort, 호출 시각별 단가와 최신판을 따라가는 API 이름(DeepSeek Flash), 난이도 기반 라우팅, 에스컬레이션/폴백, 프런티어 단계적 출시, 계획과 실행의 모델 분담, 대량 분류를 하위 모델에 맡긴 개인 프로젝트 사례, 한 작업 안의 양방향 모델 전환, 긴 프롬프트 단가 구간
- [[LLM-Decision-Models|결정 모델 (decision-models/ 서브폴더)]]: System One, Jev와 Clef, 로컬 Laya와 MLX 포트, 과업별 미세조정 평가, state와 noul/choice/score 질문 스키마, 비자기회귀 채점과 입력 토큰 과금, confidence 문턱과 에스컬레이션, 보정 검증, 도구 기록 선별 압축, 닫힌 선택지와 프롬프트 인젝션, 언어 한계, Flide의 state 분기, 티켓 분류의 섀도 전환 사례, Gemini Decisions API의 계약 차이
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]]: 루프라인과 arithmetic intensity, 프리필 vs 디코드, memory-bound 디코드, 배칭/KV 캐시/speculative decoding/양자화의 서로 다른 비용, 로컬 추론 용량과 오프로딩, 세션 기반 벤치마크와 포화점, 가속기 스펙 읽기, CPU와 GPU 사례 수치의 구분, M1 ANE 역공학 사례, 파운데이션 모델 교재 진입점
- [[LLM-Inference-Serving-Engines|추론 서빙 엔진의 기능 경계]]: 엔진과 서비스 책임, DeepInfer 공개 범위, 배치 불변성과 결정적 샘플링, DSpark 가변 길이 검증과 고정 길이 초안, 프롬프트 n-gram 초안, 긴 문맥 재처리 범위, 구조화 출력 강제 경계, 공개 벤치마크 측정 조건, ggml 1.0의 API 정리와 판 정책, 워크스테이션 두 대의 텐서 병렬 사례
- [[LLM-Inference-Fleet-Efficiency|LLM 추론 플릿 효율]]: GPU당 토큰을 늘리는 낭비별 수단, 요청 상태 기반 라우팅(llm-d Router의 포화 필터와 접두사 점수), KV 캐시 계층 오프로딩(vLLM OffloadingConnector, LMCache, Mooncake)과 캐시 키, 다중 모델의 동적 KV 메모리 공유(kvcached), 추론과 학습의 혼합 스케줄링과 DCP 리샤딩, GPU 장애 격리와 재배포, 이종 가속기 풀, 동시 적용한 효과의 측정 한계
- [[LLM-Inference-Fleet-Cases|LLM 추론 플릿 운영 사례]]: 발표 수치를 읽는 기준, 삼성SDS 추론 서비스의 게이트웨이 입장 단계와 KV 캐시 4계층, 그래프 수치, GPU 이상 유형 17종과 XID, persistence mode, NPU 도입 경과와 NIXL 연결 계획, llm-d 3사 혼합 풀 실험의 부하 조건과 +91%가 나온 부하 지점, EPP의 CPU 상한
- [[Sovereign-AI-Platform|주권형 AI 플랫폼]]: 망분리가 통제하지 못하는 네 영역, 규제 요구의 세 질문과 조문 대조 상태, 가속기와 모델과 운영 환경의 독립성(vLLM 하드웨어 플러그인, llm-d, MOF, OpenMDW), GPU 사용 가시성, 에이전트 계층의 구축 순서, Red Hat AI 3 발표 범위
- [[AI-Infrastructure-Language-Layers|AI 서비스 스택의 언어 계층]]: 계층별 언어 선택 조건, 요청 경로의 꼬리 지연과 GC, data race의 컴파일 검사, PyO3와 C ABI 통합, pickle과 safetensors, Copilot 런타임의 점진 재작성, GPU 커널 계층
- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱]]: prefix matching, cache_write/read 과금, Anthropic과 OpenAI와 Gemini 캐싱 비교, TTL 히트 갱신, 활용 패턴 6, 안티패턴 6, 세션 분기와 seed 세션의 캐시 재사용 조건, 구독형 앱의 캐시 만료와 사용량 한도, 히트율 98% 사례, 에이전트 사례의 캐시 쓰기 비용 비중
- [[LLM-Gateway|LLM 게이트웨이]]: 관리 키와 업무 키, DB에 의존하는 예산 검사, 배포와 운영 검증, 호환 API의 기능과 대화 상태 보존, 게이트웨이 경로 캐시 계층의 키, 공유 범위와 정산
- [[LLM-Web-Search-Gateway|LLM 웹 검색 게이트웨이]]: 내장 검색의 통제, 재사용, 관측과 출력 계약 문제, 공급자 레지스트리와 대체 순서, 정확 일치와 의미 캐시, TTL, 검색 요금과 추론 비용의 분리, 최신성과 다단계 질문의 한계
- [[LLM-Failure-Handling|LLM 실패 처리 (failure-handling/ 서브폴더)]]: 기술적 실패와 의미적 실패, 지속성과 범위 분류, 429 속도 한도와 지출 한도 구분, stop_reason, 구조화 출력의 한계, 토큰 사전 계산, 스트리밍 복구, SDK 기본 재시도, 폴백 범위와 잠복 결함, 모델별 한도와 동시성, 도구 멱등 키
- [[LLM-API-Version-Migration|LLM API 버전과 SDK 마이그레이션]]: 날짜 기반 버전 고정의 보장 범위, 모델 단위와 버전 단위 제약, Claude API 2026-10-21의 요청과 응답 계약 변경, SDK 메이저와 기본 버전 헤더, 제거된 파라미터 검색, 요청 단위 분리와 재시도하지 않는 400

- [[Local-Inference-Deployment-Cases|로컬 추론의 배포 사례]]: Janas의 SSD 전문가 캐시, Minions의 작업 분산, MLX 분산 추론(JACCL, 파이프라인과 텐서 병렬, Muse Spark Open 2대와 4대 측정), Uzu의 Apple 기기 추론과 속도 비교 조건, PS5LM 콘솔 모델 서버, LFM2.5와 Muse Spark Open의 용량과 평가 경계, Edge0-145B의 RAM과 SSD 계층과 메모리 수치의 측정 조건, Harbor 보도의 확인 수준
- [[LLM-Weight-Quantization|LLM 가중치 양자화]]: 파일 기준 bpw와 삼진 가중치, 문맥 길이가 정하는 메모리, VRAM 구간별 입문 설정, 에이전트 기록으로 보정한 양자화(NariQ), 형식과 학습 결과의 구분(Ternary Bonsai 2.5), 같은 하네스의 원본 비교와 표준 오차, 포크와 런타임 빌드, 집 안 공유 서버의 노출 범위
- [[Local-AI-Hardware-Lifecycle|로컬 AI 장비의 수명]]: 소프트웨어 지원, 모델 크기와 비용의 세 기한, CUDA 13.0과 ROCm의 구형 GPU 지원 종료, 표기 용량과 쓸 수 있는 용량, 사용 연수로 나눈 가격, 구매와 임대와 API 비교, 호출당 요금과 교체 시점과 지연 같은 비용 밖의 이유
- [[Model-Release-Claims|모델 발표 수치 읽기]] — 측정 주체와 과업당 비용, 메모리와 라이선스, Carbon과 Mistral Large 4의 점수 및 제공 상태, 단가 인하 뒤의 과업당 비용 증가, 추론 강도별 토큰 차이, 모델마다 다른 하네스, 상대 백분율과 섞인 측정 주체(MAI Code 2), 직전 모델과만 비교한 자체 벤치마크(Qwen4-Max), 게시본마다 다른 비교 비율과 추론 강도(GPT-6.2), 공급사별 추론 강도 이름, 학습 데이터와 겹친 과제 제외와 단가 비율(MAI Cyber 2 Flash), 근소한 순위 차이, 경쟁 모델의 피크 단가 비교와 조회 표를 센 파라미터(Hy4 flash)

## 함께 볼 문서

- [[llm|LLM 원리와 운영]]
