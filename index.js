const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const ytSearch = require("yt-search");

const app = express();
const port = process.env.PORT || 3000;

app.get("/lyrics", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ success: false, message: "No query provided" });

  try {
    // 1️⃣ Search YouTube
    const ytResult = await ytSearch(query);
    if (!ytResult || !ytResult.videos || !ytResult.videos.length) {
      return res.json({ success: false, message: "No YouTube video found" });
    }
    const firstVideo = ytResult.videos[0];
    const songTitle = firstVideo.title;

    // 2️⃣ Search Genius API
    const geniusRes = await axios.get("https://api.genius.com/search", {
      params: { q: songTitle },
      headers: {
        Authorization: "Bearer BU6n9H0WLGHsBil-32jaUEJK9Ia3ivLnXAF_Yp-sYLi19riuDLecmbW0kp-Hqfbw"
      }
    });

    const hits = geniusRes.data.response.hits;
    if (!hits.length) return res.json({ success: false, message: "No lyrics found" });

    const song = hits[0].result;

    // 3️⃣ Scrape lyrics from Genius page
    const page = await axios.get(song.url);
    const $ = cheerio.load(page.data);
    let lyrics = "";
    $('div[data-lyrics-container="true"]').each((i, el) => {
      lyrics += $(el).text() + "\n";
    });

    res.json({
      success: true,
      artist: song.primary_artist.name,
      title: `${song.primary_artist.name} - ${song.title}`,
      lyrics: lyrics.trim(),
      author: "MinatoCode",
      youtubeTitle: songTitle,
      youtubeUrl: firstVideo.url
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Lyrics API running on http://localhost:${port}`);
});
  
