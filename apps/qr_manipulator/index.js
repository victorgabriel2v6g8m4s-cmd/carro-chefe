import QRCode from "qrcode";
import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import canvasPkg from "canvas";

const { createCanvas, loadImage } = canvasPkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Função flexível para gerar QR Code altamente personalizado no backend (Node.js)
 * @param {Object} opcoes Configurações de personalização do QR Code
 */
async function criarQRCodePersonalizado({
    texto = "https://example.com",
    tamanho = 400,
    imageName = null,
    bgImageName = null,          // 🟢 NOVO: Nome da imagem de fundo (ex: "fundo.jpg")
    bgOpacity = 0.3,             // 🟢 NOVO: Opacidade do fundo (0.0 a 1.0)
    outputName = null,
    corFundo = "#ffffff",
    corElementos = "#1a202c",
    estiloDados = "ponto",
    estiloCantos = "arredondado",
    escalaPontos = 0.65,
    escalaQuadradosOlhos = 1.0,
    arredondamentoCantos = 0.25,
    tamanhoLogoPercentual = 0.22,
    arredondamentoLogo = 12,
    margemSegurancaLogo = 3
}) {
    try {
        const canvas = createCanvas(tamanho, tamanho);
        const ctx = canvas.getContext("2d");

        // 1. Define a cor base do fundo (importante caso a imagem de fundo tenha transparência)
        ctx.fillStyle = corFundo;
        ctx.fillRect(0, 0, tamanho, tamanho);

        // 2. 🟢 NOVO: Carrega e renderiza a imagem de background com opacidade ajustada
        if (bgImageName) {
            const caminhoBg = join(__dirname, `background/${bgImageName}`);
            if (fs.existsSync(caminhoBg)) {
                const bgBuffer = fs.readFileSync(caminhoBg);
                const imgBg = await loadImage(bgBuffer);

                ctx.save();
                ctx.globalAlpha = bgOpacity; // Define o nível de transparência da imagem de fundo

                // Desenha o fundo cobrindo todo o Canvas (ajusta proporcionalmente se necessário)
                ctx.drawImage(imgBg, 0, 0, tamanho, tamanho);

                ctx.restore(); // Restaura a opacidade padrão (1.0) para os próximos desenhos
            } else {
                console.warn(`⚠️ Aviso: Imagem de fundo não encontrada em "${caminhoBg}".`);
            }
        }

        // 3. Calcula a matriz binária do QR Code
        const matrizQr = QRCode.create(texto, { errorCorrectionLevel: "H" });
        const totalModulos = matrizQr.modules.size;
        const tamanhoModulo = tamanho / totalModulos;

        const centroMin = Math.floor(totalModulos / 2) - margemSegurancaLogo;
        const centroMax = Math.ceil(totalModulos / 2) + (margemSegurancaLogo - 1);

        ctx.fillStyle = corElementos;

        for (let r = 0; r < totalModulos; r++) {
            for (let c = 0; c < totalModulos; c++) {
                if (matrizQr.modules.get(c, r)) {
                    let x = c * tamanhoModulo;
                    let y = r * tamanhoModulo;

                    if (imageName && r >= centroMin && r <= centroMax && c >= centroMin && c <= centroMax) {
                        continue;
                    }

                    const ehOlhoSuperiorEsquerdo = r < 7 && c < 7;
                    const ehOlhoSuperiorDireito = r < 7 && c >= totalModulos - 7;
                    const ehOlhoInferiorEsquerdo = r >= totalModulos - 7 && c < 7;

                    if (ehOlhoSuperiorEsquerdo || ehOlhoSuperiorDireito || ehOlhoInferiorEsquerdo) {
                        continue;
                    } else {
                        if (estiloDados === "ponto") {
                            const cx = x + tamanhoModulo / 2;
                            const cy = y + tamanhoModulo / 2;
                            const raioPonto = (tamanhoModulo / 2) * escalaPontos;

                            ctx.beginPath();
                            ctx.arc(cx, cy, raioPonto, 0, 2 * Math.PI);
                            ctx.fill();
                        } else {
                            ctx.fillRect(x, y, tamanhoModulo, tamanhoModulo);
                        }
                    }
                }
            }
        }

        const tamanhoOlhoOriginal = tamanhoModulo * 7;
        const tamanhoOlhoCustomizado = tamanhoOlhoOriginal * escalaQuadradosOlhos;
        const deslocamentoOlho = (tamanhoOlhoOriginal - tamanhoOlhoCustomizado) / 2;

        const posicoesOlhos = [
            { x: deslocamentoOlho, y: deslocamentoOlho },
            { x: (tamanhoModulo * (totalModulos - 7)) + deslocamentoOlho, y: deslocamentoOlho },
            { x: deslocamentoOlho, y: (tamanhoModulo * (totalModulos - 7)) + deslocamentoOlho }
        ];

        posicoesOlhos.forEach(pos => {
            if (estiloCantos === "arredondado" || estiloCantos === "original") {
                const innerRadius = estiloCantos === "arredondado" ? tamanhoModulo * arredondamentoCantos : 0;

                desenharRetanguloArredondado(ctx, pos.x, pos.y, tamanhoOlhoCustomizado, tamanhoOlhoCustomizado, innerRadius);

                ctx.fillStyle = corFundo;
                const recuoInterno = tamanhoModulo * escalaQuadradosOlhos;
                const tamMioloVazio = tamanhoOlhoCustomizado - (recuoInterno * 2);
                desenharRetanguloArredondado(ctx, pos.x + recuoInterno, pos.y + recuoInterno, tamMioloVazio, tamMioloVazio, innerRadius * 0.7);

                ctx.fillStyle = corElementos;
                const recuoPontoCentral = tamanhoModulo * 2 * escalaQuadradosOlhos;
                const tamPontoCentral = tamanhoOlhoCustomizado - (recuoPontoCentral * 2);
                desenharRetanguloArredondado(ctx, pos.x + recuoPontoCentral, pos.y + recuoPontoCentral, tamPontoCentral, tamPontoCentral, innerRadius * 0.5);
            } else if (estiloCantos === "ponto") {
                const centroX = pos.x + tamanhoOlhoCustomizado / 2;
                const centroY = pos.y + tamanhoOlhoCustomizado / 2;
                ctx.beginPath();
                ctx.arc(centroX, centroY, tamanhoOlhoCustomizado / 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        });

        // Inserção da Logo centralizada com preservação de Aspect Ratio
        if (imageName) {
            const caminhoLogo = join(__dirname, `center/${imageName}`);
            if (fs.existsSync(caminhoLogo)) {
                const logoBuffer = fs.readFileSync(caminhoLogo);
                const imgLogo = await loadImage(logoBuffer);

                const limiteMaximo = tamanho * tamanhoLogoPercentual;
                let larguraLogo = limiteMaximo;
                let alturaLogo = limiteMaximo;

                if (imgLogo.width > imgLogo.height) {
                    alturaLogo = limiteMaximo * (imgLogo.height / imgLogo.width);
                } else if (imgLogo.height > imgLogo.width) {
                    larguraLogo = limiteMaximo * (imgLogo.width / imgLogo.height);
                }

                const logoX = (tamanho - larguraLogo) / 2;
                const logoY = (tamanho - alturaLogo) / 2;

                ctx.save();
                ctx.beginPath();

                ctx.moveTo(logoX + arredondamentoLogo, logoY);
                ctx.lineTo(logoX + larguraLogo - arredondamentoLogo, logoY);
                ctx.quadraticCurveTo(logoX + larguraLogo, logoY, logoX + larguraLogo, logoY + arredondamentoLogo);
                ctx.lineTo(logoX + larguraLogo, logoY + alturaLogo - arredondamentoLogo);
                ctx.quadraticCurveTo(logoX + larguraLogo, logoY + alturaLogo, logoX + larguraLogo - arredondamentoLogo, logoY + alturaLogo);
                ctx.lineTo(logoX + arredondamentoLogo, logoY + alturaLogo);
                ctx.quadraticCurveTo(logoX, logoY + alturaLogo, logoX, logoY + alturaLogo - arredondamentoLogo);
                ctx.lineTo(logoX, logoY + arredondamentoLogo);
                ctx.quadraticCurveTo(logoX, logoY, logoX + arredondamentoLogo, logoY);

                ctx.closePath();
                ctx.clip();

                ctx.drawImage(imgLogo, logoX, logoY, larguraLogo, alturaLogo);
                ctx.restore();
            }
        }

        const nomeArquivoFinal = outputName ? outputName : (imageName ? imageName : "qrcode.png");
        const bufferFinal = canvas.toBuffer("image/png");
        const caminhoSaida = join(__dirname, `output/${nomeArquivoFinal}`);
        fs.writeFileSync(caminhoSaida, bufferFinal);

        console.log(`✅ QR Code gerado com sucesso em "output/${nomeArquivoFinal}"!`);

    } catch (erro) {
        console.error("❌ Erro ao gerar o QR Code parametrizado:", erro);
    }
}

function desenharRetanguloArredondado(ctx, x, y, width, height, radius) {
    if (radius === 0) {
        ctx.fillRect(x, y, width, height);
        return;
    }
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}


// Execução de teste
criarQRCodePersonalizado({
    texto: "https://carrochefe.com",
    tamanho: 800,
    imageName: null, // Sua logo em center/3.png
    outputName: "qrcode-carro-sozinho-bg.png",
    bgImageName: "3.png",
    corFundo: "#000000",
    bgOpacity: 0.4,
    corElementos: "#ca9d64",
    estiloDados: "ponto",
    escalaPontos: 0.65,
    estiloCantos: "arredondado",
    arredondamentoCantos: 0.30,
    escalaQuadradosOlhos: 0.9,
    tamanhoLogoPercentual: 0.24,
    arredondamentoLogo: 12 // ⚠️ Reduzido para 12. Se a imagem for muito retangular, o valor 50 de antes pode deformar os cantos.
});
