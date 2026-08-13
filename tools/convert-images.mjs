import sharp from 'sharp';

const targets = [
  // Case-study heroes — full-bleed, need higher-res variants
  { src: 'project-content/4 Lockers PUDO for framer/0 Hero.png', widths: [800, 1600] },
  { src: 'project-content/2 Decision module for framer/1 Hero.png', widths: [800, 1600] },
  { src: 'project-content/3 DAD Images for framer/1 Hero.png', widths: [800, 1600] },
  // Homepage thumbnails — small card images. The card's rendered width is
  // height-driven (65vh * aspect ratio, see .fc-media in index.html), so it
  // can run well past 960px on tall/external monitors — 1440w covers that
  // at 2x pixel density too.
  { src: 'project-content/4 Lockers PUDO for framer/Thumbnail - lockers PUDO.png', widths: [480, 960, 1440] },
  { src: 'project-content/2 Decision module for framer/Thumbnail - decision module.png', widths: [480, 960, 1440] },
  { src: 'project-content/3 DAD Images for framer/Thumbnail - TRQ DAD.png', widths: [480, 960, 1440] },
];

for (const { src, widths } of targets) {
  for (const w of widths) {
    const out = src.replace(/\.png$/, `-${w}.webp`);
    await sharp(src).resize({ width: w }).webp({ quality: 82 }).toFile(out);
    console.log('wrote', out);
  }
}
