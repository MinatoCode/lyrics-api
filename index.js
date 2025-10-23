// server.js
const express = require('express');
const fetch = require('node-fetch'); // v2
const yts = require('yt-search');
const app = express();
const PORT = process.env.PORT || 3000;

// Helper: parse "song by artist"
function parseSongArtist(query) {
  const regex = /(.*)\s+by\s+(.+)/i;
  const match = query.match(regex);
  if (match) return { song: match[1].trim(), artist: match[2].trim() };
  return { song: query.trim(), artist: '' };
}

// Helper: clean HTML to text
function cleanLyrics(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<span[^>]*>|<\/span>/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

// Check if lyrics likely match the song
function isLyricsValid(lyrics, song, artist) {
  if (!lyrics) return false;
  const l = lyrics.toLowerCase();
  return l.includes(song.toLowerCase()) || l.includes(artist.toLowerCase()) || lyrics.length > 50;
}

app.get('/lyrics', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ success: false, error: 'Query parameter q is required' });

  try {
    let { song, artist } = parseSongArtist(query);

    // 1️⃣ If no artist, fallback to YouTube search
    if (!artist) {
      const searchResults = await yts(query);
      const firstVideo = searchResults.videos[0];
      if (firstVideo) {
        song = firstVideo.title || song;
        artist = firstVideo.author?.name || '';
      }
    }

    // 2️⃣ Try DankLyrics API
    let apiUrl = `https://danklyrics.com/api/lyrics?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}&album=`;
    let response = await fetch(apiUrl, {
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

    let html = await response.text();
    let lyricsMatch = html.match(/<p class="lyrics-container"[^>]*>([\s\S]*?)<\/p>/);
    let lyricsText = lyricsMatch ? cleanLyrics(lyricsMatch[1]) : null;

    // 3️⃣ If lyrics are invalid, fallback to scraping the page directly
    if (!isLyricsValid(lyricsText, song, artist)) {
      const slugSong = song.toLowerCase().replace(/\s+/g, '-');
      const slugArtist = artist.toLowerCase().replace(/\s+/g, '-');
      const pageUrl = `https://danklyrics.com/${slugSong}-${slugArtist}`;

      const pageResponse = await fetch(pageUrl, {
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

      const pageHtml = await pageResponse.text();
      lyricsMatch = pageHtml.match(/<p class="lyrics-container"[^>]*>([\s\S]*?)<\/p>/);
      lyricsText = lyricsMatch ? cleanLyrics(lyricsMatch[1]) : null;
    }

    // 4️⃣ Return JSON
    res.json({
      success: true,
      query,
      song,
      artist,
      lyrics: lyricsText || "Lyrics not found"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch lyrics' });
  }
});

app.listen(PORT, () => {
  console.log(`Lyrics API running on port ${PORT}`);
});
