---
tags: [ai, rag, aws, bedrock, retrieval]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["Bedrock Knowledge Base Retrieval", "Bedrock 지식 베이스 조회", "Bedrock Knowledge Bases 질의 설정"]
---

# Bedrock 지식 베이스 조회

Amazon Bedrock Knowledge Bases의 질의 시점 품질은 어떤 API를 부르는지, 요청한 검색 유형이 실제로 무엇으로 실행되는지, 후보를 몇 개 회수해 재순위로 몇 개를 남기는지, 생성 프롬프트에 무엇이 들어가는지로 갈린다. 수집 단계의 파서와 청킹은 [[LLM-Workflow-Patterns-Data-and-Operations#표, 문서 속성과 연결 경로는 수집 단계에서 정한다|수집 단계 설계]]에서, 제품과 무관한 검색 기법은 [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]에서 다룬다. 아래 제품 동작은 2026-10-26 AWS 사용자 가이드와 API 참조를 대조한 기준이며, 실제 계정에서 호출해 확인한 결과는 아니다.

## 조회 API의 계약

| API | 대상 지식 베이스 | 하는 일 |
|---|---|---|
| `Retrieve` | 고객 관리형, 관리형 | 질의와 가장 관련된 청크나 이미지를 배열로 반환 |
| `RetrieveAndGenerate`, `RetrieveAndGenerateStream` | 고객 관리형 | 검색 결과로 답변을 생성하고 근거 청크의 citation을 붙임 |
| `GenerateQuery` | 구조화 데이터 저장소에 연결한 지식 베이스 | 자연어 질의를 저장소에 맞는 질의로 변환 |
| `AgenticRetrieveStream` | 관리형 | 하위 질의로 나눠 반복 검색하고 결과의 충분성을 판정 |

`RetrieveAndGenerate`는 `GenerateQuery`(구조화 저장소에 연결한 경우), `Retrieve`와 `InvokeModel`을 내부에서 묶어 RAG 전체를 수행한다. API 참조는 `RetrieveAndGenerate`와 `RetrieveAndGenerateStream`을 관리형 지식 베이스에 쓸 수 없으며 `AgenticRetrieveStream`이나 `Retrieve`를 쓰라고 명시한다. 멀티모달 지원도 제한적이다. Nova Multimodal Embeddings를 쓰면 RAG 기능은 텍스트 콘텐츠로 한정된다. `Retrieve`가 돌려준 이미지는 생성 프롬프트에 들어가지만 응답에 이미지를 담을 수는 없고 이미지가 든 출처는 인용할 수 있다. 다른 사용자 가이드 페이지는 멀티모달 임베딩 모델과 S3 콘텐츠 버킷을 쓰는 지식 베이스에서 `RetrieveAndGenerate`를 지원하지 않는다고 적어 AWS 페이지끼리 어긋나므로, 그런 구성은 실제 계정에서 먼저 시험한다(2026-10-26 기준). 검색과 생성을 나눠 프롬프트와 모델 호출을 직접 다루려면 `Retrieve`를 쓴다. 결과마다 `content`(텍스트 또는 이미지), `metadata`, `location`과 `score`가 오며, 공식 설명은 `score`를 결과 순위를 분석하는 관련도 점수로 안내한다([[OpenSearch-Vector-Search-Embedding-Operations#검색 벡터와 생성 모델의 입력을 구분한다|검색 벡터와 생성 입력의 구분]]). 구조화 저장소의 SQL 생성과 실행 경계는 [[LLM-Workflow-Patterns-Text-to-SQL#생성, 검증과 실행의 경계|Text-to-SQL]]을 따른다.

`RetrieveAndGenerate` 응답은 `output`에 답변을, `citations`에 인용 배열을 담는다. 인용마다 `generatedResponsePart`(인용 대상 답변 텍스트와 시작, 끝 위치의 `span`)와 `retrievedReferences`(근거 청크 내용, 문서 메타데이터와 위치)가 짝을 이룬다. 스트리밍 응답의 citation 이벤트에서는 `citation` 멤버가 deprecated이므로 `generatedResponsePart`와 `retrievedReferences`를 읽는다. 인용이 붙었다는 사실만으로 그 청크가 문장을 지지한다고 보지 않고 [[RAG-Retrieval-Engineering#Context packing과 근거 추적|근거 추적]]의 검사를 적용한다.

- `modelArn`에는 기반 모델이나 추론 프로필의 ARN을 넣는다.
- `sessionId`는 첫 요청에서 서비스가 만들고 같은 대화의 다음 요청에 재사용하며, 호출자가 직접 정할 수 없다. 스트리밍 응답에서는 본문이 아니라 `x-amzn-bedrock-knowledge-base-session-id` 헤더로 온다. 애플리케이션이 이전 메시지를 다시 넣는 Converse와 대화 상태의 위치가 다르다([[Bedrock-Model-Inference#대화와 권한|Converse의 대화 상태]]).

## 검색 유형은 요청과 실제 실행을 구분한다

고객 관리형 지식 베이스는 `vectorSearchConfiguration.overrideSearchType`으로 검색 유형을 지정한다. 값을 주지 않으면 Bedrock이 벡터 저장소 구성에 맞는 전략을 정하고, `HYBRID`는 벡터 임베딩과 원문 텍스트를 함께, `SEMANTIC`은 벡터 임베딩만 조회한다.

| 벡터 저장소 | 하이브리드 조건 |
|---|---|
| OpenSearch Serverless | 청크 원문을 담는 텍스트 필드를 filterable로 매핑 |
| Aurora(RDS) | 청크 열에 `to_tsvector('simple', chunks)` GIN 인덱스(필수). 영어 콘텐츠는 정확도와 지연을 위해 `'english'` 사전을 검토하라고 안내 |
| MongoDB Atlas | 필터 가능한 텍스트 필드와 Atlas Search 텍스트 인덱스(`textIndexName`, API 참조가 하이브리드에 필요하다고 명시) |
| OpenSearch Managed Clusters | 출처가 엇갈린다. 사용자 가이드 목록에는 없고 2025-04-10 AWS 발표는 하이브리드가 동작하던 저장소로 든다 |
| 그 밖의 저장소([[S3-Vectors|S3 Vectors]], Pinecone 등) | 사용자 가이드 기준 하이브리드 대상이 아니며 시맨틱 검색으로 실행 |

표는 사용자 가이드의 하이브리드 지원 목록, 저장소 준비 문서와 API 참조를 합친 것이며 출처마다 범위가 다르다. 사용자 가이드는 필터 가능한 텍스트 필드가 있는 RDS, OpenSearch Serverless와 MongoDB를 들고, API 참조의 `overrideSearchType` 설명은 OpenSearch Serverless만 하이브리드 대상으로 적고 나머지는 `SEMANTIC`만 가능하다고 적는다. 2025-04-10 AWS 발표는 하이브리드가 그전까지 OpenSearch Serverless와 OpenSearch Managed Clusters에서만 동작했다고 밝히며 Aurora PostgreSQL(취리히와 GovCloud를 뺀 지식 베이스 제공 리전)과 MongoDB Atlas(us-west-2, us-east-1)를 더했다. 이후 리전 범위가 바뀌었는지와 서울의 현재 제공 여부는 확인하지 못했다. 그래서 Aurora, MongoDB Atlas나 OpenSearch Managed Clusters에서 하이브리드를 쓸 계획이면 실제 저장소에서 키워드 분기가 결과를 바꾸는지 시험한다. 조건에 맞지 않으면 시맨틱으로 실행된다고 안내하므로 `HYBRID`를 지정한 사실만으로 키워드 검색이 수행됐다고 보지 않는다(설계 점검).

키워드 분기의 언어 처리도 따로 본다. 확인한 저장소 준비 문서는 Aurora의 `simple`과 영어용 `english` 사전만 안내하고 한국어용 사전이나 분석기 설정은 다루지 않는다. 한국어 질의 세트로 `SEMANTIC`과 `HYBRID`의 검색 성공률을 비교한다. OpenSearch Serverless 컬렉션에는 Nori 분석 plugin이 기본 포함되므로 직접 만든 벡터 인덱스의 텍스트 필드를 Nori 분석기로 매핑하는 방안도 시험 후보지만, 지식 베이스가 그 매핑을 받아들이는지와 `HYBRID`의 키워드 분기가 그 분석기를 쓰는지는 확인하지 못했다. 형태소 분석이 필요하면 지식 베이스의 하이브리드와 [[OpenSearch-Korean-Text-Analysis#Nori의 역할과 경계|Nori 같은 한국어 분석기]]를 둔 검색 경로를 직접 구성하는 방안을 견준다(설계 제안). 직접 구성한 하이브리드는 지식 베이스의 `overrideSearchType` 기능이 아니며 점수 결합과 평가 설계는 [[OpenSearch-Hybrid-Search|OpenSearch 하이브리드 검색]]을 따른다.

관리형 지식 베이스는 `vectorSearchConfiguration` 대신 `managedSearchConfiguration`을 쓴다. 사용자 가이드는 관리형의 검색이 항상 키워드와 시맨틱을 결합한 하이브리드이고 시맨틱 전용 검색은 없다고 명시한다. 메타데이터 필터의 `startsWith`와 `stringContains`는 쓸 수 없고, 범위 연산자에 ISO-8601 오프셋 형식의 날짜 시간 문자열을 줄 수 있는 것은 관리형뿐이다.

## 후보 수와 재순위

`numberOfResults`는 회수할 청크의 최대 수다(1~100, 지정하지 않으면 최대 5개). 계층형 청킹에서는 자식 청크 수를 뜻하며, 같은 부모를 공유하는 자식은 부모 하나로 바뀌어 요청보다 적게 반환될 수 있다. 표와 그림의 넓은 맥락을 공유하는 청크도 결과 하나로 합쳐진다([[LLM-Workflow-Patterns-Data-and-Operations#검색한 청크와 반환한 문맥의 크기를 구분한다|검색한 청크와 반환한 문맥]]).

재순위는 `rerankingConfiguration`(`type`은 `BEDROCK_RERANKING_MODEL`)으로 켜며, 재순위 결과가 Knowledge Bases의 기본 순위를 대신한다. 다음은 하이브리드로 30개를 회수해 5개로 줄이는 고객 관리형 설정의 예시이고 수치는 설명용이다.

```json
"retrievalConfiguration": {
  "vectorSearchConfiguration": {
    "numberOfResults": 30,
    "overrideSearchType": "HYBRID",
    "rerankingConfiguration": {
      "type": "BEDROCK_RERANKING_MODEL",
      "bedrockRerankingConfiguration": {
        "numberOfRerankedResults": 5,
        "modelConfiguration": { "modelArn": "<재순위 모델 ARN>" }
      }
    }
  }
}
```

| 항목 | 계약 |
|---|---|
| `numberOfRerankedResults` | 1~100. `numberOfResults`보다 크게 줘도 최종 결과는 `numberOfResults`까지이고, 질의 분해를 쓰면 `numberOfResults`의 최대 5배 |
| `metadataConfiguration` | `selectionMode`가 `ALL`이면 모든 메타데이터를 재순위에 반영한다. `SELECTIVE`면 `selectiveModeConfiguration`에 `fieldsToInclude`(지정 필드만 사용)와 `fieldsToExclude`(지정 필드 제외) 중 하나만 준다 |
| 입력과 과금 | 텍스트 데이터만 재순위한다. 재순위 모델 호출 1회(최대 100개 청크)가 과금 단위인 query이며 CloudWatch `SearchUnits`가 처리한 query 수를 나타낸다 |
| 권한 | `Retrieve` 흐름은 사용자에게 `bedrock:Retrieve`, 지식 베이스 서비스 역할에 `bedrock:Rerank`와 `bedrock:InvokeModel`. `RetrieveAndGenerate` 흐름은 사용자 역할에 `bedrock:RetrieveAndGenerate`, `bedrock:Rerank`, `bedrock:InvokeModel`(재순위와 생성 모델). Cohere Rerank 같은 서드파티 모델은 `aws-marketplace:ViewSubscriptions`, `aws-marketplace:Subscribe`도 필요 |
| 모델과 리전 | Amazon Rerank 1.0(`amazon.rerank-v1:0`)은 ap-northeast-1, ca-central-1, eu-central-1, us-west-2. Cohere Rerank 3.5(`cohere.rerank-v3-5:0`)는 여기에 us-east-1을 더한 다섯 리전이다. 단일 리전 지원 표에 서울(ap-northeast-2)은 두 모델 모두 없다 |

재순위는 회수한 후보 안에서 순서를 바꾸므로 최종 수보다 넉넉한 후보를 회수하고, 재순위 유무를 같은 질문 세트의 정답 포함률과 지연, `SearchUnits`로 비교한다([[OpenSearch-Reranking-Neural-Sparse|retrieve-then-rerank]], 설계 제안). 서울 리전 지식 베이스라면 재순위를 설정할 수 있는지 실제 계정에서 먼저 확인하고, 지원 리전의 `Rerank` API를 따로 호출하는 방식(데이터 위치 요건 확인)과 [[OpenSearch-Reranking-Neural-Sparse#한국어 주의점|자체 한국어 reranker]] 호스팅을 비교한다.

관리형 지식 베이스는 `managedSearchConfiguration.rerankingModelType`으로 `MANAGED`(서비스 관리 모델, 사용자 가이드의 조회 설정 기본값), `CUSTOM`(Bedrock 재순위 모델 ARN 지정), `NONE`(끔)을 고른다. 관리형 재순위는 관리형 임베딩을 쓰는 지식 베이스에서만 쓸 수 있고, 사용자 지정 임베딩이면 `CUSTOM`이나 `NONE`을 쓴다. AWS GovCloud(US-West)는 서비스 관리 임베딩, 재순위와 에이전틱 검색 모델을 제공하지 않아 재순위가 필요하면 질의 때 재순위 모델을 직접 지정해야 하는데, 재순위 모델 지원 표에 us-gov-west-1이 없으므로 지정할 모델의 제공 여부를 먼저 확인한다. 표에 없는 다른 관리형 리전에서 `CUSTOM`을 쓸 때도 같다.

## 질의 분해와 에이전틱 검색

`RetrieveAndGenerate`의 `orchestrationConfiguration.queryTransformationConfiguration.type`을 `QUERY_DECOMPOSITION`으로 두면 복잡한 질문을 하위 질의로 나눠 지식 베이스를 여러 번 검색할 수 있다. 공식 예시는 두 팀의 득점을 비교하는 질문을 팀별 득점을 묻는 하위 질의 둘로 나눈다. 재순위를 함께 설정하면 `numberOfRerankedResults`를 `numberOfResults`의 최대 5배까지 받을 수 있다(위 표). 검색 횟수와 반환 결과가 늘 수 있으므로 단발 검색과 정답률, 지연, 비용을 같은 질문 세트로 비교한다(설계 제안).

`AgenticRetrieveStream`은 관리형 지식 베이스 전용이다. 기반 모델이 질의를 하위 질의로 나누는 계획을 세우고, 검색 결과가 원 질문에 충분한지 판정해 부족하면 설정한 최대 반복(`maxAgentIteration`)까지 다시 검색한다.

- 한 요청에 retriever를 최대 5개 지정할 수 있다. 여러 하위 질의가 같은 청크를 찾으면 최종 결과에는 한 번만 남는다.
- trace 이벤트의 단계(`step`)는 계획, 검색, 사전 검색(speculative retrieval), 전체 문서 확장과 세션 기록 복원(session history load)이다. 계획 단계의 `actions`(하위 질의와 대상)와 검색 단계의 `warnings`, `failures`를 기록해 실패를 검색 누락과 판정 오류로 나눈다. 확인한 trace 속성에는 종료 사유 필드가 없으므로, 충분성 판정으로 멈췄는지 최대 반복에 닿았는지는 결과 이벤트의 필드와 단계 기록을 함께 보고 판단한다(설계 제안).
- `memoryConfiguration`으로 AgentCore Memory를 붙이면 `sessionBinding`은 이전 세션을 복원해 이어 가고(필요 권한에 `bedrock-agentcore:CreateEvent`가 있어 이번 대화도 그 세션에 기록될 수 있으며 기록 범위는 확인이 필요하다) `retrievalConfigs`는 장기 메모리를 하위 질의의 검색 대상으로 더한다. 넘긴 세션과 namespace가 이어 갈 대화와 맞는지는 서비스가 검증하지 않는다.
- `generateResponse`는 기본 `true`라 결과 이벤트에 답변(`answer`)과 선택 항목인 `citations`(답변 구간과 `results` 배열의 위치를 잇는다)가 담기고, `false`면 검색 결과만 받는다. 반복 횟수를 줄이면 복잡한 질문에서 일찍 멈춰 정확도가 떨어질 수 있다고 안내한다.
- `userContext`는 사용자가 접근할 수 있는 문서로 결과를 거르는 접근 제어에 쓰인다. 원천 권한과 일치하는지는 권한이 다른 사용자로 시험한다(설계 점검).
- 가드레일은 `foundationModelType`이 `CUSTOM`일 때만 붙일 수 있고 `BLOCK` 동작만 지원한다.
- 호출 주체에는 `bedrock:AgenticRetrieveStream`, 지식 베이스에 대한 `bedrock:Retrieve`와 `bedrock:GetDocumentContent`, `bedrock:InvokeModelWithResponseStream`이 필요하다. 가드레일이나 AgentCore Memory를 쓰면 해당 권한을 더한다.

관리형 지식 베이스의 제공 리전에 서울(ap-northeast-2)은 없고(아시아 태평양은 도쿄, 싱가포르, 시드니), GovCloud(US-West)에서는 에이전틱 검색을 쓸 수 없다. 데이터와 색인을 서울에 둬야 하면 고객 관리형의 질의 분해를 비교 대상으로 두고, 재순위는 위 재순위 절의 확인과 대안(데이터 위치 요건을 확인한 지원 리전의 `Rerank` API 호출, 자체 한국어 reranker)을 거쳐 더한다(설계 제안). 충분성 판정의 한계와 정지 조건은 [[RAG-Retrieval-Engineering#단발 RAG와 에이전틱 RAG|단발 RAG와 에이전틱 RAG]]를 따른다.

## 프롬프트 템플릿과 citation

`RetrieveAndGenerate`는 두 템플릿을 쓴다. 오케스트레이션 프롬프트(`orchestrationConfiguration.promptTemplate`)는 사용자 입력을 검색 질의로 바꾸고, 생성 프롬프트(`generationConfiguration.promptTemplate`)는 지시, 검색 결과와 질의를 합쳐 모델에 보낸다.

| 자리표시자 | 채워지는 값 | 필수 여부 |
|---|---|---|
| `$query$` | 사용자 질의 | 모델마다 다름 |
| `$search_results$` | 검색 결과(생성 템플릿) | 필수 |
| `$output_format_instructions$` | 응답 형식과 citation 지시(모델마다 다름) | 필수. 없으면 응답에 citation이 없다 |
| `$current_time$` | 현재 시각 | 선택 |

자체 형식 지시를 정의하면 `$output_format_instructions$`를 빼라고 권하지만 빼면 citation도 사라지므로, 인용을 화면에 보여야 하는 서비스는 두 요구를 함께 시험한다. 사용자 정의 템플릿이 없으면 무관한 주제의 예시 문답을 담은 기본 시스템 프롬프트가 쓰이며 이 프롬프트는 모델 호출 로그에 보인다. AWS는 그 예시가 다른 고객의 데이터가 아니라 Bedrock이 제공하는 정적 템플릿이라고 밝힌다. 기본 프롬프트는 `textPromptTemplate`으로 바꾼다.

생성 중 프롬프트가 문자 한도를 넘는다는 오류가 나면 검색 결과 최대 수를 줄이거나, 더 작은 청크를 쓰는 청킹 전략으로 데이터 소스를 다시 만들거나, 템플릿이나 사용자 질의를 줄인다. 앞의 둘은 `$search_results$`에, 질의 축소는 `$query$`에 들어가는 양을 줄인다. 기본 청킹은 문장 경계를 지키며 약 300토큰 단위로 나눈다. 청크를 줄이는 방법은 데이터 소스를 다시 만드는 작업이므로 템플릿과 결과 수 조정보다 먼저 고르지 않는다(설계 제안).

## 가드레일이 보지 않는 입력

`generationConfiguration.guardrailConfiguration`으로 가드레일을 붙이면 `RetrieveAndGenerate` 응답의 `guardrailAction`(`INTERVENED`, `NONE`)으로, 스트리밍에서는 `guardrail` 이벤트의 `action`으로 개입 여부를 알 수 있다. 그러나 가드레일은 입력과 모델이 생성한 응답에만 적용되고 런타임에 검색한 참조 청크에는 적용되지 않는다. 문서에 심은 간접 프롬프트 인젝션과 민감 정보는 수집 단계나 검색 뒤의 별도 검사로 다룬다([[LLM-Application-Security#관리형 가드레일의 검사 범위 — Amazon Bedrock Guardrails 사례|관리형 가드레일의 검사 범위]], 설계 제안).

## LangChain에서 호출하기

`langchain_aws.retrievers`의 `AmazonKnowledgeBasesRetriever`는 Retrieve API로 결과를 가져온다. `retrieval_config`에 고객 관리형은 `vectorSearchConfiguration`, 관리형은 `managedSearchConfiguration`을 넣는다. 2026-10-26 LangChain 문서 기준 관리형 검색과 에이전틱 검색은 `langchain-aws>=1.6.3`(함께 설치되는 `boto3>=1.43.32`)이 필요하고, `agentic_retrieve` 도우미는 관리형 지식 베이스에서만 동작한다. 문서의 IAM 예시는 특정 지식 베이스 ARN에 대한 `bedrock:Retrieve`와 `bedrock:AgenticRetrieveStream`만 담지만, AWS 문서는 에이전틱 검색 호출 주체에 위 권한 목록(`bedrock:GetDocumentContent`, `bedrock:InvokeModelWithResponseStream` 포함)을 요구하므로 그 목록을 따른다.

```python
from langchain_aws.retrievers import AmazonKnowledgeBasesRetriever

retriever = AmazonKnowledgeBasesRetriever(
    knowledge_base_id="<지식 베이스 ID>",
    retrieval_config={"vectorSearchConfiguration": {"numberOfResults": 4}},
)
docs = retriever.invoke("환불 기한은?")
```

## 사례

**사례 (AWS Korea 공개 발표, 2024-09-13 공개):** 콘솔 테스트 창에서 하이브리드와 시맨틱 검색 유형, 최대 검색 문서 수와 지식 베이스 프롬프트를 바꿔 답변을 조정하고, AWS SDK와 LangChain 리트리버에 지식 베이스 ID를 넣어 조회하는 흐름을 소개했다. 이어진 고급 RAG 데모는 지식 베이스 기능이 아니라 직접 구성한 파이프라인으로 보인다(발표한 아키텍처에서 추론). 문서를 텍스트, 이미지와 표로 파싱해 이미지와 표는 멀티모달 모델의 요약으로 색인하고, 큰 청크와 작은 청크의 계층(parent document), 모델이 만든 가상 답변과 질의를 함께 임베딩해 검색하는 HyDE, OpenSearch Serverless의 Nori 키워드 검색과 시맨틱 검색을 순위 융합한 하이브리드, SageMaker에서 서빙한 한국어 reranker로 상위 5개를 골라 생성 모델에 넘겼다. 기법을 더할수록 답변이 나아졌다는 판단은 정답 기준이나 측정 없이 화면의 답변을 비교한 정성적 시연이었다. 당시 언급한 생성 모델 목록(2024년 기준)을 현재 지원 목록으로 쓰지 않는다.

## 운영 체크포인트

- [ ] 저장소가 하이브리드 조건(filterable 텍스트 필드, GIN 인덱스, MongoDB Atlas Search 텍스트 인덱스)을 갖췄고 `HYBRID`와 `SEMANTIC`의 차이를 한국어 질의 세트로 확인했는가
- [ ] 요청한 `numberOfResults`와 실제 반환 수를 기록하고, 재순위 전 순위는 재순위를 끈 별도 요청으로 받아 비교하는가
- [ ] 재순위 모델의 리전 지원, 흐름별 권한과 `SearchUnits` 비용을 확인했는가
- [ ] 사용자 정의 템플릿에 `$search_results$`와 citation용 `$output_format_instructions$`가 남아 있는가
- [ ] 검색 청크의 간접 인젝션과 민감 정보를 가드레일과 별도로 검사하는가
- [ ] 관리형과 고객 관리형의 API 차이(`managedSearchConfiguration`, `RetrieveAndGenerate` 미지원)와 제공 리전을 반영했는가

## 출처

- [Amazon Bedrock User Guide, Retrieving information from data sources using Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-how-retrieval.html)
- [Amazon Bedrock User Guide, Query a knowledge base and retrieve data](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-retrieve.html)
- [Amazon Bedrock User Guide, Query a knowledge base and generate responses based off the retrieved data](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-retrieve-generate.html)
- [Amazon Bedrock User Guide, Configure and customize queries and response generation](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html)
- [Amazon Bedrock User Guide, Configure and customize queries for managed knowledge bases](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-managed-test-config.html)
- [Amazon Bedrock User Guide, Prerequisites for using a vector store you created for a knowledge base](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html)
- [Amazon OpenSearch Service Developer Guide, Supported operations and plugins in Amazon OpenSearch Serverless](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-genref.html)
- [Amazon Bedrock User Guide, How content chunking works for knowledge bases](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking.html)
- [Amazon Bedrock User Guide, Improve the relevance of query responses with a reranker model](https://docs.aws.amazon.com/bedrock/latest/userguide/rerank.html)
- [Amazon Bedrock User Guide, Supported Regions and models for reranking](https://docs.aws.amazon.com/bedrock/latest/userguide/rerank-supported.html)
- [Amazon Bedrock User Guide, Pricing and search units](https://docs.aws.amazon.com/bedrock/latest/userguide/rerank-pricing.html)
- [Amazon Bedrock User Guide, Permissions for reranking](https://docs.aws.amazon.com/bedrock/latest/userguide/rerank-prereq.html)
- [Amazon Bedrock User Guide, Use agentic retrieval to query a knowledge base](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-agentic-retrieve.html)
- [Amazon Bedrock User Guide, Supported AWS Regions (managed knowledge bases)](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-managed-regions.html)
- [Amazon Bedrock API Reference, RetrieveAndGenerate](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html)
- [Amazon Bedrock API Reference, RetrieveAndGenerateStream](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerateStream.html)
- [Amazon Bedrock API Reference, CitationEvent](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_CitationEvent.html)
- [Amazon Bedrock API Reference, KnowledgeBaseVectorSearchConfiguration](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_KnowledgeBaseVectorSearchConfiguration.html)
- [Amazon Bedrock API Reference, MongoDbAtlasConfiguration](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_MongoDbAtlasConfiguration.html)
- [Amazon Bedrock API Reference, ManagedSearchConfiguration](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_ManagedSearchConfiguration.html)
- [Amazon Bedrock API Reference, VectorSearchRerankingConfiguration](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_VectorSearchRerankingConfiguration.html)
- [Amazon Bedrock API Reference, VectorSearchBedrockRerankingConfiguration](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_VectorSearchBedrockRerankingConfiguration.html)
- [Amazon Bedrock API Reference, MetadataConfigurationForReranking](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_MetadataConfigurationForReranking.html)
- [Amazon Bedrock API Reference, RerankingMetadataSelectiveModeConfiguration](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RerankingMetadataSelectiveModeConfiguration.html)
- [Amazon Bedrock API Reference, QueryTransformationConfiguration](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_QueryTransformationConfiguration.html)
- [Amazon Bedrock API Reference, AgenticRetrieveStream](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_AgenticRetrieveStream.html)
- [Amazon Bedrock API Reference, AgenticRetrieveConfiguration](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_AgenticRetrieveConfiguration.html)
- [Amazon Bedrock API Reference, AgenticRetrieveTraceEventAttributes](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_AgenticRetrieveTraceEventAttributes.html)
- [LangChain Documentation, Bedrock (knowledge bases) integration](https://docs.langchain.com/oss/python/integrations/retrievers/bedrock)
- [Amazon Bedrock Knowledge Bases now supports hybrid search for Aurora PostgreSQL and MongoDB Atlas vector stores — AWS What's New](https://aws.amazon.com/about-aws/whats-new/2025/04/amazon-bedrock-knowledge-bases-hybrid-search-aurora-postgresql-mongo-db-atlas-vector-stores) — 2025-04-10 게시. 하이브리드 지원 저장소와 리전의 당시 범위만 반영했다.
- [RAG를 사용하여 생성형 AI 애플리케이션의 응답 품질 높이기 — AWS Korea](https://www.youtube.com/watch?v=Epy9LJiy1Po) — 2024-09-13 공개. 사례 절의 데모 구성만 음성 전사에서 확인했다.

## 관련 문서

- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]] — 질의 재구성, HyDE와 RAG-Fusion, 에이전틱 RAG의 정지 조건
- [[LLM-Workflow-Patterns-Data-and-Operations|LLM 워크플로우 패턴: 데이터와 운영]] — 수집 단계의 파서, 청킹과 문서 속성
- [[LLM-Workflow-Patterns-Text-to-SQL|Text-to-SQL과 데이터 디스커버리]] — `GenerateQuery`와 구조화 지식 베이스
- [[OpenSearch-Vector-Search-Embedding-Operations|OpenSearch 벡터 검색 운영]] — 검색 결과와 생성 입력의 구분
- [[OpenSearch-Reranking-Neural-Sparse|OpenSearch Reranking]] — retrieve-then-rerank와 한국어 reranker
- [[OpenSearch-Korean-Text-Analysis|OpenSearch 한국어 텍스트 분석]] — Nori 분석기와 사전
- [[Bedrock-Private-Access|Bedrock 비공개 연결과 권한 경계]] — 지식 베이스 서비스 역할과 생성 오류
- [[Bedrock-Model-Inference|Bedrock 모델 호출]] — Invoke와 Converse 계약
- [[LLM-Application-Security|LLM 애플리케이션 보안]] — 간접 프롬프트 인젝션과 관리형 가드레일의 범위
