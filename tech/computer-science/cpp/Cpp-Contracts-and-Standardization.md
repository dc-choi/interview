---
tags: [cs, cpp, contracts, standardization, wg21]
status: done
verified_at: 2026-11-09
category: "CS - C++"
aliases: ["C++ Contracts", "C++26 Contracts", "C++ 표준화 절차", "C++26 DIS"]
---

# C++ Contracts와 표준화 절차

계약(contract)은 함수가 호출 전에 기대하는 조건, 반환 뒤 보장하는 조건과 실행 중 성립해야 하는 조건을 코드에 적는 장치다. C++26 초안은 언어 차원의 계약 어설션을 담았지만, 2026-10 국제표준안(DIS) 투표에서 부결돼 표준 확정이 늦어졌다. 기능이 어떻게 동작하는지와 기능이 표준이 되는 절차를 나눠 본다. 함수의 호출 계약을 설계하는 일반 원칙은 [[Function-Structure-and-Contracts|함수 구조와 호출 계약]]에서 다룬다.

## 계약 어설션의 세 형태

| 형태 | 위치 | 의미 |
|---|---|---|
| `pre` | 함수 선언의 계약 지정자 | 호출 시점에 성립해야 하는 전제조건 |
| `post` | 함수 선언의 계약 지정자 | 반환 시점에 보장할 사후조건, 결과에 이름을 붙일 수 있음 |
| `contract_assert` | 함수 본문의 문장 | 실행 중 내부 조건의 검사 |

각 어설션은 `bool` 타입의 predicate를 가진다. 사후조건은 `post(r : r >= 0)`처럼 식별자와 콜론으로 반환값을 묶으며, `void`를 반환하는 함수에서 결과를 묶으면 잘못된 프로그램이다.

```cpp
#include <cstddef>
#include <vector>

int at_checked(const std::vector<int>& v, std::size_t i)
    pre(i < v.size())
{
    return v[i];
}

std::size_t count_positive(const std::vector<int>& v)
    post(n : n <= v.size())
{
    std::size_t n = 0;
    for (int x : v) {
        if (x > 0) {
            ++n;
        }
        contract_assert(n <= v.size());
    }
    return n;
}
```

## 평가 의미는 구현이 정한다

cppreference 기준, 계약 어설션의 평가 의미는 네 가지다.

| 의미 | 검사함 | 위반 시 종료 |
|---|---|---|
| ignore | 아니오 | 아니오 |
| observe | 예 | 아니오 |
| enforce | 예 | 예 |
| quick-enforce | 예 | 예 |

- 어떤 의미로 평가할지는 구현이 정한다. 같은 어설션도 평가마다 다른 의미를 쓸 수 있고, 구현이 네 가지를 모두 제공할 필요는 없다.
- 검사하는 의미에서 predicate가 `false`이거나 예외로 빠져나오면 위반이다. 상수 평가 문맥에서 core constant expression이 아닐 때도 위반이다.
- observe와 enforce는 `std::contracts::contract_violation`을 받는 위반 처리기를 부른다. 처리기가 정상 반환하면 observe는 실행을 계속하고 enforce는 프로그램을 종료한다. quick-enforce는 처리기 없이 종료한다. 처리기를 교체할 수 있는지도 구현이 정한다.
- predicate를 실제로 평가하는지 자체가 지정되지 않았다. predicate의 부수효과에 의존하면 검사 의미를 켜도 그 효과가 일어나지 않을 수 있다. 번역 단위마다 다른 의미를 쓰면 상수 식의 값이 달라져 ODR 위반이 생길 수 있다.

따라서 계약은 버그를 드러내는 검사이고, 신뢰 경계의 입력 검증을 대신하지 않는다. ignore로 빌드될 수 있으므로 외부 입력은 일반 검사와 오류 처리로 막는다(설계 제안).

## 설계를 두고 제기된 우려

계약 기능(P2900)이 C++26 초안에 들어가기 전인 2025-01-12, Bjarne Stroustrup을 포함한 저자 9명은 P3573R0에서 설계 우려를 정리했다. 주요 항목은 다음과 같다.

- 너무 많은 부분이 구현 정의라 무엇을 검사하고 실패하면 어떻게 되는지 사용자가 알기 어렵다.
- 계약을 묶음으로 나눠 따로 켜고 끌 수 없다.
- 서로 다른 검사 설정으로 빌드한 번역 단위를 함께 링크할 때 템플릿, inline, `constexpr` 함수와 모듈이 어떤 설정을 따르는지 불명확하다.
- 가상 함수를 포함해 대규모 사용 경험이 부족하다.
- predicate가 던진 예외를 계약 위반으로 다루는 결정에 반대한다.
- 제안이 너무 커서 C++26 안에 충분히 이해되고 안정되기 어렵다고 봤고, P2900을 TS로 돌리자는 의견이 있다는 점도 언급했다.

이 문서는 채택 전 우려다. 2026 DIS 투표에서 각 국가 회원기관이 낸 의견의 원문은 확인하지 않았다.

## 표준이 되는 절차

