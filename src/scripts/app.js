
var nodesList=[],sortMode=localStorage.getItem('nodeSort')||'default',filterRegion=null,searchQuery='',siteStart=new Date("2026-05-08T03:28:02Z").getTime(),exchangeRate=6.82,hasError=false;
var SORT_OPTIONS=[{value:'default',label:'默认'},{value:'name',label:'名称'},{value:'region',label:'地区'},{value:'cpu',label:'CPU 占用'},{value:'mem',label:'内存占用'},{value:'disk',label:'磁盘占用'},{value:'down',label:'下行速度'},{value:'up',label:'上行速度'},{value:'uptime',label:'在线时长'}];
function $(id){return document.getElementById(id)}
function debounce(fn,ms){var t=null;return function(){var a=arguments,c=this;clearTimeout(t);t=setTimeout(function(){fn.apply(c,a)},ms)}}
function bytes(v){if(!v||v<=0)return'0B';var u=['B','KB','MB','GB','TB','PB'];var i=Math.min(Math.floor(Math.log(v)/Math.log(1024)),u.length-1);return(v/Math.pow(1024,i)).toFixed(i<2?0:1)+u[i]}
function uptime(s){if(!s||s<=0)return'—';var d=Math.floor(s/86400),h=Math.floor((s%86400)/3600);return(d>0?d+' 天 ':'')+h+' 时'}
function age(t){if(!t)return'—';var diff=Math.floor((Date.now()-new Date(t).getTime())/1000);if(diff<60)return diff+'秒前';if(diff<3600)return Math.floor(diff/60)+'分钟前';return Math.floor(diff/3600)+'小时前'}
function metricClass(p){return p>=80?'high':p>=60?'medium':'low'}
function flagEmoji(r){var m={'🇺🇸':'us','🇯🇵':'jp','🇭🇰':'hk','🇳🇱':'nl','🇰🇵':'kp','🇩🇪':'de','🇸🇬':'sg','🇬🇧':'gb','🇰🇷':'kr','🇨🇳':'cn','🇷🇺':'ru','🇨🇦':'ca','🇦🇺':'au','🇹🇼':'tw'};return m[r]||''}
function osClass(os){if(!os)return'';os=os.toLowerCase();if(os.includes('alpine'))return'alpine';if(os.includes('debian'))return'debian';if(os.includes('ubuntu'))return'ubuntu';if(os.includes('centos')||os.includes('rhel'))return'centos';return''}
function mergeNodeData(node,recent){var r=recent&&recent.length?recent[0]:{};return Object.assign({},node,{cpu_usage:(r.cpu&&r.cpu.usage)||0,mem_used:(r.ram&&r.ram.used)||0,disk_used:(r.disk&&r.disk.used)||0,net_up:(r.network&&r.network.up)||0,net_down:(r.network&&r.network.down)||0,total_up:(r.network&&r.network.totalUp)||0,total_down:(r.network&&r.network.totalDown)||0,uptime_sec:r.uptime||0,load1:r.load&&r.load.load1,load5:r.load&&r.load.load5,load15:r.load&&r.load.load15,connections:r.connections,process:r.process,online:!!r.updated_at,updated_at:r.updated_at||node.updated_at})}
async function fetchJSON(url,timeoutMs){timeoutMs=timeoutMs||15000;try{var ctrl=new AbortController();var timer=setTimeout(function(){ctrl.abort()},timeoutMs);var r=await fetch(url,{signal:ctrl.signal});clearTimeout(timer);return await r.json()}catch(e){return null}}

function renderSkeletons(){var grid=$('grid-view');if(!grid)return;var html='';for(var i=0;i<8;i++){html+='<div class="skeleton-card" style="animation-delay:'+(i*40)+'ms">';for(var j=0;j<5;j++)html+='<div class="skeleton-line"></div>';html+='</div>'}grid.innerHTML=html}

