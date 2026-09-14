import type { UTMData } from './types';

export const getAnonymousId = (): string => {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('ea_match_anon_id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('ea_match_anon_id', id);
  }
  return id;
};

export const readUTMFromURL = (): UTMData => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utm: UTMData = {};
  if (params.has('utm_source')) utm.utm_source = params.get('utm_source')!;
  if (params.has('utm_medium')) utm.utm_medium = params.get('utm_medium')!;
  if (params.has('utm_campaign')) utm.utm_campaign = params.get('utm_campaign')!;
  if (params.has('utm_content')) utm.utm_content = params.get('utm_content')!;
  if (params.has('utm_term')) utm.utm_term = params.get('utm_term')!;
  return utm;
};

export const persistUTM = (): void => {
  if (typeof window === 'undefined') return;
  const currentUTM = readUTMFromURL();
  if (Object.keys(currentUTM).length > 0) {
    if (!localStorage.getItem('ea_match_first_touch')) {
      localStorage.setItem('ea_match_first_touch', JSON.stringify(currentUTM));
    }
    localStorage.setItem('ea_match_last_touch', JSON.stringify(currentUTM));
  }
};

export const getUTMData = (): { first_touch?: UTMData; last_touch?: UTMData; current?: UTMData } => {
  if (typeof window === 'undefined') return {};
  let first_touch, last_touch;
  try {
    const ft = localStorage.getItem('ea_match_first_touch');
    if (ft) first_touch = JSON.parse(ft);
    const lt = localStorage.getItem('ea_match_last_touch');
    if (lt) last_touch = JSON.parse(lt);
  } catch (e) {
    // ignore
  }
  return {
    first_touch,
    last_touch,
    current: readUTMFromURL()
  };
};
