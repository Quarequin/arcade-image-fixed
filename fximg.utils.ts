
enum FximgTrimType {
    //% block="both"
    both  = 0x0,
    //% block="x only"
    xOnly = 0x1,
    //% block="y only"
    yOnly = 0x2,
}

namespace helpers {

    /* // Helper: clip ค่าให้อยู่ในช่วง
    function clip(v: number, minv: number, maxv: number): number {
        return v < minv ? minv : (v > maxv ? maxv : v);
    } */

    // ใน fximg.utils.ts หรือไฟล์ blit-related
    export function fximgBlitRow(
        dst: Fximg,
        xDst: number,
        yDst: number,
        wDst: number,   // ความกว้าง dst (ใช้เช็คขอบเขตเท่านั้น)
        hDst: number,   // ความสูง dst (ใช้เช็คขอบเขต)
        src: Fximg,
        xSrc: number,
        hSrc: number    // ความสูงที่จะ copy (จำนวน pixel ใน column)
    ): void {
        if (fximgRoCheck(dst)) return;

        const dstW = fximgWidthOf(dst);
        const dstFullH = fximgHeightOf(dst);
        const srcW = fximgWidthOf(src);
        const srcFullH = fximgHeightOf(src);

        const scaleY = srcFullH / dstFullH;

        // Clip ง่าย ๆ
        if (xDst < 0 || xDst >= dstW || xSrc < 0 || xSrc >= srcW) return;
        if (yDst < 0) {
            hSrc += yDst;
            yDst = 0;
        }
        if (yDst + hSrc > dstFullH) hSrc = dstFullH - yDst;
        if (hSrc <= 0) return;

        // ใช้ buffer ชั่วคราวขนาด hSrc เพื่อ optimize (ไม่ต้อง buffer เต็ม dstH)
        const srcRow = pins.createBuffer(hSrc);
        const dstRow = pins.createBuffer(dstFullH);

        // ดึง column จาก src (เริ่มจาก y=0 ของ buf)
        fximgGetRows(src, xSrc, srcRow, hSrc);

        if (yDst === 0) {
            // Fast path: วางตรงหัว column
            fximgSetRows(dst, xDst, srcRow, hSrc);
            return;
        }
        // Slow path: merge กับข้อมูลเดิมที่ yDst
        fximgGetRows(dst, xDst, dstRow, dstFullH);

        // copy เข้าไปที่ offset yDst
        for (let y = 0; y < hSrc; y++) {
            const sy_f = y * scaleY;
            const sy = (sy_f + 0.5) | 0;

            if (sy < 0) continue;
            if (sy >= hSrc) break;

            dstRow[yDst + sy] = srcRow[sy];
        }

        fximgSetRows(dst, xDst, dstRow, dstFullH);
    }

