enum Flavor {
    Vanilla = 'Vanilla',
    Chocolate = 'Chocolate',
    Strawberry = 'Strawberry',
}

const func = (flavor: Flavor) => {
    console.log(flavor);
};
func(Flavor.Vanilla);
// func('Vanilla'); // string을 string enum으로 다운캐스트해서 사용 X
func('Vanilla' as Flavor); // 타입 단언으로는 가능함.

const func2 = (flavor: string) => {
    console.log(flavor);
};
func2(Flavor.Vanilla); // string enum를 string으로 업캐스트해서 사용 O
func2('Vanilla');

const Flavor2 = {
    Vanilla: 'Vanilla',
    Chocolate: 'Chocolate',
    Strawberry: 'Strawberry',
} as const;
type FlavorKeys = keyof typeof Flavor2;
type FlavorType = typeof Flavor2[FlavorKeys];

const func3 = (flavor: FlavorType) => {
    console.log(flavor);
};
func3('Vanilla');
func3(Flavor2.Vanilla);