async function loadData(){renderSkeletons();var siteData=await fetchJSON('/api/public');$('poster').src='https://img.357561.xyz/image-wallpaper2.png';$('bg-video').src='https://img.357561.xyz/wallpaper1.mp4';if(siteData&&siteData.theme_settings){var ts=siteData.theme_settings;if(ts.posterUrl)$('poster').src=ts.posterUrl;if(ts.videoUrl)$('bg-video').src=ts.videoUrl;if(siteData.sitename){document.querySelectorAll('#site-name,#footer-brand').forEach(function(el){el.textContent=siteData.sitename});document.title=siteData.sitename}}
var rateData=await fetchJSON('/api/proxy/exchange-rate');if(rateData&&rateData.conversion_rates&&rateData.conversion_rates.CNY){exchangeRate=rateData.conversion_rates.CNY;var re=$('stat-cost-rate');if(re)re.textContent='@'+exchangeRate.toFixed(2)}
var nodeData=await fetchJSON('/api/nodes');if(!nodeData||!nodeData.data){hasError=true;$('grid-view').innerHTML='<div class="error-state"><div class="error-icon">⚠️</div><span>无法连接到服务器，请检查后端状态</span></div>';return}hasError=false
var raw=nodeData.data;var merged=await Promise.all(raw.map(async function(node){var recent=await fetchJSON('/api/recent/'+node.uuid);return mergeNodeData(node,recent?recent.data:[])}));nodesList=merged;render(false)}

function render(skipFilters){if(hasError)return;clearAnimDelays();var grid=$('grid-view');requestAnimationFrame(function(){requestAnimationFrame(function(){var filtered=nodesList.filter(function(n){if(filterRegion&&n.region!==filterRegion)return false;if(searchQuery){var q=searchQuery.toLowerCase(),name=(n.name||'').toLowerCase(),region=(n.region||'').toLowerCase(),tags=(n.tags||'').toLowerCase(),uuid=(n.uuid||'').toLowerCase();if(name.indexOf(q)===-1&&region.indexOf(q)===-1&&tags.indexOf(q)===-1&&uuid.indexOf(q)===-1)return false}return true});sortNodes(filtered)
if(nodesList.length===0){grid.innerHTML='<div class="empty-state"><span>暂无节点</span></div>';return}
if(filtered.length===0){grid.innerHTML='<div class="empty-state"><span>没有匹配的节点</span></div>'}else{grid.innerHTML=filtered.map(renderCard).join('')}
updateStats();if(!skipFilters){buildRegionFilters()}positionBackToTop();});});}
function clearAnimDelays(){nodesList.forEach(function(n){delete n._animDelay})}
function sortNodes(arr){var fns={default:function(a,b){return(b.online?1:0)-(a.online?1:0)||(a.weight||0)-(b.weight||0)},name:function(a,b){return(a.name||'').localeCompare(b.name||'')},region:function(a,b){return(a.region||'').localeCompare(b.region||'')},cpu:function(a,b){return(b.cpu_usage||0)-(a.cpu_usage||0)},mem:function(a,b){return((b.mem_used||0)/(b.mem_total||1)-(a.mem_used||0)/(a.mem_total||1))},disk:function(a,b){return((b.disk_used||0)/(b.disk_total||1)-(a.disk_used||0)/(a.disk_total||1))},down:function(a,b){return(b.net_down||0)-(a.net_down||0)},up:function(a,b){return(b.net_up||0)-(a.net_up||0)},uptime:function(a,b){return(b.uptime_sec||0)-(a.uptime_sec||0)}};arr.sort(fns[sortMode]||fns.default);var i=0;arr.forEach(function(n){n._animDelay=i++})}

