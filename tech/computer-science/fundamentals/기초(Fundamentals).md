---
tags: [cs, fundamentals]
status: index
category: "CS - 기초"
aliases: ["CS Fundamentals"]
---

# 컴퓨터기초(Fundamentals)

컴퓨터가 동작하는 가장 아래 층 — 비트 표현, 디지털 회로, 메모리, CPU 명령어 사이클, 컴파일/런타임 모델, 그리고 프로그래밍의 논리 기초.

## 학습순서

표현 방식에서 회로와 CPU로 내려간 뒤 운영체제, 실행 도구, 자료구조와 알고리즘으로 올라오면 각 층의 책임을 연결하기 쉽다. 이 순서는 방향을 잡기 위한 안내이지 엄격한 선수 과목은 아니다. 제품 사양표는 하드웨어 용어를 익히는 예시로 활용하되 제조사의 상품명과 마케팅 등급을 공학적 정의로 일반화하지 않는다.

### 더 깊이 읽을 도서 목록

같은 층들을 책으로 깊게 다지는 목록의 한 예가 Nick Black의 Book list for streetfighting computer scientists(2025년판)다. 입문은 C, C++와 Rust 책에 Stepanov의 일반화 프로그래밍 책을 더했다. C와 C++를 직접 쓰지 않더라도 주요 운영체제가 네이티브 API를 표현하는 공통어라서 읽을 줄 알아야 한다는 이유다. 핵심 단계는 시스템 프로그래밍(Advanced Programming in the UNIX Environment, The Linux Programming Interface), 네트워크, 컴퓨터 구조(Hennessy와 Patterson), 컴파일러, 알고리즘(The Art of Computer Programming, CLRS), 계산 이론(Sipser, Garey와 Johnson)으로 넓히고, 고급 단계는 계산 복잡도, 타입 이론(Pierce), 함수형 자료구조(Okasaki)와 람다 계산으로 이어진다. 수학은 조합론, 확률과 통계, 선형대수를 확실히 익히라고 권한다.

저자 취향이 강한 목록이다. 머신러닝, 양자 컴퓨팅, 가속기와 정보보안 책은 일부러 뺐다. 아직 읽지 않은 Roughgarden의 알고리즘 책과 Beej의 네트워킹 책은 평가를 미뤘고, Beej와 Stevens의 네트워크 책 모두 XDP와 io_uring 같은 최근의 고속 네트워킹을 다루지 않는다고 저자 스스로 적는다. 이 vault가 채택한 학습 순서가 아니라 참고 목록이다.

## 실무 문제에서 만나는 수학

라이브러리가 계산을 감춰도 그 결과는 버그, 지연과 비용으로 드러난다. 아래는 수학 분야별로 실무에서 던질 질문과 그 계산을 설명하는 문서를 잇는 지도이며, 학습 순서나 필수 범위를 정한 것은 아니다.

- **논리와 귀납법**: 항상 참이어야 할 불변식을 적고 그것을 깨는 입력을 찾는다. 목록의 모든 항목이 정확히 한 번 보여야 한다는 불변식은 조회 사이에 행이 추가되거나 지워지면 offset 페이지네이션에서 깨진다([[Math-Logic-For-Programming|수학과 논리]], [[GraphQL-Pagination|offset과 cursor 페이지네이션]]).
- **수 표현**: 2^53을 넘는 정수 ID와 이진 부동소수점으로 계산한 금액은 예외를 던지지 않은 채 다른 값이 될 수 있다([[JavaScript-BigInt|BigInt와 정수 정밀도]], [[Payment-System-Principles|결제 금액의 표현]]).
- **점근 분석과 amortized 분석**: 평균이 상수 시간인 연산에도 전체를 옮기는 한 번이 숨어 있고, 같은 O(n)이라도 메모리 배치에 따라 실제 시간이 다르다([[Algorithm-Complexity|시간복잡도]], [[Linear-Data-Structures-Array|동적 배열과 지역성]], [[Hash-Table|해시 테이블의 resize]]).
- **확률**: 무작위 ID의 충돌 확률은 낮은 구간에서 개수의 제곱에 비례해 늘고, 근사 집합은 허용할 거짓 양성률을 정해 공간을 줄인다([[Checksum-and-Hash|생일 문제와 해시]], [[Bloom-Filter|Bloom filter]]).
- **백분위와 대기행렬**: 여러 서버를 모두 기다리는 요청은 꼬리 지연을 자주 만나고, 사용률이 오를수록 대기는 비선형으로 는다. 안정 상태의 평균 동시 처리 수가 도착률과 평균 체류 시간의 곱이라는 Little's Law로 풀 크기를 어림한다([[Latency-Optimization|레이턴시 최적화]], [[Monitoring-Graph-Reading|모니터링 그래프 읽기]], [[Throughput-vs-Latency|처리량과 지연]]).
- **독립 사건의 확률**: 복제 수와 정족수가 가용성을 정하고, 장애 원인을 공유하면 그 계산이 무너진다([[SLI-SLO|SLO와 가용성 계산]]).
- **나머지 연산과 해싱**: `hash(key) % N`은 서버 수가 바뀌면 대부분의 키를 옮기고, consistent hashing은 새 서버가 맡을 몫 정도만 옮긴다([[Consistent-Hashing|Consistent Hashing]]).
- **선형대수와 미분**: 임베딩은 내적과 코사인 유사도로 비교하고, 모델은 손실의 기울기 반대 방향으로 가중치를 고친다([[Vector-Similarity-Search|벡터 유사도 검색]], [[Calculus-Limits-and-Derivatives|도함수와 연쇄 법칙]], [[Neural-Network-Fundamentals|경사 하강법]]).

