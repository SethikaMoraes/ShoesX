export default function Signup({
  form,
  setForm,
  onSubmit,
  onSwitch,
  error,
  submitting,
}) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <h2 className="text-2xl font-bold">Sign Up</h2>

      <label>
        <span className="label">Email</span>
        <input
          type="email"
          className="input"
          value={form.identity}
          onChange={(event) =>
            setForm((current) => ({ ...current, identity: event.target.value }))
          }
          required
        />
      </label>

      <label>
        <span className="label">Password</span>
        <input
          type="password"
          className="input"
          value={form.password}
          onChange={(event) =>
            setForm((current) => ({ ...current, password: event.target.value }))
          }
          required
        />
      </label>

      <label>
        <span className="label">Confirm Password</span>
        <input
          type="password"
          className="input"
          value={form.confirmPassword}
          onChange={(event) =>
            setForm((current) => ({ ...current, confirmPassword: event.target.value }))
          }
          required
        />
      </label>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Please wait...' : 'Sign Up'}
      </button>

      <p className="text-center text-sm text-slate-600 dark:text-slate-300">
        Already have an account?{' '}
        <button
          type="button"
          className="font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
          onClick={onSwitch}
        >
          Login
        </button>
      </p>
    </form>
  );
}
