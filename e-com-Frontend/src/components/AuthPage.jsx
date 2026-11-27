import { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import AuthContext from "../Context/AuthContext";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import { Field, Input } from "../ui/Field";
import { toast } from "../ui/toast";
import useDocumentTitle from "../hooks/useDocumentTitle";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One component for both screens: <AuthPage mode="login" /> and <AuthPage mode="register" />
const AuthPage = ({ mode }) => {
  const isRegister = mode === "register";
  useDocumentTitle(isRegister ? "Create account" : "Log in");
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "";

  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setErrors({ ...errors, [event.target.name]: undefined });
    setServerError("");
  };

  const validate = () => {
    const next = {};
    if (isRegister && !form.fullName.trim()) next.fullName = "Enter your full name";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email";
    if (isRegister) {
      if (form.password.length < 8) next.password = "Use at least 8 characters";
      if (form.confirm !== form.password) next.confirm = "The passwords do not match";
    } else if (!form.password) {
      next.password = "Enter your password";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      let session;
      if (isRegister) {
        session = await register(form.fullName.trim(), form.email.trim(), form.password);
        toast.success("Your account is ready");
      } else {
        session = await login(form.email.trim(), form.password);
        toast.success("You are logged in");
      }
      // Customers go to the shop, admins to the dashboard, unless they were sent here from another page.
      navigate(from || (session?.role === "ADMIN" ? "/admin" : "/shop"), { replace: true });
    } catch (error) {
      const data = error.response?.data;
      if (data?.fields) setErrors(data.fields);
      setServerError(data?.message || "The server could not be reached. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-8 md:py-16">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="heading-4">{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="body-6 text-muted">
          {isRegister ? "Sign up to browse the shop, place orders and use the assistant." : "Log in to browse the shop, see your orders and use the assistant."}
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {serverError && (
            <Alert kind="error" title={isRegister ? "Could not create the account" : "Could not log in"}>
              {serverError}
            </Alert>
          )}

          {isRegister && (
            <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
              <Input
                id="fullName"
                name="fullName"
                autoComplete="name"
                value={form.fullName}
                onChange={handleChange}
                invalid={Boolean(errors.fullName)}
                disabled={submitting}
              />
            </Field>
          )}

          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              invalid={Boolean(errors.email)}
              disabled={submitting}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            error={errors.password}
            hint={isRegister ? "At least 8 characters" : undefined}
          >
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={form.password}
                onChange={handleChange}
                invalid={Boolean(errors.password)}
                disabled={submitting}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition-colors duration-300 ease-brand hover:bg-hover hover:text-fg"
              >
                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </Field>

          {isRegister && (
            <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
              <Input
                id="confirm"
                name="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.confirm}
                onChange={handleChange}
                invalid={Boolean(errors.confirm)}
                disabled={submitting}
              />
            </Field>
          )}

          <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full">
            {submitting ? (isRegister ? "Creating account" : "Logging in") : isRegister ? "Sign up" : "Log in"}
          </Button>
        </form>
      </div>

      <p className="body-6 text-center text-muted">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link to="/login" state={{ from }} className="body-5 text-fg underline underline-offset-4">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link to="/register" state={{ from }} className="body-5 text-fg underline underline-offset-4">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
};

export default AuthPage;
