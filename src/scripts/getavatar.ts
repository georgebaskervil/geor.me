import fs from 'fs';
import path from 'path';

function getavatar() {
  const directoryPath = path.join(process.cwd(), 'public/brand-assets');
  const files = fs.readdirSync(directoryPath);
  const images = files.filter(
    (file) =>
      file.endsWith('.avif') || file.endsWith('.webp') || file.endsWith('.png'),
  );
  const baseNames = [
    ...new Set(
      images.map((image) => path.basename(image, path.extname(image))),
    ),
  ];
  return baseNames;
}

export { getavatar };
