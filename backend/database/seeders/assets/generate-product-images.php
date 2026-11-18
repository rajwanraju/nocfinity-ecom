<?php

/**
 * Generates the local, dependency-free product placeholder images used by the
 * seeders. Run once: php database/seeders/assets/generate-product-images.php
 *
 * The generated JPEGs are committed so `migrate:fresh --seed` never needs
 * network access or an image library beyond GD.
 */
$width = 800;
$height = 1000;

$palettes = [
    [[246, 241, 232], [198, 166, 128], [54, 45, 36]],
    [[236, 239, 235], [156, 178, 158], [38, 50, 42]],
    [[243, 235, 228], [196, 142, 124], [58, 38, 34]],
    [[238, 237, 243], [152, 151, 179], [36, 35, 50]],
    [[244, 240, 226], [196, 176, 116], [52, 47, 32]],
    [[233, 238, 242], [128, 158, 178], [28, 42, 52]],
    [[247, 238, 236], [206, 154, 154], [60, 34, 34]],
    [[238, 241, 229], [174, 186, 138], [44, 50, 32]],
    [[245, 242, 238], [184, 170, 158], [44, 40, 36]],
    [[235, 233, 240], [144, 136, 168], [34, 30, 44]],
    [[248, 243, 235], [212, 180, 140], [60, 48, 34]],
    [[232, 240, 238], [132, 172, 166], [26, 46, 44]],
    [[247, 235, 233], [208, 144, 136], [62, 34, 32]],
    [[239, 241, 234], [166, 182, 150], [40, 48, 36]],
    [[246, 244, 240], [192, 184, 172], [46, 42, 38]],
    [[236, 235, 242], [156, 152, 180], [36, 34, 50]],
];

$dir = __DIR__.'/products';
if (! is_dir($dir) && ! mkdir($dir, 0775, true) && ! is_dir($dir)) {
    fwrite(STDERR, "Cannot create {$dir}\n");
    exit(1);
}

for ($index = 1; $index <= 28; $index++) {
    $palette = $palettes[($index - 1) % count($palettes)];
    [$light, $mid, $dark] = $palette;
    $image = imagecreatetruecolor($width, $height);

    // Soft diagonal gradient.
    for ($y = 0; $y < $height; $y++) {
        $t = $y / $height;
        $r = (int) round($light[0] + ($mid[0] - $light[0]) * $t);
        $g = (int) round($light[1] + ($mid[1] - $light[1]) * $t);
        $b = (int) round($light[2] + ($mid[2] - $light[2]) * $t);
        $line = imagecolorallocate($image, $r, $g, $b);
        imageline($image, 0, $y, $width, $y, $line);
    }

    // Abstract editorial shapes.
    $shape = imagecolorallocatealpha($image, 255, 255, 255, 96);
    $shadow = imagecolorallocatealpha($image, $dark[0], $dark[1], $dark[2], 96);
    $stroke = imagecolorallocatealpha($image, $dark[0], $dark[1], $dark[2], 40);

    if ($index % 3 === 0) {
        imagefilledellipse($image, 400, 430, 460, 620, $shape);
        imagefilledellipse($image, 520, 620, 230, 230, $shadow);
    } elseif ($index % 3 === 1) {
        imagefilledrectangle($image, 190, 190, 610, 720, $shape);
        imagefilledellipse($image, 400, 760, 380, 260, $shadow);
    } else {
        imagefilledellipse($image, 400, 480, 520, 520, $shape);
        imagefilledrectangle($image, 210, 600, 590, 690, $shadow);
    }

    imagesetthickness($image, 2);
    imagerectangle($image, 48, 48, $width - 48, $height - 48, $stroke);
    imageline($image, 48, $height - 132, $width - 48, $height - 132, $stroke);

    $wordmark = imagecolorallocate($image, $dark[0], $dark[1], $dark[2]);
    imagestring($image, 5, 64, $height - 104, 'NOCFINITY', $wordmark);
    imagestring($image, 3, 64, $height - 78, 'EDITORIAL ESSENTIALS', $wordmark);

    $path = sprintf('%s/product-%02d.jpg', $dir, $index);
    imagejpeg($image, $path, 86);
    imagedestroy($image);
}

echo "Generated 28 images in {$dir}\n";