    export function fximgBlit(
        dst: Fximg,
        xDst: number, yDst: number,
        wDst: number, hDst: number,
        src: Fximg,
        xSrc: number, ySrc: number,
        wSrc: number, hSrc: number,
        transparent?: boolean,
        check?: boolean
    ): boolean {
        if (fximgRoCheck(dst)) return false;
        xDst |= 0, yDst |= 0, wDst |= 0, hDst |= 0;
        xSrc |= 0, ySrc |= 0, wSrc |= 0, hSrc |= 0;

        if (wDst < 1 || hDst < 1) return false;
        if (wSrc < 1 || hSrc < 1) return false;

        let dstW = fximgWidthOf(dst);
        let dstH = fximgHeightOf(dst);
        //if ((xDst + wDst < 0 || xDst >= dstW) ||
        //    (yDst + hDst < 0 || yDst >= dstH)) return false;
        let srcW = fximgWidthOf(src);
        let srcH = fximgHeightOf(src);
        //if ((xSrc + wSrc < 0 || xSrc >= srcW) ||
        //    (ySrc + hSrc < 0 || ySrc >= srcH)) return false;

        // คำนวณ scale factor (จริง ๆ คือ ratio)
        let scaleX = wSrc / wDst;
        let scaleY = hSrc / hDst;

        // Clip rectangle ทั้ง src และ dst (เหมือนมาตรฐาน)
        let clipWDst = wDst;
        let clipHDst = hDst;
        let clipWSrc = wSrc;
        let clipHSrc = hSrc;

        if (xDst < 0) { clipWDst += xDst; clipWSrc += xDst; xSrc -= xDst; xDst = 0; }
        if (yDst < 0) { clipHDst += yDst; clipHSrc += yDst; ySrc -= yDst; yDst = 0; }
        if (xDst + clipWDst > dstW) clipWDst = dstW - xDst;
        if (yDst + clipHDst > dstH) clipHDst = dstH - yDst;

        if (xSrc < 0) { clipWDst += xSrc; clipWSrc += xSrc; xSrc = 0; }
        if (ySrc < 0) { clipHDst += ySrc; clipHSrc += ySrc; ySrc = 0; }
        if (xSrc + clipWSrc > srcW) clipWSrc = srcW - xSrc;
        if (ySrc + clipHSrc > srcH) clipHSrc = srcH - ySrc;

        if (clipWDst <= 0 || clipHDst <= 0 || clipWSrc <= 0 || clipHSrc <= 0) return false;

        // ถ้า transparent=false และ check=false → อาจ optimize เร็วขึ้น แต่เวอร์ชันนี้ทำแบบ general ก่อน

        const safeSrcH = clipHSrc + ySrc;
        const srcRow = pins.createBuffer(safeSrcH);     // buffer ขนาดสูงสุดที่ copy จริง
        const safeDstH = clipHDst + yDst;
        const dstRow = pins.createBuffer(safeDstH);     // buffer เต็ม column ของ dst

        let anyChange = false, rowChange = false;
        let curSx = -1;

        for (let x = 0; x < clipWDst; x++, rowChange = false) {
            const sx = ((x * scaleX) | 0) + xSrc;
            if (sx < 0) continue;
            if (sx >= clipWSrc) break;
            const dx = x + xDst;
    
            // ดึง column ส่วนที่ต้องการจาก src (offset ySrc)
            if (sx !== curSx) fximgGetRows(src, sx, srcRow, safeSrcH), curSx = sx;
            fximgGetRows(dst, dx, dstRow, safeDstH);
    
            for (let y = 0; y < clipHDst; y++) {
                const sy = ((y * scaleY) | 0) + ySrc;
                if (sy < 0) continue;
                if (sy >= clipHSrc) break;
                const dy = y + yDst;
                const newPixel = srcRow[sy];  // pixel จาก src (หลัง shift ySrc แล้ว)
    
                if (transparent && newPixel < 1) continue;
    
                const oldPixel = dstRow[dy];
                if (oldPixel === newPixel) continue;
                dstRow[dy] = newPixel;
                rowChange = true, anyChange = true;
            }
    
            if (!rowChange) continue;
            fximgSetRows(dst, dx, dstRow, safeDstH);

            // ถ้า check=true และยังไม่มี change เลย → สามารถ break ได้เร็ว แต่เวอร์ชันนี้ scan หมดก่อน
        }

        return check ? anyChange : true;
    }

    // 1. drawLine (Bresenham ปรับปรุงตามที่ภัทรแนะนำ - ใช้ sx/sy ตรวจทิศทาง ไม่เช็คจุดเริ่ม=จุดจบ)
    export function fximgDrawLine(fxpic: Fximg, x0: number, y0: number, x1: number, y1: number, color: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        color &= 0xF;
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;
        const w = fximgWidthOf(fxpic);
        const h = fximgHeightOf(fxpic);
        //if (fximgIsOutOfArea(x0, y0, w, h) && fximgIsOutOfArea(x1, y1, w, h)) return;
        x0 |= 0, y0 |= 0;
        x1 |= 0, y1 |= 0;
        //if (x0 === x1 && y0 === y1) { fximgSetPixel(fxpic, x0, y0, color, idx); return; }
        if ((x0 < 0 && x1 < 0) || (x0 >= h && x1 >= h) ||
            (y0 < 0 && y1 < 0) || (y0 >= w && y1 >= w)) return;
        if (x0 === x1 && y0 === y1) { fximgSetPixel(fxpic, x0, y0, color); return; }

        const dx = Math.abs(x1 - x0);
        const sx = x0 < x1 ? 1 : -1;
        const dy = Math.abs(y1 - y0);
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        while (1) {
            fximgSetPixel(fxpic, x0, y0, color, idx);
            const e2 = err << 1;
            if (e2 >= -dy) {
                //if (x0 == x1) break;
                if (isReachingLimit(sx, x0, x1)) break;
                err -= dy;
                x0 = x0 + sx;
                if (fximgIsOutOfRangeFacing(sx, x0, w, false)) continue;
                if (fximgIsOutOfRangeFacing(sx, x0, w, true))  break;
            }
            if (e2 <= dx) {
                //if (y0 == y1) break;
                if (isReachingLimit(sy, y0, y1)) break;
                err += dx;
                y0 = y0 + sy;
                if (fximgIsOutOfRangeFacing(sy, y0, h, false)) continue;
                if (fximgIsOutOfRangeFacing(sy, y0, h, true))  break;
            }
        }
    }

    function isReachingLimit(d: number, i: number, n: number) { return (
        d > 0 ? i >= n : i <= n
    )}

