import type { ReactNode } from 'react';

type Props = {
  headers: string[];
  children: ReactNode;
};

const Table = ({ headers, children }: Props) => {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
};

export default Table;
