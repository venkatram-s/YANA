import React, { useState, useEffect } from 'react';

const FAKE_ROWS = [
  { id: 1, name: 'Q3 Budget Forecast', owner: 'Sarah K.', status: 'In Progress', due: '2026-04-15', value: '$124,500', pct: '67%' },
  { id: 2, name: 'Vendor Contracts Review', owner: 'Mark T.', status: 'Complete', due: '2026-03-30', value: '$48,200', pct: '100%' },
  { id: 3, name: 'Headcount Planning FY27', owner: 'Laura M.', status: 'Draft', due: '2026-05-01', value: '$2,310,000', pct: '12%' },
  { id: 4, name: 'Office Lease Renewal', owner: 'Tom B.', status: 'Pending', due: '2026-04-22', value: '$580,000', pct: '44%' },
  { id: 5, name: 'IT Infrastructure Upgrade', owner: 'Priya N.', status: 'In Progress', due: '2026-06-10', value: '$97,800', pct: '58%' },
  { id: 6, name: 'Marketing Spend Allocation', owner: 'James C.', status: 'Complete', due: '2026-03-15', value: '$310,000', pct: '100%' },
  { id: 7, name: 'EMEA Expansion Costs', owner: 'Anna R.', status: 'Draft', due: '2026-07-01', value: '$1,450,000', pct: '5%' },
  { id: 8, name: 'Legal & Compliance Review', owner: 'David L.', status: 'In Progress', due: '2026-04-30', value: '$75,400', pct: '72%' },
  { id: 9, name: 'Customer Success Platform', owner: 'Emily S.', status: 'Pending', due: '2026-05-18', value: '$220,000', pct: '31%' },
  { id: 10, name: 'Data Center Migration', owner: 'Ryan O.', status: 'In Progress', due: '2026-06-28', value: '$445,000', pct: '49%' },
  { id: 11, name: 'Brand Refresh Initiative', owner: 'Sophie A.', status: 'Draft', due: '2026-08-01', value: '$88,000', pct: '8%' },
  { id: 12, name: 'Supply Chain Audit', owner: 'Marcus W.', status: 'Complete', due: '2026-03-20', value: '$34,600', pct: '100%' },
  { id: 13, name: 'Pension Fund Rebalancing', owner: 'Claire F.', status: 'Pending', due: '2026-04-10', value: '$3,200,000', pct: '19%' },
  { id: 14, name: 'R&D Grants Application', owner: 'Ben H.', status: 'In Progress', due: '2026-05-25', value: '$180,000', pct: '61%' },
  { id: 15, name: 'Sales Incentive Program', owner: 'Nina P.', status: 'Complete', due: '2026-04-01', value: '$415,000', pct: '100%' },
];

const STATUS_COLORS = {
  'Complete': '#16a34a',
  'In Progress': '#2563eb',
  'Pending': '#d97706',
  'Draft': '#6b7280',
};

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const COL_HEADERS = ['', 'Project Name', 'Owner', 'Status', 'Due Date', 'Budget', 'Progress'];

export const PanicOverlay = ({ onDismiss }) => {
  const [selectedCell, setSelectedCell] = useState({ row: 2, col: 1 });
  const [formulaBarValue, setFormulaBarValue] = useState('Q3 Budget Forecast');

  const handleCellClick = (row, col) => {
    setSelectedCell({ row, col });
    const rowData = FAKE_ROWS[row - 2];
    if (!rowData) return;
    const vals = ['', rowData.name, rowData.owner, rowData.status, rowData.due, rowData.value, rowData.pct];
    setFormulaBarValue(vals[col] || '');
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div className="panic-overlay" onDoubleClick={onDismiss}>
      {/* Fake toolbar */}
      <div className="panic-toolbar">
        <div className="panic-tabs">
          {['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Tools', 'Help'].map(t => (
            <span key={t} className="panic-tab">{t}</span>
          ))}
        </div>
      </div>

      {/* Sheet tabs */}
      <div className="panic-sheet-tabs">
        <span className="panic-sheet-tab active">Budget_FY26</span>
        <span className="panic-sheet-tab">Headcount</span>
        <span className="panic-sheet-tab">Vendors</span>
        <span className="panic-sheet-tab">+</span>
      </div>

      {/* Formula bar */}
      <div className="panic-formula-bar">
        <span className="panic-cell-ref">
          {COLS[selectedCell.col]}{selectedCell.row}
        </span>
        <span className="panic-formula-sep">fx</span>
        <input
          className="panic-formula-input"
          value={formulaBarValue}
          onChange={(e) => setFormulaBarValue(e.target.value)}
          readOnly
        />
      </div>

      {/* Spreadsheet grid */}
      <div className="panic-grid-container">
        <table className="panic-grid">
          <thead>
            <tr>
              <th className="panic-row-header"></th>
              {COL_HEADERS.slice(1).map((h, i) => (
                <th
                  key={i}
                  className={`panic-col-header ${selectedCell.col === i + 1 ? 'selected-col' : ''}`}
                >
                  {COLS[i + 1]}
                </th>
              ))}
            </tr>
            <tr className="panic-header-row">
              <td className="panic-row-header">1</td>
              {COL_HEADERS.slice(1).map((h, i) => (
                <td
                  key={i}
                  className="panic-header-cell"
                  onClick={() => handleCellClick(1, i + 1)}
                >
                  {h}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {FAKE_ROWS.map((row, ri) => (
              <tr key={row.id} className={selectedCell.row === ri + 2 ? 'selected-row' : ''}>
                <td className="panic-row-header">{ri + 2}</td>
                {[row.name, row.owner, row.status, row.due, row.value, row.pct].map((val, ci) => {
                  const isSelected = selectedCell.row === ri + 2 && selectedCell.col === ci + 1;
                  return (
                    <td
                      key={ci}
                      className={`panic-cell ${isSelected ? 'selected-cell' : ''}`}
                      onClick={() => handleCellClick(ri + 2, ci + 1)}
                    >
                      {ci === 2 ? (
                        <span className="panic-status" style={{ color: STATUS_COLORS[val] }}>
                          {val}
                        </span>
                      ) : val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panic-hint">Press Esc or double-click to return</div>
    </div>
  );
};
