document.getElementById('criar').addEventListener('click', async () => {
  const valor = document.getElementById('valor').value;
  const solicitacao = document.getElementById('solicitacao').value;
  const resp = await fetch('/api/create-cob', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ valor, solicitacaoPagador: solicitacao })
  });
  const data = await resp.json();
  if (!data.success) {
    alert('Erro ao criar cobrança: ' + (data.error || JSON.stringify(data.details)));
    return;
  }
  document.getElementById('resultado').hidden = false;
  if (data.qr) {
    document.getElementById('qr').innerHTML = '<img src="'+data.qr+'" alt="QR Code" />';
  } else {
    document.getElementById('qr').innerHTML = '<em>QR não retornado pela API</em>';
  }
  document.getElementById('dados').textContent = JSON.stringify(data.data, null, 2);
});
