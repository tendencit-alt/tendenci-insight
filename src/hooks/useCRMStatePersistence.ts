// Hook para persistir estado do CRM entre navegações
// Salva deal aberto, aba ativa e filtros no localStorage com expiração de 30 minutos

interface CRMDealState {
  dealId: string;
  activeTab: string;
  timestamp: number;
}

interface CRMFiltersState {
  pipelineId: string;
  owner: string;
  status: string;
  category: string;
  search: string;
  timestamp: number;
}

const DEAL_STATE_KEY = 'crm_open_deal_state';
const FILTERS_STATE_KEY = 'crm_filters_state';
const EXPIRATION_TIME = 30 * 60 * 1000; // 30 minutos

export function useCRMStatePersistence() {
  // Salvar deal aberto e aba ativa
  const saveOpenDeal = (dealId: string, activeTab: string = 'info') => {
    const state: CRMDealState = {
      dealId,
      activeTab,
      timestamp: Date.now(),
    };
    localStorage.setItem(DEAL_STATE_KEY, JSON.stringify(state));
  };

  // Recuperar deal aberto
  const getOpenDeal = (): { dealId: string; activeTab: string } | null => {
    try {
      const stored = localStorage.getItem(DEAL_STATE_KEY);
      if (!stored) return null;

      const state: CRMDealState = JSON.parse(stored);
      
      // Verificar expiração
      if (Date.now() - state.timestamp > EXPIRATION_TIME) {
        clearOpenDeal();
        return null;
      }

      return { dealId: state.dealId, activeTab: state.activeTab };
    } catch {
      return null;
    }
  };

  // Limpar deal aberto
  const clearOpenDeal = () => {
    localStorage.removeItem(DEAL_STATE_KEY);
  };

  // Salvar filtros
  const saveFilters = (filters: {
    pipelineId: string;
    owner: string;
    status: string;
    category: string;
    search: string;
  }) => {
    const state: CRMFiltersState = {
      ...filters,
      timestamp: Date.now(),
    };
    localStorage.setItem(FILTERS_STATE_KEY, JSON.stringify(state));
  };

  // Recuperar filtros
  const getFilters = (): Omit<CRMFiltersState, 'timestamp'> | null => {
    try {
      const stored = localStorage.getItem(FILTERS_STATE_KEY);
      if (!stored) return null;

      const state: CRMFiltersState = JSON.parse(stored);
      
      // Verificar expiração
      if (Date.now() - state.timestamp > EXPIRATION_TIME) {
        clearFilters();
        return null;
      }

      return {
        pipelineId: state.pipelineId,
        owner: state.owner,
        status: state.status,
        category: state.category,
        search: state.search,
      };
    } catch {
      return null;
    }
  };

  // Limpar filtros
  const clearFilters = () => {
    localStorage.removeItem(FILTERS_STATE_KEY);
  };

  return {
    saveOpenDeal,
    getOpenDeal,
    clearOpenDeal,
    saveFilters,
    getFilters,
    clearFilters,
  };
}
