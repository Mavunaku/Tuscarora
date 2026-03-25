const getLocalISODate = (date) => {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - (offset * 60 * 1000));
    return adjusted.toISOString().split('T')[0];
};

const d = new Date(2026, 2, 10);
console.log("Input:", d);
console.log("Output:", getLocalISODate(d));
