const express = require('express');
const TTDRouter = express.Router();

const axios = require('axios');
const he = require('he');

const isEmpty = function (str) {
    return (!str || str.length === 0);
};

async function getWord (text) {
    try {
        const ucs = he.encode(text).toLowerCase().replaceAll('&#x', '').replaceAll(';', '');
        // const API_BASE = `https://stroke-order.learningweb.moe.edu.tw/provideStrokeInfo.do?ucs=${ucs.replaceAll('&#x', '').replaceAll(';', '')}&useAlt=0`;
        const API_BASE = `https://www.twpen.com//bishun-animation/${ucs}-stroke-order.gif`;
        // console.log(API_BASE);
        const response = await axios.get(API_BASE, { responseType: 'arraybuffer' });
        console.log(response.data);
        return response.data;
    } catch (error) {
        return error;
    }
}

TTDRouter.get('/draw', async function (req, res) {
    if (!req.query?.text || isEmpty(req.query.text)) {
        return res.status(422).send({ error: 'Missing text' });
    }
    const form = {
        text: req.query.text,
    };

    try {
        const result = await getWord(form.text);
        if (result instanceof Error) {
            console.error(result);
            return res.status(500).send(result.message);
        }

        // Set the response content type to SVG
        res.setHeader('Content-Type', 'image/gif');

        // Send the SVG content as the response
        res.end(result);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

module.exports = { TTDRouter };