function renderCard(n){var d=(n._animDelay||0)*20,oc=osClass(n.os),cpu=n.cpu_usage||0,mp=n.mem_total>0?((n.mem_used||0)/n.mem_total)*100:0,dp=n.disk_total>0?((n.disk_used||0)/n.disk_total)*100:0,on=n.online,fc=flagEmoji(n.region),up=n.net_up||0,down=n.net_down||0
return'<div class="node-card'+(on?'':' offline')+'" data-uuid="'+n.uuid+'" tabindex="0" role="listitem" style="animation-delay:'+d+'ms">'
+'<div class="node-card-header"><div class="node-status '+(on?'online':'offline')+'"></div>'+(oc?'<span class="node-os-icon" data-os="'+oc+'"></span>':'')+'<div class="node-name">'+(n.name||n.uuid||'—')+'</div>'+(n.region?'<div class="node-region">'+(fc?'<img class="node-flag" src="https://flagcdn.com/'+fc+'.svg" alt="" loading="lazy">':'')+'</div>':'')+'</div>'
+(n.tags?'<div class="card-tags">'+String(n.tags).split(',').filter(function(t){return t.trim()}).map(function(t){return '<span class="tag-chip">'+t.trim()+'</span>'}).join('')+'</div>':'')+'<div class="card-metrics">'
+'<div class="card-metric cpu"><span class="cm-label">CPU</span><div class="cm-bar"><div class="cm-fill '+metricClass(cpu)+'" style="transform:scaleX('+Math.min(1,cpu/100)+')"></div></div><span class="cm-value" style="color:'+(cpu>=80?'var(--danger)':cpu>=60?'var(--accent-orange)':'var(--accent)')+'">'+cpu.toFixed(1)+'%</span></div>'
+'<div class="card-metric mem"><span class="cm-label">MEM</span><div class="cm-bar"><div class="cm-fill '+metricClass(mp)+'" style="transform:scaleX('+Math.min(1,mp/100)+')"></div></div><span class="cm-value" style="color:'+(mp>=80?'var(--danger)':mp>=60?'var(--accent-orange)':'var(--accent)')+'">'+mp.toFixed(1)+'%</span></div>'
+'<div class="card-metric dsk"><span class="cm-label">DSK</span><div class="cm-bar"><div class="cm-fill '+metricClass(dp)+'" style="transform:scaleX('+Math.min(1,dp/100)+')"></div></div><span class="cm-value" style="color:'+(dp>=80?'var(--danger)':dp>=60?'var(--accent-orange)':'var(--accent)')+'">'+dp.toFixed(1)+'%</span></div>'
+'<div class="card-metric net-row"><span class="cm-label">NET</span><div class="cm-bar"><div class="cm-fill up" style="transform:scaleX('+Math.min(1,(up||0)/Math.max(1,up+down))+')"></div></div><span class="cm-value"><span class="up">↑'+bytes(up)+'/s</span><span class="down">↓'+bytes(down)+'/s</span></span></div>'
+'</div><div class="node-footer"><span class="node-footer-item">🕐 '+uptime(n.uptime_sec)+'</span>'+(n.price?'<span class="price-badge">'+(n.currency||'¥')+n.price+'/'+(n.billing_cycle===365?'年':n.billing_cycle===30?'月':n.billing_cycle===1095?'3年':n.billing_cycle===0?'永久':'期')+'</span>':'')+'</div></div>'}

function updateStats(){var on=0,ttUp=0,ttDown=0,tc=0,tr=0,rs={};nodesList.forEach(function(n){if(n.online){on++;if(n.region)rs[n.region]=true}ttUp+=n.total_up||0;ttDown+=n.total_down||0
if(n.price&&n.billing_cycle>0){var rate=n.currency==='$'?exchangeRate:1,p=n.price*rate;if(n.billing_cycle===30)tc+=p;else if(n.billing_cycle===365)tc+=p/12;else if(n.billing_cycle===1095)tc+=p/36;if(n.expired_at){var remain=Math.max(0,(new Date(n.expired_at).getTime()-Date.now())/86400000);tr+=p*remain/n.billing_cycle}}})
var total=nodesList.length,off=total-on;document.querySelectorAll('#stat-online-value').forEach(function(e){e.textContent=on+'/'+total});document.querySelectorAll('#stat-region-value').forEach(function(e){e.innerHTML=(off>0?'<span style="color:var(--danger);font-family:inherit">'+off+' 离线</span> · ':'')+'点亮区域 '+Object.keys(rs).length})
document.querySelectorAll('#stat-traffic-up').forEach(function(e){e.textContent='↑ '+bytes(ttUp)});document.querySelectorAll('#stat-traffic-down').forEach(function(e){e.textContent='↓ '+bytes(ttDown)})
var ru=0,rd=0;nodesList.forEach(function(n){ru+=n.net_up||0;rd+=n.net_down||0});document.querySelectorAll('#stat-traffic-rate').forEach(function(e){e.innerHTML='<span>⚡↑ '+bytes(ru)+'/s</span> · <span>⚡↓ '+bytes(rd)+'/s</span>'})
document.querySelectorAll('#stat-cost-monthly').forEach(function(e){e.textContent='¥'+Math.round(tc)+(tr>0?' · 剩余 ¥'+Math.round(tr):'')});document.querySelectorAll('#stat-cost-usd').forEach(function(e){e.textContent='≈ $'+(tc/exchangeRate).toFixed(2)+(tr>0?' / $'+(tr/exchangeRate).toFixed(2):'')})}

