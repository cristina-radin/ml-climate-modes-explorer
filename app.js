(function(){
const D=window.SCM_DATA;
const NAMES={"STA":{"1":"North East Pacific Ocean","3":"East Pacific Ocean","4":"West Pacific Ocean","5":"West Atlantic Ocean","6":"West 1 Indian Ocean","7":"South East Pacific Ocean","10":"North West 1 Atlantic Ocean","11":"East Indian Ocean","14":"East Atlantic Ocean","16":"West 2 Indian Ocean","17":"North East Atlantic Ocean","18":"North Indian Ocean","21":"North West 2 Atlantic Ocean"},"MTA":{"4":"North East Atlantic Ocean","8":"East Pacific Ocean","9":"North West 1 Atlantic Ocean","10":"North Indian Ocean","11":"East Atlantic Ocean","13":"West 2 Indian Ocean","14":"West Atlantic Ocean","16":"South East Pacific Ocean","17":"North West 2 Atlantic Ocean","18":"West 1 Indian Ocean","19":"East Indian Ocean","20":"West Pacific Ocean","21":"North East Pacific Ocean"},"OHC":{"3":"South East Pacific Ocean","5":"North East Atlantic Ocean","10":"North Indian Ocean","11":"East Pacific Ocean","13":"West 2 Indian Ocean","14":"West Pacific Ocean","15":"East Indian Ocean","16":"West Atlantic Ocean","19":"West 1 Indian Ocean","20":"North West 1 Atlantic Ocean","21":"North West 2 Atlantic Ocean","22":"North East Pacific Ocean","24":"East Atlantic Ocean"}};
const nameOf=(L,id)=>(NAMES[L]&&NAMES[L][id])||`Cluster ${id}`;
const LAYERS=["STA","MTA","OHC"],LAYER_NAME={STA:"Surface",MTA:"Upper 100 m",OHC:"Upper 700 m"};
const TS=["Savitzky–Golay","1-year window","3-year window","5-year window"];
const TS_SERIES=2,LON_START=20,NLAT=D.nlat,NLON=D.nlon;
const S={layer:"MTA",ts:TS_SERIES,region:21,period:"alt"};
const $=id=>document.getElementById(id);
const nf2=new Intl.NumberFormat('en',{minimumFractionDigits:2,maximumFractionDigits:2,signDisplay:'auto'});
const nf1=new Intl.NumberFormat('en',{minimumFractionDigits:1,maximumFractionDigits:1});
const nf0=new Intl.NumberFormat('en');

/* colors */
function oklch(L,C,h){h=h*Math.PI/180;const a=C*Math.cos(h),b=C*Math.sin(h);
  const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
  const f=x=>{x=x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055;return Math.round(Math.min(1,Math.max(0,x))*255)};
  return [f(4.0767416621*l-3.3077115913*m+.2309699292*s),f(-1.2684380046*l+2.6097574011*m-.3413193965*s),f(-.0041960863*l-.7034186147*m+1.707614701*s)]}
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const hexRgb=h=>{h=h.replace('#','');return[0,2,4].map(i=>parseInt(h.substr(i,2),16))};
let PAL=[];
function buildPalette(){PAL=[];for(let k=0;k<22;k++){const L=k%2?.86:.76,C=k%3===0?.07:.095;PAL.push(oklch(L,C,(k*137.508+215)%360))}}
const rgb=a=>`rgb(${a[0]},${a[1]},${a[2]})`;

/* data helpers */
const cellCluster=(L,ts,y,x)=>{const c=D.maps[L][ts].charCodeAt(y*NLON+x);return c===46?0:c-64};
const MASKS={};
for(const L of LAYERS)for(const r of D.regions[L]){const set=new Set();for(let i=0;i<r.mask.length;i+=2)for(let k=0;k<r.mask[i+1];k++)set.add(r.mask[i]+k);MASKS[L+r.id]=set}
const fmtLat=v=>Math.round(Math.abs(v))+'°'+(v<0?'S':'N');
const fmtLon=v=>{v=((v+180)%360+360)%360-180;return Math.round(Math.abs(v))+'°'+(v<0?'W':'E')};
const regionOf=(L,id)=>D.regions[L].find(r=>r.id===id);
function corr(a,b){const n=a.length;let ma=0,mb=0;for(let i=0;i<n;i++){ma+=a[i];mb+=b[i]}ma/=n;mb/=n;let sab=0,saa=0,sbb=0;for(let i=0;i<n;i++){const da=a[i]-ma,db=b[i]-mb;sab+=da*db;saa+=da*da;sbb+=db*db}return sab/Math.sqrt(saa*sbb)}
const zs=a=>{const n=a.length,m=a.reduce((s,v)=>s+v,0)/n,sd=Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/n)||1;return a.map(v=>(v-m)/sd)};
const OFF=Math.round((D.t_sl.start-D.t_pc.start)/D.t_pc.step);
const STATS={};
for(const L of LAYERS)for(const r of D.regions[L]){const p=r.pc1.slice(OFF,OFF+D.t_sl.n),rr=corr(p,r.rsl),sg=rr<0?-1:1;STATS[L+r.id]={sign:sg,rr:Math.abs(rr),rc:corr(p.map(v=>v*sg),r.csl)}}

/* deep link: #mta-21 */
function readHash(){const m=(location.hash||'').match(/^#(sta|mta|ohc)(?:-(\d+))?$/i);if(!m)return;const L=m[1].toUpperCase();S.layer=L;
  const id=m[2]?+m[2]:null;S.region=id&&regionOf(L,id)?id:(D.regions[L][0]||{}).id}
function writeHash(){try{history.replaceState(null,'','#'+S.layer.toLowerCase()+(S.region?'-'+S.region:''))}catch(e){}}

/* controls */
document.querySelectorAll('.layer').forEach(b=>b.addEventListener('click',()=>{S.layer=LAYERS[+b.dataset.i];if(!regionOf(S.layer,S.region))S.region=pickBest(S.layer);render()}));
document.querySelectorAll('.span-toggle button').forEach(b=>b.addEventListener('click',()=>{S.period=b.dataset.p;renderSeries()}));
const pickBest=L=>D.regions[L].reduce((a,r)=>STATS[L+r.id].rr>STATS[L+a.id].rr?r:a).id;

/* map: pannable, zoomable, wraps in longitude */
const LAT_TOP=72,LAT_BOT=-60,SPAN=LAT_TOP-LAT_BOT;
const LAND=new Path2D(window.SCM_LAND);
const LANDMIN=-180,LANDMAX=191;
const cv=$('map'),ctx=cv.getContext('2d'),off=document.createElement('canvas');off.width=NLON;off.height=NLAT;const octx=off.getContext('2d');
const dispX=x=>(x-LON_START+NLON)%NLON;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const V={vl:0,vt:0,z:1};           // left edge (display °), top edge (° below 72N), zoom
let k=1,cssW=1,cssH=1,dpr=1,outline=null,outlineKey='';
const mod=(a,n)=>((a%n)+n)%n;
function clampV(){V.z=Math.min(10,Math.max(1,V.z));V.vt=Math.min(SPAN-SPAN/V.z,Math.max(0,V.vt));V.vl=mod(V.vl,360)}
function paintClusters(){
  const img=octx.createImageData(NLON,NLAT),bg=hexRgb(css('--sea'));
  const selReg=S.ts===TS_SERIES?regionOf(S.layer,S.region):null,selId=selReg?selReg.cl:null;
  for(let y=0;y<NLAT;y++)for(let x=0;x<NLON;x++){
    const c0=cellCluster(S.layer,S.ts,y,x),o=((NLAT-1-y)*NLON+dispX(x))*4;
    if(!c0){img.data[o+3]=0;continue}
    let c=PAL[c0-1];if(selId&&c0!==selId)c=c.map((v,i)=>Math.round(v*.38+bg[i]*.62));
    img.data[o]=c[0];img.data[o+1]=c[1];img.data[o+2]=c[2];img.data[o+3]=255}
  octx.putImageData(img,0,0);
  const key=S.layer+S.region+'_'+S.ts;
  if(key!==outlineKey){outlineKey=key;outline=null;const mask=selReg?MASKS[S.layer+selReg.id]:null;
    if(mask){const has=(y,x)=>y>=0&&y<NLAT&&mask.has(y*NLON+mod(x,NLON)),e=new Path2D(),y0=LAT_TOP-50;
      for(const idx of mask){const y=Math.floor(idx/NLON),x=idx%NLON,X=dispX(x),Y=y0+(NLAT-1-y);
        if(!has(y+1,x)){e.moveTo(X,Y);e.lineTo(X+1,Y)} if(!has(y-1,x)){e.moveTo(X,Y+1);e.lineTo(X+1,Y+1)}
        if(!has(y,x-1)||X===0){e.moveTo(X,Y);e.lineTo(X,Y+1)} if(!has(y,x+1)||X===NLON-1){e.moveTo(X+1,Y);e.lineTo(X+1,Y+1)}}
      outline=e}}
}
function sizeMap(){cssW=cv.clientWidth||$('mapframe').clientWidth;cssH=Math.round(cssW*SPAN/360);dpr=window.devicePixelRatio||1;
  cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);cv.style.height=cssH+'px'}
function frame(){
  clampV();k=cv.width/(360/V.z);const vw=360/V.z;
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=css('--sea');ctx.fillRect(0,0,cv.width,cv.height);
  const land=css('--land'),coast=css('--coast'),ink=css('--ink');
  for(let s=-360;s<=720;s+=360){            // clusters first, every visible copy
    if(s+360<=V.vl||s>=V.vl+vw)continue;
    ctx.setTransform(k,0,0,k,(s-V.vl)*k,-V.vt*k);ctx.imageSmoothingEnabled=false;ctx.drawImage(off,0,LAT_TOP-50,360,100)}
  for(let s=-360;s<=720;s+=360){            // then real land on top
    if(s+LANDMAX-LON_START<V.vl||s+LANDMIN-LON_START>V.vl+vw)continue;
    ctx.setTransform(k,0,0,k,(s-V.vl-LON_START)*k,-V.vt*k);
    ctx.fillStyle=land;ctx.fill(LAND);ctx.strokeStyle=coast;ctx.lineWidth=.8*dpr/k;ctx.lineJoin='round';ctx.stroke(LAND)}
  if(outline)for(let s=-360;s<=720;s+=360){  // selected region outline
    if(s+360<=V.vl||s>=V.vl+vw)continue;
    ctx.setTransform(k,0,0,k,(s-V.vl)*k,-V.vt*k);ctx.lineCap='square';
    ctx.strokeStyle='#ffffff';ctx.lineWidth=4*dpr/k;ctx.stroke(outline);ctx.strokeStyle=ink;ctx.lineWidth=1.8*dpr/k;ctx.stroke(outline)}
  $('zoomlevel').textContent=V.z<1.05?'Whole ocean':`${nf1.format(V.z)}×`;
}
let raf=0;const request=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;frame()})};
function drawMap(){paintClusters();request()}
function toDeg(px,py){return{dx:V.vl+px*dpr/k,dy:V.vt+py*dpr/k}}
function zoomAt(f,px,py){const a=toDeg(px,py);V.z*=f;clampV();k=cv.width/(360/V.z);V.vl=a.dx-px*dpr/k;V.vt=a.dy-py*dpr/k;request()}
let tween=0;
function flyTo(lonDisp,latDeg,z){cancelAnimationFrame(tween);const z1=z||Math.max(V.z,2.2),w1=360/z1,h1=SPAN/z1;
  let tl=lonDisp-w1/2,tt=(LAT_TOP-latDeg)-h1/2;const s={vl:V.vl,vt:V.vt,z:V.z};let dl=mod(tl-s.vl+180,360)-180;
  if(reduced){V.vl=s.vl+dl;V.vt=tt;V.z=z1;request();return}
  const t0=performance.now(),D=650;const step=now=>{const p=Math.min(1,(now-t0)/D),e=1-Math.pow(1-p,3);
    V.z=s.z+(z1-s.z)*e;V.vl=s.vl+dl*e;V.vt=s.vt+(tt-s.vt)*e;frame();if(p<1)tween=requestAnimationFrame(step)};tween=requestAnimationFrame(step)}
