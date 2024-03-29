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
const DAY = require('./day.js');

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

const okGEOMap = {};
okGEO.map( geo => { return okGEOMap[geo] = GEO[geo];} );
console.log('okGeo', okGEOMap);
const _callDailyTrendWithGeo = async (date = false, geo = false) => {
    const trendDate = date ? date : DAY.currentDate(-1);
    console.log('Trying ', trendDate);
    const ok = [];
    const error = [];
    const savedItems = [];
    const GEOMAP = geo ? [geo] : okGEO;
    console.log('DD ', GEOMAP);
    const promises = GEOMAP.map( async (geo) => {
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
                    console.log(`Got trend data ${items.length} on ${ trendDate }: ${ geo }!`);
                    console.log(items.length);
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
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const doneSend = await MONGO.createRecords(savedItems);
        await delay(1000);
        if (doneSend){
            console.log('Done saving ', `${trendDate} #of ${savedItems.length} items.`);
        }
    } catch (err) {
        console.log('Error:', err);
    }
};

//////////////// **** NEW **** //////////////////////////
GoogleTrendRouter.get('/range', async function (req, res) {
    const startDate = '2023-06-10';
    const endDate = '2023-06-14';
    const dates = DAY.listDatesInRangeReverse(startDate, endDate);

    await Promise.all(
        dates.map(async (date) => {
            await _callDailyTrendWithGeo(date, req.query.geo ?? false);
        })
    );
    return res.send(`DONE ${startDate}-${endDate}`);
});

GoogleTrendRouter.get('/corn', async function (req, res) {
    const date = req.query?.date ? req.query.date : DAY.currentDate(-1);
    const geo = req.query?.geo ? req.query.geo : false;
    await _callDailyTrendWithGeo(date, geo);
    return res.send(`current time: ${DAY.getCurrentTime()}  called get daily trend with ${date}`);
});

GoogleTrendRouter.get('/delete', async function (req, res) {
    if (req.query?.date) {
        res.status(500).send({});
    }
    const date = req.query.date.replaceAll('-', '');
    const geo = req.query.geo ?? null;
    try {
        await MONGO.deleteRecordsByDate({
            date,
            ...(geo ? { geo } : null)
        });
        res.send(`Deleted by ${date}`);
    } catch (err){
        // res.status(500).send(err);
        console.log(err);
    }
});

GoogleTrendRouter.get('/daily', async function (req, res) {
    const date = req.query?.date ? req.query.date : DAY.currentDate(-1);
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

GoogleTrendRouter.get('/date-range', async function (req, res) {
    const isValid = queryValidation(req.query, {
        required: ['dateStart', 'dateEnd'],
        malformed: ['geo']
    });
    if (isValid?.error){
        return res.status(422).json(isValid.error);
    }
    const $gte = req.query.dateStart.replaceAll('-', '');
    const $lte = req.query.dateEnd.replaceAll('-', '');
    const form = {
        date: {
            $gte,
            $lte
        },
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

GoogleTrendRouter.get('/last10', async function (req, res) {
    const isValid = queryValidation(req.query, {
        required: ['geo'],
        malformed: ['geo']
    });
    if (isValid?.error){
        return res.status(422).json(isValid.error);
    }
    const $gte = DAY.currentDate(-10).replaceAll('-', '');
    const $lte = DAY.currentDate(-1).replaceAll('-', '');
    const form = {
        date: {
            $gte,
            $lte
        },
        ...req.query?.geo ? { geo: req.query.geo } : null,
    };
    // console.log(form);
    try {
        const result = await MONGO.getRecords(form, { date: -1 });
        if (result){
            res.setHeader('Content-Type', 'application/json');
            res.json(CRAWLER.convertToDisplayItem(result));
            return;
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

GoogleTrendRouter.get('/geomap', async function (req, res) {
    return res.json(okGEOMap);
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

const queryValidation = (query, { required = [], malformed = [] }) => {
    const emptyCheck = (query, key) => {
        const trimmed = query[key].trim().replaceAll('"', '').replaceAll('\'', '');
        return trimmed.length === 0 ? `${key} is empty` : null;
    };
    const requiredCheck = (query, key) => query[key] ? (emptyCheck(query, key) ? `${key} is empty` : null) : `${key} is required`;
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
