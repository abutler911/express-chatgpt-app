const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { Configuration, OpenAIApi } = require("openai");
const session = require("express-session");
require("dotenv").config();
const PORT = process.env.PORT;

const app = express();

app.use(express.urlencoded({ extended: true }));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(
  session({
    secret: "mynewapp",
    resave: false,
    saveUninitialized: false,
  })
);

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.get("/", (req, res) => {
  res.render("index", { result: req.session.result || "" });
});

app.post("/generate", async (req, res) => {
  if (!configuration.apiKey) {
    res.status(500).json({
      error: {
        message:
          "OpenAI API key not configured, please follow instructions in README.md",
      },
    });
    return;
  }

  const subject = req.body.subject;
  const tone = req.body.tone;
  const keywords = req.body.keywords;
  const samplePost = req.body.samplePost;

  if (!subject || !tone || !keywords) {
    res.status(400).json({
      error: {
        message: "Please fill in all fields",
      },
    });
    return;
  }

  try {
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: generatePrompt(subject, tone, keywords, samplePost),
      temperature: 0.5,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    req.session.result = completion.data.choices[0].text;
    res.redirect("/");
  } catch (error) {
    if (error.response) {
      console.error(error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      res.status(500).json({
        error: {
          message: "An error occurred during your request.",
        },
      });
    }
  }
});

function generatePrompt(subject, tone, keywords, samplePost) {
  const keywordList = keywords.split(",").map((kw) => kw.trim());

  return `Write an Instagram post about ${subject}, use ${samplePost} as an example and write it in a ${tone} tone, use words like ${keywordList.join(
    ", "
  )}. Make it about 175 words long and make sure and use the word you instead of I, me, or my. Also, include some cool emojis and three to five relevant hashtags.`;
}

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is up on port ${PORT}...`);
});