function cellAt(ev){const r=cv.getBoundingClientRect(),d=toDeg(ev.clientX-r.left,ev.clientY-r.top),lat=LAT_TOP-d.dy;
  if(lat<=-50||lat>=50)return null;return{y:Math.floor(lat+50),x:mod(Math.floor(d.dx)+LON_START,NLON),lat,lon:mod(d.dx+LON_START,360)}}
/* gestures */
const ptrs=new Map();let drag=null,moved=0,pinch=null;
cv.addEventListener('pointerdown',ev=>{cv.setPointerCapture(ev.pointerId);ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});cancelAnimationFrame(tween);
  if(ptrs.size===1){drag={x:ev.clientX,y:ev.clientY};moved=0;cv.classList.add('grabbing')}
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)};drag=null}});
cv.addEventListener('pointermove',ev=>{
  if(ptrs.has(ev.pointerId))ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(pinch&&ptrs.size===2){const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),r=cv.getBoundingClientRect();
    zoomAt(d/pinch.d,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);pinch.d=d;moved=99;return}
  if(drag){const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;moved+=Math.abs(dx)+Math.abs(dy);V.vl-=dx*dpr/k;V.vt-=dy*dpr/k;drag={x:ev.clientX,y:ev.clientY};request();return}
  readCell(ev)});
