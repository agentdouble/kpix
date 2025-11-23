type Props = {
  status: 'GREEN' | 'ORANGE' | 'RED';
};

const labelMap: Record<Props['status'], string> = {
  GREEN: 'VERT',
  ORANGE: 'ORANGE',
  RED: 'ROUGE',
};

const BadgeStatus = ({ status }: Props) => {
  const label = labelMap[status];
  return (
    <span
      aria-label={label}
      title={label}
      style={{
        width: 10,
        height: 10,
        borderRadius: '999px',
        display: 'inline-block',
        backgroundColor: status === 'GREEN' ? '#16a34a' : status === 'ORANGE' ? '#ea580c' : '#dc2626',
      }}
    />
  );
};

export default BadgeStatus;
