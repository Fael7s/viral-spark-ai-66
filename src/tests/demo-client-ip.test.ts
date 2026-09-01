import { describe, it, expect } from "vitest";
import { getClientIp } from "@/lib/generate-demo.functions";

// Cobre a derivacao do IP que vira chave do rate limit da demonstracao.
//
// O valor retornado aqui e hasheado e usado como _ip_hash em
// consume_demo_generation. A RPC e atomica e esta correta; o que decide em qual
// balde a requisicao cai e esta funcao. Por isso a ordem das fontes e a
// validacao de formato sao testadas, e nao so o caminho feliz.

function requestWith(headers: Record<string, string>): Request {
  return new Request("https://exemplo.test/", { headers });
}

describe("getClientIp", () => {
  it("cf-connecting-ip vence as outras fontes", () => {
    const request = requestWith({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.1",
      "x-real-ip": "198.51.100.2",
    });
    expect(getClientIp(request)).toBe("203.0.113.7");
  });

  it("cf-connecting-ip vence mesmo quando o cliente forja a lista inteira", () => {
    // Cloudflare acrescenta ao x-forwarded-for existente em vez de substitui-lo,
    // entao o elemento [0] e o que o cliente escreveu. Com a borda presente ele
    // deixa de ser consultado.
    const request = requestWith({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": "10.0.0.1, 203.0.113.7",
    });
    expect(getClientIp(request)).toBe("203.0.113.7");
  });

  it("sem cf-connecting-ip, cai para o primeiro elemento de x-forwarded-for", () => {
    const request = requestWith({ "x-forwarded-for": "198.51.100.1, 203.0.113.7" });
    expect(getClientIp(request)).toBe("198.51.100.1");
  });

  it("sem cf-connecting-ip e sem x-forwarded-for, cai para x-real-ip", () => {
    const request = requestWith({ "x-real-ip": "198.51.100.2" });
    expect(getClientIp(request)).toBe("198.51.100.2");
  });

  it("valor nao-IP e rejeitado e a proxima fonte assume", () => {
    const request = requestWith({
      "cf-connecting-ip": "nao-e-um-ip",
      "x-forwarded-for": "198.51.100.1",
    });
    expect(getClientIp(request)).toBe("198.51.100.1");
  });

  it("nenhuma fonte disponivel retorna o fallback", () => {
    expect(getClientIp(requestWith({}))).toBe("unknown");
  });

  it("nenhuma fonte valida retorna o fallback", () => {
    const request = requestWith({
      "cf-connecting-ip": "aaaa",
      "x-forwarded-for": "'; DROP TABLE demo_generation_limits; --",
      "x-real-ip": "   ",
    });
    expect(getClientIp(request)).toBe("unknown");
  });

  it("aceita IPv6, inclusive comprimido e com IPv4 embutido", () => {
    expect(getClientIp(requestWith({ "cf-connecting-ip": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(getClientIp(requestWith({ "cf-connecting-ip": "::1" }))).toBe("::1");
    expect(getClientIp(requestWith({ "cf-connecting-ip": "2001:db8:0:0:0:0:0:1" }))).toBe(
      "2001:db8:0:0:0:0:0:1",
    );
    expect(getClientIp(requestWith({ "cf-connecting-ip": "::ffff:192.0.2.1" }))).toBe(
      "::ffff:192.0.2.1",
    );
    expect(getClientIp(requestWith({ "cf-connecting-ip": "64:ff9b::192.0.2.33" }))).toBe(
      "64:ff9b::192.0.2.33",
    );
  });

  it("espaco em volta do valor nao cria balde novo", () => {
    expect(getClientIp(requestWith({ "x-forwarded-for": "  203.0.113.7  , 10.0.0.1" }))).toBe(
      "203.0.113.7",
    );
  });

  describe("formatos recusados", () => {
    // Cada string aqui viraria uma chave de rate limit distinta antes da
    // validacao. Todas precisam cair no fallback.
    const invalidos = [
      ["octeto fora da faixa", "999.999.999.999"],
      ["octeto acima de 255", "256.0.0.1"],
      ["zero a esquerda, ambiguo entre decimal e octal", "010.0.0.1"],
      ["partes de menos", "1.2.3"],
      ["partes de mais", "1.2.3.4.5"],
      ["parte vazia", "1..3.4"],
      ["notacao inteira", "2130706433"],
      ["ipv4 com porta", "203.0.113.7:8080"],
      ["dois grupos comprimidos", "1::2::3"],
      ["ipv6 com grupos demais", "1:2:3:4:5:6:7:8:9"],
      ["ipv6 sem grupos suficientes", "1:2:3:4:5:6:7"],
      ["ipv6 com digito nao hexadecimal", "2001:db8::zz"],
      ["ipv6 com zone id", "fe80::1%eth0"],
      ["ipv6 entre colchetes", "[2001:db8::1]"],
      ["string vazia depois do trim", "   "],
      ["nome de host", "localhost"],
    ] as const;

    // Exercitado nas duas fontes de proposito. x-forwarded-for e o header que o
    // cliente controla, e era por ele que qualquer string virava chave; validar
    // so a fonte da borda deixaria o caminho que importa sem cobertura.
    for (const [motivo, valor] of invalidos) {
      it(`recusa ${motivo} em cf-connecting-ip: ${valor}`, () => {
        expect(getClientIp(requestWith({ "cf-connecting-ip": valor }))).toBe("unknown");
      });

      it(`recusa ${motivo} em x-forwarded-for: ${valor}`, () => {
        expect(getClientIp(requestWith({ "x-forwarded-for": valor }))).toBe("unknown");
      });

      it(`recusa ${motivo} em x-real-ip: ${valor}`, () => {
        expect(getClientIp(requestWith({ "x-real-ip": valor }))).toBe("unknown");
      });
    }
  });

  describe("formatos aceitos nas bordas da faixa", () => {
    const validos = ["0.0.0.0", "255.255.255.255", "1.2.3.4", "::", "1:2:3:4:5:6:7:8"];

    for (const valor of validos) {
      it(`aceita ${valor}`, () => {
        expect(getClientIp(requestWith({ "cf-connecting-ip": valor }))).toBe(valor);
      });
    }
  });
});