const endPtr=ev=>{ptrs.delete(ev.pointerId);if(ptrs.size<2)pinch=null;if(!ptrs.size){drag=null;cv.classList.remove('grabbing')}};
cv.addEventListener('pointerup',ev=>{const wasClick=drag&&moved<5;endPtr(ev);if(wasClick){const c=cellAt(ev);if(c){const r=regionAtCell(c);if(r){S.region=r.id;render()}}}});
cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('wheel',ev=>{ev.preventDefault();const r=cv.getBoundingClientRect();zoomAt(Math.exp(-ev.deltaY*.0018),ev.clientX-r.left,ev.clientY-r.top)},{passive:false});
cv.addEventListener('dblclick',ev=>{const r=cv.getBoundingClientRect();zoomAt(2,ev.clientX-r.left,ev.clientY-r.top)});
cv.addEventListener('keydown',ev=>{const st=(360/V.z)*.08,m={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[ev.key];
  if(m){ev.preventDefault();V.vl+=m[0];V.vt+=m[1];request()}else if(ev.key==='+'||ev.key==='='){zoomAt(1.4,cssW/2,cssH/2)}else if(ev.key==='-'){zoomAt(1/1.4,cssW/2,cssH/2)}else if(ev.key==='0'){resetView()}});
function resetView(){flyTo(180,LAT_TOP-SPAN/2,1)}
$('zin').addEventListener('click',()=>zoomAt(1.5,cssW/2,cssH/2));
$('zout').addEventListener('click',()=>zoomAt(1/1.5,cssW/2,cssH/2));
$('zreset').addEventListener('click',resetView);
let lastRead='';
function readCell(ev){const c=cellAt(ev);let t='';
  if(!c)t='Outside the analysed band (50°S to 50°N)';
  else{const kk=cellCluster(S.layer,S.ts,c.y,c.x),r=kk?regionAtCell(c):null;t=`${fmtLat(c.lat)} ${fmtLon(c.lon)} · `+(kk?(r?`${nameOf(S.layer,r.id)} · Click to compare`:`Cluster ${kk}`):'No cluster');cv.style.cursor=r?'pointer':''}
  if(t!==lastRead){$('readout').textContent=t;lastRead=t}}
cv.addEventListener('pointerleave',()=>{$('readout').textContent='Drag to move, scroll or pinch to zoom.';lastRead='';cv.style.cursor=''});
function regionAtCell(c){if(S.ts!==TS_SERIES)return null;const idx=c.y*NLON+c.x;return D.regions[S.layer].find(r=>MASKS[S.layer+r.id].has(idx))||null}

/* register */
function renderRegister(){const box=$('reglist');box.innerHTML='';
  for(const r of D.regions[S.layer]){const st=STATS[S.layer+r.id],b=document.createElement('button');b.className='reg-row';b.id='reg-'+r.id;
    b.setAttribute('aria-pressed',S.ts===TS_SERIES&&S.region===r.id);
    b.setAttribute('aria-label',`${nameOf(S.layer,r.id)}, regional correlation ${nf2.format(st.rr)}, coastal ${nf2.format(st.rc)}`);
    b.innerHTML=`<span class="nm"><i style="background:${rgb(PAL[r.cl-1])}" aria-hidden="true"></i>${nameOf(S.layer,r.id)}</span><span>${nf2.format(st.rr)}</span><span>${nf2.format(st.rc)}</span>`;
    b.addEventListener('click',()=>{S.region=r.id;if(S.ts!==TS_SERIES){S.ts=TS_SERIES}render();flyTo(dispX(Math.floor(r.lon))+.5,r.lat,Math.max(V.z,1.8))});box.appendChild(b)}
  $('regnote').textContent=`${D.regions[S.layer].length} regions with time series in this layer.`}

/* series */
function renderSeries(){
  document.querySelectorAll('.span-toggle button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===S.period));
  const r=regionOf(S.layer,S.region),chart=$('chart');if(!r){chart.textContent='';return}
  const st=STATS[S.layer+r.id];
  $('ckicker').textContent=`${LAYER_NAME[S.layer]} · Cluster ${r.cl} · centred near ${fmtLat(r.lat)} ${fmtLon(r.lon)}`;
  $('ctitle').textContent=nameOf(S.layer,r.id);
  $('figures').innerHTML=[['Correlation, regional',nf2.format(st.rr)],['Correlation, coastal',nf2.format(st.rc)],['Grid cells',nf0.format(r.cells)]]
    .map(([a,b])=>`<div class="figure"><span>${a}</span><b>${b}</b></div>`).join('');
  const full=S.period==='full',i0=full?0:OFF,n=full?D.t_pc.n:D.t_sl.n,t=i=>D.t_pc.start+(i0+i)*D.t_pc.step;
  const pcW=zs(r.pc1.slice(i0,i0+n).map(v=>v*st.sign)),slStart=full?OFF:0,rslZ=zs(r.rsl),cslZ=zs(r.csl);
  const W=Math.max(300,chart.clientWidth),H=W<520?240:300,m={l:40,r:10,t:10,b:26},iw=W-m.l-m.r,ih=H-m.t-m.b;
  const t0=t(0),t1=t(n-1),X=v=>m.l+(v-t0)/(t1-t0)*iw,all=[...pcW,...rslZ,...cslZ];
  const ymax=Math.max(2.5,Math.ceil(Math.max(...all.map(Math.abs))*2)/2),Y=v=>m.t+(ymax-v)/(2*ymax)*ih;
  const path=(arr,s)=>arr.map((v,i)=>`${i?'L':'M'}${X(t(s+i)).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  let g='';
  for(let v=-Math.floor(ymax);v<=Math.floor(ymax);v++)g+=(v===0?`<line x1="${m.l}" x2="${W-m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--rule)" stroke-width="1.5"/>`:'')+`<text x="${m.l-8}" y="${Y(v)+4}" text-anchor="end" fill="var(--soft)">${v>0?'+':v<0?'−':''}${Math.abs(v)}σ</text>`;
  const step=full?(W<520?20:10):(W<520?10:5);
  for(let yv=Math.ceil(t0/step)*step;yv<=t1;yv+=step)g+=`<text x="${X(yv)}" y="${H-6}" text-anchor="middle" fill="var(--soft)">${yv}</text>`;
  if(full)g=`<rect x="${X(D.t_sl.start)}" y="${m.t}" width="${X(t1)-X(D.t_sl.start)}" height="${ih}" fill="var(--wash)"/><text x="${X(D.t_sl.start)+6}" y="${m.t+14}" fill="var(--soft)">Altimetry era</text>`+g;
  chart.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Standardized PC1 and sea level, ${full?'1955':'1993'} to 2022">${g}
    <path d="${path(pcW,0)}" fill="none" stroke="var(--pc)" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="${path(rslZ,slStart)}" fill="none" stroke="var(--rsl)" stroke-width="2" stroke-linejoin="round"/>
    <path d="${path(cslZ,slStart)}" fill="none" stroke="var(--csl)" stroke-width="2" stroke-linejoin="round"/>
    <line id="hair" y1="${m.t}" y2="${H-m.b}" stroke="var(--ink)" stroke-opacity=".55" visibility="hidden"/>
    <rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" id="hit"/></svg><div class="tip" id="tip" hidden></div>`;
  const svgEl=chart.querySelector('svg'),hit=chart.querySelector('#hit'),hair=chart.querySelector('#hair'),tip=$('tip');
  hit.addEventListener('pointermove',ev=>{const b=svgEl.getBoundingClientRect(),sx=(ev.clientX-b.left)/b.width*W;
    const i=Math.max(0,Math.min(n-1,Math.round((sx-m.l)/iw*(n-1)))),tt=t(i),xx=X(tt);hair.setAttribute('x1',xx);hair.setAttribute('x2',xx);hair.setAttribute('visibility','visible');
    const gi=i0+i,si=gi-OFF,yr=Math.floor(tt),q=Math.round((tt-yr)*4)+1;
    let h=`<b>${yr} Q${q}</b><br>PC1 ${nf2.format(r.pc1[gi])}`;if(si>=0&&si<D.t_sl.n)h+=`<br>Regional ${nf1.format(r.rsl[si])} cm<br>Coastal ${nf1.format(r.csl[si])} cm`;
    tip.innerHTML=h;tip.hidden=false;const px=xx/W*b.width;tip.style.left=Math.max(0,Math.min(px+12,b.width-140))+'px';tip.style.top='12px'});
  hit.addEventListener('pointerleave',()=>{hair.setAttribute('visibility','hidden');tip.hidden=true});
}

function render(){
  document.querySelectorAll('.layer').forEach(b=>b.setAttribute('aria-pressed',LAYERS[+b.dataset.i]===S.layer));
  $('mapcaption').textContent=`${LAYER_NAME[S.layer]} · 22 clusters · 1° grid · 50°S to 50°N`;
  renderRegister();drawMap();renderSeries();writeHash()}
buildPalette();readHash();sizeMap();render();
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{sizeMap();drawMap();renderSeries()},120)});
addEventListener('hashchange',()=>{readHash();render()});
})();
