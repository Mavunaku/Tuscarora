const getLocalISODate = (date) => {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - (offset * 60 * 1000));
    return adjusted.toISOString().split('T')[0];
};

const currentDate = new Date();
const startOfCentralWeek = new Date(currentDate);
startOfCentralWeek.setDate(currentDate.getDate() - currentDate.getDay());
const startOfThreeWeeks = new Date(startOfCentralWeek);
startOfThreeWeeks.setDate(startOfCentralWeek.getDate() - 7);

for (let i = 0; i < 21; i++) {
    const d = new Date(startOfThreeWeeks);
    d.setDate(startOfThreeWeeks.getDate() + i);
    const dateStr = getLocalISODate(d);
    const bStartDate = "2026-03-10";
    const bEndDate = "2026-03-12";
    const isHighlighted = (dateStr >= bStartDate && dateStr < bEndDate);
    if (isHighlighted) {
        console.log(`Column ${d.getDate()} (${dateStr}) is HIGHLIGHTED.`);
    }
}
