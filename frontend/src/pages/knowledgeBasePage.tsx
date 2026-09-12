import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';
import { deleteKnowledgeBaseEntry } from '../services/api';
import { KnowledgeBaseEntry } from '../types';

const severityColors: Record<string, string> = {
  low: '#27ae60',
  medium: '#f39c12',
  high: '#e67e22',
  critical: '#e74c3c',
};

const categoryColors: Record<string, string> = {
  authentication: '#8e44ad',
  performance: '#2980b9',
  network: '#16a085',
  crash: '#c0392b',
  configuration: '#d35400',
  other: '#7f8c8d',
};

const headerCell: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  color: '#666',
  fontWeight: 600,
};

function KnowledgeBase() {
  const [selected, setSelected] = useState<KnowledgeBaseEntry | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: entries = [], isLoading, error, refetch } = useKnowledgeBase();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (ticketId: string) => deleteKnowledgeBaseEntry(ticketId),
    onSuccess: (_data, ticketId) => {
      setDeleteError(null);
      setConfirmingId(null);
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      if (selected?.ticket_id === ticketId) setSelected(null);
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
    },
    onError: (err: Error) => {
      setDeleteError(err.message || 'Could not delete the entry.');
      setConfirmingId(null);
    },
  });

  function toggleCheck(ticketId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(ticketId) ? next.delete(ticketId) : next.add(ticketId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (checkedIds.size === entries.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(
        new Set(entries.map((e: KnowledgeBaseEntry) => e.ticket_id))
      );
    }
  }

  async function handleDeleteSelected() {
    const ids = Array.from(checkedIds);
    if (!ids.length) return;

    setBulkDeleting(true);
    setDeleteError(null);

    const failed: string[] = [];

    for (const id of ids) {
      try {
        await deleteKnowledgeBaseEntry(id);
      } catch {
        failed.push(id);
      }
    }

    if (failed.length) {
      setDeleteError(`Could not delete: ${failed.join(', ')}`);
    }

    setCheckedIds(new Set());
    setSelected(null);
    setBulkConfirming(false);
    setBulkDeleting(false);
    queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
  }

  if (isLoading)
    return (
      <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
        Loading knowledge base...
      </p>
    );

  if (error)
    return (
      <p style={{ color: '#c0392b', textAlign: 'center', padding: '2rem' }}>
        Could not load knowledge base. Make sure the backend is running.
      </p>
    );

  return (
    <div>
      {/* header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          gap: 12,
        }}
      >
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          {entries.length === 0
            ? 'No entries yet. Analyze tickets and add them to build your knowledge base.'
            : `${entries.length} resolved incident${entries.length === 1 ? '' : 's'} stored. AI uses these to inform future analyses.`}
        </p>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {entries.length > 0 && (
            <button
              onClick={toggleSelectAll}
              style={{
                padding: '8px 16px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                backgroundColor: 'white',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {checkedIds.size === entries.length
                ? 'Deselect all'
                : 'Select all'}
            </button>
          )}

          {checkedIds.size > 0 &&
            (bulkConfirming ? (
              <>
                <button
                  onClick={handleDeleteSelected}
                  disabled={bulkDeleting}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#e74c3c',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: bulkDeleting ? 0.6 : 1,
                  }}
                >
                  {bulkDeleting
                    ? 'Deleting…'
                    : `Delete ${checkedIds.size} permanently`}
                </button>
                <button
                  onClick={() => setBulkConfirming(false)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setBulkConfirming(true)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #fecdd3',
                  borderRadius: '6px',
                  background: '#fff1f2',
                  color: '#be123c',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Delete {checkedIds.size}
              </button>
            ))}

          <button
            onClick={() => refetch()}
            style={{
              padding: '8px 16px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* delete error */}
      {deleteError && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: '1rem',
            borderRadius: 10,
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#9f1239',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>{deleteError}</span>
          <button
            onClick={() => setDeleteError(null)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#9f1239',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* empty state */}
      {entries.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            border: '2px dashed #e0e0e0',
            borderRadius: '8px',
            color: '#999',
          }}
        >
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>
            Knowledge base is empty
          </p>
          <p style={{ fontSize: '13px', margin: 0 }}>
            Analyze a ticket then click "Add to Knowledge Base" to start
            building it.
          </p>
        </div>
      )}

      {/* entries table */}
      {entries.length > 0 && (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ ...headerCell, width: 40 }}></th>
              <th style={headerCell}>ID</th>
              <th style={headerCell}>Title</th>
              <th style={headerCell}>Category</th>
              <th style={headerCell}>Severity</th>
              <th style={headerCell}>Language</th>
              <th style={headerCell}>Added</th>
              <th style={headerCell}></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry: KnowledgeBaseEntry) => (
              <tr
                key={entry.id}
                onClick={() =>
                  setSelected(selected?.id === entry.id ? null : entry)
                }
                style={{
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  backgroundColor: checkedIds.has(entry.ticket_id)
                    ? '#eff6ff'
                    : selected?.id === entry.id
                      ? '#f8f9fa'
                      : 'transparent',
                }}
              >
                {/* checkbox */}
                <td
                  style={{ padding: '12px', width: 40 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={checkedIds.has(entry.ticket_id)}
                    onChange={() => toggleCheck(entry.ticket_id)}
                  />
                </td>

                <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                  {entry.ticket_id}
                </td>
                <td
                  style={{
                    padding: '12px',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.title}
                </td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'white',
                      backgroundColor:
                        categoryColors[entry.category] || '#7f8c8d',
                    }}
                  >
                    {entry.category}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'white',
                      backgroundColor:
                        severityColors[entry.severity] || '#7f8c8d',
                    }}
                  >
                    {entry.severity}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: '13px' }}>
                  {entry.detected_language}
                </td>
                <td style={{ padding: '12px', fontSize: '12px', color: '#999' }}>
                  {new Date(entry.created_at).toLocaleDateString()}
                </td>

                {/* delete */}
                <td
                  style={{ padding: '12px', width: 90 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {confirmingId === entry.ticket_id ? (
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        onClick={() => deleteMutation.mutate(entry.ticket_id)}
                        disabled={deleteMutation.isPending}
                        style={{
                          padding: '3px 9px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#e74c3c',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {deleteMutation.isPending ? '…' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: 8,
                          border: '1px solid #e0e0e0',
                          background: 'white',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(entry.ticket_id)}
                      title="Remove from knowledge base"
                      style={{
                        padding: 5,
                        borderRadius: 8,
                        border: 'none',
                        background: 'transparent',
                        color: '#999',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* selected entry detail */}
      {selected && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: '#fafafa',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px' }}>
              {selected.ticket_id} — {selected.title}
            </h3>
            <button
              onClick={() => setSelected(null)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#999',
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h4
              style={{
                margin: '0 0 8px',
                fontSize: '13px',
                color: '#666',
                textTransform: 'uppercase',
              }}
            >
              Description
            </h4>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
              {selected.description}
            </p>
          </div>

          <div>
            <h4
              style={{
                margin: '0 0 8px',
                fontSize: '13px',
                color: '#666',
                textTransform: 'uppercase',
              }}
            >
              Resolution that worked
            </h4>
            <ol
              style={{
                margin: 0,
                paddingLeft: '1.2rem',
                lineHeight: 2,
                fontSize: '14px',
              }}
            >
              {selected.resolution.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeBase;