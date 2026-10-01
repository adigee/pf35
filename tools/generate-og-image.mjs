import sharp from 'sharp';

await sharp('project-content/profile-photo.png')
  .resize({ width: 1200, height: 630, fit: 'contain', background: { r: 141, g: 138, b: 138 } })
  .png()
  .toFile('project-content/og-image.png');

console.log('wrote project-content/og-image.png');
