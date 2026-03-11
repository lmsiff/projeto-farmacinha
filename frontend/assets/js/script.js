const API = 'http://localhost:3000/api';
function getToken() {
    return localStorage.getItem('token');
}
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    }
    catch {
        return null;
    }
}
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = './index.html';
}
(function checkAuth() {
    if (!getToken() || !getUser()) {
        window.location.href = './index.html';
    }
})();
async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
            ...(options.headers || {}),
        },
    });
    if (res.status === 401) {
        logout();
        throw new Error('Sessão expirada.');
    }
    if (res.status === 204)
        return null;
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Erro na requisição');
    }
    return data;
}
const DOM = {
    get: (id) => document.getElementById(id),
    input: (id) => document.getElementById(id),
    select: (id) => document.getElementById(id),
    fmtDate: (raw) => {
        if (!raw)
            return '';
        const d = new Date(raw);
        const adjusted = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
        return adjusted.toLocaleDateString('pt-BR');
    },
    fmtDateISO: (raw) => {
        if (!raw)
            return '';
        const d = new Date(raw);
        const adjusted = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
        const y = adjusted.getFullYear();
        const m = String(adjusted.getMonth() + 1).padStart(2, '0');
        const day = String(adjusted.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },
    makeBtns: (section, id) => `<button class="btn-action edit" data-section="${section}" data-id="${id}" title="Editar">📋</button> ` +
        `<button class="btn-action delete" data-section="${section}" data-id="${id}" title="Excluir">✕</button>`,
};
function showToast(msg, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:12px;
      font-size:0.9rem;font-weight:600;z-index:9999;transition:opacity 0.3s;
      box-shadow:0 4px 16px rgba(0,0,0,0.15);
    `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.style.color = '#fff';
    toast.style.opacity = '1';
    const toastAny = toast;
    clearTimeout(toastAny._timeout);
    toastAny._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}
class DeleteModal {
    constructor() {
        this.onConfirm = null;
        this.modal = DOM.get('deleteModal');
        this.textEl = DOM.get('deleteModalText');
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal)
                this.close();
        });
        DOM.get('btnCancelDelete').addEventListener('click', () => this.close());
        DOM.get('btnConfirmDelete').addEventListener('click', async () => {
            if (this.onConfirm)
                await this.onConfirm();
            this.close();
        });
    }
    open(label, confirmFn, impacto = null) {
        this.textEl.innerHTML = `
      <strong style="font-size:1rem">Excluir "${label}"?</strong>
      <p style="margin-top:8px;color:#6b7280;font-size:0.88rem">Esta ação é <strong>irreversível</strong>.</p>
      ${impacto ? `<div style="
        margin-top:12px;padding:10px 14px;
        background:#fff7ed;border-left:3px solid #f97316;
        border-radius:6px;font-size:0.85rem;color:#92400e;line-height:1.5
      ">⚠️ ${impacto}</div>` : ''}
    `;
        this.onConfirm = confirmFn;
        this.modal.classList.add('open');
    }
    close() {
        this.modal.classList.remove('open');
        this.onConfirm = null;
    }
}
// ── FILTROS ─────────────────────────────────────────────────────────────
function normalizar(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function textoContem(campo, busca) {
    return normalizar(campo).includes(normalizar(busca));
}
class FilterManager {
    constructor(inputIds, countId, clearId, filterFn) {
        this.filterFn = filterFn;
        this.inputs = inputIds.map((id) => DOM.get(id)).filter(Boolean);
        this.countEl = DOM.get(countId);
        this.clearBtn = DOM.get(clearId);
        this.inputs.forEach((inp) => {
            if (inp.tagName === 'BUTTON') return;
            inp.addEventListener('input', () => this.apply());
        });
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clear());
        }
    }
    apply() {
        this.filterFn();
    }
    clear() {
        this.inputs.forEach((inp) => {
            if (inp.tagName === 'INPUT') inp.value = '';
            if (inp.tagName === 'BUTTON') {
                inp.dataset.active = 'false';
            }
        });
        this.apply();
    }
    setCount(visible, total) {
        if (!this.countEl) return;
        if (visible === total) {
            this.countEl.innerHTML = `<span>${total}</span> registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`;
        } else {
            this.countEl.innerHTML = `Exibindo <span>${visible}</span> de ${total} registro${total !== 1 ? 's' : ''}`;
        }
    }
}
// ────────────────────────────────────────────────────────────────────────
class PacientesManager {
    constructor() {
        this.editId = null;
        this._list = [];
        DOM.get('formBtn').addEventListener('click', () => this.save());
        this.filter = new FilterManager(
            ['fPacNome', 'fPacCpf', 'fPacEnd'],
            'fPacCount', 'fPacClear',
            () => this.applyFilter()
        );
        this.load();
    }
    async load() {
        try {
            const list = await apiFetch('/pacientes');
            this._list = list || [];
            this.applyFilter();
        }
        catch {
            showToast('Erro ao carregar pacientes', 'error');
        }
    }
    applyFilter() {
        const nome = DOM.get('fPacNome')?.value ?? '';
        const cpf = DOM.get('fPacCpf')?.value ?? '';
        const end = DOM.get('fPacEnd')?.value ?? '';
        const filtered = this._list.filter((p) =>
            textoContem(p.nome, nome) &&
            textoContem(p.cpf, cpf) &&
            textoContem(p.endereco, end)
        );
        this.render(filtered);
        this.filter.setCount(filtered.length, this._list.length);
    }
    render(list) {
        const tbody = DOM.get('pacientesBody');
        tbody.innerHTML = '';
        (list || []).forEach((p) => {
            const tr = document.createElement('tr');
            tr.dataset.id = String(p.id);
            tr.innerHTML = `
        <td>${p.nome}</td>
        <td>${p.cpf}</td>
        <td>${p.telefone}</td>
        <td>${DOM.fmtDate(p.dataNasc)}</td>
        <td>${p.endereco}</td>
        <td>${DOM.makeBtns('pacientes', p.id)}</td>
      `;
            tbody.appendChild(tr);
        });
        App.instance.receitasManager.syncSelectPacientes(this._list);
    }
    startEdit(id) {
        const row = DOM.get('pacientesBody').querySelector(`tr[data-id="${id}"]`);
        if (!row)
            return;
        const c = row.cells;
        DOM.input('pNome').value = c[0].textContent?.trim() ?? '';
        DOM.input('pCpf').value = c[1].textContent?.trim() ?? '';
        DOM.input('pTel').value = c[2].textContent?.trim() ?? '';
        DOM.input('pNasc').value = this.parseDisplayDate(c[3].textContent?.trim() ?? '');
        DOM.input('pEnd').value = c[4].textContent?.trim() ?? '';
        this.editId = parseInt(id);
        DOM.get('editBanner').style.display = 'block';
        DOM.get('formBtn').textContent = 'Atualizar Paciente';
        DOM.get('formTitle').textContent = 'Editar Paciente';
        App.instance.showSection('pacientes');
        setTimeout(() => DOM.input('pNome').scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
    parseDisplayDate(txt) {
        const p = txt.trim().split('/');
        return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : '';
    }
    reset() {
        DOM.get('pacienteForm').reset();
        this.editId = null;
        DOM.get('editBanner').style.display = 'none';
        DOM.get('formBtn').textContent = 'Salvar Paciente';
        DOM.get('formTitle').textContent = 'Cadastrar Paciente';
    }
    async save() {
        const nome = DOM.input('pNome').value.trim();
        if (!nome) {
            alert('Informe o nome!');
            return;
        }
        const payload = {
            nome,
            cpf: DOM.input('pCpf').value.trim(),
            telefone: DOM.input('pTel').value.trim(),
            dataNasc: DOM.input('pNasc').value,
            endereco: DOM.input('pEnd').value.trim(),
        };
        try {
            if (this.editId) {
                await apiFetch(`/pacientes/${this.editId}`, { method: 'PUT', body: JSON.stringify(payload) });
                showToast('Paciente atualizado!');
            }
            else {
                await apiFetch('/pacientes', { method: 'POST', body: JSON.stringify(payload) });
                showToast('Paciente cadastrado!');
            }
            this.reset();
            await this.load();
        }
        catch (e) {
            showToast(e.message, 'error');
        }
    }
    async delete(id, nome) {
        const impacto = 'Todas as <strong>receitas cadastradas</strong> para este paciente também serão excluídas, incluindo seus itens na fila de entrega.';
        App.instance.deleteModal.open(nome, async () => {
            try {
                await apiFetch(`/pacientes/${id}`, { method: 'DELETE' });
                showToast('Paciente excluído!');
                await this.load();
            }
            catch (e) {
                showToast(e.message, 'error');
            }
        }, impacto);
    }
}
class MedicamentosManager {
    constructor() {
        this.editId = null;
        this._list = [];
        DOM.get('medFormBtn').addEventListener('click', () => this.save());
        this.filter = new FilterManager(
            ['fMedNome', 'fMedAtivo', 'fMedLab', 'fMedEstoque'],
            'fMedCount', 'fMedClear',
            () => this.applyFilter()
        );
        // botão toggle estoque baixo
        const btnEstoque = DOM.get('fMedEstoque');
        if (btnEstoque) {
            btnEstoque.addEventListener('click', () => {
                const ativo = btnEstoque.dataset.active === 'true';
                btnEstoque.dataset.active = String(!ativo);
                this.applyFilter();
            });
        }
        this.load();
    }
    async load() {
        try {
            const list = await apiFetch('/medicamentos');
            this._list = list || [];
            this.applyFilter();
            return list;
        }
        catch {
            showToast('Erro ao carregar medicamentos', 'error');
            return [];
        }
    }
    applyFilter() {
        const nome = DOM.get('fMedNome')?.value ?? '';
        const ativo = DOM.get('fMedAtivo')?.value ?? '';
        const lab = DOM.get('fMedLab')?.value ?? '';
        const soBaixo = DOM.get('fMedEstoque')?.dataset.active === 'true';
        const filtered = this._list.filter((m) =>
            textoContem(m.nomeComercial, nome) &&
            textoContem(m.principioAtivo, ativo) &&
            textoContem(m.laboratorio, lab) &&
            (!soBaixo || m.quantidade <= 10)
        );
        this.render(filtered);
        this.filter.setCount(filtered.length, this._list.length);
    }
    render(list) {
        const tbody = DOM.get('medBody');
        tbody.innerHTML = '';
        (list || []).forEach((m) => {
            const tr = document.createElement('tr');
            tr.dataset.id = String(m.id);
            const val = m.validade ? m.validade.slice(0, 7).split('-').reverse().join('/') : '';
            const estoqueStyle = m.quantidade <= 10 ? 'color:#ef4444;font-weight:700' : '';
            tr.innerHTML = `
        <td>${m.nomeComercial}</td>
        <td>${m.principioAtivo}</td>
        <td>${m.dosagem}</td>
        <td>${m.laboratorio}</td>
        <td>${m.lote}</td>
        <td>${val}</td>
        <td style="${estoqueStyle}">${m.quantidade}${m.quantidade <= 10 ? ' ⚠️' : ''}</td>
        <td>${DOM.makeBtns('medicamentos', m.id)}</td>
      `;
            tbody.appendChild(tr);
        });
        App.instance.receitasManager.syncSelectMedicamentos(this._list);
    }
    startEdit(id) {
        const row = DOM.get('medBody').querySelector(`tr[data-id="${id}"]`);
        if (!row)
            return;
        const c = row.cells;
        DOM.input('mNome').value = c[0].textContent?.trim() ?? '';
        DOM.input('mAtivo').value = c[1].textContent?.trim() ?? '';
        DOM.input('mDose').value = c[2].textContent?.trim() ?? '';
        DOM.input('mLab').value = c[3].textContent?.trim() ?? '';
        DOM.input('mLote').value = c[4].textContent?.trim() ?? '';
        const vp = c[5].textContent?.trim().split('/') ?? [];
        if (vp.length === 2)
            DOM.input('mVal').value = `${vp[1]}-${vp[0]}-01`;
        DOM.input('mQtd').value = c[6].textContent?.trim() ?? '';
        this.editId = parseInt(id);
        DOM.get('medEditBanner').style.display = 'block';
        DOM.get('medFormBtn').textContent = 'Atualizar Medicamento';
        DOM.get('medFormTitle').textContent = 'Editar Medicamento';
        App.instance.showSection('medicamentos');
        setTimeout(() => DOM.input('mNome').scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
    reset() {
        DOM.get('medForm').reset();
        this.editId = null;
        DOM.get('medEditBanner').style.display = 'none';
        DOM.get('medFormBtn').textContent = 'Salvar Medicamento';
        DOM.get('medFormTitle').textContent = 'Cadastrar Medicamento';
    }
    async save() {
        const nome = DOM.input('mNome').value.trim();
        if (!nome) {
            alert('Informe o nome!');
            return;
        }
        const payload = {
            nomeComercial: nome,
            principioAtivo: DOM.input('mAtivo').value.trim(),
            dosagem: DOM.input('mDose').value.trim(),
            laboratorio: DOM.input('mLab').value.trim(),
            lote: DOM.input('mLote').value.trim(),
            validade: DOM.input('mVal').value,
            quantidade: parseInt(DOM.input('mQtd').value) || 0,
        };
        try {
            if (this.editId) {
                await apiFetch(`/medicamentos/${this.editId}`, { method: 'PUT', body: JSON.stringify(payload) });
                showToast('Medicamento atualizado!');
            }
            else {
                await apiFetch('/medicamentos', { method: 'POST', body: JSON.stringify(payload) });
                showToast('Medicamento cadastrado!');
            }
            this.reset();
            await this.load();
        }
        catch (e) {
            showToast(e.message, 'error');
        }
    }
    async delete(id, nome) {
        const impacto = 'Todas as <strong>receitas que contêm este medicamento</strong> terão o item removido. Receitas que ficarem sem nenhum medicamento serão <strong>excluídas automaticamente</strong>, junto com seus registros na fila de entrega.';
        App.instance.deleteModal.open(nome, async () => {
            try {
                await apiFetch(`/medicamentos/${id}`, { method: 'DELETE' });
                showToast('Medicamento excluído!');
                await this.load();
            }
            catch (e) {
                showToast(e.message, 'error');
            }
        }, impacto);
    }
}
class ReceitasManager {
    constructor() {
        this.editId = null;
        this._list = [];
        this.pacientes = [];
        this.voluntarios = [];
        this.medicamentos = [];
        DOM.get('btnAdicionarMed').addEventListener('click', () => this.addMedRow());
        DOM.get('receitaFormBtn').addEventListener('click', () => this.save());
        this.filter = new FilterManager(
            ['fRecMedico', 'fRecPaciente', 'fRecVoluntario', 'fRecMedicamento', 'fRecDe', 'fRecAte'],
            'fRecCount', 'fRecClear',
            () => this.applyFilter()
        );
        this.addMedRow();
        this.load();
    }
    async load() {
        try {
            const list = await apiFetch('/receitas');
            this._list = list || [];
            this.applyFilter();
        }
        catch {
            showToast('Erro ao carregar receitas', 'error');
        }
    }
    applyFilter() {
        const medico = DOM.get('fRecMedico')?.value ?? '';
        const paciente = DOM.get('fRecPaciente')?.value ?? '';
        const voluntario = DOM.get('fRecVoluntario')?.value ?? '';
        const medicamento = DOM.get('fRecMedicamento')?.value ?? '';
        const de = DOM.get('fRecDe')?.value ?? '';
        const ate = DOM.get('fRecAte')?.value ?? '';
        const filtered = this._list.filter((r) => {
            if (!textoContem(r.medico, medico)) return false;
            if (!textoContem(r.paciente?.nome ?? '', paciente)) return false;
            if (!textoContem(r.voluntario?.nome ?? '', voluntario)) return false;
            if (medicamento && !(r.itens || []).some((it) => textoContem(it.medicamento.nomeComercial, medicamento))) return false;
            const dataR = r.data ? r.data.slice(0, 10) : '';
            if (de && dataR < de) return false;
            if (ate && dataR > ate) return false;
            return true;
        });
        this.render(filtered);
        this.filter.setCount(filtered.length, this._list.length);
    }
    render(list) {
        const tbody = DOM.get('receitasBody');
        tbody.innerHTML = '';
        (list || []).forEach((r) => {
            const tr = document.createElement('tr');
            tr.dataset.id = String(r.id);
            const tags = (r.itens || []).map((item) => `<span class="med-tag">${item.medicamento.nomeComercial} ${item.medicamento.dosagem} × ${item.quantidade}</span>`).join('');
            tr.innerHTML = `
        <td>${DOM.fmtDate(r.data)}</td>
        <td>${r.medico}</td>
        <td>${r.paciente?.nome ?? ''}</td>
        <td>${tags}</td>
        <td>${r.voluntario?.nome ?? ''}</td>
        <td>${DOM.makeBtns('receitas', r.id)}</td>
      `;
            tbody.appendChild(tr);
        });
    }
    syncSelectPacientes(list) {
        this.pacientes = list;
        const sel = DOM.select('rPaciente');
        const cur = sel.value;
        sel.innerHTML =
            '<option value="">Selecione o paciente</option>' +
                list.map((p) => `<option value="${p.id}"${String(p.id) === cur ? ' selected' : ''}>${p.nome}</option>`).join('');
    }
    syncSelectVoluntarios(list) {
        this.voluntarios = list;
        const sel = DOM.select('rVol');
        const cur = sel.value;
        sel.innerHTML =
            '<option value="">Selecione o voluntário</option>' +
                list.map((v) => `<option value="${v.id}"${String(v.id) === cur ? ' selected' : ''}>${v.nome}</option>`).join('');
    }
    syncSelectMedicamentos(list) {
        this.medicamentos = list;
        DOM.get('medList').querySelectorAll('.r-med').forEach((sel) => {
            const cur = sel.value;
            sel.innerHTML =
                '<option value="">Selecione</option>' +
                    list.map((m) => `<option value="${m.id}" data-estoque="${m.quantidade}"${String(m.id) === cur ? ' selected' : ''}>${m.nomeComercial} ${m.dosagem} (${m.quantidade} em estoque)</option>`).join('');
        });
    }
    getMedOptions(selectedId = '') {
        return ('<option value="">Selecione</option>' +
            this.medicamentos.map((m) => `<option value="${m.id}" data-estoque="${m.quantidade}"${String(m.id) === String(selectedId) ? ' selected' : ''}>${m.nomeComercial} ${m.dosagem} (${m.quantidade} em estoque)</option>`).join(''));
    }
    addMedRow(medId = '', qtd = '') {
        const div = document.createElement('div');
        div.className = 'med-row';
        div.innerHTML =
            `<div class="form-group"><label>Medicamento</label><select class="r-med">${this.getMedOptions(medId)}</select></div>` +
                `<div class="form-group"><label>Qtd</label><input class="r-qtd" type="number" min="1" placeholder="30" value="${qtd}"></div>` +
                `<button type="button" class="btn-remove-med">−</button>`;
        const sel = div.querySelector('.r-med');
        const qtdInput = div.querySelector('.r-qtd');
        const updateMax = () => {
            const opt = sel.options[sel.selectedIndex];
            const estoque = opt ? parseInt(opt.dataset.estoque ?? '0') : 0;
            qtdInput.max = String(estoque);
            qtdInput.title = estoque > 0 ? `Máximo disponível: ${estoque}` : '';
            const val = parseInt(qtdInput.value);
            if (qtdInput.value && val > estoque) {
                qtdInput.setCustomValidity(`Máximo ${estoque} em estoque`);
                qtdInput.style.borderColor = '#ef4444';
                qtdInput.style.boxShadow = '0 0 0 2px #fee2e2';
            } else {
                qtdInput.setCustomValidity('');
                qtdInput.style.borderColor = '';
                qtdInput.style.boxShadow = '';
            }
        };
        sel.addEventListener('change', updateMax);
        qtdInput.addEventListener('input', updateMax);
        if (medId) setTimeout(updateMax, 0);
        div.querySelector('.btn-remove-med').addEventListener('click', () => {
            if (DOM.get('medList').children.length > 1)
                div.remove();
        });
        DOM.get('medList').appendChild(div);
    }
    getMedsFromForm() {
        return Array.from(DOM.get('medList').querySelectorAll('.med-row')).map((r) => ({
            medicamentoId: parseInt(r.querySelector('.r-med').value),
            quantidade: parseInt(r.querySelector('.r-qtd').value),
        }));
    }
    async startEdit(id) {
        try {
            const r = await apiFetch(`/receitas/${id}`);
            DOM.input('rData').value = DOM.fmtDateISO(r.data);
            DOM.input('rMedico').value = r.medico;
            DOM.select('rPaciente').value = String(r.pacienteId);
            DOM.select('rVol').value = String(r.voluntarioId);
            DOM.get('medList').innerHTML = '';
            (r.itens || []).forEach((item) => this.addMedRow(item.medicamentoId, item.quantidade));
            if (!r.itens?.length)
                this.addMedRow();
            this.editId = parseInt(id);
            DOM.get('receitaEditBanner').style.display = 'block';
            DOM.get('receitaFormBtn').textContent = 'Atualizar Receita';
            DOM.get('receitaFormTitle').textContent = 'Editar Receita';
            App.instance.showSection('receitas');
            setTimeout(() => DOM.input('rData').scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }
        catch (e) {
            showToast(e.message, 'error');
        }
    }
    reset() {
        DOM.get('receitaForm').reset();
        DOM.get('medList').innerHTML = '';
        this.addMedRow();
        this.editId = null;
        DOM.get('receitaEditBanner').style.display = 'none';
        DOM.get('receitaFormBtn').textContent = 'Salvar Receita';
        DOM.get('receitaFormTitle').textContent = 'Cadastrar Receita';
    }
    async save() {
        const data = DOM.input('rData').value;
        const medico = DOM.input('rMedico').value.trim();
        const pacienteId = parseInt(DOM.select('rPaciente').value);
        const voluntarioId = parseInt(DOM.select('rVol').value);
        const itens = this.getMedsFromForm();
        if (!data || !medico || !pacienteId || !voluntarioId) {
            alert('Preencha todos os campos!');
            return;
        }
        if (!itens.length || itens.some((i) => !i.medicamentoId || !i.quantidade)) {
            alert('Preencha todos os medicamentos!');
            return;
        }
        const payload = { data, medico, pacienteId, voluntarioId, itens };
        try {
            if (this.editId) {
                await apiFetch(`/receitas/${this.editId}`, { method: 'PUT', body: JSON.stringify(payload) });
                showToast('Receita atualizada!');
            }
            else {
                const novaReceita = await apiFetch('/receitas', { method: 'POST', body: JSON.stringify(payload) });
                await apiFetch('/fila', { method: 'POST', body: JSON.stringify({ receitaId: novaReceita.id }) });
                showToast('Receita cadastrada e adicionada à fila!');
            }
            this.reset();
            await this.load();
        }
        catch (e) {
            showToast(e.message, 'error');
        }
    }
    async delete(id) {
        const impacto = 'Esta receita será removida da <strong>fila de entrega</strong> e todos os seus <strong>itens de medicamentos</strong> serão excluídos.';
        App.instance.deleteModal.open(`Receita #${id}`, async () => {
            try {
                await apiFetch(`/receitas/${id}`, { method: 'DELETE' });
                showToast('Receita excluída!');
                await this.load();
            }
            catch (e) {
                showToast(e.message, 'error');
            }
        }, impacto);
    }
}
class VoluntariosManager {
    constructor() {
        this.editId = null;
        this._list = [];
        DOM.get('volFormBtn').addEventListener('click', () => this.save());
        this.filter = new FilterManager(
            ['fVolNome', 'fVolCpf'],
            'fVolCount', 'fVolClear',
            () => this.applyFilter()
        );
    }
    async load() {
        try {
            const list = await apiFetch('/voluntarios');
            this._list = (list || []).filter((v) => !v.isAdmin);
            this.applyFilter();
            App.instance.receitasManager.syncSelectVoluntarios(list || []);
            return list;
        }
        catch {
            showToast('Erro ao carregar voluntários', 'error');
            return [];
        }
    }
    applyFilter() {
        const nome = DOM.get('fVolNome')?.value ?? '';
        const cpf = DOM.get('fVolCpf')?.value ?? '';
        const filtered = this._list.filter((v) =>
            textoContem(v.nome, nome) &&
            textoContem(v.cpf, cpf)
        );
        this.render(filtered);
        this.filter.setCount(filtered.length, this._list.length);
    }
    render(list) {
        const tbody = DOM.get('volBody');
        tbody.innerHTML = '';
        (list || []).forEach((v) => {
            const tr = document.createElement('tr');
            tr.dataset.id = String(v.id);
            tr.innerHTML = `
        <td>${v.nome}</td>
        <td>${v.cpf}</td>
        <td>${v.telefone}</td>
        <td>${DOM.fmtDate(v.dataNasc)}</td>
        <td>${DOM.makeBtns('voluntarios', v.id)}</td>
      `;
            tbody.appendChild(tr);
        });
    }
    startEdit(id) {
        const row = DOM.get('volBody').querySelector(`tr[data-id="${id}"]`);
        if (!row)
            return;
        const c = row.cells;
        DOM.input('vNome').value = c[0].textContent?.trim() ?? '';
        DOM.input('vCpf').value = c[1].textContent?.trim() ?? '';
        DOM.input('vTel').value = c[2].textContent?.trim() ?? '';
        const p = c[3].textContent?.trim().split('/') ?? [];
        DOM.input('vNasc').value = p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : '';
        this.editId = parseInt(id);
        DOM.get('volEditBanner').style.display = 'block';
        DOM.get('volFormBtn').textContent = 'Atualizar Voluntário';
        DOM.get('volFormTitle').textContent = 'Editar Voluntário';
        App.instance.showSection('voluntarios');
        setTimeout(() => DOM.input('vNome').scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
    reset() {
        DOM.get('volForm').reset();
        this.editId = null;
        DOM.get('volEditBanner').style.display = 'none';
        DOM.get('volFormBtn').textContent = 'Salvar Voluntário';
        DOM.get('volFormTitle').textContent = 'Cadastrar Voluntário';
    }
    async save() {
        const nome = DOM.input('vNome').value.trim();
        if (!nome) {
            alert('Informe o nome!');
            return;
        }
        const senha = DOM.input('vSenha').value.trim();
        if (!this.editId && !senha) {
            alert('Informe a senha!');
            return;
        }
        const payload = {
            nome,
            cpf: DOM.input('vCpf').value.trim(),
            telefone: DOM.input('vTel').value.trim(),
            dataNasc: DOM.input('vNasc').value,
            ...(senha && { senha }),
        };
        try {
            if (this.editId) {
                await apiFetch(`/voluntarios/${this.editId}`, { method: 'PUT', body: JSON.stringify(payload) });
                showToast('Voluntário atualizado!');
            }
            else {
                await apiFetch('/voluntarios', { method: 'POST', body: JSON.stringify(payload) });
                showToast('Voluntário cadastrado!');
            }
            this.reset();
            await this.load();
        }
        catch (e) {
            showToast(e.message, 'error');
        }
    }
    async delete(id, nome) {
        const impacto = 'Todas as <strong>receitas cadastradas por este voluntário</strong> também serão excluídas, incluindo seus itens na fila de entrega.';
        App.instance.deleteModal.open(nome, async () => {
            try {
                await apiFetch(`/voluntarios/${id}`, { method: 'DELETE' });
                showToast('Voluntário excluído!');
                await this.load();
            }
            catch (e) {
                showToast(e.message, 'error');
            }
        }, impacto);
    }
}
class FilaManager {
    constructor() {
        this._list = [];
        this.dragged = null;
        this.checkStates = {};
        this.modal = DOM.get('filaModal');
        this.modalTit = DOM.get('filaModalTitulo');
        this.modalRec = DOM.get('filaModalReceita');
        this.modalMeds = DOM.get('filaModalMeds');
        this.filter = new FilterManager(
            ['fFilaPaciente', 'fFilaMedico', 'fFilaVoluntario', 'fFilaMedicamento'],
            'fFilaCount', 'fFilaClear',
            () => this.applyFilter()
        );
        this.initModalClose();
        this.load();
    }
    async load() {
        try {
            const list = await apiFetch('/fila');
            this._list = list || [];
            this.applyFilter();
        }
        catch {
            showToast('Erro ao carregar fila', 'error');
        }
    }
    applyFilter() {
        const paciente = DOM.get('fFilaPaciente')?.value ?? '';
        const medico = DOM.get('fFilaMedico')?.value ?? '';
        const voluntario = DOM.get('fFilaVoluntario')?.value ?? '';
        const medicamento = DOM.get('fFilaMedicamento')?.value ?? '';
        const filtered = this._list.filter((item) => {
            const r = item.receita;
            if (!textoContem(r.paciente?.nome ?? '', paciente)) return false;
            if (!textoContem(r.medico ?? '', medico)) return false;
            if (!textoContem(r.voluntario?.nome ?? '', voluntario)) return false;
            if (medicamento && !(r.itens || []).some((it) => textoContem(it.medicamento.nomeComercial, medicamento))) return false;
            return true;
        });
        this.render(filtered);
        this.filter.setCount(filtered.length, this._list.length);
    }
    render(list) {
        const container = DOM.get('filaContainer');
        container.innerHTML = '';
        if (!list.length) {
            container.innerHTML = '<p style="color:var(--muted);padding:24px">Nenhum item na fila.</p>';
            return;
        }
        list.forEach((item, i) => {
            const r = item.receita;
            const meds = (r.itens || []).map((it) => `${it.medicamento.nomeComercial} ${it.medicamento.dosagem} × ${it.quantidade}`);
            const card = document.createElement('div');
            const isEntregue = item.entregue === true;
            card.className = 'fila-card' + (isEntregue ? ' entregue' : '');
            card.draggable = true;
            card.dataset.id = String(item.id);
            card.dataset.meds = meds.join('|');
            card.dataset.medico = r.medico;
            card.dataset.voluntario = r.voluntario?.nome ?? '';
            card.dataset.data = DOM.fmtDate(r.data);
            card.innerHTML = `
        <span class="fila-order">${i + 1}</span>
        <h4>${r.paciente?.nome ?? ''}</h4>
        <div class="fila-info">
          <span>📅 ${DOM.fmtDate(r.data)}</span>
          <span>👨‍⚕️ ${r.medico}</span>
          <span>🙋 ${r.voluntario?.nome ?? ''}</span>
        </div>
        <div class="fila-meds-list">
          ${meds.map((m) => `<span class="fila-med-tag">${m}</span>`).join('')}
        </div>
        ${isEntregue ? '<span class="badge-entregue">✅ Entregue</span>' : ''}
      `;

            card.addEventListener('click', () => this.openModal(card));
            this.initDrag(card);
            container.appendChild(card);
        });
    }
    initDrag(card) {
        card.addEventListener('dragstart', () => {
            this.dragged = card;
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', async () => {
            card.classList.remove('dragging');
            this.dragged = null;
            await this.saveOrder();
        });
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!this.dragged || this.dragged === card)
                return;
            const container = DOM.get('filaContainer');
            const dn = this.dragged.nextSibling;
            const tn = card.nextSibling;
            container.insertBefore(this.dragged, tn);
            container.insertBefore(card, dn);
            this.updateOrderNumbers();
        });
    }
    updateOrderNumbers() {
        DOM.get('filaContainer').querySelectorAll('.fila-card').forEach((c, i) => {
            const b = c.querySelector('.fila-order');
            if (b)
                b.textContent = String(i + 1);
        });
    }
    async saveOrder() {
        const ids = Array.from(DOM.get('filaContainer').querySelectorAll('.fila-card'))
            .map((c) => parseInt(c.dataset.id));
        try {
            await apiFetch('/fila/reordenar', { method: 'PATCH', body: JSON.stringify({ ids }) });
        }
        catch {
            showToast('Erro ao reordenar fila', 'error');
        }
    }
    async marcarEntregue(id, card) {
        try {
            await apiFetch(`/fila/${id}/entregar`, { method: 'PATCH' });
            card.style.opacity = '0.4';
            const btn = card.querySelector('.btn-check');
            btn.classList.add('checked');
            btn.disabled = true;
            const s = document.createElement('span');
            s.className = 'status-entregue';
            s.textContent = 'Status: Entregue';
            btn.insertAdjacentElement('beforebegin', s);
            showToast('Marcado como entregue!');
            setTimeout(() => { card.remove(); }, 1500);
        }
        catch (e) {
            showToast(e.message, 'error');
        }
    }
    openModal(card) {
        const nome = card.querySelector('h4')?.textContent ?? '';
        const medico = card.dataset.medico ?? '—';
        const voluntario = card.dataset.voluntario ?? '—';
        const data = card.dataset.data ?? '—';
        const meds = (card.dataset.meds ?? '').split('|').map((m) => m.trim()).filter(Boolean);
        const filaId = parseInt(card.dataset.id);
        // Recupera estados salvos dos checkboxes
        const savedStates = this.checkStates[filaId] ?? {};
        this.modalTit.textContent = nome;
        this.modalRec.innerHTML =
            `<span style="margin-right:12px">📅 ${data}</span>` +
                `<span style="margin-right:12px">👨‍⚕️ ${medico}</span>` +
                `<span>🙋 ${voluntario}</span>`;
        this.modalMeds.innerHTML = '';
        // Progress
        const prog = document.createElement('p');
        prog.id = 'filaProgress';
        prog.style.cssText = 'font-size:0.85rem;color:var(--muted);margin-bottom:8px';
        this.modalMeds.appendChild(prog);
        meds.forEach((med, i) => {
            const label = document.createElement('label');
            label.style.cssText = `
      display:flex;align-items:center;gap:10px;padding:10px 12px;
      background:${savedStates[i] ? '#d1fae5' : '#f0fdff'};
      border-radius:8px;font-size:0.9rem;cursor:pointer;
      transition:background 0.2s;
      text-decoration:${savedStates[i] ? 'line-through' : 'none'};
      color:${savedStates[i] ? '#6b7280' : 'inherit'};
    `;
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = savedStates[i] ?? false;
            cb.style.cssText = 'width:16px;height:16px;cursor:pointer;accent-color:#10b981';
            cb.addEventListener('change', async () => {
                savedStates[i] = cb.checked;
                this.checkStates[filaId] = savedStates;
                label.style.background = cb.checked ? '#d1fae5' : '#f0fdff';
                label.style.textDecoration = cb.checked ? 'line-through' : 'none';
                label.style.color = cb.checked ? '#6b7280' : 'inherit';
                this.updateProgress(meds.length, filaId);
                const allChecked = meds.every((_, idx) => savedStates[idx]);
                await this.syncEntregue(filaId, card, allChecked);
            });
            label.appendChild(cb);
            label.appendChild(document.createTextNode(`💊 ${med}`));
            this.modalMeds.appendChild(label);
        });
        this.updateProgress(meds.length, filaId);
        this.modal.classList.add('open');
    }
    updateProgress(total, filaId) {
        const prog = document.getElementById('filaProgress');
        if (!prog)
            return;
        const states = this.checkStates[filaId] ?? {};
        const checked = Object.values(states).filter(Boolean).length;
        const s = total > 1 ? 's' : '';
        prog.innerHTML = `<b>${checked}</b> de ${total} medicamento${s} confirmado${s}`;
        prog.style.color = checked === total ? '#10b981' : 'var(--muted)';
    }
    async syncEntregue(filaId, card, entregue) {
        try {
            await apiFetch(`/fila/${filaId}/entregar`, { method: 'PATCH', body: JSON.stringify({ entregue }) });
            const badgeExistente = card.querySelector('.badge-entregue');
            if (entregue) {
                card.classList.add('entregue');
                if (!badgeExistente) {
                    const badge = document.createElement('span');
                    badge.className = 'badge-entregue';
                    badge.textContent = '✅ Entregue';
                    card.querySelector('.fila-meds-list').insertAdjacentElement('afterend', badge);
                }
                card.style.opacity = '0.6';
            }
            else {
                card.classList.remove('entregue');
                badgeExistente?.remove();
                card.style.opacity = '1';
            }
        }
        catch (e) {
            showToast(e.message, 'error');
        }
    }
    initModalClose() {
        DOM.get('filaModalFechar').addEventListener('click', () => this.modal.classList.remove('open'));
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal)
                this.modal.classList.remove('open');
        });
    }
}
class BarChart {
    constructor() {
        this.NS = 'http://www.w3.org/2000/svg';
        this.MES_NOMES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    }
    render(data) {
        const svg = document.querySelector('#barChartSvg');
        if (!svg)
            return;
        svg.innerHTML = '';
        const entries = Object.entries(data).sort();
        if (!entries.length)
            return;
        const W = 300, H = 140, padL = 32, padR = 8, padT = 12, padB = 28;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;
        const maxVal = Math.max(...entries.map((e) => e[1]), 1);
        const barW = (chartW / entries.length) * 0.55;
        const gap = chartW / entries.length;
        for (let i = 0; i <= 4; i++) {
            const y = padT + chartH - (i / 4) * chartH;
            const line = document.createElementNS(this.NS, 'line');
            line.setAttribute('x1', String(padL));
            line.setAttribute('x2', String(W - padR));
            line.setAttribute('y1', String(y));
            line.setAttribute('y2', String(y));
            line.setAttribute('stroke', '#e5e7eb');
            line.setAttribute('stroke-width', i === 0 ? '1.5' : '1');
            svg.appendChild(line);
        }
        entries.forEach(([mes, val], i) => {
            const barH = (val / maxVal) * chartH;
            const x = padL + i * gap + (gap - barW) / 2;
            const y = padT + chartH - barH;
            const gradId = `barGrad${i}`;
            let defs = svg.querySelector('defs');
            if (!defs) {
                defs = document.createElementNS(this.NS, 'defs');
                svg.insertBefore(defs, svg.firstChild);
            }
            const grad = document.createElementNS(this.NS, 'linearGradient');
            grad.setAttribute('id', gradId);
            grad.setAttribute('x1', '0');
            grad.setAttribute('y1', '0');
            grad.setAttribute('x2', '0');
            grad.setAttribute('y2', '1');
            const s1 = document.createElementNS(this.NS, 'stop');
            s1.setAttribute('offset', '0%');
            s1.setAttribute('stop-color', '#65c5da');
            const s2 = document.createElementNS(this.NS, 'stop');
            s2.setAttribute('offset', '100%');
            s2.setAttribute('stop-color', '#0e7490');
            grad.appendChild(s1);
            grad.appendChild(s2);
            defs.appendChild(grad);
            const rect = document.createElementNS(this.NS, 'rect');
            rect.setAttribute('x', String(x));
            rect.setAttribute('y', String(y));
            rect.setAttribute('width', String(barW));
            rect.setAttribute('height', String(barH));
            rect.setAttribute('rx', '4');
            rect.setAttribute('fill', `url(#${gradId})`);
            svg.appendChild(rect);
            const mesLabel = mes.slice(5);
            const mesNome = this.MES_NOMES[parseInt(mesLabel)] ?? mesLabel;
            const valLbl = document.createElementNS(this.NS, 'text');
            valLbl.setAttribute('x', String(x + barW / 2));
            valLbl.setAttribute('y', String(y - 4));
            valLbl.setAttribute('text-anchor', 'middle');
            valLbl.setAttribute('font-size', '8');
            valLbl.setAttribute('font-weight', '700');
            valLbl.setAttribute('fill', '#4fb4ca');
            valLbl.textContent = String(val);
            svg.appendChild(valLbl);
            const mesLbl = document.createElementNS(this.NS, 'text');
            mesLbl.setAttribute('x', String(x + barW / 2));
            mesLbl.setAttribute('y', String(H - padB + 14));
            mesLbl.setAttribute('text-anchor', 'middle');
            mesLbl.setAttribute('font-size', '9');
            mesLbl.setAttribute('fill', '#6b7280');
            mesLbl.textContent = mesNome;
            svg.appendChild(mesLbl);
        });
    }
}
class PizzaChart {
    constructor() {
        this.NS = 'http://www.w3.org/2000/svg';
        this.CORES = {
            '0-17': '#a5f3fc', '18-39': '#65c5da', '40-59': '#4fb4ca', '60+': '#0e7490',
        };
        this.LABELS = {
            '0-17': '0–17 anos', '18-39': '18–39 anos', '40-59': '40–59 anos', '60+': '60+ anos',
        };
    }
    render(data) {
        const svg = document.querySelector('#pizzaSvg');
        const legend = document.getElementById('pizzaLegend');
        if (!svg || !legend)
            return;
        svg.innerHTML = '';
        legend.innerHTML = '';
        const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;
        const cx = 100, cy = 100, r = 80, ri = 46;
        let startAngle = -Math.PI / 2;
        Object.entries(data).forEach(([key, val]) => {
            const slice = val / total;
            const endAngle = startAngle + slice * 2 * Math.PI;
            const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
            const xi1 = cx + ri * Math.cos(startAngle), yi1 = cy + ri * Math.sin(startAngle);
            const xi2 = cx + ri * Math.cos(endAngle), yi2 = cy + ri * Math.sin(endAngle);
            const large = slice > 0.5 ? 1 : 0;
            const path = document.createElementNS(this.NS, 'path');
            path.setAttribute('d', `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ri} ${ri} 0 ${large} 0 ${xi1} ${yi1} Z`);
            path.setAttribute('fill', this.CORES[key] ?? '#ccc');
            svg.appendChild(path);
            startAngle = endAngle;
            const pct = Math.round(slice * 100);
            const item = document.createElement('div');
            item.className = 'pizza-legend-item';
            item.innerHTML =
                `<span class="pizza-legend-dot" style="background:${this.CORES[key]}"></span>` +
                    `<span>${this.LABELS[key] ?? key}</span>` +
                    `<span class="pizza-legend-pct">${pct}%</span>`;
            legend.appendChild(item);
        });
        const bg = document.createElementNS(this.NS, 'circle');
        bg.setAttribute('cx', String(cx));
        bg.setAttribute('cy', String(cy));
        bg.setAttribute('r', String(ri));
        bg.setAttribute('fill', '#fff');
        svg.appendChild(bg);
        const txt = document.createElementNS(this.NS, 'text');
        txt.setAttribute('x', String(cx));
        txt.setAttribute('y', String(cy - 6));
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('font-size', '13');
        txt.setAttribute('font-weight', '700');
        txt.setAttribute('fill', '#1f2933');
        txt.textContent = String(total);
        svg.appendChild(txt);
        const sub = document.createElementNS(this.NS, 'text');
        sub.setAttribute('x', String(cx));
        sub.setAttribute('y', String(cy + 12));
        sub.setAttribute('text-anchor', 'middle');
        sub.setAttribute('font-size', '9');
        sub.setAttribute('fill', '#6b7280');
        sub.textContent = 'pacientes';
        svg.appendChild(sub);
    }
}
async function loadDashboard() {
    try {
        const data = await apiFetch('/relatorios/dashboard');
        DOM.get('totalReceitas').textContent = data.totais.receitas.toLocaleString('pt-BR');
        DOM.get('totalPacientes').textContent = data.totais.pacientes.toLocaleString('pt-BR');
        DOM.get('totalMedicamentos').textContent = data.totais.medicamentos.toLocaleString('pt-BR');
        DOM.get('totalVoluntarios').textContent = data.totais.voluntarios.toLocaleString('pt-BR');
        const rankList = DOM.get('rankList');
        rankList.innerHTML = '';
        const maxTotal = Math.max(...data.medicamentosMaisDistribuidos.map((m) => m.total), 1);
        data.medicamentosMaisDistribuidos.slice(0, 5).forEach((m, i) => {
            const pct = Math.round((m.total / maxTotal) * 100);
            const item = document.createElement('div');
            item.className = 'dash-rank-item';
            item.innerHTML = `
        <span class="dash-rank-pos">${i + 1}</span>
        <span class="dash-rank-name">${m.medicamento}</span>
        <span class="dash-rank-bar"><span style="width:${pct}%"></span></span>
      `;
            rankList.appendChild(item);
        });
        if (!data.medicamentosMaisDistribuidos.length) {
            rankList.innerHTML = '<p style="color:var(--muted);font-size:0.85rem">Nenhum dado ainda.</p>';
        }
        DOM.get('alertasList').innerHTML = `
      <div class="dash-alert-item dash-alert-warn">
        <span class="dash-alert-icon">⚠️</span>
        <div><strong>Estoque baixo</strong><p>${data.alertas.estoqueBaixo} medicamento(s) com estoque ≤ 10</p></div>
      </div>
      <div class="dash-alert-item dash-alert-info">
        <span class="dash-alert-icon">⏰</span>
        <div><strong>Receitas recentes</strong><p>${data.alertas.receitasVencendo} receita(s) nos próximos 7 dias</p></div>
      </div>
      <div class="dash-alert-item dash-alert-muted">
        <span class="dash-alert-icon">👥</span>
        <div><strong>Voluntários inativos</strong><p>${data.alertas.voluntariosInativos} voluntário(s) sem atividade recente</p></div>
      </div>

    `;
        new BarChart().render(data.receitasPorMes);
        new PizzaChart().render(data.pacientesPorFaixaEtaria);
    }
    catch {
        showToast('Erro ao carregar dashboard', 'error');
    }
}
// ── GERADOR DE RELATÓRIO PDF ────────────────────────────────────────────
async function gerarRelatorioPDF(filtros = {}) {
    const btn = DOM.get('btnGerarRelatorio');
    btn.disabled = true;
    btn.textContent = '⏳ Gerando PDF…';
    const {
        secoes = {},
        dataDe = null,
        dataAte = null,
        paciente: filtroPaciente = null,
        medico: filtroMedico = null,
        medicamento: filtroMedicamento = null,
    } = filtros;
    const mostrar = (chave) => secoes[chave] !== false;  // true por padrão se não informado
    try {
        const [dashboard, pacientes, medicamentos, receitas, voluntarios, fila, filaEntregues] = await Promise.all([
            apiFetch('/relatorios/dashboard'),
            apiFetch('/pacientes'),
            apiFetch('/medicamentos'),
            apiFetch('/receitas'),
            apiFetch('/voluntarios'),
            apiFetch('/fila'),
            apiFetch('/fila/entregues'),
        ]);

        const now = new Date();
        const dataEmissao = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        const horaEmissao = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const user = getUser();
        const alertas = dashboard.alertas;
        const faixas = dashboard.pacientesPorFaixaEtaria;
        const totalPac = Object.values(faixas).reduce((a, b) => a + b, 0);
        const vols = (voluntarios || []).filter(v => !v.isAdmin);

        // ── Aplicar filtros ────────────────────────────────────────────
        const normalizar = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const contemNorm = (texto, filtro) => normalizar(texto).includes(normalizar(filtro));

        // Filtrar receitas por data e texto
        let receitasFiltradas = receitas || [];
        if (dataDe) receitasFiltradas = receitasFiltradas.filter(r => r.data && r.data.slice(0,10) >= dataDe);
        if (dataAte) receitasFiltradas = receitasFiltradas.filter(r => r.data && r.data.slice(0,10) <= dataAte);
        if (filtroMedico) receitasFiltradas = receitasFiltradas.filter(r => contemNorm(r.medico, filtroMedico));
        if (filtroMedicamento) receitasFiltradas = receitasFiltradas.filter(r =>
            (r.itens || []).some(it => contemNorm(it.medicamento?.nomeComercial, filtroMedicamento))
        );
        if (filtroPaciente) receitasFiltradas = receitasFiltradas.filter(r => contemNorm(r.paciente?.nome, filtroPaciente));

        // Filtrar pacientes por nome
        let pacientesFiltrados = pacientes || [];
        if (filtroPaciente) pacientesFiltrados = pacientesFiltrados.filter(p => contemNorm(p.nome, filtroPaciente));

        // Filtrar medicamentos por nome
        let medicamentosFiltrados = medicamentos || [];
        if (filtroMedicamento) medicamentosFiltrados = medicamentosFiltrados.filter(m =>
            contemNorm(m.nomeComercial, filtroMedicamento) || contemNorm(m.principioAtivo, filtroMedicamento)
        );

        // Filtrar fila
        let filaFiltrada = fila || [];
        if (filtroPaciente) filaFiltrada = filaFiltrada.filter(item => contemNorm(item.receita?.paciente?.nome, filtroPaciente));
        if (filtroMedico) filaFiltrada = filaFiltrada.filter(item => contemNorm(item.receita?.medico, filtroMedico));
        if (filtroMedicamento) filaFiltrada = filaFiltrada.filter(item =>
            (item.receita?.itens || []).some(it => contemNorm(it.medicamento?.nomeComercial, filtroMedicamento))
        );

        // Filtrar fila entregues
        let filaEntreguesFiltrada = filaEntregues || [];
        if (filtroPaciente) filaEntreguesFiltrada = filaEntreguesFiltrada.filter(item => contemNorm(item.receita?.paciente?.nome, filtroPaciente));
        if (filtroMedico) filaEntreguesFiltrada = filaEntreguesFiltrada.filter(item => contemNorm(item.receita?.medico, filtroMedico));
        if (filtroMedicamento) filaEntreguesFiltrada = filaEntreguesFiltrada.filter(item =>
            (item.receita?.itens || []).some(it => contemNorm(it.medicamento?.nomeComercial, filtroMedicamento))
        );

        // Montar legenda de filtros ativos para o cabeçalho do PDF
        const filtrosAtivos = [];
        if (dataDe || dataAte) filtrosAtivos.push(`Periodo: ${dataDe || '...'} ate ${dataAte || '...'}`);
        if (filtroPaciente) filtrosAtivos.push(`Paciente: "${filtroMedicamento || filtroPaciente}"`);
        if (filtroMedico) filtrosAtivos.push(`Medico: "${filtroMedico}"`);
        if (filtroMedicamento) filtrosAtivos.push(`Medicamento: "${filtroMedicamento}"`);

        const fmtDate = (raw) => {
            if (!raw) return '—';
            const d = new Date(raw);
            return new Date(d.getTime() + d.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
        };

        const tableRows = (cols, rows, redFn) => `
          <table>
            <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.length ? rows.map(r => `<tr>${r.map((cell, ci) => `<td class="${redFn && redFn(r, ci) ? 'red-cell' : ''}">${cell ?? '—'}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}" style="color:#9ca3af;text-align:center">Nenhum registro.</td></tr>`}
            </tbody>
          </table>`;

        const secao = (icone, titulo, conteudo) => `
          <div class="secao">
            <div class="secao-titulo"><span class="secao-icone">${icone}</span>${titulo}</div>
            ${conteudo}
          </div>`;

        const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
          body { background: #fff; color: #1f2933; font-size: 12px; width: 794px; }
          .cabecalho { background: linear-gradient(135deg, #0e7490, #65c5da); color: #fff; padding: 28px 32px 22px; position: relative; overflow: hidden; }
          .cabecalho::after { content: ''; position: absolute; right: -30px; top: -30px; width: 160px; height: 160px; background: rgba(255,255,255,0.1); border-radius: 50%; }
          .cabecalho h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
          .cabecalho p { margin-top: 4px; opacity: 0.88; font-size: 13px; }
          .cabecalho .meta { margin-top: 12px; font-size: 11px; opacity: 0.75; }
          .corpo { padding: 24px 32px; }
          .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi { background: #f4fbfd; border-radius: 10px; padding: 14px; text-align: center; border: 1px solid #e0f2f7; }
          .kpi-val { font-size: 28px; font-weight: 800; color: #0e7490; line-height: 1; }
          .kpi-label { font-size: 10.5px; color: #6b7280; margin-top: 4px; }
          .alerta { background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; color: #991b1b; font-size: 11.5px; font-weight: 600; }
          .secao { margin-bottom: 22px; page-break-inside: avoid; }
          .secao-titulo { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #0e7490; background: #f0f9ff; border-left: 4px solid #0e7490; padding: 8px 12px; border-radius: 0 6px 6px 0; margin-bottom: 10px; }
          .secao-icone { font-size: 15px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #0e7490; color: #fff; text-align: left; padding: 7px 9px; font-weight: 600; font-size: 10.5px; }
          td { padding: 6px 9px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #f8fafb; }
          .red-cell { color: #ef4444; font-weight: 700; }
          .faixa-etaria { font-size: 10.5px; color: #6b7280; margin-bottom: 8px; }
          .faixa-etaria span { background: #e0f2f7; color: #0e7490; border-radius: 4px; padding: 2px 7px; margin-right: 6px; font-weight: 600; }
          .rodape { background: #0e7490; color: #fff; padding: 10px 32px; font-size: 10px; display: flex; justify-content: space-between; margin-top: 12px; }
        </style></head><body>
          <div class="cabecalho">
            <h1>Farmacia Comunitaria</h1>
            <p>Relatorio Geral do Sistema</p>
            <div class="meta">Emitido em ${dataEmissao} as ${horaEmissao} &nbsp;•&nbsp; Por: ${user?.nome ?? 'Usuario'}${filtrosAtivos.length ? ' &nbsp;|&nbsp; Filtros: ' + filtrosAtivos.join(' • ') : ''}</div>
          </div>
          <div class="corpo">
            ${mostrar('resumo') ? `
            <div class="kpis">
              <div class="kpi"><div class="kpi-val">${dashboard.totais.receitas}</div><div class="kpi-label">Receitas Totais</div></div>
              <div class="kpi"><div class="kpi-val">${dashboard.totais.pacientes}</div><div class="kpi-label">Pacientes</div></div>
              <div class="kpi"><div class="kpi-val">${dashboard.totais.medicamentos}</div><div class="kpi-label">Medicamentos</div></div>
              <div class="kpi"><div class="kpi-val">${dashboard.totais.voluntarios}</div><div class="kpi-label">Voluntarios</div></div>
            </div>
            ${(alertas.estoqueBaixo > 0 || alertas.voluntariosInativos > 0) ? `
            <div class="alerta">
              ${alertas.estoqueBaixo > 0 ? `⚠ ${alertas.estoqueBaixo} medicamento(s) com estoque baixo (<=10)` : ''}
              ${alertas.estoqueBaixo > 0 && alertas.voluntariosInativos > 0 ? ' &nbsp;•&nbsp; ' : ''}
              ${alertas.voluntariosInativos > 0 ? `⚠ ${alertas.voluntariosInativos} voluntario(s) sem atividade recente` : ''}
            </div>` : ''}` : ''}

            ${mostrar('medsDist') ? secao('💊', 'Medicamentos Mais Distribuidos',
              tableRows(['#', 'Medicamento', 'Qtd. Total Distribuida'],
                dashboard.medicamentosMaisDistribuidos.map((m, i) => [i + 1, m.medicamento, m.total]))
            ) : ''}

            ${mostrar('estoque') ? secao('🏥', 'Estoque de Medicamentos',
              tableRows(
                ['Nome Comercial', 'Principio Ativo', 'Dosagem', 'Laboratorio', 'Validade', 'Estoque'],
                medicamentosFiltrados.map(m => {
                  const val = m.validade ? m.validade.slice(0,7).split('-').reverse().join('/') : '—';
                  return [m.nomeComercial, m.principioAtivo, m.dosagem, m.laboratorio, val, m.quantidade];
                }),
                (row, ci) => ci === 5 && parseInt(row[5]) <= 10
              )
            ) : ''}

            ${mostrar('pacientes') ? secao('👥', 'Pacientes Cadastrados', `
              ${totalPac > 0 && !filtroPaciente ? `<div class="faixa-etaria">Faixa etaria: ${Object.entries(faixas).map(([k,v]) => `<span>${k} anos: ${v}</span>`).join('')}</div>` : ''}
              ${tableRows(
                ['Nome', 'CPF', 'Telefone', 'Nasc.', 'Endereco'],
                pacientesFiltrados.map(p => [p.nome, p.cpf, p.telefone, fmtDate(p.dataNasc), p.endereco])
              )}`) : ''}

            ${mostrar('receitas') ? secao('📋', 'Receitas Cadastradas',
              tableRows(
                ['Data', 'Medico', 'Paciente', 'Medicamentos', 'Voluntario'],
                receitasFiltradas.map(r => [
                  fmtDate(r.data), r.medico, r.paciente?.nome ?? '—',
                  (r.itens || []).map(it => `${it.medicamento.nomeComercial} x${it.quantidade}`).join(', '),
                  r.voluntario?.nome ?? '—'
                ])
              )
            ) : ''}

            ${mostrar('voluntarios') && vols.length ? secao('🙋', 'Voluntarios',
              tableRows(['Nome', 'CPF', 'Telefone', 'Data de Nasc.'],
                vols.map(v => [v.nome, v.cpf, v.telefone, fmtDate(v.dataNasc)])
              )
            ) : ''}

            ${mostrar('fila') && filaFiltrada.length ? secao('🕐', 'Fila de Entrega (Pendentes)',
              tableRows(
                ['#', 'Paciente', 'Medico', 'Voluntario', 'Medicamentos'],
                filaFiltrada.map((item, i) => {
                  const r = item.receita;
                  return [i + 1, r.paciente?.nome ?? '—', r.medico, r.voluntario?.nome ?? '—',
                    (r.itens || []).map(it => `${it.medicamento.nomeComercial} x${it.quantidade}`).join(', ')];
                })
              )
            ) : ''}

            ${mostrar('filaEntregues') && filaEntreguesFiltrada.length ? secao('✅', 'Fila de Entrega (Entregues)',
              tableRows(
                ['#', 'Paciente', 'Medico', 'Voluntario', 'Medicamentos'],
                filaEntreguesFiltrada.map((item, i) => {
                  const r = item.receita;
                  return [i + 1, r.paciente?.nome ?? '—', r.medico, r.voluntario?.nome ?? '—',
                    (r.itens || []).map(it => `${it.medicamento.nomeComercial} x${it.quantidade}`).join(', ')];
                })
              )
            ) : ''}
          </div>
          <div class="rodape">
            <span>Farmacia Comunitaria &nbsp;•&nbsp; Documento gerado automaticamente</span>
            <span>${dataEmissao}</span>
          </div>
        </body></html>`;

        // Renderiza o HTML num iframe invisível e captura com html2canvas
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1px;border:none;visibility:hidden';
        document.body.appendChild(iframe);
        iframe.contentDocument.open();
        iframe.contentDocument.write(html);
        iframe.contentDocument.close();

        await new Promise(r => setTimeout(r, 400)); // aguarda renderização

        const iDoc = iframe.contentDocument.documentElement;
        const fullH = iDoc.scrollHeight;
        iframe.style.height = fullH + 'px';

        await new Promise(r => setTimeout(r, 100));

        const canvas = await html2canvas(iframe.contentDocument.body, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: fullH,
            windowWidth: 794,
        });

        document.body.removeChild(iframe);

        const { jsPDF } = window.jspdf;
        const A4_W = 210, A4_H = 297;
        const imgW = A4_W;
        const imgH = (canvas.height * A4_W) / canvas.width;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

        let posY = 0;
        let pageH = A4_H;
        let pageNum = 0;

        while (posY < imgH) {
            if (pageNum > 0) doc.addPage();
            const srcY = (posY / imgH) * canvas.height;
            const srcH = Math.min((pageH / imgH) * canvas.height, canvas.height - srcY);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = srcH;
            sliceCanvas.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
            const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
            const sliceH = (srcH / canvas.height) * imgH;
            doc.addImage(sliceData, 'JPEG', 0, 0, imgW, sliceH);
            posY += pageH;
            pageNum++;
        }

        const nomeArquivo = `relatorio-farmacia-${now.toISOString().slice(0, 10)}.pdf`;
        doc.save(nomeArquivo);
        showToast('PDF gerado e baixado com sucesso!');
    } catch (e) {
        showToast('Erro ao gerar PDF: ' + e.message, 'error');
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📄 Gerar Relatório PDF';
    }
}
// ────────────────────────────────────────────────────────────────────────
function initEventDelegation() {
    document.addEventListener('click', (e) => {
        const target = e.target;
        const editBtn = target.closest('.btn-action.edit');
        if (editBtn) {
            const sec = editBtn.dataset.section;
            const id = editBtn.dataset.id;
            if (sec === 'pacientes')
                App.instance.pacientesManager.startEdit(id);
            if (sec === 'receitas')
                App.instance.receitasManager.startEdit(id);
            if (sec === 'medicamentos')
                App.instance.medicamentosManager.startEdit(id);
            if (sec === 'voluntarios')
                App.instance.voluntariosManager.startEdit(id);
            return;
        }
        const delBtn = target.closest('.btn-action.delete');
        if (delBtn) {
            const sec = delBtn.dataset.section;
            const id = delBtn.dataset.id;
            const row = delBtn.closest('tr');
            const nome = row?.cells[0]?.textContent?.trim() ?? `#${id}`;
            if (sec === 'pacientes')
                App.instance.pacientesManager.delete(id, nome);
            if (sec === 'receitas')
                App.instance.receitasManager.delete(id);
            if (sec === 'medicamentos')
                App.instance.medicamentosManager.delete(id, nome);
            if (sec === 'voluntarios')
                App.instance.voluntariosManager.delete(id, nome);
        }
    });
}
class App {
    constructor() {
        App.instance = this;
        const user = getUser();
        const label = user.isAdmin
            ? `${user.nome} • Administrador`
            : `${user.nome} • Voluntário`;
        DOM.get('userLabel').textContent = label;
        if (user.isAdmin) {
            DOM.get('menuVoluntarios').style.display = '';
        }
        DOM.get('btnLogout').addEventListener('click', logout);
        // Modal de relatório
        const relModal = DOM.get('relatorioModal');
        const popularSelectsRelatorio = async () => {
            try {
                const [pacientes, receitas, medicamentos] = await Promise.all([
                    apiFetch('/pacientes'),
                    apiFetch('/receitas'),
                    apiFetch('/medicamentos'),
                ]);

                // Pacientes
                const selPac = DOM.get('relFiltroPaciente');
                selPac.innerHTML = '<option value="">Todos os pacientes</option>';
                [...pacientes].sort((a, b) => a.nome.localeCompare(b.nome)).forEach(p => {
                    const o = document.createElement('option');
                    o.value = p.nome;
                    o.textContent = p.nome;
                    selPac.appendChild(o);
                });

                // Médicos (extraídos das receitas, únicos)
                const selMed = DOM.get('relFiltroMedico');
                selMed.innerHTML = '<option value="">Todos os médicos</option>';
                const medicos = [...new Set((receitas || []).map(r => r.medico).filter(Boolean))].sort();
                medicos.forEach(m => {
                    const o = document.createElement('option');
                    o.value = m;
                    o.textContent = m;
                    selMed.appendChild(o);
                });

                // Medicamentos
                const selMedicamento = DOM.get('relFiltroMedicamento');
                selMedicamento.innerHTML = '<option value="">Todos os medicamentos</option>';
                [...medicamentos].sort((a, b) => a.nomeComercial.localeCompare(b.nomeComercial)).forEach(m => {
                    const o = document.createElement('option');
                    o.value = m.nomeComercial;
                    o.textContent = `${m.nomeComercial} ${m.dosagem}`;
                    selMedicamento.appendChild(o);
                });
            } catch (e) {
                console.warn('Erro ao popular selects do relatório:', e);
            }
        };

        DOM.get('btnAbrirModalRelatorio').addEventListener('click', async () => {
            await popularSelectsRelatorio();
            relModal.classList.add('open');
        });
        DOM.get('btnFecharModalRelatorio').addEventListener('click', () => {
            relModal.classList.remove('open');
        });
        relModal.addEventListener('click', (e) => {
            if (e.target === relModal) relModal.classList.remove('open');
        });
        // Checkboxes com toggle visual
        relModal.querySelectorAll('.rel-check-item').forEach(label => {
            const cb = label.querySelector('input[type="checkbox"]');
            cb.addEventListener('change', () => {
                label.classList.toggle('checked', cb.checked);
            });
        });
        DOM.get('btnGerarRelatorio').addEventListener('click', () => {
            const filtros = {
                secoes: {
                    resumo:      DOM.get('chkResumo').checked,
                    medsDist:    DOM.get('chkMedsDist').checked,
                    estoque:     DOM.get('chkEstoque').checked,
                    pacientes:   DOM.get('chkPacientes').checked,
                    receitas:    DOM.get('chkReceitas').checked,
                    voluntarios: DOM.get('chkVoluntarios').checked,
                    fila:        DOM.get('chkFila').checked,
                    filaEntregues: DOM.get('chkFilaEntregues').checked,
                },
                dataDe:      DOM.get('relDataDe').value || null,
                dataAte:     DOM.get('relDataAte').value || null,
                paciente:    DOM.get('relFiltroPaciente').value || null,
                medico:      DOM.get('relFiltroMedico').value || null,
                medicamento: DOM.get('relFiltroMedicamento').value || null,
            };
            relModal.classList.remove('open');
            gerarRelatorioPDF(filtros);
        });
        this.deleteModal = new DeleteModal();
        this.receitasManager = new ReceitasManager();
        this.pacientesManager = new PacientesManager();
        this.medicamentosManager = new MedicamentosManager();
        this.voluntariosManager = new VoluntariosManager();
        this.filaManager = new FilaManager();
        if (user.isAdmin) {
            this.voluntariosManager.load();
        }
        else {
            this.loadVoluntariosSelectParaVoluntario(user);
        }
        initEventDelegation();
        loadDashboard();
        this.initMenu();
        this.showSection('dashboard');
    }
    loadVoluntariosSelectParaVoluntario(user) {
        this.receitasManager.syncSelectVoluntarios([{ id: user.id, nome: user.nome }]);
    }
    showSection(id) {
        document.querySelectorAll('.page').forEach((s) => (s.style.display = 'none'));
        DOM.get(id).style.display = 'block';
        DOM.get('title').innerText = App.LABELS[id] ?? id;
        document.querySelectorAll('.menu a').forEach((a) => a.classList.toggle('active', a.dataset.section === id));
        if (id === 'filas')
            this.filaManager.load();
        if (id === 'dashboard')
            loadDashboard();
    }
    initMenu() {
        document.querySelectorAll('.menu a[data-section]').forEach((a) => a.addEventListener('click', () => this.showSection(a.dataset.section)));
    }
}
App.LABELS = {
    dashboard: 'Relatórios', pacientes: 'Pacientes', receitas: 'Receitas',
    medicamentos: 'Medicamentos', voluntarios: 'Voluntários', filas: 'Fila',
};
document.addEventListener('DOMContentLoaded', () => new App());