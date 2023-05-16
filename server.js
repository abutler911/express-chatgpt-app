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

  if (!subject || !tone || !keywords || !samplePost) {
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
      prompt: generatePrompt(
        subject,
        tone,
        keywords,
        samplePost,
        postLength,
        hashtags,
        useEmojis
      ),
      temperature: 0.6,
      max_tokens: 100,
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

function generatePrompt(
  subject,
  tone,
  keywords,
  samplePost,
  postLength,
  hashtags,

  useEmojis
) {
  const keywordList = keywords.split(",").map((kw) => kw.trim());
  const hashtagsList = hashtags.split(",").map((ht) => ht.trim());

  const words = samplePost.split(" ");
  const generatedPost = [];

  for (let i = 0; i < postLength; i++) {
    generatedPost.push(words[i % words.length]);
  }

  return `Generate an Instagram post with the following details:
    
      Subject: ${subject}
      Tone: ${tone}
      Keywords: ${keywordList.join(", ")}
      Post Length: ${postLength} words
      Hashtags: ${hashtagsList.join(", ")}
      
      Use Emojis: ${useEmojis}
      
      Sample Post: ${samplePost}
      
      Your Post: ${generatedPost.join(" ")}`;
}

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is up on port ${PORT}...`);
});