function buildRegionFilters(){var m={};nodesList.forEach(function(n){if(n.region)m[n.region]=(m[n.region]||0)+1});var r=Object.keys(m).sort(function(a,b){return m[b]-m[a]});var c=$('filters-container');if(!c)return;if(r.length===0){c.innerHTML='';return}
var h='';h+='<button class="chip'+(filterRegion===null?' active':'')+'" data-region="">全部 '+nodesList.length+'</button>';r.forEach(function(k){var fc=flagEmoji(k),fi=fc?'<img src="https://flagcdn.com/'+fc+'.svg" alt="" style="width:20px;height:13px;object-fit:cover;border-radius:2px;" loading="lazy">':'';h+='<button class="chip'+(filterRegion===k?' active':'')+'" data-region="'+k+'">'+fi+(fc?fc.toUpperCase():k)+' '+m[k]+'</button>'});c.querySelectorAll('.chip').forEach(function(e){e.remove()});c.insertAdjacentHTML('beforeend',h)
c.querySelectorAll('.chip').forEach(function(b){b.addEventListener('click',function(){if(this.classList.contains('active'))return;filterRegion=this.dataset.region||null;c.querySelectorAll('.chip').forEach(function(ch){ch.classList.remove('active')});this.classList.add('active');this.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});positionFilterSlider();render(true)})});requestAnimationFrame(function(){positionFilterSlider()})}
function positionFilterSlider(){var s=$('filter-slider'),a=document.querySelector('.chip.active'),f=$('filters-container');if(!s||!a||!f)return;s.style.left=a.offsetLeft+'px';s.style.width=a.offsetWidth+'px'}

function positionBackToTop(){var btn=$('back-to-top'),grid=$('grid-view');if(!btn||!grid)return;var cards=grid.querySelectorAll('.node-card');if(cards.length===0)return;var last=cards[cards.length-1],lr=last.getBoundingClientRect(),gr=grid.getBoundingClientRect();var bottom=lr.bottom+window.scrollY;var dist=document.documentElement.scrollHeight-bottom;btn.style.bottom=Math.max(4,dist)+'px';btn.style.top='auto';btn.style.right=Math.max(4,(window.innerWidth-gr.right+16)/3)+'px'}

function showDetailView(uuid){
$('navbar').querySelector('.navbar-actions').classList.add('hidden');$('detail-view').classList.remove('hidden');$('list-view').classList.add('hidden');window.scrollTo(0,0)
loadDetailData(uuid)}
function showListView(){hasError=false;render(false);$('navbar').querySelector('.navbar-actions').classList.remove('hidden');$('detail-view').classList.add('hidden');$('list-view').classList.remove('hidden');window.scrollTo(0,0)}

