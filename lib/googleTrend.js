const express = require('express');
const googleTrends = require('google-trends-api');
const GoogleTrendRouter = express.Router();
const CATEGORY = require('../data/category.json');
const RTCATEGORY = require('../data/realtimeCategory.json');
const GEO = require('../data/geo.json');
const GEO_CODE_ONLY = Object.keys(GEO);
const CACHE = require('./cache.js');
const CRAWLER = require('./gtCrawler.js');
const MONGO = require('./mongoose.js');
const cron = require('node-cron');

const okGEO = [
    'NL', 'SE', 'CO', 'TW', 'NO', 'TH',
    'NG', 'NZ', 'HK', 'AU', 'AT', 'DE',
    'IT', 'BE', 'UA', 'TR', 'ZA', 'VN',
    'US', 'RO', 'CH', 'SA', 'ES', 'DK',
    'CZ', 'JP', 'AR', 'SG', 'BR', 'ID',
    'CL', 'PT', 'PH', 'MY', 'GB', 'RU',
    'EG', 'FI', 'CA', 'GR', 'PE', 'IL',
    'IE', 'MX', 'KE', 'PL', 'HU', 'FR',
    'KR', 'IN'
];

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
    }
};

const _callDailyTrendWithGeo = async (date = false) => {
    const trendDate = date ? date : DAY.currentDate();
    console.log('Trying ', trendDate);
    const ok = [];
    const error = [];
    const savedItems = [];
    const promises = okGEO.map( async (geo) => {
        try {
            const data = await googleTrends.dailyTrends({ trendDate: new Date(trendDate), geo });
            // console.log(data);
            if (data.startsWith('<html')) {
                error.push(geo);
            } else {
                // CACHE.set(cacheKey, JSON.stringify(data));
                ok.push(geo);
                const jsonData = JSON.parse(data);
                if (jsonData?.default?.trendingSearchesDays) {
                    const items = CRAWLER.toSaveItems(jsonData.default.trendingSearchesDays, geo);
                    savedItems.push(...items);
                } else {
                    console.log('JSON ERR ');
                }
            }

        } catch (err) {
            console.log('geo', geo, err);
        }
    });
    try {
        await Promise.all(promises);
        console.log('saved: ', `${trendDate} #of ${savedItems.length} items.`);
        // console.log( savedItems );
        console.log('ok: ', ok);
        console.log('error: ', error);
        const doneSend = await MONGO.createRecords(savedItems);
        if (doneSend){
            console.log('Done saving ', `${trendDate} #of ${savedItems.length} items.`);
        }
    } catch (err) {
        console.log('Error:', err);
    }
};

// corn daily job
cron.schedule('0 12 * * *', _callDailyTrendWithGeo);

//////////////// **** NEW **** //////////////////////////
GoogleTrendRouter.get('/corn', async function (req, res) {
    const date = req.query?.date ? req.query.date : DAY.currentDate(-1);
    _callDailyTrendWithGeo(date);
    return res.send('current time: ', DAY.getCurrentTime(), ' called get daily trend with ', date);
});

