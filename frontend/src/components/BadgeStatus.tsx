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
  return <span className={`status-badge ${tone}`}>{labelMap[status]}</span>;
};

export default BadgeStatus;
