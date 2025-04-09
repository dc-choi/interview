function transformDateFormat(dates) {
    const results = [];

    for (const date of dates) {
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(date)) {
            // "2010/02/20" -> "20102002"
            const [y, m, d] = date.split('/');
            results.push(`${y}${d}${m}`);
        } else if (/^\d\s\d{3}p\s\d{2}p\s\d{2}$/.test(date)) {
            // "2 016p 19p 12" -> "20161912"
            const cleaned = date.replace(/p/g, '').replace(/\s/g, '');
            results.push(cleaned);
        } else if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
            // "11-18-2012" -> "20211812"
            const [m, d, y] = date.split('-');
            results.push(`${y}${d}${m}`);
        }
    }

    return results;
}

const dates = transformDateFormat(["2010/02/20", "2 016p 19p 12", "11-18-2012", "2018 12 24", "20130720"]);
console.log(dates)