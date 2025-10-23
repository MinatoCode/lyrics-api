// server.js
const express = require('express');
const fetch = require('node-fetch'); // v2
const yts = require('yt-search');
const app = express();
const PORT = process.env.PORT || 3000;

// Helper to parse "song by artist"
function parseSongArtist(query) {
  const regex = /(.*)\s+by\s+(.+)/i;
  const match = query.match(regex);
  if (match) {
    return { song: match[1].trim(), artist: match[2].trim() };
  }
  return { song: query.trim(), artist: '' };
}

app.get('/lyrics', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ success: false, error: 'Query parameter q is required' });

  try {
    // 1️⃣ Extract song and artist from query
    let { song, artist } = parseSongArtist(query);

    // 2️⃣ If artist is missing, fallback to YouTube search
    if (!artist) {
      const searchResults = await yts(query);
      const firstVideo = searchResults.videos[0];
      if (firstVideo) {
        song = firstVideo.title || song;
        artist = firstVideo.author?.name || '';
      }
    }

    // 3️⃣ Call DankLyrics API
    const apiUrl = `https://danklyrics.com/api/lyrics?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}&album=`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
        "Connection": "keep-alive",
        "Referer": "https://danklyrics.com/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36"
      }
    });

    const html = await response.text();

    // 4️⃣ Parse HTML
    const titleMatch = html.match(/<h2>(.*?)<\/h2>/);
    const artistMatch = html.match(/<h3>(.*?)<\/h3>/);
    const lyricsMatch = html.match(/<p class="lyrics-container"[^>]*>([\s\S]*?)<\/p>/);

    const lyricsText = lyricsMatch
      ? lyricsMatch[1].replace(/<br\s*\/?>/g, '\n').replace(/<span>|<\/span>/g, '').trim()
      : null;

    // 5️⃣ Send JSON
    res.json({
      success: true,
      query,
      song: titleMatch ? titleMatch[1] : song,
      artist: artistMatch ? artistMatch[1] : artist,
      lyrics: lyricsText
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch lyrics' });
  }
});

app.listen(PORT, () => {
  console.log(`Lyrics API running on port ${PORT}`);
});
