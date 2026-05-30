
namespace helpers {

    export function fximgRoCheck(fxpic: Fximg) {
        if (fximgIsReadonly(fxpic)) { throw "this fixed image is read-only"; return true; };
        return false
    }

    export function fximgCreateFrame(width: number, height: number, length: number, ro?: boolean): Fximg {
        if (!length) length = 1;
        return fximgInit(width, height, length, ro) as any as Fximg;
    }

    export function fximgCreate(width: number, height: number, ro?: boolean): Fximg {
        return fximgCreateFrame(width, height, 1, ro) as any as Fximg;
    }

    export function fximgFromImage(pic: Image, ro?: boolean): Fximg {
        const fxpic = fximgCreate(pic.width, pic.height);
        if (fximgIsEmptyImage(pic)) return fxpic;
        const h = pic.height
        const buf = pins.createBuffer(h);
        for (let x = 0; x < pic.width; x++) {
            pic.getRows(x, buf);
            fximgSetRows(fxpic, x, buf, h);
        }
        if (ro) fximgSetReadonly(fxpic, true);
        return fxpic as any as Fximg;
    }

    export function fximgToImage(fxpic: Fximg): Image {
        const pic = image.create(fximgWidthOf(fxpic), fximgHeightOf(fxpic));
        const h = pic.height;
        const buf = pins.createBuffer(h);
        for (let x = 0; x < pic.width; x++) {
            fximgGetRows(fxpic, x, buf, h);
            pic.setRows(x, buf);
        }
        return pic.clone();
    }

    const fximgMaxImgSizes = (pics: Image[]) => {
        const cur = { width: pics[0].width, height: pics[0].height, area: 0, empty: 0 };
        for (const pic of pics) {
            cur.width = Math.max(cur.width, pic.width),
                cur.height = Math.max(cur.height, pic.height);
            if (fximgIsEmptyImage(pic)) cur.empty++;
        }
        cur.area = cur.width * cur.height;
        return cur
    }

    export function fximgFromFrame(pics: Image[], ro?: boolean): Fximg {
        const allSize = fximgMaxImgSizes(pics);
        const fxpics = fximgCreateFrame(allSize.width, allSize.height, pics.length);
        if (allSize.empty >= pics.length) return fxpics;
        const h = allSize.height;
        const buf = pins.createBuffer(h);
        let nw = 0;
        for (const pic of pics) {
            const _buf = pins.createBuffer(pic.height)
            const sx = (allSize.width === pic.width ? 0 : Math.idiv(allSize.width - pic.width, 0x02)),
                sy = (allSize.height === pic.height ? 0 : Math.idiv(allSize.height - pic.height, 0x02));
            for (let x = 0; x < pic.width; x++) {
                pic.getRows(x, _buf);
                buf.write(sy, _buf);
                fximgSetRows(fxpics, nw + x + sx, buf, h)
            }
            buf.fill(0);
            nw += allSize.width;
        }
        if (ro) fximgSetReadonly(fxpics, ro);
        return fxpics as any as Fximg;
    }

    export function fximgToFrame(fxpics: Fximg): Image[] {
        const pics: Image[] = []
        const pic = image.create(fximgWidthOf(fxpics), fximgHeightOf(fxpics));
        const h = pic.height;
        const buf = pins.createBuffer(h);
        const startIdx = fximgStartIndex(fxpics);
        for (let nw = 0; (Math.idiv((1 + (nw * pic.height)), 0x02) + startIdx) < fxpics.length; nw += pic.width) {
            for (let x = 0; x < pic.width; x++) {
                fximgGetRows(fxpics, nw + x, buf, h);
                pic.setRows(x, buf);
            }
            pics.push(pic.clone())
        }
        return pics.slice();
    }

    export function fximgGetFrame(fxpics: Fximg, idx: number): Fximg {
        const w = fximgWidthOf(fxpics);
        const h = fximgHeightOf(fxpics);
        const fxpic = fximgCreate(w, h);
        idx = Math.imul(idx, w);
        const tbuf = pins.createBuffer(h);
        for (let x = 0; x < w; x++) {
            fximgGetRows(fxpics, x + idx, tbuf, h);
            fximgSetRows(fxpic, x, tbuf, h);
        }
        return (fxpic as any as Buffer).slice() as any as Fximg;
    }

