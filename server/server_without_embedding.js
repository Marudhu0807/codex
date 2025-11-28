import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import  OpenAI from 'openai'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Hello from CodeX!'
  })
})

app.post('/', async (req, res) => {
  try {
    const prompt = req.body.prompt;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0,      // How random the output should be - 0 = very predictable, 1 = more creative --> range 0-1
      max_tokens: 3000,    // Maximum number of tokens the model can generate in the response Higher = longer answers, more cost --> range 50-4000 // 1 token ≈ 3–4 characters
      top_p: 1, //nucleus sampling: picks tokens with highest probability-  1 = disabled (take best tokens) --> range 0-1
      frequency_penalty: 0.5, // Penalizes repetition of words -  Positive value reduces repeated lines/phrases --> range 0-2
      presence_penalty: 0 //Encourages talking about new topics - 0 = no penalty/encouragement--> range 0-2
    });

    res.status(200).send({
      bot: response.choices[0].message.content
    });

  } catch (error) {
    console.error(error);
    res.status(500).send(error || 'Something went wrong');
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`AI server started on port ${PORT}`));