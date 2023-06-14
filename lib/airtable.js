const axios = require('axios');

const AIRTABLE = {
    createRecords: async (records, fromError = false) => {
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'records';

        const errorList = [];
        let geo = '';
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            try {
                geo = record.geo;
                await axios.post(
                    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`,
                    {
                        fields: record
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                // console.log('Record created:', response.data);
            } catch (err) {
                errorList.push(record);
                console.log(
                    'Error:',
                    record.geo,
                    record.title,
                    fromError ? `*** ${geo} ***\t` : '\t',
                    err.response?.status,
                    err.response?.statusText
                );
            }
            // Delay for 3 seconds
            await delay(3000);
        }

        console.log('Total errors: ===> ', errorList.length);
        if (errorList.length) {
            await AIRTABLE.createRecords(errorList, true);
        }
    }
};
module.exports = AIRTABLE;
