---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Spark SQL transform의 문법과 값 의미"]
---

# Spark SQL transform의 문법과 값 의미

SQL transform은 Code Repositories의 Spark SQL transformation이고 SQL Studio interactive query와 다르다. Foundry SQL transform은 incremental을 지원하지 않는다. SQL warehouse/외부 engine의 dialect를 이 API와 동일하다고 보지 않는다.

## 문법과 version 문맥

Reference는 CREATE TABLE … AS SELECT 형식, dataset path backtick, 문장 끝 semicolon 금지를 요구한다. Dataset/column/alias는 case-sensitive로 설명하고 derived expression에 alias를 요구한다. WHERE/GROUP BY에서는 expression을 다시 쓰고 ORDER BY/HAVING에서는 alias를 허용한다고 명시한다.

이는 Foundry 문서의 특정 authoring contract다. Reference는 HiveQL/SimpleDateFormat과 Java/Scala Column signature를 섞어 제시하고 cast 실패를 null로 설명한다. 최신 Spark ANSI 설정과 parser/runtime 차이를 확인하지 않은 채 모든 SQL 환경에 적용하지 않는다.

## Null, aggregation과 row 변화

COALESCE는 첫 nonnull, NULLIF는 equal일 때 null, ISNULL과 ISNAN은 각각 missing/NaN을 구분한다. GREATEST/LEAST는 최소 두 인자와 null skip, 전부null이면 null이다. FIRST/LAST의 ignoreNulls는 별도 옵션이며 order가 없는 aggregate의 대표값을 업무상 최초/최후라고 추정하지 않는다.

COLLECT_LIST는 중복, COLLECT_SET은 distinct를 보존하며 COUNT(expression)은 input row 총수와 null 처리를 구분해야 한다. Variance/STDDEV는 sample 계열 alias이고 population은 _POP으로 나뉜다. Approx-count-distinct의 rsd 기본값은0.05라고 명시한다. 목록의 APPROX_COUNT_DISTINCT와 signature APPROXCOUNTDISTINCT 표기가 달라 실제 parser 이름을 확인해야 한다.

EXPLODE/POSEXPLODE/JSON_TUPLE은 행수를 늘릴 수 있고 MAP/STRUCT/ARRAY는 타입 구조를 만든다. Lag/Lead는 window의 앞뒤 row와 default/null을 반환하므로 deterministic order와 partition을 명시한다.

## 문자열, 숫자와 시간

INSTR는 1-based이며 no-match0, regex-extract는 no-match empty string이다. Split은 regex, substring의 binary 입력은 byte slice다. Encode/decode와 Base64는 binary/string을 바꾸는 계약이며 표시된 base64 문자열을 그대로 내용으로 혼동하지 않는다.

FORMAT_NUMBER와 BROUND는 HALF_EVEN, FORMAT_NUMBER는 String 결과이며 음수 decimal places면 null이다. ROUND는 별도 함수다. HASH/CRC32와 MD5/SHA1/SHA2의 목적과 output 폭은 다르므로 같은 안정성/보안 속성을 가정하지 않는다.

Date는 시간 없는 yyyy-MM-dd, UNIX_TIMESTAMP/FROM_UNIXTIME는 seconds와 기본 timezone/locale을 쓰므로 milliseconds/UTC와 섞지 않는다. TO/FROM_UTC_TIMESTAMP는 입력 timezone 가정과 변환 방향을 구분한다. Formatting reference의 SimpleDateFormat을 다른 PB DateTimeFormatter와 교환하지 않는다.

ADD_MONTHS는 day를 맞추되 말일/짧은 월은 resulting month말일을 쓴다. MONTHS_BETWEEN는 같은 day/둘 다 말일이면 정수, 그 외8자리 반올림이다. WINDOW는 [start,end), fixed duration과 epoch-origin/offset, slide≤width이며 month 단위 calendar window를 지원하지 않는다. 달력 한 달과 고정 초 수를 같은 window로 계산하지 않는다. SQL compile/query를 실행하지 않았다.

## 출처

- [Palantir transforms-sql, transforms-sql](https://www.palantir.com/docs/foundry/transforms-sql)
- [Palantir transforms-sql, overview](https://www.palantir.com/docs/foundry/transforms-sql/overview)
- [Palantir transforms-sql, spark-reference](https://www.palantir.com/docs/foundry/transforms-sql/spark-reference)

## 관련 문서

- [[Palantir-Code-Transforms]]
