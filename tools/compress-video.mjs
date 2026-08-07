import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { rename } from 'node:fs/promises';

ffmpeg.setFfmpegPath(ffmpegPath.path);

const src = 'project-content/Sydney Makes an Omelet.mp4';
const tmp = 'project-content/Sydney Makes an Omelet.compressed.mp4';

await new Promise((resolve, reject) => {
  ffmpeg(src)
    .videoCodec('libx264')
    .size('1280x?')
    .outputOptions(['-crf 28', '-preset slow', '-movflags +faststart'])
    .audioCodec('aac')
    .audioBitrate('96k')
    .on('end', resolve)
    .on('error', reject)
    .save(tmp);
});

await rename(tmp, src);
console.log('compressed', src);