isocpp의 JTC 1 절차 안내는 C++ 표준의 진행을 네 단계로 설명한다.

1. **제안**: SC22에서 프로젝트 번호를 받는다. 출판까지 3년이 흔한 기간이다.
2. **위원회 단계**: WG21 위의 SC22에서 국가 회원기관이 초안에 처음 기술 의견을 내는 투표로, 대부분의 의견이 여기서 나와야 한다.
3. **Enquiry 단계**: DIS나 DTS를 가장 긴 투표 기간으로 의견 수렴에 부친다. TS는 이것이 마지막 투표다. IS는 반대표가 없으면 승인 단계를 건너뛴다.
4. **승인 단계**: DIS를 깨끗하게 통과하지 못한 IS에만 적용하며, 의견 없는 찬반 투표다.

반대표에 붙은 의견은 위원회 참고용이지만, 반대가 많아 투표가 실패할 경우 위원회가 무엇을 고칠지 알게 해 준다. 세부 기준과 기간은 현행 JTC 1 지침을 따른다.

## 2026-10 C++26 DIS 부결과 남은 선택지

WG21 위원이자 독일 투표 대표단인 Andreas Fertig의 2026-11-03 글에 따르면 다음과 같다. 개인 견해임을 밝힌 글이며, 사실 관계는 다음 회의 결과로 다시 확인한다.

- C++26 DIS는 2026-10-23 12주 투표 끝에 승인되지 않았다. 3분의 2 찬성이 필요했으며, 집계는 ISO 규칙상 공개되지 않을 수 있다.
- 반대 의견은 Contracts에 집중됐고, 여러 국가 회원기관이 기능이 아직 출시할 준비가 되지 않았다고 봤다.
- WG21은 2026년 3월 Contracts를 포함한 초안을 만장일치는 아니지만 큰 다수로 통과시켰다.
- 저자가 찾은 이전의 미승인 DIS는 2006년 C++/CLI(ISO/IEC DIS 26926) 하나다.

| 선택지 | 의미 |
|---|---|
| 수정 초안으로 DIS 재투표 | 쟁점을 고친 초안을 다시 투표에 부친다 |
| 위원회(CD) 단계로 복귀 | 초안을 위원회 단계로 되돌린다 |
| 기술 명세(TS) 발행 | 국제 표준 대신 수정 초안을 TS로 낸다 |
| 프로젝트 취소 | C++23에서 C++29로 바로 가며, C++26에 채택된 기능을 다시 제안해야 한다 |

네 선택지 모두 표준을 늦추고 WG21의 다수 합의가 필요하며, 어느 쪽이든 C++26이라는 이름이 유지될지는 불확실하다. 2026-11-16 WG21 회의에서 대응을 논의할 예정이었으므로, 2026-11-09 작성 시점에는 결과가 정해지지 않았다.

## 개발자가 확인할 것

- 컴파일러 지원과 표준 확정은 별개다. GCC 16 변경 내역은 P2900R14 Contracts를 구현한 C++26 기능으로 나열한다. 사용 옵션과 기본 평가 의미는 컴파일러 문서로 확인한다.
- 기능 확인 매크로 `__cpp_contracts`는 C++26 Contracts에 `202502L`, 가상 함수 계약을 더한 C++29에 `202606L`로 cppreference에 표기돼 있다.
- predicate에는 부수효과를 두지 않는다.
- 헤더의 inline 함수와 템플릿에 계약을 붙인 라이브러리는 사용자의 빌드 설정과 섞일 수 있으므로 지원하는 평가 의미를 문서화한다(제안).
- 표준 지위가 정해지기 전의 도입은 특정 컴파일러 기능에 의존하는 결정으로 기록한다(제안).

## 출처

- [C++26 DIS failed, how does C++ survive? — Andreas Fertig](https://andreasfertig.com/blog/2026/11/cpp26-dis-failed-how-does-cpp-survive/) — 2026-11-03 게시, 투표 결과와 선택지의 정리. 저자 개인 견해 부분은 옮기지 않았다
- [cppreference, Contract assertions (since C++26)](https://en.cppreference.com/w/cpp/language/contracts.html) — 평가 의미, 위반 처리, 부수효과와 ODR 주의, 기능 확인 매크로
- [cppreference, Function declaration](https://en.cppreference.com/w/cpp/language/function.html) — `pre`, `post` 문법과 결과 묶기
- [WG21, P3573R0 Contract concerns](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2025/p3573r0.pdf) — 2025-01-12
- [isocpp, ISO/IEC JTC1 Procedures](https://isocpp.org/std/iso-iec-jtc1-procedures)
- [GCC, GCC 16 Release Series: Changes, New Features, and Fixes](https://gcc.gnu.org/gcc-16/changes.html) — 2026-11-09 확인, 페이지 갱신일 2026-09-20

## 관련 문서

- [[Function-Structure-and-Contracts|함수 구조와 호출 계약]]
- [[Cpp-Language-Memory-and-STL|값과 메모리, Pointer, Container와 Algorithm]]
- [[C++(Cpp)|C++]]
