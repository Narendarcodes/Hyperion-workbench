"use client";var L=Object.defineProperty;var V=(n,t,a)=>t in n?L(n,t,{enumerable:!0,configurable:!0,writable:!0,value:a}):n[t]=a;var c=(n,t,a)=>V(n,typeof t!="symbol"?t+"":t,a);var e=globalThis.__compifyGlobals&&globalThis.__compifyGlobals.react;if(!e)throw new Error("compify: host global not set for react");var W=e.default!==void 0?e.default:e,k=e.Children!==void 0?e.Children:e.default&&e.default.Children,Y=e.Component!==void 0?e.Component:e.default&&e.default.Component,q=e.Fragment!==void 0?e.Fragment:e.default&&e.default.Fragment,K=e.Profiler!==void 0?e.Profiler:e.default&&e.default.Profiler,X=e.PureComponent!==void 0?e.PureComponent:e.default&&e.default.PureComponent,$=e.StrictMode!==void 0?e.StrictMode:e.default&&e.default.StrictMode,Z=e.Suspense!==void 0?e.Suspense:e.default&&e.default.Suspense,J=e.cloneElement!==void 0?e.cloneElement:e.default&&e.default.cloneElement,Q=e.createContext!==void 0?e.createContext:e.default&&e.default.createContext,ee=e.createElement!==void 0?e.createElement:e.default&&e.default.createElement,te=e.createFactory!==void 0?e.createFactory:e.default&&e.default.createFactory,ne=e.createRef!==void 0?e.createRef:e.default&&e.default.createRef,re=e.forwardRef!==void 0?e.forwardRef:e.default&&e.default.forwardRef,ae=e.isValidElement!==void 0?e.isValidElement:e.default&&e.default.isValidElement,oe=e.lazy!==void 0?e.lazy:e.default&&e.default.lazy,se=e.memo!==void 0?e.memo:e.default&&e.default.memo,ie=e.startTransition!==void 0?e.startTransition:e.default&&e.default.startTransition,le=e.useCallback!==void 0?e.useCallback:e.default&&e.default.useCallback,ue=e.useContext!==void 0?e.useContext:e.default&&e.default.useContext,de=e.useDebugValue!==void 0?e.useDebugValue:e.default&&e.default.useDebugValue,fe=e.useDeferredValue!==void 0?e.useDeferredValue:e.default&&e.default.useDeferredValue,C=e.useEffect!==void 0?e.useEffect:e.default&&e.default.useEffect,ce=e.useId!==void 0?e.useId:e.default&&e.default.useId,me=e.useImperativeHandle!==void 0?e.useImperativeHandle:e.default&&e.default.useImperativeHandle,he=e.useInsertionEffect!==void 0?e.useInsertionEffect:e.default&&e.default.useInsertionEffect,pe=e.useLayoutEffect!==void 0?e.useLayoutEffect:e.default&&e.default.useLayoutEffect,Ee=e.useMemo!==void 0?e.useMemo:e.default&&e.default.useMemo,_e=e.useReducer!==void 0?e.useReducer:e.default&&e.default.useReducer,w=e.useRef!==void 0?e.useRef:e.default&&e.default.useRef,ge=e.useState!==void 0?e.useState:e.default&&e.default.useState,ve=e.useSyncExternalStore!==void 0?e.useSyncExternalStore:e.default&&e.default.useSyncExternalStore,xe=e.useTransition!==void 0?e.useTransition:e.default&&e.default.useTransition,Re=e.version!==void 0?e.version:e.default&&e.default.version,Se=e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED!==void 0?e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED:e.default&&e.default.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,be=e.__SECRET_SERVER_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED!==void 0?e.__SECRET_SERVER_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED:e.default&&e.default.__SECRET_SERVER_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,we=e.cache!==void 0?e.cache:e.default&&e.default.cache,Te=e.use!==void 0?e.use:e.default&&e.default.use;var E=new Proxy({},{get:(n,t)=>String(t).toLowerCase()});function H(n,t){if(typeof n=="function")try{n.propertyControls=t}catch{}}function F(n){let t=I(n);return{__rgba:t,toValue(){return t?O(t):String(n)},toString(){return this.toValue()},toHexString(){return t?A(t):String(n)},toRgbString(){return this.toValue()}}}F.toHsl=n=>{let t=I(n&&n.__rgba?n.__rgba:n)||{r:0,g:0,b:0,a:1};return j(t)};F.toRgb=n=>{let t=I(n&&n.__rgba?n.__rgba:n)||{r:0,g:0,b:0,a:1};return{r:t.r,g:t.g,b:t.b,a:t.a}};function I(n){if(n==null)return null;if(typeof n=="object")return"__rgba"in n?n.__rgba:"r"in n?{r:+n.r,g:+n.g,b:+n.b,a:n.a==null?1:+n.a}:"h"in n?D(n):null;let t=String(n).trim(),a;if(a=t.match(/^#([0-9a-fA-F]{3,8})$/)){let r=a[1];return(r.length===3||r.length===4)&&(r=r.split("").map(o=>o+o).join("")),{r:parseInt(r.slice(0,2),16),g:parseInt(r.slice(2,4),16),b:parseInt(r.slice(4,6),16),a:r.length===8?parseInt(r.slice(6,8),16)/255:1}}if(a=t.match(/^rgba?\(([^)]+)\)$/i)){let r=a[1].split(/[,\/\s]+/).filter(Boolean).map(parseFloat);return{r:r[0],g:r[1],b:r[2],a:r[3]==null?1:r[3]}}if(a=t.match(/^hsla?\(([^)]+)\)$/i)){let r=a[1].split(/[,\/\s]+/).filter(Boolean).map(parseFloat);return D({h:r[0],s:r[1],l:r[2],a:r[3]==null?1:r[3]})}return null}function _(n,t){return Math.max(0,Math.min(t,n))}function O(n){let t=n.a==null?1:n.a,a=Math.round(_(n.r,255)),r=Math.round(_(n.g,255)),o=Math.round(_(n.b,255));return t>=1?"rgb("+a+", "+r+", "+o+")":"rgba("+a+", "+r+", "+o+", "+t+")"}function A(n){let t=a=>_(Math.round(a),255).toString(16).padStart(2,"0");return"#"+t(n.r)+t(n.g)+t(n.b)+(n.a==null||n.a>=1?"":t(n.a*255))}function j(n){let t=_(n.r,255)/255,a=_(n.g,255)/255,r=_(n.b,255)/255,o=Math.max(t,a,r),f=Math.min(t,a,r),m=0,h=0,u=(o+f)/2,i=o-f;return i!==0&&(h=u>.5?i/(2-o-f):i/(o+f),o===t?m=(a-r)/i+(a<r?6:0):o===a?m=(r-t)/i+2:m=(t-a)/i+4,m*=60),{h:m,s:h*100,l:u*100,a:n.a==null?1:n.a}}function D(n){let t=(n.h%360+360)%360/360,a=_(n.s,100)/100,r=_(n.l,100)/100,o=(u,i,p)=>(p<0&&(p+=1),p>1&&(p-=1),p<1/6?u+(i-u)*6*p:p<1/2?i:p<2/3?u+(i-u)*(2/3-p)*6:u),f,m,h;if(a===0)f=m=h=r;else{let u=r<.5?r*(1+a):r+a-r*a,i=2*r-u;f=o(i,u,t+1/3),m=o(i,u,t),h=o(i,u,t-1/3)}return{r:f*255,g:m*255,b:h*255,a:n.a==null?1:n.a}}import*as l from"https://esm.sh/three";var d=globalThis.__compifyGlobals&&globalThis.__compifyGlobals["react/jsx-runtime"];if(!d)throw new Error("compify: host global not set for react/jsx-runtime");var Ie=d.default!==void 0?d.default:d,Pe=d.Fragment!==void 0?d.Fragment:d.default&&d.default.Fragment,z=d.jsx!==void 0?d.jsx:d.default&&d.default.jsx,Me=d.jsxs!==void 0?d.jsxs:d.default&&d.default.jsxs,De=d.jsxDEV!==void 0?d.jsxDEV:d.default&&d.default.jsxDEV;var N=20,s={plate:"#3400FF",seam:"#00DCFF",columns:24,relief:20,shine:20,glow:20,speed:5,direction:"reverse",sizePercent:100};function S(n,t,a,r){let o=typeof n=="number"&&isFinite(n)?n:r;return Math.max(t,Math.min(a,o))}function b(n){let t=Math.round(S(n.columns,6,24,s.columns)),r=Math.PI*2/t/Math.sqrt(3),o=r*1.5,f=Math.max(4,Math.ceil(N/o));return{columns:t,rows:f,tileR:r,rowDz:o,plateR:r*.9,plateDepth:r*.55,span:f*o,relief:S(n.relief,0,20,s.relief)*r*.09,shine:4+S(n.shine,1,20,s.shine)*6,glow:S(n.glow,0,20,s.glow)*.09,speed:S(n.speed,0,20,s.speed)*.35,heading:n.direction==="reverse"?-1:1,zoom:100/S(n.sizePercent,40,200,s.sizePercent)}}var U=`
attribute float aRow;
attribute float aCol;

uniform float uTime;
uniform float uDz;
uniform float uSpan;
uniform float uRelief;

varying vec3 vNormal;
varying vec3 vPos;
varying float vDepth;
varying float vPop;

void main() {
    // The tile's own centre gives its outward direction; relief has to travel
    // along that, not along a shared axis, or one side of the duct swells while
    // the opposite side caves in.
    vec3 c = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec2 radial = normalize(c.xy);

    float wave = sin(aRow * 0.55 + aCol * 0.8 - uTime * 1.6) * 0.5 + 0.5;
    vPop = wave;

    vec3 p = (instanceMatrix * vec4(position, 1.0)).xyz;
    p.xy += radial * (wave - 0.5) * uRelief;

    // Depth wrapped by the length of the duct: the first rank reappears at the
    // back on the same frame and nothing drifts over a long session.
    float z = mod(aRow * uDz + uTime, uSpan);
    p.z -= z;

    vDepth = z / uSpan;
    // The instance matrix carries rotation and translation only, so its upper
    // 3x3 is orthonormal and safe to use on a normal directly.
    vNormal = normalize(mat3(instanceMatrix) * normal);
    vPos = p;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`,G=`
precision highp float;

uniform vec3 uPlate;
uniform vec3 uSeam;
uniform float uShine;
uniform float uGlow;

varying vec3 vNormal;
varying vec3 vPos;
varying float vDepth;
varying float vPop;

// The camera sits at the origin looking down -z and never turns, so world and
// view space coincide and this key stays put while the duct rushes past.
const vec3 KEY = vec3(0.40, 0.66, 0.64);

void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(-vPos);
    float lam = max(dot(n, KEY), 0.0);
    float spec = pow(max(dot(reflect(-KEY, n), v), 0.0), uShine);
    // Fixed exponent: an adjustable one goes from no edge at all to nothing but
    // edge inside two slider steps.
    float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);

    // Squared, so only the tiles near the crest of the wave light up and the
    // wave reads as a moving band rather than a general brightening.
    float crest = vPop * vPop;

    vec3 col = uPlate * (0.10 + lam * 0.95)
        + vec3(spec) * 0.55
        + uSeam * (fres * 0.45 + crest * uGlow);

    // Cut the tiles that would otherwise pass through the lens, and let the far
    // end sink into the dark rather than ending on a hard wall.
    float fog = 1.0 - smoothstep(0.30, 0.95, vDepth);
    float mouth = smoothstep(0.0, 0.07, vDepth);
    float a = fog * mouth;

    gl_FragColor = vec4(col * a, a);
}
`,P=class{constructor(t,a){c(this,"container");c(this,"cfg");c(this,"renderer");c(this,"scene",new l.Scene);c(this,"camera",new l.PerspectiveCamera(70,1,.05,N+6));c(this,"geometry",null);c(this,"material");c(this,"mesh",null);c(this,"uniforms");c(this,"width",1);c(this,"height",1);c(this,"time",0);c(this,"lastT",0);c(this,"frameId",0);c(this,"disposed",!1);this.container=t,this.cfg=a,this.renderer=new l.WebGLRenderer({antialias:!0,alpha:!0}),this.renderer.setClearColor(0,0),this.renderer.outputColorSpace=l.SRGBColorSpace,this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));let r=this.renderer.domElement;r.style.position="absolute",r.style.inset="0",r.style.width="100%",r.style.height="100%",t.appendChild(r);let o=b(a);this.uniforms={uTime:{value:0},uDz:{value:o.rowDz},uSpan:{value:o.span},uRelief:{value:o.relief},uPlate:{value:new l.Color(a.plate)},uSeam:{value:new l.Color(a.seam)},uShine:{value:o.shine},uGlow:{value:o.glow}},this.material=new l.ShaderMaterial({vertexShader:U,fragmentShader:G,uniforms:this.uniforms,transparent:!0,premultipliedAlpha:!0}),this.rebuild(),this.camera.position.set(0,0,0),this.camera.lookAt(0,0,-1)}rebuild(){let t=b(this.cfg);this.mesh&&(this.scene.remove(this.mesh),this.mesh.dispose(),this.mesh=null),this.geometry?.dispose();let a=new l.CylinderGeometry(t.plateR,t.plateR,t.plateDepth,6);a.rotateZ(-Math.PI/2),this.geometry=a;let r=t.columns*t.rows,o=new l.InstancedMesh(a,this.material,r),f=new Float32Array(r),m=new Float32Array(r),h=new l.Matrix4,u=0;for(let i=0;i<t.rows;i++){let p=i%2*.5;for(let g=0;g<t.columns;g++){let v=(g+p)/t.columns*Math.PI*2;h.makeRotationZ(v),h.setPosition(Math.cos(v),Math.sin(v),0),o.setMatrixAt(u,h),f[u]=i,m[u]=g,u++}}o.instanceMatrix.needsUpdate=!0,a.setAttribute("aRow",new l.InstancedBufferAttribute(f,1)),a.setAttribute("aCol",new l.InstancedBufferAttribute(m,1)),o.frustumCulled=!1,this.scene.add(o),this.mesh=o,this.uniforms.uDz.value=t.rowDz,this.uniforms.uSpan.value=t.span,this.uniforms.uRelief.value=t.relief}start(){this.lastT=performance.now();let t=()=>{this.frameId=requestAnimationFrame(t),this.step()};this.frameId=requestAnimationFrame(t)}setSize(t,a){this.disposed||(this.width=Math.max(1,t),this.height=Math.max(1,a),this.renderer.setSize(this.width,this.height,!1),this.updateCamera())}updateCamera(){let t=this.width/this.height,r=2*b(this.cfg).zoom,o=t<1?r/t:r;this.camera.aspect=t,this.camera.fov=2*Math.atan(o/2/.9)*(180/Math.PI),this.camera.updateProjectionMatrix()}updateConfig(t){if(this.disposed)return;let a=this.cfg;this.cfg=t;let r=b(t);this.uniforms.uRelief.value=r.relief,this.uniforms.uShine.value=r.shine,this.uniforms.uGlow.value=r.glow,this.uniforms.uPlate.value.set(t.plate),this.uniforms.uSeam.value.set(t.seam),t.columns!==a.columns&&this.rebuild(),t.sizePercent!==a.sizePercent&&this.updateCamera()}step(){if(this.disposed)return;let t=performance.now(),a=(t-this.lastT)/1e3;this.lastT=t,(!isFinite(a)||a<0)&&(a=0),a>.05&&(a=.05);let r=b(this.cfg);this.time+=a*r.speed*r.heading,this.uniforms.uTime.value=this.time,this.renderer.render(this.scene,this.camera)}dispose(){this.disposed=!0,cancelAnimationFrame(this.frameId),this.mesh&&(this.scene.remove(this.mesh),this.mesh.dispose()),this.geometry?.dispose(),this.material.dispose(),this.renderer.dispose();let t=this.renderer.domElement;t.parentNode===this.container&&this.container.removeChild(t)}};function T(n){let{plate:t=s.plate,seam:a=s.seam,columns:r=s.columns,relief:o=s.relief,shine:f=s.shine,glow:m=s.glow,speed:h=s.speed,direction:u=s.direction,sizePercent:i=s.sizePercent,style:p}=n,g=w(null),v=w(null),y=w(null);return y.current={plate:t,seam:a,columns:r,relief:o,shine:f,glow:m,speed:h,direction:u,sizePercent:i},C(()=>{let x=g.current;if(!x)return;let R;try{R=new P(x,y.current)}catch{return}v.current=R,R.setSize(x.clientWidth,x.clientHeight),R.start();let M=new ResizeObserver(()=>{R.setSize(x.clientWidth,x.clientHeight)});return M.observe(x),()=>{M.disconnect(),R.dispose(),v.current=null}},[]),C(()=>{v.current?.updateConfig(y.current)},[t,a,r,o,f,m,h,u,i]),z("div",{ref:g,role:"img","aria-label":"The inside of a honeycombed duct rushing past",style:{position:"relative",width:"100%",height:"100%",minWidth:120,minHeight:120,overflow:"hidden",...p}})}T.displayName="Hex Shaft";T.defaultProps={...s};H(T,{plate:{type:E.Color,title:"Tile",defaultValue:s.plate},seam:{type:E.Color,title:"Light",defaultValue:s.seam},columns:{type:E.Number,title:"Columns",min:6,max:24,step:1,defaultValue:s.columns,description:"6 is a few big plates, 24 is fine honeycomb."},relief:{type:E.Number,title:"Relief",min:0,max:20,step:1,defaultValue:s.relief,description:"0 is a smooth wall, 20 pumps the tiles well clear of it."},shine:{type:E.Number,title:"Shine",min:1,max:20,step:1,defaultValue:s.shine,description:"1 is a broad matte wash, 20 is a tight metallic glint."},glow:{type:E.Number,title:"Glow",min:0,max:20,step:1,defaultValue:s.glow,description:"How hot the tiles at the crest of the wave burn."},speed:{type:E.Number,title:"Speed",min:0,max:20,step:1,defaultValue:s.speed},direction:{type:E.Enum,title:"Travel",options:["forward","reverse"],optionTitles:["Forward","Reverse"],defaultValue:s.direction,hidden:({speed:n})=>!n},sizePercent:{type:E.Number,title:"Size",min:40,max:200,step:1,unit:"%",defaultValue:s.sizePercent}});export{T as default};
