
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
        model: "code-davinci-002",
        prompt: text,
        temperature: 0,
        max_tokens: 64,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: ["\"\"\""],
      });
    console.log(response.data.choices);
    return response.data?.choices[0].text;
}
module.exports = {
    Chat
};
