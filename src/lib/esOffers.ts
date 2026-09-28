/**
 * esOffers.ts — Fuente única de verdad para las ofertas de afiliado del
 * subsitio /es (equivalente a offers.ts del sitio en inglés).
 *
 * Todas las superficies CTA en español (EsTopOfferBar, EsSideOfferTab,
 * EsDealStrip, EsInlineCta, EsSidebarDealCard, EsReviewLayout) leen de este
 * mapa para que el copy se mantenga consistente y veraz en todo el sitio.
 * Si una plataforma cambia su oferta de bienvenida, actualízala AQUÍ una vez.
 *
 * Reglas de copy (restricciones estrictas, espejo de offers.ts):
 *  - Nunca inventar números. El texto replica lo que las plataformas
 *    anuncian públicamente a nuevos usuarios (mismas afirmaciones ya
 *    usadas en EsSpanishCTA / EsLeftSidebar / las páginas hub de /es).
 *  - Sin prueba social fabricada. Los puntos de prueba deben ser
 *    verificables en materiales públicos de la propia plataforma
 *    (p. ej. descargas auto-reportadas en Google Play, usadas en
 *    `esProofTooltip`).
 *  - Todo enlace pasa por /go/<slug>/ (gating PostHog + atribución).
 */

export type EsPlatformKey = 'psiquicos' | 'purple-garden-es';

export interface EsPlatformOffer {
  key: EsPlatformKey;
  /** Nombre visible. */
  name: string;
  /** Slug /go/ (con guiones, misma convención que affiliateLinks.ts). */
  goSlug: string;
  /** Frase corta de la oferta, p. ej. "3 minutos gratis + 60% dto". */
  offer: string;
  /** Frase del banner DealStrip con énfasis. */
  dealLine: string;
  /** Etiqueta del botón principal (con flecha). */
  ctaLabel: string;
  /** Microlínea de reducción de riesgo bajo los botones. */
  microLine: string;
  /** Color de marca para el nombre de la plataforma. */
  color: string;
  /** Logo alojado en /public/logos/. */
  logo: string;
  /**
   * Base de usuarios auto-reportada por la plataforma (en millones),
   * usada por `esProofTooltip`. Psíquicos Web: 1M+ descargas en Google
   * Play (dato público de la ficha de la app). Purple Garden: 2M de
   * usuarios (mismo dato ya verificado en offers.ts del sitio en inglés).
   */
  userMillions: number;
  /** Línea de la barra superior de ofertas (icono regalo + este texto). */
  topBarLine: string;
  /** Etiquetas verticales del SideOfferTab (máx. 2 líneas cortas). */
  sideTabLabel: string | [string, string];
}

export const ES_PLATFORM_OFFERS: Record<EsPlatformKey, EsPlatformOffer> = {
  psiquicos: {
    key: 'psiquicos',
    name: 'Psíquicos Web',
    goSlug: 'psiquicos',
    offer: '3 minutos gratis + hasta 60% de descuento',
    dealLine: 'Oferta para nuevos usuarios: 3 minutos GRATIS con cada lector + hasta 60% de DESCUENTO en tu primera recarga.',
    ctaLabel: 'Obtener 3 Minutos Gratis →',
    microLine: 'Registro gratuito · Oferta aplicada automáticamente · Sin suscripción',
    color: '#4a235a',
    logo: '/logos/psiquicos-web.png',
    userMillions: 1,
    topBarLine: 'Oferta Especial Psíquicos Web: 3 minutos GRATIS + 60% de descuento',
    sideTabLabel: ['3 MIN GRATIS', '+60% DTO'],
  },
  'purple-garden-es': {
    key: 'purple-garden-es',
    name: 'Purple Garden',
    goSlug: 'purple-garden-es',
    offer: '$30 de crédito de bienvenida',
    dealLine: 'Oferta para nuevos usuarios: $30 en crédito GRATIS para tu primera lectura.',
    ctaLabel: 'Reclamar $30 de Crédito →',
    microLine: 'Registro gratuito · Crédito aplicado a tu primera lectura · Sin suscripción',
    color: '#6b4d8c',
    logo: '/logos/purple-garden.png',
    userMillions: 2,
    topBarLine: 'Oferta Especial Purple Garden — $30 en crédito GRATIS para nuevos usuarios',
    sideTabLabel: '$30 de Crédito',
  },
};

/** Orden por defecto de recomendación del subsitio /es (Psíquicos Web #1). */
export const ES_PLATFORM_PRIORITY: EsPlatformKey[] = ['psiquicos', 'purple-garden-es'];

/**
 * DEEPLINKS POR LECTOR (backend TUNE/Barges) — sobreescriben la oferta de
 * plataforma cuando el slug del lector coincide. clave = slug del lector
 * (nombre del archivo .md). Fuente única usada por EsSpanishCTA,
 * EsReviewLayout (stickyCta / DealStrip / InlineCta / sidebar deal).
 */
