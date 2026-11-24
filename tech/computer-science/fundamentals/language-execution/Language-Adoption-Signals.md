---
tags: [cs, fundamentals, programming-language, language-selection, developer-survey, rust, go]
status: done
verified_at: 2026-11-24
category: "CS - 기초"
aliases: ["Language Adoption Signals", "프로그래밍 언어 채택 지표 읽는 법", "언어 전망과 설치 기반"]
---

# 프로그래밍 언어 채택 지표 읽는 법

어떤 언어가 앞으로 중요해질지는 인기 순위 하나로 답할 수 없다. 이미 돌아가는 시스템을 받치는 언어와 새 소프트웨어가 고르는 언어는 다른 질문이고, 개발자 조사도 조사마다 재는 대상이 다르다. 언어 자체의 실행 경로, 메모리 관리와 타입 검사 기준은 [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준]]에서 다루고, 여기서는 채택 신호를 읽는 기준을 다룬다.

## 설치 기반과 신규 채택은 다른 질문이다

- **남아 있을 언어:** 큰 업무 시스템을 다른 언어로 바꾸려면 기존 동작을 보존하고, 데이터를 안전하게 옮기고, 개발자를 다시 교육하고, 새 시스템의 신뢰성을 입증해야 한다. 그래서 많은 조직에는 동작하는 애플리케이션을 개선하는 쪽이 처음부터 다시 쓰는 쪽보다 실용적이다. 언어의 지속성은 언어 문법보다 런타임, 프레임워크, 도구와 경험 있는 개발자를 합친 플랫폼에서 나온다. 점진 교체의 방법은 [[Legacy-Modernization-Strategies|레거시 현대화 전략]]을 따른다.
- **새로 고를 언어:** 새 구성요소는 교체 비용이 없으므로 그 구성요소의 제약(실행 위치, 메모리 안전, 배포 단위, 생태계)에 맞는 언어를 고를 수 있다.
- **결론이 갈리는 지점:** 어떤 언어가 사라지지 않는다는 판단과 그 언어가 다음 세대의 중심이 된다는 판단은 따로 한다. 언어가 죽었다는 선언과 계속 쓰인다는 반론은 대개 서로 다른 질문에 답하고 있다.
- **설치 기반이 실제로 바뀐 사례:** Linux에서 Android의 프로세스 간 통신을 맡는 Binder 드라이버는 6.18부터 Rust 구현이 C 구현과 함께 들어가 있었고, 2026-10-25 메인라인에 병합된 7.4 변경이 C 구현을 지웠다(파일 20개, 11,470줄 삭제). 삭제 커밋은 15년 넘게 복잡해진 C 드라이버로는 취약점을 밟지 않고 새 기능을 넣기 어려웠다는 점과, Rust 구현이 기능 동등성을 갖추고 성능도 같거나 자주 더 나았으며 Android 기기에서 한동안 돌았다는 점을 이유로 든다(작성자 평가). 교체는 새 구현이 같은 자리에서 동등성을 보이고 두 구현이 함께 있던 기간 뒤에 일어났다(해석).

## 조사마다 재는 것이 다르다

| 조사 | 재는 것 | 2026-11-23 확인한 결과 |
|---|---|---|
| Stack Overflow Developer Survey 2026 | 응답자가 스스로 보고한 사용 기술 | 상위 10개는 거의 그대로이고 SQL이 HTML/CSS를 넘어 2위가 됐다. Rust는 사용 순위 12위로 올랐다 |
| GitHub Octoverse 2026 | GitHub의 언어별 월간 기여자 수 | 2025년 9월에서 2026년 9월 사이 TypeScript 362만, Python 323만, JavaScript 182만 명이 늘어 상위 10개 언어 중 증가 폭이 가장 컸다. 증가율로는 Rust가 상위 언어 가운데 가장 빨랐고 1년 사이 두 배가 됐다 |
| Go Developer Survey 2025 | Go 사용자가 Go로 만드는 것 | 가장 많은 용도는 CLI와 API 서비스이고 응답자의 55%는 둘 다 만든다. 3분의 1 이상이 클라우드 인프라 도구를 만든다 |

읽을 때 지킬 기준은 다음과 같다.

