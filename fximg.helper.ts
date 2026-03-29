type Fximg = string;
namespace Fximg {

}

enum FximgDataIdx {
    width = 0x0,
    height = 0x1,
    length = 0x2,
    start = 0x3,
};

namespace helpers {

    export let fximgValidate = false;

    //export const PI0_1     = Math.PI * 0.1;
    //export const PI0_2     = Math.PI * 0.2;
    //const PI0_0111_ = Math.PI * 0.111111111111111;

    export function fximgFinv(x: number): number {
        if (x === 0) return Infinity;
        if (x < 0) return -fximgFinv(-x);

        // 1. Range Scaling
        // ปรับ x ให้อยู่ในช่วง [0.5, 1.0] เพื่อความแม่นยำของพหุนาม
        // โดยการคูณด้วย 0.5 หรือ 2 (เทียบเท่าการเลื่อน Bit)
        let scale = 1;
        while (x < 0.5) x *= 2,   scale *= 2;
        while (x > 1.0) x *= 0.5, scale *= 0.5;

        /**
         * 2. Polynomial Approximation (Degree 2)
         * สูตร: f(x) ≈ a*x^2 + b*x + c
         * สำหรับช่วง [0.5, 1.0] สัมประสิทธิ์ที่เหมาะสมคือ:
         */
        const a = 1.4545;
        const b = -4.3636;
        const c = 3.9091;

        // คำนวณด้วย Horner's Method: (a*x + b)*x + c
        let y = (a * x + b) * x + c;

        // 3. Scaling กลับ
        return y * scale;
    }

    const PI = 3.14159265;
    const TWO_PI = 6.28318531;

    /**
     * Folded Polynomial Sine
     * - ความแม่นยำ: ปานกลาง (Error ~0.001)
     * - ช่วงผลลัพธ์: [-1.0, 1.0] แน่นอน
     */
    export function fximgFsin(x: number): number {
        // 1. Range Reduction & Folding
        // ปรับ x ให้อยู่ในช่วง [-PI, PI]
        x += PI;
        x = x % TWO_PI;
        if (x < 0) x += TWO_PI, x = x % TWO_PI;
        x -= PI;
        if (x > PI) x -= TWO_PI;
        if (x < -PI) x += TWO_PI;

        // 2. Optimized Polynomial
        // สูตร: y = 1.2732 * x - 0.4053 * x * |x|
        // ค่า 1.2732 คือ 4/PI และ 0.4053 คือ 4/PI^2
        let y = 1.27323954 * x - 0.40528473 * x * (x < 0 ? -x : x);

        // 3. ปรับสมดุล (Smoothing) เล็กน้อยเพื่อให้ผลลัพธ์ไม่เกิน 1
        // ใช้การดัดโค้งด้วยพหุนามกำลัง 2 อีกชั้นแบบเบาๆ
        // ค่า 0.225 เป็นค่าคงที่มาตรฐานที่ทำให้ error ต่ำที่สุด
        return 0.225 * (y * (y < 0 ? -y : y) - y) + y;
    }

    /**
     * Cosine โดยการเลื่อนเฟส
     */
    export function fximgFcos(x: number): number {
        return fximgFsin(x + 1.57079633); // x + PI/2
    }

