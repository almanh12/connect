import sharp from "sharp";
import toIco from "to-ico";
import { writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const faviconPath = join(root, "public", "favicon.ico");

// DECA diamond shape - blue (#0072CE)
const diamondSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path fill="#0072CE" d="M16 2L2 16l14 14 14-14L16 2z" transform="rotate(45 16 16)"/>
</svg>
`;

async function main() {
  const png = await sharp(Buffer.from(diamondSvg))
    .resize(32, 32)
    .png()
    .toBuffer();
  const ico = await toIco([png], { resize: false });
  await writeFile(faviconPath, ico);
  console.log("Generated public/favicon.ico (diamond shape)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
