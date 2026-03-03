interface User {
  id: number;
  nome: string;
  isAdmin: boolean;
}

interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  dataNasc: string;
  endereco: string;
}

interface Medicamento {
  id: number;
  nomeComercial: string;
  principioAtivo: string;
  dosagem: string;
  laboratorio: string;
  lote: string;
  validade: string;
  quantidade: number;
}

interface ReceitaItem {
  medicamentoId: number;
  quantidade: number;
  medicamento: Pick<Medicamento, 'nomeComercial' | 'dosagem'>;
}

interface Receita {
  id: number;
  data: string;
  medico: string;
  pacienteId: number;
  voluntarioId: number;
  paciente?: Pick<Paciente, 'id' | 'nome'>;
  voluntario?: Pick<Voluntario, 'id' | 'nome'>;
  itens: ReceitaItem[];
}

interface Voluntario {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  dataNasc: string;
  isAdmin: boolean;
}

interface FilaItem {
  id: number;
  posicao: number;
  entregue: boolean;
  receita: Receita;
}

interface DashboardData {
  totais: {
    receitas: number;
    pacientes: number;
    medicamentos: number;
    voluntarios: number;
  };
  receitasPorMes: Record<string, number>;
  medicamentosMaisDistribuidos: Array<{ medicamento: string; total: number }>;
  pacientesPorFaixaEtaria: Record<string, number>;
  alertas: {
    estoqueBaixo: number;
    receitasVencendo: number;
    voluntariosInativos: number;
  };
}

interface ReceitaPayload {
  data: string;
  medico: string;
  pacienteId: number;
  voluntarioId: number;
  itens: Array<{ medicamentoId: number; quantidade: number }>;
}

const API = 'http://localhost:3000/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function getUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
  } catch {
    return null;
  }
}

function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = './index.html';
}

(function checkAuth(): void {
  if (!getToken() || !getUser()) {
    window.location.href = './index.html';
  }
})();

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers as Record<string, string> || {}),
    },
  });

  if (res.status === 401) {
    logout();
    throw new Error('Sessão expirada.');
  }

  if (res.status === 204) return null as T;

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Erro na requisição');
  }

  return data as T;
}