    export function fximgPsqrt(x: number): number {
        if (x <= 0) return 0;
        if (x === Infinity) return Infinity;

        // 1. Range Scaling (แทนการหารด้วยการคูณ)
        // เพื่อให้พหุนามแม่นยำที่สุด เราจะสเกล x ให้อยู่ในช่วง [0.5, 2.0]
        let scale = 1;

        // ใช้ Loop ปรับค่า scale (ใช้การคูณ/บรรทัดคำนวณสั้นๆ แทนการหาร)
        // การคูณด้วย 0.25 หรือ 4 เร็วมากในระดับ CPU
        while (x < 0.5) x *= 4,    scale *= 0.5;
        while (x > 2.0) x *= 0.25, scale *= 2;

        /**
         * 2. High-Degree Polynomial Approximation
         * สูตรพหุนามกำลัง 4 ที่ปรับจูนมาเพื่อช่วง [0.5, 2.0]
         * f(x) = a + bx + cx^2 + dx^3 + ex^4
         */
        const a = 0.16541;
        const b = 1.34135;
        const c = -0.73949;
        const d = 0.29323;
        const e = -0.05282;

        // ใช้ Horner's Method เพื่อประหยัดการคูณ (เหลือการคูณแค่ 4 ครั้ง)
        // res = (((e*x + d)*x + c)*x + b)*x + a
        let res = e;
        res = res * x + d;
        res = res * x + c;
        res = res * x + b;
        res = res * x + a;

        // 3. Scale กลับไปยังค่าเดิม
        return res * scale;
    }

/*
    // ค่า sin(theta * 2π / 256) * 127 (ประมาณ ±127) เพื่อให้เป็น int8-friendly
    // แต่เก็บเป็น number (int16) เพื่อความแม่นยำในการคำนวณ
    const sineTable: number[] = [
        0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45,
        48, 51, 54, 57, 59, 62, 65, 67, 70, 72, 75, 77, 80, 82, 84, 86,
        88, 90, 92, 94, 96, 98, 99, 101, 102, 104, 105, 106, 108, 109, 110, 111,
        112, 113, 114, 115, 115, 116, 117, 117, 118, 118, 119, 119, 119, 120, 120, 120,
        120, 120, 120, 120, 119, 119, 119, 118, 118, 117, 117, 116, 115, 115, 114, 113,
        112, 111, 110, 109, 108, 106, 105, 104, 102, 101, 99, 98, 96, 94, 92, 90,
        88, 86, 84, 82, 80, 77, 75, 72, 70, 67, 65, 62, 59, 57, 54, 51,
        48, 45, 42, 39, 36, 33, 30, 27, 24, 21, 18, 15, 12, 9, 6, 3,
        0, -3, -6, -9, -12, -15, -18, -21, -24, -27, -30, -33, -36, -39, -42, -45,
        -48, -51, -54, -57, -59, -62, -65, -67, -70, -72, -75, -77, -80, -82, -84, -86,
        -88, -90, -92, -94, -96, -98, -99, -101, -102, -104, -105, -106, -108, -109, -110, -111,
        -112, -113, -114, -115, -115, -116, -117, -117, -118, -118, -119, -119, -119, -120, -120, -120,
        -120, -120, -120, -120, -119, -119, -119, -118, -118, -117, -117, -116, -115, -115, -114, -113,
        -112, -111, -110, -109, -108, -106, -105, -104, -102, -101, -99, -98, -96, -94, -92, -90,
        -88, -86, -84, -82, -80, -77, -75, -72, -70, -67, -65, -62, -59, -57, -54, -51,
        -48, -45, -42, -39, -36, -33, -30, -27, -24, -21, -18, -15, -12, -9, -6, -3
    ];

    export function fximgIsin(theta: number): number {
        return sineTable[theta & 0xFF];
    }

    export function fximgIcos(theta: number): number {
        return sineTable[(theta + 64) & 0xFF];  // cos = sin + 90° (64 ใน 256)
    }
    */

    const HASH_POWER = 0xffff

    const fximgDataStr = {
        0x0: `width`,
        0x1: `height`,
        0x2: `length`,
        0x3: `start`,
    };

    export function fximgIsOutOfRange(n: number, r: number) { return (n < 0 || n >= r); };
    export function fximgIsOutOfRangeFacing(d: number, n: number, m: number, r: boolean) { return (
        r ? ((d <= 0 && n < 0) || (d >= 0 && n >= m))
        :   ((d >= 0 && n < 0) || (d <= 0 && n >= m))
    )}
    export function fximgIsOutOfArea(x: number, y: number, w: number, h: number) { return (fximgIsOutOfRange(x, w) || fximgIsOutOfRange(y, h)); };
    export function fximgIsOutOfAreas(pos: pt2[], w: number, h: number) { return pos.every(v => (fximgIsOutOfArea(v.x, v.y, w, h))); };