function loadDetailData(uuid){var l=$('detail-loading'),e=$('detail-error'),c=$('detail-content');l.classList.remove('hidden');e.classList.add('hidden');c.classList.add('hidden')
var node=nodesList.find(function(n){return n.uuid===uuid});var nP=node?Promise.resolve(node):fetchJSON('/api/nodes').then(function(d){return(d.data||[]).find(function(n){return n.uuid===uuid})})
nP.then(function(n){if(!n){l.classList.add('hidden');e.textContent='未找到该节点';e.classList.remove('hidden');return}
fetchJSON('/api/recent/'+uuid).then(function(rd){var recent=rd?rd.data||[]:[];renderDetailView(mergeNodeData(n,recent),recent)})}).catch(function(err){l.classList.add('hidden');e.textContent='加载失败: '+err.message;e.classList.remove('hidden')})}

function renderDetailView(node,recent){var latest=recent[0]||{},pts=recent.slice().reverse()
$('detail-name').textContent=node.name||node.uuid;var fc=flagEmoji(node.region),fi=fc?'<img class="detail-flag" src="https://flagcdn.com/'+fc+'.svg" alt="" loading="lazy">':'',oc=osClass(node.os),oi=oc?'<span class="node-os-icon" data-os="'+oc+'" style="width:14px;height:14px;font-size:12px;"></span>':'';$('detail-meta').innerHTML=fi+oi+' '+[node.region,node.virtualization,(node.os||'').split(' ')[0]].filter(Boolean).join(' · ')
var cpu=latest.cpu&&latest.cpu.usage||0,mp=node.mem_total>0?((latest.ram&&latest.ram.used||0)/node.mem_total)*100:0,dp=node.disk_total>0?((latest.disk&&latest.disk.used||0)/node.disk_total)*100:0
var mu=latest.ram&&latest.ram.used||0,du=latest.disk&&latest.disk.used||0,nu=latest.network&&latest.network.up||0,nd=latest.network&&latest.network.down||0,tu=latest.network&&latest.network.totalUp||0,td=latest.network&&latest.network.totalDown||0,traf=tu+td,tl=node.traffic_limit||0
var l1=latest.load&&latest.load.load1!==undefined?latest.load.load1:latest.load1,l5=latest.load&&latest.load.load5!==undefined?latest.load.load5:latest.load5,l15=latest.load&&latest.load.load15!==undefined?latest.load.load15:latest.load15,cores=node.cpu_cores||1
function lc(v){return v>=cores*2?'high':v>=cores*1?'medium':'low'}
var leftRows=[{l:'CPU 型号',v:node.cpu_name||'-'},{l:'核心数',v:node.cpu_cores?'× '+node.cpu_cores:'-'},{l:'架构',v:node.arch||'-'},{l:'虚拟化',v:node.virtualization||'-'},{l:'操作系统',v:(node.os||'-').split(' ').slice(0,2).join(' ')},{l:'内存',v:bytes(node.mem_total)},{l:'Swap',v:(node.swap_total||0)>0?bytes(node.swap_total):'无'},{l:'磁盘',v:bytes(node.disk_total)}]
if(node.gpu_name&&node.gpu_name!=='None'&&node.gpu_name!=='-'){leftRows.push({l:'GPU',v:node.gpu_name})};var rightRows=[{l:'进程数',v:latest.process||'-'},{l:'更新',v:age(latest.updated_at)},{l:'到期',v:node.expired_at?new Date(node.expired_at).toLocaleDateString('zh-CN'):'-'}]
if(l1!=null&&l1!==undefined){rightRows.splice(rightRows.findIndex(function(r){return r.l==='更新'})+1,0,{l:'负载',isLoad:true,v1:l1,v5:l5,v15:l15,cores:cores})}
function rr(r){if(r.type==='header')return'<div class="sysinfo-header">'+r.l+'</div>';if(r.type==='metric')return'<div class="sysinfo-row"><span class="lbl">'+r.l+'</span><div class="mini-bar-wrap"><span class="val val-'+r.cls+'">'+r.pct.toFixed(1)+'%</span><div class="mini-bar"><div class="mini-bar-fill fill-'+r.cls+'" style="width:'+Math.min(r.pct,100)+'%"></div></div></div></div>';if(r.isLoad)return'<div class="sysinfo-row"><span class="lbl">'+r.l+'</span><div class="load-row"><span class="load-badge '+lc(r.v1)+'">1m '+(r.v1!==undefined?r.v1:'--')+'</span><span class="load-badge '+lc(r.v5)+'">5m '+(r.v5!==undefined?r.v5:'--')+'</span><span class="load-badge '+lc(r.v15)+'">15m '+(r.v15!==undefined?r.v15:'--')+'</span></div></div>';return'<div class="sysinfo-row"><span class="lbl">'+r.l+'</span><span class="val">'+r.v+'</span></div>'}
var tp=tl>0?(traf/tl)*100:0,ps=node.price?(node.currency||'¥')+node.price+'/'+(node.billing_cycle===365?'年':node.billing_cycle===30?'月':node.billing_cycle===1095?'3年':node.billing_cycle===0?'永久':'期'):'无',dl=node.expired_at?Math.max(0,Math.ceil((new Date(node.expired_at).getTime()-Date.now())/86400000)):null
$('detail-hw').innerHTML='<div class="sysinfo-single">'+leftRows.map(rr).join('')+'</div>'
$('detail-status').innerHTML='<div class="sysinfo-single">'+rightRows.map(rr).join('')+'</div><div class="sysinfo-bill"><span class="bill-chip">'+ps+'</span><span class="bill-chip'+(tp>=80?' danger':'')+'">📊 '+bytes(traf)+(tl>0?'/'+bytes(tl):'')+'</span><span class="bill-chip'+(dl!==null&&dl<15?' danger':'')+'">📅 '+(dl!==null?dl+'天':'永久')+'</span></div>'
    var tags=node.tags?String(node.tags).split(',').filter(function(t){return t.trim()}):[],tcp=(latest.connections&&latest.connections.tcp)||0,udp=(latest.connections&&latest.connections.udp)||0,te=$('detail-tags')
    if(tags.length===0&&!tcp&&!udp){te.classList.add('hidden')}else{te.classList.remove('hidden');var th='';var ch='';if(tags.length){th='<div class="tags-list">';for(let _i=0;_i<tags.length;_i++){th+='<span class="tag-chip">'+tags[_i].trim()+'</span>'}th+='</div>'}if(tcp||udp){ch='<div class="conn-row"><span class="conn-item">'+tcp+' TCP</span><span class="conn-item">'+udp+' UDP</span></div>'}te.innerHTML='<div class="tags-title">标签 · 连接</div>'+th+ch}$('badge-cpu').textContent=cpu.toFixed(1)+'%';$('badge-mem').textContent=mp.toFixed(1)+'%';$('badge-net').textContent='↑ '+bytes(nu)+'/s · ↓ '+bytes(nd)+'/s'
$('detail-loading').classList.add('hidden');$('detail-content').classList.remove('hidden')
requestAnimationFrame(function(){requestAnimationFrame(function(){var cpuPts=pts.map(function(r){return{r:(r.cpu&&r.cpu.usage)||0,t:new Date(r.updated_at)}}),memPts=pts.map(function(r){var t=(r.ram&&r.ram.total)||node.mem_total||1,u=(r.ram&&r.ram.used)||0;return{r:t>0?(u/t)*100:0,t:new Date(r.updated_at)}}),netPts=pts.map(function(r){return{u:(r.network&&r.network.up)||0,d:(r.network&&r.network.down)||0,t:new Date(r.updated_at)}})
renderDetailCharts(cpuPts,memPts,netPts)})})}
function renderDetailCharts(cpuPts,memPts,netPts){
if(window._charts){for(var k in window._charts){if(window._charts[k]){window._charts[k].destroy()}}}window._charts={}
function gd(ctx,top,bottom,col){
var c=col.replace('rgba(','').replace(')','').split(',').map(Number)
var g=ctx.createLinearGradient(0,top,0,bottom)
g.addColorStop(0,'rgba('+c[0]+','+c[1]+','+c[2]+',0.18)')
g.addColorStop(0.5,'rgba('+c[0]+','+c[1]+','+c[2]+',0.04)')
g.addColorStop(1,'rgba(0,0,0,0)')
return g}
function bl(v){if(v>=1073741824)return(v/1073741824).toFixed(1)+'GB/s';if(v>=1048576)return(v/1048576).toFixed(1)+'MB/s';if(v>=1024)return(v/1024).toFixed(1)+'KB/s';return v.toFixed(0)+'B/s'}
function mk(id,labels,datasets,isNet){
var el=document.getElementById(id);if(!el)return
var ctx=el.getContext('2d')
new Chart(ctx,{
type:'line',
data:{labels:labels,datasets:datasets},
options:{
responsive:true,
maintainAspectRatio:false,
animation:{duration:500,easing:'easeOutQuart'},
plugins:{
legend:{display:false},
tooltip:{
backgroundColor:'rgba(0,0,0,0.75)',
titleFont:{size:11,family:'Inter,sans-serif'},
bodyFont:{size:12},
padding:{x:8,y:6},
borderColor:'rgba(255,255,255,0.08)',
borderWidth:1,
cornerRadius:6,
displayColors:isNet,
boxPadding:{x:4,y:2},
callbacks:{
title:function(its){return its[0].label},
label:function(it){
if(isNet)return it.dataset.label+': '+bl(it.raw)
return it.raw.toFixed(1)+'%'}
}}},
scales:{
x:{display:true,grid:{display:false},ticks:{color:'rgba(255,255,255,0.3)',font:{size:10,family:'Inter,sans-serif'},maxTicksLimit:8}},
y:{display:false,beginAtZero:true,min:0}},
interaction:{mode:'index',intersect:false}}})}
var lbs=cpuPts.map(function(p){return p.t.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})})
mk('chart-cpu',lbs,[{label:'CPU',data:cpuPts.map(function(p){return p.r}),borderColor:'#10b981',backgroundColor:function(c){if(!c.chart.chartArea)return;return gd(c.chart.ctx,c.chart.chartArea.top,c.chart.chartArea.bottom,'rgba(16,185,129,1)')},tension:0.4,fill:true,pointRadius:0,pointHoverRadius:3,borderWidth:2}],false)
mk('chart-mem',lbs,[{label:'MEM',data:memPts.map(function(p){return p.r}),borderColor:'#818cf8',backgroundColor:function(c){if(!c.chart.chartArea)return;return gd(c.chart.ctx,c.chart.chartArea.top,c.chart.chartArea.bottom,'rgba(129,140,248,1)')},tension:0.4,fill:true,pointRadius:0,pointHoverRadius:3,borderWidth:2}],false)
var nlbs=netPts.map(function(p){return p.t.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})})
mk('chart-net',nlbs,[{label:'↑ 上行',data:netPts.map(function(p){return p.u}),borderColor:'#f59e0b',backgroundColor:function(c){if(!c.chart.chartArea)return;return gd(c.chart.ctx,c.chart.chartArea.top,c.chart.chartArea.bottom,'rgba(245,158,11,1)')},tension:0.4,fill:true,pointRadius:0,pointHoverRadius:3,borderWidth:2},{label:'↓ 下行',data:netPts.map(function(p){return p.d}),borderColor:'#10b981',backgroundColor:function(c){if(!c.chart.chartArea)return;return gd(c.chart.ctx,c.chart.chartArea.top,c.chart.chartArea.bottom,'rgba(16,185,129,1)')},tension:0.4,fill:true,pointRadius:0,pointHoverRadius:3,borderWidth:2}],true)}

