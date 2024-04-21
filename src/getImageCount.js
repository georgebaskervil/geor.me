import fs from 'fs';
import path from 'path';

function getImageCount() {
    const directoryPath = path.join(process.cwd(), 'public/image-assets');
    const files = fs.readdirSync(directoryPath);
    const images = files.filter(file => file.endsWith('.avif') || file.endsWith('.webp'));
    const imageCount = images.length;
    const dividedByTwo = imageCount / 2;
    return dividedByTwo;
}

export { getImageCount };