    export const fximgPos2idx = (a: number, r: number, b: number) => (a * r) + b;
    export const fximgIsEmptyImage = (img: Image) => img.equals(image.create(img.width, img.height));

    const fximgHextxt = '0123456789ABCDEF'

    const fximgNumToHex = (n: number) => {
        if (!n) return "0";
        let txt = ""
        while (n)
            txt += fximgHextxt[n & 0xf],
            n >>>= 4;
        return txt;
    }

    const fximgNumLeftZeroPad = (n: number, r: number) => {
        let txt = fximgNumToHex(n);
        if (txt.length < r) while (txt.length < r) txt = "0" + txt;
        return txt;
    }

    const fximgHashAlert = (stored: number, computed: number) => {
        throw `
signture mismatch:
- stored: ${"0x" + fximgNumLeftZeroPad(stored & 0xff, 2)}
- edited: ${"0x" + fximgNumLeftZeroPad(computed, 2)}
`
    }

    function fximgMakeHeaderHash(fximg: Fximg) {
        const buf = (fximg as any as Buffer).slice(1, 1);
        return buf.hash(HASH_POWER) & 0xff;
    }

    function fximgIsValidHeader(fximg: Fximg): boolean {
        return fximgMakeHeaderHash(fximg) === (fximg as any as Buffer)[0];
    }

    function fximgHeaderCheck(fximg: Fximg) {
        if (!fximgValidate) return;
        if (fximgIsValidHeader(fximg)) return;
        const hash = fximgMakeHeaderHash(fximg)
        fximgHashAlert((fximg as any as Buffer)[0], hash)
    }

    function fximgMakeMetadataHash(fximg: Fximg) {
        return (fximg as any as Buffer).slice(3, fximgStartIndex(fximg) - 4).hash(HASH_POWER) & 0xff;
    }

    function fximgIsValidMetadata(fximg: Fximg) {
        return (fximg as any as Buffer)[2] === fximgMakeMetadataHash(fximg);
    }

    function fximgMakeOffsetHash(fximg: Fximg) {
        return (fximg as any as Buffer).slice((fximg as any as Buffer).length - 5, 4).hash(HASH_POWER) & 0xff;
    }

    function fximgIsValidOffset(fximg: Fximg) {
        return fximgMakeOffsetHash(fximg) === (fximg as any as Buffer)[(fximg as any as Buffer).length - 1];
    }

    function fximgValidation(fximg: Fximg) {
        if (!fximgValidate) return;
        fximgHeaderCheck(fximg);
        if (fximgIsValidOffset(fximg)) return;
        if (fximgIsValidMetadata(fximg)) return;
        const hash = fximgMakeMetadataHash(fximg);
        fximgHashAlert((fximg as any as Buffer)[2], hash);
    }

    // อ่าน flag
    export function fximgIsReadonly(fximg: Fximg): boolean {
        if ((fximg as any as Buffer).length < 1) return false;
        return ((fximg as any as Buffer)[1] & 0b10000000) !== 0;  // bit7
    }

    export function fximgIsMetadataFrozen(fximg: Fximg): boolean {
        if ((fximg as any as Buffer).length < 1) return false;
        return ((fximg as any as Buffer)[1] & 0b01000000) !== 0;  // bit6
    }

