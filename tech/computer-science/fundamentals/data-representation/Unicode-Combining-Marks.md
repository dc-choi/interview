---
tags: [cs, unicode, combining-mark, grapheme, text-rendering, input-validation]
status: done
verified_at: 2026-11-14
category: "CS - 기초"
aliases: ["Unicode Combining Marks", "결합 문자", "Zalgo 텍스트", "Zalgo Text"]
---

# 결합 문자와 무한히 쌓이는 텍스트

Unicode의 결합 문자(combining character)는 앞에 오는 기본 문자에 붙어 하나의 글자처럼 그려지는 문자다. 악센트, 발음 구별 기호 같은 결합 부호를 기본 문자 뒤에 이어 저장하며, 한 기본 문자 뒤에 올 수 있는 결합 문자의 개수를 표준이 제한하지 않는다. 이 성질을 이용해 한 글자 위아래로 부호를 수십, 수백 개 쌓아 줄 밖으로 번지게 만든 문자열을 흔히 Zalgo 텍스트라고 부른다. 표준의 결함이 아니라 정상적인 문자 시퀀스이므로, 입력을 받는 쪽이 개수와 표시 범위를 정해야 한다.

## 동작 원리

- **저장 순서**: 결합 문자는 적용 대상인 기본 문자 뒤에 저장한다. `e` 뒤에 U+0301(COMBINING ACUTE ACCENT)을 두면 `é`처럼 보인다.
- **개수 제한 없음**: 표준은 기본 문자 뒤에 오는 결합 문자의 수를 제한하지 않는다.
- **쌓는 방향**: 기본 동작으로는 같은 위치(위 또는 아래)에 붙는 결합 부호가 여러 개면 저장 순서대로 기본 문자에서 바깥쪽으로 쌓는다. 위쪽 부호는 위로, 아래쪽 부호는 아래로 뻗으므로 부호가 많을수록 글자가 줄 높이를 넘어 위아래 줄을 덮을 수 있다. 일부 문자 체계는 특정 부호 조합을 가로로 배치하며, 실제 배치는 글꼴과 렌더링 엔진에 따라 달라진다.
- **한 글자로 세어짐**: UAX #29의 확장 grapheme cluster는 기본 문자와 뒤따르는 결합 부호를 한 단위로 묶는다. UAX #29는 grapheme cluster의 크기에 제한이 없다고 명시한다. 부호를 수백 개 붙여도 사용자 표시 단위로는 한 글자다.

```js
const acute = String.fromCodePoint(0x0301); // COMBINING ACUTE ACCENT
const zalgo = "a" + acute.repeat(200);
zalgo.length; // 201 (UTF-16 code unit)
[...new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(zalgo)].length; // 1
```

## 왜 UI를 깨뜨리는가

글자 수 제한을 grapheme 기준으로만 두면 위 문자열은 한 글자로 통과한다. 화면에서는 부호의 그림이 줄 상자 밖으로 넘쳐(CSS의 ink overflow) 이웃 줄, 버튼과 다른 사용자의 댓글을 덮는다. 레이아웃 계산은 줄 높이를 기준으로 하므로 넘친 그림이 다른 요소를 밀어내지 않고 겹쳐 그려진다.

정규화로는 해결되지 않는다. NFC는 미리 합성된 문자가 있는 조합만 합치고, 대응하는 합성 문자가 없는 부호는 개수가 줄지 않고 남는다(순서는 정준 순서로 바뀔 수 있다).

## 방어 방법

| 방법 | 근거 | 주의할 점 |
|---|---|---|
| 연속 비간격 부호 수 제한 | UTS #39는 식별자 스푸핑 탐지를 보강하는 선택 검사로 비간격 부호(gc=Mn, Me)가 4개를 넘는 시퀀스와 같은 부호의 반복을 금지하는 방법을 제시한다 | 식별자용 기준을 자유 텍스트에 빌려 쓰는 것이다. 여러 부호가 정상인 문자 체계가 있으므로 허용 언어와 필드 용도에 맞춰 한도를 정한다 |
| Stream-Safe Text Format | UAX #15는 정규화 버퍼를 제한하려고 30개를 넘는 non-starter 시퀀스 사이에 U+034F(COMBINING GRAPHEME JOINER)를 넣는 형식을 정의한다 | 정규화 구현의 버퍼 보호용이다. 화면 깨짐을 막는 장치로 보지 않는다 |
| 길이 제한 단위를 함께 둠 | grapheme 크기에 제한이 없으므로 UAX #29는 데이터 크기 제한이 필요하면 grapheme 수나 단어 수 제한과 데이터 크기 제한을 함께 쓰라고 권한다. 예로 grapheme 300개와 UTF-8 3000 byte를 동시에 제한하는 폼을 든다 | grapheme 수만 세지 말고 code point 수나 UTF-8 byte 수 상한도 둔다 |
| 표시 영역 잘라 내기 | 사용자 입력을 그리는 영역에 `overflow: clip` 같은 넘침 처리를 둔다 | 저장과 검증을 대신하지 않는다. 알림, 메일 제목처럼 다른 화면에서 다시 그려지는 경로도 확인한다 |

```js
// UTS #39 선택적 탐지와 같은 기준: 비간격 부호가 5개 이상 연속이면 거부
const tooManyMarks = /[\p{Mn}\p{Me}]{5,}/u;
tooManyMarks.test(zalgo); // true
```

## 운영 체크포인트

- 닉네임, 제목처럼 여러 사람에게 노출되는 짧은 필드는 허용 문자 집합과 연속 부호 한도를 함께 정한다.
- 길이 계약은 byte, code unit, code point, grapheme 중 무엇인지 명시한다([[JavaScript-Numbers-Strings-and-Regular-Expressions|JavaScript 문자열 단위]]).
- 서버 검증과 화면 방어를 둘 다 둔다. 이미 저장된 데이터와 다른 클라이언트가 쓴 데이터는 서버 검증을 거치지 않았을 수 있다.
- 결합 부호(gc=M) 제거를 일괄 적용하면 데바나가리의 모음 부호와 virama, 방점을 찍은 옛한글 표기, NFD로 분해된 악센트 문자 같은 정상 텍스트가 깨질 수 있다. 제거보다 거부나 표시 제한을 먼저 검토한다.

## 출처

- [Unicode Standard 18.0, Chapter 2 General Structure](https://www.unicode.org/versions/Unicode18.0.0/core-spec/chapter-2/)
- [Unicode, UAX #29 Unicode Text Segmentation](https://www.unicode.org/reports/tr29/)
- [Unicode, UAX #15 Unicode Normalization Forms](https://www.unicode.org/reports/tr15/)
- [Unicode, UTS #39 Unicode Security Mechanisms](https://www.unicode.org/reports/tr39/)
- [MDN, Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)
- [W3C, CSS Overflow Module Level 3](https://www.w3.org/TR/css-overflow-3/)

## 관련 문서

- [[Digital-Fundamentals|디지털 기초의 문자 인코딩]]
- [[JavaScript-Numbers-Strings-and-Regular-Expressions|JavaScript 숫자, 문자열과 정규표현식]]
- [[JavaScript-RegExp-Unicode-and-Matches|정규표현식의 Unicode와 매치 위치]]
- [[Java-Character-Encoding-and-Charset|Java 문자 인코딩과 Charset]]
