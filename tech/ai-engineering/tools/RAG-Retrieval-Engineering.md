---
tags: [ai, rag, retrieval, search]
status: done
verified_at: 2026-10-18
category: "AI엔지니어링(AIEngineering)"
aliases: ["RAG Retrieval Engineering", "RAG 검색 엔지니어링", "RAG", "Hybrid Search", "Contextual Retrieval"]
---

# RAG 검색 엔지니어링 (RAG Retrieval Engineering)

RAG(Retrieval-Augmented Generation)의 품질은 검색 하나가 아니라 **retrieval → context 구성 → generation → 근거 검증**의 연쇄로 결정된다. 검색이 관련 근거를 놓치면 생성기가 복원하기 어렵고, 근거를 잘 찾았어도 context packing이나 생성 단계에서 잘못 사용할 수 있다. 따라서 장애를 한 점수로 뭉개지 않고 층별로 분해해 진단한다.

## 색인 준비와 질문 처리를 나눈다

사전 색인을 사용하는 벡터 RAG는 문서를 검색 가능한 형태로 준비하는 경로와 질문마다 실행하는 경로를 나눈다. 다음은 기본 흐름이며 모든 RAG가 벡터 저장소를 요구한다는 뜻은 아니다.

| 경로 | 기본 흐름 | 남기는 결과 |
|---|---|---|
| 색인 준비 | 문서 로딩, 청크 분할, 임베딩, 저장 | 청크 원문, 벡터와 원문을 찾을 메타데이터 |
| 질문 처리 | 질문 임베딩, 관련 청크 검색, 문맥과 질문 조립, 답변 생성 | 검색한 근거와 그 근거를 사용한 답변 |

