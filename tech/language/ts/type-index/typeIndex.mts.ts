// 타입 별칭
// 타입 별칭을 선언하는 경우 같은 스코프 내에서 중복 선언이 불가능합니다.
type User = {
    name: string;
    age: number;
    isActive: boolean;
    nickname?: string; // 선택적 속성
    birthday?: Date; // 선택적 속성
    location?: string; // 선택적 속성
};

let user: User = {
    name: "John",
    age: 30,
    isActive: true,
    nickname: "johnny",
    birthday: new Date("1990-01-01"),
    location: "New York"
};

let user2: User = {
    name: "Jane",
    age: 25,
    isActive: false
    // 선택적 속성은 생략 가능
};

// 인덱스 시그니처
// 인덱스 시그니처를 사용하여 객체의 속성을 동적으로 정의할 수 있습니다.
type CountryCodes = {
    [key: string]: string;
};

let countryCodes: CountryCodes = {
    US: "United States",
    CA: "Canada",
    KR: "South Korea",
    JP: "Japan"
};

type CountryNumberCodes = {
    [key: string]: number;
    KR: 82; // 필수 속성
    // CA: string; // 인덱스 시그니처의 타입과 일치해야 합니다.
};

let countryNumberCodes: CountryNumberCodes = {
    US: 840,
    KR: 82,
};