- **모집단:** 설문은 응답한 사람의 자기 보고이고 저장소 통계는 공개 활동이다. 사내 저장소의 코드와 응답하지 않은 개발자는 두 쪽 모두에서 빠진다. 특정 언어 사용자만 대상으로 한 조사는 그 언어의 쓰임새를 보여 줄 뿐 다른 언어와의 비교에는 쓸 수 없다.
- **순위와 증가율:** 증가율은 분모가 작을수록 크게 나온다. 증가율 1위와 증가 인원 1위가 다른 언어일 수 있으므로 두 값을 함께 본다. 빠른 성장이 장기 정착을 보장하지는 않는다.
- **선호와 사용률:** Stack Overflow의 admired는 지난 1년 그 언어로 많이 개발했다고 답한 사람 가운데 다음 1년에도 쓰고 싶다고 답한 비율이라 분모가 그 언어의 사용자다. 2026년 조사(응답자 14,099명)에서 Rust는 admired 67.4%로 사용률 12위 안의 언어 가운데 가장 높지만 사용률은 18.0%다. 사용자가 17명(0.1%)인 Elm의 admired는 94.1%다. admired는 써 본 사람이 계속 쓰려는 의향이지 채택 범위가 아니므로 사용률, 응답자 수와 함께 읽는다.
- **조사 간 비교:** 사용률 1위와 기여자 수 1위가 다르다고 해서 한쪽이 틀린 것이 아니다. 측정 대상이 다르므로 한 조사의 순위를 다른 조사의 순위와 직접 잇지 않는다.
- **묶음 단위:** TypeScript는 JavaScript로 변환돼 실행되므로 웹 플랫폼의 전망을 볼 때는 두 언어를 한 생태계로 묶어 읽는 편이 맞다. 조사는 둘을 따로 세므로 어느 단위로 읽는지 먼저 정한다.

## 언어가 맡는 층으로 나눠 읽는다

채택 신호는 언어 전체가 아니라 그 언어가 맡는 층의 수요로 읽는다.

| 층 | 주로 쓰이는 언어 | 지속성의 근거 |
|---|---|---|
| 브라우저와 사용자 접점 | JavaScript, TypeScript | 브라우저가 실행하는 언어이고 Node.js로 서버 쪽까지 같은 생태계를 쓴다 |
| 클라우드 서비스와 인프라 도구 | Go | API, 네트워킹, CLI에 맞춘 단순한 언어와 내장 도구, 패키징과 배포의 단순함 |
| 기업 업무 시스템 | Java | 수십 년 쌓인 설치 기반과 플랫폼, 기존 소프트웨어와의 호환성을 유지하는 발전 |
| AI 연구와 프로토타입 | Python | 실험을 빠르게 고치고 다시 돌리는 속도와 라이브러리. 무거운 계산은 아래층의 최적화된 구현이 맡는다 |
| 성능이 중요한 엔진과 시뮬레이션 | C++ | 속도와 자원에 대한 세밀한 제어, 성숙한 도구와 이미 쓰이는 방대한 코드 |
| 메모리 안전이 우선인 새 인프라 | Rust | 성능과 자원 제어에 더해 흔한 메모리 오류를 컴파일 시점에 막는다 |

- 한 제품은 대개 여러 층의 언어를 함께 쓴다. 언어 하나가 다른 언어를 모두 대체하는 그림보다 층마다 다른 언어가 공존하는 그림이 실제에 가깝다.
- AI 제품도 한 언어로 끝나지 않는다. 실험과 조율은 Python, 대규모로 모델을 돌리는 서비스는 다른 언어일 수 있다. 계층별 근거는 [[AI-Infrastructure-Language-Layers|AI 서비스 스택의 언어 계층]]에 있다.
- 생태계가 실제로 만들어지고 있는지도 신호다. Rust에는 Hugging Face의 ML 프레임워크 Candle과 딥러닝 프레임워크 Burn이 있다(2026-11-23 두 저장소의 소개 문구 확인). 이런 프로젝트의 존재는 그 층에서 실제 구성요소가 만들어지고 있음을 보여 줄 뿐 기존 언어를 추월했다는 근거는 아니다.

## 전망을 판단에 쓸 때

