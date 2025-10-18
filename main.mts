
import * as fs from 'node:fs';
import * as mupdf from 'mupdf';


const pixelsPerMm = 50;

const scale = 1 / 72 * 25.4 * pixelsPerMm;


function main() {
    let doc = mupdf.Document.openDocument(fs.readFileSync('test.pdf'), 'application/pdf');
    let ladedPage = doc.loadPage(0);
    let pixmap = ladedPage.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB);
    let png = pixmap.asPNG();
    fs.writeFileSync('output.png', png);
}

main();
