import{a as t,T as $,j as x,U as j,W as L,X as N,Y as q,Z as S,c as g,q as D}from"./index-DxDjdAZm.js";class T extends t.Component{getSnapshotBeforeUpdate(r){const e=this.props.childRef.current;if(e&&r.isPresent&&!this.props.isPresent){const n=this.props.sizeRef.current;n.height=e.offsetHeight||0,n.width=e.offsetWidth||0,n.top=e.offsetTop,n.left=e.offsetLeft}return null}componentDidUpdate(){}render(){return this.props.children}}function U({children:s,isPresent:r}){const e=t.useId(),n=t.useRef(null),v=t.useRef({width:0,height:0,top:0,left:0}),{nonce:f}=t.useContext($);return t.useInsertionEffect(()=>{const{width:d,height:i,top:h,left:o}=v.current;if(r||!n.current||!d||!i)return;n.current.dataset.motionPopId=e;const l=document.createElement("style");return f&&(l.nonce=f),document.head.appendChild(l),l.sheet&&l.sheet.insertRule(`
          [data-motion-pop-id="${e}"] {
            position: absolute !important;
            width: ${d}px !important;
            height: ${i}px !important;
            top: ${h}px !important;
            left: ${o}px !important;
          }
        `),()=>{document.head.removeChild(l)}},[r]),x.jsx(T,{isPresent:r,childRef:n,sizeRef:v,children:t.cloneElement(s,{ref:n})})}const V=({children:s,initial:r,isPresent:e,onExitComplete:n,custom:v,presenceAffectsLayout:f,mode:d})=>{const i=j(A),h=t.useId(),o=t.useCallback(u=>{i.set(u,!0);for(const y of i.values())if(!y)return;n&&n()},[i,n]),l=t.useMemo(()=>({id:h,initial:r,isPresent:e,custom:v,onExitComplete:o,register:u=>(i.set(u,!1),()=>i.delete(u))}),f?[Math.random(),o]:[e,o]);return t.useMemo(()=>{i.forEach((u,y)=>i.set(y,!1))},[e]),t.useEffect(()=>{!e&&!i.size&&n&&n()},[e]),d==="popLayout"&&(s=x.jsx(U,{isPresent:e,children:s})),x.jsx(L.Provider,{value:l,children:s})};function A(){return new Map}const k=s=>s.key||"";function _(s){const r=[];return t.Children.forEach(s,e=>{t.isValidElement(e)&&r.push(e)}),r}const O=({children:s,custom:r,initial:e=!0,onExitComplete:n,presenceAffectsLayout:v=!0,mode:f="sync",propagate:d=!1})=>{const[i,h]=N(d),o=t.useMemo(()=>_(s),[s]),l=d&&!i?[]:o.map(k),u=t.useRef(!0),y=t.useRef(o),C=j(()=>new Map),[z,I]=t.useState(o),[p,w]=t.useState(o);q(()=>{u.current=!1,y.current=o;for(let c=0;c<p.length;c++){const a=k(p[c]);l.includes(a)?C.delete(a):C.get(a)!==!0&&C.set(a,!1)}},[p,l.length,l.join("-")]);const b=[];if(o!==z){let c=[...o];for(let a=0;a<p.length;a++){const m=p[a],R=k(m);l.includes(R)||(c.splice(a,0,m),b.push(m))}f==="wait"&&b.length&&(c=b),w(_(c)),I(o);return}const{forceRender:M}=t.useContext(S);return x.jsx(x.Fragment,{children:p.map(c=>{const a=k(c),m=d&&!i?!1:o===p||l.includes(a),R=()=>{if(C.has(a))C.set(a,!0);else return;let E=!0;C.forEach(P=>{P||(E=!1)}),E&&(M==null||M(),w(y.current),d&&(h==null||h()),n&&n())};return x.jsx(V,{isPresent:m,initial:!u.current||e?void 0:!1,custom:m?void 0:r,presenceAffectsLayout:v,mode:f,onExitComplete:m?void 0:R,children:c},a)})})};/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],Y=g("chevron-down",H);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]],Z=g("mail",K);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],J=g("refresh-cw",W);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X=[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Q=g("settings",X);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],ee=g("x",B),F=t.forwardRef(({className:s,type:r,...e},n)=>x.jsx("input",{type:r,className:D("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",s),ref:n,...e}));F.displayName="Input";export{O as A,Y as C,F as I,Z as M,J as R,Q as S,ee as X};
