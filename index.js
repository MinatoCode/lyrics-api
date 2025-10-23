const express = require("express");
const axios = require("axios");
const yts = require("yt-search");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/lyrics", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Missing parameter: q"
    });
  }

  try {
    // 🔍 Search YouTube for top result
    const r = await yts(query);
    const video = r.videos && r.videos.length > 0 ? r.videos[0] : null;

    if (!video) {
      return res.json({ success: false, message: "No YouTube results found" });
    }

    // 🎵 Extract artist and title
    const title = video.title
      .replace(/\(.*?\)|\[.*?\]/g, "")
      .replace(/official|lyrics|video|mv/gi, "")
      .trim();
    const artist = video.author?.name
      .replace(/- Topic|VEVO|Official/gi, "")
      .trim();

    // 🎶 Fetch lyrics from lyrics.ovh
    const { data } = await axios.get(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
    );

    if (!data.lyrics) {
      return res.json({
        success: false,
        message: "Lyrics not found",
        artist,
        title
      });
    }

    res.json({
      success: true,
      author: "MinatoCode",
      artist,
      title,
      lyrics: data.lyrics
    });
  } catch (err) {
    res.json({
      success: false,
      message: "Error fetching lyrics",
      error: err.message
    });
  }
});

app.listen(PORT, () => console.log(`✅ Lyrics API running on port ${PORT}`));
      
