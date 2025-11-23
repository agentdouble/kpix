import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
};

const Button = ({ variant = 'primary', fullWidth = false, className = '', ...rest }: Props) => {
  const classes = ['button', variant, fullWidth ? 'full-width' : '', className].filter(Boolean).join(' ');
  return <button className={classes} {...rest} />;
};

export default Button;
