function sortByMarksDescending(jsonString) {
    const parsedData = JSON.parse(jsonString);

    parsedData.sort((a, b) => {
        if (a.mark < b.mark) return 1;
        else if (a.mark > b.mark) return -1;
        else return a.name > b.name ? 1 : -1;
    });

    return JSON.stringify(parsedData);
}

console.log(sortByMarksDescending('[{"name": "John", "mark": 85}, {"name": "Alice", "mark": 85}, {"name": "Bob", "mark": 85}]'));