    // ตั้ง flag (แต่ต้องเช็คก่อนว่าอนุญาตไหม)
    export function fximgSetReadonly(fximg: Fximg, value: boolean) {
        if (fximgValidate) fximgHeaderCheck(fximg);
        //if (fximgIsMetadataFrozen(fximg)) return; // ห้ามแก้ถ้า freeze
        const changed = fximgIsReadonly(fximg) !== value;
        if (value) (fximg as any as Buffer)[1] |= 0b10000000;
        else (fximg as any as Buffer)[1] &= ~0b10000000;
        if (!changed) return;
        (fximg as any as Buffer)[0] = fximgMakeHeaderHash(fximg);
    }

    function fximgSetMetadataFrozen(fximg: Fximg, value: boolean) {
        if (fximgValidate) fximgHeaderCheck(fximg);
        if (fximgIsReadonly(fximg)) return; // ถ้า readonly แล้ว ห้าม set flag อื่น
        const changed = fximgIsMetadataFrozen(fximg) !== value;
        if (value) (fximg as any as Buffer)[1] |= 0b01000000;
        else (fximg as any as Buffer)[1] &= ~0b01000000;
        if (!changed) return;
        (fximg as any as Buffer)[0] = fximgMakeHeaderHash(fximg);
    }

    export function fximgInit(width: number, height: number, length: number, ro?: boolean): Fximg {
        const md = fximgInitMD(width, height, length);
        const fxpic = pins.createBuffer(md.start + ((1 + (width * height * length)) >>> 1) + 5) as any as Fximg;
        (fxpic as any as Buffer)[0] = md.hash;
        (fxpic as any as Buffer)[1] = md.header;
        const offsetData = pins.createBuffer(4);
        offsetData[0] = fximgGetIndex(fxpic, 0x0).idx & 0xff;
        offsetData[1] = fximgGetIndex(fxpic, 0x1).idx & 0xff;
        offsetData[2] = fximgGetIndex(fxpic, 0x2).idx & 0xff;
        offsetData[3] = fximgGetIndex(fxpic, 0x3).idx & 0xff;
        const offsetHash = offsetData.hash(HASH_POWER) & 0xff;
        (fxpic as any as Buffer).write((fxpic as any as Buffer).length - 5, offsetData);
        (fxpic as any as Buffer)[(fxpic as any as Buffer).length - 1] = offsetHash;
        fximgSetData(fxpic, 0x0, width);
        fximgSetData(fxpic, 0x1, height);
        fximgSetData(fxpic, 0x2, length);
        fximgSetMetadataFrozen(fxpic, true);
        if (ro) fximgSetReadonly(fxpic, true);
        return fxpic as any as Fximg;
    }

