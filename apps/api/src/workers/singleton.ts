import net from "node:net";

export async function holdWorkerPort(port: number, name: string) {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) => error.code === "EADDRINUSE" ? resolve() : reject(error));
    server.listen(port, "127.0.0.1", () => resolve());
  });
  if (!server.listening) {
    console.log(`${name} já está em execução; esta instância será encerrada.`);
    return null;
  }
  return server;
}
