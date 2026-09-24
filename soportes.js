// Soportes fijos que se muestran en el mapa de cobertura.
// Para agregar uno, sumá una línea en la lista que corresponda con sus coordenadas (lat, lng).
window.SOPORTES = {
  // [cartel, ruta, km, sentido, medidas, lat, lng]
  ruteros: [
    ["Ruta IB km 33.000", "Interbalnearia", 33.0, "Este", "20 x 5 m", -34.7885015, -55.89522],
    ["Ruta IB km 34.000", "Interbalnearia", 34.0, "Este", "12 x 4 m", -34.7831484, -55.8855652],
    ["Ruta IB km 34.500", "Interbalnearia", 34.5, "Este", "12 x 4 m", -34.7823251, -55.8798937],
    ["Ruta IB km 34.900 · Este", "Interbalnearia", 34.9, "Este", "12 x 4 m", -34.7814572, -55.876871],
    ["Ruta IB km 34.900 · Oeste", "Interbalnearia", 34.9, "Oeste", "12 x 4 m", -34.7814572, -55.876871],
    ["Ruta IB km 35.200", "Interbalnearia", 35.2, "Este", "12 x 4 m", -34.7809063, -55.8742804],
    ["Ruta IB km 43.800", "Interbalnearia", 43.8, "Este", "14 x 4 m", -34.7668131, -55.7820331],
    ["Ruta IB km 51.000", "Interbalnearia", 51.0, "Este", "10 x 4 m", -34.7502331, -55.7077513],
    ["Ruta IB km 57.000 · margen der", "Interbalnearia", 57.0, "Este", "12 x 4 m", -34.7517427, -55.6420636],
    ["Ruta IB km 57.000 · margen izq", "Interbalnearia", 57.0, "Este", "12 x 4 m", -34.7517427, -55.6420636],
    ["Ruta IB km 57.300", "Interbalnearia", 57.3, "Este", "12 x 4 m", -34.7519925, -55.6388656],
    ["Ruta IB km 57.600", "Interbalnearia", 57.6, "Este", "12 x 4 m", -34.7522422, -55.6356675],
    ["Ruta IB km 57.700", "Interbalnearia", 57.7, "Este", "12 x 4 m", -34.7523255, -55.6346015],
    ["Ruta IB km 70.000", "Interbalnearia", 70.0, "Este", "12 x 4 m", -34.7867896, -55.5103671],
    ["Ruta IB km 74.300", "Interbalnearia", 74.3, "Este", "14 x 4 m", -34.7788461, -55.4654495],
    ["Ruta IB km 74.600", "Interbalnearia", 74.6, "Este", "12 x 4 m", -34.7782925, -55.4623078],
    ["Ruta IB km 74.900", "Interbalnearia", 74.9, "Este", "12 x 4 m", -34.7777389, -55.4591661],
    ["Ruta IB km 75.200", "Interbalnearia", 75.2, "Este", "14 x 4 m", -34.7777186, -55.4556099],
    ["Ruta IB km 76.300", "Interbalnearia", 76.3, "Este", "14 x 4 m", -34.7786329, -55.4427353],
    ["Ruta IB km 76.600", "Interbalnearia", 76.6, "Este", "12 x 4 m", -34.7788904, -55.4398966],
    ["Ruta IB km 76.900", "Interbalnearia", 76.9, "Este", "12 x 4 m", -34.779148, -55.4370578],
    ["Ruta IB km 77.000 ⟲", "Interbalnearia", 77.0, "Este", "12 x 4 m", -34.7792245, -55.4359948],
    ["Ruta IB km 77.200 ⟲", "Interbalnearia", 77.2, "Este", "12 x 4 m", -34.7793774, -55.4338688],
    ["Ruta IB km 77.500", "Interbalnearia", 77.5, "Este", "12 x 4 m", -34.7796067, -55.4306797],
    ["Ruta IB km 92.000", "Interbalnearia", 92.0, "Este", "12 x 4 m", -34.7871438, -55.2850396],
    ["Ruta IB km 92.300", "Interbalnearia", 92.3, "Este", "14 x 4 m", -34.7866019, -55.281929],
    ["Ruta IB km 92.600", "Interbalnearia", 92.6, "Este", "14 x 4 m", -34.78606, -55.2788184],
    ["Ruta IB km 92.800", "Interbalnearia", 92.8, "Este", "12 x 4 m", -34.7856988, -55.2767447],
    ["Ruta IB km 97.300", "Interbalnearia", 97.3, "Este", "14 x 4 m", -34.7960791, -55.231066],
    ["Ruta IB km 106.300", "Interbalnearia", 106.3, "Este", "12 x 4 m", -34.8523542, -55.1697692],
    ["Ruta IB km 106.400", "Interbalnearia", 106.4, "Este", "12 x 4 m", -34.8529516, -55.1689474],
    ["Ruta IB km 106.500", "Interbalnearia", 106.5, "Este", "14 x 4 m", -34.853549, -55.1681256],
    ["Ruta IB km 106.600", "Interbalnearia", 106.6, "Este", "12 x 4 m", -34.8541464, -55.1673038],
    ["Ruta IB km 106.900", "Interbalnearia", 106.9, "Este", "12 x 4 m", -34.8559387, -55.1648383],
    ["Ruta IB km 115.000", "Interbalnearia", 115.0, "Este", "12 x 4 m", -34.8697615, -55.0803597],
    ["Ruta 1 km 15.900", "Ruta 1", 15.9, "Oeste", "12 x 4 m", -34.830764, -56.332014],
    ["Ruta 1 km 18.300", "Ruta 1", 18.3, "Oeste", "12 x 4 m", -34.814157, -56.342738],
    ["Ruta 1 km 52.200", "Ruta 1", 52.2, "Oeste", "14 x 4 m", -34.639669, -56.628809],
    ["Ruta 1 km 59.600", "Ruta 1", 59.6, "Oeste", "10 x 4 m", -34.596437, -56.688076],
    ["Ruta 1 km 161.000", "Ruta 1", 161.0, "Este", "12 x 4 m", -34.418026, -57.680826],
    ["Ruta 1 km 161.300", "Ruta 1", 161.3, "Oeste", "12 x 4 m", -34.418472, -57.682738],
    ["Ruta 101 km 27.700 · Norte", "Ruta 101", 27.7, "Norte", "12 x 4 m", -34.774344, -55.988069],
    ["Ruta 101 km 27.700 · Sur", "Ruta 101", 27.7, "Sur", "12 x 4 m", -34.774344, -55.988069],
    ["Ruta 102 km 45.800", "Ruta 102", 45.8, "Este", "12 x 4 m", -34.794451, -56.122438],
    ["Ruta 5 km 15.500", "Ruta 5", 15.5, "Norte", "14 x 4 m", -34.784986, -56.273722],
    ["Ruta 5 km 82.000", "Ruta 5", 82.0, "Norte", "10 x 4 m", -34.2124, -56.206002],
    ["Ruta 5 km 88.000", "Ruta 5", 88.0, "Norte", "10 x 4 m", -34.162748, -56.180804],
    ["Ruta 5 km 88.200", "Ruta 5", 88.2, "Norte", "10 x 4 m", -34.161162, -56.179804],
    ["Ruta 5 km 88.600", "Ruta 5", 88.6, "Norte", "14 x 4 m", -34.15757, -56.179445],
    ["Ruta 5 km 89.000", "Ruta 5", 89.0, "Norte", "12 x 4 m", -34.153961, -56.179645],
    ["Ruta 5 km 89.500", "Ruta 5", 89.5, "Norte", "12 x 4 m", -34.149448, -56.179763],
  ],

  // [shopping, soportes, lat, lng]
  shoppings: [
    ["Atlántico Shopping Punta del Este", 14, -34.9378, -54.95],
    ["Salto", 9, -31.3833, -57.9667],
    ["Mercedes", 7, -33.2524, -58.0306],
    ["Colonia", 6, -34.4726, -57.8446],
    ["Paysandú", 6, -32.3214, -58.0756],
    ["Minas ⟲", 5, -34.3756, -55.2378],
  ],

  // [ubicación, tipo, lat, lng]
  pantallas: [
    ["Av. Italia y Ricaldoni", "Pantalla gigante", -34.894, -56.166],
    ["Rivera y Bvar. Batlle y Ordóñez", "Pantalla gigante", -34.899, -56.1455],
    ["Rivera y L.A. Herrera", "Pantalla gigante curva", -34.901, -56.137],
    ["Punta del Este", "Pantalla gigante 360", -34.9378, -54.95],
  ],

  // Medianeras. [ubicación, lat, lng]
  walls: [
    ["Av. 18 de Julio y Roxlo", -34.902, -56.183],
    ["Av. Italia y Caldas", -34.884, -56.129],
    ["Bvar. Batlle y Ordóñez y Av. Rivera", -34.8985, -56.1467],
  ],

  // Duty Select: circuito de pantallas en los free shops. [aeropuerto, detalle, lat, lng]
  duty: [
    ["Aeropuerto de Carrasco", "Circuito de pantallas en free shop", -34.8384, -56.0308],
    ["Aeropuerto de Punta del Este", "Circuito de pantallas en free shop", -34.8551, -55.0943],
  ],
};