    function interpolate(x0: number, y0: number, x1: number, y1: number, w: number, h: number) {
        //if (fximgIsOutOfArea(x0, y0, w, h) && fximgIsOutOfArea(x1, y1, w, h)) return [];
        x0 |= 0, y0 |= 0;
        x1 |= 0, y1 |= 0;
        //if ((x0 < 0 && x1 < 0) || (x0 >= h && x1 >= w) ||
        //    (y0 < 0 && y1 < 0) || (y0 >= w && y1 >= h)) return [];

        const dx = Math.abs(x1 - x0);
        const sx = x0 < x1 ? 1 : -1;
        const dy = Math.abs(y1 - y0);
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        let vals: number[] = [];

        for (let i = 0; ; i++) {
            const e2 = err << 1;
            if (e2 >= -dy) {
                vals.push(y0);
                //if (x0 == x1) break;
                if (isReachingLimit(sx, x0, x1)) break;
                err -= dy;
                x0 = x0 + sx;
                if (fximgIsOutOfRangeFacing(sx, x0, w, false)) continue;
                if (fximgIsOutOfRangeFacing(sx, x0, w, true))  break;
            }
            if (e2 <= dx) {
                //if (y0 == y1) break;
                if (isReachingLimit(sy, y0, y1)) break;
                err += dx;
                y0 = y0 + sy;
                //if (fximgIsOutOfRangeFacing(sy, y0, h, false)) continue;
                //if (fximgIsOutOfRangeFacing(sy, y0, h, true))  break;
            }
        }
        return vals;
    }

    // 2. drawRect (ขอบ)
    export function fximgDrawRect(fxpic: Fximg, x: number, y: number, width: number, height: number, color: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        if (width < 1 || height < 1) return;
        fximgDrawLine(fxpic, x, y, x + width - 1, y, color, idx);
        fximgDrawLine(fxpic, x + width - 1, y, x + width - 1, y + height - 1, color, idx);
        fximgDrawLine(fxpic, x + width - 1, y + height - 1, x, y + height - 1, color, idx);
        fximgDrawLine(fxpic, x, y + height - 1, x, y, color, idx);
    }

    // 3. fillRect (เติมเต็ม)
    export function fximgFillRect(fxpic: Fximg, x: number, y: number, width: number, height: number, color: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;
        const w = fximgWidthOf(fxpic) * fximgLengthOf(fxpic);
        const h = fximgHeightOf(fxpic);
        if (width < 1 || height < 1) return;
        color &= 0xF;
        idx *= w;
    
        const sx = Math.clamp(0, w - 1, x);
        const ex = Math.clamp(0, w - 1, x + width - 1);
        const sy = Math.clamp(0, h - 1, y);
        const ey = Math.clamp(0, h - 1, y + height - 1);
        if (sx > ex || sy > ey) return;
    
        const buf = pins.createBuffer(h);
        for (let cx = sx; cx <= ex; cx++) {
            fximgGetRows(fxpic, cx + idx, buf, h);
            buf.fill(color, sy, ey - sy + 1)
            fximgSetRows(fxpic, cx + idx, buf, ey+1);
        }
    }

    // 6. drawCircle (midpoint circle - integer)
    export function fximgDrawCircle(fxpic: Fximg, cx: number, cy: number, r: number, color: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        if (r < 1) return;
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;
        color &= 0xF;
        let x = r;
        let y = 0;
        let err = 1 - 2 * r;

        while (x >= y) {
            fximgSetPixel(fxpic, cx + x, cy + y, color, idx);
            fximgSetPixel(fxpic, cx - x, cy + y, color, idx);
            fximgSetPixel(fxpic, cx + x, cy - y, color, idx);
            fximgSetPixel(fxpic, cx - x, cy - y, color, idx);
            fximgSetPixel(fxpic, cx + y, cy + x, color, idx);
            fximgSetPixel(fxpic, cx - y, cy + x, color, idx);
            fximgSetPixel(fxpic, cx + y, cy - x, color, idx);
            fximgSetPixel(fxpic, cx - y, cy - x, color, idx);

            y++;
            if (err <= 0) {
                err += 2 * y + 1;
                continue;
            }
            x--;
            err += 2 * (y - x) + 1;
        }
    }

    // 7. fillCircle (ใช้ drawLine แนวนอน)
    export function fximgFillCircle(fxpic: Fximg, cx: number, cy: number, r: number, color: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        if (r < 1) return;
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;
        color &= 0xF;
        const w = fximgWidthOf(fxpic);
        const h = fximgHeightOf(fxpic);
        const buf = pins.createBuffer(h);
        for (let dx = -r; dx <= r; dx++) {
            let x = cx + dx;
            if (x < 0) continue;
            if (x >= w) break;
            fximg.getRows(fxpic, x, buf, h);
            let dy = fximgPsqrt(r * r - dx * dx) | 0;
            const offset = cy - dy;
            buf.fill(color, Math.max(offset, 0), (dy << 1) + Math.min(offset, 0));
            fximg.setRows(fxpic, x, buf, h);
        }
    }

