import sharp from 'sharp';

await sharp('project-content/profile-photo-opengraph.jpg')
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'top' })
  .png()
  .toFile('project-content/og-image.png');

console.log('wrote project-content/og-image.png');
