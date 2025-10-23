const express = require("express");
const axios = require("axios");
const yts = require("yt-search");
const cheerio = require("cheerio");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const GENIUS_TOKEN = process.env.GENIUS_TOKEN || EsrrrqzA8W4NE_xJfs82D_JxUhiFwj6aUNBoZfd2aQC7lmdMmHEjx5gZcq1BG2Kq;

async function getLyricsFromGenius(title, artist) {
  try {
    const searchQuery = `${artist} ${title}`;
    const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(searchQuery)}`;

    const { data } = await axios.get(searchUrl, {
      headers: { Authorization: `Bearer ${GENIUS_TOKEN}` }
    });

    const song = data.response.hits[0]?.result;
    if (!song) return null;

    // Fetch lyrics page HTML
    const page = await axios.get(song.url);
    const $ = cheerio.load(page.data);

    // Extract plain lyrics text
    const lyrics = $("div[data-lyrics-container]").text().trim();
    return lyrics || null;
  } catch (err) {
    console.error("Genius fetch failed:", err.message);
    return null;
  }
}

app.get("/lyrics", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ success: false, message: "Missing ?q=" });

  try {
    // YouTube search for title + artist
    const r = await yts(query);
    const video = r.videos[0];
    const title = video.title.replace(/\(.*?\)|\[.*?\]/g, "").replace(/official|lyrics|video/gi, "").trim();
    const artist = video.author.name.replace(/- Topic|VEVO/gi, "").trim();

    const lyrics = await getLyricsFromGenius(title, artist);
    if (!lyrics) {
      return res.json({ success: false, artist, title, message: "Lyrics not found" });
    }

    res.json({
      success: true,
      author: "MinatoCode",
      artist,
      title,
      lyrics
    });
  } catch (err) {
    res.json({ success: false, message: "Error: " + err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Lyrics API running on port ${PORT}`));

