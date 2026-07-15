const panTo = (where: [number, number]) => {
    console.log(`Panning to ${where[0]}, ${where[1]}`);
}
panTo([1, 2]);
// const loc = [1, 2]; // TS2345: Argument of type number[] is not assignable to parameter of type [number, number]
const loc: [number, number] = [1, 2]; // ok
panTo(loc);

const panTo2 = (where: readonly [number, number]) => {
    console.log(`Panning to ${where[0]}, ${where[1]}`);
}
// TS2345: Argument of type readonly [10, 20] is not assignable to parameter of type [number, number]
// The type readonly [10, 20] is readonly and cannot be assigned to the mutable type [number, number]
const loc2 = [10 , 20] as const;
panTo2(loc2);

type Where = readonly [number, number, number];
const panTo3 = (where: Where) => {
    console.log(`Panning to ${where.join(', ')}`);
}
const loc3 = [1, 2, 3] as const;
panTo3(loc3);