- **전망은 베팅이다:** 2030년의 새 소프트웨어를 JavaScript, Go, Rust가 규정한다는 식의 전망은 현재 사용률 상위 세 언어와 일치하지 않는다. 근거는 통계가 아니라 웹 애플리케이션, 클라우드 인프라, AI 시스템이라는 수요와 언어 강점의 대응이다. 이런 전망은 수요 가정이 맞는지로 평가한다.
- **Rust와 AI 인프라:** AI의 과제가 학습에서 배포, 요청 처리, 로컬과 엣지 추론으로 넓어지면 메모리, 속도, 비용 제약 아래에서 도는 인프라의 비중이 커진다는 가정이다. 연구와 실험에서 Python의 위치를 바꾼다는 주장이 아니다.
- **학습과 채택에 적용하기:** 다음에 배울 언어나 새 구성요소의 언어는 순위가 아니라 맡길 층과 현재 제약에서 고른다. 구체적인 질문은 [[Programming-Language-Landscape#판단 질문|언어 지형의 판단 질문]]을 쓴다.

## 판단 질문

- 묻는 것이 이 언어가 남아 있을지인가, 새 프로젝트가 이 언어를 고를지인가?
- 인용하는 수치는 누구를 대상으로 무엇을 잰 것인가? 증가율이라면 분모와 증가 인원은 얼마인가?
- 이 언어가 맡는 층의 수요가 늘고 있는가, 그 층에서 실제 구성요소가 만들어지고 있는가?
- 전망의 근거가 측정값인가, 수요에 대한 가정인가?

## 출처

- [The results of the 2026 Developer Survey are here — Stack Overflow](https://stackoverflow.blog/2026/10/06/the-results-of-the-2026-developer-survey-are-here/) — 2026-10-06 게시. 2026-11-23 상위 10개 변동, SQL 2위와 Rust 12위 대조. 언어별 수치는 아래 기술 데이터 페이지로 2026-11-24 대조했다
- [2026 Developer Survey: Technology — Stack Overflow](https://survey.stackoverflow.co/2026/technology/data) — 2026-11-24 언어 사용률(응답자 14,099명)과 Admired and Desired 표의 정의, Rust와 Elm 수치 대조
- [binder: rm -f binder.c — torvalds/linux, GitHub](https://github.com/torvalds/linux/commit/fd2bc059ed466bdd95347a4f7891d150d94e7de2) — 2026-09-12 작성 커밋. 2026-11-24 삭제 이유와 규모, v6.18, v7.3, v7.4-rc1 태그의 C 구현과 Rust 구현 유무 대조
- [Merge tag char-misc-7.4-rc1 — torvalds/linux, GitHub](https://github.com/torvalds/linux/commit/330517c63aa9b48227b6ab45f01003effac77ae4) — 2026-10-25 병합. 2026-11-24 C Binder 삭제가 7.4 병합 창의 변경에 들어간 사실 대조
- [러스트가 뭐길래? 클로드 코드, 코파일럿, 안드로이드가 전부 갈아탔다 — YouTube, 투더제이 TTJ](https://www.youtube.com/watch?v=qrMK2aEkBbg) — 2026-11-24 업로드, 2026-11-24 음성 인식 전사 전체 확인. Binder의 C 구현 삭제와 Rust의 선호, 사용률 수치를 다룬 계기이며 위 커널 커밋과 설문 데이터로 대조했다. Linux 7.0에서 실험 단계 표시를 뗐다는 연혁은 확인하지 않아 쓰지 않았다
- [Octoverse: Commits, pushes, reach new highs in 2026 as developers build with agents — GitHub](https://github.blog/2026-10-28-octoverse-commits-pushes-reach-new-highs-in-2026-as-developers-build-with-agents/) — 2026-10-28 게시. 2026-11-23 월간 기여자 증가 인원과 Rust 증가율 문장 대조
- [Results from the 2025 Go Developer Survey — The Go Blog](https://go.dev/blog/survey2025) — 2026-01-21 게시. 2026-11-23 용도 비율 대조
- [huggingface/candle — GitHub](https://github.com/huggingface/candle) — 2026-11-23 저장소 소개 문구 확인
- [tracel-ai/burn — GitHub](https://github.com/tracel-ai/burn) — 2026-11-23 저장소 소개 문구 확인
- [Top 3 Programming Languages That Could Define the Next Era of Software by 2030 — YouTube, Cloud X Berry](https://www.youtube.com/watch?v=ctcxwVno0Gs) — 2026-11-22 업로드, 2026-11-23 음성 인식 전사 전체 확인. 자사 유료 교재 안내가 포함된 영상. 설치 기반과 신규 채택의 구분, 층별 역할과 2030년 전망의 출처. JavaScript가 한 조사에서 12년 연속 1위라는 수치와 C++의 사용 순위 10위권은 1차 출처로 확인하지 못해 쓰지 않았다

## 관련 문서

- [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준]]
- [[AI-Infrastructure-Language-Layers|AI 서비스 스택의 언어 계층]]
- [[Legacy-Modernization-Strategies|레거시 현대화 전략]]
- [[Runtime-Stack-Evolution|런타임 스택 진화]]
- [[Compile-and-Runtime|컴파일과 런타임]]
