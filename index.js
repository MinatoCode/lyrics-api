const express = require("express");
const axios = require("axios");
const yts = require("yt-search");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ New Genius Access Token
const GENIUS_TOKEN = "BU6n9H0WLGHsBil-32jaUEJK9Ia3ivLnXAF_Yp-sYLi19riuDLecmbW0kp-Hqfbw";

// Try Genius first
async function getLyricsFromGenius(title, artist) {
  try {
    const query = `${artist} ${title}`;
    const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;

    const { data } = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${GENIUS_TOKEN}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const song = data.response.hits[0]?.result;
    if (!song) return null;

    const page = await axios.get(song.url);
    const $ = cheerio.load(page.data);
    const lyrics = $("div[data-lyrics-container]").text().trim();
    return lyrics || null;
  } catch (err) {
    console.error("Genius fetch failed:", err.message);
    return null;
  }
}

// Fallback public lyrics API
async function getLyricsFallback(artist, title) {
  try {
    const { data } = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    return data.lyrics || null;
  } catch {
    return null;
  }
}

app.get("/lyrics", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ success: false, message: "Missing ?q=", author: "MinatoCode" });

  try {
    // YouTube search for proper song & artist names
    const r = await yts(query);
    const video = r.videos[0];

    if (!video) return res.json({ success: false, message: "No video found", author: "MinatoCode" });

    const title = video.title.replace(/\(.*?\)|\[.*?\]/g, "").replace(/official|lyrics|video/gi, "").trim();
    const artist = video.author.name.replace(/- Topic|VEVO/gi, "").trim();

    // Try Genius first
    let lyrics = await getLyricsFromGenius(title, artist);

    // Fallback to public API if Genius fails
    if (!lyrics) {
      lyrics = await getLyricsFallback(artist, title);
    }

    if (!lyrics) {
      return res.json({
        success: false,
        artist,
        title,
        message: "Lyrics not found",
        author: "MinatoCode"
      });
    }

    res.json({
      success: true,
      artist,
      title,
      lyrics,
      author: "MinatoCode"
    });

  } catch (err) {
    res.json({ success: false, message: "Error: " + err.message, author: "MinatoCode" });
  }
});

app.listen(PORT, () => console.log(`✅ Lyrics API running on port ${PORT}`));
                                             
