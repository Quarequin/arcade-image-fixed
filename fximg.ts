
/**
 * @author Phatiski NaphatManeenil(Phat)
 * fixed image manager
 */
//% block="fixed image" color="#18EC97" icon="\uf03e"
namespace fximges {

    //               fximg/fxpic structure as buffer
    //
    //            header metadata layout (bit6 -> bit1)
    //
    //              |header|width  |height |length |
    //              |      |b6 - b5|b4 - b3|b2 - b1|
    //              |------|-------|-------|-------|
    //              |0b00  |Uint8  |Uint8  |Uint8  |
    //              |0b01  |Uint16 |Uint16 |Uint16 |
    //              |0b10  |Uint32 |Uint32 |Uint32 |
    //              |0b11  |Null   |Null   |Null   |
    //
    //                         flag header 
    //               [ bit8 = read-only mode       ]
    //               [ bit7 = metadata-frozen mode ]
    //
    // fximg pixel-data -> 1nibble per 1pixel (1-16 index color)
    // 
    //                       data structure
    //               [ byte1     = header'sHash    ]
    //               [ byte1     = header          ]
    //               [ byte1     = metadata'sHash  ]
    //               [ byte1>2>4 = width           ]
    //               [ byte1>2>4 = height          ]
    //               [ byte1>2>4 = length          ]
    //               [ byte1<n   = nibblePixelData ]
    //               [ byte1<4   = preOffsetData   ]
    //               [ byte1     = preOffset'sHash ]

}

//% blockNamespace="fximges"
namespace fximg {

    /** */
    //% blockId=fximg_size_dimension block="$fxpic $dimension"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="create"
    export function dimensionOf(fxpic: Fximg, dimension: image.Dimension): number { return helpers.fximgDimensionOf(fxpic, dimension); };

    /** */
    export function widthOf(fxpic: Fximg): number { return helpers.fximgWidthOf(fxpic); };

    /** */
    export function heightOf(fxpic: Fximg): number { return helpers.fximgHeightOf(fxpic); };

    /** */
    export function startIndex(fxpic: Fximg): number { return helpers.fximgStartIndex(fxpic); };

    /** */
    //% blockId=fximg_size_length block="length of $fxpic"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="create"
    export function lengthOf(fxpic: Fximg): number { return helpers.fximgLengthOf(fxpic); };

    /** */
    //% blockId=fximg_create_frame block="create image frame| width $width height $height length $length"
    //% blockSetVariable=fxpictures
    //% group="create"
    export function createFrame(width: number, height: number, length: number): Fximg { return helpers.fximgCreateFrame(width, height, length); };

    /** */
    //% blockId=fximg_create block="create image| width $width height $height"
    //% blockSetVariable=fxpicture
    //% group="create"
    export function create(width: number, height: number): Fximg { return helpers.fximgCreate(width, height); };

    /** */
    //% blockId=fximg_from_image block="$pic=image_picker to fximage"
    //% group="import"
    export function fromImage(pic: Image): Fximg { return helpers.fximgFromImage(pic); };

    /** */
    //% blockId=fximg_to_image block="$fxpic to image"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="export"
    export function toImage(fxpic: Fximg): Image { return helpers.fximgToImage(fxpic); };

    /** */
    //% blockId=fximg_from_frame block="$pics=lists_create_with to fxframe"
    //% pics.defl=image_picker
    //% group="import"
    export function fromFrame(pics: Image[]): Fximg { return helpers.fximgFromFrame(pics); };

    /** */
    //% blockId=fximg_to_frame block="$fxpics to frame"
    //% fxpics.shadow=variables_get fxpics.defl=fxpictures
    //% group="export"
    export function toFrame(fxpics: Fximg): Image[] { return helpers.fximgToFrame(fxpics); };

    /** */
    //% blockId=fximg_get_frame block="get $fxpics at $idx"
    //% fxpics.shadow=variables_get fxpics.defl=fxpictures
    //% group="drawing"
    export function getFrame(fxpics: Fximg, idx: number): Fximg { return helpers.fximgGetFrame(fxpics, idx); };

