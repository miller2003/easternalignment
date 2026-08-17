# Compilación de Lectores — Psíquicos Web + Purple Garden (ES)

**Fecha:** 2026-08-17
**Propósito:** Soporte para generar deep links en el backend de afiliados (TUNE / Barges).
**Alcance:** Subconjunto públicamente verificable de cada plataforma. NO es el catálogo completo (ver "Cobertura").

---

## ⚠️ Hallazgo crítico — Solo Purple Garden genera deep links

| Plataforma | Oferta TUNE en tu red | Deep link generable |
|---|---|---|
| **Purple Garden** (`purplegarden.co`) | **offer_id = 30** ✅ | **SÍ** |
| **Psíquicos Web** (`psiquicos.net`, Adviqo/Barges) | — (sin oferta TUNE) | **NO** |
| **Purple Ocean** (`purpleocean.co`, hermana de PG) | — (sin oferta TUNE) | **NO** |

**Consecuencia práctica:** Aunque Psíquicos Web ahora es rastreable (ver abajo), y aunque Purple Ocean tiene lectores hispanohablantes muy populares (Júpiter, Luz Tarot), **ninguno de esos dos plataformas puede producir deep links en tu backend actual**. Solo los lectores de **Purple Garden propio** son monetizables vía tu red de afiliados.

Si quieres monetizar Psíquicos Web / Purple Ocean, necesitas una oferta fuera de TUNE (p. ej. programa de afiliados directo de Adviqo/Barges, o Amplify/otra red) — fuera del alcance de esta compilación.

---

## 1. Psíquicos Web — `psiquicos.net`

**Corrección de sesión previa:** La conclusión anterior ("no se puede rastrear, es SPA/API") era **incorrecta**. El sitio `www.psiquicos.net` renderiza en servidor un directorio público de asesores en `https://www.psiquicos.net/asesores/<slug>`, con secciones de popularidad integradas (Tendencias / Más populares / Mejor calificados / Todos). El intento fallido previo apuntaba a `api3.psiquicos.net` (endpoint muerto), no al sitio principal.

**Cobertura:** El directorio tiene paginación; lo extraído abajo es una **muestra verificada de ~22 asesores** (no los 2.000+ activos). Las URLs son reales (extraídas del HTML vivo). No se dispuso de conteo de lecturas ni rating en esta extracción.

### 1a. Tendencias (mayor calor)
| Lector | Especialidad | Perfil |
|---|---|---|
| Rous Quesada | Amor / Relaciones | https://www.psiquicos.net/asesores/rous-quesada-experta-en-amor-relaciones |
| Jamila | Lectura de mano | https://www.psiquicos.net/asesores/jamila-experto-en-lectura-de-mano |
| Laskmi Yeniree | Asesoramiento de carrera | https://www.psiquicos.net/asesores/laskmi-yeniree-experto-en-asesoramiento-carrera |

### 1b. Más populares
| Lector | Especialidad | Perfil |
|---|---|---|
| Lukote | Tarot | https://www.psiquicos.net/asesores/lukote-leitores-de-taro-especialista |
| Luz Espiritual (Luisina Parra) | Qigong | https://www.psiquicos.net/asesores/luisina-parra-experto-en-qigong |
| Kalho Tarot | Tarot | https://www.psiquicos.net/asesores/kalho-tarot |
| Violeta Videncia | Asesoramiento de carrera | https://www.psiquicos.net/asesores/violeta-experta-en-asesoramiento-carrera |
| Sol Mistica | General | https://www.psiquicos.net/asesores/sol-mistica |
| Tarotisabell | Lectura psíquica | https://www.psiquicos.net/asesores/tarotisabell-experto-en-lectura-psiquica |

