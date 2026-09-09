import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { mountHexComb } from './hex-comb.js';

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
mountHexComb(document.querySelector('#hex-comb'));

const header=document.querySelector('[data-header]');
if(!reduced){
 const lenis=new Lenis({lerp:.09,smoothWheel:true});
 lenis.on('scroll',ScrollTrigger.update);
 gsap.ticker.add(t=>lenis.raf(t*1000));gsap.ticker.lagSmoothing(0);
 document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(target){e.preventDefault();lenis.scrollTo(target,{offset:-62,duration:1.15})}}));
 ScrollTrigger.create({start:0,end:999,onUpdate:s=>header.classList.toggle('is-scrolled',s.scroll()>28)});
 const stages=gsap.utils.toArray('.stage'),rail=document.querySelector('.operating__rail span'),trace=document.querySelector('#trace-output');
 const traces=['task.created\nsource.linked\npolicy.scope=local','ocr.complete\nevidence.located\nrevision.checked','model.routed\ntool.allowlisted\nplan.executing','risk.flagged\nreview.pending\nevidence.attached','decision.required\nactor.recorded\nchange.route=claim','artifact.generated\ntrace.archived\ntask.complete'];
 const activate=i=>{stages.forEach((s,index)=>s.classList.toggle('is-active',index===i));trace.innerHTML=traces[i].split('\n').map(x=>`<span>› ${x}</span>`).join('<br>')};
 const tl=gsap.timeline({scrollTrigger:{trigger:'.operating__pin',start:'top top',end:'+=240%',pin:true,scrub:.6,anticipatePin:1}});
 stages.forEach((_,i)=>{tl.call(()=>activate(i),null,i).to(rail,{height:`${(i+1)/stages.length*100}%`,duration:1},i)});tl.to({}, {duration:.5});
 gsap.utils.toArray('.capability-grid article,.timeline li,.roles__grid article,.monitor').forEach(el=>{gsap.from(el,{y:24,opacity:0,duration:.7,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%',once:true}})});
 gsap.from('.hero__copy > *',{y:24,opacity:0,stagger:.11,duration:.8,ease:'power3.out',delay:.1});
}else{header.classList.add('is-scrolled');document.querySelector('#trace-output').innerHTML='<span>› task.created<br>› source.linked<br>› policy.scope=local</span>'}
