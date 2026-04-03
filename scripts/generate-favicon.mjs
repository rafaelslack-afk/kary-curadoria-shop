import sharp from "sharp";
import { existsSync } from "fs";

const logoPath = "./public/logo/Logo_Kary_Curadoria.jpeg";

if (!existsSync(logoPath)) {
  console.error(`\nArquivo não encontrado: ${logoPath}`);
  console.error("Copie Logo_Kary_Curadoria.jpeg para public/logo/ e rode novamente.\n");
  process.exit(1);
}

// Ler dimensões originais
const meta = await sharp(logoPath).metadata();
console.log(`Imagem original: ${meta.width}x${meta.height}px`);

// Corte do monograma KC (medido na imagem 1408x768)
// KC ocupa aprox. x:400–990, y:35–375 → quadrado 630px a partir de left=390, top=10
const cropLeft = 390;
const cropTop  = 10;
const cropSize = 630;

console.log(`Crop: left=${cropLeft} top=${cropTop} size=${cropSize}`);

const BG = { r: 237, g: 232, b: 220, alpha: 1 }; // #EDE8DC

// favicon-32.png
await sharp(logoPath)
  .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
  .resize(32, 32)
  .png()
  .toFile("./public/favicon-32.png");
console.log("✓ favicon-32.png");

// favicon-16.png
await sharp(logoPath)
  .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
  .resize(16, 16)
  .png()
  .toFile("./public/favicon-16.png");
console.log("✓ favicon-16.png");

// apple-touch-icon.png (180x180 com fundo creme)
await sharp(logoPath)
  .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
  .resize(160, 160, { fit: "contain", background: BG })
  .extend({ top: 10, bottom: 10, left: 10, right: 10, background: BG })
  .png()
  .toFile("./public/apple-touch-icon.png");
console.log("✓ apple-touch-icon.png");

// icon-512.png (logo completo centralizado)
await sharp(logoPath)
  .resize(480, 480, { fit: "contain", background: BG })
  .extend({ top: 16, bottom: 16, left: 16, right: 16, background: BG })
  .png()
  .toFile("./public/icon-512.png");
console.log("✓ icon-512.png");

console.log("\nFavicons gerados em public/. Faça o build para aplicar.");
