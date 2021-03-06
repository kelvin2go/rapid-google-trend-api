const compression = require('compression');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(compression());

const { GoogleTrendRouter } = require('./lib/googleTrend');
const { TTSRouter } = require('./lib/textToSpeech');

app.get('/', (req, res) => {
  res.send(
    'This is kelvin rapid api! Github: <a href="https://github.com/kelvin2go">Kelvin2go</a>'
  );
});

app.use('/gt', GoogleTrendRouter);
app.use('/googletrend', GoogleTrendRouter);
app.use('/tts', TTSRouter);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
