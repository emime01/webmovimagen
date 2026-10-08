import test from 'node:test';
import assert from 'node:assert/strict';
import { inmobiliario, validarCuestionario, leerCuestionario, enlaceResultado, MARCA } from '../cuestionario.js';

test('preserva los filtros originales y atribuye por ciudad y pantalla', () => {
  for (const nombre of ['Mercedes', 'Montevideo', 'Colonia', 'Paysandú']) {
    const u = new URL(enlaceResultado({ nombre, url: 'https://example.com/buscar?ciudad=123&operacion=venta#lista' }, 'mercedes-01'));
    assert.equal(u.searchParams.get('ciudad'), '123');
    assert.equal(u.searchParams.get('operacion'), 'venta');
    assert.equal(u.hash, '#lista');
    assert.equal(u.searchParams.get('utm_term'), nombre);
    assert.equal(u.searchParams.get('utm_content'), 'mercedes-01');
  }
});
test('rechaza enlaces inseguros, estructura inválida y tiempos fuera de rango', () => {
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com']) {
    const c = inmobiliario(); c.ciudades[0].url = url;
    assert.throws(() => validarCuestionario(c));
  }
  const c = inmobiliario(); c.sostener = 0; assert.throws(() => validarCuestionario(c));
  c.sostener = 1; c.ciudades.pop(); assert.throws(() => validarCuestionario(c));
});
test('mensajes existentes siguen siendo mensajes y configuración se recupera sin migraciones', () => {
  assert.equal(leerCuestionario({ tipo: 'mensaje', texto: 'Hola' }), null);
  assert.equal(leerCuestionario({ tipo: 'mensaje', texto: MARCA + '{bad' }), null);
  assert.deepEqual(leerCuestionario({ tipo: 'mensaje', texto: MARCA + JSON.stringify(inmobiliario()) }), inmobiliario());
});
