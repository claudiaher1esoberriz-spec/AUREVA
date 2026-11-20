// Imágenes mediante Cloudflare Pages -> Service Binding -> Workers AI.
// No utiliza OpenRouter ni claves en el navegador.
export async function generateFreeImage(_apiKey, prompt, turnstileToken) {
  const text = typeof prompt === 'string' ? prompt.trim() : '';
  if (!text) throw new Error('Escribe qué imagen quieres crear.');
  if (text.length > 1000) throw new Error('La descripción no puede superar 1000 caracteres.');
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: text, turnstileToken })
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('El servidor no devolvió una respuesta válida.'); }
  if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
  if (!data.url?.startsWith('data:image/')) throw new Error('No se recibió una imagen válida.');
  return { url: data.url, model: data.model || 'FLUX.1 Schnell' };
}