function setupEvents(){
var sb=$('search-box'),si=$('search-input');sb.addEventListener('click',function(e){e.stopPropagation();sb.classList.add('open');setTimeout(function(){si.focus()},50)})
document.addEventListener('click',function(e){if(!sb.contains(e.target)){sb.classList.remove('open');si.blur()}})
si.addEventListener('input',debounce(function(){searchQuery=this.value;render(false)},150))
var sBtn=$('sort-btn'),sM=$('sort-menu');sBtn.addEventListener('click',function(e){e.stopPropagation();sM.classList.toggle('hidden')})
document.addEventListener('click',function(){sM.classList.add('hidden')});sM.querySelectorAll('.dropdown-item').forEach(function(item){item.addEventListener('click',function(){sortMode=this.dataset.sort;localStorage.setItem('nodeSort',sortMode);updateSortUI();render(false);sM.classList.add('hidden')})})
$('grid-view').addEventListener('click',function(e){var card=e.target.closest('.node-card');if(!card)return;var uuid=card.dataset.uuid;if(uuid){history.pushState({uuid:uuid},'','/instance/'+encodeURIComponent(uuid));showDetailView(uuid)}})
document.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){var t=e.target.closest('[data-uuid]');if(t){e.preventDefault();var uuid=t.dataset.uuid;history.pushState({uuid:uuid},'','/instance/'+encodeURIComponent(uuid));showDetailView(uuid)}}})
$('back-to-top').addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});$('detail-back').addEventListener('click',function(){history.pushState(null,'','/');showListView()});updateSortUI()}

