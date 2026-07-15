enum Flavor1 {
    Vanilla,
    Chocolate,
    Strawberry,
}

enum Flavor2 {
    Vanilla = 'Vanilla',
    Chocolate = 'Chocolate',
    Strawberry = 'Strawberry',
}

type Flavor3 = 'Vanilla' | 'Chocolate' | 'Strawberry';

const enum Flavor4 {
    Vanilla,
    Chocolate,
    Strawberry,
}

const enum Flavor5 {
    Vanilla = 'Vanilla',
    Chocolate = 'Chocolate',
    Strawberry = 'Strawberry',
}

const Flavor6 = {
    Vanilla: 'Vanilla',
    Chocolate: 'Chocolate',
    Strawberry: 'Strawberry',
} as const;
type FlavorKeys = keyof typeof Flavor6;
type FlavorType = typeof Flavor6[FlavorKeys];

const flavor1: Flavor1 = Flavor1.Vanilla;
const flavor2: Flavor2 = Flavor2.Vanilla;
const flavor3: Flavor3 = 'Vanilla';
const flavor4: Flavor4 = Flavor4.Vanilla;
const flavor5: Flavor5 = Flavor5.Vanilla;
const flavor6: FlavorType = 'Vanilla';

Object.entries(Flavor1).forEach(([key, value]) => {console.log(key, value)});
Object.entries(Flavor2).forEach(([key, value]) => {console.log(key, value)});

// TS2693: Flavor3 only refers to a type, but is being used as a value here.
// Object.entries(Flavor3).forEach(([key, value]) => {console.log(key, value)});

// TS2475: const enums can only be used in property or index access expressions or the right hand side of an import declaration or export assignment or type query.
// Object.entries(Flavor4).forEach(([key, value]) => {console.log(key, value)});
// Object.entries(Flavor5).forEach(([key, value]) => {console.log(key, value)});

Object.entries(Flavor6).forEach(([key, value]) => {console.log(key, value)});
