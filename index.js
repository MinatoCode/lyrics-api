const express = require('express');
const fetch = require('node-fetch'); // v2
const yts = require('yt-search');
const app = express();
const PORT = process.env.PORT || 3000;

// Parse "song by artist"
function parseSongArtist(query) {
  const regex = /(.*)\s+by\s+(.+)/i;
  const match = query.match(regex);
  if (match) return { song: match[1].trim(), artist: match[2].trim() };
  return { song: query.trim(), artist: '' };
}

// Get artist from YouTube if missing
async function getArtistFromYT(songQuery) {
  const searchResults = await yts(songQuery);
  const firstVideo = searchResults.videos[0];
  return firstVideo?.author?.name || '';
}

app.get('/lyrics', async (req, res) => {
  let query = req.query.q;
  if (!query) return res.status(400).json({ success: false, error: 'Query parameter q is required' });

  let { song, artist } = parseSongArtist(query);

  try {
    if (!artist) {
      artist = await getArtistFromYT(song);
      if (!artist) return res.status(404).json({ success: false, error: 'Artist not found' });
    }

    // Use exact DankLyrics API URL
    const apiUrl = `https://api.danklyrics.com/dank/lyrics?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
        "Referer": "https://danklyrics.com/"
      }
    });

    if (!response.ok) return res.status(404).json({ success: false, error: 'Song not found in DankLyrics API' });

    const data = await response.json();

    res.json({
      success: true,
      query,
      song: data.song || song,
      artist: data.artist || artist,
      lyrics: data.lyrics || 'Lyrics not found'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch lyrics' });
  }
});

app.listen(PORT, () => console.log(`Lyrics API running on port ${PORT}`));
        
