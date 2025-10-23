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
    // Step 1: Search YouTube
    const ytResult = await ytSearch(query);
    if (!ytResult || !ytResult.videos || !ytResult.videos.length) {
      return res.json({ success: false, message: "No YouTube video found" });
    }

    const firstVideo = ytResult.videos[0];
    const songTitle = firstVideo.title;

    // Step 2: Search Genius page via Google search
    const geniusSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(songTitle + " site:genius.com")}`;
    const googlePage = await axios.get(geniusSearchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const $ = cheerio.load(googlePage.data);
    let geniusLink = "";
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("genius.com") && !href.includes("google.com")) {
        const match = href.match(/\/url\?q=(.*?)&/);
        if (match && match[1]) {
          geniusLink = decodeURIComponent(match[1]);
          return false; // break loop
        }
      }
    });

    if (!geniusLink) return res.json({ success: false, message: "No Genius page found" });

    // Step 3: Scrape lyrics from Genius page
    const page = await axios.get(geniusLink, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    const $$ = cheerio.load(page.data);
    let lyrics = "";
    $$('div[data-lyrics-container="true"]').each((i, el) => {
      lyrics += $$(el).text() + "\n";
    });

    res.json({
      success: true,
      title: songTitle,
      lyrics: lyrics.trim(),
      youtubeUrl: firstVideo.url,
      author: "MinatoCode"
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Lyrics API running on http://localhost:${port}`);
});
                                 