function updateSortUI(){var o=SORT_OPTIONS.find(function(o){return o.value===sortMode});$('sort-label').textContent=o?o.label:'默认';$('sort-menu').querySelectorAll('.dropdown-item').forEach(function(item){item.classList.toggle('active',item.dataset.sort===sortMode)})}

function setupScroll(){var bt=$('back-to-top'),scrolled=false,ticking=false;window.addEventListener('scroll',function(){if(!ticking){window.requestAnimationFrame(function(){var y=window.scrollY||document.documentElement.scrollTop;if(y>25&&!scrolled){scrolled=true;bt.classList.add('visible')}else if(y<=25&&scrolled){scrolled=false;bt.classList.remove('visible')};ticking=false});ticking=true}},{passive:true})
}

function setupRouter(){window.addEventListener('popstate',function(e){var p=window.location.pathname,m=p.match(/^\/instance\/(.+)$/);if(m&&m[1])showDetailView(decodeURIComponent(m[1]));else showListView()});var p=window.location.pathname,m=p.match(/^\/instance\/(.+)$/);if(m&&m[1])showDetailView(decodeURIComponent(m[1]))}


var _connOk = true;

function showConnToast(msg, ok) {
  var t = document.getElementById('conn-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('online', 'offline', 'visible');
  t.classList.add(ok ? 'online' : 'offline', 'visible');
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(function() { t.classList.remove('visible'); }, 4000);
}

// Override fetchJSON to track connection status
var _origFetchJSON = fetchJSON;
fetchJSON = async function(url, timeoutMs) {
  try {
    var result = await _origFetchJSON(url, timeoutMs);
    if (!_connOk) {
      _connOk = true;
      showConnToast('已恢复连接', true);
    }
    return result;
  } catch(e) {
    if (_connOk) {
      _connOk = false;
      showConnToast('连接中断，正在重试…', false);
    }
    return null;
  }
};

function startFooterUptime(){function u(){var d=Math.floor((Date.now()-siteStart)/1000),dd=Math.floor(d/86400),hh=Math.floor((d%86400)/3600),mm=Math.floor((d%3600)/60);var e=$('footer-uptime');if(e)e.textContent='🛰️ 本站已稳定运行 '+dd+' 日 '+hh+' 时 '+mm+' 分 🌌'}u();setInterval(u,60000)}
function startClock(){function t(){var e=$('stat-time-value');if(e)e.textContent=new Date().toLocaleTimeString('zh-CN',{hour12:false})}t();setInterval(t,1000)}

setupEvents();setupScroll();loadData().then(function(){var v=$('bg-video');if(window.matchMedia('prefers-reduced-motion:reduce').matches){v.style.opacity='0';$('poster').style.opacity='1';return}var io=new IntersectionObserver(function(e){if(e[0].isIntersecting){v.play().then(function(){v.style.opacity='1';$('poster').style.opacity='0'}).catch(function(){});io.disconnect()}});io.observe(v)});startClock();startFooterUptime();setupRouter()
