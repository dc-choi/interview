---
tags: [palantir, foundry, fusion]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Fusion 함수의 배열, 수치, 날짜 계약

## 배열과 참조

array는 입력을 한 cell의 배열로 만들고 array_flatten은 nested array/range를 좌→우, row 순으로 펼치며 range의 empty/error를 건너뛴다. concat/concat_ws도 collection을 재귀적으로 펼친다. difference/intersection은 unique 결과이고 순서를 보장하지 않는다. array_distinct는 순서와 fuzzy/exact tag를 보존하지 않는다. array_zip은 가장 짧은 입력 길이까지만 묶는다.

array_get_at_index와 slice는 1-based다. slice 양끝은 inclusive이며 start=0 또는 length 초과면 empty, end=0/초과면 끝까지, 음수는 뒤에서의 offset이다. array_sort는 기본 ascending이며 FALSE 또는 DESC가 descending이다. get_first/get_last/length/contains로 구조를 확인한다.

index(range,row,column)는 1-based이며 row=0은 전체 column, column=0은 전체 row, 둘 다0이면 전체 range다. match의 0은 첫 exact, 1은 ascending에서 <= 중 최대, -1은 descending에서 >= 중 최소다. vlookup/hlookup은 첫 column/row에서 검색해 지정 column/row를 반환한다. relative/absolute cell reference를 복제할 때 경계와 정렬 조건을 확인한다.

## 수치와 통계

abs/ceil/floor/round/exp/pow/sqrt/cbrt/ln/log/factorial과 삼각함수를 제공하며 inverse trig는 radians를 반환한다. ln은 0 이하에서 error다. avg/mean/median/min/max, count/count_numeric/count_distinct/countif/countifs, sum/sum_distinct/product, variance/stddev와 population _p variants를 구분한다. percentile의 pp는0..1이고 0/0.5/1은 min/median/max다. rank는 non-numeric을 무시하고 sortOrder=0 descending, 나머지 ascending이다. 문서 rank 예제의 순위 설명은 이 규칙과 맞지 않아 실제 값으로 검사한다.

sum_product는 같은 dimensions를 요구하고 non-numeric을0으로 본다. sumif/sumifs도 criteria와 sum range 크기가 같아야 한다. subtotal은 nested subtotal을 제외한다. codes1..11(또는101..111)은 AVG,COUNT_NUMERIC,COUNT,MAX,MIN,PRODUCT,STDDEV,STDDEV_P,SUM,VARIANCE,VARIANCE_P다.

## 문자열, null과 날짜

coalesce는 첫 non-null, isNull은 null/empty cell, empty_cell은 빈 결과다. IF/iferror로 조건/오류 경로를 만든다. 문자열 변환에는 lower/upper/case_toggle, trim/ltrim/rtrim, left/right/substring/find/length, pad/reverse/regexp_replace를 쓴다. split/split_regex는 empty fragment를 버린다. find와 substring index는1-based다. left/right 예제는 서로 바뀌어 있으므로 설명과 실제 함수를 대조한다. format_number/format_string는 signature의 number 표기와 달리 설명상 string 결과다. MD5/SHA1은 digest이며 보안용 비밀번호 저장 설계로 일반화하지 않는다. binary는 각 숫자의 하위 unsigned byte만 사용한다.

date/timestamp는 year<1900을1900 offset으로 본다. date_add/sub는 day의 소수 부분을 허용한다. date_diff는 설명의 start→end와 음수 예제가 충돌하므로 부호를 직접 확인한다. parse_date/parse_timestamp는 여러 format을 순서대로 시도하며 Java DateTimeFormatter pattern을 따른다. to_unix_timestamp는 seconds가 아니라 epoch milliseconds다. datepicker precision은 NONE/MINUTE/SECOND다. day/month/year/quarter/week 추출 및 last_day를 지원한다. net_workdays는 holidays 인자를 signature에 두지만 지원하지 않는다고 명시하며 workday는 holidays를 지원한다.

## 고급 API의 안정성

experimental_* tag/range/error/copy-and-sync/io-blocking, object/object_set/object_dropdown, compute_on_trigger 및 action.dropdown/submit_options는 experimental이다. internal_region_result는 내부용이다. deprecated lookup_set/set_get_any/set_to_array를 신규 설계의 기본으로 쓰지 않는다. get_object_rid/type_id/get_property, document_metadata creator/document_identifier는 식별 정보를 얻는다. URL 구성은 url_encode/query_params로 escape한다.

Action label/trigger/open_url/open_markdown_panel/toast/plugin은 UI 실행을 구성한다. serial은 실패 branch를 명시할 수 있고 success/fail은 no-op 결과다. action.dropdown의 before-change Action은 새 선택 저장 전에 실행되며 serial/parallel 안에 중첩할 수 없다. compute_on_trigger는 dependency로 세지 않는 lazy 실행이므로 재계산 의존성을 따로 확인한다.

submit_to_region_with_key 계열의 lazy variant는 클릭 때 값을 계산하고 target region 정보를 cache한다. timestamp variant와 positional 인자를 구분한다. submit_options의 submitEmptyCells는 빈값 덮어쓰기, succeedWhenNoRows는 제출 row가 없을 때 성공 처리다. with_options 예제에 options 인자가 빠진 부분과 lazy 예제의 여분 time 인자는 signature와 대조해야 한다.

## 출처

- [Palantir, function-library](https://www.palantir.com/docs/foundry/fusion/function-library)

## 관련 문서

- [[Palantir-Fusion-Submission-and-Sync]]
- [[Palantir-Fusion-Charts-and-Time-Series]]
