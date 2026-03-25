const getLocalISODate = (date) => {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - (offset * 60 * 1000));
    return adjusted.toISOString().split('T')[0];
};

const date = new Date(2026, 2, 10, 20, 45, 0); // Mar 10 20:45 Local
const startOfCentralWeek = new Date(date);
startOfCentralWeek.setDate(date.getDate() - date.getDay());
const startOfThreeWeeks = new Date(startOfCentralWeek);
startOfThreeWeeks.setDate(startOfCentralWeek.getDate() - 7);

for (let i = 0; i < 21; i++) {
    const d = new Date(startOfThreeWeeks);
    d.setDate(startOfThreeWeeks.getDate() + i);
    console.log(`Day ${i + 1}:`, d.toString(), "->", getLocalISODate(d), "-> getDate():", d.getDate());
}
