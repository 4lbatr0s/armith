/** Best-effort width/height from first bytes — JPEG/PNG/GIF/WebP. */

function readJpegDims(buf) {
    let i = 2;
    while (i < buf.length - 9) {
        if (buf[i] !== 0xff) {
            i += 1;
            continue;
        }
        const marker = buf[i + 1];
        if (
            marker === 0xd8 ||
            marker === 0xd9 ||
            marker === 0xda ||
            (marker >= 0xd0 && marker <= 0xd7)
        ) {
            i += 2;
            continue;
        }
        const segLen = buf.readUInt16BE(i + 2);
        if (segLen < 2 || i + 2 + segLen > buf.length) return null;

        const isSOF =
            marker === 0xc0 ||
            marker === 0xc1 ||
            marker === 0xc2 ||
            marker === 0xc3 ||
            marker === 0xc5 ||
            marker === 0xc6 ||
            marker === 0xc7 ||
            marker === 0xc9 ||
            marker === 0xcb ||
            marker === 0xcd ||
            marker === 0xcf;

        if (isSOF) {
            return {
                w: buf.readUInt16BE(i + 7),
                h: buf.readUInt16BE(i + 5)
            };
        }
        i += 2 + segLen;
    }
    return null;
}

function readPngDims(buf) {
    if (buf.length < 24) return null;
    const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!PNG_SIG.equals(buf.subarray(0, 8))) return null;
    if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function readGifDims(buf) {
    if (buf.length < 12) return null;
    const sig = buf.subarray(0, 6).toString('ascii');
    if (sig !== 'GIF87a' && sig !== 'GIF89a') return null;
    return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
}

function readWebpDims(buf) {
    if (buf.length < 30) return null;
    if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;

    let offset = 12;
    while (offset + 8 <= buf.length) {
        const tag = buf.subarray(offset, offset + 4).toString('ascii');
        const chunkSize = buf.readUInt32LE(offset + 4);
        const dataStart = offset + 8;
        const dataEnd = dataStart + chunkSize;
        if (dataEnd > buf.length || chunkSize < 0) return null;
        const body = buf.subarray(dataStart, dataEnd);

        if (tag === 'VP8 ' && body.length >= 10 && body[3] === 0x9d && body[4] === 0x01 && body[5] === 0x2a) {
            const w = body.readUInt16LE(6) & 0x3fff;
            const h = body.readUInt16LE(8) & 0x3fff;
            if (w > 0 && h > 0) return { w, h };
        }

        if (tag === 'VP8L' && body.length >= 5) {
            const bits = body.readUInt32LE(1);
            const w = (bits & 0x3fff) + 1;
            const h = ((bits >> 14) & 0x3fff) + 1;
            if (w > 0 && h > 0) return { w, h };
        }

        if (tag === 'VP8X' && body.length >= 10) {
            const w =
                1 +
                body[6] +
                ((body[7] ?? 0) << 8) +
                (((body[8] ?? 0) & 0xff) << 16);
            const h = 1 + body[9] + ((body[10] ?? 0) << 8) + (((body[11] ?? 0) & 0xff) << 16);
            if (w > 1 && h > 1 && w <= 16777215 && h <= 16777215) return { w, h };
        }

        offset = dataEnd + (chunkSize % 2 === 1 ? 1 : 0);
        if (!Number.isFinite(offset) || offset >= buf.length) break;
    }
    return null;
}

/**
 * @param {Buffer} buf
 * @returns {{ w: number, h: number } | null}
 */
export function sniffImageDimensions(buf) {
    if (!buf || buf.length < 12) return null;

    let d = readPngDims(buf);
    if (d?.w && d?.h) return d;

    if (buf[0] === 0xff && buf[1] === 0xd8) {
        d = readJpegDims(buf);
        if (d?.w && d?.h) return d;
    }

    d = readGifDims(buf);
    if (d?.w && d?.h) return d;

    d = readWebpDims(buf);
    if (d?.w && d?.h) return d;

    return null;
}
