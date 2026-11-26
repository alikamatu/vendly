export const OPEN_VERNDLY_AI_EVENT = 'open-verndly-ai';

export interface OpenVerndlyAiDetail {
  prompt?: string;
}

/**
 * Opens the global Verndly AI Shopping Assistant drawer from anywhere in the app.
 * Pass an optional `prompt` to immediately send a natural-language query.
 */
export function openVerndlyAi(prompt?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<OpenVerndlyAiDetail>(OPEN_VERNDLY_AI_EVENT, {
      detail: prompt ? { prompt } : {},
    }),
  );
}
