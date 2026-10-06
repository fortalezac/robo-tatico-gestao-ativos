const STORAGE_KEY = 'robo-tatico-ativos-v1';

const defaultAssets = [
  { ativo: 'BBAS3', setor: 'Bancos', qtd: 3, pm: 19.85, precoAtual: 26.16, suporte: 25.5, resistencia: 27.0, status: 'XP' },
  { ativo: 'KLBN11', setor: 'Papel/Celulose', qtd: 25, pm: 19.46, precoAtual: 18.39, suporte: 18.0, resistencia: 19.1, status: 'XP' },
  { ativo: 'ENGI3', setor: 'Elétrica', qtd: 2, pm: 12.33, precoAtual: 13.35, suporte: 13.1, resistencia: 13.8, status: 'Rico' },
  { ativo: 'EQTL3', setor: 'Elétrica', qtd: 12, pm: 39.83, precoAtual: 47.97, suporte: 47.0, resistencia: 49.5, status: 'Rico' },
  { ativo: 'RAIZ4', setor: 'Combustíveis', qtd: 220, pm: 0.27, precoAtual: 0.36, suporte: 0.34, resistencia: 0.39, status: 'Rico' },
  { ativo: 'SMTO3', setor: 'Agro', qtd: 2, pm: 19.43, precoAtual: 19.87, suporte: 19.5, resistencia: 20.4, status: 'Rico' },
  { ativo: 'JALL3', setor: 'Agro', qtd: 35, pm: 2.32, precoAtual: 2.67, suporte: 2.58, resistencia: 2.8, status: 'Rico' },
  { ativo: 'ABEV3', setor: 'Bebidas', qtd: 5, pm: 15.67, precoAtual: 16.59, suporte: 16.3, resistencia: 17.1, status: 'Rico' },
  { ativo: 'TTEN3', setor: 'Têxtil', qtd: 8, pm: 10.56, precoAtual: 11.7, suporte: 11.4, resistencia: 12.1, status: 'Rico' },
  { ativo: 'CMIG4', setor: 'Elétrica', qtd: 0, pm: 0, precoAtual: 12.0, suporte: 11.7, resistencia: 12.6, status: 'Radar' },
  { ativo: 'CXSE3', setor: 'Seguros', qtd: 0, pm: 0, precoAtual: 14.5, suporte: 14.1, resistencia: 15.2, status: 'Radar' },
  { ativo: 'SANB11', setor: 'Bancos', qtd: 0, pm: 0, precoAtual: 15.2, suporte: 14.8, resistencia: 16.0, status: 'Radar' }
];

let dashboardData = loadState();
let chartInstance = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardData));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return [...defaultAssets];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : [...defaultAssets];
  } catch {
    return [...defaultAssets];
  }
}

function currency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function getMetaLucro() {
  return Number.parseFloat(document.getElementById('metaLucro').value || 5) || 5;
}

function getTetoRadar() {
  return Number.parseFloat(document.getElementById('tetoRadar').value || 20) || 20;
}

function normalizeTicker(ticker) {
  const cleaned = ticker.trim().toUpperCase();
  if (!cleaned) return '';
  if (cleaned.includes('.')) return cleaned;
  return `${cleaned}.SA`;
}

function assetMarketValue(asset) {
  return asset.qtd > 0 ? asset.qtd * asset.precoAtual : 0;
}

function assetGain(asset) {
  if (asset.qtd <= 0) return 0;
  return asset.qtd * asset.precoAtual - asset.qtd * asset.pm;
}

function calculateResumo() {
  const ativos = dashboardData;
  const patrimoniosPorConta = {
    Rico: 0,
    XP: 0
  };

  ativos.forEach((asset) => {
    if (asset.status === 'Rico') {
      patrimoniosPorConta.Rico += assetMarketValue(asset);
    }

    if (asset.status === 'XP') {
      patrimoniosPorConta.XP += assetMarketValue(asset);
    }
  });

  const resultadoBruto = dashboardData.reduce((total, asset) => total + assetGain(asset), 0);
  const caixa = Math.max(resultadoBruto * 0.7, 0);
  const bolso = Math.max(resultadoBruto * 0.2, 0);

  return {
    Rico: patrimoniosPorConta.Rico,
    XP: patrimoniosPorConta.XP,
    patrimonioTotal: patrimoniosPorConta.Rico + patrimoniosPorConta.XP + caixa + bolso,
    resultadoBruto,
    caixa,
    bolso
  };
}

