// Motor independente. Valores monetários são centavos inteiros.
const inteiro=(n,nome)=>{if(!Number.isSafeInteger(n)||n<0)throw new TypeError(nome+' deve ser inteiro não negativo em centavos');return n};
function data(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Data inválida');const [y,m,d]=s.split('-').map(Number),x=new Date(Date.UTC(y,m-1,d));if(x.getUTCFullYear()!==y||x.getUTCMonth()!==m-1||x.getUTCDate()!==d)throw Error('Data inválida');return {y,m,d}}
const ultimo=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
const iso=(y,m,d)=>[String(y).padStart(4,'0'),String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
function mesOffset(y,m,n){const d=new Date(Date.UTC(y,m-1+n,1));return [d.getUTCFullYear(),d.getUTCMonth()+1]}
const diaValido=d=>Number.isInteger(d)&&d>=1&&d<=31;
export function cicloCategoria(compra,fechamento){
 if(!diaValido(fechamento))return {dadosFaltando:['fechamento do ciclo']};
 const {y,m,d}=data(compra),encerramento=Math.min(fechamento,ultimo(y,m));
 const [cy,cm]=mesOffset(y,m,d>encerramento?1:0),[py,pm]=mesOffset(cy,cm,-1),diaAnterior=Math.min(fechamento,ultimo(py,pm));
 const inicio=new Date(Date.UTC(py,pm-1,diaAnterior+1)),fim=iso(cy,cm,Math.min(fechamento,ultimo(cy,cm)));
 return {inicio:iso(inicio.getUTCFullYear(),inicio.getUTCMonth()+1,inicio.getUTCDate()),fim,mes:iso(cy,cm,1).slice(0,7),nome:new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(cy,cm-1,1))),dadosFaltando:[]};
}
export function parcelasCentavos(total,qtd){inteiro(total,'total');if(!Number.isInteger(qtd)||qtd<1||qtd>120)throw Error('Parcelas devem estar entre 1 e 120');const base=Math.floor(total/qtd),resto=total%qtd;return Array.from({length:qtd},(_,i)=>base+(i<resto?1:0))}
export function compraCredito(compra,cartao){
 const faltam=[];if(!diaValido(cartao?.fechamento))faltam.push('fechamento do cartão');if(!diaValido(cartao?.vencimento))faltam.push('vencimento do cartão');if(faltam.length)return {dadosFaltando:faltam,parcelas:[]};
 const {y,m,d}=data(compra.data),p=parcelasCentavos(compra.valor,compra.parcelas||1),primeira=(d>cartao.fechamento?1:0)+(cartao.vencimento<=cartao.fechamento?1:0);
 return {dadosFaltando:[],parcelas:p.map((valor,i)=>{const [ano,mes]=mesOffset(y,m,primeira+i);return {numero:i+1,valor,mes:iso(ano,mes,1).slice(0,7)}})};
}
export function lancamento(compra,fechamento,cartao){
 const ciclo=cicloCategoria(compra.data,fechamento);if(compra.forma==='credito')return {ciclo,...compraCredito(compra,cartao),pagamentoAvista:null};
 if(!['debito','pix','dinheiro'].includes(compra.forma))throw Error('Forma de pagamento inválida');
 inteiro(compra.valor,'valor');data(compra.data);return {ciclo,parcelas:[],dadosFaltando:[],pagamentoAvista:{mes:compra.data.slice(0,7),valor:compra.valor}};
}
export function fatura({total=null,itens=[],adicional=0}){
 if(total!==null)inteiro(total,'total');inteiro(adicional,'adicional');let soma=0;const ids=new Set();for(const i of itens){if(!i.id||ids.has(i.id))throw Error('Item duplicado ou sem identificação');ids.add(i.id);soma+=inteiro(i.valor,'item')}
 const revisar=total!==null&&soma>total;return {itens:soma,total,adicional,valor:Math.max(total??0,soma)+adicional,aRevisar:revisar};
}
// Cada cartão/mês tem no máximo um total informado. Itens históricos só
// são incluídos quando a origem for explicitamente vinculada pelo usuário.
export function consolidarFaturas({mes,cartoes,compras,totais=[],adicionais=[],historicos=[]}){
 if(!/^\d{4}-\d{2}$/.test(mes))throw Error('Mês inválido');
 const ids=new Set(), map=new Map();
 for(const c of cartoes){if(!c.id||ids.has(c.id))throw Error('Cartão ausente ou repetido');ids.add(c.id);map.set(c.id,{cartaoId:c.id,itens:[],total:null,adicional:0})}
 const usados=new Set();
 function destino(x){if(x.mes!==mes)return null;const d=map.get(x.cartaoId);if(!d)throw Error('Cartão da fatura não encontrado');return d}
 for(const x of compras){const d=destino(x);if(!d)continue;if(!x.id||usados.has(x.id))throw Error('Compra ou parcela repetida');usados.add(x.id);d.itens.push({id:x.id,valor:inteiro(x.valor,'compra')})}
 for(const x of historicos){const d=destino(x);if(!d)continue;if(!x.id||usados.has(x.id))throw Error('Parcela histórica repetida');usados.add(x.id);d.itens.push({id:x.id,valor:inteiro(x.valor,'parcela histórica')})}
 for(const x of totais){const d=destino(x);if(!d)continue;if(d.total!==null)throw Error('Mais de um total para o mesmo cartão e mês');d.total=inteiro(x.valor,'total')}
 for(const x of adicionais){const d=destino(x);if(!d)continue;if(!x.id||usados.has(x.id))throw Error('Adicional repetido');usados.add(x.id);d.adicional+=inteiro(x.valor,'adicional')}
 const detalhes=[...map.values()].map(d=>({cartaoId:d.cartaoId,...fatura(d)}));
 return {valor:detalhes.reduce((n,d)=>n+d.valor,0),aRevisar:detalhes.some(d=>d.aRevisar),detalhes};
}
export function obrigacoesMes(obrigações,mes){
 const ids=new Set(),vinculos=new Set();let valor=0;const detalhes=[];for(const o of obrigações){if(!o.id||ids.has(o.id))throw Error('Obrigação duplicada ou sem identificação');ids.add(o.id);if(o.mes!==mes)continue;
 if(o.tipo==='pagamento_fatura')throw Error('Pagamento de fatura não deve criar nova obrigação');
 let resultado;if(o.tipo==='fatura'){resultado=fatura(o);for(const i of o.itens||[]){if(vinculos.has(i.id))throw Error('Origem vinculada mais de uma vez');vinculos.add(i.id)}}else {if(!['conta','avista','outro'].includes(o.tipo))throw Error('Tipo inválido');if(o.origemId){if(vinculos.has(o.origemId))throw Error('Origem vinculada mais de uma vez');vinculos.add(o.origemId)}resultado={valor:inteiro(o.valor,'obrigação'),aRevisar:false}}
 valor+=resultado.valor;detalhes.push({id:o.id,tipo:o.tipo,status:o.status||'prevista',estadoDados:o.estadoDados||'confirmado',...resultado});
 }return {valor,detalhes};
}
export function limitesRestantes(limites,mes){
 let restante=0;const categorias=[];for(const l of limites){inteiro(l.limite,'limite');inteiro(l.gasto,'gasto');const falta=Math.max(0,l.limite-l.gasto),excesso=Math.max(0,l.gasto-l.limite);const estimado=l.mesPagamento===mes?falta:0;restante+=estimado;categorias.push({...l,restante:falta,excesso,estimado})}return {restante,categorias};
}
export function prever({mes,renda,obrigações,limites,meta=0,dadosFaltando=[],rendaEstado='confirmado'}){
 if(renda==null)return {dadosFaltando:[...dadosFaltando,'renda'],prevista:null,simulada:null,situacao:null};inteiro(renda,'renda');inteiro(meta,'meta');
 const obs=obrigacoesMes(obrigações,mes),lim=limitesRestantes(limites,mes),prevista=renda-obs.valor,simulada=prevista-lim.restante,situacao=simulada<0?'previsão negativa':simulada<meta?'abaixo':'atingida';
 return {prevista,simulada,situacao,diferencaMeta:simulada-meta,dadosFaltando:[...dadosFaltando],completa:dadosFaltando.length===0,fontes:{renda:rendaEstado,obrigacoes:obs.detalhes,limites:'simulado'},limites:lim.categorias};
}
export function sugerirReducoes(limites,deficit){inteiro(deficit,'déficit');let faltam=deficit;const propostas=[];for(const c of limites.filter(x=>x.flexivel===true).sort((a,b)=>(b.restante??Math.max(0,b.limite-b.gasto))-(a.restante??Math.max(0,a.limite-a.gasto)))){const disponivel=c.restante??Math.max(0,c.limite-c.gasto),reducao=Math.min(disponivel,faltam);if(reducao){propostas.push({id:c.id,reducao,novoLimite:c.limite-reducao});faltam-=reducao}if(!faltam)break}return {propostas,faltam}}
export function aplicarSugestoes(limites,propostas,acao,edicoes={}){if(acao==='ignorar')return limites.map(x=>({...x}));if(!['aceitar','editar'].includes(acao))throw Error('Confirmação necessária');return limites.map(x=>{const p=propostas.find(a=>a.id===x.id);if(!p)return {...x};const n=acao==='editar'?(edicoes[x.id]??p.novoLimite):p.novoLimite;inteiro(n,'limite');return {...x,limite:n}})}
