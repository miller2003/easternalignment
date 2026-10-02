/**
 * esGuides.ts — Fuente única para la colección de guías del subsitio /es
 * (src/content/es-guides/*.md → /es/guias/<slug>/).
 *
 * Añadido 2026-10-02. Igual que las reseñas /es, las rutas leen con
 * import.meta.glob (sin zod), así que la validación de frontmatter vive en
 * scripts/audit-es-guides.mjs — ejecútalo antes de cada despliegue.
 *
 * Reglas de contenido (no negociables):
 *  - Los datos de lectores (lecturas, ★ del perfil, tarifas) se citan del
 *    frontmatter de su reseña en src/content/es-readers/. Las tarjetas que
 *    renderiza la guía (`featuredReaders`) leen ese frontmatter en vivo; el
 *    texto del cuerpo cita la cifra vigente a la fecha de publicación.
 *  - Los ★ que aparecen en el cuerpo son SIEMPRE la calificación del perfil
 *    en la plataforma, nunca la nota editorial de Eastern Alignment.
 *  - Todo enlace de afiliado pasa por /go/<slug>/ (ES_READER_URLS o
 *    plataforma). Nada de enlaces directos a TUNE.
 */
import type { EsPlatformKey } from './esOffers';

export interface EsGuideFaq {
  question: string;
  answer: string;
}

export interface EsGuideFrontmatter {
  title: string;
  seoTitle?: string;
  metaDescription?: string;
  description: string;
  /** Una de ES_GUIDE_CATEGORIES (clave). */
  category: EsGuideCategoryKey;
  publishDate: string;
  updatedDate?: string;
  verifiedDate?: string;
  /** Plataforma del CTA principal (hero, pestaña lateral, barra superior). */
  platform: EsPlatformKey;
  /** Slug de lector (es-readers) para el deeplink del CTA principal. */
  ctaReader?: string;
  /** Lectores citados en la guía — se renderizan como tarjetas al final. */
  featuredReaders?: string[];
  /** Palabras clave para el emparejamiento con reseñas y otras guías. */
  keywords?: string[];
  entities?: string[];
  faq?: EsGuideFaq[];
  ogImage?: string;
  canonicalUrl?: string;
  metaRobots?: string;
  /** Texto de la caja «Respuesta corta» bajo el título (GEO / AI Overviews). */
  shortAnswer?: string;
  /** Titular corto para tarjetas (índice, guías relacionadas). */
  cardTitle?: string;
}

export interface EsGuide extends EsGuideFrontmatter {
  slug: string;
  url: string;
}

export const ES_GUIDE_CATEGORIES = {
  amor: {
    label: 'Amor y Reconciliación',
    blurb: 'Ex, contacto cero, bloqueos y la pregunta que más se hace a una vidente: ¿qué siente?',
  },
  tarot: {
    label: 'Tarot y Videncia',
    blurb: 'Cómo leer las cartas del amor y cómo elegir a quién se las lee.',
  },
  senales: {
    label: 'Señales y Simbolismo',
    blurb: 'Números de ángeles, sueños y conexiones del alma — sin humo y con criterio.',
  },
  consultante: {
    label: 'Guía del Consultante',
    blurb: 'Lo que nadie te explica antes de pagar: estafas, ofertas gratis y cómo no perder dinero.',
  },
} as const;

export type EsGuideCategoryKey = keyof typeof ES_GUIDE_CATEGORIES;

export const ES_GUIDE_CATEGORY_ORDER: EsGuideCategoryKey[] = ['amor', 'tarot', 'senales', 'consultante'];

const guideModules = import.meta.glob('../content/es-guides/*.md', { eager: true }) as Record<string, any>;

/** Todas las guías publicadas (excluye plantillas `_*.md`), más recientes primero. */
export function getEsGuides(): EsGuide[] {
  return Object.entries(guideModules)
    .filter(([p]) => !(p.split('/').pop() || '').startsWith('_'))
    .map(([p, mod]) => {
      const slug = (p.split('/').pop() || '').replace(/\.md$/, '');
      return { ...(mod.frontmatter as EsGuideFrontmatter), slug, url: `/es/guias/${slug}/` };
    })
    .sort((a, b) => (b.updatedDate || b.publishDate).localeCompare(a.updatedDate || a.publishDate) || a.slug.localeCompare(b.slug));
}

const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ');

/**
 * Guías relacionadas para otra guía: misma categoría + solapamiento de
 * keywords. Determinista (sin aleatoriedad) para que el HTML sea estable.
 */
export function relatedGuidesForGuide(current: EsGuide, all: EsGuide[], n = 3): EsGuide[] {
  const kw = new Set((current.keywords || []).map(norm));
  return all
    .filter((g) => g.slug !== current.slug)
    .map((g) => {
      let score = g.category === current.category ? 3 : 0;
      for (const k of g.keywords || []) if (kw.has(norm(k))) score += 2;
      // Lectores en común = intención cercana
      const shared = (g.featuredReaders || []).filter((r) => (current.featuredReaders || []).includes(r)).length;
      score += shared;
      return { g, score };
    })
    .sort((a, b) => b.score - a.score || a.g.slug.localeCompare(b.g.slug))
    .slice(0, n)
    .map((x) => x.g);
}

/**
 * Guías relacionadas para una reseña de lector: primero las guías que citan
 * a ese lector, luego coincidencias de keywords con su bestFor/título.
 */
export function relatedGuidesForReader(
  reader: { slug: string; title?: string; bestFor?: string; verdict?: string },
  all: EsGuide[],
  n = 3,
): EsGuide[] {
  const text = norm(`${reader.title || ''} ${reader.bestFor || ''} ${reader.verdict || ''}`);
  return all
    .map((g) => {
      let score = (g.featuredReaders || []).includes(reader.slug) ? 10 : 0;
      for (const k of g.keywords || []) if (text.includes(norm(k))) score += 1;
      return { g, score };
    })
    .sort((a, b) => b.score - a.score || a.g.slug.localeCompare(b.g.slug))
    .slice(0, n)
    .map((x) => x.g);
}

/** Minutos de lectura estimados (≈ 220 palabras/min en español). */
export function readingMinutes(raw: string): number {
  const words = raw.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 220));
}
