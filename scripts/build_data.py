"""Build data/regions.js for the viewer.

Usage: python scripts/build_data.py <folder with .nc results> <regional_climate_dataset.mat>

Cluster maps come from the openly released Regional-Climate-Patterns dataset (.mat).
Regional PC1 and sea level series come from the result NetCDF files.
"""
import xarray as xr, numpy as np, h5py, glob, re, json, warnings
warnings.filterwarnings("ignore")
import sys
D=sys.argv[1] if len(sys.argv)>1 else 'nc'  # folder with the *_PC1/_RSL/_CSL/_RC.nc result files
pub=h5py.File((sys.argv[2] if len(sys.argv)>2 else 'regional_climate_dataset.mat'))['cluster_map'][()]  # (4 timescales, 3 vars, 100 lat, 360 lon)
CH="ABCDEFGHIJKLMNOPQRSTUV"  # 1..22
def enc(m): return ''.join('.' if np.isnan(v) else CH[int(v)-1] for v in m.ravel())
layers=["STA","MTA","OHC"]
out={"lat0":-49.5,"lon0":0.5,"nlat":100,"nlon":360,"maps":{},"regions":{}}
for vi,L in enumerate(layers):
    out["maps"][L]=[enc(pub[t,vi]) for t in range(4)]
    regs=[]
    for f in glob.glob(f'{D}/{L}_*_PC1.nc'):
        i=int(re.search(rf'{L}_(\d+)_',f).group(1))
        pc=xr.open_dataset(f).PC1; rsl=xr.open_dataset(f'{D}/{L}_{i}_RSL.nc').RSL; csl=xr.open_dataset(f'{D}/{L}_{i}_CSL.nc').CSL
        rc=xr.open_dataset(f'{D}/{L}_{i}_RC.nc').rc.values==1
        rc=rc.ravel().reshape(360,100).T   # undo the reshape-order error in the stored masks
        cid=i if i<=22 else int(np.bincount(pub[2,vi][rc].astype(int)).argmax())  # OHC_24 shares cluster 16's area, as in the original viewer
        cl=pub[2,vi]==cid
        assert (rc&~cl).sum()==0, (L,i)
        idx=np.flatnonzero(rc)
        # run-length (start,len) on flattened index
        runs=[];s=idx[0];p=s
        for k in idx[1:]:
            if k!=p+1: runs+= [int(s),int(p-s+1)]; s=k
            p=k
        runs+=[int(s),int(p-s+1)]
        ys,xs=np.nonzero(rc); lat=float((ys*1.0-49.5).mean())
        ang=np.deg2rad(xs+0.5); lon=float(np.rad2deg(np.arctan2(np.sin(ang).mean(),np.cos(ang).mean()))%360)
        assert str(pc.time.values[0])[:10]=="1955-01-01" and len(pc)==272
        assert str(rsl.time.values[0])[:10]=="1993-01-01" and len(rsl)==118 and np.array_equal(rsl.time,csl.time)
        regs.append({"id":i,"cl":cid,"lat":round(lat,1),"lon":round(lon,1),"cells":int(rc.sum()),"mask":runs,
            "pc1":[round(float(v),4) for v in pc.values],
            "rsl":[round(float(v)*100,3) for v in rsl.values],"csl":[round(float(v)*100,3) for v in csl.values]})
    regs.sort(key=lambda r:r["id"]); out["regions"][L]=regs
    print(L,len(regs))
out["t_pc"]={"start":1955.0,"step":0.25,"n":272}; out["t_sl"]={"start":1993.0,"step":0.25,"n":118}
open('data/regions.js','w').write('window.SCM_DATA='+json.dumps(out,separators=(',',':'))+';\n')
print('wrote data/regions.js')