색인을 재사용하면 질문마다 전체 문서를 다시 로딩하고 임베딩할 필요가 없다. 다만 문서나 임베딩, 분할 설정이 바뀌었을 때의 재처리는 별도로 관리한다. 벡터와 원문을 연결해야 검색한 숫자 표현을 실제 답변 근거로 되돌릴 수 있다. 모델과 전처리의 호환성은 [[Vector-Similarity-Search#임베딩 공간은 versioned contract다|임베딩 공간 계약]]을 따른다.

검색과 생성도 같은 책임이 아니다. 검색기는 질문에 맞는 문서를 반환하고 생성기는 그 문서를 문맥으로 받아 답변한다. 이미 SQL, 문서 저장소나 업무 API에 필요한 지식이 있다면 이를 조회해 문맥으로 전달할 수도 있다. 벡터 DB 도입부터 결정하지 않고 아래의 사전 색인과 요청 시점 조회 비교를 따른다.

2026-10-21 LangChain 공식 Retrieval 설명과 RAG 튜토리얼의 색인 단계를 대조했다. 재처리 경계는 이 구조를 적용한 운영 제안이며, 기존 제품별 설정과 평가 수치 전체를 다시 검증한 것은 아니므로 기존 `verified_at`은 유지한다.

### 비동기 수집의 접수와 검색 준비를 나눈다

문서 로딩과 청킹이 긴 작업이면 요청 API와 수집 worker를 큐로 분리할 수 있다. 업로드 접수, 파싱 완료, 임베딩 완료와 검색 가능 상태를 따로 기록하고, worker 재시도가 이미 처리한 문서를 중복 색인하지 않도록 설계한다. 이는 비동기 RAG 수집에 적용하는 설계 제안이다.

2026-10-22 AWS 공식 문서 기준 SQS Standard 큐는 메시지가 다시 전달될 수 있어 소비자의 멱등 처리가 필요하다. 이를 수집에 적용하면 문서 ID, 원본 버전과 처리 설정으로 재처리 대상을 식별하고, 같은 작업의 중복 실행과 새 버전의 처리를 구분할 수 있다(설계 제안). 큐 소비 성공만으로 검색 준비를 완료 처리하지 않고 실제 색인 가시성까지 확인한다. 이 문단은 SQS 전달 계약만 추가 대조했으므로 기존 `verified_at`은 유지한다.

## 품질을 분해하는 평가 모델

| 층 | 확인할 질문 | 대표 측정 |
|---|---|---|
| Retrieval | 필요한 근거를 후보에 넣었나 | Recall@k, nDCG@k, context relevance |
| Context 구성 | 관련 근거를 중복과 단절 없이 모델에 전달했나 | 근거 coverage, 중복률, token 사용량 |
| Generation | 질문에 정확하고 유용하게 답했나 | answer relevance/correctness, task success |
| Faithfulness | 답변의 claim이 제공한 근거로 지지되나 | claim-level support, citation correctness/completeness |
| End-to-end | 실제 사용자가 과업을 끝냈나 | 성공률, 오류/거부율, latency, 비용 |

RAGAS와 ARES 같은 연구도 retrieval context의 관련성, 답변 관련성, faithfulness를 서로 다른 차원으로 평가한다. LLM judge는 빠른 회귀 탐지 수단이지만 고위험 도메인에서는 표본 human review와 calibration을 함께 둔다.

## 검색 전에: 전체를 넣을 수 있는 규모인가

검색 대상 corpus가 작으면 검색 단계 없이 전체를 prompt에 넣는 선택지가 있다(자주 바뀌면 prefix 캐시 재사용이 줄어 비용 이점이 작아진다). Anthropic은 지식 베이스가 200,000 토큰(약 500쪽)보다 작으면 RAG 없이 전체를 넣을 수 있고 prompt caching이 이를 더 빠르고 싸게 만든다고 안내했다(2024-09 발표 기준). 이 수치는 발표 당시 모델 기준이므로 지금은 사용할 모델의 윈도와 토큰 환산([[LLM-Generation-Mechanics-Context-and-Agent|Context Window와 대화 누적]]), 비용으로 다시 판단한다. 다만 입력이 길어지면 정보 활용이 비균일해질 수 있으므로([[Context-Engineering#Context Rot|Context Rot]]) 같은 질문 세트로 전체 투입과 검색의 정확도, 지연과 비용을 비교한다. Corpus가 크거나 계속 늘면 검색이나 아래 Progressive Disclosure 탐색으로 필요한 부분만 넣는다. 전체를 넣을 때의 캐시 배치는 [[LLM-Prompt-Caching|프롬프트 캐싱]]을 따른다.

## 청킹 전략: 고정 길이의 한계

가장 단순한 청킹은 문서를 N 토큰 단위로 자르는 고정 길이 방식이다. 구현은 쉽지만 표, 이미지, 그래프처럼 한 청크를 넘어가는 구조를 끊어버린다. 표 상단 헤더와 하단 데이터가 다른 청크로 갈리면 둘 다 의미를 잃는다.

대안은 문서 구조 기반 청킹이다. 제목, 섹션, 본문의 위치를 인식해 의미 단위로 자른다. 어떤 방식이든 `document_id`, `chunk_id`, 원문 span, 문서 version을 보존해야 검색 결과에서 원문 근거까지 돌아갈 수 있다.

| 방식 | 기준 | 약점 |
|---|---|---|
| 고정 길이 | N 토큰마다 절단 | 표, 그래프, 논리 단위가 청크 경계에서 깨짐 |
| 구조 기반 | 제목, 섹션, 문단 경계 | 파서 구현 비용, 비정형 문서엔 전처리 필요 |
| 재귀 분할 | 빈 줄, 줄바꿈, 공백, 문자 순의 구분자로 자르되 조각이 크기 한도 안에 들 때까지 다음 구분자로 내려감 | 의미가 아니라 구분자와 길이로 판단, 단어 경계가 없는 언어는 구분자 조정 필요 |
| 의미 기반 | 인접 문장 묶음의 embedding 거리가 임계값을 넘는 지점 | 문장 수만큼 embedding 계산, 크기 상한이 기준이 아님, 문장 분리와 임계값 조정 필요 |
| 명제 단위 | 언어 모델이 원문을 사실 하나씩 담은 자기완결 문장으로 다시 쓰고 각각을 검색 단위로 삼음 | 색인할 때 생성 비용과 검색 단위 수 증가, 다시 쓴 문장이라 원문 span과 글자 그대로 대응하지 않음 |
| Late chunking | 긴 문맥 embedding 모델로 문서 전체를 먼저 인코딩한 뒤 청크 경계별 token embedding을 mean pooling | mean pooling 방식의 긴 문맥 모델과 token 단위 출력 필요, 문맥 한도를 넘는 문서는 겹치는 큰 구간으로 나눠 처리 |

2026-10-18 공식 문서 기준, LangChain은 `RecursiveCharacterTextSplitter`를 범용 텍스트의 권장 분할기로 안내한다. 기본 구분자는 `"\n\n"`, `"\n"`, `" "`, `""` 순이고 크기는 기본적으로 문자 수로 재며, 문단과 문장, 단어를 가능한 한 함께 두는 효과를 낸다. LlamaIndex `SemanticSplitterNodeParser`는 문장마다 앞뒤 `buffer_size`(기본 1)개 문장을 붙여 embedding하고, 이웃 묶음의 cosine 거리가 그 문서 안 거리 분포의 `breakpoint_percentile_threshold`(기본 95) 백분위를 넘는 곳을 경계로 삼는다. 임계값은 문서마다 상대적으로 정해지고 최대 크기 파라미터는 없다. 기본 문장 분리기는 NLTK `PunktSentenceTokenizer`(학습 없는 기본 설정, `.`, `?`, `!` 기준)이고 공식 문서도 영어 문장 위주로 동작한다고 안내한다. 다른 분리기는 `sentence_splitter`로 넘길 수 있다. 한국어 문서에는 문장 분리 결과와 청크 길이 분포를 embedding 모델 입력 한도와 함께 먼저 확인한다(적용 제안).

명제 단위 검색을 제안한 Dense X Retrieval(EMNLP 2024)은 GPT-4 출력으로 미세조정한 Flan-T5-large로 영어 Wikipedia를 명제로 나눴다. 명제는 약 2억 5,700만 개로 문단의 약 6배였고 전체 분할에 NVIDIA P100 GPU 약 500시간이 들었다. 다섯 개 open-domain QA 데이터셋에서 문단 대비 Recall@20 평균 향상은 비지도 dense retriever(SimCSE, Contriever) +10.1%p, 지도 retriever(DPR, GTR) +2.7%p였다. Late chunking은 mean pooling을 쓰는 긴 문맥 embedding 모델에 추가 학습 없이 적용할 수 있고, 경계는 고정 길이, 문장, 의미 기반 어느 방식에서든 가져온다. jina-embeddings-v2-small, jina-embeddings-v3, nomic-embed-text-v1과 BeIR 네 데이터셋(SciFact, NFCorpus, FiQA, TREC-COVID)의 nDCG@10 평균 상대 향상은 문장 경계 3.63%, 256토큰 고정 길이 3.46%, 의미 경계 2.70%였다. jina-embeddings-v2-small의 청크 크기 실험에서는 작은 청크에서 특히 나았지만 일부 독해 과제에서는 큰 청크로 먼저 자른 뒤 따로 인코딩하는 기존 방식이 더 나았고, 주변 문맥이 무관한 Needle, Passkey 과제에서는 도움이 되지 않았다.

적용할 때 명제는 원문과 글자 그대로 대응하지 않으므로 위의 원문 span 계약을 명제마다 유지하고 citation은 원문 span을 가리키게 한다(적용 제안). Late chunking은 문서 일부만 바뀌어도 같은 입력 구간의 청크 embedding을 모두 다시 계산해야 하고, 청크마다 LLM을 호출하지 않는 대신 맥락이 embedding에만 반영되므로 BM25까지 보강하는 아래 Contextual Retrieval과 같은 질문 세트로 비교한다(적용 제안). 문서마다 LLM이나 에이전트가 코드, 계약서, 표 같은 유형을 판별해 분할 방식을 고르는 구성은 1차 출처로 확인한 표준이 아닌 설계 선택지다. LlamaIndex는 Markdown, HTML, JSON과 코드 언어별 parser를 따로 제공한다. 유형 판별을 모델에 맡기면 판별 결과와 chunker version을 청크 메타데이터에 남겨 재처리와 회귀 비교가 가능하게 한다(설계 제안). 출처별 기본 단위는 [[Agentic-Context-Platform#출처별 의미 단위|출처별 의미 단위]]를, 섹션과 문단, 문장 계층으로 나누는 방식은 아래 계층적 RAG 절을 따른다.

PDF, 스캔본 같은 비정형 문서는 청킹 전에 OCR과 layout parsing으로 텍스트, 표, 읽기 순서를 복원한다. Chunk 크기와 overlap은 정답이 아니라 corpus별 변수다. 대표 질문에서 retrieval recall과 context token 비용을 함께 비교한다.

파서 선택도 검색 품질과 수집 비용을 바꾼다. 2026-10-09 Amazon Bedrock Knowledge Bases 문서 기준, 기본 파서는 텍스트만 출력한다. PDF 안의 표, 차트와 이미지가 답변 근거라면 Bedrock Data Automation이나 foundation model 파서를 검토한다. Data Automation은 페이지나 이미지 수, 모델 파서는 입력과 출력 토큰을 기준으로 과금한다. 둘 중 하나를 선택하면 같은 데이터 소스의 텍스트 전용 PDF에도 해당 파서와 비용이 적용된다. 같은 제품의 청킹 설정 단위, 표 맥락 반환, CSV 행 단위 수집, 문서 속성 파일, 관리형 지식 베이스의 파서 제약과 파서의 리전별 제공 범위는 [[LLM-Workflow-Patterns-Data-and-Operations#표, 문서 속성과 연결 경로는 수집 단계에서 정한다|수집 단계의 표와 문서 속성]]에서 다룬다.

다음은 파서 선택에 적용할 검증 방법이다. 대표 문서에서 읽기 순서, 표의 행과 열 대응, 단위와 각주가 추출 결과에 남는지 원본과 대조한다. 같은 질문으로 기본 파서와 고급 파서의 검색 성공률, 답변 근거와 수집 비용을 비교한다. 텍스트를 추출했다는 사실만으로 문맥 보존이나 답변 정확도가 보장되지는 않는다.

### 멀티모달 검색용 표현과 원본 근거를 구분한다

이미지를 설명한 텍스트를 임베딩해 검색하더라도, 답변 단계까지 그 설명만 전달할 필요는 없다. Amazon Nova 공식 RAG 지침은 이미지의 설명을 텍스트 임베딩에 사용하는 방식과 멀티모달 임베딩을 사용하는 방식을 구분하며, 어느 방식이든 검색 결과를 원래 모달리티의 문서 부분과 연결하도록 권고한다. 원본이 이미지라면 검색 뒤 원본 이미지를 모델에 전달하는 흐름이다(2026-10-09 확인).

이를 PDF에 적용할 때는 검색용 설명과 원본 페이지 또는 이미지 영역의 연결을 보존한다(설계 제안). 페이지 전체를 검색 단위로 삼으면 주변 맥락을 함께 전달하기 쉽지만, 한 페이지에 여러 주제가 있으면 개별 표나 이미지로 나누는 선택도 비교한다. 영역을 나눌 때는 제목, 캡션, 단위와 각주가 빠지지 않는지 확인한다. 원본 이미지를 전달해도 시각적 해석 오류는 남을 수 있으므로, 대표 질문의 수치와 근거 위치를 원본과 대조한다.

로컬 모델 사례로 EmbeddingGemma 2는 텍스트와 코드, 이미지, 오디오, 비디오를 같은 768차원 공간으로 표현한다. Google 모델 카드 기준 총 740M 파라미터이며 필요한 vision/audio encoder만 선택해 로드할 수 있다. 텍스트 검색에서는 질의와 문서용 prefix를 구분하고, MRL로 차원을 줄이면 잘라낸 벡터를 다시 정규화한다. 이는 검색 표현의 기능이며 답변 생성이나 정답 검증을 대신하지 않는다(2026-10-21 확인).

영상 검색은 모델의 모달리티 지원과 장면을 찾는 단위를 함께 본다. Google의 Sentence Transformers 안내는 기본 1 fps로 프레임을 추출하며 샘플링 설정을 바꿀 수 있다고 설명한다. 장면 검색에 적용할 때는 구간별 원본 시간 범위를 벡터와 연결하고, 짧은 사건이 샘플링에서 빠지는지 확인한다(설계 제안). 모델 카드의 MTEB Code 점수 68.76에서 78.68로의 변화는 해당 벤치마크의 9.92점 차이이며 임의의 한국어 문서, 장면 검색이나 양자화 배포의 동일한 향상을 뜻하지 않는다. 이번 검증은 이 모델 사례에 한정해 기존 `verified_at`은 유지한다.

EmbeddingGemma 2의 로컬 추론에서는 모델 선택과 수치 정밀도를 따로 확인한다. 2026-10-22 모델 카드는 `bfloat16` 또는 `float32`를 사용하고 `float16`은 피하도록 명시한다. activation 범위를 벗어나 NaN이나 품질 저하가 오류 없이 생길 수 있기 때문이다. 차원 축소도 같은 품질을 보장하지 않는다. 768차원에서 128차원으로 줄이면 벡터 값의 저장량은 1/6이지만 모델 가중치나 색인 메타데이터까지 포함한 전체 저장량이 1/6이 되는 것은 아니다(차원 수에 따른 계산). 질의와 문서는 같은 차원으로 맞추고 축소 뒤 L2 정규화하며, 한국어와 모달리티별 대표 질문으로 검색 품질을 다시 잰다(적용 제안). 이 문단만 추가 대조했으므로 기존 `verified_at`은 유지한다.

### 청크별 문서 맥락 보강 (Contextual Retrieval)

청크는 잘리는 순간 주어, 기간과 적용 범위 같은 문서 맥락을 잃을 수 있다. 회사 매출이 전 분기보다 3% 늘었다는 청크만으로는 어느 회사의 어느 분기인지 알 수 없다. 규칙과 예외가 다른 청크로 갈리면 예외 없는 규칙만 검색될 수도 있다(설명용 예시).

Contextual Retrieval은 문서 전체와 청크를 함께 LLM에 주어 그 청크를 문서 안에서 설명하는 짧은 맥락(보통 50~100 토큰)을 만들고, 이를 청크 앞에 붙인 뒤 embedding(Contextual Embeddings)과 BM25 색인(Contextual BM25)을 만든다. Anthropic의 2024-09 평가에서 상위 20개 청크 검색 실패율(1 - recall@20)은 5.7%에서 contextual embeddings로 3.7%(35% 감소), contextual BM25를 더해 2.9%(49% 감소), reranking까지 더해 1.9%(67% 감소)로 줄었다. 평가 corpus는 codebase, 소설, arXiv 논문과 과학 논문이었다. Anthropic은 문서 전체의 일반 요약을 청크에 붙이는 방식도 시험했지만 이득이 매우 제한적이었다고 보고했다. 수치는 해당 corpus, embedding 모델과 설정의 관찰이므로 적용할 corpus의 질문 세트로 다시 잰다.

비용은 색인할 때 청크마다 추가되는 LLM 호출에서 생기며, 문서를 prompt cache에 올려 같은 문서의 청크별 호출에서 재사용하면 줄일 수 있다([[LLM-Prompt-Caching|프롬프트 캐싱]]). 맥락은 문서 전체에서 생성되므로 문서가 바뀌면 그 문서에 속한 청크의 맥락, embedding과 BM25 색인을 다시 만든다. 맥락 생성 prompt와 모델도 [[Vector-Similarity-Search#임베딩 공간은 versioned contract다|임베딩 공간 계약]]의 전처리 version에 포함한다.

## 적용 범위 메타데이터와 충돌하는 문서

질문과 의미가 가까운 문서가 지금 이 질문에 적용되는 문서라는 보장은 없다. 폐기된 정책, 다른 제품의 정책, 예외를 뺀 조항도 높은 점수로 검색된다. 정책과 약관처럼 판정 근거가 되는 corpus에는 다음을 둔다(설계 제안).

- 문서마다 대상 제품이나 요금제, 시행일과 종료일, 승인 상태(초안, 승인, 폐기)와 version을 메타데이터로 둔다. 검색 필터로 질문의 제품과 기준 시점에 유효한 승인 문서만 남기고, 같은 값을 청크와 함께 모델 입력에 넣어 어느 문서가 적용되는지 보이게 한다. 과거 주문 문의처럼 기준 시점이 현재가 아니면 그 시점부터 정한다.
- 조건과 그 예외는 같은 청크에 두고, 구조상 떨어져 있으면 예외 조항을 청크 맥락이나 인접 span으로 함께 넣는다.
- 서로 충돌하는 문서가 함께 검색되면 모델이 고르게 두지 않는다. 시행일, 승인 상태, 상위 규정 같은 우선순위는 코드로 적용하고, 규칙으로 가릴 수 없으면 충돌 사실을 드러내 사람 검토로 보낸다. 같은 정책의 승인 version이 동시에 둘 이상 유효하면 색인 데이터 오류로 경보한다.

오래된 문서를 충실하게 요약한 답은 근거와는 맞아도 현재 사실과는 틀리므로, 이 층의 오류는 생성 단계의 faithfulness 검사로 잡히지 않는다([[LLM-Hallucination-Verification|환각 유형과 검증]]).

질문에서 날짜와 분류를 추출해 필터로 바꿀 때도 검증 경계를 둔다(설계 제안). 작성일과 시행일 중 어느 필드를 묻는지 구분하고, 약칭은 승인된 분류 ID로 정규화한다. 날짜 범위는 시간대와 저장 단위를 맞춘 뒤 시작 포함, 다음 구간 시작 제외로 표현할 수 있다. 해석이 불명확하거나 값이 허용 목록에 없으면 필터를 임의로 확정하지 않는다. 필터 적용 전후의 후보 수와 경계 날짜의 정답 문서를 비교해 잘못 추출한 조건이 근거를 제거하는지 확인한다.

2026-10-10 Amazon Bedrock `RetrievalFilter` 명세 기준, `equals`, `greaterThanOrEquals`, `lessThan`과 `andAll`을 조합해 이런 조건을 표현할 수 있다. 필터 객체는 union이라 객체 하나에는 멤버 하나만 지정하고, `andAll`은 최소 두 조건을 받는다. API가 조건을 실행한다는 사실은 추출한 조건의 정확성이나 사용자 권한을 보장하지 않는다. 인증된 접근 범위는 질문에서 추출한 필터와 별도로 서버에서 강제한다.

## 하이브리드 검색: 벡터 + BM25

벡터 검색은 의미 유사도와 표현 변형에 강하지만, 사용 모델과 데이터에 따라 주문번호 `A1234`, 모델명 `SM-G998N` 같은 정확 식별자를 안정적으로 구분하지 못할 수 있다.

BM25를 병행해 정확 token match를 보완하고 RRF나 score normalization으로 후보를 합친다. Hybrid가 항상 우월하다고 가정하지 말고 lexical, dense, hybrid를 같은 judgment로 비교한다. 상위 후보의 precision이 중요하면 query-document pair를 함께 보는 reranker를 별도 단계로 둔다.

| 검색 | 강점 | 약점 |
|---|---|---|
| 벡터(임베딩) | 의미, 패러프레이즈, 동의어 | 주문번호, 코드, 고유명사 리터럴 |
| BM25(키워드) | 정확 토큰 매칭 | 표현이 다르면 못 잡음 |

두 결과를 점수 융합(예: RRF)해 단일 랭킹으로 합친다. 검색 엔진 레벨의 BM25, kNN 메커니즘은 [[OpenSearch]] 참고.

## 쿼리 재구성과 재탐색

1차 검색이 부족하면 query를 분해하거나 표현을 바꿔 재탐색할 수 있다. 단 무제한 재시도는 latency와 비용을 키우고 처음 의도를 변형한다. 최대 횟수, 종료 조건, query rewrite 전후 결과와 선택 근거를 기록하고 대표 query set에서 단발 검색보다 실제로 나은지 검증한다.

### 단발 RAG와 에이전틱 RAG

단발 RAG는 정해진 검색을 한 번 실행하고 그 결과로 답한다. 에이전틱 RAG의 흔한 흐름에서는 에이전트가 과업에 맞는 도구를 고르고, 가져온 근거가 충분한지 평가해 부족하면 질의를 바꾸거나 다른 도구를 고른 뒤 생성한다. Agentic RAG 서베이(arXiv 2501.09136v4, 2026-04)는 정적이고 선형적인 파이프라인의 한계가 검색 시점, 질의 재구성과 근거 수집 완료를 동적으로 정하는 자율 제어의 동기가 된다고 보고, 에이전틱 RAG를 RAG 파이프라인에 자율 에이전트를 직접 넣어 동적 검색, 반복적 문맥 정제와 적응형 워크플로 조정을 가능하게 하는 방식으로 정의한다. 단일 에이전트 라우터의 선택지로는 표 데이터용 구조화 DB, 비정형 문서의 의미 검색, 실시간이나 넓은 맥락용 웹 검색과 추천 시스템을 들고, 단순 사실 조회나 범위가 명확한 질문에는 모듈형 RAG 파이프라인이 더 적은 부담으로 충분한 성능을 낸다고 본다. 매 턴 탐색 방향을 정하는 방식은 아래 Progressive Disclosure 탐색 절, 원장 조회와 문서 검색의 선택은 아래 구조화 조회와 검색의 라우팅 절을 따르고, 이 절은 충분성 판정과 종료를 다룬다.

| 방식 | 판정 위치와 동작 | 한계 |
|---|---|---|
| Self-RAG (arXiv 2310.11511v1) | 한 모델이 reflection token으로 생성 구간(실험에서는 문장)마다 검색 필요(Retrieve)를 판단하고, 문서 관련성(IsRel), 생성 문장의 근거 지지(IsSup)와 응답 유용성(IsUse)을 스스로 평가한다. Retrieve 확률에 임계값을 두어 검색 빈도를 조절한다 | 판정은 GPT-4 라벨을 증류한 critic 모델이 붙인 학습 데이터에서 배운 예측이다. 임계값을 높여 검색을 줄이면 정확도 손실이 PubHealth보다 PopQA에서 컸다 |
| CRAG (arXiv 2401.15884v3) | 별도 평가기(T5-large, 0.77B)가 문서마다 관련성 점수를 매겨, 상한을 넘는 문서가 있으면 정제해 쓰고 모두 하한 미만이면 버린 뒤 키워드로 재작성한 질의로 웹 검색하며, 그 사이면 둘을 함께 쓴다 | 평가와 교정을 한 번 하는 구조라 반복의 종료 조건은 다루지 않는다. 임계값은 데이터셋별로 경험적으로 정했고, 외부 평가기의 미세조정이 불가피하다는 점을 원 논문이 한계로 든다. 웹 검색은 편향되거나 신뢰하기 어려운 정보를 들일 수 있어 위키백과 같은 권위 있는 페이지를 우선한다 |

근거 판정도 틀릴 수 있다. CRAG의 문서 관련성 평가기는 PopQA에서 테스트에 쓰지 않은 표본으로 미세조정했고, PopQA 검색 결과의 판정 정확도가 84.3%로 프롬프트만 쓴 ChatGPT(GPT-3.5 Turbo의 기본, CoT, few-shot 58.0~64.7%)보다 높았다. 이 값은 미세조정과 같은 PopQA 분포에서 잰 것이며, 평가기를 옮겨 쓴 다른 데이터셋의 판정 정확도는 보고되지 않았다. 그래도 Correct와 Incorrect 두 동작만 두면 효과가 평가기 정확도에 쉽게 좌우돼 중간 동작(Ambiguous)을 더했다. Sufficient Context(arXiv 2411.06037v3)는 이런 관련성 점수와 충분성을 구분하고, 문맥의 정보로 그럴듯한 답을 낼 수 있으면 충분하다고 정의해 정답 없이 판정한다. 가장 나은 자동 판정(Gemini 1.5 Pro 1-shot)은 골드 라벨 115건에서 정확도 93%였지만, 최신 모델이 불충분한 문맥에서도 35~62% 정답을 내므로(FreshQA, Musique, HotpotQA 세 QA 데이터셋 분석의 요약 수치) 정확도를 높이는 개입을 충분성에만 의존하지 말라고 정리했다. 큰 모델은 문맥이 불충분할 때 거부 대신 오답을 내는 경우가 많았고, 이 판정기로 추가 검색과 답변 사이를 반복 판단하는 구성은 시험하지 않았다.

반복과 판정은 지연과 비용을 더한다. 서베이는 반복 검색과 다중 에이전트 협업이 지연과 자원 사용을 늘리고, 무제한 자율성이 과도한 도구 호출과 중복 추론 루프를 부를 수 있다며 계획 범위 제한, 도구 접근 정책과 명시적 정지 기준을 요구한다. 교정 단계를 더하면 생성 단계 시간도 늘어난다(평가기 연산의 포함 여부는 원문에 없다). CRAG(arXiv v3)의 PopQA 측정(검색과 데이터 처리를 뺀 생성 단계의 대략 추정)에서 인스턴스당 실행 시간은 RAG 0.363초, 한 번 판정하고 교정하는 CRAG 0.512초, Self-RAG 0.741초였다. RAG와 CRAG의 차이는 인스턴스당 약 0.15초다(원문 표의 두 값에서 계산). 생성 단계만의 차이라 교정에 쓰인 웹 검색과 페이지 처리 시간은 들어 있지 않으므로, 반복 검색의 비용은 대상 질문 세트에서 따로 잰다. Anthropic의 에이전트 설계 안내(2024-12)도 에이전트 시스템이 더 나은 과업 성능을 위해 지연과 비용을 치르는 경우가 많다고 보고, 작업은 대개 완료 시 끝나지만 통제를 위해 최대 반복 횟수 같은 정지 조건을 함께 두는 경우가 흔하다고 설명한다. 이 글의 에이전트 절이 명시적으로 권고한 것은 샌드박스 환경에서의 충분한 시험과 적절한 가드레일이다. 글 전체로는 가장 단순한 해법에서 시작해 필요할 때만 복잡도를 늘리라고 권하며, 많은 애플리케이션에서는 검색과 in-context 예시로 단일 LLM 호출을 최적화하는 것으로 대개 충분하다고 본다.

다음은 위 근거를 적용한 설계 제안이다. 충분성 판정 통과, 최대 검색과 도구 호출 수, 토큰과 시간 예산, 직전 단계 대비 새 근거 없음 중 먼저 닿은 조건으로 루프를 끝내고, 판정 통과 없이 예산으로 끝나면 근거 부족을 결과에 드러낸다([[LLM-Abstention]], [[Agent-Loop-Engineering#가드 — bare loop는 열린 청구서|루프 가드]]). 상한 값은 대표 질문 세트의 지연과 비용 예산에서 정한다. 평가는 위 단발 검색 비교에 더해 충분성 판정을 사람 라벨과 대조해 근거가 부족한데 멈춘 경우와 충분한데 더 찾은 경우를 따로 세고, 정답률과 faithfulness를 검색과 도구 호출 수, p95 지연, 요청당 비용과 함께 본다. 서베이도 최종 출력 지표만으로는 부족하다며 추론 효율과 도구 사용 양상 같은 과정 지표를 요구한다. 단계마다 질의, 도구, 가져온 근거 ID, 판정과 종료 사유를 남겨 실패를 검색 누락, 판정 오류와 생성 오류로 나눈다.

### 가설을 분해해 반대 근거를 찾는다

가설 검토에서는 주제와 비슷한 문서를 모으는 것에 더해, 가설이 성립하려면 필요한 전제를 나누고 각 전제를 반박할 자료를 검색할 수 있다. 예를 들어 신기능이 매출을 늘린다는 가설에서는 유료 전환 수요, 가격 수용성과 대체재 대비 경쟁력을 검토할 수 있다(설명용 예시). 반박 결과에는 전제, 반대 근거의 원문 구간과 그 근거로 도출한 해석을 연결한다.

문서 파싱, 반대 근거 검색과 반박 종합을 나누면 표나 그래프의 추출 오류와 추론 오류를 따로 추적하기 쉽다. 추가 근거가 필요하면 제한된 재검색을 수행한다. 이 흐름은 여러 에이전트로 구성할 수도 있지만 역할 분리만으로 정확성이 보장되지는 않는다.

설계 시에는 **반대 근거를 찾지 못함과 가설이 참임을 구분**한다. 검색 범위와 시점이 제한돼 있고 반박 자체도 잘못된 해석일 수 있다. 지지 근거와 반대 근거를 같은 기준으로 검토하고, 원문이 실제로 전제를 반박하는지 사람이 확인할 수 있게 한다. 반박의 개수나 문장의 강도를 품질 점수로 쓰지 않는다.

## Progressive Disclosure 탐색

전체 투입이 맞지 않는 규모라면 문서 전체를 한 번에 컨텍스트에 밀어넣지 않는다. 폴더 구조와 메타데이터만 먼저 컨텍스트로 주고, 에이전트가 tool-calling으로 매 턴 탐색 방향을 스스로 정한다. 코딩 에이전트가 디렉터리를 훑고 필요한 파일만 열어보는 패턴과 같다.

- 필요한 만큼씩만 로드 → 토큰 절약, 노이즈 감소
- 검색된 문서의 인접 문서를 자동 탐색해 끊긴 맥락을 보완
- 단발 검색이 아니라 다단계 탐색 세션으로 동작

[[Context-Engineering]]의 Select, Isolate 원칙이 검색 단계에 적용된 형태다. 탐색을 멈출 조건과 근거 충분성 판정의 한계는 위 단발 RAG와 에이전틱 RAG 절에서 다룬다.

## 계층적(Hierarchical) RAG

평면 청크 풀에서 top-k를 뽑는 방식은 문서 간 위계와 문서 내 구조를 잃을 수 있다. 문서 → 섹션 → 청크 또는 요약 → 상세 계층을 두면 상위 후보를 좁힌 뒤 하위 근거를 찾을 수 있다. 그러나 상위 단계가 틀리면 하위 근거 전체를 놓치고 추가 lookup 비용도 든다. 계층적 검색은 corpus 구조와 질문 유형이 이를 정당화할 때 flat retrieval과 recall, latency를 비교해 선택한다.

## 구조화 조회와 검색의 라우팅

주문 상태, 재고, 가격처럼 정답이 구조화 시스템에 있는 질문은 원장을 tool/API로 조회하고, 정책 설명이나 문서 근거는 retrieval로 찾는다. 엔티티 추출은 어느 조회를 호출할지 돕지만 추출 오류와 권한 검사를 함께 다뤄야 한다. 모든 비정형 지식을 구조화하겠다는 목표보다 질문 유형별 `lookup`, `retrieve`, `hybrid` 라우팅이 현실적이다. [[Production-Agent-Architecture-Knowledge#조회 우선순위|Production-Agent-Architecture]]의 조회 우선순위와 같은 결이다.

### 사전 색인과 요청 시점 조회를 함께 비교한다

문서 근거를 가져오는 경로도 미리 복제해 색인하는 방식과 요청 시점에 원천 시스템에서 조회하는 방식으로 나뉜다. 임베딩을 미리 만들지 않아도 도구로 근거를 가져올 수 있지만, 그 선택만으로 검색 품질이나 권한 통제가 보장되지는 않는다. 다음은 두 방식을 비교할 설계 기준이다.

| 경로 | 선택을 검토할 조건 | 확인할 비용과 실패 |
|---|---|---|
| 사전 색인 | 여러 문서에서 의미가 가까운 근거를 반복 검색 | 수집, 파싱과 색인 운영, 원문 변경과 권한 철회의 반영 지연 |
| 요청 시점 조회 | 최신 상태가 필요하고 원천 API나 파일 탐색으로 필요한 범위를 좁힐 수 있음 | 추가 탐색의 지연, API 한도와 장애, 도구 선택 실패 |
| 혼합 | 안정된 문서 근거와 자주 바뀌는 상태가 모두 필요 | 색인된 설명과 실시간 상태의 기준 시점 불일치 |

제품 사례로 Microsoft 365 Copilot의 synced connector는 외부 내용을 Microsoft Graph에 색인하고, federated connector는 MCP로 요청 시점에 가져오며 Graph에 색인하지 않는다(2026-10-09 문서 확인). 이는 저장과 조회 경로의 차이다. Graph에 색인하지 않는다는 사실을 모델 입력, 응답이나 로그까지 데이터가 전혀 전달되지 않는다는 보장으로 확대하지 않는다. 실제 처리와 보존 범위는 별도로 확인한다.

런타임 탐색은 미리 계산한 결과를 가져오는 것보다 느릴 수 있으므로, 자주 쓰는 근거는 먼저 제공하고 부족한 부분만 추가 탐색하는 혼합도 비교한다. 같은 질문 세트에서 정확도, 지연과 호출 수를 재고, 원천 조회가 실패했을 때 오래된 캐시를 현재 사실로 답하지 않는지 확인한다. 권한 검사는 어느 경로에서도 모델 밖에서 적용한다. 이 운영 점검은 특정 커넥터의 기본 보장이 아닌 설계 제안이다.

## 도메인 사전: 구축 vs 미택

용어 사전은 약어와 도메인 명칭의 vocabulary gap을 줄일 수 있지만, 잘못된 동의어는 precision을 해치고 tenant별 관리 비용을 만든다. Zero-result와 reformulation 로그에서 반복되는 gap부터 작은 사전으로 검증한다. 효과가 운영 비용보다 작으면 hybrid retrieval이나 query rewrite로 보완하되, 이 대안도 같은 평가 set으로 비교한다.

## Context packing과 근거 추적

Retriever의 top-k를 그대로 prompt에 붙이지 않는다. 중복 청크를 제거하고 끊긴 정의나 표는 인접 span을 보강하며 token budget 안에서 relevance와 source 다양성을 고려해 context를 배치한다. Retrieval score는 생성 근거의 진실 확률이 아니라 후보 선택 신호다.

근거 추적은 답변 형식이 아니라 데이터 계약이다. Retrieval부터 `source_id`, `document_id`, `chunk_id`, 원문 span과 version을 보존하고, 생성된 각 핵심 claim을 citation에 연결한다. XML이나 JSON 태그는 이 연결을 직렬화할 뿐 근거 지지를 보장하지 않는다. 후처리에서 citation이 실제 span을 가리키는지, 그 span이 claim을 지지하는지 검사하고, 지지 근거가 없으면 claim을 제거하거나 거부한다([[LLM-Abstention]]).

요청마다 모델이 실제로 받은 입력을 기록한다. 최종 packing된 청크의 ID, version, 순서와 잘림 여부가 남아 있어야 실패 사례를 검색 실패(필요한 근거가 입력에 없음)와 해석 실패(근거가 있는데 잘못 읽거나 근거에 없는 약속을 더함)로 나눌 수 있다. 검색 로그만 보면 packing에서 빠진 근거를 검색 성공으로 오인한다. 이 기록도 원문과 같은 접근 권한과 보존 기간을 따른다.

## 검색 권한과 데이터 수명

관련성이 높은 문서와 사용자가 읽을 수 있는 문서는 다르다. OWASP LLM08:2025는 접근 제어 오류와 멀티테넌트 검색의 교차 유출을 별도 위험으로 다룬다. 사용자와 tenant는 인증된 서버 맥락에서 정하고, 모델이 만든 식별자나 검색 필터를 권한 증거로 쓰지 않는다. 권한 필터를 ANN의 어느 단계에 두는지에 따라 결과 수와 recall도 달라진다([[Vector-Similarity-Search#메타데이터 필터와 ANN|메타데이터 필터와 ANN]]).

다음은 이 원칙을 검색 흐름에 적용한 설계 점검 항목이다.

- 벡터 검색뿐 아니라 BM25, 구조화 조회, 인접 문서 확장과 요약 조회에도 같은 객체 접근 권한을 적용한다. 허용되지 않은 본문을 모델에 먼저 넘긴 뒤 답변에서 숨기도록 지시하지 않는다.
- 원문 권한 변경과 삭제가 chunk, embedding, 파생 요약과 캐시에 어떻게 반영되는지 정한다. 갱신 지연 중에도 현재 권한을 확인하거나 해당 결과를 차단할 경로가 필요하다.
- 답변 캐시를 공유할 때는 질문 문자열만으로 재사용하지 않는다. 현재 사용자의 접근 범위가 결과의 원문 전체를 허용하는지 확인한다. 제목, snippet, citation과 로그도 노출 경로다.
- 출처가 있다는 사실은 내용의 진실성이나 실행 지시의 정당성을 보장하지 않는다. 검색 문서 안의 명령은 비신뢰 데이터로 취급하고 도구 실행 권한은 검색 결과와 분리한다([[LLM-Application-Security]]).

보안 검증에는 다른 tenant의 같은 질문, 권한 철회 직후 조회, 캐시 재사용, 인접 문서로의 우회 접근과 데이터 전송을 요구하는 삽입 지시를 포함한다. 품질 지표가 좋아져도 이 경계가 통과된 것은 아니다.

### 스트리밍 수집과 검색 가능한 시점을 구분한다

지속적으로 데이터를 수집해도 검색 결과가 즉시 최신이 되는 것은 아니다. OpenSearch는 색인한 변경을 refresh 뒤 검색에 노출한다. `refresh=wait_for`는 해당 색인 요청의 검색 가시성을 기다리는 옵션이며, 그 앞의 수집 대기나 임베딩 생성 시간을 없애지 않는다. 강제 refresh를 자주 호출하면 색인과 검색 성능에 부담을 줄 수 있다(2026-10-09 공식 Refresh Index API 문서 확인).

RAG에 적용할 때는 원본 변경부터 수집, 청킹과 임베딩, 색인, 실제 검색 노출까지의 지연을 나눠 측정한다(설계 제안). 대표 문서의 추가, 수정과 삭제가 검색 결과 및 답변 캐시에 반영되는지 확인하고, 재처리로 오래된 청크가 다시 노출되는 경우도 시험한다. 수집 성공 응답만으로 최신성을 판정하지 않으며, 허용 지연을 넘으면 원천 조회나 응답 보류로 전환할 기준을 둔다. 원본 version과 재처리 순서의 상세 계약은 [[OpenSearch-Indexing-Internals#운영 DB와의 동기화|색인 동기화 경계]]를 따른다.

## 배포 전 평가 루프

1. 고정 query set에 필요한 source와 passage judgment를 만든다.
2. Retrieval 설정별 Recall@k, nDCG@k와 latency를 비교한다.
3. 같은 retrieved context로 generator만 바꿔 answer correctness와 faithfulness를 분리한다.
4. Citation correctness/completeness와 unsupported claim 비율을 claim 단위로 확인한다.
5. Offline gate를 통과한 조합만 shadow 또는 A/B로 보내 task success, 거부율, p95/p99와 비용을 본다.

Corpus, embedding, chunker, reranker, prompt와 model version을 함께 기록해야 회귀 원인을 재현할 수 있다.

## 면접 포인트

Q. RAG 품질이 낮을 때 어디부터 보나?
- 실패한 query를 retrieval miss, context 구성 손실, generation 오류, unsupported claim으로 분류한다. Retrieval부터 확인하되 거기서 진단을 끝내지 않는다.

Q. 벡터 검색만으로 부족한 이유는?
- 주문번호, 모델명 같은 정확 식별자에 약하다. BM25를 병행해 의미는 벡터가, 식별자는 키워드가 맡게 하고 점수를 융합한다.

Q. RAG를 더 고도화한다면?
- 먼저 층별 평가와 provenance 계약을 세운다. 그다음 오류 유형에 따라 hybrid/rerank, 구조화 lookup, 계층 검색, citation validator를 선택한다.

Q. 도메인 사전은 무조건 만드는 게 좋은가?
- 아니다. 멀티테넌트에서 용어 다양성이 크면 관리 비용이 효과를 넘는다. 운영 복잡성 대비 효과로 판단하고 안 만드는 선택도 설계다.

Q. 청크가 문맥을 잃어 검색이 빗나가면?
- 구조 기반 청킹과 원문 provenance를 먼저 갖춘다. 그다음 청크별 문서 맥락을 앞에 붙여 embedding과 BM25를 함께 색인하는 방식을 같은 평가 세트로 비교한다. 비용은 청크당 LLM 호출이고, 문서가 바뀌면 맥락과 색인을 다시 만든다.

Q. 검색은 됐는데 폐기된 정책으로 답했다면?
- 모델이 받은 입력 기록에서 그 문서가 들어갔는지 먼저 본다. 들어갔다면 적용 범위 메타데이터와 필터의 문제이고 생성 단계 검사로는 잡히지 않는다. 시행일과 승인 상태로 거르고, 충돌이 남으면 코드의 우선순위 규칙이나 사람 검토로 보낸다.

## 관련 문서
- [[Context-Engineering|컨텍스트 엔지니어링 (Select, Isolate — 검색 단계 토큰 경제학)]]
- [[Production-Agent-Architecture-Knowledge|프로덕션 에이전트 아키텍처 (구조화 조회, Metric Registry, 조회 우선순위)]]
- [[OpenSearch|OpenSearch (BM25, kNN 벡터 검색 엔진 메커니즘)]]
- [[Vector-Similarity-Search|벡터 유사도 검색 (임베딩, HNSW, 거리)]]
- [[pgvector|pgvector (PostgreSQL 벡터 검색)]]
- [[LLM-Eval-Strategy|LLM 평가 전략 (검색 품질을 어떻게 측정하나)]]
- [[LLM-Hallucination-Verification|LLM 환각 유형과 검증 (사실성과 충실성, 인용의 존재와 적용과 지지 검사)]]
- [[Agentic-Context-Platform|에이전트 컨텍스트 플랫폼 (출처별 의미 단위, provenance 계약)]]

## 출처

- [AWS, Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html) — 2026-10-22 Standard 큐의 재전달과 멱등 처리 권고 확인. 문서 버전별 수집 상태 관리는 설계 제안
- [Google AI for Developers, EmbeddingGemma 2 model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2)
- [Google AI for Developers, Multimodal Embeddings with EmbeddingGemma 2](https://ai.google.dev/gemma/docs/embeddinggemma/multimodal-embeddinggemma-with-sentence-transformers)
- [LangChain Documentation, Retrieval](https://docs.langchain.com/oss/python/deepagents/retrieval)
- [LangChain Documentation, Retrieval Augmented Generation (RAG) with Deep Agents](https://docs.langchain.com/oss/python/deepagents/rag) — 색인의 Load, Split, Embed, Store와 요청 시점 검색 흐름
- [Amazon Bedrock API Reference, RetrievalFilter](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_RetrievalFilter.html) — 2026-10-10 비교 연산, union 구조와 `andAll` 조건 수를 대조했다. 날짜 해석과 분류 정규화, 후보 손실 점검은 설계 제안이다.
- [Amazon Nova User Guide, Using Amazon Nova for Multimodal RAG](https://docs.aws.amazon.com/nova/latest/userguide/rag-multimodal.html) — 2026-10-09 텍스트 설명과 멀티모달 임베딩의 선택, 원래 모달리티로 근거를 반환하는 권고를 대조했다. PDF 검색 단위와 원본 대조는 설계 제안이다.
- [OpenSearch Documentation, Refresh Index API](https://docs.opensearch.org/latest/api-reference/index-apis/refresh/) — 2026-10-09 색인과 검색 가시성, refresh 대기와 강제 refresh 비용을 대조했다. RAG 전 구간의 지연 측정과 재처리 시험은 설계 제안이다.
- [Amazon Bedrock User Guide, Parsing options for your data source](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-advanced-parsing.html) — 2026-10-09 파서별 추출 범위, 과금 단위와 데이터 소스 내 PDF 적용 범위를 대조했다. 원본 대조와 질문 세트 비교는 설계 제안이다.

2026-10-09에는 사전 색인과 요청 시점 조회의 구분을 Microsoft 문서에, 런타임 탐색의 지연과 혼합 전략을 Anthropic 글에 대조했다. 비교표와 실패 시 운영 점검은 이를 적용한 설계 제안이다. 기존 평가 논문 전체를 다시 검증한 기록은 아니다.

- [Microsoft Learn, Microsoft 365 Copilot connectors overview](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/overview-copilot-connector)
- [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

2026-10-02에는 검색 권한과 교차 유출 위험을 OWASP LLM08에 대조했다. 데이터 수명과 검증 항목은 그 원칙을 적용한 설계 제안이며 특정 검색 엔진의 기본 보장이 아니다. 기존 검색 기법과 평가 논문 전체를 다시 검증한 기록은 아니다. 2026-10-06에는 청크별 맥락 보강과 전체 투입 규모 안내를 Anthropic 발표에 대조했다. 맥락 재생성과 version 관리는 그 기법을 적용한 설계 제안이다. 같은 날 더한 적용 범위 메타데이터, 충돌 문서 처리, 조건과 예외의 청크 배치와 모델 입력 기록도 설계 제안이다. 2026-10-18에는 재귀 분할과 의미 기반 분할의 기본값과 동작을 LangChain 공식 문서, LlamaIndex 공식 문서(API 레퍼런스의 구현 코드 포함)와 NLTK Punkt 문서에, 명제 단위 분할과 late chunking의 정의, 실험 조건과 수치를 각 원 논문의 arXiv v3에 대조했으며, 명제의 원문 span 유지, late chunking의 재계산 범위, Contextual Retrieval과의 비교와 문서 유형별 분할 선택은 이를 적용한 설계 제안이고 문서 전체를 다시 대조한 기록은 아니다.

- [OWASP GenAI, LLM08:2025 Vector and Embedding Weaknesses](https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/)
- [Ragas: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/abs/2309.15217)
- [ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems — NAACL 2024](https://aclanthology.org/2024.naacl-long.20/)
- [Enabling Large Language Models to Generate Text with Citations — ALCE](https://arxiv.org/abs/2305.14627)
- [OpenSearch Documentation, Rerank processor](https://docs.opensearch.org/latest/search-plugins/search-pipelines/rerank-processor/)
- [AI ENGINEER NIGHT Q&A 총정리 — 채널톡 Tech](https://tech.channel.io/ko/articles/4052f1f4)
- [LLM 에이전트 실무 사례 (리트리벌 스킬, RankJ 근거 태깅) — 개발 컨퍼런스 (YouTube)](https://www.youtube.com/watch?v=wEVPnYOuAf8&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew)
- [Introducing Contextual Retrieval — Anthropic](https://www.anthropic.com/news/contextual-retrieval)
- [How LinqAlpha assesses investment theses using Devil’s Advocate on Amazon Bedrock — AWS, LinqAlpha](https://aws.amazon.com/blogs/machine-learning/how-linqalpha-assesses-investment-theses-using-devils-advocate-on-amazon-bedrock/) — 2026-10-07 전제 분해, 반대 근거 검색과 인용 연결 흐름을 대조했다. 검색 실패의 해석과 품질 점수 기준은 적용 시 설계 제안이다. 제품 성과 수치나 특정 모델의 우월성을 일반화하지 않는다.
- [LangChain Documentation, Splitting recursively](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)
- [LlamaIndex Documentation, Node Parser Modules](https://developers.llamaindex.ai/python/framework/module_guides/loading/node_parsers/modules)
- [LlamaIndex API Reference, Semantic splitter](https://developers.llamaindex.ai/python/framework-api-reference/node_parsers/semantic_splitter/)
- [NLTK Documentation, nltk.tokenize.punkt module](https://www.nltk.org/api/nltk.tokenize.punkt.html)
- [Dense X Retrieval: What Retrieval Granularity Should We Use? — arXiv](https://arxiv.org/html/2312.06648v3)
- [Late Chunking: Contextual Chunk Embeddings Using Long-Context Embedding Models — arXiv](https://arxiv.org/html/2409.04701v3)

2026-10-26에는 단발 RAG와 에이전틱 RAG의 차이, 근거 충분성 판정의 한계, 정지 조건과 지연을 Self-RAG(arXiv v1), CRAG(arXiv v3), Agentic RAG 서베이(arXiv v4), Sufficient Context(arXiv v3) 원문과 Anthropic 안내에 대조했다. 정지 조건의 조합, 상한 설정, 판정 오류 집계와 단계 기록은 이를 적용한 설계 제안이다. 이 절만 대조했으므로 기존 `verified_at`은 유지한다.

- [Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection — arXiv](https://arxiv.org/abs/2310.11511v1)
- [Corrective Retrieval Augmented Generation — arXiv](https://arxiv.org/html/2401.15884v3)
- [Agentic Retrieval-Augmented Generation: A Survey on Agentic RAG — arXiv](https://arxiv.org/html/2501.09136v4)
- [Sufficient Context: A New Lens on Retrieval Augmented Generation Systems — arXiv](https://arxiv.org/html/2411.06037v3)
- [Building effective agents — Anthropic](https://www.anthropic.com/engineering/building-effective-agents)