### 1c. Todos los asesores (muestra)
| Lector | Especialidad | Perfil |
|---|---|---|
| Veronica Casado | Lectura psíquica | https://www.psiquicos.net/asesores/veronica-casado-experto-en-lectura-psiquica |
| Amatista | Desarrollo personal | https://www.psiquicos.net/asesores/amatista-experto-en-desarrollo-personal |
| Carlota | Lectura psíquica | https://www.psiquicos.net/asesores/carlota-experto-en-lectura-psiquica |
| Marcela | Tarot | https://www.psiquicos.net/asesores/marcela-experto-en-lectores-de-tarot |
| Calipso Amor | Desarrollo personal | https://www.psiquicos.net/asesores/calipso-amor-experto-en-desarrollo-personal |
| Abel. | General | https://www.psiquicos.net/asesores/abel |
| Romina | Lectura psíquica | https://www.psiquicos.net/asesores/romina-experto-en-lectura-psiquica |
| Moira | Desarrollo personal | https://www.psiquicos.net/asesores/moira-experto-en-desarrollo-personal |
| Marisol | Desarrollo personal | https://www.psiquicos.net/asesores/marisol-experto-en-desarrollo-personal |
| Lada | Tarot | https://www.psiquicos.net/asesores/lada-experto-en-lectores-de-tarot |
| Isadora | Desarrollo personal | https://www.psiquicos.net/asesores/isadora-experto-en-desarrollo-personal |
| Alizon | Amor / Relaciones | https://www.psiquicos.net/asesores/alizon-experto-en-amor-relaciones |
| Sacerdotisa Astral | General | https://www.psiquicos.net/asesores/sarcedotisa-astral |
| Marcel Oraculo | Horóscopos | https://www.psiquicos.net/asesores/marcel-oraculo-experto-en-horoscopos |
| Claridad con Abi | General | https://www.psiquicos.net/asesores/claridad-con-abi |
| Sendero de luz | Asesoramiento de relaciones | https://www.psiquicos.net/asesores/sendero-de-luz-experto-en-asesoramiento-relaciones |

> **Penélope** (referenciada en tu `src/pages/es/resenas/psiquicos-web/index.astro` como showcase) **no aparece** en la porción del directorio recuperada. Verificar manualmente en la app/web de Psíquicos Web antes de citarla como perfil verificable.

> **Todos los anteriores = NO deep-linkables** (sin oferta TUNE). Útiles solo para contenido editorial del sub-sitio `/es/`.

---

## 2. Purple Garden — `purplegarden.co` (la única monetizable)

**Cobertura:** PG tiene 900+ asesores; el subconjunto hispanohablante es minoritario y no se expone limpiamente en un índice público enumerable desde aquí. Abajo los lectores hispanohablantes **verificados con URL de perfil**.

| Lector | Plataforma real | Perfil | Lecturas | Idioma | Deep link |
|---|---|---|---|---|---|
| **Luna Aestethic** | Purple Garden (propio) | https://www.purplegarden.co/psychics/4921-luna-aestethic | — | ES | ✅ offer 30 |
| Júpiter (Jpiter) | **Purple Ocean** (hermana) | https://www.purpleocean.co/psychics/8463-jpiter | 37.166 (desde 2020) | ES nativo (Colombia) | ❌ sin oferta |
| Luz Tarot | **Purple Ocean** (hermana) | https://www.purpleocean.co/psychics/7046-luz-tarot | — | ES | ❌ sin oferta |

**Nota importante:** Júpiter y Luz Tarot, aunque son lectores hispanohablantes muy populares, viven en **Purple Ocean**, no en Purple Garden. Aparecen confundidos en algunos artículos de terceros (p. ej. se citan bajo "Purple Garden" pero su perfil canónico es `purpleocean.co`). Purple Ocean **no tiene oferta TUNE**, así que no genere deep links para ellos.

**Conclusión de monetización:** El único lector hispanohablante con deep link generable vía tu red hoy es **Luna Aestethic** (Purple Garden, offer 30). Si necesitas más inventario monetizable en español, las vías son:
1. Ampliar el sub-sitio `/es/` hacia **Purple Garden EN/ES** y buscar más perfiles `purplegarden.co/psychics/<id>` hispanohablantes manualmente en la web/app.
2. O incorporar una oferta fuera de TUNE para Psíquicos Web / Purple Ocean.

---

## 3. Acción recomendada para el backend de afiliados

1. Genera el deep link TUNE solo para **Luna Aestethic** (offer 30) hoy.
2. No pierdas tiempo buscando deep links para Psíquicos Web ni Purple Ocean en TUNE — no existen.
3. Si el objetivo es escalar payout en español, prioriza conseguir **más perfiles reales de Purple Garden** (offer 30) mediante navegación manual en `purplegarden.co`, y/o abrir una oferta directa de Adviqo/Barges.