export const ES_READER_URLS: Record<string, string> = {
  // 2026-09-28: one deep link per review in /es/resenas/purple-garden-es/ (top 30
  // hispanohablante + luz-tarot / luna-aestethic). /go/ slugs mirror
  // affiliateLinks.ts 1:1 (offer 34). All CTA surfaces resolve per-reader.
  '1122afrodita': '/go/purple-garden-es-1122afrodita/',
  'anuar': '/go/purple-garden-es-anuar/',
  'armand': '/go/purple-garden-es-armand/',
  'aron-osachi': '/go/purple-garden-es-aron-osachi/',
  'atlantisv': '/go/purple-garden-es-atlantisv/',
  'aura-vidente': '/go/purple-garden-es-aura-vidente/',
  'bastet-tarot': '/go/purple-garden-es-bastet-tarot/',
  'carmen-indiga': '/go/purple-garden-es-carmen-indiga/',
  'cosette': '/go/purple-garden-es-cosette/',
  'la-tejedora': '/go/purple-garden-es-la-tejedora/',
  'lucius-blanco': '/go/purple-garden-es-lucius-blanco/',
  'luna-aestethic': '/go/purple-garden-es-luna-aestethic/',
  'luna-ishtar': '/go/purple-garden-es-luna-ishtar/',
  'luz-de-guia': '/go/purple-garden-es-luz-de-guia/',
  'luz-tarot': '/go/purple-garden-es-luz-tarot/',
  'luz-violeta': '/go/purple-garden-es-luz-violeta/',
  'malutarot': '/go/purple-garden-es-malutarot/',
  'margarita-tarot': '/go/purple-garden-es-margarita-tarot/',
  'medium-fernanda': '/go/purple-garden-es-medium-fernanda/',
  'nahir-tarot': '/go/purple-garden-es-nahir-tarot/',
  'neo-tarot': '/go/purple-garden-es-neo-tarot/',
  'nina-zadir': '/go/purple-garden-es-nina-zadir/',
  'ren-aurum': '/go/purple-garden-es-ren-aurum/',
  'rene': '/go/purple-garden-es-rene/',
  'sacerdotisa-hecate': '/go/purple-garden-es-sacerdotisa-hecate/',
  'sol-aleyda': '/go/purple-garden-es-sol-aleyda/',
  'su_sana': '/go/purple-garden-es-su_sana/',
  'violeta-fierro': '/go/purple-garden-es-violeta-fierro/',
  'yanzay': '/go/purple-garden-es-yanzay/',
  'zafira-daniela': '/go/purple-garden-es-zafira-daniela/',
  'zarina-isabel': '/go/purple-garden-es-zarina-isabel/',

  // 2026-09-28: Psíquicos Web per-reader deep links (35 readers in
  // /es/resenas/psiquicos-web/). /go/ slugs mirror affiliateLinks.ts 1:1
  // (offer 42). Falls back to platform-level /go/psiquicos/ if absent.
  'abel': '/go/psiquicos-abel/',
  'aisha': '/go/psiquicos-aisha/',
  'alanna-luz': '/go/psiquicos-alanna-luz/',
  'alizon': '/go/psiquicos-alizon/',
  'amatista': '/go/psiquicos-amatista/',
  'arcana-soy': '/go/psiquicos-arcana-soy/',
  'azul-cristal': '/go/psiquicos-azul-cristal/',
  'calipso-amor': '/go/psiquicos-calipso-amor/',
  'candelifera-laveau': '/go/psiquicos-candelifera-laveau/',
  'carlota': '/go/psiquicos-carlota/',
  'claridad-con-abi': '/go/psiquicos-claridad-con-abi/',
  'deva-luz': '/go/psiquicos-deva-luz/',
  'dionisia': '/go/psiquicos-dionisia/',
  'esperanza': '/go/psiquicos-esperanza/',
  'guia-mimatiliztli': '/go/psiquicos-guia-mimatiliztli/',
  'isadora': '/go/psiquicos-isadora/',
  'kalho-tarot': '/go/psiquicos-kalho-tarot/',
  'la-maga-del-alma': '/go/psiquicos-la-maga-del-alma/',
  'lada': '/go/psiquicos-lada/',
  'laskmi-yeniree': '/go/psiquicos-laskmi-yeniree/',
  'maestro-armand': '/go/psiquicos-maestro-armand/',
  'maia': '/go/psiquicos-maia/',
  'marcel-oraculo': '/go/psiquicos-marcel-oraculo/',
  'marcela': '/go/psiquicos-marcela/',
  'marisol': '/go/psiquicos-marisol/',
  'mirian-mac': '/go/psiquicos-mirian-mac/',
  'moira': '/go/psiquicos-moira/',
  'penelope': '/go/psiquicos-penelope/',
  'romina': '/go/psiquicos-romina/',
  'rous-quesada': '/go/psiquicos-rous-quesada/',
  'sacerdotisa-astral': '/go/psiquicos-sacerdotisa-astral/',
  'sendero-de-luz': '/go/psiquicos-sendero-de-luz/',
  'tyr-el-vikingo': '/go/psiquicos-tyr-el-vikingo/',
  'vanessa-gal': '/go/psiquicos-vanessa-gal/',
  'veronica': '/go/psiquicos-veronica/',
};

/** Ruta /go/ completa de una plataforma (deeplink genérico de plataforma). */
export function esGoPath(key: EsPlatformKey): string {
  return `/go/${ES_PLATFORM_OFFERS[key].goSlug}/`;
}

/** Logo de marca autoalojado para una plataforma del subsitio /es. */
export function esPlatformLogo(key: EsPlatformKey): string {
  return ES_PLATFORM_OFFERS[key].logo;
}

/**
 * Línea de prueba social para el tooltip hover — mismo formato que
 * `proofTooltip()` del sitio en inglés, basada en cifras auto-reportadas
 * por cada plataforma (nunca fabricadas).
 */
export function esProofTooltip(key: EsPlatformKey): string {
  const o = ES_PLATFORM_OFFERS[key];
  return `Únete a más de ${o.userMillions} millón${o.userMillions > 1 ? 'es' : ''} de usuarios de ${o.name}.`;
}