    export function fximgSetFrame(fxpics: Fximg, idx: number, fxpic: Fximg) {
        if (fximgRoCheck(fxpics)) return;
        const fw = fximgWidthOf(fxpics), fh = fximgHeightOf(fxpics);
        const vw = fximgWidthOf(fxpic), vh = fximgHeightOf(fxpic);
        idx = Math.imul(idx, fw);
        const buf = pins.createBuffer(fh);
        const _buf = pins.createBuffer(vh)
        const sx = (fw === vw ? 0 : Math.idiv(fw - vw, 0x02)),
            sy = (fh === vh ? 0 : Math.idiv(fh - vh, 0x02));
        for (let x = 0; x < vw; x++) {
            fximgGetRows(fxpic, x, _buf, vh);
            buf.write(sy, _buf);
            fximgSetRows(fxpics, idx + x + sx, buf, fh)
        }
    }

    export function fximgSetPixel(fxpic: Fximg, x: number, y: number, color: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        if (fximgIsOutOfArea(x, y, fximgWidthOf(fxpic), fximgHeightOf(fxpic))) return;
        idx = idx || 0; idx = Math.imul(idx, fximgWidthOf(fxpic));
        color &= 0x0f;
        x |= 0; y |= 0;
        const i = fximgPos2idx(x + idx, fximgHeightOf(fxpic), y);
        const ih4 = Math.idiv(i, 0x02) + fximgStartIndex(fxpic);
        const curv = (fxpic as any as Buffer)[ih4]
        let nib0 = curv & 0x0f,
            nib1 = Math.idiv(curv, 0x10);
        if (i & 1 ? nib0 === color : nib1 === color) return;
        if (i & 1) nib0 = color;
        else nib1 = color;
        (fxpic as any as Buffer)[ih4] = Math.imul(nib1, 0x10) + nib0;
    }

    export function fximgGetPixel(fxpic: Fximg, x: number, y: number, idx?: number) {
        if (fximgIsOutOfArea(x, y, fximgWidthOf(fxpic), fximgHeightOf(fxpic))) return 0;
        idx = idx || 0; idx = Math.imul(idx, fximgWidthOf(fxpic));
        x |= 0; y |= 0;
        const i = fximgPos2idx(x + idx, fximgHeightOf(fxpic), y);
        const ih = Math.idiv(i, 0x02);
        const ih4 = ih + fximgStartIndex(fxpic);
        const curv = (fxpic as any as Buffer)[ih4];
        return (i & 1 ? curv & 0xf : Math.idiv(curv, 0x10))
    }

    export function fximgSetRows(fxpic: Fximg, x: number, src: Buffer, h?: number) {
        if (fximgRoCheck(fxpic)) return;
        const fh = fximgHeightOf(fxpic)
        if (h == null) h = fh;
        else h = Math.max(h, fh);
        x |= 0; h |= 0;
        const len = Math.min(src.length, h);
        if (len <= 0 || fximgIsOutOfRange(x, Math.imul(fximgWidthOf(fxpic), fximgLengthOf(fxpic)))) return;
    
        const start = fximgStartIndex(fxpic);
        const colStartBit = Math.imul(x, h) & 1;   // 0 = even (aligned), 1 = odd (misaligned)
    
        let srcIdx = 0;
        let dstByteIdx = start + Math.idiv((x * h), 0x02);
        if (colStartBit === 0) {
            // Fast path: aligned → copy byte-wise ได้เลย
            // src[0] ไป nybble สูงของ byte แรก, src[1] ไป nybble ต่ำ, ฯลฯ
            for (;srcIdx < len - 1; srcIdx += 2, dstByteIdx++)
                (fxpic as any as Buffer)[dstByteIdx] = Math.imul(src[srcIdx], 0x10) + (src[srcIdx + 1] & 0x0f);
            // เหลือพิกเซลสุดท้าย (ถ้า len เป็น odd)
            if (srcIdx < len)
                (fxpic as any as Buffer)[dstByteIdx] = Math.imul(src[srcIdx], 0x10) + ((fxpic as any as Buffer)[dstByteIdx] & 0x0f);
            return;
        }
        // Misaligned path: เริ่มจาก nybble ต่ำของ byte แรก
        // จัดการ byte แรกแยก (merge กับ nybble เดิม)
        if (srcIdx < len)
            (fxpic as any as Buffer)[dstByteIdx] = ((fxpic as any as Buffer)[dstByteIdx] & 0xf0) + (src[srcIdx] & 0x0f),
            srcIdx++, dstByteIdx++;
        // จากนั้น copy แบบ aligned เหมือน fast path
        for (;srcIdx < len - 1; srcIdx += 2, dstByteIdx++)
            (fxpic as any as Buffer)[dstByteIdx] = Math.imul(src[srcIdx], 0x10) + (src[srcIdx + 1] & 0x0f);
        // เหลือตัวสุดท้าย (ถ้ามี)
        if (srcIdx < len)
            (fxpic as any as Buffer)[dstByteIdx] = Math.imul(src[srcIdx], 0x10) + ((fxpic as any as Buffer)[dstByteIdx] & 0x0f);
    }

