import type { ReactNode } from 'react';

type Props = {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
};

const Card = ({ title, actions, children }: Props) => {
  return (
    <div className="card">
      {(title || actions) && (
        <div className="section-title" style={{ marginBottom: '12px' }}>
          {title ? <h3 className="card-title">{title}</h3> : <div />}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
