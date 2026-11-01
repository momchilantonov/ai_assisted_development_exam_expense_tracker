import type { ReactNode } from "react";

interface Props {
  icon: string;
  title: string;
  children?: ReactNode;
}

export function PageHeader({ icon, title, children }: Props) {
  return (
    <div className="page-header">
      <div className="cover" aria-hidden="true" />
      <div className="page-icon" aria-hidden="true">
        {icon}
      </div>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