GoogleTrendRouter.get('/daily', async function (req, res) {
    const date = req.query?.date ? req.query.date : DAY.currentDate();
    const form = {
        date: date.replaceAll('-', ''),
        ...req.query?.geo ? { geo: req.query.geo } : null,
    };
    // console.log(form);
    try {
        const result = await MONGO.getRecords(form);
        if (result){
            res.setHeader('Content-Type', 'application/json');
            res.json(CRAWLER.convertToDisplayItem(result));
            return;
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

//////////////////////////////////////////
/* not directly for public use endpoint */
GoogleTrendRouter.get('/', function (req, res) {
    return res.send('gt hello');
});

GoogleTrendRouter.get('/category', function (req, res) { // daily
    return res.json(CATEGORY);
});

GoogleTrendRouter.get('/realTimeCategory', function (req, res) {
    return res.json(RTCATEGORY);
});

GoogleTrendRouter.get('/geo', function (req, res) {
    return res.json(GEO);
});

const validateTime = (query) => {
    const nowDate = new Date();
    if(query?.startTime && new Date(query.startTime) > nowDate ){
        return false;
    }
    if(query?.endTime && new Date(query.endTime) > nowDate ){
        return false;
    }
    if(query?.startTime && query?.endTime && (new Date(query.startTime) > new Date(query.endTime))){
        return false;
    }
    return true;
};

const getCached = (form) => {
    try {
        let cacheKey = JSON.stringify(form);
        const cached = CACHE.get(cacheKey);
        // console.log('cachkey' , cacheKey, cached);
        return { cacheKey, cached };
    } catch (err) {
        console.error(err);
    }
    return { cacheKey: 'failed', cached : null };
};

const returnData = (method, data) => {
    if (data.startsWith('<html')){
        return {
            message: `${method} are not available for this region. Try a different region or use daily trend`
        };
    }
    return JSON.parse(data);
};

const queryValidation = (query, { required, malformed }) => {
    const emptyCheck = (query, key) => {
        const trimmed = query[key].trim().replaceAll('"', '').replaceAll('\'', '');
        return trimmed.length === 0 ? `${key} is empty` : null;
    };
    const requiredCheck = (query, key) => query?.key ? (emptyCheck(query, key) ? `${key} is empty` : null) : `${key} is required`;
    const errors = required.map( key => {
        const errMsg = requiredCheck(query, key);
        if ( errMsg ){
            return errMsg;
        }
    }).filter(Boolean);
    if (errors.length > 0) return { error: errors };
    if (query.geo) {
        const error = emptyCheck(query, 'geo');
        if (error) return { error };
    }
    if (malformed.includes('geo') && !GEO_CODE_ONLY.includes(query.geo)) {
        return { error: 'Invalid GEO code. All geo ref api: `/geo`. ' + ` '${query.geo}' is not in list` };
    }
    if (malformed.includes('category') && query?.category && typeof query.category !== 'string' ) {
        return { error: 'Realtime trends category need to be string. ref api: `/realTimeCategory`' };
    }
    if (malformed.includes('time') && !validateTime(query)){
        return { error: 'Time validate fail' };
    }
};
GoogleTrendRouter.get('/dailyTrends', async function (req, res) {
    // console.log(req.query);
    const isValid = queryValidation(req.query, {
        required: ['geo'],
        malformed: ['geo']
    });
    if (isValid?.error){
        return res.status(422).json(isValid.error);
    }

    // if ( isNaN(parseInt(req.query.category))) {
    //     return res.status(422).send({ error: 'daily trends category id need to be int. ref api: `/category`' });
    // }
    const form = {
        trendDate: req.query?.date ? new Date(req.query?.date) : new Date(),
        ...(req.query?.geo ? { geo: req.query.geo.toUpperCase() } : {} ),
        ...(req.query?.category ? { category: parseInt(req.query.category) } : {}),
    };
    // console.log('form', form);
    const { cacheKey, result } = getCached(form);
    if (result){
        res.setHeader('Content-Type', 'application/json');
        res.json(JSON.parse(result));
        return;
    }

    try {
        const data = await googleTrends.dailyTrends(form);
        // console.log(data);
        if (data) {
            CACHE.set(cacheKey, JSON.stringify(data));
            res.setHeader('Content-Type', 'application/json');
            res.json(returnData('Daily Trends ', data));
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

GoogleTrendRouter.get('/realTimeTrends', async function (req, res) {
    // console.log(req.query);
    const isValid = queryValidation(req.query, {
        required: ['geo'],
        malformed: ['geo', 'category']
    });
    if (isValid?.error){
        return res.status(422).json(isValid.error);
    }

    const form = {
        ...(req.query?.geo ? { geo: req.query.geo.toUpperCase() } : {} ),
        ...(req.query?.category ? { category: req.query.category } : { category: 'all' }),
    };
    // console.log('form', form);
    const { cacheKey, result } = getCached(form);
    if (result){
        res.setHeader('Content-Type', 'application/json');
        res.json(JSON.parse(result));
        return;
    }

    try {
        const data = await googleTrends.realTimeTrends(form);
        // console.log('data', data);
        if (data) {
            CACHE.set(cacheKey, JSON.stringify(data));
            res.setHeader('Content-Type', 'application/json');
            res.json(returnData('Real Time Trends', data));
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

GoogleTrendRouter.get('/interestOverTime', async function (req, res) {
    // TODO: geo is optional of string / array
    const isValid = queryValidation(req.query, {
        required: ['keyword'],
        malformed: ['time']
    });
    if (isValid?.error){
        return res.status(422).json(isValid.error);
    }

    if (req.query.keyword?.keyword){
        req.query.keyword = req.query.keyword.keyword;
    }
    //check keyword can be array
    let keywords = ( typeof req.query.keyword === 'object' && req.query.keyword.length > 0 ? `[${req.query.keyword.join(',')}]` : req.query.keyword.toString()).replace(/'/g, '"');
    try {
        keywords = JSON.parse(keywords);
    } catch (err) {
        keywords = req.query.keyword;
    }
    const form = {
        keyword: keywords,
        ...(req.query?.geo ? { geo: req.query.geo.toUpperCase() } : {} ),
        ...(req.query?.category ? { category: parseInt(req.query.category) } : {}),
        ...(req.query?.startTime ? { startTime: new Date((req.query.startTime)) } : {}),
        ...(req.query?.endTime ? { endTime: new Date((req.query.endTime)) } : {} ),
    };
    //  console.log('form1', form);
    //  console.log( keywords );
    const { cacheKey, result } = getCached(form);
    if (result){
        res.setHeader('Content-Type', 'application/json');
        res.json(JSON.parse(result));
        return;
    }
    try {
        const data = await googleTrends.interestOverTime(form);
        if (data) {
            CACHE.set(cacheKey, JSON.stringify(data));
            res.setHeader('Content-Type', 'application/json');
            res.json(returnData('Interest Over Time', data));
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

GoogleTrendRouter.get('/query', async function (req, res) {
    const isValid = queryValidation(req.query, {
        required: ['keyword'],
        malformed: [req.query?.geo ? 'geo' : null, 'time']
    });
    if (isValid?.error){
        return res.status(422).json(isValid.error);
    }
    //check keyword can be array
    if (req.query.keyword?.keyword){
        req.query.keyword = req.query.keyword.keyword;
    }
    //check keyword can be array
    let keywords = ( typeof req.query.keyword === 'object' && req.query.keyword.length > 0 ? `[${req.query.keyword.join(',')}]` : req.query.keyword.toString()).replace(/'/g, '"');
    try {
        keywords = JSON.parse(keywords);
    } catch (err ){
        keywords = req.query.keyword;
    }
    const form = {
        keyword: keywords,
        ...(req.query?.geo ? { geo: req.query.geo.toUpperCase() } : {} ),
        ...(req.query?.category ? { category: parseInt(req.query.category) } : {}),
        ...(req.query?.startTime ? { startTime: new Date((req.query.startTime)) } : {}),
        ...(req.query?.endTime ? { endTime: new Date((req.query.endTime)) } : {} ),
    };
    const { cacheKey, result } = getCached(form);
    if (result){
        res.setHeader('Content-Type', 'application/json');
        res.json(JSON.parse(result));
        return;
    }
    try {
        const data = await googleTrends.relatedQueries(form);
        // console.log(data);
        if (data) {
            CACHE.set(cacheKey, JSON.stringify(data));
            res.setHeader('Content-Type', 'application/json');
            res.json(returnData('Query', data));
        }
    } catch (err) {
        res.status(500).send(err);
    }
});
module.exports = { GoogleTrendRouter };
