// tests go here; this will not be compiled when this package is used as an extension.

game.stats = true;
control.EventContext.onStats("");

const imgfxa = fximg.fromImage(img`
    1 2 3 4 5
    6 7 8 9 a
    b c d e f
`)
const imgfxb = fximg.fromImage(scene.backgroundImage());
//fximg.fill(imgfxb, 1)
const w = fximg.widthOf(imgfxb), h = fximg.heightOf(imgfxb);

if (1) {
    //imgfxa[6] = 0x00
    //fximg.blit(imgfxb, 5, 3, 50, 30, imgfxa, 0, 0, 5, 3, false, false);
    //fximg.drawLine(imgfxb, 20, 32, 140, 100, 3);
    //fximg.fillRect(imgfxb, 4, 4, 16, 16, 3);
    //fximg.fillTriangle(imgfxb, 80, 30, 130, 80, 120, 20, 3);
    //fximg.drawDistortedImage(imgfxb, imgfxa, 20, 10, 20, 60, 10, 80, 80, 60)
    //fximg.fillPolygon4(imgfxb, 20, 10, 20, 60, 10, 80, 80, 60, 3);
    //fximg.drawTransDistortedImage(imgfxb, imgfxa,
    //    randint(0, w - 1), randint(0, h - 1),
    //    randint(0, w - 1), randint(0, h - 1),
    //    randint(0, w - 1), randint(0, h - 1),
    //    randint(0, w - 1), randint(0, h - 1),
    //)
    //fximg.drawTransparentImage(imgfxb, imgfxa, 0, -1);
    //fximg.fillRect(imgfxb, 50, 30, 60, 60, 3)
    //scene.setBackgroundImage(fximg.toImage(imgfxb))
}

//game.splash(imgfxa.width);


game.onUpdate(() => {
    //control.runInParallel(() => {
        let j = 8//randint(1, 4);
        for (let i = 0; i < j; i++) {
            if (0) fximg.fillPolygon4(imgfxb,
                randint(0, w - 1), randint(10, h - 1),
                randint(0, w - 1), randint(10, h - 1),
                randint(0, w - 1), randint(10, h - 1),
                randint(0, w - 1), randint(10, h - 1),
                randint(0x0, 0xf)
            );
            if (0) fximg.drawTransDistortedImage(imgfxb, imgfxa,
                randint(0, w - 1), randint(10, h - 1),
                randint(0, w - 1), randint(10, h - 1),
                randint(0, w - 1), randint(10, h - 1),
                randint(0, w - 1), randint(10, h - 1),
            );
            if (1) fximg.fillTriangle(imgfxb,
                randint(0, w - 1), randint(10, h - 1),
                randint(0, w - 1), randint(10, h - 1),
                randint(0, w - 1), randint(10, h - 1),
                randint(0x0, 0xf),
            );
            //scene.setBackgroundImage(fximg.toImage(imgfxb));
        }
        scene.setBackgroundImage(fximg.toImage(imgfxb));
        scene.backgroundImage().print(`draw count: ${j}`, 1, 1, 0x1)
    //})
})

