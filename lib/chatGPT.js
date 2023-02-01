
require('dotenv').config()

const { Configuration, OpenAIApi } = require("openai");
const model = 'chat-gpt-3';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const Chat = async ( text ) => {
    // console.log(text, process.env.OPENAI_API_KEY);
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: text,
        temperature: 0.7,
        max_tokens: 160,
        top_p: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0,
    });
    // console.log(response.data.error);
    return response.data?.choices[0].text;
}
module.exports = {
    Chat
};
