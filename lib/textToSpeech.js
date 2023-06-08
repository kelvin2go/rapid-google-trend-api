const express = require('express');
const { GoogleAuth } = require('google-auth-library');
const TTSRouter = express.Router();
const OPENAI = require('./chatGPT');
const LANGUAGES = require('../data/languages.json');

const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const { Readable } = require('stream');

TTSRouter.get('/speech/lang', function (req, res) {
    return res.json(LANGUAGES);
});

async function textToSpeech(text) {
    const googleAuth = new GoogleAuth({
        projectId: process.env.GA_PROJECT_ID,
        credentials: {
            client_email: process.env.GA_EMAIL,
            private_key: process.env.GA_PK.replaceAll('\\n', '\n'),
        }
    });
    const textToSpeechClient = new TextToSpeechClient({
        auth: googleAuth
    });
    const request = {
        input: { text },
        voice: { name: 'en-US-Neural2-J', languageCode: 'en-US' },
        audioConfig: { audioEncoding: 'LINEAR16' },
    };
    try {
        const [response] = await textToSpeechClient.synthesizeSpeech(request);
        return response;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// ** tts ** //
const isEmpty = function (str) {
    return (!str || str.length === 0);
}
TTSRouter.get('/speech', async function (req, res) {
    if (!req.query.hasOwnProperty('text') || isEmpty(req.query.text)) {
        return res.status(422).send({ error: 'Missing text' });
    }
    const form = {
        lang: req.query?.lang || 'en-us',
        text: req.query.text,
    };
    try {
        if (req.query?.voice === 'male') {
            const response = await textToSpeech(form.text);
            res.set('Content-Type', 'audio/mpeg');
            const audioBuffer = response.audioContent;
            const audioStream = Readable.from(audioBuffer);
            audioStream.pipe(res);
        } else {
            var gtts = require('node-gtts')(form.lang);
            res.set({ 'Content-Type': 'audio/mpeg' });
            gtts.stream(form.text).pipe(res);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

TTSRouter.get('/speech/ai', async function (req, res) {
    if (!req.query.hasOwnProperty('text') || isEmpty(req.query.text)) {
        return res.status(422).send({ error: 'Missing text' });
    }
    const form = {
        lang: req.query?.lang || 'en-us',
        text: req.query.text,
    };
    // console.log(form)
    try {
        const result = await OPENAI.Chat(form.text);
        var gtts = require('node-gtts')(form.lang);
        res.set({ 'Content-Type': 'audio/mpeg' });
        gtts.stream(result).pipe(res);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
})

module.exports = { TTSRouter };
