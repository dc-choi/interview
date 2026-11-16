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

## 목차

- [x] [[Markdown-Document-Structure|Markdown 문서 구조]] — 일반 텍스트와 렌더링, CommonMark와 GFM, 미리보기와 AI 이해도 검증의 구분

- [x] [[Display-Specifications-and-Repair-Evidence|디스플레이 사양과 수리 근거]] — peak 밝기, 터치 지원, 폴더블 결함 보고와 교체 조건



- [x] [[CS-Data-Representation|데이터 표현 (비트, 진법, 정수 표현, 엔디언, 문자와 미디어의 비트 표현, Base64, 체크섬과 해시)]]
- [x] [[CS-Computer-Architecture|컴퓨터 구조 (불 대수와 ALU, 순차 논리회로와 메모리, CPU 데이터패스와 명령어 사이클, 교육용 CPU 프로그램)]]
- [x] [[CS-Language-Execution|언어와 실행 (언어 지형과 구분 기준, 컴파일과 런타임, 네이티브 컴파일 호환성, 에뮬레이션과 호환 계층, Rust 소유권과 건전성, Zig의 안전 장치와 C 연동)]]
- [x] [[Math-Logic-For-Programming|프로그래밍에 필요한 수학과 논리 (명제, 집합, 드 모르간, 귀납법, 작은 모델의 탐색과 증명 구분)]]
- [x] [[Computability-and-Turing-Machine|계산 가능성과 튜링 기계 (효과적 방법, 범용 기계, 대각선 논증과 결정 문제, 정지 문제, 괴델과 처치, 명제와 타입, 라이스 정리)]]
- [x] [[CS-Probability-Statistics|확률과 통계 (측정 척도와 정돈된 데이터, 기술통계, 이산 확률분포, 조건부확률과 베이즈, 신뢰구간, 가설검정, 종합 점수와 순위)]]

## 출처

- 인프런, 널널한 개발자 강사, [수강에 앞서 강의소개](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128235), [다나와에 가보세요](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128236), [앞으로 더 배워야 할 것들](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128271)
- [Book list for streetfighting computer scientists — dankwiki, Nick Black](https://nick-black.com/dankwiki/index.php?title=Book_list_for_streetfighting_computer_scientists) — 2025년판, 2025-03-06 마지막 수정. 2026-11-16 단계 구성, 선정 기준과 제외 분야, C와 C++를 권하는 이유, 저자가 밝힌 한계 대조
- [실전파 컴퓨터 과학자를 위한 도서 목록 — GeekNews](https://news.hada.io/topic?id=37232)
