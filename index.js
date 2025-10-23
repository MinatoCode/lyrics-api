const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const port = process.env.PORT || 3000;

app.get("/lyrics", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ success: false, message: "No query provided" });

  try {
    // Search Genius
    const searchUrl = `https://genius.com/api/search/multi?per_page=5&q=${encodeURIComponent(query)}`;
    const searchResp = await axios.get(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const hits = searchResp.data.response.sections
      .find(section => section.type === "song")
      ?.hits;

    if (!hits || !hits.length) {
      return res.json({ success: false, message: "No lyrics found" });
    }

    const songUrl = hits[0].result.url;

    // Scrape lyrics
    const page = await axios.get(songUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $ = cheerio.load(page.data);
    let lyrics = "";

    $('div[data-lyrics-container="true"]').each((i, el) => {
      lyrics += $(el).text().trim() + "\n";
    });

    res.json({
      success: true,
      title: hits[0].result.full_title,
      artist: hits[0].result.primary_artist.name,
      lyrics: lyrics.trim(),
      url: songUrl,
      author: "MinatoCode"
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Lyrics API running on http://localhost:${port}`);
});
