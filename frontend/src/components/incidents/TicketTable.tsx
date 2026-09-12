import React from 'react';
import { Ticket } from '../../types';
import TicketRow from './TicketRow';

interface Props {
  tickets: Ticket[];
  selectedId: string | null;
  checkedIds: Set<string>;
  addedIds: Set<string>;
  onSelect: (ticket: Ticket) => void;
  onCheck: (id: string) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

function TicketTable({
  tickets,
  selectedId,
  checkedIds,
  addedIds,
  onSelect,
  onCheck,
  onDelete,
  deletingId,
}: Props) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
        }}
      >
        <thead>
          <tr style={{ textAlign: 'left', color: '#64748b' }}>
            <th></th>
            <th>ID</th>
            <th>Title</th>
            <th>Severity</th>
            <th>Category</th>
            <th>Language</th>
            <th>KB</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {tickets.map((ticket) => (
            <TicketRow
              onDelete={() => onDelete(ticket.ticket_id)}
              isDeleting={deletingId === ticket.ticket_id}
              key={ticket.ticket_id}
              ticket={ticket}
              isSelected={selectedId === ticket.ticket_id}
              isChecked={checkedIds.has(ticket.ticket_id)}
              isAdded={addedIds.has(ticket.ticket_id)}
              onSelect={() => onSelect(ticket)}
              onCheck={() => onCheck(ticket.ticket_id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TicketTable;