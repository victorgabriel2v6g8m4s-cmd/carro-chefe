export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

const MODE_BYTE = 4;
const PAD0 = 0xec;
const PAD1 = 0x11;
const G15 = 0x0537;
const G18 = 0x1f25;
const G15_MASK = 0x5412;

const ERROR_LEVEL_BITS: Record<ErrorCorrectionLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };
const PATTERN_POSITION_TABLE: number[][] = [[], [6,18], [6,22], [6,26], [6,30], [6,34], [6,22,38], [6,24,42], [6,26,46], [6,28,50]];
const RS_BLOCK_TABLE: number[][] = [
  [1,26,19],[1,26,16],[1,26,13],[1,26,9],
  [1,44,34],[1,44,28],[1,44,22],[1,44,16],
  [1,70,55],[1,70,44],[2,35,17],[2,35,13],
  [1,100,80],[2,50,32],[2,50,24],[4,25,9],
  [1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],
  [2,86,68],[4,43,27],[4,43,19],[4,43,15],
  [2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],
  [2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],
  [2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],
  [2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],
];
interface RsBlock { totalCount: number; dataCount: number; }
class BitBuffer {
  private readonly buffer: number[] = [];
  length = 0;
  put(value:number,length:number){ for(let i=0;i<length;i+=1)this.putBit(((value >>> (length-i-1))&1)===1); }
  putBit(bit:boolean){ const index=Math.floor(this.length/8); if(this.buffer.length<=index)this.buffer.push(0); if(bit)this.buffer[index]|=0x80 >>> (this.length%8); this.length+=1; }
  get(index:number){ return ((this.buffer[Math.floor(index/8)] >>> (7-(index%8)))&1)===1; }
}
const EXP_TABLE=new Array<number>(256); const LOG_TABLE=new Array<number>(256);
for(let i=0;i<8;i+=1)EXP_TABLE[i]=1<<i;
for(let i=8;i<256;i+=1)EXP_TABLE[i]=EXP_TABLE[i-4]^EXP_TABLE[i-5]^EXP_TABLE[i-6]^EXP_TABLE[i-8];
for(let i=0;i<255;i+=1)LOG_TABLE[EXP_TABLE[i]]=i;
function glog(n:number){ if(n<1)throw new Error(`glog(${n})`); return LOG_TABLE[n]; }
function gexp(n:number){ while(n<0)n+=255; while(n>=256)n-=255; return EXP_TABLE[n]; }
class Polynomial {
  readonly values:number[];
  constructor(values:number[],shift=0){ let offset=0; while(offset<values.length&&values[offset]===0)offset+=1; this.values=values.slice(offset).concat(new Array<number>(shift).fill(0)); }
  get length(){return this.values.length;} get(index:number){return this.values[index];}
  multiply(other:Polynomial){ const result=new Array<number>(this.length+other.length-1).fill(0); for(let i=0;i<this.length;i+=1)for(let j=0;j<other.length;j+=1)result[i+j]^=gexp(glog(this.get(i))+glog(other.get(j))); return new Polynomial(result); }
  mod(other:Polynomial):Polynomial{ if(this.length-other.length<0)return this; const ratio=glog(this.get(0))-glog(other.get(0)); const result=this.values.slice(); for(let i=0;i<other.length;i+=1)result[i]^=gexp(glog(other.get(i))+ratio); return new Polynomial(result).mod(other); }
}
function errorCorrectPolynomial(length:number){ let polynomial=new Polynomial([1]); for(let i=0;i<length;i+=1)polynomial=polynomial.multiply(new Polynomial([1,gexp(i)])); return polynomial; }
function getRsBlocks(version:number,level:ErrorCorrectionLevel){ const levelIndex=({L:0,M:1,Q:2,H:3} as const)[level]; const row=RS_BLOCK_TABLE[(version-1)*4+levelIndex]; if(!row)throw new Error(`Versão ${version} não suportada.`); const blocks:RsBlock[]=[]; for(let i=0;i<row.length;i+=3){ const count=row[i],totalCount=row[i+1],dataCount=row[i+2]; for(let j=0;j<count;j+=1)blocks.push({totalCount,dataCount}); } return blocks; }
function createBytes(buffer:BitBuffer,blocks:RsBlock[]){ let offset=0,maxDataCount=0,maxEcCount=0; const dataBlocks:number[][]=[],ecBlocks:number[][]=[]; for(const block of blocks){ const dataCount=block.dataCount,ecCount=block.totalCount-dataCount; maxDataCount=Math.max(maxDataCount,dataCount); maxEcCount=Math.max(maxEcCount,ecCount); const data=new Array<number>(dataCount); for(let i=0;i<dataCount;i+=1){ let value=0; for(let bit=0;bit<8;bit+=1)if(buffer.get((offset+i)*8+bit))value|=0x80>>>bit; data[i]=value; } offset+=dataCount; dataBlocks.push(data); const rsPoly=errorCorrectPolynomial(ecCount); const modPoly=new Polynomial(data,rsPoly.length-1).mod(rsPoly); const ec=new Array<number>(rsPoly.length-1).fill(0); for(let i=0;i<ec.length;i+=1){ const modIndex=i+modPoly.length-ec.length; ec[i]=modIndex>=0?modPoly.get(modIndex):0; } ecBlocks.push(ec); } const result:number[]=[]; for(let i=0;i<maxDataCount;i+=1)for(const block of dataBlocks)if(i<block.length)result.push(block[i]); for(let i=0;i<maxEcCount;i+=1)for(const block of ecBlocks)if(i<block.length)result.push(block[i]); return result; }
function createData(version:number,level:ErrorCorrectionLevel,bytes:Uint8Array){ const blocks=getRsBlocks(version,level),buffer=new BitBuffer(); buffer.put(MODE_BYTE,4); buffer.put(bytes.length,version<10?8:16); for(const byte of bytes)buffer.put(byte,8); const totalDataCount=blocks.reduce((sum,block)=>sum+block.dataCount,0); if(buffer.length>totalDataCount*8)throw new Error("Conteúdo grande demais para esta versão do QR Code."); if(buffer.length+4<=totalDataCount*8)buffer.put(0,4); while(buffer.length%8!==0)buffer.putBit(false); let first=true; while(buffer.length<totalDataCount*8){buffer.put(first?PAD0:PAD1,8); first=!first;} return createBytes(buffer,blocks); }
function bchDigit(data:number){let digit=0; while(data!==0){digit+=1; data>>>=1;} return digit;}
function bchTypeInfo(data:number){let d=data<<10; while(bchDigit(d)-bchDigit(G15)>=0)d^=G15<<(bchDigit(d)-bchDigit(G15)); return ((data<<10)|d)^G15_MASK;}
function bchTypeNumber(data:number){let d=data<<12; while(bchDigit(d)-bchDigit(G18)>=0)d^=G18<<(bchDigit(d)-bchDigit(G18)); return (data<<12)|d;}
function maskBit(pattern:number,row:number,col:number){switch(pattern){case 0:return(row+col)%2===0;case 1:return row%2===0;case 2:return col%3===0;case 3:return(row+col)%3===0;case 4:return(Math.floor(row/2)+Math.floor(col/3))%2===0;case 5:return((row*col)%2)+((row*col)%3)===0;case 6:return((((row*col)%2)+((row*col)%3))%2)===0;case 7:return((((row*col)%3)+((row+col)%2))%2)===0;default:throw new Error("Máscara inválida.");}}
function buildMatrix(version:number,level:ErrorCorrectionLevel,data:number[],maskPattern:number,test=false){ const count=version*4+17; const modules:Array<Array<boolean|null>>=Array.from({length:count},()=>Array<boolean|null>(count).fill(null)); const setupProbe=(row:number,col:number)=>{for(let r=-1;r<=7;r+=1)for(let c=-1;c<=7;c+=1){if(row+r<0||row+r>=count||col+c<0||col+c>=count)continue; modules[row+r][col+c]=(r>=0&&r<=6&&(c===0||c===6))||(c>=0&&c<=6&&(r===0||r===6))||(r>=2&&r<=4&&c>=2&&c<=4);}}; setupProbe(0,0); setupProbe(count-7,0); setupProbe(0,count-7); for(const row of PATTERN_POSITION_TABLE[version-1])for(const col of PATTERN_POSITION_TABLE[version-1]){if(modules[row][col]!==null)continue; for(let r=-2;r<=2;r+=1)for(let c=-2;c<=2;c+=1)modules[row+r][col+c]=Math.max(Math.abs(r),Math.abs(c))===2||(r===0&&c===0);} for(let r=8;r<count-8;r+=1)if(modules[r][6]===null)modules[r][6]=r%2===0; for(let c=8;c<count-8;c+=1)if(modules[6][c]===null)modules[6][c]=c%2===0; if(version>=7){const bits=bchTypeNumber(version); for(let i=0;i<18;i+=1){const dark=!test&&((bits>>>i)&1)===1; modules[Math.floor(i/3)][(i%3)+count-11]=dark; modules[(i%3)+count-11][Math.floor(i/3)]=dark;}} const typeBits=bchTypeInfo((ERROR_LEVEL_BITS[level]<<3)|maskPattern); for(let i=0;i<15;i+=1){const dark=!test&&((typeBits>>>i)&1)===1; if(i<6)modules[i][8]=dark; else if(i<8)modules[i+1][8]=dark; else modules[count-15+i][8]=dark; if(i<8)modules[8][count-i-1]=dark; else if(i<9)modules[8][15-i]=dark; else modules[8][15-i-1]=dark;} modules[count-8][8]=!test; let inc=-1,row=count-1,bitIndex=7,byteIndex=0; for(let col=count-1;col>0;col-=2){if(col===6)col-=1; while(true){for(let c=0;c<2;c+=1){const currentCol=col-c; if(modules[row][currentCol]!==null)continue; let dark=false; if(byteIndex<data.length)dark=((data[byteIndex]>>>bitIndex)&1)===1; if(maskBit(maskPattern,row,currentCol))dark=!dark; modules[row][currentCol]=dark; bitIndex-=1; if(bitIndex===-1){byteIndex+=1;bitIndex=7;}} row+=inc; if(row<0||row>=count){row-=inc;inc=-inc;break;}}} return modules.map(rowValues=>rowValues.map(Boolean)); }
function lostPoint(modules:boolean[][]){const count=modules.length; let score=0; for(let row=0;row<count;row+=1)for(let col=0;col<count;col+=1){let same=0;const dark=modules[row][col];for(let r=-1;r<=1;r+=1){if(row+r<0||row+r>=count)continue;for(let c=-1;c<=1;c+=1){if(col+c<0||col+c>=count||(r===0&&c===0))continue;if(dark===modules[row+r][col+c])same+=1;}}if(same>5)score+=3+same-5;} for(let row=0;row<count-1;row+=1)for(let col=0;col<count-1;col+=1){const n=Number(modules[row][col])+Number(modules[row+1][col])+Number(modules[row][col+1])+Number(modules[row+1][col+1]);if(n===0||n===4)score+=3;} for(let row=0;row<count;row+=1)for(let col=0;col<count-6;col+=1)if(modules[row][col]&&!modules[row][col+1]&&modules[row][col+2]&&modules[row][col+3]&&modules[row][col+4]&&!modules[row][col+5]&&modules[row][col+6])score+=40; for(let col=0;col<count;col+=1)for(let row=0;row<count-6;row+=1)if(modules[row][col]&&!modules[row+1][col]&&modules[row+2][col]&&modules[row+3][col]&&modules[row+4][col]&&!modules[row+5][col]&&modules[row+6][col])score+=40; let darkCount=0;for(const row of modules)for(const dark of row)if(dark)darkCount+=1; score+=Math.abs((100*darkCount)/(count*count)-50)/5*10;return score;}
function canFit(version:number,level:ErrorCorrectionLevel,byteLength:number){const blocks=getRsBlocks(version,level);return 4+(version<10?8:16)+byteLength*8<=blocks.reduce((sum,b)=>sum+b.dataCount,0)*8;}
export interface QrMatrixResult{version:number;modules:boolean[][];byteLength:number;}
export function generateQrMatrix(text:string,level:ErrorCorrectionLevel="H"):QrMatrixResult{const bytes=new TextEncoder().encode(text);let version=1;while(version<=10&&!canFit(version,level,bytes.length))version+=1;if(version>10)throw new Error(`Conteúdo com ${bytes.length} bytes excede o limite deste editor. Encurte a URL ou reduza os parâmetros de rastreamento.`);const data=createData(version,level,bytes);let best=buildMatrix(version,level,data,0),bestScore=Number.POSITIVE_INFINITY;for(let mask=0;mask<8;mask+=1){const candidate=buildMatrix(version,level,data,mask),score=lostPoint(candidate);if(score<bestScore){bestScore=score;best=candidate;}}return{version,modules:best,byteLength:bytes.length};}
export function generateQrMatrixWithMask(text:string,level:ErrorCorrectionLevel,mask:number){const bytes=new TextEncoder().encode(text);let version=1;while(version<=10&&!canFit(version,level,bytes.length))version+=1;if(version>10)throw new Error("Conteúdo excede o limite suportado.");return buildMatrix(version,level,createData(version,level,bytes),mask);}
