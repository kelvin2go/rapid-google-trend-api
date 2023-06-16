const DAY = {
    getCurrentTime: () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}:${seconds}`;
        return currentTime;
    },
    modifyDate: (date, days) => {
        const modifiedDate = new Date(date);
        modifiedDate.setDate(modifiedDate.getDate() + days);
        return modifiedDate;
    },
    formatDate: (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    },
    currentDate: (dayAdjust = 0) => {
        const today = new Date();
        const modifiedDate = DAY.modifyDate(today, dayAdjust); // Add 1 day: To subtract a day, use -1 instead
        return DAY.formatDate(modifiedDate);
    },
    /*
    const startDate = "2022-01-01";
    const endDate = "2023-06-13";
    const dates = listDatesInRangeReverse(startDate, endDate);
    */
    listDatesInRangeReverse (startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates = [];
        let currentDate = new Date(end);

        while (currentDate >= start) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            dates.push(formattedDate);

            currentDate.setDate(currentDate.getDate() - 1);
        }
        return dates;
    }
};
module.exports = DAY;