    export function fximgGetRows(fxpic: Fximg, x: number, dst: Buffer, h?: number) {
        const fh = fximgHeightOf(fxpic);
        if (h == null) h = fh;
        else h = Math.max(h, fh);
        x |= 0; h |= 0;
        const len = Math.min(dst.length, h);
        if (len <= 0 || fximgIsOutOfRange(x, fximgWidthOf(fxpic) * fximgLengthOf(fxpic))) return;

        const start = fximgStartIndex(fxpic);
        const colStartBit = Math.imul(x, h) & 1;
        let dstIdx = 0;
        let srcByteIdx = start + Math.idiv((x * h), 0x02);

        let tmpByte = 0x00;

        if (colStartBit === 0) {
            // Aligned: byte-wise extract
            for (;dstIdx < len - 1; dstIdx += 2, srcByteIdx++)
                tmpByte = (fxpic as any as Buffer)[srcByteIdx],
                dst[dstIdx] = Math.idiv(tmpByte, 0x10),
                dst[dstIdx + 1] = tmpByte & 0x0f;
            if (dstIdx < len)
                dst[dstIdx] = Math.idiv((fxpic as any as Buffer)[srcByteIdx], 0x10);
            return;
        }
        // Misaligned
        if (dstIdx < len)
            dst[dstIdx] = (fxpic as any as Buffer)[srcByteIdx] & 0x0f,
            dstIdx++, srcByteIdx++;
        for (;dstIdx < len - 1; dstIdx += 2, srcByteIdx++)
            tmpByte = (fxpic as any as Buffer)[srcByteIdx],
            dst[dstIdx] = Math.idiv(tmpByte, 0x10),
            dst[dstIdx + 1] = tmpByte & 0x0f;
        if (dstIdx < len)
            dst[dstIdx] = Math.idiv((fxpic as any as Buffer)[srcByteIdx], 0x10);
    }

    // 4. fill (เติมทั้งภาพ)
    export function fximgFill(fxpic: Fximg, color: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;
            color &= 0xF;
            const h = fximgHeightOf(fxpic);
            const rowBuf = pins.createBuffer(h);
            rowBuf.fill(color);
            const w = fximgWidthOf(fxpic);
            idx = Math.imul(idx, w);
            for (let x = 0; x < w; x++) fximgSetRows(fxpic, idx + x, rowBuf, h);
    }

    // 5. replace (แทนที่สี)
    export function fximgReplace(fxpic: Fximg, from: number, to: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        from &= 0xF; to &= 0xF;
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;
            const w = fximgWidthOf(fxpic);
            idx *= w;
            const h = fximgHeightOf(fxpic);
            const rowBuf = pins.createBuffer(h);
            for (let x = 0, rowChange = false; x < w; x++, rowChange = false) {
                fximgGetRows(fxpic, idx + x, rowBuf, h);
                for (let y = 0; y < h; y++) if (rowBuf[y] === from) rowBuf[y] = to, rowChange = true;
                if (rowChange) fximgSetRows(fxpic, idx + x, rowBuf, h);
            }
    }

    export function fximgEqualTo(fxpic: Fximg, otherfxpic: Fximg) {
        if ((fxpic as any as Buffer).length < 1 || (otherfxpic as any as Buffer).length < 1) return false;
        if ((fxpic as any as Buffer).length !== (otherfxpic as any as Buffer).length) return false;
        if (fximgWidthOf(fxpic) !== fximgWidthOf(otherfxpic) ||
            fximgHeightOf(fxpic) !== fximgHeightOf(otherfxpic)) return false
        return (fxpic as any as Buffer).equals(otherfxpic as any as Buffer);
    }

    // 10. copyFrom (copy ทั้ง buffer ถ้าขนาดเท่ากัน)
    export function fximgCopyFrom(fxpic: Fximg, from: Fximg) {
        if (fximgRoCheck(fxpic)) return;
        const w = Math.min(fximgWidthOf(from), fximgWidthOf(fxpic));
        const h = Math.min(fximgHeightOf(from), fximgHeightOf(fxpic))
        if (w < 1 || h < 1) return;
        if ((from as any as Buffer).length === (fxpic as any as Buffer).length) {
            (fxpic as any as Buffer).write(0, (from as any as Buffer));
            return;
        }
        const buf = pins.createBuffer(h);
        for (let i = 0; i < w; i++) {
            fximgGetRows(from, i, buf, h);
            fximgSetRows(fxpic, i, buf, h);
        }
    }

    // 11. clone
    export function fximgClone(fxpic: Fximg): Fximg {
        return (fxpic as any as Buffer).slice() as any as Fximg;
    }
    
}