function getStatusBadge(status) {
  if (status === 'XP') return '<span class="badge xp">XP</span>';
  if (status === 'Rico') return '<span class="badge rico">Rico</span>';
  return '<span class="badge radar">Radar</span>';
}

function buildAlertText(asset, metaLucro) {
  if (asset.qtd <= 0) {
    const inRadar = asset.precoAtual <= getTetoRadar();
    if (inRadar) {
      return '<span class="muted-text">⚡ Abaixo do teto do radar — bom para aporte</span>';
    }
    return '<span class="muted-text">📉 No radar — aguardando melhor preço</span>';
  }

  const ganho = assetGain(asset);
  const percentual = asset.pm !== 0 ? (ganho / (asset.qtd * Math.abs(asset.pm))) * 100 : 0;

  if (percentual >= metaLucro) {
    return `<span class="positive">✅ Alvo atingido: ${currency(ganho)} (${percentual.toFixed(2)}%)</span>`;
  }

  if (ganho < 0) {
    return `<span class="negative">⚠️ ${currency(ganho)} (${percentual.toFixed(2)}%)</span>`;
  }

  return `<span class="positive">📈 ${currency(ganho)} (${percentual.toFixed(2)}%)</span>`;
}

function renderTable() {
  const tbody = document.getElementById('tabelaAtivos');
  tbody.innerHTML = '';

  const metaLucro = getMetaLucro();

  dashboardData.forEach((asset) => {
    const row = document.createElement('tr');
    const ganho = assetGain(asset);
    const percentual = asset.pm !== 0 ? (ganho / (asset.qtd * Math.abs(asset.pm))) * 100 : 0;
    const identidade = asset.qtd > 0 ? `${asset.qtd} un / ${currency(asset.pm)}` : '0 un / Radar';

    row.innerHTML = `
      <td>${getStatusBadge(asset.status)}</td>
      <td><strong>${asset.ativo}</strong></td>
      <td><span class="sector-pill">${asset.setor}</span></td>
      <td>${identidade}</td>
      <td>${currency(asset.precoAtual)}</td>
      <td>${currency(asset.suporte)}</td>
      <td>${currency(asset.resistencia)}</td>
      <td>${buildAlertText(asset, metaLucro)}${(asset.qtd > 0 && percentual >= metaLucro) ? '<br><span class="muted-text">Venda recomendada após confirmação de tendência</span>' : ''}</td>
    `;

    tbody.appendChild(row);
  });
}

function renderSummary() {
  const summary = calculateResumo();

  document.getElementById('patrimonioTotal').textContent = currency(summary.patrimonioTotal);
  document.getElementById('resumoConta').textContent = `Rico: ${currency(summary.Rico)} | XP: ${currency(summary.XP)}`;
  document.getElementById('valorRico').textContent = currency(summary.Rico);
  document.getElementById('valorXP').textContent = currency(summary.XP);
  document.getElementById('caixaBolso').textContent = currency(summary.caixa + summary.bolso);
  document.getElementById('caixaResumo').textContent = `Caixa (70%): ${currency(summary.caixa)} | Bolso (20%): ${currency(summary.bolso)}`;

  const ativosComValor = dashboardData.filter((asset) => asset.qtd > 0);
  const labels = ativosComValor.map((asset) => asset.ativo);
  const data = ativosComValor.map((asset) => assetMarketValue(asset));

  renderDoughnut(labels, data);
  renderOpportunityAlert(summary.caixa);
}

