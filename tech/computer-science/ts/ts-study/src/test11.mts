// 정상 동작
// const setLanguage = (lang: string) => {
//     console.log(lang);
// }
//
// setLanguage('en');
//
// let lang = 'en';
// setLanguage(lang);

/**
 * 할당 시점에 변수의 타입을 추론함.
 */
type Language = 'en' | 'ko';
const setLanguage = (lang: Language) => {
    console.log(lang);
}

setLanguage('en');

// let lang = 'en'; // 이 방법을 사용하지 않고 아래 방법을 사용
let lang: Language = 'en';
const lang2 = 'en'; // 타입 체커가 더 정확하게 타입 추론.
// setLanguage(lang); // TS2345: Argument of type string is not assignable to parameter of type Language
setLanguage(lang);
setLanguage(lang2);