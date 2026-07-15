(function () {
  if (!document.getElementById('service-map') || typeof L === 'undefined') return;

  const map = L.map('service-map', {
    center: [42.55, -83.25], // Southeast Michigan — Oakland County area
    zoom: 9,
    scrollWheelZoom: false,
    zoomControl: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19
  }).addTo(map);

  // Expanded Southeast / South-Central Michigan service area —
  // covers Oakland, Macomb, Wayne, Washtenaw, Livingston + Genesee, Lapeer, Sanilac,
  // Shiawassee, Ingham, Jackson, Hillsdale, Lenawee, Monroe. Eastern edge hugs the
  // Lake Huron / Lake St. Clair / Detroit River / Lake Erie shoreline (no Canada).
  const serviceArea = [
    [43.45, -84.70], // NW — Shiawassee/Clinton corner
    [43.45, -83.10], // N Lapeer / Genesee
    [43.35, -82.65], // NE Sanilac shoreline (Port Sanilac)
    [42.90, -82.45], // Anchor Bay / N Macomb shore
    [42.55, -82.45], // Lake St. Clair shore
    [42.30, -82.85], // Detroit River / E Wayne shore
    [41.95, -83.10], // Monroe Lake Erie shoreline
    [41.72, -83.45], // S Monroe / OH border
    [41.72, -84.40], // SW Hillsdale / OH border
    [42.10, -84.70], // W Jackson
    [42.60, -84.75], // W Ingham
    [43.10, -84.75], // W Shiawassee
    [43.45, -84.70]
  ];

  const polygon = L.polygon(serviceArea, {
    color: '#c0a062',
    weight: 3,
    dashArray: '8, 6',
    fillColor: '#c0a062',
    fillOpacity: 0.08,
    opacity: 0.9
  }).addTo(map);

  const icon = L.divIcon({
    className: 'odyssey-marker',
    html: '<div style="width:44px;height:44px;background:#1a2630;border:3px solid #c0a062;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.3);"><span style="color:#c0a062;font-weight:800;font-size:14px;font-family:DM Serif Display,serif;">O</span></div>',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });

  // Farmington, MI — noted as their home base in the remodeling copy
  L.marker([42.4644, -83.3758], { icon })
    .addTo(map)
    .bindPopup('<strong style="font-size:14px;">Odyssey Construction</strong><br>Serving Southeast Michigan<br><a href="#contact-form" style="color:#c0a062;">Request a Consultation &rarr;</a>');

  map.fitBounds(polygon.getBounds().pad(0.05));

  // Area pill → prefill message
  window.prefillArea = function (el) {
    const area = el.textContent.trim();
    const textarea = document.querySelector('.lead-form textarea');
    if (!textarea) return;
    textarea.value = 'I\u2019m located in ' + area + '. ';
    textarea.focus();
    const form = document.querySelector('.lead-form');
    if (form) {
      form.style.boxShadow = '0 0 0 3px var(--gold)';
      setTimeout(() => { form.style.boxShadow = ''; }, 1500);
    }
  };
})();
