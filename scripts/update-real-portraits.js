// scripts/update-real-portraits.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const profilesPath = path.join(__dirname, '..', 'public', 'data', 'profiles.json');
const auraPath = path.join(__dirname, '..', 'public', 'data', 'aura-candidates.json');

const realPortraits = {
  "sam-altman": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Sam_Altman_TechCrunch_Disrupt_2019_%28cropped%29.jpg/800px-Sam_Altman_TechCrunch_Disrupt_2019_%28cropped%29.jpg",
  "mira-murati": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Mira_Murati_2023.jpg/800px-Mira_Murati_2023.jpg",
  "alexis-ohanian": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Alexis_Ohanian_by_Gage_Skidmore.jpg/800px-Alexis_Ohanian_by_Gage_Skidmore.jpg",
  "marques-brownlee": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Marques_Brownlee_2022_%28cropped%29.jpg/800px-Marques_Brownlee_2022_%28cropped%29.jpg",
  "whitney-wolfe-herd": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Whitney_Wolfe_Herd_at_SXSW_2018_%28cropped%29.jpg/800px-Whitney_Wolfe_Herd_at_SXSW_2018_%28cropped%29.jpg",
  "brian-chesky": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Brian_Chesky_at_the_2024_Milken_Institute_Global_Conference.jpg/800px-Brian_Chesky_at_the_2024_Milken_Institute_Global_Conference.jpg",
  "sara-blakely": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Sara_Blakely_2012.jpg/800px-Sara_Blakely_2012.jpg",
  "pieter-levels": "https://avatars.githubusercontent.com/u/1089209?v=4",
  "sophia-amoruso": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Sophia_Amoruso_2014.jpg/800px-Sophia_Amoruso_2014.jpg",
  "reid-hoffman": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Reid_Hoffman_2013.jpg/800px-Reid_Hoffman_2013.jpg",
  "melanie-perkins": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Melanie_Perkins_Canva_%28cropped%29.jpg/800px-Melanie_Perkins_Canva_%28cropped%29.jpg",
  "lex-fridman": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Lex_Fridman_2021.jpg/800px-Lex_Fridman_2021.jpg",
  "payal-kadakia": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Payal_Kadakia_2018.jpg/800px-Payal_Kadakia_2018.jpg",
  "gary-vaynerchuk": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Gary_Vaynerchuk_2017.jpg/800px-Gary_Vaynerchuk_2017.jpg",
  "reshma-saujani": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Reshma_Saujani_by_Gage_Skidmore.jpg/800px-Reshma_Saujani_by_Gage_Skidmore.jpg",
  "austen-allred": "https://avatars.githubusercontent.com/u/1087814?v=4",
  "emily-weiss": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Emily_Weiss_2018.jpg/800px-Emily_Weiss_2018.jpg",
  "palmer-luckey": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Palmer_Luckey_%2832813155790%29_%28cropped%29.jpg/800px-Palmer_Luckey_%2832813155790%29_%28cropped%29.jpg",
  "shiza-shahid": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Shiza_Shahid_2015.jpg/800px-Shiza_Shahid_2015.jpg",
  "guillermo-rauch": "https://avatars.githubusercontent.com/u/13041?v=4",
  "sahil-lavingia": "https://avatars.githubusercontent.com/u/38787?v=4",
  "mathilde-collin": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Mathilde_Collin_2018.jpg/800px-Mathilde_Collin_2018.jpg",
  "austin-russell": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Austin_Russell_%28cropped%29.jpg/800px-Austin_Russell_%28cropped%29.jpg",
  "amjad-masad": "https://avatars.githubusercontent.com/u/498274?v=4",
  "aravind-srinivas": "https://avatars.githubusercontent.com/u/2357761?v=4",
  "alexandr-wang": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Alexandr_Wang_2023.jpg/800px-Alexandr_Wang_2023.jpg"
};

// 1. Update profiles.json
const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
profiles.forEach(p => {
  if (realPortraits[p.id]) {
    p.avatar = realPortraits[p.id];
  }
});
fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2), 'utf-8');
console.log(`Updated ${profiles.length} profiles with real portraits in profiles.json`);

// 2. Update aura-candidates.json
if (fs.existsSync(auraPath)) {
  const aura = JSON.parse(fs.readFileSync(auraPath, 'utf-8'));
  aura.forEach(c => {
    if (realPortraits[c.profileId]) {
      c.image = realPortraits[c.profileId];
      c.avatar = realPortraits[c.profileId];
      if (c.vibes && c.vibes[0]) {
        c.vibes[0].img = realPortraits[c.profileId];
      }
    }
  });
  fs.writeFileSync(auraPath, JSON.stringify(aura, null, 2), 'utf-8');
  console.log(`Updated ${aura.length} candidates in aura-candidates.json`);
}
