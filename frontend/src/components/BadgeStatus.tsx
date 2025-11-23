type Props = {
  status: 'GREEN' | 'ORANGE' | 'RED';
};

const labelMap: Record<Props['status'], string> = {
  GREEN: 'VERT',
  ORANGE: 'ORANGE',
  RED: 'ROUGE',
};

const BadgeStatus = ({ status }: Props) => {
  const tone = status === 'GREEN' ? 'green' : status === 'ORANGE' ? 'orange' : 'red';
  const label = labelMap[status];
  return (
    <span className={`status-badge ${tone}`} aria-label={label} title={label}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '999px',
          background: 'currentColor',
          display: 'inline-block',
        }}
      />
    </span>
  );
};

export default BadgeStatus;