## 목차

- [x] [[Markdown-Document-Structure|Markdown 문서 구조]] — 일반 텍스트와 렌더링, CommonMark와 GFM, 미리보기와 AI 이해도 검증의 구분

- [x] [[Display-Specifications-and-Repair-Evidence|디스플레이 사양과 수리 근거]] — peak 밝기, 터치 지원, 폴더블 결함 보고와 교체 조건



- [x] [[CS-Data-Representation|데이터 표현 (비트, 진법, 정수 표현, 엔디언, 문자와 미디어의 비트 표현, Base64, JSON Lines, 체크섬과 해시, 오류 정정 부호)]]
- [x] [[CS-Computer-Architecture|컴퓨터 구조 (불 대수와 ALU, 순차 논리회로와 메모리, CPU 데이터패스와 명령어 사이클, 교육용 CPU 프로그램)]]
- [x] [[CS-Language-Execution|언어와 실행 (언어 지형과 구분 기준, 컴파일과 런타임, 네이티브 컴파일 호환성, 에뮬레이션과 호환 계층, Rust 소유권과 건전성, Rust 추상화 선택과 디스패치, Zig의 안전 장치와 C 연동)]]
- [x] [[Math-Logic-For-Programming|프로그래밍에 필요한 수학과 논리 (명제, 집합, 드 모르간, 귀납법, 작은 모델의 탐색과 증명 구분)]]
- [x] [[Propositional-Logic-and-Inference|명제 논리와 추론 (모델과 논리적 귀결, 모델 검사, 지식 공학, 추론 규칙, CNF와 resolution, 1차 논리)]]
- [x] [[Computability-and-Turing-Machine|계산 가능성과 튜링 기계 (효과적 방법, 범용 기계, 대각선 논증과 결정 문제, 정지 문제, 괴델과 처치, 명제와 타입, 라이스 정리)]]
- [x] [[Calculus-Limits-and-Derivatives|미분 (평균 변화율과 극한, 조임 정리와 연속, 사잇값 정리, 도함수와 미분 가능성, 평균값 정리, 미분 규칙, 최댓값과 최솟값, 수치 미분의 오차)]]
- [x] [[Calculus-Integrals-and-Fundamental-Theorem|적분 (리만 합과 정적분, 부호 있는 누적, 부정적분과 적분상수, 미적분의 기본정리, 치환적분과 부분적분, 평균, 넓이, 부피와 곡선 길이, 수치 적분의 오차)]]
- [x] [[CS-Probability-Statistics|확률과 통계 (측정 척도와 정돈된 데이터, 기술통계, 이산 확률분포, 조건부확률과 베이즈, 베이즈 네트워크 추론, 은닉 마르코프 모형, 신뢰구간, 가설검정, 종합 점수와 순위)]]

## 출처

- 인프런, 널널한 개발자 강사, [수강에 앞서 강의소개](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128235), [다나와에 가보세요](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128236), [앞으로 더 배워야 할 것들](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128271)
- [Book list for streetfighting computer scientists — dankwiki, Nick Black](https://nick-black.com/dankwiki/index.php?title=Book_list_for_streetfighting_computer_scientists) — 2025년판, 2025-03-06 마지막 수정. 2026-11-16 단계 구성, 선정 기준과 제외 분야, C와 C++를 권하는 이유, 저자가 밝힌 한계 대조
- [실전파 컴퓨터 과학자를 위한 도서 목록 — GeekNews](https://news.hada.io/topic?id=37232)
- [Math Every Programmer ACTUALLY Needs — YouTube, The Coding Gopher](https://www.youtube.com/watch?v=-gBgZpC6ehA) — 2026-11-17 업로드, 음성 인식 전사 기준. 실무 문제에서 만나는 수학 지도의 계기. 영상의 예시 수치는 직접 계산으로 대조했고 세부 근거는 연결한 각 문서의 출처를 따른다
