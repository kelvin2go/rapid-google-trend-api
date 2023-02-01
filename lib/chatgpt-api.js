const Chat = async function (text) {
    const { ChatGPTAPI, getOpenAIAuth } = await import('chatgpt')
    const openAIAuth = await getOpenAIAuth({
        email: process.env.OPENAI_EMAIL,
        password: process.env.OPENAI_PASSWORD
    })
    const api = new ChatGPTAPI({ ...openAIAuth })
    await api.initSession()

    const result = await api.sendMessage(text.text)
    console.log(result.response)
    return result.response;
}

module.exports = {
    Chat
};
