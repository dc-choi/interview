---
tags: [ai, llm, hallucination, operations]
status: done
verified_at: 2026-10-20
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Workflow Patterns Data and Operations", "데이터 vs 모델", "환각 통제와 운영"]
---

# LLM 워크플로우 패턴: 데이터와 모델, 환각 통제와 운영

도메인 서비스에서 데이터와 모델 중 무엇을 먼저 개선할지, 수집 단계의 표, 문서 속성과 연결 경로 설계, 환각을 통제하는 두 갈래, 빠른 피드백 루프와 시작 전략, 배포 완료와 업무 개선의 구분, 사내 지원 어시스턴트의 운영 설계와 사람 검토 분기를 다룬다. 상위: [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]].

## 데이터와 모델 중 무엇이 더 중요한가

- **도메인 특화 서비스 → 데이터가 더 중요**: 사내 용어, 테이블 의미, 업무 규칙은 범용 LLM이 알 수 없다
- **일반 지식, 범용 작업 → 모델 성능 영향이 큼**

실무 개발자가 당장 개선하기 쉬운 쪽은 보통 **데이터**다. 모델 자체 고도화는 어렵지만, 좋은 문서, 정확한 메타데이터, 정제된 로그, 명확한 평가셋은 직접 만들 수 있다.

## 표, 문서 속성과 연결 경로는 수집 단계에서 정한다