    export function fximgGetOffsetUtils(header: number, hash: number, idxType: FximgDataIdx) {
        fximgHeaderCheck(pins.createBufferFromArray([hash, header]) as any as Fximg);
        if (idxType < 0x0 || idxType > 0x3) return { idx: -1, b2: -1 }
        header &= 0xff;
        let idx = 3, b2 = 0;
        for (let i = 0; i <= idxType; i++) {
            if (i >= 0x3) break;
            b2 = (header >> (i * 2));
            b2 &= 0x3;
            if (i < idxType) idx += (1 << b2)
        }
        return { idx: idx, b2: b2 }
    }
    export function fximgGetHeaderData(header: number, idxType: FximgDataIdx) {
        header &= 0xff;
        if (idxType >= 3) return -1;
        let b2 = (header >> ((2 - idxType) * 2));
        b2 &= 0x3
        return b2;
    }
    export function fximgGetIndex(fximg: Fximg, idxType: FximgDataIdx) {
        return fximgGetOffsetUtils((fximg as any as Buffer)[1], (fximg as any as Buffer)[0], idxType);
    }
    export function fximgGetOffset(fxpic: Fximg, idxType: FximgDataIdx): number {
        return (fxpic as any as Buffer)[idxType + ((fxpic as any as Buffer).length - 5)]
    }
    export function fximgStartIndex(fxpic: Fximg) {
        return fximgGetOffset(fxpic, 0x3);
    }
    export function fximgSetData(fximg: Fximg, dataType: FximgDataIdx, v: number) {
        if (fximgIsMetadataFrozen(fximg)) {
            throw `this ${fximgDataStr[dataType]} is immutable`
            return;
        }
        if (dataType >= 0x3) return;
        const idx = fximgGetOffset(fximg, dataType);
        const b2  = fximgGetHeaderData((fximg as any as Buffer)[1], dataType)
        if (idx < 0 || b2 < 0) return;
        if (b2 === 0x2) {
            if (v > 0xffffffff) v = 0xffffffff;
            (fximg as any as Buffer).setNumber(NumberFormat.UInt32LE, idx, v);
        } else if (b2 === 0x1) {
            if (v > 0xffff) v = 0xffff;
            (fximg as any as Buffer).setNumber(NumberFormat.UInt16LE, idx, v);
        } else if (b2 === 0x0) {
            if (v > 0xff) v = 0xff;
            (fximg as any as Buffer).setNumber(NumberFormat.UInt8LE, idx, v);
        }
        (fximg as any as Buffer)[2] = fximgMakeMetadataHash(fximg);
    }
    export function fximgGetData(fximg: Fximg, dataType: FximgDataIdx) {
        fximgValidation(fximg);
        const idx = fximgGetOffset(fximg, dataType);
        const b2  = fximgGetHeaderData((fximg as any as Buffer)[1], dataType);
        if (idx < 0 || b2 < 0) return -1;
        if (dataType >= 0x3) return idx;
        if (b2 >= 0x3) return -1;
        if (b2 >= 0x2) return (fximg as any as Buffer).getNumber(NumberFormat.UInt32LE, idx);
        if (b2 >= 0x1) return (fximg as any as Buffer).getNumber(NumberFormat.UInt16LE, idx);
        return (fximg as any as Buffer).getNumber(NumberFormat.UInt8LE, idx);
    }

    export function fximgWidthOf(fximg: Fximg) {
        if ((fximg as any as Buffer).length < 1) return -1;
        return fximgGetData(fximg, 0x0);
    }
    export function fximgHeightOf(fximg: Fximg) {
        if ((fximg as any as Buffer).length < 1) return -1;
        return fximgGetData(fximg, 0x1);
    }
    export function fximgLengthOf(fximg: Fximg) {
        if ((fximg as any as Buffer).length < 5) return -1;
        return fximgGetData(fximg, 0x2);
    }
    export function fximgDimensionOf(fximg: Fximg, d: image.Dimension) {
        switch (d) {
            case image.Dimension.Width: return fximgWidthOf(fximg);
            case image.Dimension.Height: return fximgHeightOf(fximg);
        } return -1;
    }

    export function fximgInitMD(width: number, height: number, length: number) {
        if (width > 0xffffffff) width = 0xffffffff; if (height > 0xffffffff) height = 0xffffffff; if (length > 0xffffffff) length = 0xffffffff;
        let header = 0b00000000, ws = 0, hs = 0, ls = 0;
        if (width > 0xff) ws++;
        if (width > 0xffff) ws++;
        //if (ws < 0x0 || ws > 0x3) ws &= 0x3;
        if (ws > 0x0) header += (ws << 4);
        if (height > 0xff) hs++;
        if (height > 0xffff) hs++;
        //if (hs < 0x0 || hs > 0x3) hs &= 0x3;
        if (hs > 0x0) header += (hs << 2);
        if (length > 0xff) ls++;
        if (length > 0xffff) ls++;
        //if (ls < 0x0 || ls > 0x3) ls &= 0x3;
        if (ls > 0x0) header += (ls);
        const buf = pins.createBuffer(1);
        buf[0] = header & 0xff;
        const md = { header: header, ws, hs, ls, start: 3, hash: buf.hash(HASH_POWER) & 0xff };
        md.start += (1 << ws);
        md.start += (1 << hs);
        md.start += (1 << ls);
        return md;
    }

}
