import axios from "axios";
import * as cheerio from "cheerio";
import ytSearch from "yt-search";

export default async function handler(req, res) {
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

    // Step 2: Search Genius with YouTube video title
    const search = await axios.get("https://api.genius.com/search", {
      params: { q: songTitle },
      headers: {
        Authorization: "Bearer BU6n9H0WLGHsBil-32jaUEJK9Ia3ivLnXAF_Yp-sYLi19riuDLecmbW0kp-Hqfbw",
      },
    });

    const hits = search.data.response.hits;
    if (!hits.length) return res.json({ success: false, message: "No lyrics found" });

    const song = hits[0].result;

    // Step 3: Scrape lyrics from Genius song page
    const page = await axios.get(song.url);
    const $ = cheerio.load(page.data);
    let lyrics = "";
    $('div[data-lyrics-container="true"]').each((i, el) => {
      lyrics += $(el).text() + "\n";
    });

    res.status(200).json({
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
}
  
