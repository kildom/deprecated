
import * as fs from 'node:fs';
import * as mupdf from 'mupdf';


const pixelsPerMm = 20;

const scale = 1 / 72 * 25.4 * pixelsPerMm;


function main() {
    let doc = mupdf.Document.openDocument(fs.readFileSync('test2.pdf'), 'application/pdf');
    let ladedPage = doc.loadPage(0);
    let pixmap = ladedPage.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, false);
    let width = pixmap.getWidth();
    let height = pixmap.getHeight();
    let rowBytes = pixmap.getStride();
    if (!pixmap.getColorSpace()?.isRGB()
        || pixmap.getAlpha()
        || pixmap.getNumberOfComponents() !== 3
        || rowBytes < width * 3
    ) {
        return false;
    }
    let widthInMm = width / pixelsPerMm;
    let heightInMm = height / pixelsPerMm;
    console.log(`Page size: ${widthInMm}mm x ${heightInMm}mm`);

    let png = pixmap.asPNG();
    fs.writeFileSync('output.png', png);

    let header = new DataView(new ArrayBuffer(24));
    header.setUint32(0, width, true);
    header.setUint32(4, height, true);
    header.setFloat64(8, pixelsPerMm, true);
    header.setUint32(16, rowBytes, true);
    header.setUint32(20, 0, true); // reserved
    fs.writeFileSync('output.header', new Uint8Array(header.buffer));
    let pixels = pixmap.getPixels();
    fs.writeFileSync('output.bin', new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength));
}

main();
