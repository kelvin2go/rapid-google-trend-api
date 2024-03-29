
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
    organization: 'org-5anJJrCkeppL2Bo9PfBW1c36',
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const Chat = async ( text ) => {
    // console.log(text, process.env.OPENAI_API_KEY);
    const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt: text,
        temperature: 0.7,
        max_tokens: 160,
        top_p: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0,
    });
    console.log(response.data.error);
    return response.data?.choices[0].text;
};
module.exports = {
    Chat
};
