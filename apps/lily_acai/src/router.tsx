import { Link as WouterLink, Redirect, Route as WouterRoute, Router, Switch, useLocation as useWouterLocation, useParams as useWouterParams, useSearch as useWouterSearch, useSearchParams as useWouterSearchParams } from "wouter";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type NavigateOptions = { replace?: boolean };
type LocationValue = { pathname: string; search: string; hash: string };
type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  replace?: boolean;
  state?: unknown;
  transition?: boolean;
};

export function BrowserRouter({ basename, children }: { basename?: string; children: ReactNode }) {
  return <Router base={basename}>{children}</Router>;
}

export function Routes({ children }: { children: ReactNode }) {
  return <Switch>{children}</Switch>;
}

export function Route({ path, element }: { path: string; element: ReactNode }) {
  return <WouterRoute path={path}>{() => element}</WouterRoute>;
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  return <Redirect to={to} replace={replace} />;
}

export function Link({ to, ...props }: LinkProps) {
  return <WouterLink {...props} to={to} />;
}

export function NavLink({ to, end = false, className, ...props }: LinkProps & { end?: boolean }) {
  const [pathname] = useWouterLocation();
  const active = end ? pathname === to : pathname === to || pathname.startsWith(`${to.replace(/\/$/, "")}/`);
  const classes = [className, active ? "active" : ""].filter(Boolean).join(" ");
  return <WouterLink {...props} to={to} className={classes} aria-current={active ? "page" : undefined} />;
}

export function useNavigate() {
  const [, navigate] = useWouterLocation();
  return (to: string | number | { pathname?: string; search?: string; hash?: string }, options?: NavigateOptions) => {
    if (typeof to === "number") {
      if (to < 0) window.history.back();
      else window.history.go(to);
      return;
    }
    const target = typeof to === "string" ? to : `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;
    navigate(target, options);
  };
}

export function useLocation(): LocationValue {
  const [pathname] = useWouterLocation();
  const search = useWouterSearch();
  return { pathname, search, hash: window.location.hash };
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  return useWouterParams<T>();
}

export function useSearchParams() {
  return useWouterSearchParams();
}
