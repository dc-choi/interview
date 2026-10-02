---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Type information programmatic API와 모델"]
---

# Type information programmatic API와 모델

## API 입력과 출력

expo-type-information은 CLI 외 JavaScript API를 제공한다. input은 absolute source file path 또는 Swift source string/language 옵션이며 app/module path에 의존하는 기능은 해당 project context가 필요하다.

| API | 반환 계약 |
|---|---|
| getFileTypeInformation(options) | Promise<FileTypeInformation 또는 null> |
| serializeTypeInformation(info) | Set/Map을 array 형태로 JSON 직렬화 |
| deserializeTypeInformation(serialized) | 역변환하여 Set/Map 모델 복원 |
| generateConciseTsInterface(...) | moduleTypescriptInterfaceFileContent, volatileGeneratedFileContent |
| generateFullTsInterface(...) | indexFile, moduleNativeFile, moduleTypesFile, moduleViewsFiles 또는 null |
| generateJSXIntrinsicsFileContent(...) | Promise<string 또는 null> |
| generateModuleTypesFileContent(...) | Promise<string 또는 null> |
| generateViewTypesFileContent(...) | Promise<string 또는 null> |
| generateMocks(files,outputLanguage?) | Promise<void>, 기본 JS 또는 TS 선택 |
| getAllExpoModulesInWorkingDirectory() | Promise<FileTypeInformation[]> |

Full interface의 OutputFile에는 name/content가 있다. getFileTypeInformation 옵션은 Unicode character mapping과 inference mode를 포함하며 preprocessing 시 temporary source가 만들어질 수 있다. withPreparedSingleFile는 single-file preparation용 React helper로 GetFileTypeInformationOptions를 사용한다.

## FileTypeInformation 구조

- declaredTypeIdentifiers와 usedTypeIdentifiers: 선언/사용 타입 Set.
- inferredTypeParametersCount, typeIdentifierDefinitionMap: 타입 parameter와 definition Map.
- moduleClasses, enums, records: source에서 읽은 declaration arrays.
- ModuleClassDeclaration: name과 declaration offset, functions, asyncFunctions, constants, properties, constructor, classes, events, props, views.
- FunctionDeclaration: args/name/isStatic/typeParameters/returnType. Constructor는 args를 가진다.
- Constant/property: name/type. Prop: arguments. Record: fields. Enum: name/cases/stringBacked.

DefinitionOffset은 async parsing 결과를 source 순서로 정렬하는 기준이다. JS Map/Set을 JSON object라고 가정하면 순서/구조를 잃을 수 있으므로 제공 serializer를 사용한다.

## 타입 모델

Type kind는 BASIC, IDENTIFIER, SUM, PARAMETRIZED, OPTIONAL, ARRAY, DICTIONARY다. BasicType은 ANY, STRING, NUMBER, BOOLEAN, VOID, UNDEFINED, UNRESOLVED를 나타낸다. IdentifierKind는 BASIC, ENUM, RECORD, CLASS다. 단순 string type name만으로 optional, array nesting과 enum backing을 모두 보존할 수 없다.

## 한계와 사용 정책

이 API는 compiler의 전체 semantic/type checker를 대신하지 않는다. Swift에서 inference가 성공해도 Kotlin signature, module registration, native dependency와 runtime event는 별도 확인한다. unknown/unresolved type을 임의 any로 넓혀 성공처럼 기록하지 않는다. source preprocessing에 민감한 코드는 raw/preprocessed output을 비교한다.

mock 생성은 JS 호출 계약 테스트를 돕지만 native 구현을 실행하지 않는다. generated result를 stable public API로 채택하려면 실제 wire values, null/undefined, event callback payload와 native function queue 계약을 검토한다.

## 출처

- [Expo Documentation, Type generation reference](https://docs.expo.dev/modules/type-generation-reference/)
- [Expo Documentation, Type generation tutorial](https://docs.expo.dev/modules/type-generation-tutorial/)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