    // 8. drawOval (midpoint oval - integer)
    export function fximgDrawOval(fxpic: Fximg, cx: number, cy: number, rx: number, ry: number, color: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        rx = Math.abs(rx); ry = Math.abs(ry);
        if (rx === 0 || ry === 0) return;
        if (rx === ry) { fximgDrawCircle(fxpic, cx, cy, rx, color, idx); return; }
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;

        cy -= (ry >>> 1);
        color &= 0xF;

        let a = rx, b = ry;
        let b1 = b & 1;             // odd radius correction

        let dx = ((1 - a) << 2) * (b * b);
        let dy = ((b1 + 1) << 2) * (a * a);
        let err = dx + dy + b1 * a * a;

        let x0 = cx - a, x1 = cx + a;
        let y0 = cy + ((b + 1) >> 1);
        let y1 = y0 - b1;

        // Adjust left/right if rx odd
        if (x0 > x1) { let t = x0; x0 = x1; x1 = t + a; }

        a *= (a << 2);     // a = 4a²
        b1 = (b * b) << 2; // b1 = 4b²

        do {
            fximgSetPixel(fxpic, x1, y0, color, idx);
            fximgSetPixel(fxpic, x0, y0, color, idx);
            fximgSetPixel(fxpic, x0, y1, color, idx);
            fximgSetPixel(fxpic, x1, y1, color, idx);

            let e2 = err << 1;

            if (e2 <= dy) { y0++; y1--; err += dy += a; }     // y step
            if (e2 >= dx || (err << 1) > dy) { x0++; x1--; err += dx += b1; } // x step

        } while (x0 <= x1);

        // Draw tips for very flat ellipses
        while (y0 - y1 < b) {
            fximgSetPixel(fxpic, x0 - 1, y0, color, idx);
            fximgSetPixel(fxpic, x1 + 1, y0++, color, idx);
            fximgSetPixel(fxpic, x0 - 1, y1, color, idx);
            fximgSetPixel(fxpic, x1 + 1, y1--, color, idx);
        }
    }

    // 9. fillOval
    export function fximgFillOval(fxpic: Fximg, cx: number, cy: number, rx: number, ry: number, color: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        if (rx < 1 || ry < 1) return;
        if (rx === ry) { fximgFillCircle(fxpic, cx, cy, rx, color, idx); return; }
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;

        color &= 0xF;
        const h = fximgHeightOf(fxpic);
        const w = fximgWidthOf(fxpic);
        const buf = pins.createBuffer(h);
        const rx2 = rx * rx;
        const ry2 = ry * ry;
        for (let dx = -rx; dx <= rx; dx++) {
            let x = cx + dx;
            if (x < 0) continue;
            if (x >= w) break;
            fximg.getRows(fxpic, x, buf, h);
            let dy = (fximgPsqrt(ry2 * (1 - ((dx * dx) * fximgFinv(rx2)))) + 0.5) | 0;
            const offset = cy - dy;
            buf.fill(color, Math.max(offset, 0), (dy << 1) + Math.min(offset, 0));
            fximg.setRows(fxpic, x, buf, h);
        }
        
    }

    // 12. drawImage (ไม่ transparent)
    export function fximgDrawImage(fxpic: Fximg, from: Fximg, dx: number, dy: number) {
        fximgBulitDrawImage(fxpic, from, dx, dy, false);
    }

    // 13. drawTransparentImage (skip สี 0)
    export function fximgDrawTransparentImage(fxpic: Fximg, from: Fximg, dx: number, dy: number) {
        fximgBulitDrawImage(fxpic, from, dx, dy, true);
    }

    function fximgBulitDrawImage(to: Fximg, from: Fximg, dx: number, dy: number, transparent: boolean) {
        if (fximgRoCheck(from)) return;
        const sw = fximgWidthOf(from)
        const sh = fximgHeightOf(from);
        const tw = fximgWidthOf(to)
        const th = fximgHeightOf(to);
    
        const rowFrom = pins.createBuffer(sh);
        const rowTo = pins.createBuffer(th);
        for (let sx = 0; sx < sw; sx++) {
            let tx = dx + sx;
            if (tx < 0) continue;
            if (tx >= tw) break;
    
            fximgGetRows(from, sx, rowFrom, sh);
            fximgGetRows(to, tx, rowTo, th);
    
            const dyPos = Math.max(dy, 0);
            const dyNeg = Math.min(dy, 0);
    
            const tmpRow = pins.createBuffer(sh + dyNeg);
            if (dyNeg < 0) rowFrom.shift(Math.abs(dyNeg))
            tmpRow.write(dyPos, rowFrom);
    
            if (transparent) for (let i = 0; i < (sh + dyNeg); i++) if (tmpRow[i] < 1) tmpRow[i] = rowTo[dyPos + i];
    
            rowTo.write(dyPos, tmpRow);
            fximgSetRows(to, tx, rowTo, th);
        }
    }

