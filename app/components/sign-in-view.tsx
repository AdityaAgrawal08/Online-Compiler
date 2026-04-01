type SignInViewProps = {
  onSignIn: () => void;
};

export function SignInView({ onSignIn }: SignInViewProps) {
  return (
    <div className="center-shell">
      <div className="simple-card auth-card">
        <h1>Online Compiler</h1>
        <p>Sign in with Google to access the compiler workspace.</p>
        <button className="primary-button" onClick={onSignIn}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
