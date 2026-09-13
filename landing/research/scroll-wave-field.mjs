var t=globalThis.__compifyGlobals&&globalThis.__compifyGlobals.react;if(!t)throw new Error("compify: host global not set for react");var Mt=t.default!==void 0?t.default:t,It=t.Children!==void 0?t.Children:t.default&&t.default.Children,Lt=t.Component!==void 0?t.Component:t.default&&t.default.Component,Tt=t.Fragment!==void 0?t.Fragment:t.default&&t.default.Fragment,Vt=t.Profiler!==void 0?t.Profiler:t.default&&t.default.Profiler,Dt=t.PureComponent!==void 0?t.PureComponent:t.default&&t.default.PureComponent,Ft=t.StrictMode!==void 0?t.StrictMode:t.default&&t.default.StrictMode,Pt=t.Suspense!==void 0?t.Suspense:t.default&&t.default.Suspense,Ot=t.cloneElement!==void 0?t.cloneElement:t.default&&t.default.cloneElement,kt=t.createContext!==void 0?t.createContext:t.default&&t.default.createContext,zt=t.createElement!==void 0?t.createElement:t.default&&t.default.createElement,Gt=t.createFactory!==void 0?t.createFactory:t.default&&t.default.createFactory,Ht=t.createRef!==void 0?t.createRef:t.default&&t.default.createRef,Nt=t.forwardRef!==void 0?t.forwardRef:t.default&&t.default.forwardRef,Ut=t.isValidElement!==void 0?t.isValidElement:t.default&&t.default.isValidElement,Bt=t.lazy!==void 0?t.lazy:t.default&&t.default.lazy,Wt=t.memo!==void 0?t.memo:t.default&&t.default.memo,jt=t.startTransition!==void 0?t.startTransition:t.default&&t.default.startTransition,Yt=t.useCallback!==void 0?t.useCallback:t.default&&t.default.useCallback,qt=t.useContext!==void 0?t.useContext:t.default&&t.default.useContext,Zt=t.useDebugValue!==void 0?t.useDebugValue:t.default&&t.default.useDebugValue,Xt=t.useDeferredValue!==void 0?t.useDeferredValue:t.default&&t.default.useDeferredValue,We=t.useEffect!==void 0?t.useEffect:t.default&&t.default.useEffect,Jt=t.useId!==void 0?t.useId:t.default&&t.default.useId,$t=t.useImperativeHandle!==void 0?t.useImperativeHandle:t.default&&t.default.useImperativeHandle,Kt=t.useInsertionEffect!==void 0?t.useInsertionEffect:t.default&&t.default.useInsertionEffect,Qt=t.useLayoutEffect!==void 0?t.useLayoutEffect:t.default&&t.default.useLayoutEffect,en=t.useMemo!==void 0?t.useMemo:t.default&&t.default.useMemo,tn=t.useReducer!==void 0?t.useReducer:t.default&&t.default.useReducer,V=t.useRef!==void 0?t.useRef:t.default&&t.default.useRef,nn=t.useState!==void 0?t.useState:t.default&&t.default.useState,on=t.useSyncExternalStore!==void 0?t.useSyncExternalStore:t.default&&t.default.useSyncExternalStore,an=t.useTransition!==void 0?t.useTransition:t.default&&t.default.useTransition,rn=t.version!==void 0?t.version:t.default&&t.default.version,un=t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED!==void 0?t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED:t.default&&t.default.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,sn=t.__SECRET_SERVER_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED!==void 0?t.__SECRET_SERVER_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED:t.default&&t.default.__SECRET_SERVER_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,ln=t.cache!==void 0?t.cache:t.default&&t.default.cache,dn=t.use!==void 0?t.use:t.default&&t.default.use;var h=new Proxy({},{get:(n,a)=>String(a).toLowerCase()});function Ye(n,a){if(typeof n=="function")try{n.propertyControls=a}catch{}}function qe(n){let a=le(n);return{__rgba:a,toValue(){return a?it(a):String(n)},toString(){return this.toValue()},toHexString(){return a?ut(a):String(n)},toRgbString(){return this.toValue()}}}qe.toHsl=n=>{let a=le(n&&n.__rgba?n.__rgba:n)||{r:0,g:0,b:0,a:1};return st(a)};qe.toRgb=n=>{let a=le(n&&n.__rgba?n.__rgba:n)||{r:0,g:0,b:0,a:1};return{r:a.r,g:a.g,b:a.b,a:a.a}};function le(n){if(n==null)return null;if(typeof n=="object")return"__rgba"in n?n.__rgba:"r"in n?{r:+n.r,g:+n.g,b:+n.b,a:n.a==null?1:+n.a}:"h"in n?je(n):null;let a=String(n).trim(),i;if(i=a.match(/^#([0-9a-fA-F]{3,8})$/)){let r=i[1];return(r.length===3||r.length===4)&&(r=r.split("").map(u=>u+u).join("")),{r:parseInt(r.slice(0,2),16),g:parseInt(r.slice(2,4),16),b:parseInt(r.slice(4,6),16),a:r.length===8?parseInt(r.slice(6,8),16)/255:1}}if(i=a.match(/^rgba?\(([^)]+)\)$/i)){let r=i[1].split(/[,\/\s]+/).filter(Boolean).map(parseFloat);return{r:r[0],g:r[1],b:r[2],a:r[3]==null?1:r[3]}}if(i=a.match(/^hsla?\(([^)]+)\)$/i)){let r=i[1].split(/[,\/\s]+/).filter(Boolean).map(parseFloat);return je({h:r[0],s:r[1],l:r[2],a:r[3]==null?1:r[3]})}return null}function M(n,a){return Math.max(0,Math.min(a,n))}function it(n){let a=n.a==null?1:n.a,i=Math.round(M(n.r,255)),r=Math.round(M(n.g,255)),u=Math.round(M(n.b,255));return a>=1?"rgb("+i+", "+r+", "+u+")":"rgba("+i+", "+r+", "+u+", "+a+")"}function ut(n){let a=i=>M(Math.round(i),255).toString(16).padStart(2,"0");return"#"+a(n.r)+a(n.g)+a(n.b)+(n.a==null||n.a>=1?"":a(n.a*255))}function st(n){let a=M(n.r,255)/255,i=M(n.g,255)/255,r=M(n.b,255)/255,u=Math.max(a,i,r),y=Math.min(a,i,r),S=0,_=0,g=(u+y)/2,x=u-y;return x!==0&&(_=g>.5?x/(2-u-y):x/(u+y),u===a?S=(i-r)/x+(i<r?6:0):u===i?S=(r-a)/x+2:S=(a-i)/x+4,S*=60),{h:S,s:_*100,l:g*100,a:n.a==null?1:n.a}}function je(n){let a=(n.h%360+360)%360/360,i=M(n.s,100)/100,r=M(n.l,100)/100,u=(g,x,C)=>(C<0&&(C+=1),C>1&&(C-=1),C<1/6?g+(x-g)*6*C:C<1/2?x:C<2/3?g+(x-g)*(2/3-C)*6:g),y,S,_;if(i===0)y=S=_=r;else{let g=r<.5?r*(1+i):r+i-r*i,x=2*r-g;y=u(x,g,a+1/3),S=u(x,g,a),_=u(x,g,a-1/3)}return{r:y*255,g:S*255,b:_*255,a:n.a==null?1:n.a}}var e=globalThis.__compifyGlobals&&globalThis.__compifyGlobals["framer-motion"];if(!e)throw new Error("compify: host global not set for framer-motion");var pn=e.default!==void 0?e.default:e,mn=e.AcceleratedAnimation!==void 0?e.AcceleratedAnimation:e.default&&e.default.AcceleratedAnimation,hn=e.AnimatePresence!==void 0?e.AnimatePresence:e.default&&e.default.AnimatePresence,xn=e.AnimateSharedLayout!==void 0?e.AnimateSharedLayout:e.default&&e.default.AnimateSharedLayout,gn=e.DeprecatedLayoutGroupContext!==void 0?e.DeprecatedLayoutGroupContext:e.default&&e.default.DeprecatedLayoutGroupContext,vn=e.DragControls!==void 0?e.DragControls:e.default&&e.default.DragControls,bn=e.FlatTree!==void 0?e.FlatTree:e.default&&e.default.FlatTree,yn=e.LayoutGroup!==void 0?e.LayoutGroup:e.default&&e.default.LayoutGroup,Sn=e.LayoutGroupContext!==void 0?e.LayoutGroupContext:e.default&&e.default.LayoutGroupContext,Cn=e.LazyMotion!==void 0?e.LazyMotion:e.default&&e.default.LazyMotion,wn=e.MotionConfig!==void 0?e.MotionConfig:e.default&&e.default.MotionConfig,En=e.MotionConfigContext!==void 0?e.MotionConfigContext:e.default&&e.default.MotionConfigContext,_n=e.MotionContext!==void 0?e.MotionContext:e.default&&e.default.MotionContext,Rn=e.MotionGlobalConfig!==void 0?e.MotionGlobalConfig:e.default&&e.default.MotionGlobalConfig,An=e.MotionValue!==void 0?e.MotionValue:e.default&&e.default.MotionValue,Mn=e.PresenceContext!==void 0?e.PresenceContext:e.default&&e.default.PresenceContext,In=e.Reorder!==void 0?e.Reorder:e.default&&e.default.Reorder,Ln=e.SwitchLayoutGroupContext!==void 0?e.SwitchLayoutGroupContext:e.default&&e.default.SwitchLayoutGroupContext,Tn=e.VisualElement!==void 0?e.VisualElement:e.default&&e.default.VisualElement,Vn=e.addPointerEvent!==void 0?e.addPointerEvent:e.default&&e.default.addPointerEvent,Dn=e.addPointerInfo!==void 0?e.addPointerInfo:e.default&&e.default.addPointerInfo,Fn=e.addScaleCorrector!==void 0?e.addScaleCorrector:e.default&&e.default.addScaleCorrector,de=e.animate!==void 0?e.animate:e.default&&e.default.animate,Pn=e.animateMini!==void 0?e.animateMini:e.default&&e.default.animateMini,On=e.animateValue!==void 0?e.animateValue:e.default&&e.default.animateValue,kn=e.animateVisualElement!==void 0?e.animateVisualElement:e.default&&e.default.animateVisualElement,zn=e.animationControls!==void 0?e.animationControls:e.default&&e.default.animationControls,Gn=e.animations!==void 0?e.animations:e.default&&e.default.animations,Hn=e.anticipate!==void 0?e.anticipate:e.default&&e.default.anticipate,Nn=e.backIn!==void 0?e.backIn:e.default&&e.default.backIn,Un=e.backInOut!==void 0?e.backInOut:e.default&&e.default.backInOut,Bn=e.backOut!==void 0?e.backOut:e.default&&e.default.backOut,Wn=e.buildTransform!==void 0?e.buildTransform:e.default&&e.default.buildTransform,jn=e.calcLength!==void 0?e.calcLength:e.default&&e.default.calcLength,Yn=e.cancelFrame!==void 0?e.cancelFrame:e.default&&e.default.cancelFrame,qn=e.cancelSync!==void 0?e.cancelSync:e.default&&e.default.cancelSync,Zn=e.circIn!==void 0?e.circIn:e.default&&e.default.circIn,Xn=e.circInOut!==void 0?e.circInOut:e.default&&e.default.circInOut,Jn=e.circOut!==void 0?e.circOut:e.default&&e.default.circOut,$n=e.clamp!==void 0?e.clamp:e.default&&e.default.clamp,Kn=e.color!==void 0?e.color:e.default&&e.default.color,Qn=e.complex!==void 0?e.complex:e.default&&e.default.complex,eo=e.createBox!==void 0?e.createBox:e.default&&e.default.createBox,to=e.createRendererMotionComponent!==void 0?e.createRendererMotionComponent:e.default&&e.default.createRendererMotionComponent,no=e.createScopedAnimate!==void 0?e.createScopedAnimate:e.default&&e.default.createScopedAnimate,oo=e.cubicBezier!==void 0?e.cubicBezier:e.default&&e.default.cubicBezier,ao=e.delay!==void 0?e.delay:e.default&&e.default.delay,ro=e.disableInstantTransitions!==void 0?e.disableInstantTransitions:e.default&&e.default.disableInstantTransitions,io=e.distance!==void 0?e.distance:e.default&&e.default.distance,uo=e.distance2D!==void 0?e.distance2D:e.default&&e.default.distance2D,so=e.domAnimation!==void 0?e.domAnimation:e.default&&e.default.domAnimation,lo=e.domMax!==void 0?e.domMax:e.default&&e.default.domMax,fo=e.domMin!==void 0?e.domMin:e.default&&e.default.domMin,co=e.easeIn!==void 0?e.easeIn:e.default&&e.default.easeIn,po=e.easeInOut!==void 0?e.easeInOut:e.default&&e.default.easeInOut,mo=e.easeOut!==void 0?e.easeOut:e.default&&e.default.easeOut,ho=e.filterProps!==void 0?e.filterProps:e.default&&e.default.filterProps,xo=e.findSpring!==void 0?e.findSpring:e.default&&e.default.findSpring,go=e.frame!==void 0?e.frame:e.default&&e.default.frame,vo=e.frameData!==void 0?e.frameData:e.default&&e.default.frameData,bo=e.frameSteps!==void 0?e.frameSteps:e.default&&e.default.frameSteps,yo=e.inView!==void 0?e.inView:e.default&&e.default.inView,So=e.inertia!==void 0?e.inertia:e.default&&e.default.inertia,Co=e.interpolate!==void 0?e.interpolate:e.default&&e.default.interpolate,wo=e.invariant!==void 0?e.invariant:e.default&&e.default.invariant,Eo=e.isBrowser!==void 0?e.isBrowser:e.default&&e.default.isBrowser,_o=e.isDragActive!==void 0?e.isDragActive:e.default&&e.default.isDragActive,Ro=e.isMotionComponent!==void 0?e.isMotionComponent:e.default&&e.default.isMotionComponent,Ao=e.isMotionValue!==void 0?e.isMotionValue:e.default&&e.default.isMotionValue,Mo=e.isValidMotionProp!==void 0?e.isValidMotionProp:e.default&&e.default.isValidMotionProp,Io=e.keyframes!==void 0?e.keyframes:e.default&&e.default.keyframes,Lo=e.m!==void 0?e.m:e.default&&e.default.m,To=e.makeUseVisualState!==void 0?e.makeUseVisualState:e.default&&e.default.makeUseVisualState,Vo=e.mirrorEasing!==void 0?e.mirrorEasing:e.default&&e.default.mirrorEasing,Do=e.mix!==void 0?e.mix:e.default&&e.default.mix,Fo=e.motion!==void 0?e.motion:e.default&&e.default.motion,fe=e.motionValue!==void 0?e.motionValue:e.default&&e.default.motionValue,Po=e.noop!==void 0?e.noop:e.default&&e.default.noop,Oo=e.optimizedAppearDataAttribute!==void 0?e.optimizedAppearDataAttribute:e.default&&e.default.optimizedAppearDataAttribute,ko=e.pipe!==void 0?e.pipe:e.default&&e.default.pipe,zo=e.progress!==void 0?e.progress:e.default&&e.default.progress,Go=e.px!==void 0?e.px:e.default&&e.default.px,Ho=e.resolveMotionValue!==void 0?e.resolveMotionValue:e.default&&e.default.resolveMotionValue,No=e.reverseEasing!==void 0?e.reverseEasing:e.default&&e.default.reverseEasing,Uo=e.scroll!==void 0?e.scroll:e.default&&e.default.scroll,Bo=e.scrollInfo!==void 0?e.scrollInfo:e.default&&e.default.scrollInfo,Wo=e.spring!==void 0?e.spring:e.default&&e.default.spring,jo=e.stagger!==void 0?e.stagger:e.default&&e.default.stagger,Yo=e.startOptimizedAppearAnimation!==void 0?e.startOptimizedAppearAnimation:e.default&&e.default.startOptimizedAppearAnimation,qo=e.steps!==void 0?e.steps:e.default&&e.default.steps,Zo=e.sync!==void 0?e.sync:e.default&&e.default.sync,Xo=e.time!==void 0?e.time:e.default&&e.default.time,Jo=e.transform!==void 0?e.transform:e.default&&e.default.transform,$o=e.unwrapMotionComponent!==void 0?e.unwrapMotionComponent:e.default&&e.default.unwrapMotionComponent,Ko=e.useAnimate!==void 0?e.useAnimate:e.default&&e.default.useAnimate,Qo=e.useAnimateMini!==void 0?e.useAnimateMini:e.default&&e.default.useAnimateMini,ea=e.useAnimation!==void 0?e.useAnimation:e.default&&e.default.useAnimation,ta=e.useAnimationControls!==void 0?e.useAnimationControls:e.default&&e.default.useAnimationControls,na=e.useAnimationFrame!==void 0?e.useAnimationFrame:e.default&&e.default.useAnimationFrame,oa=e.useCycle!==void 0?e.useCycle:e.default&&e.default.useCycle,aa=e.useDeprecatedAnimatedState!==void 0?e.useDeprecatedAnimatedState:e.default&&e.default.useDeprecatedAnimatedState,ra=e.useDeprecatedInvertedScale!==void 0?e.useDeprecatedInvertedScale:e.default&&e.default.useDeprecatedInvertedScale,ia=e.useDomEvent!==void 0?e.useDomEvent:e.default&&e.default.useDomEvent,ua=e.useDragControls!==void 0?e.useDragControls:e.default&&e.default.useDragControls,sa=e.useElementScroll!==void 0?e.useElementScroll:e.default&&e.default.useElementScroll,la=e.useForceUpdate!==void 0?e.useForceUpdate:e.default&&e.default.useForceUpdate,da=e.useInView!==void 0?e.useInView:e.default&&e.default.useInView,fa=e.useInstantLayoutTransition!==void 0?e.useInstantLayoutTransition:e.default&&e.default.useInstantLayoutTransition,ca=e.useInstantTransition!==void 0?e.useInstantTransition:e.default&&e.default.useInstantTransition,pa=e.useIsPresent!==void 0?e.useIsPresent:e.default&&e.default.useIsPresent,ma=e.useIsomorphicLayoutEffect!==void 0?e.useIsomorphicLayoutEffect:e.default&&e.default.useIsomorphicLayoutEffect,ha=e.useMotionTemplate!==void 0?e.useMotionTemplate:e.default&&e.default.useMotionTemplate,xa=e.useMotionValue!==void 0?e.useMotionValue:e.default&&e.default.useMotionValue,ga=e.useMotionValueEvent!==void 0?e.useMotionValueEvent:e.default&&e.default.useMotionValueEvent,va=e.usePresence!==void 0?e.usePresence:e.default&&e.default.usePresence,ba=e.useReducedMotion!==void 0?e.useReducedMotion:e.default&&e.default.useReducedMotion,ya=e.useReducedMotionConfig!==void 0?e.useReducedMotionConfig:e.default&&e.default.useReducedMotionConfig,Sa=e.useResetProjection!==void 0?e.useResetProjection:e.default&&e.default.useResetProjection,Ca=e.useScroll!==void 0?e.useScroll:e.default&&e.default.useScroll,wa=e.useSpring!==void 0?e.useSpring:e.default&&e.default.useSpring,Ea=e.useTime!==void 0?e.useTime:e.default&&e.default.useTime,_a=e.useTransform!==void 0?e.useTransform:e.default&&e.default.useTransform,Ra=e.useUnmountEffect!==void 0?e.useUnmountEffect:e.default&&e.default.useUnmountEffect,Aa=e.useVelocity!==void 0?e.useVelocity:e.default&&e.default.useVelocity,Ma=e.useViewportScroll!==void 0?e.useViewportScroll:e.default&&e.default.useViewportScroll,Ia=e.useWillChange!==void 0?e.useWillChange:e.default&&e.default.useWillChange,La=e.visualElementStore!==void 0?e.visualElementStore:e.default&&e.default.visualElementStore,Ta=e.wrap!==void 0?e.wrap:e.default&&e.default.wrap;var m=globalThis.__compifyGlobals&&globalThis.__compifyGlobals["react/jsx-runtime"];if(!m)throw new Error("compify: host global not set for react/jsx-runtime");var Da=m.default!==void 0?m.default:m,Fa=m.Fragment!==void 0?m.Fragment:m.default&&m.default.Fragment,ce=m.jsx!==void 0?m.jsx:m.default&&m.default.jsx,Pa=m.jsxs!==void 0?m.jsxs:m.default&&m.default.jsxs,Oa=m.jsxDEV!==void 0?m.jsxDEV:m.default&&m.default.jsxDEV;var pe=3600,J=7e3,lt=700,dt=60,ft=1.5,ct=Math.PI*2,Je=8,Ze=["#5A4AE0","#F2D98A"],$e=0,pt=Math.sin($e*Math.PI/180),mt=-Math.cos($e*Math.PI/180),ht=550,xt=1200*800,gt=.5,vt=2.5,bt=7,yt=`
precision highp float;

attribute vec2 aGrid;   // world (x, z) lattice position
attribute vec2 aSeed;   // per-point hash pair, stable across frames

uniform vec2  uRes;     // device-pixel canvas size
uniform float uFocal;   // device px
uniform float uTime;    // pre-scaled wave phase (speed applied on the CPU)
uniform float uAmp;
uniform float uScatter; // vertical thickness of the point cloud
uniform float uFreq;    // TAU / wavelength
uniform vec2  uDir;     // unit travel direction in world XZ
uniform float uFlow;    // accumulated endless drift toward the camera, wrapped
uniform float uDepth;   // wrap length; fog is already at 0 by this depth
uniform float uCamY;
uniform float uCamZ;
uniform float uPitch;   // radians, positive = looking down
uniform float uRoll;    // radians about the view axis; sign flipped on the CPU
                        // so a positive control value dips the RIGHT edge
uniform float uDot;     // world radius of one point
uniform float uColorCount;
uniform vec2  uJit;     // lattice jitter amount (x, z)
uniform vec3  uColors[8];
uniform vec3  uCursor;  // ground-plane hit (x, z) + eased hover amount
uniform float uCurR;
uniform float uCurS;
uniform float uHover;   // brightness / size gain right under the cursor

varying vec3  vCol;
varying float vA;
varying float vHot;

// WebGL1 forbids indexing a uniform array with a non-constant expression, so
// the palette is selected by a fixed-bound loop instead of uColors[idx].
vec3 pickColor(float sel) {
    float idx = floor(sel * uColorCount);
    vec3 c = uColors[0];
    for (int i = 1; i < 8; i++) {
        if (float(i) >= uColorCount) break;
        if (float(i) == idx) c = uColors[i];
    }
    return c;
}

// Three sines: one long ridge across x, one diagonal, one slow swell in depth.
// Time is deliberately NOT in here. Giving each term its own time sign is what
// makes a surface churn in place; instead the whole static pattern is rigidly
// translated along uDir, so every crest travels the same way at the same speed.
float surf(vec2 q) {
    return sin(q.x) * 0.55
         + sin(q.x * 0.55 + q.y * 1.15) * 0.30
         + sin(q.y * 0.75) * 0.22;
}

void main() {
    // Jitter x only slightly: the frames keep visible vertical column
    // striations, which is the lattice read edge-on. Heavy x jitter kills them.
    vec2 w = aGrid + (aSeed - 0.5) * uJit;

    // Endless approach. Depth is held RELATIVE to the camera and wrapped, so a
    // point that passes the lens is recycled to the back of the field instead
    // of the field running out. The wrap lands at uDepth, where the fog term
    // has already reached zero, so the recycle is invisible \u2014 that is the whole
    // reason the wrap distance and the fog far edge are tied together.
    w.y = uCamZ + mod(w.y - uFlow - uCamZ, uDepth);

    // Third hash from the same attribute pair \u2014 no extra buffer.
    float h3 = fract(sin(dot(aSeed, vec2(91.37, 47.13))) * 12345.678);

    // Scatter is what turns a woven mesh into a cloud, and \u2014 because x jitter
    // stays low \u2014 it is also what produces the vertical dotted streaks that
    // run through the reference frames: one lattice column, many heights.
    // Rigid translation of the pattern = one-directional flow.
    float h = surf(w * uFreq - uDir * uTime) * uAmp + (h3 - 0.5) * uScatter;

    // One gaussian drives BOTH cursor effects: it lifts the surface and it is
    // reused below as the hover glow mask. uCursor.z is the eased hover amount,
    // so the whole thing fades in and out with the pointer.
    float cd = length(w - uCursor.xy);
    float g = exp(-(cd * cd) / (uCurR * uCurR)) * uCursor.z;
    h += g * uCurS;

    // The glow needs a MUCH tighter falloff than the lift. A world-space radius
    // that reads as a gentle swell projects to a huge swath of the near field,
    // where the dots are largest, so reusing g directly floods half the frame
    // and saturates the additive blend. g^8 pulls the radius down to ~0.35x.
    float g2 = g * g; g2 = g2 * g2; g2 = g2 * g2;

    // world -> camera. Camera basis for a downward pitch t:
    //   up = (0, cos t, sin t), forward = (0, -sin t, cos t)
    vec3 p = vec3(w.x, h - uCamY, w.y - uCamZ);
    float c = cos(uPitch);
    float s = sin(uPitch);
    float ry = p.y * c + p.z * s;
    float rz = -p.y * s + p.z * c;

    // Behind / on top of the lens: park it off-clip instead of dividing by ~0.
    if (rz < 40.0) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vCol = uColors[0];
        vA = 0.0;
        vHot = 0.0;
        return;
    }

    // Roll spins the camera about its own view axis. It runs AFTER pitch and
    // leaves rz untouched, so depth of field, fog and point size are all
    // unaffected \u2014 only the framing tips.
    float cr = cos(uRoll);
    float sr = sin(uRoll);
    float rx = p.x * cr - ry * sr;
    float ryr = p.x * sr + ry * cr;

    float sx = rx * uFocal / rz;
    float sy = ryr * uFocal / rz;
    gl_Position = vec4(sx / (uRes.x * 0.5), sy / (uRes.y * 0.5), 0.0, 1.0);

    // No depth of field: the radius is the projected dot and nothing else.
    float rad = max(uDot * uFocal / rz, 0.55);
    // Hover swells the dots a little; the alpha gain below does the rest.
    gl_PointSize = clamp(rad * 2.0 * (1.0 + g2 * uHover * 0.20), 1.0, 220.0);

    float bri = 0.28 + h3 * 0.72;

    // Two very low-frequency drifting sines choose the palette entry, so each
    // colour arrives in migrating patches instead of salt-and-pepper noise, and
    // drifts along the SAME direction as the wave so the patches ride the flow
    // rather than sliding across it. The seed term is deliberately wide so the
    // patch edge dissolves into an interleaved dither, not a hard colour seam.
    vec2 bq = w * vec2(0.0040, 0.0032) - uDir * uTime * 0.30;
    float band = sin(bq.x) + sin(bq.y);
    float sel = fract((band + 2.0) * 0.25 + (aSeed.y - 0.5) * 0.55);

    vCol = pickColor(sel);
    // Sparkle rides the entry's own luminance, so a pale palette entry keeps
    // its hot core and a deep one stays matte \u2014 no accent flag needed.
    float lum = dot(vCol, vec3(0.299, 0.587, 0.114));
    // Every point is sharp now, so the (1 - vSoft) gate that used to kill the
    // sparkle on blurred discs is gone with it.
    vHot = (0.25 + 0.75 * lum) * bri * bri * 0.7 + g2 * uHover * 0.55;

    // Far fade into the background + a short near fade so points do not pop
    // into existence a few units in front of the lens.
    float fog = (1.0 - smoothstep(2800.0, 6400.0, rz))
              * smoothstep(70.0, 240.0, rz);

    vA = bri * fog * (1.0 + g2 * uHover * 0.55);
}
`,St=`
precision highp float;

varying vec3  vCol;
varying float vA;
varying float vHot;

void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;

    // One edge for every point: a narrow AA ramp. The gradient-disc branch went
    // with depth of field \u2014 there are no blurred points left to mix toward.
    float a = (1.0 - smoothstep(0.90, 1.0, d)) * vA;

    // Hot white core \u2014 the sparkle in the frames.
    vec3 col = vCol + vec3(1.0) * pow(1.0 - d, 10.0) * vHot * 0.9;

    // Premultiplied, blended with (ONE, ONE): overlapping discs bloom.
    gl_FragColor = vec4(col * a, a);
}
`;function Ct(n){if(!n)return[0,0,0];let a=n.trim(),i=a.match(/rgba?\(([^)]+)\)/i);if(i){let u=i[1].split(",").map(y=>parseFloat(y.trim()));return[(u[0]||0)/255,(u[1]||0)/255,(u[2]||0)/255]}let r=a.replace("#","");return(r.length===3||r.length===4)&&(r=r.split("").map(u=>u+u).join("")),r=r.padEnd(6,"0"),[parseInt(r.slice(0,2),16)/255,parseInt(r.slice(2,4),16)/255,parseInt(r.slice(4,6),16)/255]}function wt(n){return function(){n|=0,n=n+1831565813|0;let a=Math.imul(n^n>>>15,1|n);return a=a+Math.imul(a^a>>>7,61|a)^a,((a^a>>>14)>>>0)/4294967296}}function Xe(n,a,i){let r=n.createShader(a);return n.shaderSource(r,i),n.compileShader(r),n.getShaderParameter(r,n.COMPILE_STATUS)||console.warn("ScrollWaveField shader:",n.getShaderInfoLog(r)),r}var Et=260/160,_t=100/45;function Ke(n){let{background:a,colors:i,palette:r={},density:u=145,dotSize:y=2,scatter:S=108,cameraHeight:_=50,wave:g={waveSpeed:250,waveHeight:200,waveLength:2070},tilt:x={rollStart:0,tiltStart:12},cursor:C={cursorLift:45,cursorRadius:25},transition:me={mass:1,type:"spring",delay:0,damping:60,stiffness:800},flowSpeed:Qe,width:Rt,height:At,style:et}=n,he=V(fe(0)).current,xe=V(fe(0)).current,$=V(me);$.current=me;let{waveHeight:ge=150,waveLength:ve=1400,waveSpeed:K=160}=g,tt=a??r.background??"#080512",be=i??r.colors??Ze,{tiltStart:ye=8,rollStart:Se=0}=x,{cursorRadius:Ce=25,cursorLift:Q=45,hoverGlow:nt}=C,we=Qe??K*Et,Ee=nt??Math.min(400,Math.abs(Q)*_t),_e=V(null),Re=V(null),Ae=V({colors:be,density:u,dotSize:y,waveHeight:ge,scatter:S,waveLength:ve,waveSpeed:K,flowSpeed:we,tiltStart:ye,rollStart:Se,cameraHeight:_,cursorRadius:Ce,cursorLift:Q,hoverGlow:Ee});Ae.current={colors:be,density:u,dotSize:y,waveHeight:ge,scatter:S,waveLength:ve,waveSpeed:K,flowSpeed:we,tiltStart:ye,rollStart:Se,cameraHeight:_,cursorRadius:Ce,cursorLift:Q,hoverGlow:Ee};let D=V({x:0,y:0,sx:0,sy:0,active:0,target:0,press:0,pressTarget:0});return We(()=>{let b=_e.current,w=Re.current;if(!b||!w)return;let o=w.getContext("webgl",{alpha:!0,antialias:!1,premultipliedAlpha:!0,depth:!1});if(!o)return;let R=o.createProgram();if(o.attachShader(R,Xe(o,o.VERTEX_SHADER,yt)),o.attachShader(R,Xe(o,o.FRAGMENT_SHADER,St)),o.linkProgram(R),!o.getProgramParameter(R,o.LINK_STATUS)){console.warn("ScrollWaveField link:",o.getProgramInfoLog(R));return}o.useProgram(R);let Me=o.getAttribLocation(R,"aGrid"),Ie=o.getAttribLocation(R,"aSeed"),f=l=>o.getUniformLocation(R,l),c={res:f("uRes"),focal:f("uFocal"),time:f("uTime"),amp:f("uAmp"),scatter:f("uScatter"),freq:f("uFreq"),dir:f("uDir"),flow:f("uFlow"),depth:f("uDepth"),camY:f("uCamY"),camZ:f("uCamZ"),pitch:f("uPitch"),roll:f("uRoll"),dot:f("uDot"),colorCount:f("uColorCount"),jit:f("uJit"),colors:f("uColors[0]"),cursor:f("uCursor"),curR:f("uCurR"),curS:f("uCurS"),hover:f("uHover")},Le=o.createBuffer(),Te=o.createBuffer(),B=new Float32Array(Je*3),Ve=-1,k=0,ee=1,te=1,ot=l=>{let p=Math.max(8,Math.round(l)),d=Math.max(8,Math.round(l*2));k=p*d,ee=pe/(p-1),te=J/(d-1);let s=new Float32Array(k*2),A=new Float32Array(k*2),I=wt(24301),E=0;for(let L=0;L<d;L++)for(let T=0;T<p;T++)s[E*2]=-pe/2+(T+.5)*ee,s[E*2+1]=L*te,A[E*2]=I(),A[E*2+1]=I(),E++;o.bindBuffer(o.ARRAY_BUFFER,Le),o.bufferData(o.ARRAY_BUFFER,s,o.STATIC_DRAW),o.bindBuffer(o.ARRAY_BUFFER,Te),o.bufferData(o.ARRAY_BUFFER,A,o.STATIC_DRAW),Ve=l};o.disable(o.DEPTH_TEST),o.enable(o.BLEND),o.blendFunc(o.ONE,o.ONE);let F=0,P=0,z=1,De=1,ne=()=>{z=Math.min(window.devicePixelRatio||1,ft),F=w.clientWidth||b.clientWidth||0,P=w.clientHeight||b.clientHeight||0,De=F>0&&P>0?Math.min(vt,Math.max(gt,Math.sqrt(F*P/xt))):1;let l=Math.max(1,Math.round(F*z)),p=Math.max(1,Math.round(P*z));(w.width!==l||w.height!==p)&&(w.width=l,w.height=p),o.viewport(0,0,l,p)};ne();let Fe=new ResizeObserver(ne);Fe.observe(w);let oe=null,ae=null,Pe=l=>{D.current.target!==l&&(D.current.target=l,oe?.stop(),oe=de(he,l,$.current))},re=l=>{D.current.pressTarget!==l&&(D.current.pressTarget=l,ae?.stop(),ae=de(xe,l,$.current))},Oe=l=>{let p=b.getBoundingClientRect(),d=p.width>0?b.clientWidth/p.width:1,s=p.height>0?b.clientHeight/p.height:1;D.current.x=(l.clientX-p.left)*d,D.current.y=(l.clientY-p.top)*s,Pe(1)},ke=()=>{Pe(0),re(0)},ze=()=>re(1),W=()=>re(0);b.addEventListener("pointermove",Oe),b.addEventListener("pointerleave",ke),b.addEventListener("pointerdown",ze),b.addEventListener("pointercancel",W),window.addEventListener("pointerup",W);let ie=0,Ge=performance.now(),He=0,ue=0,j=0,G=-1e6,at=(l,p,d,s,A,I,E,L,T)=>{let H=l*z-d/2,O=-(p*z-s/2),N=Math.cos(E),Y=Math.sin(E),se=H*N+O*Y,U=-H*Y+O*N,v=se/A,q=U/A,Z=Math.cos(I),X=Math.sin(I),Ue=q*Z-X,rt=q*X+Z;if(Ue>-1e-4)return null;let Be=-L/Ue;return{x:v*Be,z:T+rt*Be}},Ne=l=>{ie=requestAnimationFrame(Ne);let p=Math.min((l-Ge)/1e3,.05);if(Ge=l,(F<=0||P<=0)&&(ne(),F<=0||P<=0))return;let d=Ae.current;if(d.density!==Ve&&ot(d.density),k===0)return;let s=D.current;s.active=he.get(),s.press=xe.get();let A=1+s.press;if(s.active<.002)s.sx=s.x,s.sy=s.y;else{let v=1-Math.exp(-p*bt);s.sx+=(s.x-s.sx)*v,s.sy+=(s.y-s.sy)*v}He+=p*(d.waveSpeed/100)*A,ue=(ue+p*d.flowSpeed*A)%J;let I=d.tiltStart*Math.PI/180,E=-d.rollStart*Math.PI/180,L=Math.min(100,Math.max(0,d.cameraHeight))/100*ht*De,T=lt,H=w.width,O=w.height,N=O/(2*Math.tan(dt/2*Math.PI/180));if(s.active<=.001)j=0,G=-1e6;else{let v=at(s.sx,s.sy,H,O,N,I,E,L,T);v?(j=v.x,G=v.z):G===-1e6&&(j=0,G=J)}let Y=j,se=G,U=Array.isArray(d.colors)&&d.colors.length>0?d.colors.slice(0,8):Ze;for(let v=0;v<U.length;v++){let[q,Z,X]=Ct(U[v]);B[v*3]=q,B[v*3+1]=Z,B[v*3+2]=X}o.uniform2f(c.res,H,O),o.uniform1f(c.focal,N),o.uniform1f(c.time,He),o.uniform1f(c.amp,d.waveHeight),o.uniform1f(c.scatter,d.scatter),o.uniform1f(c.freq,ct/Math.max(50,d.waveLength)),o.uniform2f(c.dir,pt,mt),o.uniform1f(c.flow,ue),o.uniform1f(c.depth,J),o.uniform1f(c.camY,L),o.uniform1f(c.camZ,T),o.uniform1f(c.pitch,I),o.uniform1f(c.roll,E),o.uniform1f(c.dot,d.dotSize),o.uniform1f(c.colorCount,U.length),o.uniform2f(c.jit,ee*.25,te*.7),o.uniform3fv(c.colors,B),o.uniform3f(c.cursor,Y,se,s.active),o.uniform1f(c.curR,Math.max(1,d.cursorRadius/100*(pe/2))),o.uniform1f(c.curS,d.cursorLift),o.uniform1f(c.hover,d.hoverGlow/100),o.bindBuffer(o.ARRAY_BUFFER,Le),o.enableVertexAttribArray(Me),o.vertexAttribPointer(Me,2,o.FLOAT,!1,0,0),o.bindBuffer(o.ARRAY_BUFFER,Te),o.enableVertexAttribArray(Ie),o.vertexAttribPointer(Ie,2,o.FLOAT,!1,0,0),o.clearColor(0,0,0,0),o.clear(o.COLOR_BUFFER_BIT),o.drawArrays(o.POINTS,0,k)};return ie=requestAnimationFrame(Ne),()=>{cancelAnimationFrame(ie),Fe.disconnect(),oe?.stop(),ae?.stop(),b.removeEventListener("pointermove",Oe),b.removeEventListener("pointerleave",ke),b.removeEventListener("pointerdown",ze),b.removeEventListener("pointercancel",W),window.removeEventListener("pointerup",W)}},[]),ce("div",{ref:_e,style:{minWidth:1200,minHeight:800,width:"100%",height:"100%",position:"relative",overflow:"hidden",background:tt,...et},children:ce("canvas",{ref:Re,style:{position:"absolute",inset:0,width:"100%",height:"100%",display:"block"}})})}Ye(Ke,{background:{type:h.Color,title:"Background",defaultValue:"#080512"},colors:{type:h.Array,title:"Colors",control:{type:h.Color},defaultValue:["#FF6400","#FFC200"],maxCount:Je},density:{type:h.Number,title:"Density",defaultValue:145,min:20,max:200,step:1},dotSize:{type:h.Number,title:"Dot Size",defaultValue:2,min:1,max:20,step:1},scatter:{type:h.Number,title:"Scatter",defaultValue:108,min:0,max:300,step:1},cameraHeight:{type:h.Number,title:"Height",defaultValue:50,min:0,max:100,step:1,unit:"%"},wave:{type:h.Object,title:"Wave",icon:"effect",defaultValue:{waveSpeed:250,waveHeight:200,waveLength:2070},controls:{waveHeight:{type:h.Number,title:"Height",defaultValue:{waveSpeed:250,waveHeight:200,waveLength:2070},min:0,max:300,step:1},waveLength:{type:h.Number,title:"Length",defaultValue:{waveSpeed:250,waveHeight:200,waveLength:2070},min:200,max:4e3,step:10},waveSpeed:{type:h.Number,title:"Speed",defaultValue:{waveSpeed:250,waveHeight:200,waveLength:2070},min:0,max:1e3,step:1}}},tilt:{type:h.Object,title:"Tilt",icon:"effect",defaultValue:{rollStart:0,tiltStart:12},controls:{tiltStart:{type:h.Number,title:"X",defaultValue:{rollStart:0,tiltStart:12},min:0,max:45,step:1,unit:"\xB0"},rollStart:{type:h.Number,title:"Y",defaultValue:{rollStart:0,tiltStart:12},min:-45,max:45,step:1,unit:"\xB0"}}},cursor:{type:h.Object,title:"Cursor",icon:"effect",defaultValue:{cursorLift:45,cursorRadius:25},controls:{cursorRadius:{type:h.Number,title:"Radius",defaultValue:{cursorLift:45,cursorRadius:25},min:0,max:100,step:1,unit:"%"},cursorLift:{type:h.Number,title:"Lift",defaultValue:{cursorLift:45,cursorRadius:25},min:-300,max:300,step:5}}},transition:{type:h.Transition,title:"Transition",defaultValue:{mass:1,type:"spring",delay:0,damping:60,stiffness:800}}});export{Ke as default};
