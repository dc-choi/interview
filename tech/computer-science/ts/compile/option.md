# 컴파일러 옵션
include: 이 안의 내용은 컴파일러가 모두 읽어들인다.

### compilerOptions 설정
target: 컴파일러가 변환할 ECMAScript의 버전
module: 모듈 시스템을 설정
outDir: 컴파일된 파일을 저장할 디렉토리
strict: 모든 엄격한 타입 검사를 활성화
moduleDetection: TS는 기본적으로 글로벌 모듈이다. 그에 따른 글로벌, 개별 모듈 감지 방법을 설정
skipLibCheck: 타입 정의 파일을 검사하지 않음

### ts-node
esm: esm을 사용하여 ts-node를 실행