    /** */
    //% blockId=fximg_set_frame block="set $fxpics at $idx to $fxpic"
    //% fxpics.shadow=variables_get fxpics.defl=fxpictures
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function setFrame(fxpics: Fximg, idx: number, fxpic: Fximg): void { helpers.fximgSetFrame(fxpics, idx, fxpic); };

    /** */
    //% blockId=fximg_set_pixel block="set $fxpic at x $x y $y to $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function setPixel(fxpic: Fximg, x: number, y: number, color: number): void { helpers.fximgSetPixel(fxpic, x, y, color); };

    /** */
    //% blockId=fximg_get_pixel block="get $fxpic at x $x y $y"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function getPixel(fxpic: Fximg, x: number, y: number): number { return helpers.fximgGetPixel(fxpic, x, y); };

    /** */
    export function setRows(fxpic: Fximg, x: number, buf: Buffer, h?: number): void { helpers.fximgSetRows(fxpic, x, buf, h); };

    /** */
    export function getRows(fxpic: Fximg, x: number, buf: Buffer, h?: number): void { helpers.fximgGetRows(fxpic, x, buf, h); };

    /** */
    //% blockId=fximg_color_fill block=" $fxpic fill $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function fill(fxpic: Fximg, color: number) { helpers.fximgFill(fxpic, color); };

    /** */
    //% blockId=fximg_trans_replace block=" replace color $fxpic from $fromColor=colorindexpicker to $toColor=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="transformation"
    export function replace(fxpic: Fximg, fromColor: number, toColor: number) { helpers.fximgReplace(fxpic, fromColor, toColor); };

    //% blockId=fximg_trans_trim block=" trimming $fxpic|| in $trimMode mode"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="transformation"
    export function trim(fxpic: Fximg, trimMode?: FximgTrimType): Fximg { return helpers.fximgTrim(fxpic, trimMode); };

    /** */
    //% blockId=fximg_cond_equals block=" $fxpic is equal $otherfxpic"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% otherfxpic.shadow=variables_get otherfxpic.defl=otherfxpicture
    //% group="compare"
    export function equals(fxpic: Fximg, otherfxpic: Fximg): boolean { return helpers.fximgEqualTo(fxpic, otherfxpic); };

    /** */
    //% blockId=fximg_get_clone block="clone $fxpic"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="create"
    export function clone(fxpic: Fximg) { return helpers.fximgClone(fxpic); };

    /** */
    //% blockId=fximg_set_clone block=" copy $fxpic from $otherfxpic"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% otherfxpic.shadow=variables_get otherfxpic.defl=otherfxpicture
    //% group="drawing"
    export function copyFrom(fxpic: Fximg, otherfxpic: Fximg) { return helpers.fximgCopyFrom(fxpic, otherfxpic); };

    /** */
    export function blitRow(dst: Fximg, xDst: number, yDst: number, wDst: number, hDst: number, src: Fximg, xSrc: number, hSrc: number) { helpers.fximgBlitRow(dst, xDst, yDst, wDst, hDst, src, xSrc, hSrc); }

    /** */
    export function blit(dst: Fximg, xDst: number, yDst: number, wDst: number, hDst: number, src: Fximg, xSrc: number, ySrc: number, wSrc: number, hSrc: number, transparent?: boolean, check?: boolean) { return helpers.fximgBlit(dst, xDst, yDst, wDst, hDst, src, xSrc, ySrc, wSrc, hSrc, transparent, check); };

    /** */
    //% blockId=fximg_draw_line block=" $fxpic draw line from x $x0 y $y0 to x $x1 y $y1 color $toColor=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function drawLine(fxpic: Fximg, x0: number, y0: number, x1: number, y1: number, color: number) { helpers.fximgDrawLine(fxpic, x0, y0, x1, y1, color); };

