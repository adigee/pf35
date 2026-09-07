import { execFile } from 'node:child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { rename } from 'node:fs/promises';

const src = 'project-content/Sydney Makes an Omelet.mp4';
const tmp = 'project-content/Sydney Makes an Omelet.compressed.mp4';

await new Promise((resolve, reject) => {
  execFile(ffmpegInstaller.path, [
    '-i', src,
    '-c:v', 'libx264',
    '-vf', 'scale=1280:-2',
    '-crf', '28',
    '-preset', 'slow',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-b:a', '96k',
    tmp,
  ], (err) => {
    if (err) reject(err);
    else resolve();
  });
});

await rename(tmp, src);
console.log('compressed', src);
