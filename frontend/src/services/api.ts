import axios, { AxiosError } from 'axios';
import {
  AddToKnowledgeBasePayload,
  KnowledgeBaseEntry,
  Ticket,
  TicketFormData,
} from '../types';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// ─── global network-error event ──────────────────────────────────────────────
// Components can listen to 'app:network-error' on window to show a banner.
// We deduplicate so one outage doesn't fire dozens of events.
let networkErrorPending = false;

api.interceptors.response.use(
  (response) => {
    // backend is reachable again — clear the flag and notify
    if (networkErrorPending) {
      networkErrorPending = false;
      window.dispatchEvent(new CustomEvent('app:network-recover'));
    }
    return response;
  },
  (error: AxiosError) => {
    if (!error.response && !networkErrorPending) {
      // no response = backend unreachable
      networkErrorPending = true;
      window.dispatchEvent(new CustomEvent('app:network-error'));
    }
    return Promise.reject(error);
  }
);

// ─── error helper ─────────────────────────────────────────────────────────────

function handleApiError(err: unknown): never {
  if (err instanceof AxiosError) {
    const message = err.response?.data?.message;
    if (Array.isArray(message)) throw new Error(message.join(', '));
    if (typeof message === 'string') throw new Error(message);
    throw new Error(err.message);
  }
  throw new Error('An unexpected error occurred');
}

// ─── endpoints ────────────────────────────────────────────────────────────────

export const analyzeTicket = async (data: TicketFormData): Promise<Ticket> => {
  try {
    const response = await api.post<Ticket>('/tickets', data);
    return response.data;
  } catch (err) {
    throw handleApiError(err);
  }
};

export const getAllTickets = async (): Promise<Ticket[]> => {
  try {
    const response = await api.get<Ticket[]>('/tickets');
    return response.data;
  } catch (err) {
    throw handleApiError(err);
  }
};

export const bulkAnalyze = async (tickets?: Ticket[]): Promise<Ticket[]> => {
  try {
    const response = await api.post<Ticket[]>(
      '/tickets/bulk-analyze',
      tickets ? { tickets } : {}
    );
    return response.data;
  } catch (err) {
    throw handleApiError(err);
  }
};

// ─── knowledge base ───────────────────────────────────────────────────────────

export const getKnowledgeBase = async (): Promise<KnowledgeBaseEntry[]> => {
  try {
    const response = await api.get<KnowledgeBaseEntry[]>('/knowledge-base');
    return response.data;
  } catch (err) {
    throw handleApiError(err);
  }
};

export const addToKnowledgeBase = async (
  data: AddToKnowledgeBasePayload
): Promise<KnowledgeBaseEntry> => {
  try {
    const response = await api.post<KnowledgeBaseEntry>(
      '/knowledge-base',
      data
    );
    return response.data;
  } catch (err) {
    throw handleApiError(err);
  }
};

export const deleteTicket = async (
  ticketId: string
): Promise<{ deleted: boolean }> => {
  try {
    const response = await api.delete<{ deleted: boolean }>(
      `/tickets/${encodeURIComponent(ticketId)}`
    );
    return response.data;
  } catch (err) {
    throw handleApiError(err);
  }
};

export const deleteKnowledgeBaseEntry = async (
  ticketId: string
): Promise<{ deleted: boolean }> => {
  try {
    const response = await api.delete<{ deleted: boolean }>(
      `/knowledge-base/${encodeURIComponent(ticketId)}`
    );
    return response.data;
  } catch (err) {
    throw handleApiError(err);
  }
};
