var b=new Proxy({},{get:(t,n)=>String(n).toLowerCase()});function se(t,n){if(typeof t=="function")try{t.propertyControls=n}catch{}}function ie(t){let n=U(t);return{__rgba:n,toValue(){return n?Ve(n):String(t)},toString(){return this.toValue()},toHexString(){return n?Me(n):String(t)},toRgbString(){return this.toValue()}}}ie.toHsl=t=>{let n=U(t&&t.__rgba?t.__rgba:t)||{r:0,g:0,b:0,a:1};return Be(n)};ie.toRgb=t=>{let n=U(t&&t.__rgba?t.__rgba:t)||{r:0,g:0,b:0,a:1};return{r:n.r,g:n.g,b:n.b,a:n.a}};function U(t){if(t==null)return null;if(typeof t=="object")return"__rgba"in t?t.__rgba:"r"in t?{r:+t.r,g:+t.g,b:+t.b,a:t.a==null?1:+t.a}:"h"in t?ae(t):null;let n=String(t).trim(),a;if(a=n.match(/^#([0-9a-fA-F]{3,8})$/)){let o=a[1];return(o.length===3||o.length===4)&&(o=o.split("").map(s=>s+s).join("")),{r:parseInt(o.slice(0,2),16),g:parseInt(o.slice(2,4),16),b:parseInt(o.slice(4,6),16),a:o.length===8?parseInt(o.slice(6,8),16)/255:1}}if(a=n.match(/^rgba?\(([^)]+)\)$/i)){let o=a[1].split(/[,\/\s]+/).filter(Boolean).map(parseFloat);return{r:o[0],g:o[1],b:o[2],a:o[3]==null?1:o[3]}}if(a=n.match(/^hsla?\(([^)]+)\)$/i)){let o=a[1].split(/[,\/\s]+/).filter(Boolean).map(parseFloat);return ae({h:o[0],s:o[1],l:o[2],a:o[3]==null?1:o[3]})}return null}function S(t,n){return Math.max(0,Math.min(n,t))}function Ve(t){let n=t.a==null?1:t.a,a=Math.round(S(t.r,255)),o=Math.round(S(t.g,255)),s=Math.round(S(t.b,255));return n>=1?"rgb("+a+", "+o+", "+s+")":"rgba("+a+", "+o+", "+s+", "+n+")"}function Me(t){let n=a=>S(Math.round(a),255).toString(16).padStart(2,"0");return"#"+n(t.r)+n(t.g)+n(t.b)+(t.a==null||t.a>=1?"":n(t.a*255))}function Be(t){let n=S(t.r,255)/255,a=S(t.g,255)/255,o=S(t.b,255)/255,s=Math.max(n,a,o),h=Math.min(n,a,o),d=0,g=0,f=(s+h)/2,u=s-h;return u!==0&&(g=f>.5?u/(2-s-h):u/(s+h),s===n?d=(a-o)/u+(a<o?6:0):s===a?d=(o-n)/u+2:d=(n-a)/u+4,d*=60),{h:d,s:g*100,l:f*100,a:t.a==null?1:t.a}}function ae(t){let n=(t.h%360+360)%360/360,a=S(t.s,100)/100,o=S(t.l,100)/100,s=(f,u,x)=>(x<0&&(x+=1),x>1&&(x-=1),x<1/6?f+(u-f)*6*x:x<1/2?u:x<2/3?f+(u-f)*(2/3-x)*6:f),h,d,g;if(a===0)h=d=g=o;else{let f=o<.5?o*(1+a):o+a-o*a,u=2*o-f;h=s(u,f,n+1/3),d=s(u,f,n),g=s(u,f,n-1/3)}return{r:h*255,g:d*255,b:g*255,a:t.a==null?1:t.a}}var e=globalThis.__compifyGlobals&&globalThis.__compifyGlobals.react;if(!e)throw new Error("compify: host global not set for react");var $e=e.default!==void 0?e.default:e,Ke=e.Children!==void 0?e.Children:e.default&&e.default.Children,Je=e.Component!==void 0?e.Component:e.default&&e.default.Component,Qe=e.Fragment!==void 0?e.Fragment:e.default&&e.default.Fragment,Ze=e.Profiler!==void 0?e.Profiler:e.default&&e.default.Profiler,et=e.PureComponent!==void 0?e.PureComponent:e.default&&e.default.PureComponent,tt=e.StrictMode!==void 0?e.StrictMode:e.default&&e.default.StrictMode,nt=e.Suspense!==void 0?e.Suspense:e.default&&e.default.Suspense,ot=e.cloneElement!==void 0?e.cloneElement:e.default&&e.default.cloneElement,rt=e.createContext!==void 0?e.createContext:e.default&&e.default.createContext,at=e.createElement!==void 0?e.createElement:e.default&&e.default.createElement,st=e.createFactory!==void 0?e.createFactory:e.default&&e.default.createFactory,it=e.createRef!==void 0?e.createRef:e.default&&e.default.createRef,lt=e.forwardRef!==void 0?e.forwardRef:e.default&&e.default.forwardRef,ut=e.isValidElement!==void 0?e.isValidElement:e.default&&e.default.isValidElement,ft=e.lazy!==void 0?e.lazy:e.default&&e.default.lazy,ct=e.memo!==void 0?e.memo:e.default&&e.default.memo,dt=e.startTransition!==void 0?e.startTransition:e.default&&e.default.startTransition,mt=e.useCallback!==void 0?e.useCallback:e.default&&e.default.useCallback,pt=e.useContext!==void 0?e.useContext:e.default&&e.default.useContext,ht=e.useDebugValue!==void 0?e.useDebugValue:e.default&&e.default.useDebugValue,gt=e.useDeferredValue!==void 0?e.useDeferredValue:e.default&&e.default.useDeferredValue,le=e.useEffect!==void 0?e.useEffect:e.default&&e.default.useEffect,xt=e.useId!==void 0?e.useId:e.default&&e.default.useId,_t=e.useImperativeHandle!==void 0?e.useImperativeHandle:e.default&&e.default.useImperativeHandle,bt=e.useInsertionEffect!==void 0?e.useInsertionEffect:e.default&&e.default.useInsertionEffect,Et=e.useLayoutEffect!==void 0?e.useLayoutEffect:e.default&&e.default.useLayoutEffect,vt=e.useMemo!==void 0?e.useMemo:e.default&&e.default.useMemo,Rt=e.useReducer!==void 0?e.useReducer:e.default&&e.default.useReducer,F=e.useRef!==void 0?e.useRef:e.default&&e.default.useRef,St=e.useState!==void 0?e.useState:e.default&&e.default.useState,wt=e.useSyncExternalStore!==void 0?e.useSyncExternalStore:e.default&&e.default.useSyncExternalStore,Ct=e.useTransition!==void 0?e.useTransition:e.default&&e.default.useTransition,yt=e.version!==void 0?e.version:e.default&&e.default.version,Tt=e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED!==void 0?e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED:e.default&&e.default.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Ft=e.__SECRET_SERVER_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED!==void 0?e.__SECRET_SERVER_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED:e.default&&e.default.__SECRET_SERVER_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Lt=e.cache!==void 0?e.cache:e.default&&e.default.cache,Nt=e.use!==void 0?e.use:e.default&&e.default.use;var i=globalThis.__compifyGlobals&&globalThis.__compifyGlobals["react/jsx-runtime"];if(!i)throw new Error("compify: host global not set for react/jsx-runtime");var Pt=i.default!==void 0?i.default:i,At=i.Fragment!==void 0?i.Fragment:i.default&&i.default.Fragment,W=i.jsx!==void 0?i.jsx:i.default&&i.default.jsx,Dt=i.jsxs!==void 0?i.jsxs:i.default&&i.default.jsxs,Ot=i.jsxDEV!==void 0?i.jsxDEV:i.default&&i.default.jsxDEV;var He={grain:3,vignette:36},qe=1.15001227,je=1.7320508,Ue=1.5,We=.5,Ge=2,ke=5,ue=9;function G(t,n){if(!t)return n;let a=String(t).trim();if(a.charAt(0)==="#"){let s=a.slice(1);if((s.length===3||s.length===4)&&(s=s[0]+s[0]+s[1]+s[1]+s[2]+s[2]),s.length>=6){let h=parseInt(s.slice(0,2),16),d=parseInt(s.slice(2,4),16),g=parseInt(s.slice(4,6),16);if(!isNaN(h)&&!isNaN(d)&&!isNaN(g))return[h/255,d/255,g/255]}return n}let o=a.match(/[\d.]+/g);return o&&o.length>=3?[Math.min(255,parseFloat(o[0]))/255,Math.min(255,parseFloat(o[1]))/255,Math.min(255,parseFloat(o[2]))/255]:n}function E(t,n,a){return t<n?n:t>a?a:t}function w(t,n){return typeof t=="number"&&isFinite(t)?t:n}var ze=`
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`,Ye=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform float uDpr;

uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform float uScale;       // world units across the frame HEIGHT (apothem = 1)
uniform float uApothem;     // cell apothem after the gap is taken out
uniform float uPerp;        // hex support along perp(E), for the sweep caps
uniform float uLift;        // pointer lift, world units
uniform float uSwell;       // idle lift, world units
uniform float uReach;       // pointer falloff radius, world units
uniform vec2  uPointer;     // world units
uniform float uPointerAmt;
uniform float uGrain;
uniform float uVignette;

// Oblique extrusion direction. Unit to within 2e-5, so it is used as-is.
const vec2  E    = vec2(0.4200, 0.9075);
const vec2  PP   = vec2(-0.9075, 0.4200);   // perp(E)
const vec2  L    = vec2(-0.5548, 0.8320);   // light, upper left
const vec2  N0   = vec2(1.0, 0.0);
const vec2  N1   = vec2(0.5, 0.8660254);
const vec2  N2   = vec2(-0.5, 0.8660254);
const float ROW  = 1.7320508;               // row pitch = sqrt(3) apothems
const float CIRC = 1.1547005;               // circumradius at apothem 1

float h21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// One CSS pixel of grain, so the film stays the same physical size at DPR 2
// instead of halving. Stepped at 24Hz: per-frame noise reads as sparkle.
float filmGrain(vec2 fragCoord, float t, float dpr) {
    vec2 cell = floor(fragCoord / max(dpr, 1.0));
    return h21(cell + floor(t * 24.0) * 13.7) - 0.5;
}

// Radial darkening, aspect-corrected so it stays circular on a wide hero.
float vignetteMask(vec2 uv, float aspect, float amount) {
    vec2 v = uv - 0.5;
    v.x *= aspect;
    return 1.0 - amount * smoothstep(0.34, 1.0, length(v));
}

// Hexagon as the intersection of three slabs. Exact inside, and outside it
// under-reads only near a vertex, which is below one pixel of feather here.
float hexD(vec2 q, float a) {
    return max(max(abs(dot(q, N0)), abs(dot(q, N1))), abs(dot(q, N2))) - a;
}

// Silhouette of the prism: the hexagon's own six half-planes with their
// supports pushed out along +hE, plus the two caps perpendicular to E.
float hullD(vec2 q, float a, float h) {
    vec3 d = vec3(dot(N0, E), dot(N1, E), dot(N2, E)) * h;
    vec3 s = vec3(dot(q, N0), dot(q, N1), dot(q, N2));
    float m = abs(dot(q, PP)) - uPerp * a;
    m = max(m, max( s.x - a - max(0.0,  d.x), -s.x - a - max(0.0, -d.x)));
    m = max(m, max( s.y - a - max(0.0,  d.y), -s.y - a - max(0.0, -d.y)));
    m = max(m, max( s.z - a - max(0.0,  d.z), -s.z - a - max(0.0, -d.z)));
    return m;
}

float cellHeight(vec2 c) {
    float d = length(c - uPointer) / max(uReach, 0.001);
    float bump = exp(-d * d * 2.2);
    // Per-cell phase, or the swell reads as one flat sheet rocking.
    float w = 0.5 + 0.5 * sin(dot(c, vec2(0.21, 0.13)) + h21(c * 0.37) * 6.283 - uTime * 0.8);
    return uLift * uPointerAmt * bump + uSwell * w;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2(uv.x * aspect, uv.y) * uScale;

    float unitPx = uRes.y / uScale;          // device px per apothem
    float aa = 1.4 / unitPx;
    float a = uApothem;
    float ceiling = max(uLift + uSwell, 0.001);

    vec3 col = uBg;

    float j0 = floor(p.y / ROW + 0.5);

    // Back to front: a larger row index is further up the frame and therefore
    // further away, and within a row the extrusion leans +x so the right-hand
    // neighbour is in front.
    for (int dj = 1; dj >= -3; dj--) {
        float fj = j0 + float(dj);
        float par = mod(fj, 2.0);
        float cy = fj * ROW;
        float i0 = floor((p.x - par) * 0.5 + 0.5);

        for (int di = -1; di <= 1; di++) {
            vec2 c = vec2((i0 + float(di)) * 2.0 + par, cy);
            vec2 q = p - c;
            float h = cellHeight(c);

            float bound = CIRC + h + 0.42;   // + the shadow band
            if (dot(q, q) > bound * bound) continue;

            // Contact shadow, sampled up-right so it falls down-left onto the
            // cells already drawn. Applied before this cell paints itself.
            if (h > 0.02) {
                float ds = hullD(q + vec2(0.11, 0.17), a, h);
                float sh = 1.0 - smoothstep(-0.02, 0.36, ds);
                col *= 1.0 - 0.55 * sh * clamp(h * 1.7, 0.0, 1.0);
            }

            float dh = hullD(q, a, h);
            float cov = 1.0 - smoothstep(-aa, aa, dh);
            if (cov <= 0.0) continue;

            float dt = hexD(q - h * E, a);
            float top = 1.0 - smoothstep(-aa, aa, dt);
            float wall = clamp(cov - top, 0.0, 1.0);
            float hn = clamp(h / ceiling, 0.0, 1.0);

            if (wall > 0.0) {
                // Which of the six edges this wall belongs to is the largest
                // signed slab coordinate \u2014 the facing edge, by definition.
                vec3 s = vec3(dot(q, N0), dot(q, N1), dot(q, N2));
                vec2 wn = N0 * sign(s.x);
                float best = abs(s.x);
                if (abs(s.y) > best) { best = abs(s.y); wn = N1 * sign(s.y); }
                if (abs(s.z) > best) { best = abs(s.z); wn = N2 * sign(s.z); }

                float lam = clamp(dot(wn, L) * 0.5 + 0.5, 0.0, 1.0);
                // 0 at the lip, 1 down at the floor.
                float depth = clamp(dot(q - h * E, -E) / max(h, 0.001), 0.0, 1.0);
                vec3 wallCol = mix(uBg, uBase, 0.12 + 0.74 * lam) * (1.0 - 0.62 * depth);
                col = mix(col, wallCol, wall);
            }

            if (top > 0.0) {
                vec2 qt = (q - h * E) / max(a, 0.001);
                vec3 rest = mix(uBg, uBase, 0.20);
                // Narrow crossover: a linear ramp from a blue to a yellow spends
                // most of its length in the grey between them, and the ring of
                // half-risen cells then reads as dirt rather than as a gradient.
                vec3 risen = mix(uBase * 1.25, uAccent, smoothstep(0.58, 1.0, hn));
                vec3 topCol = mix(rest, risen, smoothstep(0.0, 0.45, hn));
                topCol *= 0.86 + 0.16 * dot(qt, L);

                // The lip. Drawn at every height, so the comb still reads as a
                // comb with nothing lifted.
                float rim = smoothstep(-aa * 3.5, -aa * 1.0, dt) *
                            (1.0 - smoothstep(-aa * 1.0, aa, dt));
                topCol += rim * mix(uBase, uAccent, hn) * (0.30 + 0.75 * hn);

                col = mix(col, topCol, top);
            }
        }
    }

    col *= vignetteMask(uv, aspect, uVignette);
    col += (h21(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);
    col += filmGrain(gl_FragCoord.xy, uTime, uDpr) * uGrain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;function fe(t,n,a){let o=t.createShader(n);return o?(t.shaderSource(o,a),t.compileShader(o),t.getShaderParameter(o,t.COMPILE_STATUS)?o:(console.error("HexComb shader:",t.getShaderInfoLog(o)),t.deleteShader(o),null)):null}function ce(t){let{background:n="#080A10",baseColor:a="#FFCA00",accentColor:o="#FFFFFF",density:s=24,gap:h=10,lift:d=100,reach:g=9,swell:f=100,speed:u=100,finish:x,style:de}=t,k=F(null),z=F(null),Y=F(t);Y.current=t;let L=F({x:.5,y:.5,rawX:.5,rawY:.5,on:0,onTarget:0});return le(()=>{let m=k.current,C=z.current;if(!m||!C)return;let r=C.getContext("webgl",{antialias:!1,alpha:!1,depth:!1,preserveDrawingBuffer:!1});if(!r){console.error("HexComb: WebGL unavailable");return}let A=fe(r,r.VERTEX_SHADER,ze),D=fe(r,r.FRAGMENT_SHADER,Ye);if(!A||!D)return;let _=r.createProgram();if(!_)return;if(r.attachShader(_,A),r.attachShader(_,D),r.linkProgram(_),!r.getProgramParameter(_,r.LINK_STATUS)){console.error("HexComb link:",r.getProgramInfoLog(_));return}r.useProgram(_);let X=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,X),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),r.STATIC_DRAW);let $=r.getAttribLocation(_,"aPos");r.enableVertexAttribArray($),r.vertexAttribPointer($,2,r.FLOAT,!1,0,0);let l=v=>r.getUniformLocation(_,v),me=l("uRes"),pe=l("uTime"),he=l("uDpr"),ge=l("uBg"),xe=l("uBase"),_e=l("uAccent"),be=l("uScale"),Ee=l("uApothem"),ve=l("uPerp"),Re=l("uLift"),Se=l("uSwell"),we=l("uReach"),Ce=l("uPointer"),ye=l("uPointerAmt"),Te=l("uGrain"),Fe=l("uVignette"),K=m.offsetWidth||1,J=m.offsetHeight||1,Q=new ResizeObserver(()=>{K=m.offsetWidth||1,J=m.offsetHeight||1});Q.observe(m);let Le=typeof window<"u"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,O=0,Z=performance.now(),V=0,ee=v=>{O=requestAnimationFrame(ee);let R=Math.min(.05,(v-Z)/1e3);Z=v;let p=Y.current,te={...He,...p.finish??{}},Ie=Le?0:E(w(p.speed,50),0,100)/50;V=(V+R*Ie)%3600;let c=L.current,M=Oe=>1-Math.exp(-Oe*R);c.on+=(c.onTarget-c.on)*M(ke);let Pe=c.onTarget>0?c.rawX:.5,Ae=c.onTarget>0?c.rawY:.5;c.x+=(Pe-c.x)*M(ue),c.y+=(Ae-c.y)*M(ue);let B=Math.min(window.devicePixelRatio||1,Ge),y=Math.max(1,Math.round(K*B)),T=Math.max(1,Math.round(J*B));(C.width!==y||C.height!==T)&&(C.width=y,C.height=T,r.viewport(0,0,y,T));let De=y/T,P=E(w(p.density,11),3,24)*je,ne=Math.min(1,c.on),oe=E(w(p.lift,70),0,100)/100*Ue,re=oe*ne;r.uniform2f(me,y,T),r.uniform1f(pe,V),r.uniform1f(he,B);let H=G(p.background,[.031,.039,.063]),q=G(p.baseColor,[.357,.486,1]),j=G(p.accentColor,[1,.808,.361]);r.uniform3f(ge,H[0],H[1],H[2]),r.uniform3f(xe,q[0],q[1],q[2]),r.uniform3f(_e,j[0],j[1],j[2]),r.uniform1f(be,P),r.uniform1f(Ee,1-E(w(p.gap,10),0,40)/100),r.uniform1f(ve,qe),r.uniform1f(Re,oe),r.uniform1f(Se,E(w(p.swell,14),0,100)/100*We),r.uniform1f(we,E(w(p.reach,26),5,100)/100*P),r.uniform2f(Ce,c.x*De*P-.42*re*.55,(1-c.y)*P-.9075*re*.55),r.uniform1f(ye,ne),r.uniform1f(Te,E(w(te.grain,3),0,100)/100*.09),r.uniform1f(Fe,E(w(te.vignette,36),0,100)/100),r.drawArrays(r.TRIANGLES,0,3)},Ne=v=>{let R=m.getBoundingClientRect();if(R.width<=0||R.height<=0)return;let p=L.current;p.rawX=E((v.clientX-R.left)/R.width,0,1),p.rawY=E((v.clientY-R.top)/R.height,0,1)},N=v=>{Ne(v),L.current.onTarget=1},I=()=>{L.current.onTarget=0};return m.addEventListener("pointermove",N),m.addEventListener("pointerenter",N),m.addEventListener("pointerleave",I),window.addEventListener("blur",I),O=requestAnimationFrame(ee),()=>{cancelAnimationFrame(O),Q.disconnect(),m.removeEventListener("pointermove",N),m.removeEventListener("pointerenter",N),m.removeEventListener("pointerleave",I),window.removeEventListener("blur",I),r.deleteBuffer(X),r.deleteProgram(_),r.deleteShader(A),r.deleteShader(D)}},[]),W("div",{ref:k,style:{minWidth:1200,minHeight:800,width:"100%",height:"100%",position:"relative",overflow:"hidden",isolation:"isolate",background:n,touchAction:"none",...de},children:W("canvas",{ref:z,style:{position:"absolute",inset:0,width:"100%",height:"100%",display:"block"}})})}se(ce,{background:{type:b.Color,title:"Background",defaultValue:"#080A10"},baseColor:{type:b.Color,title:"Base Color",defaultValue:"#FFCA00"},accentColor:{type:b.Color,title:"Accent Color",defaultValue:"#FFFFFF"},density:{type:b.Number,title:"Density",defaultValue:24,min:3,max:24,step:1},gap:{type:b.Number,title:"Gap",defaultValue:10,min:0,max:40,step:1,unit:"%"},lift:{type:b.Number,title:"Lift",defaultValue:100,min:0,max:100,step:1,unit:"%"},reach:{type:b.Number,title:"Reach",defaultValue:9,min:5,max:100,step:1,unit:"%"},swell:{type:b.Number,title:"Swell",defaultValue:100,min:0,max:100,step:1,unit:"%"},speed:{type:b.Number,title:"Speed",defaultValue:100,min:0,max:100,step:1}});export{ce as default};