    // 14. scale (nearest neighbor)
    export function fximgScale(fxpic: Fximg, width: number, height: number): Fximg {
        const ow = fximgWidthOf(fxpic);
        const oh = fximgHeightOf(fxpic);
        if (ow === width && oh === height) return fximgClone(fxpic);
        const to = fximgCreate(width, height);
        const toRowBuf = pins.createBuffer(height);
        const fromRowBuf = pins.createBuffer(oh);

        for (let x = 0; x < width; x++) {
            let sx = Math.idiv(x * ow, width);
            fximgGetRows(fxpic, sx, fromRowBuf, oh);
            for (let y = 0; y < height; y++) {
                let sy = Math.idiv(y * oh, height);
                toRowBuf[y] = fromRowBuf[sy]
            }
            fximgSetRows(to, x, toRowBuf, height);
        }
        return to as Fximg;
    }

    // 15. rotate90 (n90 = 1,2,3 → 90°,180°,270°)
    export function fximgRotate90(fxpic: Fximg, n90: number): Fximg {
        n90 = n90 & 0x3;
        if (n90 === 0) return fximgClone(fxpic);

        const w = fximgWidthOf(fxpic);
        const h = fximgHeightOf(fxpic);
        const nw = (n90 & 1) ? h : w;
        const nh = (n90 & 1) ? w : h;
        const dst = fximgCreate(nw, nh);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let c = fximgGetPixel(fxpic, x, y);
                let nx: number, ny: number;
                if (n90 === 1) { nx = y; ny = w - 1 - x; }
                else if (n90 === 2) { nx = w - 1 - x; ny = h - 1 - y; }
                else { nx = h - 1 - y; ny = x; }
                fximgSetPixel(dst, nx, ny, c);
            }
        }
        return dst as Fximg;
    }

    function fximgRotatedBounds(width: number, height: number, angle: number): number[] {
        let s = Math.abs(fximgFsin(angle));   // |sin| * 120
        let c = Math.abs(fximgFcos(angle));   // |cos| * 120

        // newW ≈ (|cos| * w + |sin| * h) / 120 + 1 (เผื่อ margin)
        let newW = 1 + (c * width + s * height) | 0;
        let newH = 1 + (s * width + c * height) | 0;

        // เพิ่ม margin เล็กน้อยเพื่อป้องกัน clipping จาก rounding
        newW += 2;
        newH += 2;

        return [newW, newH];
    }

    // 16. rotate (theta 0-255 ด้วย sin/cos table)
    export function fximgRotate(fxpic: Fximg, angle: number): Fximg {
        const ow = fximgWidthOf(fxpic)
        const oh = fximgHeightOf(fxpic);

        // หาขนาด bounding box ใหม่
        const [nw, nh] = fximgRotatedBounds(ow, oh, angle);

        // สร้าง Buffer ใหม่ขนาดใหญ่ขึ้น
        const dst = fximgCreate(nw, nh);
        //fill(dst, 0);  // พื้นหลังโปร่งใส (สี 0)

        // จุดกึ่งกลางใหม่ (สำหรับวางภาพเก่าตรงกลาง)
        const dstCx = nw >> 1;
        const dstCy = nh >> 1;
        const srcCx = ow >> 1;
        const srcCy = oh >> 1;

        const s = fximgFsin(angle);
        const c = fximgFcos(angle);

        // วาดทุกพิกเซลจาก dst → map กลับไป src (reverse rotation เพื่อ fill hole)
        // หรือ forward จาก src → dst (แบบเดิม แต่ shift offset)
        for (let dy = -dstCy; dy < nh - dstCy; dy++) {
            for (let dx = -dstCx; dx < nw - dstCx; dx++) {
                // dx, dy คือ offset จาก center ใหม่
                let ox = (dx * c - dy * s) | 0;
                let oy = (dx * s + dy * c) | 0;

                let sx = ox + srcCx;
                let sy = oy + srcCy;

                if (sx < 0 || sx >= ow || sy < 0 || sy >= oh) continue;
                let col = fximgGetPixel(fxpic, sx, sy);
                if (col < 1) continue;  // skip transparent
                let tx = dx + dstCx;
                let ty = dy + dstCy;
                fximgSetPixel(dst, tx, ty, col);
            }
        }
        return dst as Fximg;
    }

    const DEG_TO_RAD = Math.PI * fximgFinv(180);

    // 17. rotationFrame (สร้างหลายเฟรมหมุนเท่า ๆ กัน)
    export function fximgRotationFrame(fxpic: Fximg, count: number): Fximg {
        if (count < 1) count = 1;
        const step = Math.idiv(360, count) * DEG_TO_RAD;
        let w = fximgWidthOf(fxpic)
        let h = fximgHeightOf(fxpic);
        const [bw, bh] = fximgRotatedBounds(w, h, 32);
        const [bw2, bh2] = [bw << 1, bh << 1]
        const bigBuf = fximgCreateFrame(w + bw2, h + bh2, count);

        let offset = 0;
        for (let i = 0; i < count; i++) {
            const [nw, nh] = fximgRotatedBounds(w, h, i * step);
            let frame = fximgRotate(fxpic, i * step);
            fximgDrawTransparentImage(bigBuf, frame, offset + Math.abs(bw - nw), Math.abs(bh - nh));
            offset += w + bw2;
        }
        return bigBuf as Fximg;
    }

    // Optional: trim ขอบโปร่งใส (สี 0) ออกให้เหลือเฉพาะส่วนที่มีเนื้อหา
    export function fximgTrim(fxpic: Fximg, trimMode?: FximgTrimType): Fximg {
        switch (trimMode) {
            case 0x0: break;
            case 0x1: break;
            case 0x2: break;
            default: trimMode = 0x0; break;
        }
        const w = fximgWidthOf(fxpic);
        const h = fximgHeightOf(fxpic);
        if (w <= 0 || h <= 0) return fximgCreate(1, 1);

        const rowBuf = pins.createBuffer(h);

        // หา leftmost column ที่มี non-zero
        let minX = w;
        if (trimMode === 0x0 || trimMode === 0x1) {
            for (let x = 0; x < w; x++) {
                fximgGetRows(fxpic, x, rowBuf, h);
                for (let y = 0; y < h; y++) {
                    if (rowBuf[y] !== 0) {
                        minX = x;
                        break;
                    }
                }
                if (minX < w) break;  // พบแล้ว หยุด scan ต่อ
            }
        } else minX = 0;

        // หา rightmost column
        let maxX = -1;
        if (trimMode === 0x0 || trimMode === 0x1) {
            for (let x = w - 1; x >= minX; x--) {
                fximgGetRows(fxpic, x, rowBuf, h);
                for (let y = 0; y < h; y++) {
                    if (rowBuf[y] !== 0) {
                        maxX = x;
                        break;
                    }
                }
                if (maxX >= 0) break;
            }
        } else maxX = w - 1;

        if (maxX < minX) return fximgCreate(1, 1); // ว่างทั้งหมด

        // หา topmost row (scan เฉพาะช่วง minX..maxX)
        let minY = h;
        const colBuf = pins.createBuffer(maxX - minX + 1);
        if (trimMode === 0x0 || trimMode === 0x2) {
            for (let y = 0; y < h; y++) {
                // อ่านเฉพาะช่วง x ที่มีเนื้อหา
                for (let x = minX; x <= maxX; x++) colBuf[x - minX] = fximgGetPixel(fxpic, x, y);  // หรือ optimize ด้วย getRows แล้ว slice
                for (let i = 0; i < colBuf.length; i++) {
                    if (colBuf[i] !== 0) {
                        minY = y;
                        break;
                    }
                }
                if (minY < h) break;
            }
        } else minY = 0;

        // หา bottommost row
        let maxY = -1;
        if (trimMode === 0x0 || trimMode === 0x2) {
            for (let y = h - 1; y >= minY; y--) {
                for (let x = minX; x <= maxX; x++) colBuf[x - minX] = fximgGetPixel(fxpic, x, y);
                for (let i = 0; i < colBuf.length; i++) {
                    if (colBuf[i] !== 0) {
                        maxY = y;
                        break;
                    }
                }
                if (maxY >= 0) break;
            }
        } else maxY = h - 1;

        const newW = maxX - minX + 1;
        const newH = maxY - minY + 1;
        const trimmed = fximgCreate(newW, newH);

        // copy เฉพาะส่วนที่เหลือ
        for (let x = minX; x <= maxX; x++) {
            fximgGetRows(fxpic, x, rowBuf, h);
            rowBuf.shift(minY);
            fximgSetRows(trimmed, x - minX, rowBuf, newH);  // ตัดส่วนบนล่างอัตโนมัติเพราะ setRows ใช้ len = newH
        }

        return trimmed as Fximg;
    }

    export function fximgDrawTriangle(
        fxpic: Fximg,
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        color: number, idx?: number
    ) {
        fximgDrawLine(fxpic, x1, y1, x0, y0, color, idx);
        fximgDrawLine(fxpic, x2, y2, x1, y1, color, idx);
        fximgDrawLine(fxpic, x0, y0, x2, y2, color, idx);
    }

    const PI0_1 = Math.PI * 0.1;

    export function fximgFillTriangle(
        fxpic: Fximg,
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        color: number, idx?: number
    ) {
        if (fximgRoCheck(fxpic)) return;
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;

        color &= 0xF;
        const w = fximgWidthOf(fxpic);
        const h = fximgHeightOf(fxpic);
        let v = [new pt2(x0, y0), new pt2(x1, y1), new pt2(x2, y2)];
        if (fximgIsOutOfAreas(v, w, h)) return;
        idx *= w;
    
        // ------------------- Sort vertices by y (top -> bottom) -------------------
    
        let tmp = -1;
        //Sort points so that x0 <= x1 <= x2
        if (x1 < x0) tmp = x0, x0 = x1, x1 = tmp, tmp = y0, y0 = y1, y1 = tmp;//[x0, y0, x1, y1] = [x1, y1, x0, y0];
        if (x2 < x0) tmp = x2, x2 = x0, x0 = tmp, tmp = y2, y2 = y0, y0 = tmp;//[x2, y2, x0, y0] = [x0, y0, x2, y2];
        if (x2 < x1) tmp = x2, x2 = x1, x1 = tmp, tmp = y2, y2 = y1, y1 = tmp;//[x2, y2, x1, y1] = [x1, y1, x2, y2];
    
        //Compute the x coordinates of the triangles edges
        let y012 = interpolate(x0, y0, x1, y1, w, h).concat(interpolate(x1, y1, x2, y2, w, h));
        let y02 = interpolate(x0, y0, x2, y2, w, h);
    
        if (y012.length < 1 || y02.length < 1) return;
    
        //Ensure the arrays are the correct length
        if (y012.length > y02.length)
            y012.pop();
        else if (y012.length < y02.length)
            y02.pop();
    
        //Determine which is left and which is right
        let yts: number[] = [];
        let ybs: number[] = [];
        //pick midpoint
        let m = y012.length >>> 1;
        //Check which x value is greater at that midpoint
        if (y02[m] < y012[m])
            yts = y02,
            ybs = y012;
        else
            yts = y012,
            ybs = y02;
    
        const buf = pins.createBuffer(h);
    
        //Draw em
        //TODO: just write to the buffer with fill; place any bitwise operations for dithering patterns thusly
        const drawX = (x: number, xi: number) => {
            fximgGetRows(fxpic, x, buf, h);
            const yt = yts[xi];
            const yb = ybs[xi];
            const fillSize = Math.abs(yb - yt) + Math.min(yt, 0);
            if (fillSize < 0) return;
            buf.fill(color, Math.max(yt, 0), fillSize);
            fximgSetRows(fxpic, x, buf, h);
        }
    
        for (let x = x0, xi = 0; x <= x2; x++, xi++) {
            drawX(x, xi);
            drawX(++x, ++xi);
        }

    }

    export function fximgDrawPolygon4(
        fxpic: Fximg,
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
        color: number, idx?: number
    ) {
        fximgDrawLine(fxpic, x1, y1, x0, y0, color, idx);
        fximgDrawLine(fxpic, x2, y2, x1, y1, color, idx);
        fximgDrawLine(fxpic, x3, y3, x2, y2, color, idx);
        fximgDrawLine(fxpic, x0, y0, x3, y3, color, idx);
    }

    export function fximgFillPolygon4(
        fxpic: Fximg,
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
        color: number, idx?: number
    ) {
        fximgFillTriangle(fxpic, x1, y1, x0, y0, x3, y3, color, idx);
        fximgFillTriangle(fxpic, x2, y2, x0, y0, x3, y3, color, idx);
    }

    export function fximgDrawDistortedImage(
        to:  Fximg,  from: Fximg,
        x0:  number, y0:   number,
        x1:  number, y1:   number,
        x2:  number, y2:   number,
        x3?: number, y3?:  number,
    ) {
        fximgBuiltDrawDistortedImage(
            to, from,
            x0, y0, x1, y1,
            x2, y2, x3, y3,
            false, true
        )
    }

    export function fximgDrawTransDistortedImage(
        to:  Fximg,  from: Fximg,
        x0:  number, y0:   number,
        x1:  number, y1:   number,
        x2:  number, y2:   number,
        x3?: number, y3?:  number,
    ) {
        fximgBuiltDrawDistortedImage(
            to, from,
            x0, y0, x1, y1,
            x2, y2, x3, y3,
            true, true
        )
    }

    const fximgZigzet = (l: number, r: number, n: number, c?: boolean) => {
        if (l + n > r) return NaN;
        const size = (r - l);
        const n2 = n >>> 1;
        const half = (c ? 0.5 : 0)
        if (n % 2 > 0) return l + (n2 + half);
        return l + (size - n2 - half);
    }

    export class pt2 { constructor(public x: number, public y: number) { }; };

    class pt2_2 { constructor(public x0: number, public y0: number, public x1: number, public y1: number) { }; };

    class pt2_4 {
        constructor(
            public x0: number, public y0: number, public x1: number, public y1: number,
            public x2: number, public y2: number, public x3: number, public y3: number,
        ) { }; get toArr() {
            return [
                new pt2(this.x0, this.y0), new pt2(this.x1, this.y1),
                new pt2(this.x2, this.y2), new pt2(this.x3, this.y3),
            ]
        };
    };

    function fximgBuiltDrawDistortedImage(
        to: Fximg, from: Fximg,
        x0:   number, y0: number,//p0:  { x: number, y: number },   // top-left
        x1:   number, y1: number,//p1:  { x: number, y: number },   // top-right
        x2:   number, y2: number,//p2:  { x: number, y: number },   // bottom-right
        x3?:  number, y3?:number,//p3?: { x: number, y: number },  // bottom-left (optional)
        transparent?: boolean,
        center?: boolean
    ) {
        if (fximgRoCheck(to)) return;
        if (x3 === undefined) x3 = x0 + (x2 - x1);
        if (y3 === undefined) y3 = y0 + (y2 - y1);

        const w   = fximgWidthOf(from);
        const h   = fximgHeightOf(from);
        const toW = fximgWidthOf(to);
        const toH = fximgHeightOf(to);
        // ถ้าใช้ dstTotalW แบบเดิม → const toTotalW = toW * fximgLengthOf(to); แต่ polymesh ไม่ใช้ เลยข้าม
    
        const fromRowBuf = pins.createBuffer(h);
        //const emptyHash = fromRowBuf.hash(0xffff) & 0xffff;
    
        const wInv = 1 / w;
        const hInv = 1 / h;
    
        const pqu = new pt2_2(
            (x1 - x0),
            (y1 - y0),
            (x2 - x3),
            (y2 - y3)
        );
    
        for (let sx = 0; sx < w; sx++) {
            const ix = center ? fximgZigzet(0, w - 1, sx) : sx;
            fximgGetRows(from, w - ix - 1, fromRowBuf, h);  // ใช้ w - ix -1 เหมือน polymesh (reverse ถ้า center)
    
            //if (fromRowBuf.hash(0xffff) === emptyHash) continue;
    
            const u0 = (ix * wInv);
            const u1 = ((ix + 1) * wInv);
    
            const qu = new pt2_4(
                x0 + pqu.x0 * u0,
                y0 + pqu.y0 * u0,
                x3 + pqu.x1 * u0,
                y3 + pqu.y1 * u0,
                x0 + pqu.x0 * u1,
                y0 + pqu.y0 * u1,
                x3 + pqu.x1 * u1,
                y3 + pqu.y1 * u1
            );
    
            const pqv = new pt2_2(
                (qu.x1 - qu.x0),
                (qu.y1 - qu.y0),
                (qu.x3 - qu.x2),
                (qu.y3 - qu.y2)
            );
    
            for (let sy = 0; sy < h; sy++) {
                const iy = center ? fximgZigzet(0, h - 1, sy) : sy;
    
                const color = fromRowBuf[iy];  // pixel แถวบนสุดหลัง shift
                if (transparent && color < 1) continue;      // transparent
    
                const v0 = (iy * hInv);
                const v1 = ((iy + 1) * hInv);
    
                const qv = new pt2_4(
                    (qu.x0 + pqv.x0 * v0) | 0,
                    (qu.y0 + pqv.y0 * v0) | 0,
                    (qu.x2 + pqv.x1 * v0) | 0,
                    (qu.y2 + pqv.y1 * v0) | 0,
                    (qu.x0 + pqv.x0 * v1) | 0,
                    (qu.y0 + pqv.y0 * v1) | 0,
                    (qu.x2 + pqv.x1 * v1) | 0,
                    (qu.y2 + pqv.y1 * v1) | 0
                );
    
                // Skip ถ้าทั้ง quad ออกนอกจอ (เหมือน polymesh)
                if (qv.toArr.every(pt =>
                    pt.x < 0 || pt.x >= toW || pt.y < 0 || pt.y >= toH
                )) continue;
    
                // Stamp ด้วย 2 triangle (สไตล์ polymesh)
                fximgFillTriangle(to, qv.x1, qv.y1, qv.x0, qv.y0, qv.x3, qv.y3, color);
                fximgFillTriangle(to, qv.x2, qv.y2, qv.x0, qv.y0, qv.x3, qv.y3, color);
    
                // หรือถ้าอยากใช้ polygon4 เดิม (อาจแก้ gap ได้ดีกว่าในบางเคส)
                // fximgFillPolygon4(to, qv.x1, qv.y1, qv.x0, qv.y0, qv.x2, qv.y2, qv.x3, qv.y3, color);
            }
        }
    }

}