const DOM = {
  get: (id: string): HTMLElement => document.getElementById(id) as HTMLElement,
  input: (id: string): HTMLInputElement => document.getElementById(id) as HTMLInputElement,
  select: (id: string): HTMLSelectElement => document.getElementById(id) as HTMLSelectElement,

  fmtDate: (raw: string): string => {
    if (!raw) return '';
    const d = new Date(raw);
    const adjusted = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return adjusted.toLocaleDateString('pt-BR');
  },

  fmtDateISO: (raw: string): string => {
    if (!raw) return '';
    const d = new Date(raw);
    const adjusted = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    const y = adjusted.getFullYear();
    const m = String(adjusted.getMonth() + 1).padStart(2, '0');
    const day = String(adjusted.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  makeBtns: (section: string, id: number | string): string =>
    `<button class="btn-action edit" data-section="${section}" data-id="${id}" title="Editar">📋</button> ` +
    `<button class="btn-action delete" data-section="${section}" data-id="${id}" title="Excluir">✕</button>`,
};

function showToast(msg: string, type: 'success' | 'error' = 'success'): void {
  let toast = document.getElementById('toast') as HTMLDivElement | null;
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
  const toastAny = toast as HTMLDivElement & { _timeout?: ReturnType<typeof setTimeout> };
  clearTimeout(toastAny._timeout);
  toastAny._timeout = setTimeout(() => { toast!.style.opacity = '0'; }, 3000);
}

class DeleteModal {
  private modal: HTMLElement;
  private textEl: HTMLElement;
  private onConfirm: (() => Promise<void>) | null = null;

  constructor() {
    this.modal = DOM.get('deleteModal');
    this.textEl = DOM.get('deleteModalText');

    this.modal.addEventListener('click', (e: MouseEvent) => {
      if (e.target === this.modal) this.close();
    });
    DOM.get('btnCancelDelete').addEventListener('click', () => this.close());
    DOM.get('btnConfirmDelete').addEventListener('click', async () => {
      if (this.onConfirm) await this.onConfirm();
      this.close();
    });
  }

  open(label: string, confirmFn: () => Promise<void>): void {
    this.textEl.textContent = `Excluir "${label}"? Ação irreversível.`;
    this.onConfirm = confirmFn;
    this.modal.classList.add('open');
  }

  close(): void {
    this.modal.classList.remove('open');
    this.onConfirm = null;
  }
}

class PacientesManager {
  private editId: number | null = null;

  constructor() {
    DOM.get('formBtn').addEventListener('click', () => this.save());
    this.load();
  }

  async load(): Promise<void> {
    try {
      const list = await apiFetch<Paciente[]>('/pacientes');
      this.render(list);
    } catch {
      showToast('Erro ao carregar pacientes', 'error');
    }
  }

  render(list: Paciente[]): void {
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
    App.instance.receitasManager.syncSelectPacientes(list || []);
  }

  startEdit(id: string): void {
    const row = DOM.get('pacientesBody').querySelector<HTMLTableRowElement>(`tr[data-id="${id}"]`);
    if (!row) return;
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

  private parseDisplayDate(txt: string): string {
    const p = txt.trim().split('/');
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : '';
  }

  reset(): void {
    (DOM.get('pacienteForm') as HTMLFormElement).reset();
    this.editId = null;
    DOM.get('editBanner').style.display = 'none';
    DOM.get('formBtn').textContent = 'Salvar Paciente';
    DOM.get('formTitle').textContent = 'Cadastrar Paciente';
  }

  async save(): Promise<void> {
    const nome = DOM.input('pNome').value.trim();
    if (!nome) { alert('Informe o nome!'); return; }

    const payload = {
      nome,
      cpf: DOM.input('pCpf').value.trim(),
      telefone: DOM.input('pTel').value.trim(),
      dataNasc: DOM.input('pNasc').value,
      endereco: DOM.input('pEnd').value.trim(),
    };

    try {
      if (this.editId) {
        await apiFetch<Paciente>(`/pacientes/${this.editId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Paciente atualizado!');
      } else {
        await apiFetch<Paciente>('/pacientes', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Paciente cadastrado!');
      }
      this.reset();
      await this.load();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async delete(id: string, nome: string): Promise<void> {
    App.instance.deleteModal.open(nome, async () => {
      try {
        await apiFetch(`/pacientes/${id}`, { method: 'DELETE' });
        showToast('Paciente excluído!');
        await this.load();
      } catch (e) {
        showToast((e as Error).message, 'error');
      }
    });
  }
}

class MedicamentosManager {
  private editId: number | null = null;

  constructor() {
    DOM.get('medFormBtn').addEventListener('click', () => this.save());
    this.load();
  }

  async load(): Promise<Medicamento[]> {
    try {
      const list = await apiFetch<Medicamento[]>('/medicamentos');
      this.render(list);
      return list;
    } catch {
      showToast('Erro ao carregar medicamentos', 'error');
      return [];
    }
  }

  render(list: Medicamento[]): void {
    const tbody = DOM.get('medBody');
    tbody.innerHTML = '';
    (list || []).forEach((m) => {
      const tr = document.createElement('tr');
      tr.dataset.id = String(m.id);
      const val = m.validade ? m.validade.slice(0, 7).split('-').reverse().join('/') : '';
      tr.innerHTML = `
        <td>${m.nomeComercial}</td>
        <td>${m.principioAtivo}</td>
        <td>${m.dosagem}</td>
        <td>${m.laboratorio}</td>
        <td>${m.lote}</td>
        <td>${val}</td>
        <td>${m.quantidade}</td>
        <td>${DOM.makeBtns('medicamentos', m.id)}</td>
      `;
      tbody.appendChild(tr);
    });
    App.instance.receitasManager.syncSelectMedicamentos(list || []);
  }

  startEdit(id: string): void {
    const row = DOM.get('medBody').querySelector<HTMLTableRowElement>(`tr[data-id="${id}"]`);
    if (!row) return;
    const c = row.cells;
    DOM.input('mNome').value = c[0].textContent?.trim() ?? '';
    DOM.input('mAtivo').value = c[1].textContent?.trim() ?? '';
    DOM.input('mDose').value = c[2].textContent?.trim() ?? '';
    DOM.input('mLab').value = c[3].textContent?.trim() ?? '';
    DOM.input('mLote').value = c[4].textContent?.trim() ?? '';
    const vp = c[5].textContent?.trim().split('/') ?? [];
    if (vp.length === 2) DOM.input('mVal').value = `${vp[1]}-${vp[0]}-01`;
    DOM.input('mQtd').value = c[6].textContent?.trim() ?? '';
    this.editId = parseInt(id);
    DOM.get('medEditBanner').style.display = 'block';
    DOM.get('medFormBtn').textContent = 'Atualizar Medicamento';
    DOM.get('medFormTitle').textContent = 'Editar Medicamento';
    App.instance.showSection('medicamentos');
    setTimeout(() => DOM.input('mNome').scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }

  reset(): void {
    (DOM.get('medForm') as HTMLFormElement).reset();
    this.editId = null;
    DOM.get('medEditBanner').style.display = 'none';
    DOM.get('medFormBtn').textContent = 'Salvar Medicamento';
    DOM.get('medFormTitle').textContent = 'Cadastrar Medicamento';
  }

  async save(): Promise<void> {
    const nome = DOM.input('mNome').value.trim();
    if (!nome) { alert('Informe o nome!'); return; }

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
        await apiFetch<Medicamento>(`/medicamentos/${this.editId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Medicamento atualizado!');
      } else {
        await apiFetch<Medicamento>('/medicamentos', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Medicamento cadastrado!');
      }
      this.reset();
      await this.load();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async delete(id: string, nome: string): Promise<void> {
    App.instance.deleteModal.open(nome, async () => {
      try {
        await apiFetch(`/medicamentos/${id}`, { method: 'DELETE' });
        showToast('Medicamento excluído!');
        await this.load();
      } catch (e) {
        showToast((e as Error).message, 'error');
      }
    });
  }
}

class ReceitasManager {
  private editId: number | null = null;
  private pacientes: Paciente[] = [];
  private voluntarios: Pick<Voluntario, 'id' | 'nome'>[] = [];
  private medicamentos: Medicamento[] = [];

  constructor() {
    DOM.get('btnAdicionarMed').addEventListener('click', () => this.addMedRow());
    DOM.get('receitaFormBtn').addEventListener('click', () => this.save());
    this.addMedRow();
    this.load();
  }

  async load(): Promise<void> {
    try {
      const list = await apiFetch<Receita[]>('/receitas');
      this.render(list);
    } catch {
      showToast('Erro ao carregar receitas', 'error');
    }
  }

  render(list: Receita[]): void {
    const tbody = DOM.get('receitasBody');
    tbody.innerHTML = '';
    (list || []).forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.id = String(r.id);
      const tags = (r.itens || []).map((item) =>
        `<span class="med-tag">${item.medicamento.nomeComercial} ${item.medicamento.dosagem} × ${item.quantidade}</span>`
      ).join('');
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

  syncSelectPacientes(list: Paciente[]): void {
    this.pacientes = list;
    const sel = DOM.select('rPaciente');
    const cur = sel.value;
    sel.innerHTML =
      '<option value="">Selecione o paciente</option>' +
      list.map((p) => `<option value="${p.id}"${String(p.id) === cur ? ' selected' : ''}>${p.nome}</option>`).join('');
  }

  syncSelectVoluntarios(list: Pick<Voluntario, 'id' | 'nome'>[]): void {
    this.voluntarios = list;
    const sel = DOM.select('rVol');
    const cur = sel.value;
    sel.innerHTML =
      '<option value="">Selecione o voluntário</option>' +
      list.map((v) => `<option value="${v.id}"${String(v.id) === cur ? ' selected' : ''}>${v.nome}</option>`).join('');
  }

  syncSelectMedicamentos(list: Medicamento[]): void {
    this.medicamentos = list;
    DOM.get('medList').querySelectorAll<HTMLSelectElement>('.r-med').forEach((sel) => {
      const cur = sel.value;
      sel.innerHTML =
        '<option value="">Selecione</option>' +
        list.map((m) => `<option value="${m.id}"${String(m.id) === cur ? ' selected' : ''}>${m.nomeComercial} ${m.dosagem}</option>`).join('');
    });
  }

  private getMedOptions(selectedId: number | string = ''): string {
    return (
      '<option value="">Selecione</option>' +
      this.medicamentos.map((m) =>
        `<option value="${m.id}"${String(m.id) === String(selectedId) ? ' selected' : ''}>${m.nomeComercial} ${m.dosagem}</option>`
      ).join('')
    );
  }

  addMedRow(medId: number | string = '', qtd: number | string = ''): void {
    const div = document.createElement('div');
    div.className = 'med-row';
    div.innerHTML =
      `<div class="form-group"><label>Medicamento</label><select class="r-med">${this.getMedOptions(medId)}</select></div>` +
      `<div class="form-group"><label>Qtd</label><input class="r-qtd" type="number" min="1" placeholder="30" value="${qtd}"></div>` +
      `<button type="button" class="btn-remove-med">−</button>`;
    div.querySelector<HTMLButtonElement>('.btn-remove-med')!.addEventListener('click', () => {
      if (DOM.get('medList').children.length > 1) div.remove();
    });
    DOM.get('medList').appendChild(div);
  }

  private getMedsFromForm(): Array<{ medicamentoId: number; quantidade: number }> {
    return Array.from(DOM.get('medList').querySelectorAll<HTMLElement>('.med-row')).map((r) => ({
      medicamentoId: parseInt(r.querySelector<HTMLSelectElement>('.r-med')!.value),
      quantidade: parseInt(r.querySelector<HTMLInputElement>('.r-qtd')!.value),
    }));
  }

  async startEdit(id: string): Promise<void> {
    try {
      const r = await apiFetch<Receita>(`/receitas/${id}`);
      DOM.input('rData').value = DOM.fmtDateISO(r.data);
      DOM.input('rMedico').value = r.medico;
      DOM.select('rPaciente').value = String(r.pacienteId);
      DOM.select('rVol').value = String(r.voluntarioId);
      DOM.get('medList').innerHTML = '';
      (r.itens || []).forEach((item) => this.addMedRow(item.medicamentoId, item.quantidade));
      if (!r.itens?.length) this.addMedRow();
      this.editId = parseInt(id);
      DOM.get('receitaEditBanner').style.display = 'block';
      DOM.get('receitaFormBtn').textContent = 'Atualizar Receita';
      DOM.get('receitaFormTitle').textContent = 'Editar Receita';
      App.instance.showSection('receitas');
      setTimeout(() => DOM.input('rData').scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  reset(): void {
    (DOM.get('receitaForm') as HTMLFormElement).reset();
    DOM.get('medList').innerHTML = '';
    this.addMedRow();
    this.editId = null;
    DOM.get('receitaEditBanner').style.display = 'none';
    DOM.get('receitaFormBtn').textContent = 'Salvar Receita';
    DOM.get('receitaFormTitle').textContent = 'Cadastrar Receita';
  }

  async save(): Promise<void> {
    const data = DOM.input('rData').value;
    const medico = DOM.input('rMedico').value.trim();
    const pacienteId = parseInt(DOM.select('rPaciente').value);
    const voluntarioId = parseInt(DOM.select('rVol').value);
    const itens = this.getMedsFromForm();

    if (!data || !medico || !pacienteId || !voluntarioId) { alert('Preencha todos os campos!'); return; }
    if (!itens.length || itens.some((i) => !i.medicamentoId || !i.quantidade)) {
      alert('Preencha todos os medicamentos!'); return;
    }

    const payload: ReceitaPayload = { data, medico, pacienteId, voluntarioId, itens };

    try {
      if (this.editId) {
        await apiFetch<Receita>(`/receitas/${this.editId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Receita atualizada!');
      } else {
        const novaReceita = await apiFetch<Receita>('/receitas', { method: 'POST', body: JSON.stringify(payload) });

        await apiFetch('/fila', { method: 'POST', body: JSON.stringify({ receitaId: novaReceita.id }) });
        showToast('Receita cadastrada e adicionada à fila!');
      }
      this.reset();
      await this.load();

    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async delete(id: string): Promise<void> {
    App.instance.deleteModal.open(`Receita #${id}`, async () => {
      try {
        await apiFetch(`/receitas/${id}`, { method: 'DELETE' });
        showToast('Receita excluída!');
        await this.load();
      } catch (e) {
        showToast((e as Error).message, 'error');
      }
    });
  }
}

class VoluntariosManager {
  private editId: number | null = null;

  constructor() {
    DOM.get('volFormBtn').addEventListener('click', () => this.save());
  }

  async load(): Promise<Voluntario[]> {
    try {
      const list = await apiFetch<Voluntario[]>('/voluntarios');
      this.render(list);
      App.instance.receitasManager.syncSelectVoluntarios(list || []);
      return list;
    } catch {
      showToast('Erro ao carregar voluntários', 'error');
      return [];
    }
  }

  render(list: Voluntario[]): void {
    const tbody = DOM.get('volBody');
    tbody.innerHTML = '';
    (list || []).forEach((v) => {
      if (v.isAdmin) return;
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

  startEdit(id: string): void {
    const row = DOM.get('volBody').querySelector<HTMLTableRowElement>(`tr[data-id="${id}"]`);
    if (!row) return;
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

  reset(): void {
    (DOM.get('volForm') as HTMLFormElement).reset();
    this.editId = null;
    DOM.get('volEditBanner').style.display = 'none';
    DOM.get('volFormBtn').textContent = 'Salvar Voluntário';
    DOM.get('volFormTitle').textContent = 'Cadastrar Voluntário';
  }

  async save(): Promise<void> {
    const nome = DOM.input('vNome').value.trim();
    if (!nome) { alert('Informe o nome!'); return; }
    const senha = DOM.input('vSenha').value.trim();
    if (!this.editId && !senha) { alert('Informe a senha!'); return; }

    const payload: Record<string, string> = {
      nome,
      cpf: DOM.input('vCpf').value.trim(),
      telefone: DOM.input('vTel').value.trim(),
      dataNasc: DOM.input('vNasc').value,
      ...(senha && { senha }),
    };

    try {
      if (this.editId) {
        await apiFetch<Voluntario>(`/voluntarios/${this.editId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Voluntário atualizado!');
      } else {
        await apiFetch<Voluntario>('/voluntarios', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Voluntário cadastrado!');
      }
      this.reset();
      await this.load();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async delete(id: string, nome: string): Promise<void> {
    App.instance.deleteModal.open(nome, async () => {
      try {
        await apiFetch(`/voluntarios/${id}`, { method: 'DELETE' });
        showToast('Voluntário excluído!');
        await this.load();
      } catch (e) {
        showToast((e as Error).message, 'error');
      }
    });
  }
}

class FilaManager {
  private modal: HTMLElement;
  private modalTit: HTMLElement;
  private modalRec: HTMLElement;
  private modalMeds: HTMLElement;
  private dragged: HTMLElement | null = null;
  private checkStates: Record<number, Record<number, boolean>> = {};

  constructor() {
    this.modal = DOM.get('filaModal');
    this.modalTit = DOM.get('filaModalTitulo');
    this.modalRec = DOM.get('filaModalReceita');
    this.modalMeds = DOM.get('filaModalMeds');

    this.initModalClose();
    this.load();
  }

  async load(): Promise<void> {
    try {
      const list = await apiFetch<FilaItem[]>('/fila');
      this.render(list || []);
    } catch {
      showToast('Erro ao carregar fila', 'error');
    }
  }

  render(list: FilaItem[]): void {
    const container = DOM.get('filaContainer');
    container.innerHTML = '';

    if (!list.length) {
      container.innerHTML = '<p style="color:var(--muted);padding:24px">Nenhum item na fila.</p>';
      return;
    }

    list.forEach((item, i) => {
      const r = item.receita;
      const meds = (r.itens || []).map((it) =>
        `${it.medicamento.nomeComercial} ${it.medicamento.dosagem} × ${it.quantidade}`
      );
      const card = document.createElement('div');
      card.className = 'fila-card';
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
        <button class="btn-check" data-fila-id="${item.id}" title="Entregar">✓</button>
      `;

      card.querySelector<HTMLButtonElement>('.btn-check')!.addEventListener('click', async (e: MouseEvent) => {
        e.stopPropagation();
        await this.marcarEntregue(item.id, card);
      });

      card.addEventListener('click', () => this.openModal(card));
      this.initDrag(card);
      container.appendChild(card);
    });
  }

  private initDrag(card: HTMLElement): void {
    card.addEventListener('dragstart', () => {
      this.dragged = card;
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', async () => {
      card.classList.remove('dragging');
      this.dragged = null;
      await this.saveOrder();
    });
    card.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      if (!this.dragged || this.dragged === card) return;
      const container = DOM.get('filaContainer');
      const dn = this.dragged.nextSibling;
      const tn = card.nextSibling;
      container.insertBefore(this.dragged, tn);
      container.insertBefore(card, dn);
      this.updateOrderNumbers();
    });
  }

  private updateOrderNumbers(): void {
    DOM.get('filaContainer').querySelectorAll<HTMLElement>('.fila-card').forEach((c, i) => {
      const b = c.querySelector<HTMLElement>('.fila-order');
      if (b) b.textContent = String(i + 1);
    });
  }

  private async saveOrder(): Promise<void> {
    const ids = Array.from(DOM.get('filaContainer').querySelectorAll<HTMLElement>('.fila-card'))
      .map((c) => parseInt(c.dataset.id!));
    try {
      await apiFetch('/fila/reordenar', { method: 'PATCH', body: JSON.stringify({ ids }) });
    } catch {
      showToast('Erro ao reordenar fila', 'error');
    }
  }

  private async marcarEntregue(id: number, card: HTMLElement): Promise<void> {
    try {
      await apiFetch(`/fila/${id}/entregar`, { method: 'PATCH' });
      card.style.opacity = '0.4';
      const btn = card.querySelector<HTMLButtonElement>('.btn-check')!;
      btn.classList.add('checked');
      btn.disabled = true;
      const s = document.createElement('span');
      s.className = 'status-entregue';
      s.textContent = 'Status: Entregue';
      btn.insertAdjacentElement('beforebegin', s);
      showToast('Marcado como entregue!');
      setTimeout(() => { card.remove(); }, 1500);
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  private openModal(card: HTMLElement): void {
    const nome = card.querySelector('h4')?.textContent ?? '';
    const medico = card.dataset.medico ?? '—';
    const voluntario = card.dataset.voluntario ?? '—';
    const data = card.dataset.data ?? '—';
    const meds = (card.dataset.meds ?? '').split('|').map((m) => m.trim()).filter(Boolean);
    const filaId = parseInt(card.dataset.id!);

    // Recupera estados salvos dos checkboxes
    const savedStates: Record<number, boolean> = this.checkStates[filaId] ?? {};

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

  private updateProgress(total: number, filaId: number): void {
    const prog = document.getElementById('filaProgress');
    if (!prog) return;
    const states = this.checkStates[filaId] ?? {};
    const checked = Object.values(states).filter(Boolean).length;
    const s = total > 1 ? 's' : '';
    prog.innerHTML = `<b>${checked}</b> de ${total} medicamento${s} confirmado${s}`;
    prog.style.color = checked === total ? '#10b981' : 'var(--muted)';
  }

  private async syncEntregue(filaId: number, card: HTMLElement, entregue: boolean): Promise<void> {
    try {
      await apiFetch(`/fila/${filaId}/entregar`, { method: 'PATCH', body: JSON.stringify({ entregue }) });

      const btn = card.querySelector<HTMLButtonElement>('.btn-check')!;
      const statusEl = card.querySelector('.status-entregue');

      if (entregue) {
        btn.classList.add('checked');
        btn.style.background = '#10b981';
        if (!statusEl) {
          const s = document.createElement('span');
          s.className = 'status-entregue';
          s.textContent = 'Status: Entregue';
          btn.insertAdjacentElement('beforebegin', s);
        }
        card.style.opacity = '0.6';
      } else {
        btn.classList.remove('checked');
        btn.style.background = '';
        statusEl?.remove();
        card.style.opacity = '1';
      }
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  private initModalClose(): void {
    DOM.get('filaModalFechar').addEventListener('click', () => this.modal.classList.remove('open'));
    this.modal.addEventListener('click', (e: MouseEvent) => {
      if (e.target === this.modal) this.modal.classList.remove('open');
    });
  }
}

class BarChart {
  private readonly NS = 'http://www.w3.org/2000/svg';
  private readonly MES_NOMES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  render(data: Record<string, number>): void {
    const svg = document.querySelector<SVGSVGElement>('#barChartSvg');
    if (!svg) return;
    svg.innerHTML = '';

    const entries = Object.entries(data).sort();
    if (!entries.length) return;

    const W = 300, H = 140, padL = 32, padR = 8, padT = 12, padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const maxVal = Math.max(...entries.map((e) => e[1]), 1);
    const barW = (chartW / entries.length) * 0.55;
    const gap = chartW / entries.length;

    for (let i = 0; i <= 4; i++) {
      const y = padT + chartH - (i / 4) * chartH;
      const line = document.createElementNS(this.NS, 'line');
      line.setAttribute('x1', String(padL)); line.setAttribute('x2', String(W - padR));
      line.setAttribute('y1', String(y)); line.setAttribute('y2', String(y));
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
      if (!defs) { defs = document.createElementNS(this.NS, 'defs'); svg.insertBefore(defs, svg.firstChild); }

      const grad = document.createElementNS(this.NS, 'linearGradient');
      grad.setAttribute('id', gradId); grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
      grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
      const s1 = document.createElementNS(this.NS, 'stop'); s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#65c5da');
      const s2 = document.createElementNS(this.NS, 'stop'); s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#0e7490');
      grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad);

      const rect = document.createElementNS(this.NS, 'rect');
      rect.setAttribute('x', String(x)); rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(barW)); rect.setAttribute('height', String(barH));
      rect.setAttribute('rx', '4'); rect.setAttribute('fill', `url(#${gradId})`);
      svg.appendChild(rect);

      const mesLabel = mes.slice(5);
      const mesNome = this.MES_NOMES[parseInt(mesLabel)] ?? mesLabel;

      const valLbl = document.createElementNS(this.NS, 'text');
      valLbl.setAttribute('x', String(x + barW / 2)); valLbl.setAttribute('y', String(y - 4));
      valLbl.setAttribute('text-anchor', 'middle'); valLbl.setAttribute('font-size', '8');
      valLbl.setAttribute('font-weight', '700'); valLbl.setAttribute('fill', '#4fb4ca');
      valLbl.textContent = String(val);
      svg.appendChild(valLbl);

      const mesLbl = document.createElementNS(this.NS, 'text');
      mesLbl.setAttribute('x', String(x + barW / 2)); mesLbl.setAttribute('y', String(H - padB + 14));
      mesLbl.setAttribute('text-anchor', 'middle'); mesLbl.setAttribute('font-size', '9');
      mesLbl.setAttribute('fill', '#6b7280'); mesLbl.textContent = mesNome;
      svg.appendChild(mesLbl);
    });
  }
}

class PizzaChart {
  private readonly NS = 'http://www.w3.org/2000/svg';
  private readonly CORES: Record<string, string> = {
    '0-17': '#a5f3fc', '18-39': '#65c5da', '40-59': '#4fb4ca', '60+': '#0e7490',
  };
  private readonly LABELS: Record<string, string> = {
    '0-17': '0–17 anos', '18-39': '18–39 anos', '40-59': '40–59 anos', '60+': '60+ anos',
  };

  render(data: Record<string, number>): void {
    const svg = document.querySelector<SVGSVGElement>('#pizzaSvg');
    const legend = document.getElementById('pizzaLegend');
    if (!svg || !legend) return;
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
    bg.setAttribute('cx', String(cx)); bg.setAttribute('cy', String(cy));
    bg.setAttribute('r', String(ri)); bg.setAttribute('fill', '#fff');
    svg.appendChild(bg);

    const txt = document.createElementNS(this.NS, 'text');
    txt.setAttribute('x', String(cx)); txt.setAttribute('y', String(cy - 6));
    txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('font-size', '13');
    txt.setAttribute('font-weight', '700'); txt.setAttribute('fill', '#1f2933');
    txt.textContent = String(total);
    svg.appendChild(txt);

    const sub = document.createElementNS(this.NS, 'text');
    sub.setAttribute('x', String(cx)); sub.setAttribute('y', String(cy + 12));
    sub.setAttribute('text-anchor', 'middle'); sub.setAttribute('font-size', '9');
    sub.setAttribute('fill', '#6b7280'); sub.textContent = 'pacientes';
    svg.appendChild(sub);
  }
}

async function loadDashboard(): Promise<void> {
  try {
    const data = await apiFetch<DashboardData>('/relatorios/dashboard');

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
  } catch {
    showToast('Erro ao carregar dashboard', 'error');
  }
}

function initEventDelegation(): void {
  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    const editBtn = target.closest<HTMLElement>('.btn-action.edit');
    if (editBtn) {
      const sec = editBtn.dataset.section!;
      const id = editBtn.dataset.id!;
      if (sec === 'pacientes') App.instance.pacientesManager.startEdit(id);
      if (sec === 'receitas') App.instance.receitasManager.startEdit(id);
      if (sec === 'medicamentos') App.instance.medicamentosManager.startEdit(id);
      if (sec === 'voluntarios') App.instance.voluntariosManager.startEdit(id);
      return;
    }

    const delBtn = target.closest<HTMLElement>('.btn-action.delete');
    if (delBtn) {
      const sec = delBtn.dataset.section!;
      const id = delBtn.dataset.id!;
      const row = delBtn.closest<HTMLTableRowElement>('tr');
      const nome = row?.cells[0]?.textContent?.trim() ?? `#${id}`;
      if (sec === 'pacientes') App.instance.pacientesManager.delete(id, nome);
      if (sec === 'receitas') App.instance.receitasManager.delete(id);
      if (sec === 'medicamentos') App.instance.medicamentosManager.delete(id, nome);
      if (sec === 'voluntarios') App.instance.voluntariosManager.delete(id, nome);
    }
  });
}

class App {
  static instance: App;

  private static readonly LABELS: Record<string, string> = {
    dashboard: 'Relatórios', pacientes: 'Pacientes', receitas: 'Receitas',
    medicamentos: 'Medicamentos', voluntarios: 'Voluntários', filas: 'Fila',
  };

  readonly deleteModal: DeleteModal;
  readonly pacientesManager: PacientesManager;
  readonly medicamentosManager: MedicamentosManager;
  readonly receitasManager: ReceitasManager;
  readonly voluntariosManager: VoluntariosManager;
  readonly filaManager: FilaManager;

  constructor() {
    App.instance = this;

    const user = getUser()!;
    const label = user.isAdmin
      ? `${user.nome} • Administrador`
      : `${user.nome} • Voluntário`;
    DOM.get('userLabel').textContent = label;

    if (user.isAdmin) {
      DOM.get('menuVoluntarios').style.display = '';
    }

    DOM.get('btnLogout').addEventListener('click', logout);

    this.deleteModal = new DeleteModal();
    this.receitasManager = new ReceitasManager();
    this.pacientesManager = new PacientesManager();
    this.medicamentosManager = new MedicamentosManager();
    this.voluntariosManager = new VoluntariosManager();
    this.filaManager = new FilaManager();

    if (user.isAdmin) {
      this.voluntariosManager.load();
    } else {
      this.loadVoluntariosSelectParaVoluntario(user);
    }

    initEventDelegation();
    loadDashboard();
    this.initMenu();
    this.showSection('dashboard');
  }

  private loadVoluntariosSelectParaVoluntario(user: User): void {
    this.receitasManager.syncSelectVoluntarios([{ id: user.id, nome: user.nome }]);
  }

  showSection(id: string): void {
    document.querySelectorAll<HTMLElement>('.page').forEach((s) => (s.style.display = 'none'));
    DOM.get(id).style.display = 'block';
    DOM.get('title').innerText = App.LABELS[id] ?? id;
    document.querySelectorAll<HTMLAnchorElement>('.menu a').forEach((a) =>
      a.classList.toggle('active', a.dataset.section === id)
    );
    if (id === 'filas') this.filaManager.load();
    if (id === 'dashboard') loadDashboard();
  }

  private initMenu(): void {
    document.querySelectorAll<HTMLAnchorElement>('.menu a[data-section]').forEach((a) =>
      a.addEventListener('click', () => this.showSection(a.dataset.section!))
    );
  }
}


document.addEventListener('DOMContentLoaded', () => new App());
