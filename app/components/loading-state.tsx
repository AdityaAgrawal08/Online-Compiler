type LoadingStateProps = {
  title: string;
  subtitle: string;
};

export function LoadingState({ title, subtitle }: LoadingStateProps) {
  return (
    <div className="center-shell">
      <div className="simple-card">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
