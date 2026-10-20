import fs from 'fs'; import {feature} from 'topojson-client';
const topo=JSON.parse(fs.readFileSync('node_modules/world-atlas/land-50m.json'));
const land=feature(topo,topo.objects.land);
const LAT_TOP=72, r=v=>Math.round(v*10)/10;
let d='';
const ring=c=>{let pl=null;const u=c.map(([lo,la])=>{if(pl!==null)lo+=360*Math.round((pl-lo)/360);pl=lo;return[lo,la]});const mn=Math.min(...u.map(p=>p[0]));const sh=-360*Math.floor((mn+180)/360);let prev='',s='';u.forEach(([lo,la])=>{lo+=sh;const p=`${r(lo)},${r(LAT_TOP-la)}`;if(p===prev)return;s+=(s?'L':'M')+p;prev=p});return s+'Z'};
const geoms=land.features.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates);
for(const poly of geoms){ if(Math.min(...poly[0].map(p=>p[1]))>LAT_TOP)continue; for(const c of poly) d+=ring(c)}
fs.writeFileSync('data/coastline.js','window.SCM_LAND="'+d+'";\n'); console.log('wrote data/coastline.js');
