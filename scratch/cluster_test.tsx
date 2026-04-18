import L from 'leaflet';
import 'leaflet.markercluster';

const clusterGroup = L.markerClusterGroup({
  showCoverageOnHover: false,
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  // we want spiderfy to happen on click instead of zooming in, 
  // but Wait, MarkerClusterGroup by default un-spiderfies when clicked elsewhere or zooming.
});
