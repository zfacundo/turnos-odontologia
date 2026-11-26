/** Subconjunto mínimo del DOM que usa el botón de tema (el proyecto compila sin lib DOM). */
export interface BotonTema {
  setAttribute(nombre: string, valor: string): void;
  addEventListener(tipo: 'click', oyente: () => void): void;
}
export interface DocumentoTema {
  documentElement: {
    getAttribute(nombre: string): string | null;
    setAttribute(nombre: string, valor: string): void;
    style: { colorScheme: string };
  };
  querySelectorAll(selector: string): Iterable<BotonTema>;
}
export interface ConsultaSistema {
  matches: boolean;
  addEventListener(tipo: 'change', oyente: (evento: { matches: boolean }) => void): void;
}
export function iniciarTema(deps: {
  documento: DocumentoTema;
  almacen: { getItem(clave: string): string | null; setItem(clave: string, valor: string): void } | null;
  matchMedia: (consulta: string) => ConsultaSistema;
}): void;
export function almacenLocalDeTema(): { getItem(clave: string): string | null; setItem(clave: string, valor: string): void } | null;
