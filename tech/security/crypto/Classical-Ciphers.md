---
tags: [security, crypto, cipher, caesar-cipher, rot13, substitution-cipher, brute-force, kerckhoffs]
status: done
verified_at: 2026-11-18
category: "Security - 암호"
aliases: ["Classical Ciphers", "고전 암호", "카이사르 암호", "시저 암호", "Caesar Cipher", "ROT13", "단일 치환 암호", "Substitution Cipher"]
---

# 고전 암호: 카이사르 암호, ROT13과 단일 치환

치환 암호는 평문의 글자를 정해진 규칙에 따라 다른 글자로 바꿔 암호문을 만든다. 지금은 보안에 쓰지 않지만 알고리즘과 키의 역할, 키 공간과 전수 조사, 방식을 숨기는 보안의 한계를 가장 작은 예로 보여 준다. 평문, 암호문, 암호화와 복호화의 정의는 [[Public-Key-Cryptography#기초 용어와 분류|공개키 암호의 기초 용어]]를 따른다.

## 카이사르 암호

알파벳을 0부터 25로 두고 모든 글자를 k칸 민다. 암호화는 `E(x) = (x + k) mod 26`, 복호화는 같은 키로 거꾸로 미는 `D(y) = (y - k) mod 26`이다. 알고리즘(글자 밀기)은 같아도 키 k가 다르면 다른 암호문이 나오고, 같은 키를 나눠 가진 쪽만 되돌릴 수 있다. 같은 키로 암호화와 복호화를 하는 대칭키 방식이다.

- k = 1이면 `HI!`는 `IJ!`가 된다. 알파벳이 아닌 `!`와 공백은 그대로 두므로 단어 길이와 문장 부호 위치가 암호문에 드러난다.
- 수에토니우스는 카이사르가 사적인 편지에서 A 자리에 알파벳의 넷째 글자 D를 쓰는 식으로 글자를 바꿨다고 적었다. k = 3이다.
- ROT13은 k = 13이다. 13칸을 두 번 밀면 26칸이라 같은 연산이 암호화이자 복호화다(`HI!`는 `UV!`, 다시 `HI!`). Python은 `rot13`을 암호 모듈이 아니라 `codecs`의 텍스트 변환으로 제공한다. 바로 읽히지 않게 가릴 뿐 기밀성은 없고, base64처럼 누구나 되돌리는 알려진 변환으로 본다([[LLM-Application-Security|LLM 애플리케이션 보안의 Spotlighting encoding 방식]]).
- k = 26은 모든 글자를 제자리로 돌린다. 서로 다른 암호문을 만드는 키는 1부터 25까지 25개뿐이다.

## 전수 조사

키가 25개뿐이면 공격자는 모든 키로 복호화해 보고 뜻이 통하는 평문을 고른다. 키를 몰라도 글자를 민 방식이라는 짐작 하나로 25번 안에 끝난다.

```c
#include <ctype.h>
#include <string.h>

// 알파벳만 k칸 밀고 나머지 문자는 그대로 둔다. 복호화는 caesar(s, -k)다.
void caesar(char *s, int k)
{
    int shift = ((k % 26) + 26) % 26;
    for (size_t i = 0, n = strlen(s); i < n; i++)
    {
        unsigned char c = (unsigned char) s[i];
        if (isupper(c))
        {
            s[i] = (char) ('A' + (c - 'A' + shift) % 26);
        }
        else if (islower(c))
        {
            s[i] = (char) ('a' + (c - 'a' + shift) % 26);
        }
    }
}
```

- C의 `%`는 나머지가 피제수의 부호를 따라 `-1 % 26`이 -1이다. `((k % 26) + 26) % 26`으로 음수 키와 26 이상의 키를 0부터 25 사이로 맞춘다([[C-Types-Control-Flow-and-Functions#연산자|C의 정수 나눗셈과 나머지]]).
- 계산은 `int`로 하고 결과만 `char`에 담는다. `'z' + 13`(135)처럼 범위를 넘는 중간값을 signed `char`에 먼저 저장하면 구현 정의 변환이 일어나 흔히 음수가 된다([[Cpp-Coding-Test-Workflow-IO-and-Strings#문자 빈도와 문자 코드|ROT13과 char 감김]]). `isupper`, `islower`에는 `unsigned char` 값을 넘긴다([[C-Arrays-and-Strings#문자 분류와 변환|문자 분류와 변환]]).
- `'A' + ...`로 알파벳 위치를 계산하는 방식은 대문자와 소문자가 각각 연속된 ASCII 계열 문자 집합을 가정한다.
- 이 함수로 `UV!`를 키 1부터 25까지 거꾸로 밀어 보면 키 13에서 `HI!`가 나온다.

## 단일 치환 암호: 키 공간이 커도 깨진다

알파벳 26글자를 임의의 순서로 섞은 대응표를 키로 쓰면 가능한 키는 26! ≈ 4.03 × 10²⁶(약 2⁸⁸)개라 전수 조사로는 깨기 어렵다. 카이사르 암호는 이 대응표가 일정하게 밀린 특수한 경우다.

- 같은 평문 글자는 언제나 같은 암호문 글자가 되므로 암호문의 글자 빈도는 평문 빈도를 글자만 바꿔 놓은 분포다. 평문 언어의 빈도와 자주 나오는 짧은 단어를 아는 공격자는 가장 흔한 암호문 글자부터 대응을 추정해 나간다(빈도 분석).
- 키 공간의 크기는 필요조건일 뿐이다. 키를 모두 시도하지 않아도 암호문이 평문의 통계를 드러내면 그 틈으로 깨진다. 무작위 키의 전수 탐색 규모는 [[Cryptographic-Randomness#무작위 256비트 키의 전수 탐색 규모|암호학적 난수]]에서 다룬다.

## 방식을 숨기는 보안의 한계

카이사르 암호처럼 키가 적은 방식은 방법이 알려지면 25번의 시도로 풀리므로 방법을 숨기는 것이 보호의 전부다. Kerckhoffs는 1883년 『La cryptographie militaire』에서 암호 체계는 비밀을 요구하지 않아야 하고 적의 손에 넘어가도 문제가 없어야 한다고 썼다. 현대 암호는 알고리즘을 공개하고 키만 비밀로 둔다([[Public-Key-Cryptography|공개키 암호]]). 방식을 숨기는 데 기대는 설계(security through obscurity)는 방식이 드러나는 순간 보호가 사라지므로 다른 통제에 더하는 장벽으로만 쓴다([[GraphQL-Security|GraphQL introspection 차단의 한계]]).

## 점검 질문

- 카이사르 암호의 유효한 키가 25개인 이유와 ROT13이 자기 자신의 역연산인 이유는?
- 키가 26!개인 단일 치환 암호가 전수 조사 없이 깨지는 이유는?
- ROT13과 base64를 암호화로 볼 수 없는 이유는?
- Kerckhoffs 원칙에서 알고리즘은 공개해도 되는 이유는?

## 출처

- [YouTube, Harvard CS50 (2026), Lecture 2: Arrays](https://www.youtube.com/watch?v=gmuTjeQUbTM&t=16078s)
- [The Life of Julius Caesar — LacusCurtius, Suetonius](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Suetonius/12Caesars/Julius%2A.html) — Loeb 1913년판 영역. 2026-11-18 56.6의 글자 치환 서술 대조
- [La cryptographie militaire — Journal des sciences militaires, Auguste Kerckhoffs](https://www.petitcolas.net/kerckhoffs/index.html) — 1883년 게재 정보와 원칙의 영역
- [Python, codecs — Codec registry and base classes](https://docs.python.org/3/library/codecs.html#text-transforms) — `rot_13` 텍스트 변환

## 관련 문서

- [[암호(Crypto)|암호 인덱스]]
- [[Public-Key-Cryptography|공개키 암호 (기초 용어, Kerckhoffs 원칙)]]
- [[Cryptographic-Randomness|암호학적 난수 (전수 탐색 규모)]]
- [[C-Arrays-and-Strings|C 배열과 문자열 (문자 분류)]]
- [[Cpp-Coding-Test-Workflow-IO-and-Strings|C++ 입출력과 문자열 (ROT13 구현)]]
- [[LLM-Application-Security|LLM 애플리케이션 보안 (Spotlighting encoding)]]
