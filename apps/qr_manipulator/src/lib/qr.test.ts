import {describe,expect,it} from "vitest";import{generateQrMatrix,generateQrMatrixWithMask}from"./qr";import{buildPayload,cloneDefaultProject}from"./project";
const FIX=`11111110100001101010001111111
10000010000010110000001000001
10111010000111100011001011101
10111010100111001010101011101
10111010010001000001001011101
10000010000010110101101000001
11111110101010101010101111111
00000000001010111111000000000
00101110111110111010110001001
11000101010011111111011101001
10110111110100011000000111011
01101100010110001011111000010
10100111101110110011101100000
11001000110000111100111100011
10011011101010010100010100111
01100101110001100010011100001
10010010111001010100111001010
00010000101111100010111001111
10110011001001001000010000111
01011000011111001010101000011
10101010100111000111111110011
00000000100111000101100010011
11111110000101100101101010111
10000010100011111110100010011
10111010111001001010111111001
10111010011001001110110010000
10111010110000100111000111101
10000010011110000101110100010
11111110011100000001110010011`;
describe("QR encoder",()=>{it("matches reference fixture",()=>expect(generateQrMatrixWithMask("https://carrochefe.com","H",0).map(r=>r.map(c=>c?"1":"0").join("")).join("\n")).toBe(FIX));it("selects version",()=>{const r=generateQrMatrix("https://carrochefe.com","H");expect(r.version).toBe(3);expect(r.modules).toHaveLength(29)})});
describe("tracking",()=>{it("preserves query and hash",()=>{const p=cloneDefaultProject();p.value="https://carrochefe.com/cardapio?origem=fachada#chefao";p.tracking={enabled:true,id:"QR-20260817-A1B2C3D4",campaign:"inauguracao",variant:"chefao-cartaz-a"};const u=new URL(buildPayload(p));expect(u.searchParams.get("origem")).toBe("fachada");expect(u.searchParams.get("cc_qr")).toBe("QR-20260817-A1B2C3D4");expect(u.searchParams.get("cc_campaign")).toBe("inauguracao");expect(u.searchParams.get("cc_variant")).toBe("chefao-cartaz-a");expect(u.hash).toBe("#chefao")})});
