// Activador · conexión con el panel (Supabase, proyecto sunsignal)
// La clave publicable se puede compartir: sin iniciar sesión solo deja usar las funciones de las pantallas.
export const SUPABASE_URL = 'https://zygqdonerdgijmrngksi.supabase.co';
export const SUPABASE_CLAVE = 'sb_publishable_eLqZw1bZ4wo5fmREJ_6Yzw_lVxGg7Dd';
const LIBRERIA = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';

export async function crearCliente(opciones) {
  const { createClient } = await import(LIBRERIA);
  return createClient(SUPABASE_URL, SUPABASE_CLAVE, opciones);
}

// Canal en vivo de cada pantalla. Lleva la clave, así que solo lo conoce quien conoce la pantalla.
export const canalDe = (clave) => 'activador-' + clave;

// Trae la configuración de una pantalla. Si no hay internet, usa la última que recibió.
export async function conectarPantalla(clave) {
  const guardada = 'activador-config-' + clave;
  let sb = null, config = null;
  try {
    sb = await crearCliente({ auth: { persistSession: false } });
    const { data, error } = await sb.rpc('activador_config', { p_clave: clave });
    if (error) throw error;
    config = data;
    try { localStorage.setItem(guardada, JSON.stringify(data)); } catch { /* sin almacenamiento */ }
  } catch (e) {
    console.warn('Activador: no se pudo leer la configuración del panel', e);
    try { config = JSON.parse(localStorage.getItem(guardada)); } catch { /* sin almacenamiento */ }
    if (!config) throw new Error('No se pudo conectar con el panel y no hay una configuración guardada en este equipo.');
  }

  const oyentes = [];
  let canal = null, enVivo = false;
  if (sb) {
    canal = sb.channel(canalDe(clave), { config: { broadcast: { self: false } } })
      // Al guardar algo en el panel, la pantalla se recarga con lo nuevo
      .on('broadcast', { event: 'recargar' }, () => location.reload())
      .on('broadcast', { event: 'mostrar' }, ({ payload }) => oyentes.forEach((f) => f(payload.escena)))
      .subscribe((estado) => { enVivo = estado === 'SUBSCRIBED'; });

    // Por si la red bloquea la conexión en vivo: cada 2 minutos se fija si cambió algo en el panel
    const firma = JSON.stringify(config);
    setInterval(async () => {
      const { data, error } = await sb.rpc('activador_config', { p_clave: clave });
      if (!error && JSON.stringify(data) !== firma) location.reload();
    }, 120000);
  }

  return {
    config,
    alMostrar: (f) => oyentes.push(f),
    disparo: (regla) => sb?.rpc('activador_disparo', { p_clave: clave, p_regla: regla }).then(() => {}, () => {}),
    latido: (estado) => sb?.rpc('activador_latido', { p_clave: clave, p_estado: estado }).then(() => {}, () => {}),
    // Solo con la conexión en vivo abierta: sin ella alcanza con el latido de cada minuto
    estadoEnVivo: (estado) => enVivo && canal.send({ type: 'broadcast', event: 'estado', payload: estado }),
  };
}
