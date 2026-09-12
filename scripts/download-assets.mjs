import { writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const IMAGES = [
  { url: 'https://i.scdn.co/image/ab67616d00001e021faf95e8125b4a378efaf857', name: 'track-01.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02c9b387d469ff148258076bfe', name: 'track-02.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e022c90ec867609c3db4d7fbed5', name: 'track-03.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02acfeb544fdc930878ec518ef', name: 'track-04.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02ac9d5d5263e9f03802d6864c', name: 'track-05.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02d5a8395b0d80b8c48a5d851c', name: 'track-06.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e029aa3e670e02d7dff9656159a', name: 'track-07.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e0270cd79659edf4d5fec0840b8', name: 'track-08.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02abe3723be14374183e24545e', name: 'track-09.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02f86c0da670e7e6291af99797', name: 'track-10.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e0226f7f19c7f0381e56156c94a', name: 'track-11.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02e987e16ce87fd8504de17d87', name: 'track-12.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02a36ad71184bf514f830adf2d', name: 'track-13.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02d605dbea27d3bcc669af9ee8', name: 'track-14.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02d24bd8f4bdddcd6fceeefbb6', name: 'track-15.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02c0ef6b61cf97278a38621c34', name: 'track-16.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e029edbfde12c8b49c9370c0281', name: 'track-17.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02463fce4562806107cddf6aea', name: 'track-18.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e028d18d73bbfc8985d52865edf', name: 'track-19.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e0246ea47fd9f97917f2ef708f0', name: 'track-20.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02e99a0b716aeb167367f850b4', name: 'track-21.jpg' },
  { url: 'https://i.scdn.co/image/ab67616100005174d42d91f04ebd160401bcd6d6', name: 'artist-01.jpg' },
  { url: 'https://i.scdn.co/image/ab67616100005174d55c95ad400aed87da52daec', name: 'artist-02.jpg' },
  { url: 'https://i.scdn.co/image/ab67616100005174aadc18cac8d48124357c38e6', name: 'artist-03.jpg' },
  { url: 'https://i.scdn.co/image/ab67616100005174a525322f8cf46f6287791b2c', name: 'artist-04.jpg' },
  { url: 'https://i.scdn.co/image/ab6761610000517468493c2dc6051f0bf02a1240', name: 'artist-05.jpg' },
  { url: 'https://i.scdn.co/image/ab67616100005174dae5e2b4f3e3e41df192334a', name: 'artist-06.jpg' },
  { url: 'https://i.scdn.co/image/ab67616100005174f150017ca69c8793503c2d4f', name: 'artist-07.jpg' },
  { url: 'https://i.scdn.co/image/ab67616100005174ae07171f989fb39736674113', name: 'artist-08.jpg' },
  { url: 'https://i.scdn.co/image/ab676161000051746f4f4f898c64c2a6095cd22f', name: 'artist-09.jpg' },
  { url: 'https://i.scdn.co/image/ab67616100005174cb565a8e684e3be458d329ac', name: 'artist-10.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02463fce4562806107cddf6aea', name: 'album-01.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e028d18d73bbfc8985d52865edf', name: 'album-02.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02de25b67688e3520e24612209', name: 'album-03.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02ec3830ad57fbab74732f59d0', name: 'album-04.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02280a25dc13dab7d7d4d89a27', name: 'album-05.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e0271d62ea7ea8a5be92d3c1f62', name: 'album-06.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02be5a6b3ab79e4b0761f4b285', name: 'album-07.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02cdd8b3fb78ddf4e9fba3dc46', name: 'album-08.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02c9b387d469ff148258076bfe', name: 'album-09.jpg' },
  { url: 'https://i.scdn.co/image/ab67616d00001e02acfeb544fdc930878ec518ef', name: 'album-10.jpg' },
  { url: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/radio/artist/1vCWHaC5f2uS3yhpwWbIA6/en', name: 'radio-01.jpg' },
  { url: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/radio/artist/2OIWxN9xUhgUHkeUCWCaNs/en', name: 'radio-02.jpg' },
  { url: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/radio/artist/33qOK5uJ8AR2xuQQAhHump/en', name: 'radio-03.jpg' },
  { url: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/radio/artist/68dW5BU6sdVNf099EylxEt/en', name: 'radio-04.jpg' },
  { url: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/radio/artist/55ZGFvikpNjQHvtTWS5aZF/en', name: 'radio-05.jpg' },
  { url: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/radio/artist/04HqRx07Bv9gh7rsrMTqs7/en', name: 'radio-06.jpg' },
  { url: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/radio/artist/0NRMzT05nsc8mTm4iUvuHY/en', name: 'radio-07.jpg' },
  { url: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/radio/artist/3H7Ez7cwaYw4L3ELy4v3Lc/en', name: 'radio-08.jpg' },
  { url: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/radio/artist/08GQAI4eElDnROBrJRGE0X/en', name: 'radio-09.jpg' },
  { url: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/radio/artist/7jEEE187pVG6InOxn03oA5/en', name: 'radio-10.jpg' },
  { url: 'https://charts-images.scdn.co/assets/locale_en/regional/weekly/region_global_default.jpg', name: 'chart-global-weekly.jpg' },
  { url: 'https://charts-images.scdn.co/assets/locale_en/regional/weekly/region_se_default.jpg', name: 'chart-se-weekly.jpg' },
  { url: 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_global_default.jpg', name: 'chart-global-daily.jpg' },
  { url: 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_se_default.jpg', name: 'chart-se-daily.jpg' },
];

const DIRS = ['public/images/tracks', 'public/images/artists', 'public/images/albums', 'public/images/radio', 'public/images/charts'];

async function main() {
  for (const dir of DIRS) await mkdir(dir, { recursive: true });

  const results = await Promise.allSettled(
    IMAGES.map(async (img) => {
      const folder = img.name.startsWith('track-') ? 'tracks'
        : img.name.startsWith('artist-') ? 'artists'
        : img.name.startsWith('album-') ? 'albums'
        : img.name.startsWith('radio-') ? 'radio'
        : 'charts';
      const res = await fetch(img.url);
      if (!res.ok) throw new Error(`${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const path = join('public/images', folder, img.name);
      writeFileSync(path, buf);
      return path;
    })
  );

  const ok = results.filter(r => r.status === 'fulfilled').length;
  const fail = results.filter(r => r.status === 'rejected');
  console.log(`Downloaded ${ok}/${IMAGES.length} images`);
  if (fail.length) {
    fail.forEach((f, i) => console.error(`  FAIL ${IMAGES[i].name}: ${f.reason}`));
  }
}

main();