function renderOpportunityAlert(caixa) {
  const teto = getTetoRadar();
  const candidatos = dashboardData
    .filter((asset) => asset.qtd === 0 && asset.precoAtual <= teto)
    .sort((a, b) => a.precoAtual - a.suporte - (b.precoAtual - b.suporte));

  const alerta = document.getElementById('alertaAporte');

  if (!candidatos.length) {
    alerta.innerHTML = `<strong>🤖 Inteligência do Robô para Aporte Rápido:</strong> <span>Caixa livre em ${currency(caixa)}. Nenhum ativo no radar abaixo do teto configurado (${currency(teto)}). Aguarde o recuo do mercado.</span>`;
    return;
  }

  const melhor = candidatos[0];
  const quantidade = Math.max(1, Math.floor(caixa / melhor.precoAtual));
  alerta.innerHTML = `<strong>🤖 Sugestão do Robô para Reinvestimento:</strong> <span>Com ${currency(caixa)} em caixa, a recomendação tática é o ativo ${melhor.ativo} (${melhor.setor}). Oportunidade de compra com ${quantidade} unidade(s) a ${currency(melhor.precoAtual)} e alvo em ${currency(melhor.resistencia)}.</span>`;
}

function renderDoughnut(labels, data) {
  const ctx = document.getElementById('graficoPatrimonio');

  if (chartInstance) {
    chartInstance.destroy();
  }

  if (!labels.length || !data.length) {
    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Sem ativo'],
        datasets: [{ data: [1], backgroundColor: ['#e5e7eb'] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
    return;
  }

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#0047bb', '#ff7a00', '#27ae60', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#f97316', '#64748b'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

async function fetchAssetQuote(ticker) {
  const key = ticker.trim().toUpperCase();
  if (!key) return null;

  const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizeTicker(key))}`;

  try {
    const response = await fetch(quoteUrl + '?interval=1d&range=5d', { cache: 'no-store' });
    if (!response.ok) throw new Error('Yahoo response not ok');

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const close = result?.indicators?.quote?.[0]?.close?.filter((value) => value != null)?.at(-1);

    if (typeof close === 'number' && Number.isFinite(close)) {
      return Number(close.toFixed(2));
    }
  } catch {
    // silent fallback
  }

  return null;
}

async function sincronizarMercado() {
  const uniqueTickers = [...new Set(dashboardData.map((asset) => asset.ativo))];

  for (const ticker of uniqueTickers) {
    const price = await fetchAssetQuote(ticker);
    if (price !== null) {
      const asset = dashboardData.find((item) => item.ativo === ticker);
      if (asset) {
        asset.precoAtual = price;
      }
    }
  }

  saveState();
  renderTable();
  renderSummary();
}

function adicionarAtivoManual() {
  const ticker = document.getElementById('novoTicker').value.trim().toUpperCase();
  const setor = document.getElementById('novoSetor').value.trim() || 'Geral';
  const status = document.getElementById('novaCorretora').value;

  if (!ticker) {
    alert('Informe um ticker para adicionar ao monitoramento.');
    return;
  }

  const alreadyExists = dashboardData.some((item) => item.ativo === ticker);
  if (alreadyExists) {
    alert(`O ativo ${ticker} já está cadastrado.`);
    return;
  }

  dashboardData.push({
    ativo: ticker,
    setor,
    qtd: 0,
    pm: 0,
    precoAtual: 10,
    suporte: 9,
    resistencia: 11,
    status
  });

  saveState();
  renderTable();
  renderSummary();

  document.getElementById('novoTicker').value = '';
  document.getElementById('novoSetor').value = '';
}

function bindEvents() {
  document.getElementById('metaLucro').addEventListener('input', () => {
    renderTable();
    renderSummary();
  });

  document.getElementById('tetoRadar').addEventListener('input', () => {
    renderTable();
    renderSummary();
  });

  document.getElementById('btnVarredura').addEventListener('click', async () => {
    await sincronizarMercado();
  });

  document.getElementById('btnAdicionar').addEventListener('click', adicionarAtivoManual);
}

function boot() {
  bindEvents();
  renderTable();
  renderSummary();
}

boot();

window.addEventListener('storage', () => {
  dashboardData = loadState();
  renderTable();
  renderSummary();
});
