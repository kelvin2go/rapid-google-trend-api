const express = require('express');
const { GoogleAuth } = require('google-auth-library');
const TTSRouter = express.Router();
const OPENAI = require('./chatGPT');
const LANGUAGES = require('../data/languages.json');
const LANGUAGES_CODE_ONLY = Object.keys(LANGUAGES);
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const { Readable } = require('stream');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

TTSRouter.get('/speech/lang', function (req, res) {
    return res.json(LANGUAGES);
});

async function textToSpeech (text) {
    const googleAuth = new GoogleAuth({
        projectId: process.env.GA_PROJECT_ID,
        credentials: {
            client_email: process.env.GA_EMAIL,
            private_key: process.env.GA_PK.replaceAll('\\n', '\n'),
        }
    });
    console.log(process.env);
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
};
TTSRouter.get('/speech', async function (req, res) {
    if (!req.query?.text || isEmpty(req.query.text)) {
        return res.status(422).send({ error: 'Missing text' });
    }

    const form = {
        lang: req.query?.lang || 'en-us',
        text: req.query.text,
        speed: req.query?.speed || null,
    };

    if (!LANGUAGES_CODE_ONLY.includes(form.lang)){
        return res.status(422).json( { error: `${form.lang} is not a supported lang. please check \`/speech/lang\`.` });
    }
    try {
        if (req.query?.voice === 'male') {
            const response = await textToSpeech(form.text);
            res.set('Content-Type', 'audio/mpeg');
            const audioBuffer = response.audioContent;
            const audioStream = Readable.from(audioBuffer);
            audioStream.pipe(res);
        } else {
            var gtts = require('node-gtts')(form.lang);
            // Generate audio using node-gtts
            const gttsStream = gtts.stream(form.text);
            if (form.speed) {
                const command = ffmpeg()
                    .input(gttsStream)
                    .audioFilters(`atempo=${form.speed}`)
                    .format('mp3');
                command.pipe(res, { end: true });
                // command.stdin.end(form.text);
            } else {
                // No speed adjustment needed, pipe the original audio to the response
                gttsStream.pipe(res);
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

TTSRouter.get('/speech/ai', async function (req, res) {
    if (!req.query?.text || isEmpty(req.query.text)) {
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
});

module.exports = { TTSRouter };