고정 길이로 자르면 긴 표의 헤더와 아래쪽 행이 서로 다른 청크로 나뉘고, 문서 첫머리에만 있는 제목, 작성 기관과 개정일은 뒤쪽 청크에 들어가지 않는다. 청크 겹침은 경계 근처만 보완한다([[RAG-Retrieval-Engineering#청킹 전략: 고정 길이의 한계|청킹 전략]]). 그래서 수집 단계에서 긴 표의 행마다 헤더를 반복할지, 필터에 쓸 날짜와 분류를 형식이 있는 메타데이터로 둘지, 출처마다 청킹 단위를 어떻게 고정할지를 먼저 정하고 행 속성, 문서 속성(제목, 작성 기관, 개정일)과 날짜 범위를 묻는 질문으로 결과를 평가한다. 다음은 2026-10-20 Amazon Bedrock Knowledge Bases 공식 문서 기준 고객 관리형 지식 베이스의 관련 동작이다. 관리형 지식 베이스(Amazon Bedrock Managed Knowledge Base)의 파서와 청킹은 마지막 항목에서, 조회 설정은 문서 속성 항목에서 따로 본다.

- **청킹 설정 단위**: 청킹 전략은 데이터 소스마다 정하며 데이터 소스를 연결한 뒤에는 바꿀 수 없다. 청킹 없음(`NONE`)은 문서 하나를 청크 하나로 다루므로 파일을 미리 나눠 넣는다. 이때 PDF 인용의 페이지 번호와 페이지 번호 메타데이터(`x-amz-bedrock-kb-document-page-number`, PDF를 OpenSearch Serverless나 Aurora 벡터 저장소에 넣을 때 생성) 필터는 쓸 수 없다. 미리 나눈 파일 하나가 그대로 임베딩 입력이 되므로 임베딩 모델의 입력 한도(Titan Text Embeddings V2는 8,192 토큰 또는 50,000자)도 확인한다(적용 제안).
- **표 맥락 반환**: 마크다운으로 처리한 문서(`.md` 파일, Data Automation 파서나 모델 파서의 결과, HTML 변환)의 페이지에 표나 그림이 있으면, 그 페이지의 청크에 페이지 전체나 표 전체를 맥락으로 붙여 두고 검색 때 일치한 청크 대신 그 맥락을 돌려줄 수 있다. 기본, 고정 크기, 시맨틱과 계층형처럼 최대 토큰을 정하는 청킹 전략에 적용되고 청킹 없음에는 적용되지 않는다. 페이지나 표가 10,000자 이하일 때만 붙고, 같은 맥락을 공유하는 청크는 결과 하나로 합쳐져 `numberOfResults`보다 적게 반환될 수 있다. S3 벡터 버킷을 벡터 저장소로 쓰면 이 맥락이 벡터별 메타데이터 크기 한도에 포함되므로, 인덱스를 만들 때 `AMAZON_BEDROCK_TEXT`와 `AMAZON_BEDROCK_METADATA`를 필터에 쓰지 않는 메타데이터 키로 지정하라고 안내한다. 표를 청크 단위 결과로 받으려면 청킹 없음을 고르고 사용자 정의 변환 Lambda에서 직접 나누도록 안내한다.
- **CSV 행 단위 수집**: `<파일명>.csv.metadata.json`에 행 기반 구조(`RECORD_BASED_STRUCTURE_METADATA`)를 지정하면 CSV를 한 행씩 읽어 내용 열 하나를 청킹하고 임베딩하며, 포함과 제외 목록에 따라 나머지 열을 그 청크의 메타데이터로 둔다. 이 CSV 기반 메타데이터 구성에서는 숫자 값도 문자열로 저장되며, 전체 데이터 형식과 `includeForEmbedding`은 아래 `.metadata.json` 방식에서 쓴다.
- **문서 속성**: S3 데이터 소스에서는 원본 파일명 뒤에 `.metadata.json`을 붙인 메타데이터 파일(10 KB 이하)을 같은 위치에 둔다. `includeForEmbedding: true`로 둔 속성은 키와 값을 청크 앞에 붙여 임베딩하지만 반환하는 청크 텍스트에는 넣지 않는다. 범위 비교 연산(`greaterThan`, `lessThan` 등)은 숫자 속성에만 쓸 수 있다. 질문과 메타데이터 스키마로 모델이 필터를 만들어 적용하는 암묵적 메타데이터 필터링(`implicitFilterConfiguration`)은 Anthropic Claude 모델을 지원하며, Retrieve 요청의 `vectorSearchConfiguration`에 지정하는데 이 필드는 고객 관리형 지식 베이스 전용이다. 관리형 지식 베이스가 쓰는 `managedSearchConfiguration`에는 API 참조 기준 `filter`, `numberOfResults`와 재순위 필드만 있고 `implicitFilterConfiguration`을 지정할 필드는 없다.
- **임베딩 언어와 리전**: Titan Text Embeddings V2는 영어에 최적화돼 있고 100개 이상 언어 지원을 preview로 표기한다. 한국어 지식 베이스에 독일어로 묻는 것처럼 문서와 질문의 언어가 다르면 결과가 최적이 아니라고 안내한다. 지식 베이스 임베딩 모델 표에서 서울(ap-northeast-2)을 단일 리전 지원으로 표시한 모델은 Titan Text Embeddings V2뿐이므로, 서울에서 다국어 임베딩 모델을 비교하려면 리전 지원부터 확인한다(적용 제안).
- **커넥터와 관리형 지식 베이스**: 2026-09-30부터 고객 관리형 지식 베이스에는 Confluence, Microsoft SharePoint, Salesforce, Web Crawler 커넥터를 새로 만들 수 없고 기존 커넥터는 수집과 검색을 포함해 계속 동작한다. AWS는 이 커넥터가 필요한 애플리케이션에 관리형 지식 베이스를 권장한다. 관리형은 기본으로 서비스 관리 파서(`SMART_PARSING`)를 쓰고, 네이티브 멀티모달 임베딩 모델을 쓰면 텍스트 파싱 없이 `MULTI_MODAL_EMBEDDINGS`만 지원한다. 모델 파서, Data Automation 파서와 시맨틱 청킹은 지원하지 않는다. 텍스트로 파싱할 때 청킹은 기본, 고정 크기, 청킹 없음 중에서 고르며, 네이티브 멀티모달 임베딩 모델에는 이 청킹 전략이 적용되지 않는다. 관리형 수집 설정 문서에는 계층형 청킹과 사용자 정의 변환 Lambda가 없다. 지원 리전은 us-east-1, us-west-2, eu-west-1, eu-west-2, eu-central-1, ap-northeast-1, ap-southeast-2, us-gov-west-1이고 서울(ap-northeast-2)은 없다. 관리형 S3 데이터 소스는 지식 베이스와 같은 리전의 범용 버킷을 요구하고, 관리형 저장소는 임베딩, 텍스트, 메타데이터와 원본 파일을 서비스가 관리한다.
- **파서와 추론의 리전**: Data Automation 파서는 미국 서부(오레곤)에서 preview로 제공된다. 지식 베이스는 파싱과 응답 생성에 추론 프로필을 쓸 수 있고, 교차 리전 추론을 쓰면 데이터가 다른 리전과 공유될 수 있다고 안내한다.

**사례 (AWS Industry Week 2024 발표, 2025-01-16 공개):** 임상시험 소프트웨어와 CRO 서비스를 함께 제공하는 기업이 SOP, 업무 지침(WI), 식약처와 FDA 가이드라인과 사내 문서를 Bedrock 지식 베이스 기반 AI 어시스턴트로 검색하면서, 긴 표는 행마다 헤더를 반복한 청크로 미리 나눠 고정 길이 청킹과 다른 데이터 소스에 올렸다. 저장 공간이 늘어나는 손실은 검색 성능을 위해 감수했다고 설명했다. 작성일, 작성자와 문서 분류는 모든 청크에 반복하는 대신 메타데이터로 두었다. 경량 모델로 질문에서 날짜, 작성자와 분류를 추출하고, 날짜는 숫자 타임스탬프로 바꿔 숫자 비교 필터로 넘기며, 작성자는 동의어 DB(식품의약품안전처, 식약처, MFDS)를, 분류는 카테고리 DB를 먼저 조회해 얻은 키로 거르는 흐름을 소개했다. 발표가 지식 베이스의 기본 연동으로 든 웹 크롤링과 Confluence 데이터 소스는 2026-09-30부터 고객 관리형 지식 베이스에서 새로 만들 수 없다.

설계 제안: 표가 10,000자를 넘거나 행 단위 결과가 필요하면 행마다 헤더와 문서 제목을 반복한 청크를 만들어 일반 문서와 다른 데이터 소스에 둘 수 있다. 청킹 전략은 연결한 뒤 바꿀 수 없으므로 그 데이터 소스는 처음부터 청킹 없음으로 두어 미리 나눈 파일 하나가 청크 하나가 되게 하거나, 청킹 없음과 사용자 정의 변환 Lambda로 행 단위 청크를 만든다. 헤더 반복 청크는 저장량과 임베딩 호출을 늘리므로 그 비용 대비 효과는 행 속성을 묻는 질문으로 재고, 언어 차이의 영향은 문서와 다른 언어로 묻는 질문으로 따로 잰다. 표 맥락 반환은 따로 켜는 전략이 아니라 마크다운으로 처리한 문서에 최대 토큰 청킹을 쓰면 붙는 동작이므로, 기본 파서와 기본 청킹, 마크다운 처리와 기본 청킹, CSV 행 단위 수집, 청킹 없음으로 넣은 헤더 반복 청크의 검색 성공률과 파서 비용을 포함한 비용을 비교한다. `.md` 파일은 기본 파서로도 마크다운 처리에 해당하므로 기본 파서 비교안은 PDF 원본으로 한정하고, HTML 원본은 기본 파서에서 표 맥락이 붙는지 문서로 확인되지 않아 샘플로 먼저 확인한다. 파서 유형도 연결 뒤 바꿀 수 없으므로 비교안마다 데이터 소스를 따로 둔다. 사용자 가이드는 모델 파서나 Data Automation 파서를 고르면 지식 베이스를 만들 때 멀티모달 데이터 저장 위치를 지정하라고 하고 생성 뒤에는 추가할 수 없다고 하므로, 기존 지식 베이스에 그 위치가 없으면 새 지식 베이스에서 비교한다.

설계 제안(계속): 날짜 범위로 거를 개정일은 CSV 행 단위 수집으로 넣지 않고 행별 파일이나 일반 문서의 `.metadata.json`에 `NUMBER` 형식(예: 20241101)으로 둔다. 문서 속성을 임베딩에 넣으면 유사도는 보강되지만 적용 범위는 필터로 좁히고, 청크마다 문서 맥락을 생성해 붙이는 [[RAG-Retrieval-Engineering#청크별 문서 맥락 보강 (Contextual Retrieval)|청크별 문서 맥락 보강]]과 같은 질문 세트로 비교한다. 모델이 만든 필터에도 [[RAG-Retrieval-Engineering#적용 범위 메타데이터와 충돌하는 문서|필터 추출의 검증 경계]]를 적용한다.

설계 제안(계속): 데이터와 색인을 서울 리전에 두어야 하면 고객 관리형 지식 베이스에 S3나 사용자 정의 데이터 소스로 수집한다. 위의 관리형 리전과 저장소 조건상 관리형 지식 베이스는 원본 파일까지 서울 밖에 두게 되므로 데이터 위치 요건이 다른 리전 보관을 허용할 때만 검토한다. 파싱과 응답 생성을 교차 리전 추론 프로필로 호출하지 않아도 되는지, 즉 그 모델을 서울 단일 리전에서 호출할 수 있는지도 확인한다.

## 검색, 기준 대조와 보고서 초안은 따로 평가한다

업무 문서 어시스턴트의 시험 문제를 검색, 여러 기준의 대조, 보고서 초안 작성으로 나누면 같은 정답률 안에 숨은 실패를 찾기 쉽다. 다음은 품질 문서 검색과 검토에 적용할 설계 제안이다. 규제 적합성이나 실사 통과를 보증하는 기준은 아니다.

| 과업 | 평가할 결과 | 별도로 남길 실패 |
|---|---|---|
| 문서와 변경 이력 검색 | 필요한 문서, 개정판과 원문 위치를 찾았는가 | 누락된 문서, 다른 개정판, 수집되지 않은 기록 |
| 내부 기준과 외부 기준 대조 | 적용 범위가 맞는 기준을 연결하고 충돌을 드러냈는가 | 무관한 기준 연결, 예외 누락, 근거 없는 위반 판정 |
| 보고서 초안 작성 | 필요한 항목과 수치가 원자료로 추적되는가 | 항목 누락, 잘못된 집계, 근거 없이 채운 문장 |

2026-10-22 Amazon Bedrock 평가 문서는 검색 결과만 평가하는 `Retrieve only`와 검색 결과 및 생성 답변을 평가하는 `Retrieve and generate`를 구분한다. 위의 업무별 분류는 이 서비스의 기본 평가 유형이 아니라 추가로 설계할 평가 축이다. 검색 평가를 통과해도 기준 대조나 보고서 작성이 검증된 것은 아니며, 업무 전문가의 검토와 미수집 자료의 확인을 함께 둔다.

## 현장 표현 추출과 분류 결과를 분리한다

의성어, 약어와 현장 고유 표현이 있는 클레임은 원문 표현을 추출하는 단계와 업무 분류에 대응시키는 단계를 구분해 설계할 수 있다. 예를 들어 가상의 문장 `회전할 때 덜컹거린다`에서 `덜컹`이라는 표현과 발생 조건을 보존한 뒤 소음 등의 분류 후보를 붙인다. 표현을 일반적인 단어로 덮어쓰면 나중에 오분류 원인을 원문과 대조하기 어렵다.

다음은 적용 제안이다. 프롬프트에는 분류의 정의, 경계 사례와 입력을 함께 제공하고, 결과에는 원문 위치, 추출 표현, 분류 후보와 검토 상태를 나눈다. 한 문장에 여러 증상이 있거나 분류 밖 표현이 있으면 이를 단일 정답에 억지로 넣지 않는 출력 계약을 정한다. 분류별 누락과 오분류를 따로 측정하고 같은 입력에서 규칙 기반 방식과 비교한다. Amazon Bedrock의 프롬프트 지침은 작업 지시, 도메인 맥락, 예시와 입력 텍스트를 구성 요소로 설명하지만, 특정 한국어 표현의 정확도나 이 설계의 우월성을 보장하지 않는다(2026-10-22 확인).

**사례 (AWS Industry Week 2024, 2025-01-15 공개):** 제조 분야 발표에서는 요구사항 분석용 모델의 미세조정과 클레임의 한국어 의성어 및 키워드 분류를 서로 다른 활용 사례로 소개했다. 이를 하나의 모델이나 같은 평가 과제로 합치지 않는다. 발표의 정확도와 공수 절감 수치는 다른 데이터에도 재현되는 성능 기준으로 사용하지 않는다.

## 오래된 기록의 디지털화와 해석을 분리한다

수기 기록과 영상 아카이브를 AI로 검색하려면 디지털 파일 확보, 내용 추출, 용어 해석과 검색 가능 상태를 따로 관리한다. 스캔이 끝났다는 사실만으로 필기 인식이나 전문 용어의 해석까지 검증된 것은 아니다. Amazon이 공개한 연구 아카이브 프로젝트도 수기 기록의 구조화와 검색 가능한 형태로의 전환을 목표로 설명하며, 기존 개념 검증을 기반으로 단계적으로 진행한다고 명시한다(2026-10-22 확인).

다음은 이 구분을 적용한 설계 제안이다. 원본 이미지나 영상, 추출한 텍스트, 번역 또는 정규화한 표현을 별도로 보존하고 서로의 위치를 연결한다. 전문가는 애매한 용어와 번역을 원문에 되돌아가 교정할 수 있어야 하며, 교정한 내용이 색인에 반영됐는지도 확인한다. 원본에 없는 의미를 추정한 부분은 관측 기록과 구분한다. 자료 유형과 언어별 표본에서 추출, 해석과 검색을 각각 점검한 뒤 수집 범위를 넓힌다.

## 환각 통제와 운영

환각은 확률적 생성 모델의 속성이라 제거가 아니라 **통제**의 문제다. 두 갈래다.

- **근거 기반 답변**: RAG와 Function Calling으로 자기 기억이 아니라 외부 문서, API 결과를 근거로 답하게 함 (모른다고 말하는 능력과 시스템 보완은 [[LLM-Abstention|LLM Abstention]])
- **기획 단계의 영역 선택**: 환각에 덜 민감한 작업(초안, 요약)은 사람이 수정 가능하지만, 법률 판단, 인사 평가, 금융 거래처럼 오류 비용이 큰 영역은 더 강한 검증 장치가 필요하다

운영은 한 번 만들고 끝이 아니라 **빠른 피드백 루프**다. 모델, 프롬프트, 검색 데이터, 사용자 요구가 계속 바뀌므로 빠르게 배포하고 피드백을 받아 개선한다(피드백을 지식, 테스트로 환원하는 운영 루프는 [[Production-Agent-Architecture-Eval-and-Operations#Eval 시스템과 운영 루프|Production-Agent-Architecture]], 평가 철학은 [[LLM-Eval-Strategy]]).

**시작 전략**: 거창한 에이전트부터 만들기보다 반복적이고 검증 가능한 업무(문서 요약, FAQ 자동 응답, SQL 초안 생성, 업무 기록 정리)부터. 사람이 최종 확인할 수 있는 작업이 좋은 출발점이다. LLM은 사람을 대체하는 도구라기보다 **사람이 더 빠르게 판단하고 더 나은 결과를 만들게 돕는 업무 증폭기**다.

내부 지식 봇은 배포 완료와 업무 개선을 나누어 평가한다. AWS의 생성형 AI 운영 가이드는 기술 지표와 업무 결과의 연결, 지속적인 모니터링을 요구한다(2026-10-10 확인). 이를 적용하는 예로 제한된 사용자 집단에서 실제 질문과 검토한 답을 모으고, 정답률뿐 아니라 재문의와 사람에게 넘기는 비율, 해결까지의 시간을 확인한 뒤 이용 범위를 넓힐 수 있다. 개발 기간 단축이나 이용 계정 수만으로 현장 직원의 생산성이 검증됐다고 보지 않는다.

### 사내 지원 어시스턴트는 지식 준비, 이관과 평가를 함께 설계한다

사내 플랫폼의 지원 채널에 RAG 어시스턴트를 둘 때는 답변 생성 외에 지식 준비, 노출 범위, 사람 이관, 피드백과 비용 추적을 함께 정해야 운영 결과를 해석할 수 있다. 위 문단의 재문의와 사람에게 넘기는 비율, 해결까지의 시간은 아래 피드백 범주와 함께 읽는다. 다음 목록은 설계 제안이며, 근거가 된 공개 사례는 목록 아래에 따로 둔다.

- **지식 준비와 응답 경로를 나눈다**: 수집, 청킹, 임베딩과 색인 생성은 배치 파이프라인이 맡고 응답 서비스는 배포된 색인을 조회한다. 색인 작업은 응답 서비스와 따로 재실행하고 색인 내용도 따로 점검할 수 있다. 검색 실패와 생성 실패를 구분하려면 답마다 검색된 청크와 출처 URL을 함께 기록하고 검색 결과와 답을 따로 평가한다.
- **출처를 수집부터 인용까지 잇는다**: 문서 URL을 원문, 청크와 임베딩 행에 함께 두고, 모델 입력에서도 검색 결과를 출처 URL과 묶어 전달한 뒤 답에 인용하게 한다. 인용 링크가 붙었다고 답이 맞다는 보장은 없으므로 지지 여부 검사는 [[RAG-Retrieval-Engineering#Context packing과 근거 추적|근거 추적]]을 따른다.
- **노출해도 되는 출처만 색인한다**: 외부 모델 API로 보내도 되고 채널 참여자에게 보여도 되는 출처를 먼저 고르고, 채널마다 조회할 지식 범위를 좁힌다. 한 채널에 접근 권한이 다른 사용자가 섞이면 출처 선별만으로는 부족하므로 [[RAG-Retrieval-Engineering#검색 권한과 데이터 수명|검색 권한]] 점검을 함께 적용한다.
- **사람에게 넘기는 길을 응답 안에 둔다**: 근거가 부족하면 그 사실과 담당 창구를 알리고, 답마다 후속 질문, 해결 표시와 담당자 호출 동작을 둔다. 담당자가 이어받은 대화에는 봇이 다시 끼어들지 않게 한다. 근거 부족 응답의 설계는 [[LLM-Abstention|LLM Abstention]]을 따른다.
- **피드백 범주를 결과와 처리 범위로 나눈다**: 완전 해결, 부분 도움, 틀리거나 무관한 답, 봇이 처리할 수 없는 범위의 요청을 따로 받는다. 부분 도움을 해결에 합치거나 범위 밖 요청을 오답에 합치면 고칠 대상이 흐려진다. 범주 이름만으로 뜻이 갈리지 않도록 정의를 함께 보여 준다. 버튼 피드백만으로는 검색 실패, 생성 오류와 문서 품질 같은 원인을 가릴 수 없으므로 원인 분석은 아래의 답변 평가와 문서 평가로 한다.
- **답변과 원문 문서를 따로 평가한다**: 기록한 컨텍스트와 답은 LLM 판정기로 환각과 답변 관련성 같은 기준에 따라 채점한다. 지식 베이스 문서는 문서마다 점수, 이유와 개선 제안을 받아 보고서로 남기고, 문서를 관리하는 쪽이 고칠 수 있도록 전달 경로를 정한다. 판정기를 믿기 전의 교정 절차는 [[Eval-LLM-Judge|LLM 판정기]]를 따른다.
- **호출마다 비용 귀속 식별자를 전달한다**: 호출 측이 넘긴 식별자를 지식 서비스와 LLM 게이트웨이까지 전달해 감사 로그에 남기면 그 식별자 단위로 비용을 추적할 수 있다. 채널이나 호출 플랫폼별로 나누려면 식별자를 그 단위로 발급하거나 감사 로그에 채널과 플랫폼 속성을 함께 남긴다. 게이트웨이의 사용량 귀속은 [[LLM-Gateway|LLM 게이트웨이]]를 따른다.

**사례 (2024-10-10 Uber 엔지니어링 블로그, 2026-10-20 대조):** Uber는 Slack 지원 채널용 RAG 어시스턴트 Genie의 구성을 공개했다. Spark 배치가 사내 위키(Engwiki)와 사내 Stack Overflow 등의 문서를 청킹, 임베딩해 사내 벡터 DB에 색인하고, 응답 서비스는 질문을 임베딩해 가까운 청크를 찾는다. 검색 결과마다 출처 URL을 붙인 sub-context로 넣고 그 범위에서만 답하며 URL을 인용하게 했다. 데이터가 외부 모델 API(OpenAI)나 Slack으로 새지 않도록 대부분의 엔지니어가 접근할 수 있는 사전 선별 출처만 임베딩에 썼고, 만든 임베딩은 해당 Engwiki 공간과 연결된 Slack 채널에서만 조회되게 했다. 블로그의 응답 흐름도는 근거가 부족하면 그 사실을 알리고 담당자에게 안내하며, 사람 지원으로 넘어가면 담당자가 이어받고 Genie는 응답하지 않는 흐름을 보여 준다. 피드백은 Resolved(완전 해결), Helpful(부분적으로 도왔지만 추가 도움 필요), Not Helpful(틀리거나 무관한 답), Not Relevant(코드 리뷰처럼 Genie가 도울 수 없어 담당자가 필요한 요청)로 받아 Kafka와 Hive를 거쳐 대시보드로 본다. 평가 파이프라인은 기록된 응답과 컨텍스트를 LLM 판정기로 채점하며 환각과 답변 관련성처럼 사용 사례별 지표를 정할 수 있고, 문서 평가는 문서마다 점수, 점수 설명과 개선 제안을 Michelangelo UI의 보고서로 제공한다. 호출 측이 넘긴 UUID는 Michelangelo Gateway의 감사 로그까지 전달돼 비용 추적에 쓰인다.

게시 시점까지 보고된 수치는 2023년 9월 출시 이후 154개 Slack 채널에서 70,000건이 넘는 질문에 답했고 helpfulness rate 48.9%와 추정 13,000 엔지니어링 시간 절감을 기록했다는 것이다. 같은 저자들의 2024년 Feature Store Summit 발표 자료는 피드백 분포를 Resolved by Genie 16.0%, Helpful 32.9%, Not Helpful 43.2%, Not Relevant 7.9%로 제시하며 48.9%는 Resolved by Genie와 Helpful의 합과 일치한다. 저자는 2025-04 Software Engineering Daily 인터뷰에서 helpfulness rate를 봇이 자동 해결한 질문과 올바른 방향으로 도운 질문을 합친 값이라고 설명했다. 따라서 helpfulness rate를 해결률로 읽지 않는다. 블로그와 발표 자료에는 피드백 건수, 응답률과 절감 시간의 산정 방법이 없다. 같은 인터뷰에서 저자는 절감 시간이 이모지 피드백과 일부 팀에서 봇을 항상 1차 응대로 두고 사용자가 요청할 때만 담당자를 부른 실험 같은 여러 경험을 엔지니어링 시간으로 환산한 추정이라고 설명했고, 자발적 피드백이 적어 일부 채널과 협업 팀에서는 피드백을 강제했다고 밝혔다. 강제한 채널과 실험한 팀이 분포에 섞여 있을 수 있고 분모도 공개되지 않았으므로 채널별 표본 편향 가능성을 함께 보며, 모든 수치는 Uber의 자체 보고다. 2025-05-29 Uber 블로그는 엔지니어링 보안과 개인정보 관련 Slack 채널 전체로 넓히기 전에 PDF 정책 문서 40여 개를 연결한 Genie를 전문가가 만든 100건 이상의 골든셋으로 시험했고, 응답 품질이 더 넓은 배포에 필요한 기준에 못 미쳤다고 밝혔다. 이후 에이전트형 RAG로 바꿔 수용 가능한 답의 비율을 상대 27% 높이고 잘못된 조언을 상대 60% 줄였다고 보고했다(자체 보고). 전체 피드백 지표와 별개로 업무 영역별 품질은 전문가 기준으로 따로 잰다(적용 제안).

### 사람 검토로 넘기는 조건을 분리한다

자동 처리와 사람 검토를 나눌 때는 업무 정책의 임계값, 모델 출력의 신뢰도, 필수 입력의 누락을 별도 조건으로 설계한다. 예를 들어 일정 금액 이상은 담당자가 검토하도록 정한 업무 정책과 문서에서 금액을 정확히 추출했는지는 다른 판단이다. 추출 신뢰도가 높아도 업무상 승인 권한을 대신하지 않는다. 이는 아래 문서 검토 기능을 업무 흐름에 적용하는 설계 예시다.

Amazon A2I의 Textract 통합은 다음 조건을 구분한다(2026-10-16 공식 문서 확인).

- `ImportantFormKeyConfidenceCheck`: 지정한 문서 필드와 단어 블록의 신뢰도가 설정 범위에 들어가면 검토를 시작한다.
- `MissingImportantFormKey`: 중요한 필드나 그 별칭을 찾지 못했을 때 검토를 시작한다.
- `Sampling`: 신뢰도와 무관한 표본 검토를 구성할 수 있다. 낮은 신뢰도만 검토하는 흐름과 구분한다.

이 조건들은 Textract의 문서 추출 결과에 대한 것이다. 일반 LLM의 자기평가 점수를 같은 의미의 신뢰도로 취급하거나, 검토 대상으로 선택됐다는 사실을 업무 승인 완료로 해석하지 않는다. A2I의 사용자 정의 작업에는 위 활성화 조건을 설정할 수 없으며 애플리케이션이 `StartHumanLoop`를 호출할 조건을 직접 판단한다.

2026-10-16 기준 A2I는 신규 고객에게 제공되지 않고 기존 고객은 계속 사용할 수 있다. 여기서는 검토 분기 설계의 사례로 다루며 신규 도입을 전제로 하지 않는다. 승인 위치와 실행 권한의 분리는 [[LLM-Workflow-Patterns-Chain-vs-Agent#콘텐츠 초안과 승인 대기열|승인 대기열]]을 함께 본다.

## 면접 체크포인트

- 데이터 vs 모델 — 도메인 특화면 데이터, 실무자가 당장 손댈 수 있는 쪽도 데이터
- 환각은 제거가 아니라 통제(근거 기반 + 기획 단계 영역 선택)
- 시작은 검증 가능한 반복 업무부터, 사람이 최종 확인
- 사내 지원 어시스턴트 지표는 부분 도움을 포함한 도움 비율과 완전 해결 비율을 구분하고, 피드백 범주의 정의, 분모(피드백 응답 수)와 전체 답변 대비 응답률, 채널별 표본 편향을 함께 본다

## 사례
- 성과 평가 보조: Jira 이슈/에픽 → OKR 연결 → 회사 평가 기준 반영으로 성과 노트 초안 작성. 동료 평가는 AI가 질문을 던져 구체화하고 AAT(행동-감사-기대), SBI(상황-행동-영향) 피드백 구조를 적용. 데이터 전처리(누락값, 형식 오류)와 평가 윤리(편향, 개인정보, 최종 판단은 사람)가 난제.

## 출처
- [AWS, Evaluate the performance of RAG sources using Amazon Bedrock evaluations](https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation-kb.html) — 2026-10-22 검색 전용과 검색 및 생성 평가의 구분을 대조했다. 업무별 평가표는 설계 제안이다.
- [AWS, Prompt engineering concepts](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-engineering-guidelines.html) — 2026-10-22 작업 지시, 맥락, 예시와 입력의 구성을 대조했다. 현장 표현의 보존과 분류 계약은 설계 제안이다.
- [GC녹십자의 실사 대응 혁신 이야기 — AWS Industry Week 2024 (YouTube)](https://www.youtube.com/watch?v=Tu24l6wugSA) — 2025-01-16 공개. 검색, 기준 연결과 문서 초안이라는 과업 구분을 음성 전사에서 확인했다. 화면의 평가표와 성과 수치는 반영하지 않았다.
- [HL만도, 생성형 AI가 바꿔 나가는 제조 업무 혁신 — AWS Industry Week 2024 (YouTube)](https://www.youtube.com/watch?v=UM64HUoSDMo) — 2025-01-15 공개. 요구사항 분석과 클레임 키워드 분류의 구분을 음성 전사에서 확인했다. 모델별 성능 수치와 향후 절감 목표는 반영하지 않았다.
- [AWS teams up with Jane Goodall Institute to digitize six decades of primate research — Amazon](https://www.aboutamazon.com/news/aws/jane-goodall-institute-research-archive-aws-ai) — 2026-10-22 아카이브 디지털화와 단계적 추진 범위를 대조했다. 원본, 추출과 해석의 분리 및 검토 상태 관리는 설계 제안이며 전체 구축 완료를 뜻하지 않는다.
- [From Field Notes to Gen AI: Modernizing Conservation Science — AWS Executive Insights (YouTube)](https://www.youtube.com/watch?v=qdj25_m5h3A) — 2026-04-14 공개. 제공된 사람 자막에서 수기 기록의 디지털화와 고유 언어에 대한 전문가 교정의 필요를 확인했다.

2026-10-22 추가한 세 절의 공식 자료와 발표를 대조했다. 기존 리전, 파서와 평가 사례 전체를 재검증한 것은 아니므로 `verified_at`은 유지한다.

- [AWS, Use Human Loop Activation Conditions JSON Schema with Amazon Textract](https://docs.aws.amazon.com/sagemaker/latest/dg/a2i-json-humantaskactivationconditions-textract-example.html)
- [AWS, Create a Human Review Workflow](https://docs.aws.amazon.com/sagemaker/latest/dg/a2i-create-flow-definition.html)
- [AWS Prescriptive Guidance, Delivering and sustaining the value of a generative AI application](https://docs.aws.amazon.com/prescriptive-guidance/latest/gen-ai-lifecycle-operational-excellence/prod-value.html)
- [AWS, How content chunking works for knowledge bases](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking.html) — 2026-10-20 청킹 없음의 페이지 번호 제약, 표 맥락 반환의 적용 조건과 10,000자 한도, S3 벡터 메타데이터 키를 대조했다.
- [AWS, Customize ingestion for a data source](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-data-source-customize-ingestion.html) — 2026-10-20 연결 뒤 청킹 전략과 파서 유형의 변경 불가, 멀티모달 데이터 저장 위치 조건을 대조했다.
- [AWS, Include metadata in a data source to improve knowledge base query](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-metadata.html) — 2026-10-20 CSV 행 기반 구조와 문자열 저장을 대조했다.
- [AWS, Connect to Amazon S3 for your knowledge base](https://docs.aws.amazon.com/bedrock/latest/userguide/s3-data-source-connector.html) — 2026-10-20 메타데이터 파일 이름 규칙, 10 KB 한도와 `includeForEmbedding`을 대조했다.
- [AWS, Configure and customize queries and response generation](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html) — 2026-10-20 범위 비교 연산의 숫자 전용 제약, 페이지 번호 메타데이터의 생성 조건과 암묵적 메타데이터 필터링의 지원 모델을 대조했다.
- [AWS, Query a knowledge base and retrieve data](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-retrieve.html) — 2026-10-20 `vectorSearchConfiguration`과 `managedSearchConfiguration`의 구분을 대조했다.
- [AWS, Amazon Titan Text Embeddings models](https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html) — 2026-10-20 입력 한도, 언어 지원 표기와 교차 언어 질의 안내를 대조했다.
- [AWS, Supported models and Regions for Amazon Bedrock knowledge bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-supported.html) — 2026-10-20 임베딩 모델의 단일 리전 지원 표, Data Automation 파서의 리전과 preview 표기, 파싱과 응답 생성에 쓰는 교차 리전 추론의 데이터 공유 안내를 대조했다.
- [AWS, Connect a data source to your knowledge base](https://docs.aws.amazon.com/bedrock/latest/userguide/data-source-connectors.html) — 2026-10-20 고객 관리형 커넥터의 신규 생성 중단 공지를 대조했다.
- [AWS, Build a managed knowledge base](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-build-managed.html) — 2026-10-20 관리형 저장소가 보관하는 데이터와 파서 비교를 대조했다.
- [AWS, ManagedSearchConfiguration](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_ManagedSearchConfiguration.html) — 2026-10-20 관리형 검색 설정의 필드 목록을 대조했다.
- [AWS, Customize ingestion for a data source (managed knowledge bases)](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-managed-customize-ingestion.html) — 2026-10-20 관리형의 파싱과 청킹 선택지를 대조했다.
- [AWS, Supported AWS Regions (managed knowledge bases)](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-managed-regions.html) — 2026-10-20 관리형 지원 리전을 대조했다.
- [AWS, Amazon S3 (managed knowledge bases)](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-managed-ds-s3.html) — 2026-10-20 같은 리전 버킷 요건을 대조했다. 서울 리전 비교는 설계 제안이다.
- [LLM 에이전트 실무 사례 (물어보세, 스마트 마이 노트, HyperCLOVA X Skill Universe) — 개발 컨퍼런스 (YouTube)](https://www.youtube.com/watch?v=wEVPnYOuAf8&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew)
- [JNPMEDI의 Amazon Bedrock 기반의 대규모 언어 모델을 활용한 완전 관리형 지식 기반 AI Assistant — AWS Industry Week 2024 (YouTube)](https://www.youtube.com/watch?v=yKZO3n0UyWI) — 2025-01-16 공개. 2026-10-20 헤더 반복 청크, 데이터 소스 분리와 메타데이터 필터 흐름을 대조했다. 인프라 비용 최대 80% 절감(사용량을 어느 정도 예측할 수 있는 환경에서 온디맨드 인스턴스와 직접 비교했고 서버리스로 시작할 수 있다는 점을 이유로 들었다는 설명만 있고 사용량, 기간과 산정 방식은 없다)과 콘솔 플레이그라운드로 한 초기 기능 검증이 1시간이 채 걸리지 않았던 것 같다는 회고는 발표자 측 보고라 본문에 옮기지 않았다.
- [Genie: Uber's Gen AI On-Call Copilot — Uber Engineering](https://www.uber.com/blog/genie-ubers-gen-ai-on-call-copilot/) — 2024-10-10 게시. 2026-10-20 색인 파이프라인, 인용 지시, 출처 제한, 이관 흐름도, 피드백 범주, 평가, 비용 추적과 보고 수치를 대조했다. 사내 지원 어시스턴트의 운영 설계 목록은 설계 제안이다.
- [Uber's GenAI Oncall Co-Pilot Journey — Feature Store Summit 2024, Uber](https://content.hopsworks.ai/hubfs/Feature%20Store%20Summit%202024/FS%20Summit%2024%20-%20Ubers%20-%20GenAI%20Oncall%20Co-Pilot.pdf) — 같은 저자들의 발표 자료. 2026-10-20 피드백 분포(범례 Resolved by Genie, Helpful, Not Helpful, Not Relevant)를 대조했고 48.9%가 Resolved by Genie와 Helpful의 합과 일치함을 확인했다. 자료에 helpfulness rate의 정의 문장은 없다.
- [Uber's On-Call Copilot with Paarth Chothani and Eduards Sidorovics — Software Engineering Daily](https://softwareengineeringdaily.com/2025/04/08/ubers-on-call-copilot-with-paarth-chothani-and-eduards-sidorovics/) — 2025-04-08 공개. 2026-10-20 녹취록으로 helpfulness rate의 구성, 절감 시간 추정 방식과 일부 채널의 피드백 강제를 대조했다.
- [Enhanced Agentic-RAG: What If Chatbots Could Deliver Near-Human Precision? — Uber Engineering](https://www.uber.com/blog/enhanced-agentic-rag/) — 2025-05-29 게시. 2026-10-20 보안과 개인정보 영역의 골든셋 평가 결과와 이후 개선 수치를 대조했다.

## 관련 문서
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (묶음 인덱스)]]
- [[LLM-Workflow-Patterns-Chain-vs-Agent|체인과 에이전트, 그리고 절충]]
- [[LLM-Workflow-Patterns-Function-Calling|Function Calling과 스킬 시스템]]
- [[LLM-Workflow-Patterns-Text-to-SQL|Text-to-SQL과 데이터 디스커버리]]
- [[LLM-Abstention|LLM Abstention]] — 환각 통제, 모른다고 말하기
- [[LLM-Eval-Strategy|LLM 평가 전략]] — 좋은 답변 정의, G-Eval/RAGAS, LLM-as-judge
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]] — 에이전트 위임의 신뢰 설계, 운영 루프
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]] — 리트리벌, 청킹, 적용 범위 메타데이터, 구조화 조회, 근거 추적
- [[Eval-LLM-Judge|LLM 판정기]] — 판정기 교정과 버전
- [[LLM-Gateway|LLM 게이트웨이]] — 호출 귀속과 비용 추적
- [[Customer-Support-Operations-Metrics|고객 지원 운영 지표]] — 해결 조건, 재문의, 자동화와 인계 구분
- [[Developer-Role-AI-Era|AI 시대 개발자 역할]] — 넓게 보는 눈, 문제 정의와 조율