    /** */
    //% blockId=fximg_draw_rect block=" $fxpic draw rectangle at x $x y $y width $width height $height color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function drawRect(fxpic: Fximg, x: number, y: number, width: number, height: number, color: number) { helpers.fximgDrawRect(fxpic, x, y, width, height, color); };

    /** */
    //% blockId=fximg_fill_rect block=" $fxpic fill rectangle at x $x y $y width $width height $height color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function fillRect(fxpic: Fximg, x: number, y: number, width: number, heigth: number, color: number) { helpers.fximgFillRect(fxpic, x, y, width, heigth, color); };

    /** */
    //% blockId=fximg_draw_circle block=" $fxpic draw circle at x $x y $y radius $r color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function drawCircle(fxpic: Fximg, x: number, y: number, r: number, color: number) { helpers.fximgDrawCircle(fxpic, x, y, r, color); };

    /** */
    //% blockId=fximg_fill_circle block=" $fxpic fill circle at x $x y $y radius $r color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function fillCircle(fxpic: Fximg, x: number, y: number, r: number, color: number) { helpers.fximgFillCircle(fxpic, x, y, r, color); };

    /** */
    //% blockId=fximg_draw_oval block=" $fxpic draw oval at x $x y $y radius x $rx y $ry color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function drawOval(fxpic: Fximg, x: number, y: number, rx: number, ry: number, color: number) { helpers.fximgDrawOval(fxpic, x, y, rx, ry, color); };

    /** */
    //% blockId=fximg_fill_oval block=" $fxpic fill oval at x $x y $y radius x $rx y $ry color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function fillOval(fxpic: Fximg, x: number, y: number, rx: number, ry: number, color: number) { helpers.fximgFillOval(fxpic, x, y, rx, ry, color); };

    /** */
    export function drawTriangle(fxpic: Fximg, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number) { helpers.fximgDrawTriangle(fxpic, x0, y0, x1, y1, x2, y2, color); };

    /** */
    export function fillTriangle(fxpic: Fximg, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number) { helpers.fximgFillTriangle(fxpic, x0, y0, x1, y1, x2, y2, color); };

    /** */
    export function drawPolygon4(fxpic: Fximg, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: number) { helpers.fximgDrawPolygon4(fxpic, x0, y0, x1, y1, x2, y2, x3, y3, color); };

    /** */
    export function fillPolygon4(fxpic: Fximg, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: number) { helpers.fximgFillPolygon4(fxpic, x0, y0, x1, y1, x2, y2, x3, y3, color); };
    
    /** */
    export function drawImage(fxpic: Fximg, from: Fximg, x: number, y: number) { helpers.fximgDrawImage(fxpic, from, x, y); };

    /** */
    //% blockId=fximg_stamp_transparent block="$fxpic stamp $from at x $x y $y"
    //% from.shadow=fximg_from_image
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function drawTransparentImage(fxpic: Fximg, from: Fximg, x: number, y: number) { helpers.fximgDrawTransparentImage(fxpic, from, x, y); };

    /** */
    export function drawDistortedImage(fxpic: Fximg, from: Fximg, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3?: number, y3?: number) { helpers.fximgDrawDistortedImage(fxpic, from, x0, y0, x1, y1, x2, y2, x3, y3); };

    /** */
    export function drawTransDistortedImage(fxpic: Fximg, from: Fximg, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3?: number, y3?: number) { helpers.fximgDrawTransDistortedImage(fxpic, from, x0, y0, x1, y1, x2, y2, x3, y3); };

    /** */
    export function rotate90(fxpic: Fximg, n90: number): Fximg { return helpers.fximgRotate90(fxpic, n90); };

    /** */
    export function rotate(fxpic: Fximg, angle: number): Fximg { return helpers.fximgRotate(fxpic, angle); };
    
    /** */
    export function rotationFrame(fxpic: Fximg, count: number): Fximg { return helpers.fximgRotationFrame(fxpic, count); };

}

